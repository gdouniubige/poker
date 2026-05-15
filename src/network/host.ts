import Peer, { DataConnection } from 'peerjs'
import type { HostMessage, ClientMessage } from './protocol'
import { serializeGameState } from './protocol'
import type { PlayerAction, GameConfig } from '../engine/types'
import { DEFAULT_CONFIG } from '../engine/types'
import {
  createInitialState, addPlayer, startHand, processAction,
  resetForNextHand, removePlayer,
} from '../engine/game'

export interface HostCallbacks {
  onLobbyUpdate: (players: { id: string; name: string; chips: number }[]) => void
  onGameStateChange: (state: any) => void
}

export class GameHost {
  private peer!: Peer
  private conns = new Map<string, DataConnection>()
  private cb!: HostCallbacks
  private initialChips = 100
  gameState: any

  createRoom(roomCode: string, hostName: string, initialChips: number, callbacks: HostCallbacks): Promise<void> {
    this.cb = callbacks
    this.initialChips = initialChips
    const config: GameConfig = { ...DEFAULT_CONFIG, initialChips }
    this.gameState = createInitialState(config)
    addPlayer(this.gameState, 'host-self', hostName, true)

    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-host-${roomCode}`)
      this.peer.on('open', () => { this.emitLobby(); resolve() })
      this.peer.on('error', (err) => reject(err))
      this.peer.on('connection', (conn) => {
        const onOpen = () => conn.on('data', (raw: unknown) => this.handleMessage(conn, raw as ClientMessage))
        if (conn.open) onOpen(); else conn.on('open', onOpen)
        conn.on('close', () => {
          const pid = [...this.conns.entries()].find(([, c]) => c === conn)?.[0]
          if (pid) { this.conns.delete(pid); removePlayer(this.gameState, pid); this.emitLobby() }
        })
      })
    })
  }

  private handleMessage(conn: DataConnection, msg: ClientMessage) {
    const pid = conn.peer
    switch (msg.type) {
      case 'join': {
        const existing = this.gameState.players.find((p: any) => p.id === pid)
        if (existing) {
          this.conns.set(pid, conn)
          if (this.gameState.phase !== 'waiting') {
            conn.send({ type: 'game_state', state: serializeGameState(this.gameState, pid) } as HostMessage)
          } else {
            this.emitLobby()
          }
          return
        }
        if (this.gameState.phase !== 'waiting') { conn.send({ type: 'error', message: '游戏已开始' } as HostMessage); return }
        if (!addPlayer(this.gameState, pid, msg.name, false)) { conn.send({ type: 'error', message: '房间已满' } as HostMessage); return }
        this.conns.set(pid, conn); this.emitLobby(); break
      }
      case 'start_game': {
        if (!startHand(this.gameState)) { conn.send({ type: 'error', message: '人数不足' } as HostMessage); return }
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'action': {
        const idx = this.gameState.players.findIndex((p: any) => p.id === pid)
        processAction(this.gameState, idx, msg.action)
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'ready': {
        this.markReady(pid)
        break
      }
      case 'leave': {
        this.conns.delete(pid); removePlayer(this.gameState, pid); conn.close(); this.emitLobby(); break
      }
    }
  }

  private markReady(pid: string) {
    if (!this.gameState.readyPlayers.includes(pid)) {
      this.gameState.readyPlayers.push(pid)
    }
    this.broadcastGameState()
    this.cb.onGameStateChange(this.gameState)

    // Check if everyone needed has readied up
    if (this.isGameOver) {
      // Rematch: all players (including eliminated) must be ready
      const allIds = this.gameState.players.map((p: any) => p.id)
      if (allIds.every((id: string) => this.gameState.readyPlayers.includes(id))) {
        this.doRematch()
      }
    } else {
      // Next hand: only non-eliminated players must be ready
      const alive = this.gameState.players.filter((p: any) => p.chips > 0)
      if (alive.length >= 2 && alive.every((p: any) => this.gameState.readyPlayers.includes(p.id))) {
        this.doNextHand()
      }
    }
  }

  private get isGameOver(): boolean {
    const alive = this.gameState.players.filter((p: any) => p.chips > 0)
    return this.gameState.phase === 'showdown' && alive.length <= 1
  }

  private doNextHand() {
    resetForNextHand(this.gameState)
    startHand(this.gameState)
    this.broadcastGameState()
    this.cb.onGameStateChange(this.gameState)
  }

  private doRematch() {
    // Reset all players with original chips
    for (const p of this.gameState.players) {
      p.chips = this.initialChips
    }
    resetForNextHand(this.gameState)
    startHand(this.gameState)
    this.broadcastGameState()
    this.cb.onGameStateChange(this.gameState)
  }

  hostAction(action: PlayerAction) {
    const idx = this.gameState.players.findIndex((p: any) => p.isHost)
    processAction(this.gameState, idx, action)
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState)
  }

  hostStartGame(): boolean {
    if (!startHand(this.gameState)) return false
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); return true
  }

  hostReady() {
    this.markReady('host-self')
  }

  private broadcastGameState() {
    for (const [pid, conn] of this.conns) {
      conn.send({ type: 'game_state', state: serializeGameState(this.gameState, pid) } as HostMessage)
    }
  }

  private emitLobby() {
    const players = this.gameState.players.map((p: any) => ({ id: p.id, name: p.name, chips: p.chips }))
    for (const conn of this.conns.values()) conn.send({ type: 'lobby_update', players } as HostMessage)
    this.cb.onLobbyUpdate(players)
  }

  destroy() { for (const conn of this.conns.values()) conn.close(); this.peer?.destroy() }
}

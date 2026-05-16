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
  onGameOver: (winner: { id: string; name: string; chips: number }) => void
  onReadyUpdate?: (readyPlayerIds: string[]) => void
}

export class GameHost {
  private peer!: Peer
  private conns = new Map<string, DataConnection>()
  private cb!: HostCallbacks
  private readyPlayers = new Set<string>()
  gameState: any

  createRoom(roomCode: string, hostName: string, initialChips: number, callbacks: HostCallbacks): Promise<void> {
    this.cb = callbacks
    const config: GameConfig = { ...DEFAULT_CONFIG, initialChips }
    this.gameState = createInitialState(config)
    addPlayer(this.gameState, 'host-self', hostName, true)

    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-host-${roomCode}`)
      this.peer.on('open', () => { this.emitLobby(); resolve() })
      this.peer.on('error', (err) => reject(err))
      this.peer.on('connection', (conn) => {
        // Handle race: connection may already be open on fast (same-machine) links
        const onOpen = () => conn.on('data', (raw: unknown) => this.handleMessage(conn, raw as ClientMessage))
        if (conn.open) onOpen(); else conn.on('open', onOpen)
        conn.on('close', () => {
          const pid = [...this.conns.entries()].find(([, c]) => c === conn)?.[0]
          if (pid) {
            this.conns.delete(pid); this.readyPlayers.delete(pid); removePlayer(this.gameState, pid)
            if (this.gameState.phase === 'waiting') {
              this.emitLobby()
            } else {
              this.broadcastReady(); this.checkAllReady()
            }
          }
        })
      })
    })
  }

  private handleMessage(conn: DataConnection, msg: ClientMessage) {
    const pid = conn.peer
    switch (msg.type) {
      case 'join': {
        // Check if this peer is already a player (reconnect)
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
      case 'leave': {
        this.conns.delete(pid); this.readyPlayers.delete(pid)
        removePlayer(this.gameState, pid); conn.close(); this.emitLobby(); break
      }
      case 'ready': {
        this.readyPlayers.add(pid); this.broadcastReady(); this.checkAllReady(); break
      }
    }
  }

  hostAction(action: PlayerAction) {
    const idx = this.gameState.players.findIndex((p: any) => p.isHost)
    processAction(this.gameState, idx, action)
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState)
  }

  hostStartGame(): boolean {
    if (!startHand(this.gameState)) return false
    this.readyPlayers.clear()
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); return true
  }

  hostReady() {
    this.readyPlayers.add('host-self')
    this.broadcastReady()
    this.checkAllReady()
  }

  private checkAllReady() {
    const aliveIds = this.gameState.players
      .filter((p: any) => p.chips > 0)
      .map((p: any) => p.id)
    if (aliveIds.every((id: string) => this.readyPlayers.has(id))) {
      this.readyPlayers.clear()
      this.hostNextHand()
    }
  }

  /** Auto-start next hand, or go back to lobby if not enough players */
  hostNextHand() {
    resetForNextHand(this.gameState)
    const alive = this.gameState.players.filter((p: any) => p.chips > 0)
    if (alive.length >= 2) {
      startHand(this.gameState)
      this.broadcastGameState()
      this.cb.onGameStateChange(this.gameState)
    } else if (alive.length === 1) {
      this.cb.onGameOver({ id: alive[0].id, name: alive[0].name, chips: alive[0].chips })
      this.emitLobby()
    } else {
      this.emitLobby()
    }
  }

  private broadcastGameState() {
    for (const [pid, conn] of this.conns) {
      conn.send({ type: 'game_state', state: serializeGameState(this.gameState, pid) } as HostMessage)
    }
  }

  private broadcastReady() {
    const ids = [...this.readyPlayers]
    for (const conn of this.conns.values()) {
      conn.send({ type: 'ready_update', readyPlayerIds: ids } as HostMessage)
    }
    this.cb.onReadyUpdate?.(ids)
  }

  private emitLobby() {
    const players = this.gameState.players.map((p: any) => ({ id: p.id, name: p.name, chips: p.chips }))
    for (const conn of this.conns.values()) conn.send({ type: 'lobby_update', players } as HostMessage)
    this.cb.onLobbyUpdate(players)
  }

  destroy() { for (const conn of this.conns.values()) conn.close(); this.peer?.destroy() }
}

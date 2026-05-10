import Peer, { DataConnection } from 'peerjs'
import type { HostMessage, ClientMessage } from './protocol'
import { serializeGameState } from './protocol'
import type { PlayerAction } from '../engine/types'
import {
  createInitialState, addPlayer, startHand, processAction,
  resetForNextHand, playerRebuy, removePlayer,
} from '../engine/game'

export interface HostCallbacks {
  onLobbyUpdate: (players: { id: string; name: string; chips: number }[]) => void
  onGameStateChange: (state: any) => void
}

export class GameHost {
  private peer!: Peer
  private conns = new Map<string, DataConnection>()
  private cb!: HostCallbacks
  gameState: any

  createRoom(roomCode: string, hostName: string, callbacks: HostCallbacks): Promise<void> {
    this.cb = callbacks
    this.gameState = createInitialState()
    addPlayer(this.gameState, 'host-self', hostName, true)

    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-host-${roomCode}`)
      this.peer.on('open', () => { this.emitLobby(); resolve() })
      this.peer.on('error', (err) => reject(err))
      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          conn.on('data', (raw: unknown) => this.handleMessage(conn, raw as ClientMessage))
        })
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
      case 'rebuy': {
        playerRebuy(this.gameState, pid)
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'leave': {
        this.conns.delete(pid); removePlayer(this.gameState, pid); conn.close(); this.emitLobby(); break
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
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); return true
  }

  hostRebuy() {
    playerRebuy(this.gameState, 'host-self')
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState)
  }

  hostNextHand() { resetForNextHand(this.gameState); this.emitLobby() }

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

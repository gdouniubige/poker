import Peer, { DataConnection } from 'peerjs'
import type { HostMessage, ClientMessage, SerializedGameState } from './protocol'
import type { PlayerAction } from '../engine/types'

export interface ClientCallbacks {
  onLobbyUpdate: (players: { id: string; name: string; chips: number }[]) => void
  onGameState: (state: SerializedGameState) => void
  onError: (msg: string) => void
  onDisconnected: () => void
}

export class GameClient {
  private peer!: Peer
  private conn: DataConnection | null = null
  private cb!: ClientCallbacks
  playerId = ''

  joinRoom(roomCode: string, playerName: string, callbacks: ClientCallbacks): Promise<void> {
    this.cb = callbacks
    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      this.peer.on('open', (id) => {
        this.playerId = id
        const hostId = `poker-host-${roomCode}`
        this.conn = this.peer.connect(hostId, { reliable: true })
        this.conn.on('open', () => this.send({ type: 'join', name: playerName }))
        this.conn.on('data', (raw: unknown) => {
          const msg = raw as HostMessage
          switch (msg.type) {
            case 'lobby_update': this.cb.onLobbyUpdate(msg.players); resolve(); break
            case 'game_state': this.cb.onGameState(msg.state); break
            case 'error': this.cb.onError(msg.message); break
          }
        })
        this.conn.on('close', () => this.cb.onDisconnected())
        this.conn.on('error', (err) => this.cb.onError(err.message))
      })
      this.peer.on('error', (err) => reject(err))
    })
  }

  send(msg: ClientMessage) { if (this.conn?.open) this.conn.send(msg) }
  sendAction(action: PlayerAction) { this.send({ type: 'action', action }) }
  requestRebuy() { this.send({ type: 'rebuy' }) }
  requestStart() { this.send({ type: 'start_game' }) }

  leave() { this.send({ type: 'leave' }); this.conn?.close(); this.peer?.destroy() }
  destroy() { this.leave() }
}

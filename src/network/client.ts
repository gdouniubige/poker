import Peer, { DataConnection } from 'peerjs'
import type { HostMessage, ClientMessage, SerializedGameState } from './protocol'
import type { PlayerAction } from '../engine/types'

export interface ClientCallbacks {
  onLobbyUpdate: (players: { id: string; name: string; chips: number }[]) => void
  onGameState: (state: SerializedGameState) => void
  onError: (msg: string) => void
  onReconnecting: () => void
  onReadyUpdate?: (readyPlayerIds: string[]) => void
}

export class GameClient {
  private peer!: Peer
  private conn: DataConnection | null = null
  private cb!: ClientCallbacks
  private roomCode = ''
  private playerName = ''
  playerId = ''
  private reconnecting = false

  joinRoom(roomCode: string, playerName: string, callbacks: ClientCallbacks): Promise<void> {
    this.cb = callbacks
    this.roomCode = roomCode
    this.playerName = playerName
    return this.connect()
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      this.peer.on('open', (id) => {
        this.playerId = id
        this.doConnect(resolve)
      })
      this.peer.on('error', (err) => {
        if (!this.reconnecting) reject(err)
      })
    })
  }

  private doConnect(resolve?: () => void) {
    const hostId = `poker-host-${this.roomCode}`
    this.conn = this.peer.connect(hostId, { reliable: true })
    this.conn.on('data', (raw: unknown) => {
      const msg = raw as HostMessage
      switch (msg.type) {
        case 'lobby_update': this.cb.onLobbyUpdate(msg.players); resolve?.(); break
        case 'game_state': this.cb.onGameState(msg.state); resolve?.(); break
        case 'ready_update': this.cb.onReadyUpdate?.(msg.readyPlayerIds); break
        case 'error': this.cb.onError(msg.message); break
      }
    })
    this.conn.on('close', () => {
      if (!this.reconnecting) this.tryReconnect()
    })
    this.conn.on('error', () => {
      if (!this.reconnecting) this.tryReconnect()
    })
    if (this.conn.open) {
      this.send({ type: 'join', name: this.playerName })
    } else {
      this.conn.on('open', () => this.send({ type: 'join', name: this.playerName }))
    }
  }

  private tryReconnect() {
    this.reconnecting = true
    this.cb.onReconnecting()
    this.peer?.destroy()
    setTimeout(() => {
      this.reconnecting = false
      this.connect()
    }, 1000)
  }

  send(msg: ClientMessage) { if (this.conn?.open) this.conn.send(msg) }
  sendAction(action: PlayerAction) { this.send({ type: 'action', action }) }
  requestStart() { this.send({ type: 'start_game' }) }
  sendReady() { this.send({ type: 'ready' }) }

  leave() { this.send({ type: 'leave' }); this.conn?.close(); this.peer?.destroy() }
  destroy() { this.leave() }
}

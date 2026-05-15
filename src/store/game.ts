import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SerializedGameState } from '../network/protocol'
import { serializeGameState } from '../network/protocol'
import type { PlayerAction } from '../engine/types'
import { GameHost } from '../network/host'
import { GameClient } from '../network/client'

const STORAGE_KEY = 'poker_session'

function saveSession(data: { role: string; roomCode: string; playerName: string; initialChips?: number }) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function loadSession(): { role: string; roomCode: string; playerName: string; initialChips?: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearSession() { try { sessionStorage.removeItem(STORAGE_KEY) } catch {} }

export const useGameStore = defineStore('game', () => {
  const role = ref<'none' | 'host' | 'client'>('none')
  const roomCode = ref('')
  const playerName = ref('')
  const gameState = ref<SerializedGameState | null>(null)
  const lobbyPlayers = ref<{ id: string; name: string; chips: number }[]>([])
  const error = ref('')
  const connected = ref(false)
  const showResult = ref(false)
  const gameOver = ref<{ name: string; chips: number } | null>(null)

  let host: GameHost | null = null
  let client: GameClient | null = null

  const isMyTurn = computed(() => {
    if (!gameState.value) return false
    const myId = role.value === 'host' ? 'host-self' : client?.playerId
    const idx = gameState.value.currentPlayerIndex
    return idx >= 0 && idx < gameState.value.players.length
      && gameState.value.players[idx]?.id === myId
  })

  const myPlayer = computed(() => {
    if (!gameState.value) return null
    const myId = role.value === 'host' ? 'host-self' : client?.playerId
    return gameState.value.players.find(p => p.id === myId) || null
  })

  const canCheck = computed(() => {
    if (!gameState.value || !myPlayer.value) return false
    return myPlayer.value.bet >= gameState.value.currentBet
  })

  const callAmount = computed(() => {
    if (!gameState.value || !myPlayer.value) return 0
    return Math.min(gameState.value.currentBet - myPlayer.value.bet, myPlayer.value.chips)
  })

  async function createRoom(name: string, code: string, initialChips: number) {
    role.value = 'host'; playerName.value = name; roomCode.value = code
    host = new GameHost()
    await host.createRoom(code, name, initialChips, {
      onLobbyUpdate(players: { id: string; name: string; chips: number }[]) {
        lobbyPlayers.value = players
        connected.value = true
      },
      onGameStateChange(state: any) {
        gameState.value = serializeGameState(state, 'host-self')
        if (state.winners) showResult.value = true
      },
      onGameOver(winner: { id: string; name: string; chips: number }) {
        gameOver.value = { name: winner.name, chips: winner.chips }
        showResult.value = true
      },
    })
    saveSession({ role: 'host', roomCode: code, playerName: name, initialChips })
    window.addEventListener('beforeunload', () => cleanup())
  }

  async function joinRoom(name: string, code: string) {
    role.value = 'client'; playerName.value = name; roomCode.value = code
    client = new GameClient()
    await client.joinRoom(code, name, {
      onLobbyUpdate(players: { id: string; name: string; chips: number }[]) {
        lobbyPlayers.value = players
        connected.value = true
      },
      onGameState(state: SerializedGameState) {
        gameState.value = state
        connected.value = true; error.value = ''
        if (state.winners) showResult.value = true
      },
      onError(msg: string) { error.value = msg },
      onReconnecting() { connected.value = false; error.value = '重连中...' },
    })
    saveSession({ role: 'client', roomCode: code, playerName: name })
    window.addEventListener('beforeunload', () => cleanup())
  }

  /** Try to restore a previous session (called on page load) */
  async function restoreSession(): Promise<boolean> {
    const saved = loadSession()
    if (!saved) return false

    try {
      if (saved.role === 'host') {
        await createRoom(saved.playerName, saved.roomCode, saved.initialChips ?? 100)
      } else {
        await joinRoom(saved.playerName, saved.roomCode)
      }
      return true
    } catch {
      clearSession()
      return false
    }
  }

  function startGame() {
    if (host) host.hostStartGame()
    else client?.requestStart()
  }

  function performAction(action: PlayerAction) {
    if (host) host.hostAction(action)
    else client?.sendAction(action)
  }

  function nextHand() {
    showResult.value = false
    gameOver.value = null
    if (host) host.hostNextHand()
  }

  function dismissResult() { showResult.value = false; gameOver.value = null }

  function cleanup() {
    host?.destroy(); client?.destroy()
    host = null; client = null
    role.value = 'none'; gameState.value = null
    lobbyPlayers.value = []; connected.value = false; showResult.value = false
    gameOver.value = null
    clearSession()
  }

  return {
    role, roomCode, playerName, gameState, lobbyPlayers, error, connected,
    showResult, gameOver, isMyTurn, myPlayer, canCheck, callAmount,
    createRoom, joinRoom, restoreSession, startGame, performAction,
    nextHand, dismissResult, cleanup,
  }
})

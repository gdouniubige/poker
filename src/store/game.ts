import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SerializedGameState } from '../network/protocol'
import { serializeGameState } from '../network/protocol'
import type { PlayerAction } from '../engine/types'
import { GameHost } from '../network/host'
import { GameClient } from '../network/client'

export const useGameStore = defineStore('game', () => {
  const role = ref<'none' | 'host' | 'client'>('none')
  const roomCode = ref('')
  const playerName = ref('')
  const gameState = ref<SerializedGameState | null>(null)
  const lobbyPlayers = ref<{ id: string; name: string; chips: number }[]>([])
  const error = ref('')
  const connected = ref(false)
  const showResult = ref(false)

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

  async function createRoom(name: string, code: string) {
    role.value = 'host'; playerName.value = name; roomCode.value = code
    host = new GameHost()
    await host.createRoom(code, name, {
      onLobbyUpdate(players: { id: string; name: string; chips: number }[]) {
        lobbyPlayers.value = players
        connected.value = true
      },
      onGameStateChange(state: any) {
        gameState.value = serializeGameState(state, 'host-self')
        if (state.winners) showResult.value = true
      },
    })
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
        if (state.winners) showResult.value = true
      },
      onError(msg: string) { error.value = msg },
      onDisconnected() { connected.value = false; error.value = '与房主断开连接' },
    })
    window.addEventListener('beforeunload', () => cleanup())
  }

  function startGame() {
    if (host) host.hostStartGame()
    else client?.requestStart()
  }

  function performAction(action: PlayerAction) {
    if (host) host.hostAction(action)
    else client?.sendAction(action)
  }

  function requestRebuy() {
    if (host) host.hostRebuy()
    else client?.requestRebuy()
  }

  function nextHand() {
    showResult.value = false
    if (host) host.hostNextHand()
  }

  function dismissResult() { showResult.value = false }

  function cleanup() {
    host?.destroy(); client?.destroy()
    host = null; client = null
    role.value = 'none'; gameState.value = null
    lobbyPlayers.value = []; connected.value = false; showResult.value = false
  }

  return {
    role, roomCode, playerName, gameState, lobbyPlayers, error, connected,
    showResult, isMyTurn, myPlayer, canCheck, callAmount,
    createRoom, joinRoom, startGame, performAction, requestRebuy,
    nextHand, dismissResult, cleanup,
  }
})

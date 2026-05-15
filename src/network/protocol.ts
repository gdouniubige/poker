import type { GameState, PlayerAction } from '../engine/types'
import { cardToString } from '../engine/deck'

export type HostMessage =
  | { type: 'lobby_update'; players: { id: string; name: string; chips: number }[] }
  | { type: 'game_state'; state: SerializedGameState }
  | { type: 'error'; message: string }

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'action'; action: PlayerAction }
  | { type: 'leave' }
  | { type: 'start_game' }

export interface SerializedGameState {
  phase: string
  players: { id: string; name: string; chips: number; bet: number; folded: boolean; allIn: boolean; seatIndex: number; isHost: boolean }[]
  communityCards: string[]; pot: number
  sidePots: { amount: number; eligiblePlayerIds: string[] }[]
  currentPlayerIndex: number; dealerIndex: number
  sbIndex: number; bbIndex: number
  smallBlind: number; bigBlind: number; currentBet: number; minRaise: number
  initialChips: number; roundCount: number
  winners: { playerId: string; playerName: string; amount: number; handRank: number; handName: string; cards: string[] }[] | null
  showdown: { playerId: string; playerName: string; holeCards: [string, string]; cards: string[]; handName: string; handRank: number }[] | null
  yourCards?: [string, string]; yourId?: string
}

export function serializeGameState(state: GameState, forPlayerId?: string): SerializedGameState {
  return {
    phase: state.phase,
    players: state.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, bet: p.bet,
      folded: p.folded, allIn: p.allIn, seatIndex: p.seatIndex, isHost: p.isHost,
    })),
    communityCards: state.communityCards.map(c => cardToString(c)),
    pot: state.pot, sidePots: state.sidePots,
    currentPlayerIndex: state.currentPlayerIndex, dealerIndex: state.dealerIndex,
    sbIndex: state.sbIndex, bbIndex: state.bbIndex,
    smallBlind: state.smallBlind, bigBlind: state.bigBlind,
    currentBet: state.currentBet, minRaise: state.minRaise,
    initialChips: state.initialChips,
    roundCount: state.roundCount, winners: state.winners, showdown: state.showdown,
    yourCards: forPlayerId ? (() => {
      const you = state.players.find(p => p.id === forPlayerId)
      if (!you || !you.holeCards[0]) return undefined
      return [cardToString(you.holeCards[0]!), cardToString(you.holeCards[1]!)] as [string, string]
    })() : undefined,
    yourId: forPlayerId,
  }
}

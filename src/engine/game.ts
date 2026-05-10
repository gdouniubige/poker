import {
  GameState, GamePhase, PlayerAction, Card,
  GameConfig, DEFAULT_CONFIG, WinnerInfo, HAND_NAMES,
} from './types'
import { createDeck, shuffleDeck, dealCards } from './deck'
import { bestHand, compareHands } from './hand'
import { calculatePots } from './pot'

function nextActive(state: GameState, from: number): number {
  const n = state.players.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!state.players[idx].folded && !state.players[idx].allIn) return idx
  }
  return -1
}

function aliveCount(state: GameState): number {
  return state.players.filter(p => !p.folded).length
}

function activeCount(state: GameState): number {
  return state.players.filter(p => !p.folded && !p.allIn).length
}

function postBlind(state: GameState, idx: number, amount: number) {
  if (idx < 0) return
  const p = state.players[idx]
  const actual = Math.min(amount, p.chips)
  p.chips -= actual; p.bet = actual
  if (p.chips === 0) p.allIn = true
}

export function createInitialState(config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    phase: GamePhase.Waiting, players: [], communityCards: [],
    pot: 0, sidePots: [], currentPlayerIndex: 0, dealerIndex: 0,
    smallBlind: config.smallBlind, bigBlind: config.bigBlind,
    currentBet: 0, minRaise: config.bigBlind,
    initialChips: config.initialChips, roundCount: 0, winners: null,
  }
}

export function addPlayer(state: GameState, id: string, name: string, isHost: boolean): boolean {
  if (state.players.length >= 9) return false
  state.players.push({
    id, name, chips: state.initialChips, bet: 0,
    holeCards: [null, null], folded: false, allIn: false,
    seatIndex: state.players.length, isHost,
  })
  return true
}

export function removePlayer(state: GameState, id: string) {
  const idx = state.players.findIndex(p => p.id === id)
  if (idx === -1) return
  if (state.phase !== GamePhase.Waiting && !state.players[idx].folded) {
    state.players[idx].folded = true
  } else {
    state.players.splice(idx, 1)
  }
}

export function startHand(state: GameState): boolean {
  const eligible = state.players.filter(p => p.chips > 0)
  if (eligible.length < 2) return false

  state.communityCards = []; state.pot = 0; state.sidePots = []
  state.currentBet = state.bigBlind; state.minRaise = state.bigBlind
  state.winners = null

  for (const p of state.players) {
    p.bet = 0; p.holeCards = [null, null]
    p.folded = p.chips <= 0; p.allIn = false
  }

  const dIdx = state.dealerIndex
  for (let i = 1; i <= state.players.length; i++) {
    const idx = (dIdx + i) % state.players.length
    if (state.players[idx].chips > 0) { state.dealerIndex = idx; break }
  }

  const deck = shuffleDeck(createDeck())
  for (const p of state.players) {
    if (!p.folded) p.holeCards = [dealCards(deck, 1)[0], dealCards(deck, 1)[0]]
  }

  const sb = nextActive(state, state.dealerIndex)
  const bb = sb >= 0 ? nextActive(state, sb) : -1
  postBlind(state, sb, state.smallBlind)
  postBlind(state, bb, state.bigBlind)

  state.phase = GamePhase.Preflop
  state.currentPlayerIndex = bb >= 0 ? nextActive(state, bb) : nextActive(state, state.dealerIndex)
  state.roundCount++
  return true
}

export function processAction(state: GameState, playerIndex: number, action: PlayerAction): boolean {
  if (playerIndex !== state.currentPlayerIndex) return false
  const p = state.players[playerIndex]

  switch (action.type) {
    case 'fold':
      p.folded = true; break
    case 'check':
      if (state.currentBet - p.bet > 0) return false
      break
    case 'call': {
      const toCall = Math.min(state.currentBet - p.bet, p.chips)
      p.chips -= toCall; p.bet += toCall
      if (p.chips === 0) p.allIn = true
      break
    }
    case 'raise': {
      const toCall = state.currentBet - p.bet
      const raiseAmt = Math.min(action.amount, p.chips - toCall)
      if (raiseAmt < state.minRaise && p.chips > toCall + state.minRaise) return false
      p.chips -= toCall + raiseAmt; p.bet += toCall + raiseAmt
      state.currentBet = p.bet; state.minRaise = raiseAmt
      if (p.chips === 0) p.allIn = true
      break
    }
    case 'all_in': {
      const allInAmt = p.chips
      p.chips = 0; p.bet += allInAmt; p.allIn = true
      if (p.bet > state.currentBet) {
        state.minRaise = Math.max(state.minRaise, p.bet - state.currentBet)
        state.currentBet = p.bet
      }
      break
    }
  }

  advanceGame(state)
  return true
}

function advanceGame(state: GameState) {
  if (aliveCount(state) <= 1) { endHand(state); return }
  if (activeCount(state) === 0) { runOutBoard(state); endHand(state); return }

  const allMatched = state.players
    .filter(p => !p.folded && !p.allIn)
    .every(p => p.bet === state.currentBet)

  if (allMatched) {
    for (const p of state.players) p.bet = 0
    state.currentBet = 0

    switch (state.phase) {
      case GamePhase.Preflop:
        state.phase = GamePhase.Flop
        state.communityCards.push(...dealCards(shuffleDeck(createDeck()), 3))
        break
      case GamePhase.Flop:
        state.phase = GamePhase.Turn
        state.communityCards.push(dealCards(shuffleDeck(createDeck()), 1)[0])
        break
      case GamePhase.Turn:
        state.phase = GamePhase.River
        state.communityCards.push(dealCards(shuffleDeck(createDeck()), 1)[0])
        break
      case GamePhase.River:
        endHand(state); return
    }
    state.currentPlayerIndex = nextActive(state, state.dealerIndex)
    return
  }

  state.currentPlayerIndex = nextActive(state, state.currentPlayerIndex)
}

function runOutBoard(state: GameState) {
  const needed = 5 - state.communityCards.length
  if (needed > 0) state.communityCards.push(...dealCards(shuffleDeck(createDeck()), needed))
}

function endHand(state: GameState) {
  state.phase = GamePhase.Showdown
  const nonFolded = state.players.filter(p => !p.folded)

  if (nonFolded.length === 1) {
    const total = state.players.reduce((s, p) => s + p.bet, 0)
    nonFolded[0].chips += total; state.pot = total
    state.winners = [{
      playerId: nonFolded[0].id, playerName: nonFolded[0].name,
      amount: total, handRank: 0, handName: '全弃获胜',
    }]
    return
  }

  const results = nonFolded.map(p => ({
    player: p, result: bestHand(p.holeCards as Card[], state.communityCards),
  }))
  const { sidePots } = calculatePots(state.players)
  const winners: WinnerInfo[] = []
  const pots = sidePots.length > 0
    ? sidePots
    : [{ amount: state.players.reduce((s, p) => s + p.bet, 0), eligiblePlayerIds: nonFolded.map(p => p.id) }]

  for (const pot of pots) {
    if (pot.amount === 0) continue
    const eligible = results
      .filter(r => pot.eligiblePlayerIds.includes(r.player.id))
      .sort((a, b) => compareHands(b.result, a.result))
    if (eligible.length === 0) continue

    const best = eligible[0]
    const tied = eligible.filter(r => compareHands(r.result, best.result) === 0)
    const split = Math.floor(pot.amount / tied.length)
    const rem = pot.amount - split * tied.length

    for (const r of tied) {
      r.player.chips += split
      const existing = winners.find(w => w.playerId === r.player.id)
      if (existing) existing.amount += split
      else winners.push({
        playerId: r.player.id, playerName: r.player.name,
        amount: split, handRank: r.result.rank, handName: HAND_NAMES[r.result.rank],
      })
    }
    tied[0].player.chips += rem
    winners.find(w => w.playerId === tied[0].player.id)!.amount += rem
  }

  state.pot = state.players.reduce((s, p) => s + p.bet, 0)
  state.winners = winners
}

export function resetForNextHand(state: GameState) {
  state.phase = GamePhase.Waiting; state.communityCards = []
  state.currentBet = 0; state.sidePots = []; state.pot = 0; state.winners = null
  for (const p of state.players) { p.bet = 0; p.folded = false; p.allIn = false }
  state.players = state.players.filter(p => p.chips > 0)
}

export function playerRebuy(state: GameState, playerId: string) {
  const p = state.players.find(x => x.id === playerId)
  if (p) p.chips += state.initialChips
}

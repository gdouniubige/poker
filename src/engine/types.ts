export enum Suit { Spades = 's', Hearts = 'h', Diamonds = 'd', Clubs = 'c' }

export enum Rank {
  Two = 2, Three = 3, Four = 4, Five = 5, Six = 6,
  Seven = 7, Eight = 8, Nine = 9, Ten = 10,
  Jack = 11, Queen = 12, King = 13, Ace = 14,
}

export interface Card { suit: Suit; rank: Rank }

export enum HandRank {
  HighCard = 0, OnePair = 1, TwoPair = 2, ThreeOfAKind = 3,
  Straight = 4, Flush = 5, FullHouse = 6, FourOfAKind = 7,
  StraightFlush = 8, RoyalFlush = 9,
}

export interface HandResult { rank: HandRank; kickers: number[] }

export enum GamePhase {
  Waiting = 'waiting', Preflop = 'preflop', Flop = 'flop',
  Turn = 'turn', River = 'river', Showdown = 'showdown',
}

export interface PlayerState {
  id: string; name: string; chips: number; bet: number; totalBet: number
  holeCards: [Card | null, Card | null]
  folded: boolean; allIn: boolean; seatIndex: number; isHost: boolean
}

export interface SidePot { amount: number; eligiblePlayerIds: string[] }

export interface WinnerInfo {
  playerId: string; playerName: string; amount: number
  handRank: HandRank; handName: string
  cards: string[]
}

export interface ShowdownInfo {
  playerId: string; playerName: string
  holeCards: [string, string]; cards: string[]; handName: string; handRank: HandRank
}

export interface GameState {
  phase: GamePhase; players: PlayerState[]
  communityCards: Card[]; pot: number; sidePots: SidePot[]
  currentPlayerIndex: number; dealerIndex: number
  sbIndex: number; bbIndex: number
  smallBlind: number; bigBlind: number
  currentBet: number; minRaise: number
  initialChips: number; roundCount: number
  actedMask: number
  deck: Card[]
  winners: WinnerInfo[] | null
  showdown: ShowdownInfo[] | null
}

export type PlayerAction =
  | { type: 'fold' } | { type: 'check' } | { type: 'call' }
  | { type: 'raise'; amount: number } | { type: 'all_in' }

export interface GameConfig {
  smallBlind: number; bigBlind: number; initialChips: number; maxPlayers: number
}

export const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 1, bigBlind: 2, initialChips: 100, maxPlayers: 9,
}

export const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: '高牌', [HandRank.OnePair]: '一对',
  [HandRank.TwoPair]: '两对', [HandRank.ThreeOfAKind]: '三条',
  [HandRank.Straight]: '顺子', [HandRank.Flush]: '同花',
  [HandRank.FullHouse]: '葫芦', [HandRank.FourOfAKind]: '四条',
  [HandRank.StraightFlush]: '同花顺', [HandRank.RoyalFlush]: '皇家同花顺',
}

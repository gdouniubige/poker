import { Card, Suit, Rank } from './types'

const ALL_SUITS = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs]
const ALL_RANKS: Rank[] = [
  Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six,
  Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten,
  Rank.Jack, Rank.Queen, Rank.King, Rank.Ace,
]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

/** Fisher-Yates shuffle — mutates the array and returns it */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function dealCards(deck: Card[], count: number): Card[] {
  return deck.splice(0, count)
}

export function cardToString(card: Card): string {
  const suitSymbol: Record<Suit, string> = {
    [Suit.Spades]: '♠', [Suit.Hearts]: '♥',
    [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣',
  }
  const rankChar: Record<number, string> = {
    2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',
    11:'J',12:'Q',13:'K',14:'A',
  }
  return `${rankChar[card.rank]}${suitSymbol[card.suit]}`
}

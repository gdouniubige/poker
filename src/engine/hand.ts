import { Card, Rank, HandRank, HandResult } from './types'

/** Evaluate exactly 5 cards and return hand rank + kickers */
function evaluateFive(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank)
  const ranks = sorted.map(c => c.rank)
  const isFlush = new Set(cards.map(c => c.suit)).size === 1

  const distinct = new Set(ranks)
  const isNormalStraight = distinct.size === 5 && ranks[0] - ranks[4] === 4
  const isWheel = ranks[0] === Rank.Ace && ranks[1] === Rank.Five
    && ranks[2] === Rank.Four && ranks[3] === Rank.Three && ranks[4] === Rank.Two
  const isStraight = isNormalStraight || isWheel
  const straightHigh = isWheel ? Rank.Five : (isNormalStraight ? ranks[0] : 0)

  const freq = new Map<Rank, number>()
  for (const c of cards) freq.set(c.rank, (freq.get(c.rank) || 0) + 1)
  const groups = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  // groups: [[rank, count], ...] sorted by count desc, then rank desc

  if (isFlush && isStraight && straightHigh === Rank.Ace)
    return { rank: HandRank.RoyalFlush, kickers: [] }
  if (isFlush && isStraight)
    return { rank: HandRank.StraightFlush, kickers: [straightHigh] }
  if (groups[0][1] === 4)
    return { rank: HandRank.FourOfAKind, kickers: [groups[0][0], groups[1][0]] }
  if (groups[0][1] === 3 && groups[1][1] === 2)
    return { rank: HandRank.FullHouse, kickers: [groups[0][0], groups[1][0]] }
  if (isFlush)
    return { rank: HandRank.Flush, kickers: ranks }
  if (isStraight)
    return { rank: HandRank.Straight, kickers: [straightHigh] }
  if (groups[0][1] === 3)
    return { rank: HandRank.ThreeOfAKind, kickers: groups.map(g => g[0]) }
  if (groups[0][1] === 2 && groups[1][1] === 2)
    return { rank: HandRank.TwoPair, kickers: groups.map(g => g[0]) }
  if (groups[0][1] === 2)
    return { rank: HandRank.OnePair, kickers: groups.map(g => g[0]) }
  return { rank: HandRank.HighCard, kickers: ranks }
}

/** Compare two HandResults. Returns positive if a > b, negative if a < b, 0 if tie. */
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] ?? 0, bk = b.kickers[i] ?? 0
    if (ak !== bk) return ak - bk
  }
  return 0
}

/** Find best 5-card hand from hole cards + community cards (up to 7). */
export function bestHand(holeCards: Card[], communityCards: Card[]): HandResult {
  return bestHandWithCards(holeCards, communityCards).result
}

/** Like bestHand but also returns the 5 best cards. */
export function bestHandWithCards(holeCards: Card[], communityCards: Card[]): { result: HandResult; cards: Card[] } {
  const all = [...holeCards, ...communityCards]
  let best: HandResult = { rank: HandRank.HighCard, kickers: [] }
  let bestCards: Card[] = all.slice(0, 5)

  function combine(start: number, excluded: number[]) {
    if (excluded.length === all.length - 5) {
      const combo = all.filter((_, i) => !excluded.includes(i))
      const res = evaluateFive(combo)
      if (compareHands(res, best) > 0) { best = res; bestCards = combo }
      return
    }
    for (let i = start; i < all.length; i++) {
      excluded.push(i); combine(i + 1, excluded); excluded.pop()
    }
  }
  combine(0, [])
  return { result: best, cards: bestCards }
}

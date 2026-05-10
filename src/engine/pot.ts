import type { PlayerState, SidePot } from './types'

export interface PotResult { totalPot: number; sidePots: SidePot[] }

/** Calculate main pot and side pots from player bets */
export function calculatePots(players: PlayerState[]): PotResult {
  const active = players.filter(p => !p.folded)
  if (active.length === 0) return { totalPot: 0, sidePots: [] }

  const entries = active
    .map(p => ({ id: p.id, bet: p.bet }))
    .sort((a, b) => a.bet - b.bet)

  const sidePots: SidePot[] = []
  let previousLevel = 0

  for (let i = 0; i < entries.length; i++) {
    const level = entries[i].bet
    if (level === previousLevel) continue
    const contribution = level - previousLevel
    const eligible = entries.slice(i).map(e => e.id)
    sidePots.push({ amount: contribution * eligible.length, eligiblePlayerIds: eligible })
    previousLevel = level
  }

  const totalPot = sidePots.reduce((s, sp) => s + sp.amount, 0)
  return { totalPot, sidePots }
}

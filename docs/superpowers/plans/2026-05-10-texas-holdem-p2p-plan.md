# 德州扑克 P2P 对战 App — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** 构建一个纯浏览器端 P2P 德州扑克现金局应用，房主手机开热点，其他人连入即玩。

**Architecture:** Vue 3 + Vite 前端，PeerJS (WebRTC) P2P 星形拓扑（房主为中心），纯 TypeScript 游戏引擎与 UI 完全解耦，PWA 可安装到手机桌面。

**Tech Stack:** Vue 3, Vite, TypeScript, PeerJS, Pinia, vue-router, qrcode, vite-plugin-pwa

---

## File Map

```
dezhou/
├── src/
│   ├── engine/          # 纯游戏逻辑，零 UI 依赖
│   │   ├── types.ts     # Card, Suit, Rank, PlayerState, GameState, 操作类型
│   │   ├── deck.ts      # 创建牌组、洗牌、发牌、牌面转字符串
│   │   ├── hand.ts      # 5张牌评估 + 7选5最佳手牌 + 比大小
│   │   ├── pot.ts       # 主池 + 边池计算
│   │   └── game.ts      # 状态机：发牌 → 翻前 → 翻牌 → 转牌 → 河牌 → 结算
│   ├── network/
│   │   ├── protocol.ts  # 消息类型定义 + 序列化
│   │   ├── host.ts      # 房主端：PeerJS 服务 + 游戏引擎宿主
│   │   └── client.ts    # 玩家端：连接房主、收发消息
│   ├── store/
│   │   └── game.ts      # Pinia Store：统一管理 host/client 实例 + 响应式状态
│   ├── components/
│   │   ├── PokerCard.vue      # 单张扑克牌
│   │   ├── PlayerSeat.vue     # 玩家座位
│   │   ├── ActionBar.vue      # 操作按钮区
│   │   ├── CommunityCards.vue # 公共牌区
│   │   └── PotDisplay.vue     # 底池显示
│   ├── views/
│   │   ├── HomePage.vue  # 首页：创建/加入房间
│   │   ├── LobbyPage.vue # 房间大厅：玩家列表、等待开始
│   │   └── GamePage.vue  # 牌桌主界面
│   ├── router/index.ts
│   ├── App.vue
│   └── main.ts
├── public/icons/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 任务顺序与依赖

```
1(scaffold) → 2(types) → 3(deck) → 4(hand) → 5(pot) → 6(game)
                 ↓
              7(protocol) → 8(host) + 9(client)
                 ↓
    10(router) → 11(store) → 12-14(components) → 15-17(views) → 18(PWA) → 19(polish)
```

---

### Task 1: 项目脚手架

**文件:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.ts`, `src/App.vue`, `src/vite-env.d.ts`

- [ ] Scaffold Vite 项目并安装依赖

```bash
cd D:\dezhou
npm create vite@latest . -- --template vue-ts
npm install
npm install peerjs pinia vue-router@4 qrcode
npm install -D vitest vite-plugin-pwa
```

- [ ] 创建目录结构

```bash
mkdir -p src/engine src/network src/store src/components src/views src/router public/icons
```

- [ ] 写入 `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '德州扑克', short_name: '德扑',
        description: '朋友之间玩的德州扑克',
        theme_color: '#1a1a2e', background_color: '#1a1a2e',
        display: 'standalone', orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: { host: '0.0.0.0', port: 5173 }
})
```

- [ ] 写入 `index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <title>德州扑克</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] 验证

```bash
npx vite --host 0.0.0.0
# 预期：手机浏览器打开 http://<ip>:5173 能看到 Vite 默认页面
```

---

### Task 2: 引擎类型定义

**文件:** 创建 `src/engine/types.ts`

```typescript
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
  id: string; name: string; chips: number; bet: number
  holeCards: [Card | null, Card | null]
  folded: boolean; allIn: boolean; seatIndex: number; isHost: boolean
}

export interface SidePot { amount: number; eligiblePlayerIds: string[] }

export interface GameState {
  phase: GamePhase; players: PlayerState[]
  communityCards: Card[]; pot: number; sidePots: SidePot[]
  currentPlayerIndex: number; dealerIndex: number
  smallBlind: number; bigBlind: number
  currentBet: number; minRaise: number
  initialChips: number; roundCount: number
  winners: WinnerInfo[] | null
}

export interface WinnerInfo {
  playerId: string; playerName: string; amount: number
  handRank: HandRank; handName: string
}

export type PlayerAction =
  | { type: 'fold' } | { type: 'check' } | { type: 'call' }
  | { type: 'raise'; amount: number } | { type: 'all_in' }

export interface GameConfig {
  smallBlind: number; bigBlind: number; initialChips: number; maxPlayers: number
}

export const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 1, bigBlind: 2, initialChips: 1000, maxPlayers: 9,
}

export const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: '高牌', [HandRank.OnePair]: '一对',
  [HandRank.TwoPair]: '两对', [HandRank.ThreeOfAKind]: '三条',
  [HandRank.Straight]: '顺子', [HandRank.Flush]: '同花',
  [HandRank.FullHouse]: '葫芦', [HandRank.FourOfAKind]: '四条',
  [HandRank.StraightFlush]: '同花顺', [HandRank.RoyalFlush]: '皇家同花顺',
}
```

```bash
npx vue-tsc --noEmit  # 验证编译
```

---

### Task 3: 牌组模块

**文件:** 创建 `src/engine/deck.ts`

```typescript
import { Card, Suit, Rank } from './types'

const ALL_SUITS = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs]
const ALL_RANKS: Rank[] = [
  Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six,
  Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten,
  Rank.Jack, Rank.Queen, Rank.King, Rank.Ace,
]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of ALL_SUITS) for (const rank of ALL_RANKS) deck.push({ suit, rank })
  return deck
}

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
  const suits: Record<Suit, string> = { [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣' }
  const ranks: Record<number, string> = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' }
  return `${ranks[card.rank]}${suits[card.suit]}`
}
```

```bash
npx vue-tsc --noEmit
```

---

### Task 4: 手牌评估

**文件:** 创建 `src/engine/hand.ts`

```typescript
import { Card, Rank, HandRank, HandResult } from './types'

/** 评估 5 张牌，返回牌型 + 踢脚牌 */
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
  // groups: [[rank, count], ...] 按数量降序、牌值降序

  if (isFlush && isStraight && straightHigh === Rank.Ace) return { rank: HandRank.RoyalFlush, kickers: [] }
  if (isFlush && isStraight) return { rank: HandRank.StraightFlush, kickers: [straightHigh] }
  if (groups[0][1] === 4) return { rank: HandRank.FourOfAKind, kickers: [groups[0][0], groups[1][0]] }
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: HandRank.FullHouse, kickers: [groups[0][0], groups[1][0]] }
  if (isFlush) return { rank: HandRank.Flush, kickers: ranks }
  if (isStraight) return { rank: HandRank.Straight, kickers: [straightHigh] }
  if (groups[0][1] === 3) return { rank: HandRank.ThreeOfAKind, kickers: groups.map(g => g[0]) }
  if (groups[0][1] === 2 && groups[1][1] === 2) return { rank: HandRank.TwoPair, kickers: groups.map(g => g[0]) }
  if (groups[0][1] === 2) return { rank: HandRank.OnePair, kickers: groups.map(g => g[0]) }
  return { rank: HandRank.HighCard, kickers: ranks }
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] ?? 0, bk = b.kickers[i] ?? 0
    if (ak !== bk) return ak - bk
  }
  return 0
}

/** 从最多7张牌中选出最佳5张组合 */
export function bestHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const all = [...holeCards, ...communityCards]
  let best: HandResult = { rank: HandRank.HighCard, kickers: [] }

  function combine(start: number, excluded: number[]) {
    if (excluded.length === all.length - 5) {
      const combo = all.filter((_, i) => !excluded.includes(i))
      const res = evaluateFive(combo)
      if (compareHands(res, best) > 0) best = res
      return
    }
    for (let i = start; i < all.length; i++) { excluded.push(i); combine(i + 1, excluded); excluded.pop() }
  }
  combine(0, [])
  return best
}
```

```bash
npx vue-tsc --noEmit
```

---

### Task 5: 底池计算

**文件:** 创建 `src/engine/pot.ts`

```typescript
import type { PlayerState, SidePot } from './types'

export interface PotResult { totalPot: number; sidePots: SidePot[] }

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
```

```bash
npx vue-tsc --noEmit
```

---

### Task 6: 游戏状态机

**文件:** 创建 `src/engine/game.ts`

```typescript
import {
  GameState, GamePhase, PlayerState, PlayerAction, Card,
  GameConfig, DEFAULT_CONFIG, WinnerInfo, HAND_NAMES,
} from './types'
import { createDeck, shuffleDeck, dealCards } from './deck'
import { bestHand, compareHands } from './hand'
import { calculatePots } from './pot'

// ─── 辅助 ───

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

// ─── 公开 API ───

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

  // 移动庄位
  const dIdx = state.dealerIndex
  for (let i = 1; i <= state.players.length; i++) {
    const idx = (dIdx + i) % state.players.length
    if (state.players[idx].chips > 0) { state.dealerIndex = idx; break }
  }

  // 发牌
  const deck = shuffleDeck(createDeck())
  for (const p of state.players) {
    if (!p.folded) p.holeCards = [dealCards(deck, 1)[0], dealCards(deck, 1)[0]]
  }

  // 盲注
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
```

```bash
npx vue-tsc --noEmit
```

---

### Task 7: 网络协议

**文件:** 创建 `src/network/protocol.ts`

```typescript
import type { GameState, PlayerAction } from '../engine/types'
import { cardToString } from '../engine/deck'

export type HostMessage =
  | { type: 'lobby_update'; players: { id: string; name: string; chips: number }[] }
  | { type: 'game_state'; state: SerializedGameState }
  | { type: 'error'; message: string }

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'action'; action: PlayerAction }
  | { type: 'rebuy' }
  | { type: 'leave' }
  | { type: 'start_game' }

export interface SerializedGameState {
  phase: string
  players: { id: string; name: string; chips: number; bet: number; folded: boolean; allIn: boolean; seatIndex: number; isHost: boolean }[]
  communityCards: string[]; pot: number
  sidePots: { amount: number; eligiblePlayerIds: string[] }[]
  currentPlayerIndex: number; dealerIndex: number
  smallBlind: number; bigBlind: number; currentBet: number
  initialChips: number; roundCount: number
  winners: { playerId: string; playerName: string; amount: number; handRank: number; handName: string }[] | null
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
    smallBlind: state.smallBlind, bigBlind: state.bigBlind,
    currentBet: state.currentBet, initialChips: state.initialChips,
    roundCount: state.roundCount, winners: state.winners,
    yourCards: forPlayerId ? (() => {
      const you = state.players.find(p => p.id === forPlayerId)
      if (!you || !you.holeCards[0]) return undefined
      return [cardToString(you.holeCards[0]!), cardToString(you.holeCards[1]!)] as [string, string]
    })() : undefined,
    yourId: forPlayerId,
  }
}
```

```bash
npx vue-tsc --noEmit
```

---

### Task 8: 房主端网络层

**文件:** 创建 `src/network/host.ts`

```typescript
import Peer, { DataConnection } from 'peerjs'
import type { HostMessage, ClientMessage } from './protocol'
import { serializeGameState } from './protocol'
import type { GameState, PlayerAction } from '../engine/types'
import {
  createInitialState, addPlayer, startHand, processAction,
  resetForNextHand, playerRebuy, removePlayer,
} from '../engine/game'

export interface HostCallbacks {
  onLobbyUpdate: (players: { id: string; name: string; chips: number }[]) => void
  onGameStateChange: (state: GameState) => void
}

export class GameHost {
  private peer!: Peer
  private conns = new Map<string, DataConnection>()
  gameState!: GameState
  private cb!: HostCallbacks

  createRoom(roomCode: string, hostName: string, callbacks: HostCallbacks): Promise<void> {
    this.cb = callbacks
    this.gameState = createInitialState()
    addPlayer(this.gameState, 'host-self', hostName, true)

    return new Promise((resolve, reject) => {
      this.peer = new Peer(`poker-host-${roomCode}`)
      this.peer.on('open', () => { this.emitLobby(); resolve() })
      this.peer.on('error', (err) => reject(err))
      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          conn.on('data', (raw: unknown) => this.handleMessage(conn, raw as ClientMessage))
        })
        conn.on('close', () => {
          const pid = [...this.conns.entries()].find(([, c]) => c === conn)?.[0]
          if (pid) { this.conns.delete(pid); removePlayer(this.gameState, pid); this.emitLobby() }
        })
      })
    })
  }

  private handleMessage(conn: DataConnection, msg: ClientMessage) {
    const pid = conn.peer
    switch (msg.type) {
      case 'join': {
        if (this.gameState.phase !== 'waiting') { conn.send({ type: 'error', message: '游戏已开始' } as HostMessage); return }
        if (!addPlayer(this.gameState, pid, msg.name, false)) { conn.send({ type: 'error', message: '房间已满' } as HostMessage); return }
        this.conns.set(pid, conn); this.emitLobby(); break
      }
      case 'start_game': {
        if (!startHand(this.gameState)) { conn.send({ type: 'error', message: '人数不足' } as HostMessage); return }
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'action': {
        const idx = this.gameState.players.findIndex(p => p.id === pid)
        processAction(this.gameState, idx, msg.action)
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'rebuy': {
        playerRebuy(this.gameState, pid)
        this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); break
      }
      case 'leave': {
        this.conns.delete(pid); removePlayer(this.gameState, pid); conn.close(); this.emitLobby(); break
      }
    }
  }

  hostAction(action: PlayerAction) {
    const idx = this.gameState.players.findIndex(p => p.isHost)
    processAction(this.gameState, idx, action)
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState)
  }

  hostStartGame(): boolean {
    if (!startHand(this.gameState)) return false
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState); return true
  }

  hostRebuy() {
    playerRebuy(this.gameState, 'host-self')
    this.broadcastGameState(); this.cb.onGameStateChange(this.gameState)
  }

  hostNextHand() { resetForNextHand(this.gameState); this.emitLobby() }

  private broadcastGameState() {
    for (const [pid, conn] of this.conns) {
      conn.send({ type: 'game_state', state: serializeGameState(this.gameState, pid) } as HostMessage)
    }
  }

  private emitLobby() {
    const players = this.gameState.players.map(p => ({ id: p.id, name: p.name, chips: p.chips }))
    for (const conn of this.conns.values()) conn.send({ type: 'lobby_update', players } as HostMessage)
    this.cb.onLobbyUpdate(players)
  }

  destroy() { for (const conn of this.conns.values()) conn.close(); this.peer?.destroy() }
}
```

```bash
npx vue-tsc --noEmit
```

---

### Task 9: 玩家端网络层

**文件:** 创建 `src/network/client.ts`

```typescript
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
```

```bash
npx vue-tsc --noEmit
```

---

### Task 10: 路由与 App Shell

**文件:** 创建 `src/router/index.ts`，修改 `src/main.ts`, `src/App.vue`, `src/style.css`

```typescript
// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomePage.vue') },
    { path: '/lobby', name: 'lobby', component: () => import('../views/LobbyPage.vue') },
    { path: '/game', name: 'game', component: () => import('../views/GamePage.vue') },
  ],
})
```

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

```vue
<!-- src/App.vue -->
<template><router-view /></template>
```

```css
/* src/style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; width: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e; color: #eee;
  -webkit-tap-highlight-color: transparent;
}
button { -webkit-appearance: none; border: none; outline: none; cursor: pointer; font: inherit; }
input { -webkit-appearance: none; border: none; outline: none; font: inherit; }
```

```bash
npx vue-tsc --noEmit && npx vite --host 0.0.0.0
# 预期：空白深色页面，无报错
```

---

### Task 11: Pinia Store

**文件:** 创建 `src/store/game.ts`

```typescript
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
      onLobbyUpdate(players) { lobbyPlayers.value = players; connected.value = true },
      onGameStateChange(state) {
        gameState.value = serializeGameState(state, 'host-self')
        if (state.winners) showResult.value = true
      },
    })
  }

  async function joinRoom(name: string, code: string) {
    role.value = 'client'; playerName.value = name; roomCode.value = code
    client = new GameClient()
    await client.joinRoom(code, name, {
      onLobbyUpdate(players) { lobbyPlayers.value = players; connected.value = true },
      onGameState(state) { gameState.value = state; if (state.winners) showResult.value = true },
      onError(msg) { error.value = msg },
      onDisconnected() { connected.value = false; error.value = '与房主断开连接' },
    })
  }

  function startGame() { if (host) host.hostStartGame(); else client?.requestStart() }
  function performAction(action: PlayerAction) { if (host) host.hostAction(action); else client?.sendAction(action) }
  function requestRebuy() { if (host) host.hostRebuy(); else client?.requestRebuy() }
  function nextHand() { showResult.value = false; if (host) host.hostNextHand() }
  function dismissResult() { showResult.value = false }
  function cleanup() {
    host?.destroy(); client?.destroy(); host = null; client = null
    role.value = 'none'; gameState.value = null; lobbyPlayers.value = []
    connected.value = false; showResult.value = false
  }

  return {
    role, roomCode, playerName, gameState, lobbyPlayers, error, connected,
    showResult, isMyTurn, myPlayer, canCheck, callAmount,
    createRoom, joinRoom, startGame, performAction, requestRebuy,
    nextHand, dismissResult, cleanup,
  }
})
```

```bash
npx vue-tsc --noEmit
```

---

### Task 12: PokerCard 组件

**文件:** 创建 `src/components/PokerCard.vue`

```vue
<template>
  <div class="card" :class="{ red: isRed, faceDown: !card }">
    <template v-if="card">
      <span class="rank">{{ rank }}</span>
      <span class="suit">{{ suit }}</span>
    </template>
    <span v-else class="back">🂠</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ card?: string | null }>()
const rank = computed(() => props.card ? props.card.slice(0, -1) : '')
const suit = computed(() => {
  if (!props.card) return ''
  const s = props.card.slice(-1)
  return { s: '♠', h: '♥', d: '♦', c: '♣' }[s] || s
})
const isRed = computed(() => props.card ? 'hd'.includes(props.card.slice(-1)) : false)
</script>

<style scoped>
.card { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 40px; height: 56px; border-radius: 4px; background: #fff; color: #222; font-weight: bold; font-size: 14px; line-height: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.3); flex-shrink: 0; }
.card.red { color: #d32f2f; }
.card.faceDown { background: #1565c0; color: #fff; font-size: 20px; }
.rank { font-size: 14px; }
.suit { font-size: 16px; margin-top: -2px; }
.back { font-size: 24px; }
</style>
```

---

### Task 13: PlayerSeat 组件

**文件:** 创建 `src/components/PlayerSeat.vue`

```vue
<template>
  <div class="seat" :class="{ active: isActive, folded: player.folded, 'is-you': isYou }">
    <div class="avatar">{{ player.name[0] }}</div>
    <div class="info">
      <span class="name">{{ player.name }}</span>
      <span class="chips">{{ player.chips }}分</span>
      <span v-if="player.bet > 0" class="bet">下注 {{ player.bet }}</span>
    </div>
    <div class="badges">
      <span v-if="player.isHost" class="badge host">房主</span>
      <span v-if="player.allIn" class="badge allin">ALL-IN</span>
      <span v-if="player.folded" class="badge fold">弃牌</span>
      <span v-if="isDealer" class="badge dealer">D</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  player: { id: string; name: string; chips: number; bet: number; folded: boolean; allIn: boolean; isHost: boolean }
  isActive: boolean; isYou: boolean; isDealer: boolean
}>()
</script>

<style scoped>
.seat { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); transition: all 0.2s; }
.seat.active { background: rgba(76,175,80,0.2); border: 1px solid #4caf50; }
.seat.folded { opacity: 0.4; }
.seat.is-you { background: rgba(33,150,243,0.15); }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #37474f; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; flex-shrink: 0; }
.info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 500; }
.chips { font-size: 12px; color: #ffd54f; }
.bet { font-size: 12px; color: #81c784; }
.badges { display: flex; gap: 4px; flex-wrap: wrap; }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.badge.host { background: #ff9800; color: #000; }
.badge.allin { background: #f44336; }
.badge.fold { background: #666; }
.badge.dealer { background: #fff; color: #000; font-weight: bold; min-width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
</style>
```

---

### Task 14: 剩余 UI 组件

**文件:** 创建 `src/components/CommunityCards.vue`, `src/components/PotDisplay.vue`, `src/components/ActionBar.vue`

**CommunityCards.vue:**
```vue
<template>
  <div class="community">
    <PokerCard v-for="(card, i) in cards" :key="i" :card="card" />
    <PokerCard v-for="i in (5 - cards.length)" :key="'e'+i" :card="null" />
  </div>
</template>
<script setup lang="ts">
import PokerCard from './PokerCard.vue'
defineProps<{ cards: string[] }>()
</script>
<style scoped>
.community { display: flex; gap: 4px; justify-content: center; }
</style>
```

**PotDisplay.vue:**
```vue
<template>
  <div class="pot">
    <span class="label">底池</span>
    <span class="amount">{{ amount }}分</span>
  </div>
</template>
<script setup lang="ts">
defineProps<{ amount: number }>()
</script>
<style scoped>
.pot { display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 12px; background: rgba(255,255,255,0.08); }
.label { font-size: 12px; color: #aaa; }
.amount { font-size: 14px; color: #ffd54f; font-weight: bold; }
</style>
```

**ActionBar.vue:**
```vue
<template>
  <div class="actions" v-if="visible">
    <button v-if="canCheck" class="btn check" @click="$emit('check')">过牌</button>
    <button v-if="callAmount > 0" class="btn call" @click="$emit('call')">跟注 {{ callAmount }}</button>
    <button v-if="canRaise" class="btn raise" @click="$emit('raise', raiseAmount)">加注 {{ raiseAmount }}</button>
    <button class="btn fold" @click="$emit('fold')">弃牌</button>
    <button class="btn allin" @click="$emit('allin')">ALL-IN</button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ visible: boolean; canCheck: boolean; callAmount: number; currentBet: number; minRaise: number; myChips: number }>()
defineEmits<{ fold: []; check: []; call: []; raise: [amount: number]; allin: [] }>()
const raiseAmount = computed(() => Math.min(props.currentBet + props.minRaise * 2, props.myChips))
const canRaise = computed(() => props.myChips > props.callAmount + props.minRaise)
</script>
<style scoped>
.actions { display: flex; gap: 6px; padding: 8px; justify-content: center; flex-wrap: wrap; }
.btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 15px; color: #fff; min-width: 64px; }
.btn.check { background: #4caf50; } .btn.call { background: #2196f3; }
.btn.raise { background: #ff9800; } .btn.fold { background: #f44336; }
.btn.allin { background: #9c27b0; }
</style>
```

```bash
npx vue-tsc --noEmit
```

---

### Task 15: HomePage 页面

**文件:** 创建 `src/views/HomePage.vue`

```vue
<template>
  <div class="home">
    <h1 class="title">♠ 德州扑克 ♥</h1>
    <p class="subtitle">朋友面对面 · 无赌博 · 纯娱乐</p>

    <div class="actions">
      <button class="btn primary" @click="showCreate = true">创建房间</button>
      <div class="join-row">
        <input v-model="joinCode" placeholder="房间码" maxlength="6" class="input" />
        <button class="btn secondary" @click="showJoin = true" :disabled="!joinCode">加入房间</button>
      </div>
    </div>

    <p v-if="store.error" class="error">{{ store.error }}</p>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>创建房间</h3>
        <input v-model="createName" placeholder="你的昵称" maxlength="8" class="input" />
        <button class="btn primary" @click="doCreate" :disabled="!createName">确定</button>
        <button class="btn cancel" @click="showCreate = false">取消</button>
      </div>
    </div>

    <div v-if="showJoin" class="modal-overlay" @click.self="showJoin = false">
      <div class="modal">
        <h3>加入房间 {{ joinCode }}</h3>
        <input v-model="joinName" placeholder="你的昵称" maxlength="8" class="input" />
        <button class="btn primary" @click="doJoin" :disabled="!joinName">确定</button>
        <button class="btn cancel" @click="showJoin = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'

const router = useRouter(); const store = useGameStore()
const showCreate = ref(false); const showJoin = ref(false)
const createName = ref(''); const joinName = ref('')
const joinCode = ref('')

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase() }

async function doCreate() {
  store.error = ''
  try { await store.createRoom(createName.value, genCode()); router.push('/lobby') }
  catch (e: any) { store.error = e.message || '创建失败' }
}

async function doJoin() {
  store.error = ''
  try { await store.joinRoom(joinName.value, joinCode.value.toUpperCase()); router.push('/lobby') }
  catch (e: any) { store.error = e.message || '加入失败' }
}
</script>

<style scoped>
.home { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 24px; gap: 16px; }
.title { font-size: 32px; } .subtitle { font-size: 14px; color: #aaa; }
.actions { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 300px; }
.join-row { display: flex; gap: 8px; }
.input { flex: 1; padding: 12px 16px; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; font-size: 16px; }
.btn { padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; color: #fff; }
.btn.primary { background: #4caf50; } .btn.secondary { background: #2196f3; }
.btn.cancel { background: #666; margin-top: 8px; } .btn:disabled { opacity: 0.4; }
.error { color: #f44336; font-size: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #263238; padding: 24px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; width: 280px; align-items: center; }
.modal h3 { font-size: 18px; } .modal .input { width: 100%; }
</style>
```

```bash
npx vue-tsc --noEmit
```

---

### Task 16: LobbyPage 页面

**文件:** 创建 `src/views/LobbyPage.vue`

```vue
<template>
  <div class="lobby">
    <div class="header">
      <h2>房间 {{ store.roomCode }}</h2>
      <p class="count">{{ store.lobbyPlayers.length }} / 9 人</p>
    </div>

    <div class="players">
      <div v-for="p in store.lobbyPlayers" :key="p.id" class="player">
        <div class="avatar">{{ p.name[0] }}</div>
        <span class="name">{{ p.name }}</span>
        <span class="badge" v-if="p.id === 'host-self' || store.lobbyPlayers[0]?.id === p.id">房主</span>
      </div>
      <div v-if="store.lobbyPlayers.length === 0" class="empty">等待玩家加入...</div>
    </div>

    <div class="bottom">
      <button v-if="store.role === 'host'" class="btn start" :disabled="store.lobbyPlayers.length < 2" @click="store.startGame()">
        开始游戏
      </button>
      <p v-else class="waiting">等待房主开始游戏...</p>
      <button class="btn leave" @click="doLeave">离开房间</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'

const store = useGameStore(); const router = useRouter()

watch(() => store.gameState, (s) => { if (s && s.phase !== 'waiting') router.replace('/game') })

function doLeave() { store.cleanup(); router.replace('/') }
</script>

<style scoped>
.lobby { display: flex; flex-direction: column; height: 100%; padding: 16px; }
.header { text-align: center; margin-bottom: 16px; }
.header h2 { font-size: 24px; color: #ffd54f; } .count { font-size: 14px; color: #aaa; }
.players { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.player { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.06); }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #37474f; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0; }
.name { font-size: 16px; flex: 1; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #ff9800; color: #000; }
.empty { text-align: center; color: #666; padding: 40px 0; }
.bottom { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; }
.btn { padding: 14px; border-radius: 10px; font-size: 17px; font-weight: 600; color: #fff; }
.btn.start { background: #4caf50; } .btn.start:disabled { opacity: 0.3; }
.btn.leave { background: #424242; }
.waiting { text-align: center; color: #aaa; font-size: 14px; }
</style>
```

```bash
npx vue-tsc --noEmit
```

---

### Task 17: GamePage 页面

**文件:** 创建 `src/views/GamePage.vue`

```vue
<template>
  <div class="game-page" v-if="store.gameState">
    <!-- 顶栏 -->
    <div class="top-bar">
      <PotDisplay :amount="store.gameState.pot" />
      <span class="blinds">{{ store.gameState.smallBlind }}/{{ store.gameState.bigBlind }}</span>
      <span class="phase">{{ phaseName }}</span>
    </div>

    <!-- 公共牌 -->
    <CommunityCards :cards="store.gameState.communityCards" />

    <!-- 其他玩家列表 -->
    <div class="players-list">
      <PlayerSeat
        v-for="(p, i) in otherPlayers" :key="p.id"
        :player="p" :is-active="store.gameState.currentPlayerIndex === getPlayerIndex(p.id)"
        :is-you="false" :is-dealer="getPlayerIndex(p.id) === store.gameState.dealerIndex"
      />
    </div>

    <!-- 自己的区域 -->
    <div class="my-area" v-if="store.myPlayer">
      <div class="my-cards">
        <PokerCard v-for="(c, i) in myCards" :key="i" :card="c" />
      </div>
      <div class="my-info">
        <span class="my-name">{{ store.playerName }}</span>
        <span class="my-chips">{{ store.myPlayer.chips }}分</span>
      </div>
    </div>

    <!-- 操作栏 -->
    <ActionBar
      :visible="store.isMyTurn"
      :can-check="store.canCheck" :call-amount="store.callAmount"
      :current-bet="store.gameState.currentBet"
      :min-raise="store.gameState.currentBet > 0 ? store.gameState.currentBet : store.gameState.bigBlind"
      :my-chips="store.myPlayer?.chips ?? 0"
      @fold="store.performAction({ type: 'fold' })"
      @check="store.performAction({ type: 'check' })"
      @call="store.performAction({ type: 'call' })"
      @raise="(n: number) => store.performAction({ type: 'raise', amount: n })"
      @allin="store.performAction({ type: 'all_in' })"
    />

    <!-- 等待提示 -->
    <div v-if="!store.isMyTurn && store.gameState.phase !== 'waiting' && store.gameState.phase !== 'showdown'" class="wait-turn">
      等待 {{ currentPlayerName }} 行动...
    </div>

    <!-- 结算弹窗 -->
    <div v-if="store.showResult && store.gameState.winners" class="modal-overlay" @click.self="store.dismissResult()">
      <div class="result-modal">
        <h3>结算</h3>
        <div v-for="w in store.gameState.winners" :key="w.playerId" class="winner">
          <span class="wn">{{ w.playerName }}</span>
          <span class="wh">{{ w.handName }}</span>
          <span class="wa">+{{ w.amount }}分</span>
        </div>
        <button v-if="store.role === 'host'" class="btn next" @click="store.nextHand()">下一局</button>
        <button v-else class="btn next" @click="store.dismissResult()">等待房主</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import PokerCard from '../components/PokerCard.vue'
import PlayerSeat from '../components/PlayerSeat.vue'
import CommunityCards from '../components/CommunityCards.vue'
import PotDisplay from '../components/PotDisplay.vue'
import ActionBar from '../components/ActionBar.vue'

const store = useGameStore(); const router = useRouter()

const phaseNames: Record<string, string> = {
  waiting: '等待', preflop: '翻前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌',
}
const phaseName = computed(() => phaseNames[store.gameState?.phase ?? ''] || '')
const otherPlayers = computed(() => {
  if (!store.gameState) return []
  const myId = store.role === 'host' ? 'host-self' : store.gameState.yourId
  return store.gameState.players.filter(p => p.id !== myId)
})
const myCards = computed(() => store.gameState?.yourCards || [])
const currentPlayerName = computed(() => {
  if (!store.gameState) return ''
  const idx = store.gameState.currentPlayerIndex
  return store.gameState.players[idx]?.name || ''
})
function getPlayerIndex(id: string): number {
  return store.gameState?.players.findIndex(p => p.id === id) ?? -1
}

watch(() => store.gameState?.phase, (p) => { if (p === 'waiting') router.replace('/lobby') })
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; height: 100%; padding: 8px; gap: 8px; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; }
.blinds, .phase { font-size: 13px; color: #aaa; }
.players-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.my-area { display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(33,150,243,0.1); border-radius: 8px; }
.my-cards { display: flex; gap: 4px; }
.my-info { display: flex; flex-direction: column; }
.my-name { font-size: 15px; font-weight: 600; } .my-chips { font-size: 13px; color: #ffd54f; }
.wait-turn { text-align: center; color: #aaa; padding: 8px; font-size: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.result-modal { background: #263238; padding: 20px; border-radius: 12px; width: 280px; display: flex; flex-direction: column; gap: 10px; text-align: center; }
.winner { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
.wn { font-weight: 600; } .wh { color: #ffd54f; } .wa { color: #4caf50; font-weight: 600; }
.btn.next { padding: 10px; border-radius: 8px; background: #4caf50; color: #fff; font-weight: 600; font-size: 15px; }
</style>
```

```bash
npx vue-tsc --noEmit
```

---

### Task 18: PWA 图标与构建

**文件:** `public/icons/icon.svg`

- [ ] 生成 SVG 占位图标

```bash
cat > public/icons/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1a1a2e" rx="80"/>
  <text x="256" y="300" font-size="280" text-anchor="middle" fill="#4caf50" font-family="serif">♠</text>
</svg>
EOF
```

- [ ] 更新 `vite.config.ts` 中 PWA 图标引用，加入 SVG 兜底

```typescript
icons: [
  { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
]
```

- [ ] 构建验证

```bash
npx vite build
```
预期：`dist/` 目录生成，包含所有编译产物和 service worker

- [ ] 全量类型检查

```bash
npx vue-tsc --noEmit
```
预期：零类型错误

---

### Task 19: 边缘情况修复与打磨

- [ ] **防止移动端缩放/滚动**

在 `App.vue` 中添加：
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
  }, { passive: false })
})
</script>
```

- [ ] **URL 深链房间码**

在 `HomePage.vue` 的 `<script setup>` 中加入：
```typescript
import { onMounted } from 'vue'
onMounted(() => {
  const hash = window.location.hash
  const q = hash.slice(hash.indexOf('?'))
  const room = new URLSearchParams(q).get('room')
  if (room) { joinCode.value = room; showJoin.value = true }
})
```

- [ ] **页面关闭时清理连接**

在 store 的 `createRoom` 和 `joinRoom` 末尾添加：
```typescript
window.addEventListener('beforeunload', () => cleanup())
```

- [ ] **买入和离开按钮**

在 `GamePage.vue` 中 ActionBar 之上添加：
```vue
<div class="util-bar">
  <button class="btn-small rebuy" @click="store.requestRebuy()">买入 (+{{ store.gameState?.initialChips }}分)</button>
  <button class="btn-small leave" @click="doLeave">离开</button>
</div>
```
对应的 script 和 style：
```typescript
function doLeave() { store.cleanup(); router.replace('/') }
```
```css
.util-bar { display: flex; gap: 8px; justify-content: center; padding: 4px; }
.btn-small { padding: 6px 14px; border-radius: 6px; font-size: 13px; color: #fff; }
.btn-small.rebuy { background: #ff9800; }
.btn-small.leave { background: #616161; }
```

- [ ] **加注快捷金额按钮**

在 `ActionBar.vue` 中，把单个「加注」按钮替换为三个快捷按钮（1BB, 2BB, 3BB）：
```vue
<button v-if="canRaise" class="btn raise" @click="$emit('raise', minRaise)">+{{ minRaise }}</button>
<button v-if="canRaise2x" class="btn raise" @click="$emit('raise', minRaise * 2)">+{{ minRaise * 2 }}</button>
<button v-if="canRaise3x" class="btn raise" @click="$emit('raise', minRaise * 3)">+{{ minRaise * 3 }}</button>
```
```typescript
const canRaise2x = computed(() => props.myChips > props.callAmount + props.minRaise * 2)
const canRaise3x = computed(() => props.myChips > props.callAmount + props.minRaise * 3)
```

---

## 验证清单

所有任务完成后：

1. `npm run dev -- --host 0.0.0.0` — 手机 A 打开，创建房间
2. 手机 B 用房间码加入 — 大厅看到两人
3. 房主开始游戏 — 双方进入牌桌，能看到手牌和公共牌
4. 测试 fold / check / call / raise / all-in
5. 三人局测试边池（一人 all-in 少于当前注额）
6. 结算弹窗正确显示赢家和牌型
7. 下一局正常开始（庄位轮转）
8. 断线重连：切 App → 回浏览器
9. `npm run build` 构建通过，PWA 可添加到桌面

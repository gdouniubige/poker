<template>
  <div class="game-page" v-if="store.gameState">
    <div class="top-bar">
      <PotDisplay :amount="store.gameState.pot" />
      <span class="blinds">赌博之路就是灭亡之途</span>
      <span class="phase">{{ phaseName }}</span>
    </div>

    <CommunityCards :cards="store.gameState.communityCards" :round="store.gameState.roundCount" />

    <div class="players-list">
      <PlayerSeat
        v-for="p in otherPlayers" :key="p.id"
        :player="p"
        :is-active="store.gameState.currentPlayerIndex === getPlayerIndex(p.id)"
        :is-you="false"
        :is-dealer="getPlayerIndex(p.id) === store.gameState.dealerIndex"
        :is-s-b="getPlayerIndex(p.id) === store.gameState.sbIndex"
        :is-b-b="getPlayerIndex(p.id) === store.gameState.bbIndex"
      />
    </div>

    <div class="my-area" :class="{ eliminated: store.myPlayer && store.myPlayer.chips === 0 && !store.myPlayer.allIn }" v-if="store.myPlayer">
      <div class="my-cards">
        <PokerCard v-for="(c, i) in myCards" :key="store.gameState.roundCount + '-' + i" :card="c" :delay="100 + i * 80" />
      </div>
      <div class="my-info">
        <span class="my-name">{{ store.playerName }}</span>
        <span class="my-chips">{{ store.myPlayer.chips }}分</span>
        <span v-if="store.myPlayer.bet > 0" class="my-bet">已下 {{ store.myPlayer.bet }} 分</span>
      </div>
      <div class="my-badges">
        <span v-if="selfIndex === store.gameState.dealerIndex" class="badge dealer">D</span>
        <span v-if="selfIndex === store.gameState.sbIndex" class="badge sb">SB</span>
        <span v-if="selfIndex === store.gameState.bbIndex" class="badge bb">BB</span>
        <span v-if="store.myPlayer && store.myPlayer.folded" class="badge fold">弃牌</span>
        <span v-if="store.myPlayer && store.myPlayer.chips === 0 && !store.myPlayer.allIn" class="badge eliminated">已淘汰</span>
      </div>
    </div>

    <div class="util-bar">
      <button class="btn-small leave" @click="doLeave">离开</button>
    </div>

    <ActionBar
      :visible="store.isMyTurn"
      :can-check="store.canCheck"
      :call-amount="store.callAmount"
      :current-bet="store.gameState.currentBet"
      :min-raise="store.gameState.minRaise"
      :my-chips="store.myPlayer?.chips ?? 0"
      @fold="fold()"
      @check="check()"
      @call="call()"
      @raise="raise"
      @allin="allin()"
    />

    <div v-if="!store.connected" class="reconnect-bar">重连中...</div>
    <div v-if="store.connected && !store.isMyTurn && store.gameState.phase !== 'waiting' && store.gameState.phase !== 'showdown'" class="wait-turn">
      等待 {{ currentPlayerName }} 行动...
    </div>

    <!-- Hand result modal -->
    <div v-if="store.showResult && !store.gameOver && store.gameState.winners" class="modal-overlay" @click.self="store.nextHand()">
      <div class="result-modal">
        <h3 class="result-title">结算</h3>

        <div class="result-scroll">
          <div v-if="store.gameState.showdown" class="showdown-section">
            <div v-for="sd in store.gameState.showdown" :key="sd.playerId" class="showdown-player" :class="{ winner: isWinner(sd.playerId) }">
              <div class="sp-top">
                <span class="sp-name">{{ sd.playerName }}</span>
                <div class="sp-hole">
                  <PokerCard v-for="(c, ci) in sd.holeCards" :key="'h'+ci" :card="c" small />
                </div>
                <div class="sp-cards">
                  <PokerCard v-for="(c, ci) in sd.cards" :key="ci" :card="c" small />
                </div>
              </div>
              <span class="sp-hand">{{ sd.handName }}</span>
            </div>
          </div>

          <div class="winners-list">
            <div v-for="w in store.gameState.winners" :key="w.playerId" class="winner">
              <span class="wn">{{ w.playerName }}</span>
              <span class="wa">+{{ w.amount }}分</span>
            </div>
          </div>
        </div>

        <div class="result-footer">
          <button v-if="store.role === 'host'" class="btn next" @click="store.nextHand()">下一局</button>
          <p v-else class="auto-text">等待房主开始下一局</p>
        </div>
      </div>
    </div>

    <!-- Game over modal -->
    <div v-if="store.showResult && store.gameOver" class="modal-overlay">
      <div class="result-modal">
        <h3>游戏结束</h3>
        <p class="champion">{{ store.gameOver.name }} 赢下全部!</p>
        <p class="champion-chips">{{ store.gameOver.chips }} 分</p>
        <button class="btn next" @click="doLeave">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import { useSound } from '../composables/useSound'
import PokerCard from '../components/PokerCard.vue'
import PlayerSeat from '../components/PlayerSeat.vue'
import CommunityCards from '../components/CommunityCards.vue'
import PotDisplay from '../components/PotDisplay.vue'
import ActionBar from '../components/ActionBar.vue'

const store = useGameStore()
const router = useRouter()
const sound = useSound()

const phaseNames: Record<string, string> = {
  waiting: '等待', preflop: '翻前', flop: '翻牌',
  turn: '转牌', river: '河牌', showdown: '摊牌',
}
const phaseName = computed(() => phaseNames[store.gameState?.phase ?? ''] || '')

const selfIndex = computed(() => {
  const myId = store.role === 'host' ? 'host-self' : store.gameState?.yourId
  return store.gameState?.players.findIndex(p => p.id === myId) ?? -1
})

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


function doLeave() { store.cleanup(); router.replace('/') }

function getPlayerIndex(id: string): number {
  return store.gameState?.players.findIndex(p => p.id === id) ?? -1
}

function isWinner(playerId: string): boolean {
  return store.gameState?.winners?.some(w => w.playerId === playerId) ?? false
}

// ─── Sound effects ───

// Community cards reveal (flop/turn/river)
let prevCommLen = 0
watch(() => store.gameState?.communityCards?.length, (len) => {
  if (len && len > prevCommLen && len > 0) sound.reveal(len - prevCommLen)
  prevCommLen = len || 0
})

// Hole cards dealt (new hand)
let hadCards = false
watch(() => store.gameState?.yourCards, (cards) => {
  if (cards && cards.length === 2 && !hadCards) {
    sound.card(); setTimeout(() => sound.card(), 150)
  }
  hadCards = !!(cards && cards.length === 2)
})

// Your turn notification
let wasMyTurn = false
watch(() => store.isMyTurn, (turn) => {
  if (turn && !wasMyTurn) sound.yourTurn()
  wasMyTurn = turn
})

// Win / settlement
watch(() => store.showResult, (showing) => {
  if (showing && store.gameState?.winners?.length) sound.win()
})

// Eliminated
let prevChips = -1
watch(() => store.myPlayer?.chips, (chips) => {
  if (prevChips > 0 && chips === 0 && !store.myPlayer?.allIn) sound.eliminated()
  prevChips = chips ?? -1
})

// ─── Action sounds ───
function fold()   { sound.fold(); store.performAction({ type: 'fold' }) }
function check()  { sound.check(); store.performAction({ type: 'check' }) }
function call()   { sound.call(); store.performAction({ type: 'call' }) }
function raise(n: number) { sound.raise(); store.performAction({ type: 'raise', amount: n }) }
function allin()  { sound.allIn(); store.performAction({ type: 'all_in' }) }

watch(() => store.gameState?.phase, (p) => {
  if (p === 'waiting') router.replace('/lobby')
})
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; height: 100%; padding: 8px; gap: 8px; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; }
.blinds { font-size: 10px; color: #666; white-space: nowrap; }
.phase { font-size: 13px; color: #aaa; }
.players-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.my-area { display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(33,150,243,0.1); border-radius: 8px; }
.my-area.eliminated { background: rgba(244,67,54,0.12); }
.my-cards { display: flex; gap: 4px; }
.my-info { display: flex; flex-direction: column; flex: 1; }
.my-name { font-size: 15px; font-weight: 600; }
.my-chips { font-size: 13px; color: #ffd54f; }
.my-bet { font-size: 12px; color: #81c784; }
.my-badges { display: flex; gap: 4px; }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.badge.dealer { background: #fff; color: #000; }
.badge.sb { background: #2196f3; }
.badge.bb { background: #f44336; }
.badge.eliminated { background: #b71c1c; }
.badge.fold { background: #666; }
.wait-turn { text-align: center; color: #aaa; padding: 8px; font-size: 14px; }
.reconnect-bar { text-align: center; color: #ff9800; padding: 8px; font-size: 14px; background: rgba(255,152,0,0.1); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.result-modal { background: #263238; border-radius: 12px; width: 360px; max-height: 80vh; display: flex; flex-direction: column; text-align: center; }
.result-title { padding: 16px 16px 8px; font-size: 18px; flex-shrink: 0; }
.result-scroll { flex: 1; overflow-y: auto; padding: 0 16px; display: flex; flex-direction: column; gap: 6px; }
.result-footer { padding: 10px 16px 16px; flex-shrink: 0; }
.showdown-section { display: flex; flex-direction: column; gap: 4px; }
.showdown-player { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.showdown-player.winner { background: rgba(76,175,80,0.15); border-radius: 4px; padding: 4px 6px; }
.sp-top { display: flex; align-items: center; gap: 4px; }
.sp-name { font-weight: 600; font-size: 13px; min-width: 44px; text-align: left; flex-shrink: 0; }
.sp-hole { display: flex; gap: 0; flex-shrink: 0; margin-right: 4px; }
.sp-cards { display: flex; gap: 2px; justify-content: center; flex-shrink: 0; }
.sp-hand { color: #ffd54f; font-size: 12px; }
.winners-list { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 6px; margin-top: 4px; }
.winner { display: flex; justify-content: space-between; padding: 2px 0; font-size: 14px; }
.wn { font-weight: 600; }
.wa { color: #4caf50; font-weight: 600; }
.btn.next { padding: 12px; border-radius: 8px; background: #4caf50; color: #fff; font-weight: 600; font-size: 16px; width: 100%; }
.auto-text { color: #aaa; font-size: 13px; }
.champion { font-size: 18px; font-weight: 600; }
.champion-chips { font-size: 24px; color: #ffd54f; font-weight: bold; }
.util-bar { display: flex; gap: 8px; justify-content: center; padding: 4px; }
.btn-small { padding: 6px 14px; border-radius: 6px; font-size: 13px; color: #fff; }
.btn-small.leave { background: #616161; }
</style>

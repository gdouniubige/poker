<template>
  <div class="game-page" v-if="store.gameState">
    <div class="top-bar">
      <PotDisplay :amount="store.gameState.pot" />
      <span class="blinds">{{ store.gameState.smallBlind }}/{{ store.gameState.bigBlind }}</span>
      <span class="phase">{{ phaseName }}</span>
    </div>

    <CommunityCards :cards="store.gameState.communityCards" />

    <div class="players-list">
      <PlayerSeat
        v-for="p in otherPlayers" :key="p.id"
        :player="p"
        :is-active="store.gameState.currentPlayerIndex === getPlayerIndex(p.id)"
        :is-you="false"
        :is-dealer="getPlayerIndex(p.id) === store.gameState.dealerIndex"
      />
    </div>

    <div class="my-area" v-if="store.myPlayer">
      <div class="my-cards">
        <PokerCard v-for="(c, i) in myCards" :key="i" :card="c" />
      </div>
      <div class="my-info">
        <span class="my-name">{{ store.playerName }}</span>
        <span class="my-chips">{{ store.myPlayer.chips }}分</span>
      </div>
    </div>

    <div class="util-bar">
      <button class="btn-small rebuy" @click="store.requestRebuy()">买入 (+{{ store.gameState?.initialChips }}分)</button>
      <button class="btn-small leave" @click="doLeave">离开</button>
    </div>

    <ActionBar
      :visible="store.isMyTurn"
      :can-check="store.canCheck"
      :call-amount="store.callAmount"
      :current-bet="store.gameState.currentBet"
      :min-raise="store.gameState.currentBet > 0 ? store.gameState.currentBet : store.gameState.bigBlind"
      :my-chips="store.myPlayer?.chips ?? 0"
      @fold="store.performAction({ type: 'fold' })"
      @check="store.performAction({ type: 'check' })"
      @call="store.performAction({ type: 'call' })"
      @raise="(n: number) => store.performAction({ type: 'raise', amount: n })"
      @allin="store.performAction({ type: 'all_in' })"
    />

    <div v-if="!store.isMyTurn && store.gameState.phase !== 'waiting' && store.gameState.phase !== 'showdown'" class="wait-turn">
      等待 {{ currentPlayerName }} 行动...
    </div>

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

const store = useGameStore()
const router = useRouter()

const phaseNames: Record<string, string> = {
  waiting: '等待', preflop: '翻前', flop: '翻牌',
  turn: '转牌', river: '河牌', showdown: '摊牌',
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

function doLeave() { store.cleanup(); router.replace('/') }

function getPlayerIndex(id: string): number {
  return store.gameState?.players.findIndex(p => p.id === id) ?? -1
}

watch(() => store.gameState?.phase, (p) => {
  if (p === 'waiting') router.replace('/lobby')
})
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; height: 100%; padding: 8px; gap: 8px; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; }
.blinds, .phase { font-size: 13px; color: #aaa; }
.players-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.my-area { display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(33,150,243,0.1); border-radius: 8px; }
.my-cards { display: flex; gap: 4px; }
.my-info { display: flex; flex-direction: column; }
.my-name { font-size: 15px; font-weight: 600; }
.my-chips { font-size: 13px; color: #ffd54f; }
.wait-turn { text-align: center; color: #aaa; padding: 8px; font-size: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.result-modal { background: #263238; padding: 20px; border-radius: 12px; width: 280px; display: flex; flex-direction: column; gap: 10px; text-align: center; }
.winner { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
.wn { font-weight: 600; }
.wh { color: #ffd54f; }
.wa { color: #4caf50; font-weight: 600; }
.btn.next { padding: 10px; border-radius: 8px; background: #4caf50; color: #fff; font-weight: 600; font-size: 15px; }
.util-bar { display: flex; gap: 8px; justify-content: center; padding: 4px; }
.btn-small { padding: 6px 14px; border-radius: 6px; font-size: 13px; color: #fff; }
.btn-small.rebuy { background: #ff9800; }
.btn-small.leave { background: #616161; }
</style>

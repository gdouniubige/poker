<template>
  <div class="actions" v-if="visible">
    <button v-if="canCheck" class="btn check" @click="$emit('check')">过牌</button>
    <button v-if="callAmount > 0" class="btn call" @click="$emit('call')">跟注 {{ callAmount }}</button>
    <button v-if="canRaise" class="btn raise" @click="$emit('raise', minRaise)">+{{ minRaise }}</button>
    <button v-if="canRaise2x" class="btn raise" @click="$emit('raise', minRaise * 2)">+{{ minRaise * 2 }}</button>
    <button v-if="canRaise3x" class="btn raise" @click="$emit('raise', minRaise * 3)">+{{ minRaise * 3 }}</button>
    <button class="btn fold" @click="$emit('fold')">弃牌</button>
    <button class="btn allin" @click="$emit('allin')">ALL-IN</button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ visible: boolean; canCheck: boolean; callAmount: number; currentBet: number; minRaise: number; myChips: number }>()
defineEmits<{ fold: []; check: []; call: []; raise: [amount: number]; allin: [] }>()
const canRaise = computed(() => props.myChips > props.callAmount + props.minRaise)
const canRaise2x = computed(() => props.myChips > props.callAmount + props.minRaise * 2)
const canRaise3x = computed(() => props.myChips > props.callAmount + props.minRaise * 3)
</script>
<style scoped>
.actions { display: flex; gap: 6px; padding: 8px; justify-content: center; flex-wrap: wrap; }
.btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 15px; color: #fff; min-width: 64px; }
.btn.check { background: #4caf50; } .btn.call { background: #2196f3; }
.btn.raise { background: #ff9800; } .btn.fold { background: #f44336; }
.btn.allin { background: #9c27b0; }
</style>

<template>
  <div class="actions" v-if="visible">
    <button v-if="canCheck" class="btn check" @click="$emit('check')">过牌</button>
    <button v-if="callAmount > 0" class="btn call" @click="$emit('call')">跟注 {{ callAmount }}</button>
    <template v-if="canRaise">
      <button class="btn adj" @click="adjust(-1)">−</button>
      <input v-model.number="raiseInput" type="number" class="raise-input" :min="1" :max="maxRaise" />
      <button class="btn adj" @click="adjust(1)">+</button>
      <button class="btn raise" @click="doRaise">加注 {{ raiseInput }}</button>
    </template>
    <button class="btn fold" @click="$emit('fold')">弃牌</button>
    <button class="btn allin" @click="$emit('allin')">ALL-IN</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean; canCheck: boolean; callAmount: number
  currentBet: number; minRaise: number; myChips: number
}>()
const emit = defineEmits<{ fold: []; check: []; call: []; raise: [amount: number]; allin: [] }>()

const canRaise = computed(() => props.myChips >= props.callAmount + 1)

// Raise amount range: minRaise ~ (myChips - callAmount)
const maxRaise = computed(() => props.myChips - props.callAmount)

const raiseInput = ref(1)

watch(() => props.visible, (visible) => {
  if (visible) raiseInput.value = 1
})

function adjust(delta: number) {
  const v = raiseInput.value + delta
  if (v >= 1 && v <= maxRaise.value) raiseInput.value = v
}

function doRaise() {
  const val = Math.min(Math.max(raiseInput.value, 1), maxRaise.value)
  raiseInput.value = val
  emit('raise', val)
}
</script>

<style scoped>
.actions { display: flex; gap: 6px; padding: 8px; justify-content: center; flex-wrap: wrap; align-items: center; }
.btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 15px; color: #fff; min-width: 64px; }
.btn.check { background: #4caf50; }
.btn.call { background: #2196f3; }
.btn.raise { background: #ff9800; }
.btn.fold { background: #f44336; }
.btn.allin { background: #9c27b0; }
.btn.adj { background: rgba(255,255,255,0.15); min-width: 40px; padding: 10px 12px; }
.raise-input {
  width: 72px; padding: 10px 6px; border-radius: 8px;
  background: rgba(255,255,255,0.12); color: #fff;
  font-size: 15px; font-weight: 600; text-align: center;
}
</style>

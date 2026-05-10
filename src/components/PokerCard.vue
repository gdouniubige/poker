<template>
  <div class="card" :class="{ red: isRed, faceDown: !card }">
    <template v-if="card">
      <span class="rank">{{ rank }}</span>
      <span class="suit">{{ suit }}</span>
    </template>
    <span v-else class="back">?</span>
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
.card {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 40px; height: 56px; border-radius: 4px;
  background: #fff; color: #222; font-weight: bold;
  font-size: 14px; line-height: 1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3); flex-shrink: 0;
}
.card.red { color: #d32f2f; }
.card.faceDown { background: #1565c0; color: #fff; font-size: 20px; }
.rank { font-size: 14px; }
.suit { font-size: 16px; margin-top: -2px; }
.back { font-size: 24px; }
</style>

<template>
  <div class="community">
    <PokerCard v-for="(card, i) in cards" :key="round + '-c' + i" :card="card" :delay="150 + i * 120" />
    <PokerCard v-for="i in (5 - cards.length)" :key="'e'+i" :card="null" />
  </div>
</template>
<script setup lang="ts">
import PokerCard from './PokerCard.vue'
defineProps<{ cards: string[]; round?: number }>()
</script>
<style scoped>
.community { display: flex; gap: 4px; justify-content: center; }
</style>

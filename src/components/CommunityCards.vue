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

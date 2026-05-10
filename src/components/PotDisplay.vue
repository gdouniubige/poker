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

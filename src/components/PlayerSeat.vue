<template>
  <div class="seat" :class="{ active: isActive, folded: player.folded, 'is-you': isYou, eliminated: player.chips === 0 && !player.allIn }">
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
      <span v-if="isSB" class="badge sb">SB</span>
      <span v-if="isBB" class="badge bb">BB</span>
      <span v-if="player.chips === 0 && !player.allIn" class="badge eliminated">已淘汰</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  player: { id: string; name: string; chips: number; bet: number; folded: boolean; allIn: boolean; isHost: boolean }
  isActive: boolean; isYou: boolean; isDealer: boolean; isSB: boolean; isBB: boolean
}>()
</script>

<style scoped>
.seat {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.05); transition: all 0.2s;
}
.seat.active { background: rgba(76,175,80,0.2); border: 1px solid #4caf50; }
.seat.folded { opacity: 0.4; }
.seat.is-you { background: rgba(33,150,243,0.15); }
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #37474f; display: flex; align-items: center;
  justify-content: center; font-weight: bold; font-size: 16px; flex-shrink: 0;
}
.info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name { font-size: 14px; font-weight: 500; }
.chips { font-size: 12px; color: #ffd54f; }
.bet { font-size: 12px; color: #81c784; }
.badges { display: flex; gap: 4px; flex-wrap: wrap; }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.badge.host { background: #ff9800; color: #000; }
.badge.allin { background: #f44336; }
.badge.fold { background: #666; }
.badge.sb { background: #2196f3; font-size: 9px; }
.badge.bb { background: #f44336; font-size: 9px; }
.badge.eliminated { background: #b71c1c; font-size: 9px; }
.seat.eliminated { opacity: 0.55; background: rgba(244,67,54,0.1); }
.badge.dealer {
  background: #fff; color: #000; font-weight: bold;
  min-width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
</style>

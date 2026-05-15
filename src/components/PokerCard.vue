<template>
  <div
    class="card"
    :class="{ red: isRed, dealt: !!card, small: small }"
    :style="{ animationDelay: (delay ?? 0) + 'ms' }"
  >
    <div
      class="card-inner"
      :class="{ flipped: !!card }"
      :style="{ transitionDelay: ((delay ?? 0) + 350) + 'ms' }"
    >
      <!-- Front face -->
      <div class="card-front">
        <div class="corner top-left">
          <span class="corner-rank">{{ rank }}</span>
          <span class="corner-suit">{{ suit }}</span>
        </div>
        <span class="center-suit">{{ suit }}</span>
        <div class="corner bottom-right">
          <span class="corner-rank">{{ rank }}</span>
          <span class="corner-suit">{{ suit }}</span>
        </div>
      </div>
      <!-- Back face -->
      <div class="card-back">
        <div class="back-inner">
          <span class="back-icon">♠</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ card?: string | null; delay?: number; small?: boolean }>()
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
  width: 44px; height: 62px; border-radius: 5px;
  flex-shrink: 0;
  perspective: 600px;
}
.card.dealt {
  animation: dealIn 0.35s ease-out both;
}
.card-inner {
  width: 100%; height: 100%;
  transition: transform 0.4s ease-out;
  transform-style: preserve-3d;
  position: relative;
}
.card-inner.flipped {
  transform: rotateY(180deg);
}

/* ─── Front ─── */
.card-front {
  position: absolute; inset: 0;
  border-radius: 5px;
  background: linear-gradient(135deg, #fefefe, #f0f0f0);
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2), inset 0 0 0 0.5px rgba(0,0,0,0.04);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: rotateY(180deg);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.center-suit { font-size: 20px; }

.corner {
  position: absolute;
  display: flex; flex-direction: column;
  align-items: center; line-height: 1;
}
.top-left    { top: 3px; left: 3px; }
.bottom-right { bottom: 3px; right: 3px; transform: rotate(180deg); }
.corner-rank { font-size: 11px; font-weight: 700; }
.corner-suit { font-size: 9px; margin-top: -1px; }

/* ─── Back ─── */
.card-back {
  position: absolute; inset: 0;
  border-radius: 5px;
  background: linear-gradient(135deg, #0d47a1, #1565c0);
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center;
}
.back-inner {
  width: calc(100% - 8px); height: calc(100% - 8px);
  border-radius: 3px;
  border: 1.5px solid rgba(255,255,255,0.35);
  display: flex; align-items: center; justify-content: center;
}
.back-icon {
  font-size: 18px; color: rgba(255,255,255,0.45);
}

/* ─── Suit colors ─── */
.card-front { color: #1a1a1a; }
.card.red .card-front { color: #c62828; }

/* ─── Small variant ─── */
.card.small { width: 32px; height: 44px; border-radius: 4px; }
.card.small .center-suit { font-size: 14px; }
.card.small .corner-rank { font-size: 8px; }
.card.small .corner-suit { font-size: 7px; }
.card.small .corner { line-height: 1; }
.card.small .top-left { top: 2px; left: 2px; }
.card.small .bottom-right { bottom: 2px; right: 2px; }
.card.small .back-icon { font-size: 13px; }
.card.small .card-back { border-width: 1.5px; }
.card.small .back-inner { width: calc(100% - 6px); height: calc(100% - 6px); border-radius: 2px; }

@keyframes dealIn {
  0% { transform: translateY(-36px) scale(0.5); opacity: 0; }
  60% { transform: translateY(2px) scale(1.05); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
</style>

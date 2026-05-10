<template>
  <div class="lobby">
    <div class="header">
      <h2>房间 {{ store.roomCode }}</h2>
      <p class="count">{{ store.lobbyPlayers.length }} / 9 人</p>
    </div>

    <div class="players">
      <div v-for="p in store.lobbyPlayers" :key="p.id" class="player">
        <div class="avatar">{{ p.name[0] }}</div>
        <span class="name">{{ p.name }}</span>
        <span class="badge" v-if="p.id === 'host-self' || store.lobbyPlayers[0]?.id === p.id">房主</span>
      </div>
      <div v-if="store.lobbyPlayers.length === 0" class="empty">等待玩家加入...</div>
    </div>

    <div class="bottom">
      <button
        v-if="store.role === 'host'"
        class="btn start"
        :disabled="store.lobbyPlayers.length < 2"
        @click="store.startGame()"
      >开始游戏</button>
      <p v-else class="waiting">等待房主开始游戏...</p>
      <button class="btn leave" @click="doLeave">离开房间</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'

const store = useGameStore()
const router = useRouter()

watch(() => store.gameState, (s) => {
  if (s && s.phase !== 'waiting') router.replace('/game')
})

function doLeave() { store.cleanup(); router.replace('/') }
</script>

<style scoped>
.lobby { display: flex; flex-direction: column; height: 100%; padding: 16px; }
.header { text-align: center; margin-bottom: 16px; }
.header h2 { font-size: 24px; color: #ffd54f; }
.count { font-size: 14px; color: #aaa; }
.players { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.player { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.06); }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #37474f; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0; }
.name { font-size: 16px; flex: 1; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #ff9800; color: #000; }
.empty { text-align: center; color: #666; padding: 40px 0; }
.bottom { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; }
.btn { padding: 14px; border-radius: 10px; font-size: 17px; font-weight: 600; color: #fff; }
.btn.start { background: #4caf50; }
.btn.start:disabled { opacity: 0.3; }
.btn.leave { background: #424242; }
.waiting { text-align: center; color: #aaa; font-size: 14px; }
</style>

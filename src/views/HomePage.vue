<template>
  <div class="home">
    <h1 class="title">♠ 德州扑克 ♥</h1>
    <p class="subtitle">朋友面对面 · 无赌博 · 纯娱乐</p>

    <div class="actions">
      <button class="btn primary" @click="showCreate = true">创建房间</button>
      <div class="join-row">
        <input v-model="joinCode" placeholder="房间码" maxlength="6" class="input" />
        <button class="btn secondary" @click="showJoin = true" :disabled="!joinCode">加入房间</button>
      </div>
    </div>

    <p v-if="store.error" class="error">{{ store.error }}</p>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>创建房间</h3>
        <input v-model="createName" placeholder="你的昵称" maxlength="8" class="input" />
        <button class="btn primary" @click="doCreate" :disabled="!createName">确定</button>
        <button class="btn cancel" @click="showCreate = false">取消</button>
      </div>
    </div>

    <div v-if="showJoin" class="modal-overlay" @click.self="showJoin = false">
      <div class="modal">
        <h3>加入房间 {{ joinCode }}</h3>
        <input v-model="joinName" placeholder="你的昵称" maxlength="8" class="input" />
        <button class="btn primary" @click="doJoin" :disabled="!joinName">确定</button>
        <button class="btn cancel" @click="showJoin = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'

const router = useRouter()
const store = useGameStore()
const showCreate = ref(false)
const showJoin = ref(false)
const createName = ref('')
const joinName = ref('')
const joinCode = ref('')

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase() }

async function doCreate() {
  store.error = ''
  try {
    await store.createRoom(createName.value, genCode())
    router.push('/lobby')
  } catch (e: any) {
    store.error = e.message || '创建失败'
  }
}

async function doJoin() {
  store.error = ''
  try {
    await store.joinRoom(joinName.value, joinCode.value.toUpperCase())
    router.push('/lobby')
  } catch (e: any) {
    store.error = e.message || '加入失败'
  }
}
</script>

<style scoped>
.home { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 24px; gap: 16px; }
.title { font-size: 32px; }
.subtitle { font-size: 14px; color: #aaa; }
.actions { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 300px; }
.join-row { display: flex; gap: 8px; }
.input { flex: 1; padding: 12px 16px; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; font-size: 16px; }
.btn { padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; color: #fff; }
.btn.primary { background: #4caf50; }
.btn.secondary { background: #2196f3; }
.btn.cancel { background: #666; margin-top: 8px; }
.btn:disabled { opacity: 0.4; }
.error { color: #f44336; font-size: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #263238; padding: 24px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; width: 280px; align-items: center; }
.modal h3 { font-size: 18px; }
.modal .input { width: 100%; }
</style>

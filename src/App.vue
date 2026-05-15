<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from './store/game'

const router = useRouter()
const store = useGameStore()

onMounted(async () => {
  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
  }, { passive: false })

  // Restore session after page reload
  if (store.role === 'none') {
    const restored = await store.restoreSession()
    if (restored) {
      // Navigate to the right page
      if (store.gameState && store.gameState.phase !== 'waiting') {
        router.replace('/game')
      } else if (store.connected) {
        router.replace('/lobby')
      }
    }
  }
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; width: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e; color: #eee;
  -webkit-tap-highlight-color: transparent;
}
button { -webkit-appearance: none; border: none; outline: none; cursor: pointer; font: inherit; }
input { -webkit-appearance: none; border: none; outline: none; font: inherit; }
</style>

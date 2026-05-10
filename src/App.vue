<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
  }, { passive: false })
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

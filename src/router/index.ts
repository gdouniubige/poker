import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomePage.vue') },
    { path: '/lobby', name: 'lobby', component: () => import('../views/LobbyPage.vue') },
    { path: '/game', name: 'game', component: () => import('../views/GamePage.vue') },
  ],
})

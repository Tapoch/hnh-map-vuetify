import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import MapView from '../components/MapView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', component: MapView },
  { path: '/character/:characterId', component: MapView },
  { path: '/grid/:map/:gridX/:gridY/:zoom', component: MapView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

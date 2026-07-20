import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/home/index.vue')
  },
  {
    path: '/discover',
    name: 'discover',
    component: () => import('@/pages/discover/index.vue')
  },
  {
    path: '/movie/:id',
    name: 'detail',
    component: () => import('@/pages/detail/index.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/pages/profile/index.vue')
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/pages/auth/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

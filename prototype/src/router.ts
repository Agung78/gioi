import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('./views/LandingView.vue'),
    meta: { public: true },
  },
  {
    path: '/book',
    name: 'book',
    component: () => import('./views/BookingView.vue'),
    meta: { public: true },
  },
  {
    path: '/confirmation/:code',
    name: 'confirmation',
    component: () => import('./views/ConfirmationView.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/host',
    name: 'host',
    component: () => import('./views/HostView.vue'),
    meta: { roles: ['SUPER_ADMIN', 'HOST'] },
  },
  {
    path: '/guests/:id',
    name: 'guest',
    component: () => import('./views/GuestProfileView.vue'),
    meta: { roles: ['SUPER_ADMIN', 'HOST'] },
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('./views/AdminDashboardView.vue'),
    meta: { roles: ['SUPER_ADMIN'] },
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: () => import('./views/AdminSettingsView.vue'),
    meta: { roles: ['SUPER_ADMIN'] },
  },
  {
    path: '/admin/audit',
    name: 'admin-audit',
    component: () => import('./views/AdminAuditView.vue'),
    meta: { roles: ['SUPER_ADMIN'] },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!auth.user) auth.hydrate()
  const required = to.meta?.roles as string[] | undefined
  if (!required) return true
  if (!auth.user) return { name: 'login', query: { next: to.fullPath } }
  if (!required.includes(auth.user.role)) {
    return auth.user.role === 'HOST' ? { name: 'host' } : { name: 'login' }
  }
  return true
})

export default router
import { nextTick } from 'vue'
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
    return { top: 0, behavior: 'instant' }
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

// page switch: native View Transitions cross-fade; unsupported browsers swap instantly
let finishTransition: (() => void) | undefined
router.beforeResolve((to, from) => {
  if (!document.startViewTransition || !from.matched.length || to.path === from.path) return
  return new Promise<void>((ready) => {
    document.startViewTransition(() => new Promise<void>((done) => { finishTransition = done; ready() }))
  })
})
router.afterEach(() => nextTick(() => { finishTransition?.(); finishTransition = undefined }))

export default router
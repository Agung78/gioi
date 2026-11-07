import { computed, ref, watchEffect } from 'vue'
import { useRoute } from '#app'

// host and admin default to dark (dim dining room); guests follow the OS. Toggle persists per browser.
const theme = ref<string | null>((() => { try { return localStorage.getItem('gioi-theme') } catch { return null } })())

const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null
const osDark = ref(mq ? mq.matches : false)
if (mq) mq.addEventListener('change', (e) => { osDark.value = e.matches })

export function useTheme() {
  const route = useRoute()
  const isDark = computed(() => (theme.value ?? (route.meta?.public ? (osDark.value ? 'dark' : 'light') : 'dark')) === 'dark')
  function toggleTheme() {
    const next = isDark.value ? 'light' : 'dark'
    const apply = () => {
      theme.value = next
      document.documentElement.dataset.theme = next
      try { localStorage.setItem('gioi-theme', next) } catch { /* private mode */ }
    }
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply()
    const root = document.documentElement
    root.classList.add('theme-vt')
    document.startViewTransition(apply).finished.finally(() => root.classList.remove('theme-vt'))
  }
  return { isDark, toggleTheme }
}

export function applyTheme(isDark: { value: boolean }) {
  watchEffect(() => {
    document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark.value ? '#102638' : '#1F4A6B')
  })
}

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
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transitioning')
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning')
      }, 300)
    }
    theme.value = isDark.value ? 'light' : 'dark'
    try { localStorage.setItem('gioi-theme', theme.value) } catch { /* private mode */ }
  }
  return { isDark, toggleTheme }
}

export function applyTheme(isDark: { value: boolean }) {
  watchEffect(() => {
    document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark.value ? '#102638' : '#1F4A6B')
  })
}

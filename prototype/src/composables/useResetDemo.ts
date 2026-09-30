import { useDataStore } from '../stores/data'

const STORAGE_KEYS = [
  'gioi.auth.v1',
  'gioi.settings.v1',
  'gioi.reservations.v1',
  'gioi.guests.v1',
  'gioi.audit.v1',
  'gioi.users.v1',
]

export function clearDemoStorage() {
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore (private mode etc.)
    }
  }
}

export function useResetDemo() {
  const data = useDataStore()
  const reset = () => {
    clearDemoStorage()
    data.hydrate(true)
    // Reload so every view re-renders from fresh state
    window.location.reload()
  }
  return { reset }
}
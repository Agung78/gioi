import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  AuditEvent,
  Guest,
  Reservation,
  Settings,
  User,
} from '../domain/types'
import seedSettings from '../mock/settings.json'
import seedGuests from '../mock/guests.json'
import seedReservations from '../mock/reservations.json'
import seedAudit from '../mock/audit.json'
import seedUsers from '../mock/users.json'
import { shiftDate, shiftTimestamp } from '../composables/dateAnchor'

const SETTINGS_KEY = 'gioi.settings.v1'
const RES_KEY = 'gioi.reservations.v1'
const GUEST_KEY = 'gioi.guests.v1'
const AUDIT_KEY = 'gioi.audit.v1'
const USER_KEY = 'gioi.users.v1'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

function loadJSON<T>(key: string, fallback: T): T {
  const clone = <U>(v: U): U => JSON.parse(JSON.stringify(v))
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return clone(fallback)
    return JSON.parse(raw) as T
  } catch {
    return clone(fallback)
  }
}

function remapReservationDates(res: Reservation): Reservation {
  return {
    ...res,
    date: shiftDate(res.date),
    createdAt: shiftTimestamp(res.createdAt),
    updatedAt: shiftTimestamp(res.updatedAt),
  }
}

function remapGuestDates(g: Guest): Guest {
  return {
    ...g,
    createdAt: shiftTimestamp(g.createdAt),
    updatedAt: shiftTimestamp(g.updatedAt),
    marketingConsentAt: g.marketingConsentAt ? shiftTimestamp(g.marketingConsentAt) : undefined,
  }
}

function remapUserDates(u: User): User {
  return {
    ...u,
    createdAt: shiftTimestamp(u.createdAt),
    updatedAt: shiftTimestamp(u.updatedAt),
    lastLoginAt: u.lastLoginAt ? shiftTimestamp(u.lastLoginAt) : undefined,
  }
}

export const useDataStore = defineStore('data', () => {
  const settings = ref<Settings>(clone(seedSettings as Settings))
  const guests = ref<Guest[]>([])
  const reservations = ref<Reservation[]>([])
  const audit = ref<AuditEvent[]>([])
  const users = ref<User[]>([])
  const hydrated = ref(false)

  function hydrate(force = false) {
    if (hydrated.value && !force) return
    if (force) {
      try {
        localStorage.removeItem(SETTINGS_KEY)
        localStorage.removeItem(RES_KEY)
        localStorage.removeItem(GUEST_KEY)
        localStorage.removeItem(AUDIT_KEY)
        localStorage.removeItem(USER_KEY)
      } catch {
        // ignore
      }
    }
    const persistedSettings = loadJSON<Settings | null>(SETTINGS_KEY, null)
    settings.value = persistedSettings ?? clone(seedSettings as Settings)

    const persistedGuests = loadJSON<Guest[] | null>(GUEST_KEY, null)
    if (persistedGuests) {
      guests.value = persistedGuests
    } else {
      guests.value = (seedGuests as Guest[]).map(remapGuestDates)
    }

    const persistedReservations = loadJSON<Reservation[] | null>(RES_KEY, null)
    if (persistedReservations) {
      reservations.value = persistedReservations
    } else {
      reservations.value = (seedReservations as Reservation[]).map(remapReservationDates)
    }

    const persistedAudit = loadJSON<AuditEvent[] | null>(AUDIT_KEY, null)
    audit.value = persistedAudit ?? clone(seedAudit as AuditEvent[])

    const persistedUsers = loadJSON<User[] | null>(USER_KEY, null)
    if (persistedUsers) {
      users.value = persistedUsers
    } else {
      users.value = (seedUsers as User[]).map(remapUserDates)
    }
    hydrated.value = true
  }

  // Persist on change
  watch(settings, (val) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })
  watch(guests, (val) => {
    try { localStorage.setItem(GUEST_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })
  watch(reservations, (val) => {
    try { localStorage.setItem(RES_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })
  watch(audit, (val) => {
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })
  watch(users, (val) => {
    try { localStorage.setItem(USER_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })

  // ---- Lookups ----
  const guestById = computed(() => {
    const map = new Map<string, Guest>()
    for (const g of guests.value) map.set(g.id, g)
    return map
  })
  const reservationById = computed(() => {
    const map = new Map<string, Reservation>()
    for (const r of reservations.value) map.set(r.id, r)
    return map
  })
  const userById = computed(() => {
    const map = new Map<string, User>()
    for (const u of users.value) map.set(u.id, u)
    return map
  })

  function getGuest(id: string): Guest | undefined {
    return guestById.value.get(id)
  }
  function getReservation(id: string): Reservation | undefined {
    return reservationById.value.get(id)
  }
  function getUser(id: string): User | undefined {
    return userById.value.get(id)
  }

  function reservationsByDate(date: string): Reservation[] {
    return reservations.value
      .filter((r) => r.date === date)
      .sort((a, b) => a.time.localeCompare(b.time) || a.partySize - b.partySize)
  }

  function appendAudit(ev: AuditEvent) {
    audit.value = [ev, ...audit.value].slice(0, 500)
  }

  return {
    settings,
    guests,
    reservations,
    audit,
    users,
    hydrated,
    hydrate,
    guestById,
    reservationById,
    userById,
    getGuest,
    getReservation,
    getUser,
    reservationsByDate,
    appendAudit,
  }
})
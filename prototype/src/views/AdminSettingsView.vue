<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDataStore } from '../stores/data'
import { useSettingsStore } from '../stores/settings'
import { downloadCSV, reservationsCSV } from '../stores/export'
import type { SeatingArea, User } from '../domain/types'
import { DAYS_OF_WEEK } from '../domain/types'

const data = useDataStore()
const settings = useSettingsStore()

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const draft = ref(clone(data.settings))
watch(() => data.settings, (val) => { draft.value = clone(val) }, { deep: true })

const users = ref(clone(data.users))
watch(() => data.users, (val) => { users.value = clone(val) }, { deep: true })

const saved = ref<string | null>(null)
function flash() { saved.value = `Saved at ${new Date().toLocaleTimeString()}`; setTimeout(() => { saved.value = null }, 2000) }

function saveSettings() {
  settings.updateSettings(draft.value)
  flash()
}

function saveAreas() {
  settings.updateAreas(draft.value.seatingAreas)
  flash()
}

function saveUsers() {
  settings.updateUsers(users.value)
  flash()
}

const dayLabel: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function updateDay(day: string, key: 'open' | 'close', val: string) {
  const current = draft.value.openingHours[day as keyof typeof draft.value.openingHours]
  draft.value.openingHours[day as keyof typeof draft.value.openingHours] = { ...current, [key]: val }
}

function addClosedDate() {
  const date = prompt('Closed date (YYYY-MM-DD):')
  if (!date) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    alert('Invalid date format. Use YYYY-MM-DD.')
    return
  }
  if (!draft.value.closedDates.includes(date)) {
    draft.value.closedDates = [...draft.value.closedDates, date].sort()
  }
}
function removeClosedDate(date: string) {
  draft.value.closedDates = draft.value.closedDates.filter((d) => d !== date)
}

function updateArea(idx: number, patch: Partial<SeatingArea>) {
  const areas = [...draft.value.seatingAreas]
  areas[idx] = { ...areas[idx], ...patch }
  draft.value.seatingAreas = areas
}

function addArea() {
  const id = `area-${Math.random().toString(36).slice(2, 6)}`
  draft.value.seatingAreas = [...draft.value.seatingAreas, { id, name: 'New area', capacity: 10, bookable: true }]
}
function removeArea(idx: number) {
  draft.value.seatingAreas = draft.value.seatingAreas.filter((_, i) => i !== idx)
}

function updateUser(idx: number, patch: Partial<User>) {
  const next = [...users.value]
  next[idx] = { ...next[idx], ...patch }
  users.value = next
}

function exportReservations() {
  const csv = reservationsCSV(data.reservations)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCSV(`gioi-reservations-${stamp}.csv`, csv)
}

const totalCapacity = computed(() => draft.value.seatingAreas.filter((a) => a.bookable).reduce((s, a) => s + a.capacity, 0))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <header class="mb-6 flex items-baseline justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-gioi-moss/70">Super Admin</p>
        <h1 class="font-display text-3xl font-semibold text-gioi-moss">Settings</h1>
      </div>
      <p v-if="saved" class="text-sm text-gioi-moss">{{ saved }}</p>
    </header>

    <section class="card mb-6">
      <h2 class="font-display text-xl font-semibold text-gioi-moss">Restaurant</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">Name</label>
          <input v-model="draft.restaurant.name" class="field" />
        </div>
        <div>
          <label class="label">Tagline</label>
          <input v-model="draft.restaurant.tagline" class="field" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Intro</label>
          <textarea v-model="draft.restaurant.intro" rows="2" class="field" />
        </div>
        <div>
          <label class="label">Address</label>
          <input v-model="draft.restaurant.address" class="field" />
        </div>
        <div>
          <label class="label">Maps URL</label>
          <input v-model="draft.restaurant.mapsUrl" class="field" />
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="draft.restaurant.phone" class="field" />
        </div>
        <div>
          <label class="label">WhatsApp</label>
          <input v-model="draft.restaurant.whatsapp" class="field" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Cancellation policy</label>
          <textarea v-model="draft.cancellationPolicy" rows="2" class="field" />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" type="button" @click="saveSettings">Save restaurant</button>
      </div>
    </section>

    <section class="card mb-6">
      <h2 class="font-display text-xl font-semibold text-gioi-moss">Opening hours & rules</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="day in DAYS_OF_WEEK" :key="day" class="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-sm">
          <span class="font-medium text-gioi-moss">{{ dayLabel[day] }}</span>
          <input
            type="time"
            :value="draft.openingHours[day].open"
            class="field"
            @change="updateDay(day, 'open', ($event.target as HTMLInputElement).value)"
          />
          <input
            type="time"
            :value="draft.openingHours[day].close"
            class="field"
            @change="updateDay(day, 'close', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label class="label">Booking interval (minutes)</label>
          <input v-model.number="draft.bookingIntervalMinutes" type="number" min="5" step="5" class="field" />
        </div>
        <div>
          <label class="label">Min party size</label>
          <input v-model.number="draft.partySizeLimits.min" type="number" min="1" class="field" />
        </div>
        <div>
          <label class="label">Max party size</label>
          <input v-model.number="draft.partySizeLimits.max" type="number" min="1" class="field" />
        </div>
        <div>
          <label class="label">Lead time (minutes)</label>
          <input v-model.number="draft.leadTimeMinutes" type="number" min="0" class="field" />
        </div>
        <div>
          <label class="label">Cut-off (minutes)</label>
          <input v-model.number="draft.cutoffMinutes" type="number" min="0" class="field" />
        </div>
        <div>
          <label class="label">No-show target %</label>
          <input v-model.number="draft.noShowTargetPercent" type="number" min="0" max="100" class="field" />
        </div>
        <div>
          <label class="label">Over-capacity alert %</label>
          <input v-model.number="draft.overCapacityAlertPercent" type="number" min="0" max="100" class="field" />
        </div>
      </div>
      <div class="mt-6">
        <p class="label">Closed dates</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span v-for="d in draft.closedDates" :key="d" class="chip bg-gioi-sand text-gioi-moss">
            {{ d }}
            <button type="button" class="-my-2 -mr-2 grid h-11 w-11 place-items-center text-gioi-moss/70 hover:text-gioi-ink" :aria-label="`Remove ${d}`" @click="removeClosedDate(d)">×</button>
          </span>
          <button class="btn-ghost" type="button" @click="addClosedDate">+ Add</button>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" type="button" @click="saveSettings">Save hours &amp; rules</button>
      </div>
    </section>

    <section class="card mb-6">
      <h2 class="font-display text-xl font-semibold text-gioi-moss">Seating areas</h2>
      <p class="text-sm text-gioi-moss/70">Total bookable capacity: {{ totalCapacity }} covers</p>
      <div class="mt-4 space-y-3">
        <div v-for="(area, idx) in draft.seatingAreas" :key="area.id" class="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <div>
            <label class="label">Name</label>
            <input :value="area.name" class="field" @input="updateArea(idx, { name: ($event.target as HTMLInputElement).value })" />
          </div>
          <div>
            <label class="label">Capacity</label>
            <input
              type="number"
              min="0"
              :value="area.capacity"
              class="field"
              @input="updateArea(idx, { capacity: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div>
            <label class="label">Min party</label>
            <input
              type="number"
              min="0"
              :value="area.minParty ?? ''"
              class="field"
              @input="updateArea(idx, { minParty: Number(($event.target as HTMLInputElement).value) || undefined })"
            />
          </div>
          <div>
            <label class="label">Max party</label>
            <input
              type="number"
              min="0"
              :value="area.maxParty ?? ''"
              class="field"
              @input="updateArea(idx, { maxParty: Number(($event.target as HTMLInputElement).value) || undefined })"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                :checked="area.bookable"
                @change="updateArea(idx, { bookable: ($event.target as HTMLInputElement).checked })"
              />
              Bookable
            </label>
            <button class="btn-ghost" type="button" @click="removeArea(idx)" aria-label="Remove area">Remove</button>
          </div>
        </div>
        <button class="btn-secondary" type="button" @click="addArea">+ Add seating area</button>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" type="button" @click="saveAreas">Save seating areas</button>
      </div>
    </section>

    <section class="card mb-6">
      <h2 class="font-display text-xl font-semibold text-gioi-moss">Users</h2>
      <div class="mt-4 space-y-3">
        <div v-for="(u, idx) in users" :key="u.id" class="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <div>
            <label class="label">Name</label>
            <input :value="u.name" class="field" @input="updateUser(idx, { name: ($event.target as HTMLInputElement).value })" />
          </div>
          <div>
            <label class="label">Login</label>
            <input :value="u.login" class="field" @input="updateUser(idx, { login: ($event.target as HTMLInputElement).value })" />
          </div>
          <div>
            <label class="label">Role</label>
            <select :value="u.role" class="field" @change="updateUser(idx, { role: ($event.target as HTMLSelectElement).value as User['role'] })">
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="HOST">Host</option>
            </select>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              :checked="u.active"
              @change="updateUser(idx, { active: ($event.target as HTMLInputElement).checked })"
            />
            Active
          </label>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" type="button" @click="saveUsers">Save users</button>
      </div>
    </section>

    <section class="card">
      <h2 class="font-display text-xl font-semibold text-gioi-moss">Data export</h2>
      <p class="mt-1 text-sm text-gioi-moss/70">Download every reservation as CSV. The file includes guest contact details and allergy/accessibility notes — handle accordingly.</p>
      <button class="btn-primary mt-4" type="button" @click="exportReservations">Download reservations CSV</button>
    </section>
  </div>
</template>
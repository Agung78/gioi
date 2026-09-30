<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDataStore } from '../stores/data'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import { checkAvailability } from '../domain/availability'
import { todayISO } from '../domain/dates'
import type { Channel } from '../domain/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', reservationId: string): void
}>()

const data = useDataStore()
const reservations = useReservationsStore()
const auth = useAuthStore()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const partySize = ref(2)
const time = ref('19:00')
const seatingAreaId = ref(data.settings.seatingAreas[0]?.id ?? 'main')
const occasion = ref('')
const source = ref<Channel>('walk_in')
const guestNotes = ref('')
const allergiesText = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const date = todayISO()

watch(() => props.open, (val) => {
  if (val) {
    error.value = null
    fullName.value = ''
    email.value = ''
    partySize.value = 2
    time.value = '19:00'
    guestNotes.value = ''
    allergiesText.value = ''
  }
})

const check = computed(() => checkAvailability(
  data.settings,
  data.reservations,
  {
    date,
    time: time.value,
    partySize: partySize.value,
    seatingAreaId: seatingAreaId.value,
  },
  { skipTemporal: true },
))

async function submit() {
  error.value = null
  if (!fullName.value.trim() || !phone.value.trim()) {
    error.value = 'Name and phone are required.'
    return
  }
  const r = check.value
  if (!r.ok) {
    error.value = 'This slot cannot accommodate the party right now.'
    return
  }
  submitting.value = true
  try {
    const allergies = allergiesText.value.split(',').map((s) => s.trim()).filter(Boolean)
    const reservation = reservations.create(
      {
        guest: {
          fullName: fullName.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim() || undefined,
          allergies,
          marketingConsent: false,
        },
        date,
        time: time.value,
        partySize: partySize.value,
        seatingAreaId: r.areaId ?? seatingAreaId.value,
        occasion: occasion.value.trim() || undefined,
        guestNotes: guestNotes.value.trim() || undefined,
        source: source.value,
      },
      auth.userId ?? 'u-host',
      auth.user?.name ?? 'Host',
    )
    // Auto-confirm walk-ins (Host accepts them on the spot)
    reservations.changeStatus(reservation.id, 'confirmed', auth.userId ?? 'u-host', auth.user?.name ?? 'Host')
    emit('created', reservation.id)
    emit('close')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Transition name="modal">
  <div v-if="open" class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4" @click.self="emit('close')">
    <div class="modal-panel card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">Add walk-in</h2>
        <button class="btn-ghost" type="button" @click="emit('close')">Close</button>
      </div>
      <form class="mt-4 space-y-3" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Name *</label>
            <input v-model="fullName" required class="field" />
          </div>
          <div>
            <label class="label">Phone *</label>
            <input v-model="phone" required class="field" />
          </div>
          <div>
            <label class="label">Party size</label>
            <input v-model.number="partySize" type="number" min="1" max="20" class="field" />
          </div>
          <div>
            <label class="label">Time</label>
            <input v-model="time" type="time" class="field" />
          </div>
          <div>
            <label class="label">Seating area</label>
            <select v-model="seatingAreaId" class="field">
              <option v-for="a in data.settings.seatingAreas.filter(x => x.bookable)" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">Source</label>
            <select v-model="source" class="field">
              <option value="walk_in">Walk-in</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="label">Occasion</label>
            <input v-model="occasion" class="field" />
          </div>
          <div class="col-span-2">
            <label class="label">Allergies (comma separated)</label>
            <input v-model="allergiesText" class="field" placeholder="Peanut, gluten…" />
          </div>
          <div class="col-span-2">
            <label class="label">Notes</label>
            <textarea v-model="guestNotes" rows="2" class="field" />
          </div>
        </div>
        <p v-if="!check.ok" class="alert-warn">
          {{ check.reasons.join(', ') }} — adjust the time or party size.
        </p>
        <div v-if="error" class="alert-danger">{{ error }}</div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="!check.ok || submitting">
            {{ submitting ? 'Adding…' : 'Add walk-in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
  </Transition>
</template>
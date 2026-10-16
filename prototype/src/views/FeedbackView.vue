<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { PhCheckCircle, PhStar } from '@phosphor-icons/vue'
import { useDataStore } from '../stores/data'

const route = useRoute()
const data = useDataStore()
const code = String(route.params.code)
const reservation = computed(() => data.reservations.find((r) => r.bookingCode === code) ?? null)
const guest = computed(() => reservation.value ? data.getGuest(reservation.value.guestId) : null)
const rating = ref(0)
const comments = ref('')
const tags = ref<string[]>([])
const submitted = ref(false)
const error = ref('')
const tagOptions = ['Food', 'Service', 'Atmosphere', 'Value']

function toggleTag(tag: string) {
  tags.value = tags.value.includes(tag) ? tags.value.filter((t) => t !== tag) : [...tags.value, tag]
}
function submit() {
  if (!reservation.value || !guest.value || reservation.value.status !== 'completed') return
  if (!rating.value) { error.value = 'Please choose a rating.'; return }
  data.feedbackResponses.push({ id: `feedback_${Date.now()}`, reservationId: reservation.value.id, guestId: guest.value.id, rating: rating.value, comments: comments.value.trim(), serviceTags: tags.value, submittedAt: new Date().toISOString() })
  data.appendAudit({ id: `feedback_submit_${Date.now()}`, at: new Date().toISOString(), actorId: 'guest', actorName: guest.value.fullName, action: 'feedback.submitted', entityType: 'feedback_link', entityId: reservation.value.id, note: `Feedback submitted: ${rating.value}/5` })
  submitted.value = true
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-12 md:py-16">
    <div v-if="!reservation || reservation.status !== 'completed'" class="card text-center">
      <h1 class="text-2xl font-extrabold">Feedback unavailable</h1>
      <p class="mt-2 text-muted">This feedback link is invalid or the visit is not completed yet.</p>
      <RouterLink to="/" class="btn-primary mt-6">Back to GIOI</RouterLink>
    </div>
    <div v-else-if="submitted" class="card text-center">
      <PhCheckCircle :size="52" weight="fill" class="mx-auto text-accent" aria-hidden="true" />
      <h1 class="mt-4 text-3xl font-extrabold">Thank you, {{ guest?.fullName }}.</h1>
      <p class="mt-2 text-muted">Your feedback helps GIOI improve the next visit.</p>
    </div>
    <form v-else class="card" @submit.prevent="submit">
      <p class="text-sm font-medium text-accent">GIOI Ocean Gourmet</p>
      <h1 class="mt-2 text-3xl font-extrabold">How was your visit?</h1>
      <p class="mt-2 text-muted">A few words from you help our team make the next visit better.</p>
      <fieldset class="mt-8">
        <legend class="label">Overall rating</legend>
        <div class="mt-2 flex gap-2" role="radiogroup" aria-label="Overall rating">
          <button v-for="n in 5" :key="n" type="button" class="rounded-full p-2" :aria-label="`${n} stars`" :aria-pressed="rating === n" @click="rating = n"><PhStar :size="32" :weight="rating >= n ? 'fill' : 'regular'" :class="rating >= n ? 'text-accent' : 'text-muted'" /></button>
        </div>
      </fieldset>
      <fieldset class="mt-6">
        <legend class="label">What stood out?</legend>
        <div class="mt-2 flex flex-wrap gap-2"><button v-for="tag in tagOptions" :key="tag" type="button" class="chip" :class="tags.includes(tag) ? 'bg-accent text-accent-ink' : 'bg-line/50'" @click="toggleTag(tag)">{{ tag }}</button></div>
      </fieldset>
      <label class="label mt-6">Comments<textarea v-model="comments" class="field mt-2" rows="5" maxlength="1000" placeholder="Tell us about your visit (optional)" /></label>
      <p v-if="error" class="mt-3 text-sm text-danger">{{ error }}</p>
      <button class="btn-primary mt-6 w-full" type="submit">Submit feedback</button>
    </form>
  </div>
</template>

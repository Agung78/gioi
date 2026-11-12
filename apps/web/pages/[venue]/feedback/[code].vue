<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useHead } from '#app'
import { PhCheckCircle, PhStar } from '@phosphor-icons/vue'
import { submitFeedback } from '@/composables/useGuestApi'
import { useVenue } from '@/composables/useVenue'
import type { FeedbackBody } from '@/types/venue'

const route = useRoute()
const venueSlug = String(route.params.venue)
const venueHome = useVenueHome(venueSlug)
const { venue } = await useVenue()
const venueName = computed(() => venue.value?.name || 'GIOI Ocean Gourmet')
useHead({ title: computed(() => `Feedback | ${venueName.value}`) })
const code = String(route.params.code)
const exists = await $fetch(`/api/public/reservations/${encodeURIComponent(code)}`).then(() => true, () => false)

const rating = ref(0)
const comments = ref('')
const tags = ref<string[]>([])
const submitted = ref(false)
const error = ref('')
const headline = computed(() => venue.value?.feedbackTitle || 'How was your visit?')
const subtitle = computed(() => venue.value?.feedbackSubtitle || 'A few words from you help our team make the next visit better.')
const tagOptions = computed(() => venue.value?.feedbackTags?.length ? venue.value.feedbackTags : ['Food', 'Service', 'Atmosphere', 'Value'])

function toggleTag(tag: string) {
  tags.value = tags.value.includes(tag) ? tags.value.filter((t) => t !== tag) : [...tags.value, tag]
}
async function submit() {
  if (!rating.value) { error.value = 'Please choose a rating.'; return }
  try {
    const body: FeedbackBody = { rating: rating.value, comments: comments.value.trim(), serviceTags: tags.value }
    await submitFeedback(code, body)
    submitted.value = true
  } catch (e: any) {
    error.value = e.message || 'Feedback could not be submitted.'
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-12 md:py-16">
    <div v-if="!exists" class="card text-center">
      <h1 class="text-3xl font-extrabold">Booking not found</h1>
      <p class="mt-2 text-muted">We couldn't find that booking. Check the link and try again.</p>
      <NuxtLink :to="venueHome" class="mt-8 inline-block text-sm font-medium text-accent underline underline-offset-4">Back to GIOI</NuxtLink>
    </div>
    <form v-else-if="!submitted" class="card" @submit.prevent="submit">
      <p class="text-sm font-medium text-accent">{{ venueName }}</p>
      <h1 class="mt-2 text-3xl font-extrabold">{{ headline }}</h1>
      <p class="mt-2 text-muted">{{ subtitle }}</p>
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
    <div v-else class="card text-center">
      <PhCheckCircle :size="52" weight="fill" class="mx-auto text-accent" aria-hidden="true" />
      <h1 class="mt-4 text-3xl font-extrabold">Thank you.</h1>
      <p class="mt-2 text-muted">Your feedback helps GIOI improve the next visit.</p>
      <NuxtLink :to="venueHome" class="mt-8 inline-block text-sm font-medium text-accent underline underline-offset-4">Back to GIOI</NuxtLink>
    </div>
  </div>
</template>

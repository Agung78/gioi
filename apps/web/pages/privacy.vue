<script setup lang="ts">
definePageMeta({ public: true })
import { useSeoMeta, useHead } from '#app'

useSeoMeta({
  title: 'Privacy policy | GIOI Ocean Gourmet',
  description: 'How GIOI Ocean Gourmet collects, uses, and protects your personal data when you book a table.',
})

useHead({
  link: [{ rel: 'canonical', href: `${useRuntimeConfig().public.siteUrl}/privacy` }],
})
</script>

<template>
  <!-- Review with legal before launch. -->
  <article class="mx-auto max-w-3xl px-4 py-16">
    <h1 class="text-2xl font-extrabold mb-6">Privacy policy</h1>

    <h2 class="text-xl font-bold mt-8 mb-3">What we collect</h2>
    <p>When you make a reservation through our booking form, we collect only the details you provide:</p>
    <ul class="list-disc pl-6 mt-2 space-y-1 text-muted">
      <li>Full name</li>
      <li>WhatsApp / phone number</li>
      <li>Email address</li>
      <li>Country / city (optional)</li>
      <li>Occasion, dietary needs and allergies, accessibility needs, and special requests (optional)</li>
    </ul>

    <h2 class="text-xl font-bold mt-8 mb-3">Why we collect it</h2>
    <p>We use your information to manage your reservation, confirm your booking, and contact you about your visit. Optional details (allergies, accessibility, special requests) are shared with our kitchen and service team so we can look after you during your visit.</p>

    <h2 class="text-xl font-bold mt-8 mb-3">Analytics</h2>
    <p>We use PostHog and Vercel Analytics to understand aggregate site usage, such as which pages are viewed and where bookings start or fail. PostHog is configured without autocapture or session recording. We do not use these tools to track you across other sites.</p>

    <h2 class="text-xl font-bold mt-8 mb-3">Sharing</h2>
    <p>Your personal data is shared only with service providers needed to run the reservation system (for example, our hosting and booking API, and Cloudflare Turnstile spam protection). We do not sell your data.</p>

    <h2 class="text-xl font-bold mt-8 mb-3">Retention</h2>
    <p>We keep your data as long as needed to manage reservations and meet our legal obligations.</p>

    <h2 class="text-xl font-bold mt-8 mb-3">Your rights</h2>
    <p>Under Indonesian Law No. 27 of 2022 on Personal Data Protection, you may request access to, correction of, or deletion of your personal data. To exercise these rights, contact us by phone or WhatsApp using the number shown on our venue page.</p>

    <h2 class="text-xl font-bold mt-8 mb-3">Contact</h2>
    <p>Questions about this policy? Contact us at the phone/WhatsApp number shown on our <NuxtLink to="/bali">venue page</NuxtLink>.</p>

  </article>
</template>

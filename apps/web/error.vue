<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useHead({
  title: `${props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong'} | GIOI Ocean Gourmet`,
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-navy px-4 py-12 text-white">
    <div class="max-w-md text-center">
      <h1 class="mb-2 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.05]">{{ error.statusCode }}</h1>
      <p class="mb-8 text-lg text-white/80">{{ error.statusCode === 404 ? 'This page does not exist.' : 'Something went wrong. Please try again shortly.' }}</p>
      <button type="button" class="btn bg-sand text-navy hover:bg-white" @click="clearError({ redirect: '/bali' })">Back to GIOI Ocean Gourmet</button>
    </div>
  </main>
</template>

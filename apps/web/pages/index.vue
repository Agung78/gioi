<script setup lang="ts">
definePageMeta({ public: true })
import { VENUE_SEO } from '@/utils/venueSeo'

const GROUP_TITLE = 'GIOI Group | Restaurants in Indonesia'
const GROUP_DESCRIPTION = 'GIOI Group restaurants and bars. Choose a venue to see the menu, opening hours and reserve a table.'

const { siteUrl } = useRuntimeConfig().public
const firstSlug = Object.keys(VENUE_SEO)[0]
const firstImage = `${siteUrl}${VENUE_SEO[firstSlug].image.url}`

useSeoMeta({
  title: GROUP_TITLE,
  description: GROUP_DESCRIPTION,
  ogTitle: GROUP_TITLE,
  ogDescription: GROUP_DESCRIPTION,
  ogType: 'website',
  ogUrl: `${siteUrl}/`,
  ogImage: firstImage,
  ogSiteName: 'GIOI Group',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@id': `${siteUrl}#organization`,
            '@type': 'Organization',
            name: 'GIOI Group',
            url: siteUrl,
            logo: `${siteUrl}/logo.jpg`,
          },
          {
            '@type': 'ItemList',
            itemListElement: Object.entries(VENUE_SEO).map(([slug, seo], i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${siteUrl}/${slug}`,
              name: seo.title,
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div class="overflow-x-clip bg-navy text-white">
    <header class="relative z-20">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <NuxtLink to="/" class="leading-none" aria-label="GIOI Group home"><img src="/logo.jpg" alt="GIOI Group logo" width="1080" height="1080" class="h-12 w-12 rounded-full object-cover" /></NuxtLink>
        <nav class="flex items-center gap-1 sm:gap-2">
          <NuxtLink to="/privacy" class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Privacy</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="relative isolate z-10 flex min-h-[100svh] flex-col">
      <section class="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-36">
        <h1 class="font-display text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white">GIOI Group</h1>
        <ul class="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <li v-for="(seo, slug) in VENUE_SEO" :key="slug" class="group relative overflow-hidden rounded-surface">
            <NuxtLink :to="`/${slug}`"><img :src="seo.image.url" :width="seo.image.width" :height="seo.image.height" :alt="seo.title" :loading="slug === firstSlug ? 'eager' : 'lazy'" class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /></NuxtLink>
            <div class="mt-4">
              <NuxtLink :to="`/${slug}`"><h2 class="text-2xl font-extrabold">{{ seo.title }}</h2></NuxtLink>
              <p class="mt-2 max-w-[36ch] leading-relaxed text-white/75">{{ seo.description }}</p>
              <p class="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/70">{{ seo.city }}, {{ seo.region }}</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
    <footer class="bg-navy text-white">
      <div class="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8 md:pt-32">
        <NuxtLink to="/privacy" class="inline-flex min-h-11 items-center hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand">Privacy</NuxtLink>
      </div>
    </footer>
  </div>
</template>

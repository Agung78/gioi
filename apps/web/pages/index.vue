<script setup lang="ts">
definePageMeta({ public: true })
import { VENUE_SEO } from '@/utils/venueSeo'

const GROUP_TITLE = 'GIOI Group | Restaurants in Indonesia'
const GROUP_DESCRIPTION = 'GIOI Group restaurants and bars. Choose a venue to see the menu, opening hours and reserve a table.'

const { siteUrl } = useRuntimeConfig().public
const firstSlug = Object.keys(VENUE_SEO)[0]
const firstOg = VENUE_SEO[firstSlug].image.og ?? VENUE_SEO[firstSlug].image
const firstImage = `${siteUrl}${firstOg.url}`

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
  <div class="flex min-h-[100svh] flex-col bg-surface text-ink">
    <main class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <img src="/logo-group-128.webp" alt="GIOI Group logo" width="128" height="128" class="h-24 w-24 rounded-full object-cover" />
      <p class="mt-10 text-xs font-medium uppercase tracking-[0.25em] text-muted">Announcement</p>
      <h1 class="mt-4 font-display text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.035em]">GIOI Group</h1>
      <p class="mt-6 max-w-[40ch] text-lg leading-relaxed text-muted">Our new website is under development. Coming soon.</p>
      <ul class="mt-10 flex flex-wrap justify-center gap-3">
        <li v-for="(seo, slug) in VENUE_SEO" :key="slug">
          <NuxtLink :to="`/${slug}`" class="inline-flex min-h-11 items-center rounded-full border border-line px-6 text-sm font-medium transition hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Visit {{ seo.title.split(' | ')[0] }}</NuxtLink>
        </li>
      </ul>
    </main>
    <footer class="py-6 text-center text-sm text-muted">
      <NuxtLink to="/privacy" class="hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Privacy</NuxtLink>
    </footer>
  </div>
</template>

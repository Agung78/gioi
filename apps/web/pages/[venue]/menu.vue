<script setup lang="ts">
definePageMeta({ public: true })
import { PhArrowLeft } from '@phosphor-icons/vue'
import { VENUE_SEO } from '@/utils/venueSeo'
import { VENUE_MENU, formatIdr, menuJsonLd } from '@/utils/venueMenu'
import { withUtm } from '@/utils/analytics'
import { bookingSource } from '@/utils/bookingSource'

const route = useRoute()
const venue = route.params.venue as string
const seo = Object.hasOwn(VENUE_SEO, venue) ? VENUE_SEO[venue] : undefined
const menu = Object.hasOwn(VENUE_MENU, venue) ? VENUE_MENU[venue] : undefined
if (!seo || !menu) throw createError({ statusCode: 404, statusMessage: 'Menu not found', fatal: true })

const { siteUrl, bookUrl } = useRuntimeConfig().public
const name = seo.title.split(' | ')[0]! // "GIOI Ocean Gourmet Bali"
const pageUrl = `${siteUrl}/${venue}/menu`
const venueUrl = `${siteUrl}/${venue}`
const title = `${name} Menu and Prices | ${seo.city}, ${seo.region}`
const description = `Full ${name} menu and prices: brunch, small plates, seafood sharing plates, mains, kids menu, desserts and drinks at Discovery Mall Bali, Kuta.`
const src = bookingSource(route.query.src)
const bookPath = `${bookUrl}/${venue}/book`
const bookHref = src === 'website' ? bookPath : `${bookPath}?src=${src}`
const og = seo.image.og ?? seo.image
const posthog = usePostHog()

const active = ref(menu.groups[0]?.sections[0]?.id ?? '')
const navEl = ref<HTMLElement>()
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' })
  history.replaceState(null, '', `#${id}`)
}

onMounted(() => {
  // active = last section whose top has crossed the band under the sticky nav
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && (active.value = (e.target as HTMLElement).dataset.section!)),
    { rootMargin: '-80px 0px -65% 0px' },
  )
  document.querySelectorAll('[data-section]').forEach((el) => io.observe(el))
  onBeforeUnmount(() => io.disconnect())
})

// keep the active pill visible in the horizontal strip (scrolls the strip only, never the page)
watch(active, (id) => {
  const el = navEl.value?.querySelector<HTMLElement>(`[data-spy="${id}"]`)
  if (el && navEl.value) navEl.value.scrollTo({ left: el.offsetLeft - 16, behavior: reduced() ? 'auto' : 'smooth' })
})

function cta(e: Event) {
  posthog?.capture('book_cta_clicked', { venue, location: 'menu_page' })
  const a = e.currentTarget as HTMLAnchorElement | null
  if (a) a.href = withUtm(a.href, location.search)
}

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: pageUrl,
  ogImage: siteUrl + og.url,
  ogImageAlt: seo.page?.imageAlt ?? seo.title,
  ogSiteName: 'GIOI Group',
  twitterCard: 'summary_large_image',
  twitterImage: siteUrl + og.url,
})
useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(menuJsonLd(menu, pageUrl, `${name} menu`)).replace(/</g, '\\u003c') },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name, item: venueUrl },
          { '@type': 'ListItem', position: 3, name: 'Menu', item: pageUrl },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 pt-12 md:px-8 md:pt-20">
    <header>
      <NuxtLink :to="`/${venue}`" class="rise inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline-offset-4 hover:underline">
        <PhArrowLeft :size="16" aria-hidden="true" /> {{ name }}
      </NuxtLink>
      <h1 class="rise mt-4 max-w-[18ch] text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.02em]" style="animation-delay: 60ms">{{ name }} menu and prices</h1>
      <p class="rise mt-5 max-w-2xl leading-relaxed text-muted" style="animation-delay: 120ms">
        Beachfront at Discovery Mall Bali, Kuta. Prices are in rupiah, before service charge and government tax, and may change.
        Marks for pork, seafood, dairy, plant-based and spicy dishes are shown in the PDF menus.
      </p>
      <div class="rise mt-5 flex flex-wrap items-center gap-3" style="animation-delay: 180ms">
        <a :href="bookHref" class="btn-primary min-h-12 px-8" @click="cta">Reserve a table</a>
        <a v-for="m in seo.menus" :key="m.path" :href="m.path" class="btn-secondary">{{ m.label }} (PDF)</a>
      </div>
    </header>

    <nav aria-label="Menu sections" class="sticky top-0 z-20 -mx-4 mt-10 border-b border-line bg-surface/90 backdrop-blur md:-mx-8">
      <div ref="navEl" class="flex gap-2 overflow-x-auto px-4 py-2 md:px-8">
        <template v-for="g in menu.groups" :key="g.id">
          <a
            v-for="s in g.sections"
            :key="s.id"
            :href="`#${s.id}`"
            :data-spy="s.id"
            :aria-current="active === s.id ? 'true' : undefined"
            class="pill shrink-0"
            :class="{ 'pill-on': active === s.id }"
            @click.prevent="go(s.id)"
          >{{ s.title }}</a>
        </template>
      </div>
    </nav>

    <template v-for="g in menu.groups" :key="g.id">
      <p class="reveal mt-14 flex items-center gap-4 text-sm font-bold uppercase tracking-[0.14em] text-muted md:mt-20" aria-hidden="true">
        {{ g.title }} <span class="h-px flex-1 bg-line"></span>
      </p>
      <section v-for="s in g.sections" :id="s.id" :key="s.id" :data-section="s.id" class="scroll-mt-20 py-8 md:py-10">
        <h2 class="reveal text-3xl font-extrabold md:text-4xl"><span class="sr-only">{{ g.title }}: </span>{{ s.title }}</h2>
        <p v-if="s.note" class="reveal mt-2 max-w-2xl text-sm text-muted">{{ s.note }}</p>
        <ul class="mt-6 grid gap-x-12 md:grid-cols-2">
          <li v-for="i in s.items" :key="i.name" class="reveal group border-t border-line py-4 first:border-t-0 md:[&:nth-child(2)]:border-t-0">
            <div class="flex items-baseline gap-3">
              <h3 class="text-lg font-bold transition-colors duration-200 group-hover:text-accent">{{ i.name }}</h3>
              <span class="flex-1 border-b border-dotted border-line" aria-hidden="true"></span>
              <p class="shrink-0 text-right font-medium">
                <span v-for="p in i.prices" :key="p.label ?? 'one'" class="block"><span v-if="p.label" class="mr-2 text-sm font-normal text-muted">{{ p.label }}</span>{{ formatIdr(p.idr) }}</span>
              </p>
            </div>
            <p v-if="i.description" class="mt-1 max-w-[52ch] leading-relaxed text-muted">{{ i.description }}</p>
          </li>
        </ul>
      </section>
    </template>

    <div class="mt-8 flex flex-wrap items-center gap-6 border-t border-line py-12">
      <a :href="bookHref" class="btn-primary min-h-12 px-8" @click="cta">Reserve a table</a>
      <NuxtLink :to="`/${venue}`" class="inline-flex min-h-11 items-center text-accent underline hover:no-underline">Back to {{ name }}</NuxtLink>
    </div>
  </div>
</template>

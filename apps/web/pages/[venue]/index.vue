<script setup lang="ts">
definePageMeta({ public: true })
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from '#app'
import { PhMapPin, PhClock, PhWhatsappLogo, PhPhone, PhInstagramLogo, PhSunHorizon, PhArrowUpRight, PhForkKnife } from '@phosphor-icons/vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { addDays, todayISO } from '@gioi/domain'
import DatePicker from '@/components/DatePicker.vue'
import { useVenue } from '@/composables/useVenue'

gsap.registerPlugin(ScrollTrigger)

const route = useRoute()
const posthog = usePostHog()
const venue = (route.params.venue as string) || 'bali'
const router = useRouter()
const { venue: venueData } = await useVenue()

const info = venueData.value
const hours = venueData.value?.openingHours ?? {}
const days = [1, 2, 3, 4, 5, 6, 0] as const // openingHours keys: 0 = Sunday
const dayLabel: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' }
const wa = info ? `https://wa.me/${info.whatsapp.replace(/\D/g, '')}` : '#'
const today = todayISO()
const witaFmt = new Intl.DateTimeFormat('en-GB', { timeZone: info?.timeZone ?? 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const wita = ref('--:--:--')
const clockTimer = ref<ReturnType<typeof setInterval> | null>(null)
onBeforeUnmount(() => { if (clockTimer.value) clearInterval(clockTimer.value) })
const qDate = ref(today)
const qParty = ref(2)
const max = info?.partySizeLimits?.max ?? 8
const min = info?.partySizeLimits?.min ?? 1
const siteUrl = useRuntimeConfig().public.siteUrl
const seo = VENUE_SEO[venue]
const pageUrl = `${siteUrl}/${venue}`
const bookUrl = `https://book.gioigroup.com/${venue}/book`
const name = info?.name ?? 'GIOI'
const title = seo?.title ?? name
const description = seo?.description ?? info?.tagline ?? ''
const image = seo ? siteUrl + seo.image.url : undefined
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: pageUrl,
  ogImage: image,
  ogSiteName: 'GIOI Group',
  ogLocale: 'en_US',
  ogImageWidth: seo?.image.width,
  ogImageHeight: seo?.image.height,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name,
        url: pageUrl,
        parentOrganization: { '@type': 'Organization', name: 'GIOI Group', url: siteUrl },
        ...(image ? { image } : {}),
        ...(info?.phone ? { telephone: info.phone } : {}),
        address: {
          '@type': 'PostalAddress',
          ...(info?.address ? { streetAddress: info.address } : {}),
          ...(seo ? { addressLocality: seo.city, addressRegion: seo.region } : {}),
          addressCountry: 'ID',
        },
        ...(seo
          ? {
              geo: { '@type': 'GeoCoordinates', latitude: seo.geo.lat, longitude: seo.geo.lng },
              priceRange: seo.priceRange,
              servesCuisine: seo.cuisine,
              sameAs: seo.sameAs,
              ...(seo.menus ? { hasMenu: seo.menus.map((m) => siteUrl + m.path) } : {}),
            }
          : {}),
        ...(info?.mapsUrl ? { hasMap: info.mapsUrl } : {}),
        acceptsReservations: bookUrl,
        potentialAction: {
          '@type': 'ReserveAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: bookUrl,
            inLanguage: 'en',
            actionPlatform: [
              'http://schema.org/DesktopWebPlatform',
              'http://schema.org/MobileWebPlatform',
            ],
          },
        },
        ...(Object.keys(hours).length
          ? {
              openingHoursSpecification: Object.entries(hours).map(([day, h]) => ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: dayLabel[Number(day)],
                opens: h?.open,
                closes: h?.close,
              })),
            }
          : {}),
      }),
    },
  ],
})

function quickBook() {
  router.push({ path: `/${venue}/book`, query: { date: qDate.value, party: String(qParty.value) } })
}

const scenes = [
  { time: '10:00', title: 'A slower start', copy: 'Coffee, fresh fruit and the first view of Kuta Beach.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-02.webp' },
  { time: '17:30', title: 'The front row', copy: 'Settle in for seafood, sharing plates and the light changing over the water.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-07.webp', feature: true },
  { time: '20:00', title: 'Stay for dinner', copy: 'Grilled coastal produce, modern Asian flavours and cocktails after sunset.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-05.webp' },
]

const root = ref<HTMLElement>()
let ctx: gsap.Context | undefined

onMounted(() => {
  if (typeof window !== 'undefined') { wita.value = witaFmt.format(new Date()); clockTimer.value = setInterval(() => { wita.value = witaFmt.format(new Date()) }, 1000) }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  ctx = gsap.context(() => {
    const ease = 'expo.out'
    gsap.timeline({ defaults: { ease } })
      .from('[data-hero-word]', { yPercent: 110, duration: 1.2, stagger: 0.06 })
      .from('[data-hero-fade]', { opacity: 0, y: 16, duration: 0.9, stagger: 0.1 }, '-=0.8')
      .from('[data-hero-media]', { clipPath: 'inset(100% 0 0 0)', scale: 1.08, duration: 1.6, ease: 'expo.inOut' }, 0)
    gsap.to('[data-hero-media] > div', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.from(el.querySelectorAll('[data-word]'), { yPercent: 100, opacity: 0, duration: 1, stagger: 0.04, ease, scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
    })
    gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease, scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
    })
  }, root.value)
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div ref="root" class="overflow-x-clip">
    <section data-hero class="relative isolate z-10 flex min-h-[100svh] flex-col bg-navy text-white">
      <header class="relative z-20">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <NuxtLink :to="`/${venue}`" class="leading-none" aria-label="GIOI Ocean Gourmet, home"><img src="/logo.jpg" alt="GIOI Ocean Gourmet logo" width="1080" height="1080" class="h-12 w-12 rounded-full object-cover" /></NuxtLink>
          <nav class="flex items-center gap-1 sm:gap-2">
            <a href="#experience" class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Experience</a>
            <a href="#visit" class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Visit</a>
            <NuxtLink :to="`/${venue}/book`" class="btn bg-sand text-navy hover:bg-white">Reserve a table</NuxtLink>
          </nav>
        </div>
      </header>

      <div class="mx-auto grid w-full max-w-7xl flex-1 items-end gap-8 px-4 pb-8 pt-2 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-8 md:pb-10">
        <div class="relative z-10 order-2 md:order-1">
          <p data-hero-fade class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80"><PhSunHorizon :size="16" class="text-sun" aria-hidden="true" /> Beachfront dining in Kuta</p>
          <h1 aria-label="Fresh from the coast. Made for the sunset." class="font-display text-[clamp(2.5rem,5.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white">
            <span v-for="(line, i) in ['Fresh from', 'the coast.', 'Made for sunset.']" :key="i" class="block overflow-hidden pb-[0.06em]" aria-hidden="true"><span v-for="w in line.split(' ')" :key="w" data-hero-word class="inline-block pr-[0.22em]" :class="i === 2 ? 'text-sun' : ''">{{ w }}</span></span>
          </h1>
          <p data-hero-fade class="mt-4 max-w-[42ch] text-base leading-relaxed text-white/80 md:text-lg">A beachfront restaurant for seafood, modern Asian flavours and long afternoons beside Kuta Beach.</p>
          <form method="post" data-hero-fade class="mt-6 flex max-w-xl flex-wrap items-end gap-3 rounded-[20px] bg-white/[0.08] p-3 ring-1 ring-white/15 backdrop-blur-sm" @submit.prevent="quickBook">
            <div class="min-w-[9.5rem] flex-1"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-date">Date</label><DatePicker id="q-date" v-model="qDate" :min="today" :max="addDays(today, 90)" :closed="info?.closedDates" class="h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30" /></div>
            <div class="w-28"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-party">Guests</label><select id="q-party" v-model.number="qParty" class="field h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30"><option v-for="n in max - min + 1" :key="n" :value="min + n - 1">{{ min + n - 1 }}</option></select></div>
            <button class="btn h-12 flex-1 bg-sun px-6 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy sm:flex-none" type="submit">Find a table</button>
          </form>
        </div>
        <div data-hero-media class="relative order-1 overflow-hidden rounded-[28px] md:order-2"><div class="aspect-[4/3] bg-navy md:aspect-auto md:h-[min(60svh,34rem)]"><img src="https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-06.webp" alt="GIOI Ocean Gourmet beachfront dining area" width="1600" height="900" class="h-full w-full object-cover" fetchpriority="high" /></div></div>
      </div>
    </section>

    <section id="experience" class="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-36">
      <div class="max-w-3xl space-y-3"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">From first light to last call</p><h2 data-reveal aria-label="Come for the view. Stay for the flavour." class="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.05]"><span aria-hidden="true"><span v-for="w in 'Come for the view. Stay for the flavour.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2></div>
      <ol class="mt-16 grid gap-6 md:mt-24 md:grid-cols-3 md:gap-8"><li v-for="scene in scenes" :key="scene.title" data-rise :class="scene.feature ? 'md:-translate-y-12' : ''"><div class="group relative overflow-hidden rounded-surface"><div class="aspect-[4/5] overflow-hidden bg-line/50"><img :src="scene.img" :alt="scene.title" loading="lazy" width="1600" height="900" class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /></div><span class="absolute left-4 top-4 rounded-full bg-navy/85 px-3 py-1 font-display text-sm font-bold text-sand backdrop-blur">{{ scene.time }}</span></div><div class="mt-5"><h3 class="text-2xl font-extrabold">{{ scene.title }}</h3><p class="mt-2 max-w-[36ch] leading-relaxed text-muted">{{ scene.copy }}</p></div></li></ol>
    </section>

    <section id="visit" class="border-b border-line"><div class="mx-auto grid max-w-7xl gap-16 px-4 py-24 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-32"><div><p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Find us</p><h2 data-reveal aria-label="On the beach at Discovery Mall." class="mt-4 text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.02]"><span aria-hidden="true"><span v-for="w in 'On the beach at Discovery Mall.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2><p data-rise class="mt-8 flex gap-3 text-lg leading-relaxed"><PhMapPin :size="24" class="mt-1 shrink-0 text-accent" aria-hidden="true" /><span>{{ info?.address }}<br /><a :href="info?.mapsUrl" target="_blank" rel="noopener" class="group inline-flex min-h-11 items-center gap-1 font-medium text-accent underline decoration-line underline-offset-4">Get directions <PhArrowUpRight :size="16" aria-hidden="true" /></a></span></p><div data-rise class="mt-10 flex flex-wrap gap-3"><a v-for="m in seo?.menus" :key="m.path" :href="m.path" target="_blank" rel="noopener" class="btn-secondary"><PhForkKnife :size="20" aria-hidden="true" /> {{ m.label }}</a><a v-if="info" :href="wa" @click="posthog?.capture('whatsapp_clicked', { from: 'venue_page' })" class="btn-secondary"><PhWhatsappLogo :size="20" aria-hidden="true" /> WhatsApp</a><a :href="`tel:+${(info?.phone ?? '').replace(/^0/, '62').replace(/\D/g, '')}`" class="btn-secondary"><PhPhone :size="20" aria-hidden="true" /> {{ info?.phone }}</a><a href="https://www.instagram.com/gioioceangourmet/" target="_blank" rel="noopener noreferrer" class="btn-secondary"><PhInstagramLogo :size="20" aria-hidden="true" /> Instagram</a></div></div><div data-rise class="self-end"><div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted"><PhClock :size="18" aria-hidden="true" /> Hours</h3><span class="text-sm font-semibold uppercase tracking-[0.2em] tabular-nums" aria-label="Current time in Bali">{{ wita }} <span class="text-muted">WITA</span></span></div><ul class="mt-4 divide-y divide-line border-y border-line"><li v-for="d in days" :key="d" class="flex justify-between py-3"><span class="text-muted">{{ dayLabel[d] }}</span><span class="font-medium">{{ hours[d] ? `${hours[d].open} to ${hours[d].close}` : 'Closed' }}</span></li></ul></div></div></section>

    <section class="bg-navy text-white"><div class="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8 md:pt-32"><h2 data-reveal aria-label="Make sunset your reservation." class="max-w-[14ch] text-[clamp(2.5rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white"><span aria-hidden="true"><span v-for="w in 'Make sunset your reservation.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]" :class="w === 'reservation.' ? 'text-sun' : ''">{{ w }}</span></span></span></h2><div data-rise class="mt-10 flex flex-wrap items-center gap-6"><NuxtLink :to="`/${venue}/book`" class="btn min-h-12 bg-sun px-8 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy">Reserve a table</NuxtLink><p class="max-w-[48ch] text-sm leading-relaxed text-white/65">For sunset seating, booking ahead is recommended.</p></div><footer class="mt-24 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between"><img src="/logo.jpg" alt="GIOI Ocean Gourmet logo" width="1080" height="1080" class="h-10 w-10 rounded-full object-cover" /><span>{{ name }} · {{ info?.address }}</span><a :href="`tel:+${(info?.phone ?? '').replace(/^0/, '62').replace(/\D/g, '')}`" class="inline-flex min-h-11 items-center hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand">{{ info?.phone }}</a><a href="https://www.instagram.com/gioioceangourmet/" target="_blank" rel="noopener noreferrer" aria-label="GIOI Ocean Gourmet on Instagram" class="inline-flex min-h-11 items-center gap-1.5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand"><PhInstagramLogo :size="20" aria-hidden="true" /> @gioioceangourmet</a></footer></div></section>
  </div>
</template>

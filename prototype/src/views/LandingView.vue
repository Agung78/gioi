<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhMapPin, PhClock, PhWhatsappLogo, PhPhone, PhSunHorizon, PhArrowUpRight, PhMoon, PhSun, PhForkKnife, PhWaves } from '@phosphor-icons/vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useDataStore } from '../stores/data'
import { addDays, todayISO } from '../domain/dates'
import DatePicker from '../components/DatePicker.vue'
import { useTheme } from '../composables/useTheme'

gsap.registerPlugin(ScrollTrigger)

const data = useDataStore()
const { isDark, toggleTheme } = useTheme()
const router = useRouter()
const info = data.settings.restaurant
const hours = data.settings.openingHours
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const dayLabel = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const wa = `https://wa.me/${info.whatsapp.replace(/\D/g, '')}`
const today = todayISO()
const witaFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const wita = ref(witaFmt.format(new Date()))
const clockTimer = setInterval(() => { wita.value = witaFmt.format(new Date()) }, 1000)
onBeforeUnmount(() => clearInterval(clockTimer))
const qDate = ref(today)
const qParty = ref(2)
const max = data.settings.partySizeLimits.max
const min = data.settings.partySizeLimits.min

function quickBook() {
  router.push({ path: '/book', query: { date: qDate.value, party: String(qParty.value) } })
}

const scenes = [
  { time: '10:00', title: 'A slower start', copy: 'Coffee, fresh fruit and the first view of Kuta Beach.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-02.webp' },
  { time: '17:30', title: 'The front row', copy: 'Settle in for seafood, sharing plates and the light changing over the water.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-07.webp', feature: true },
  { time: '20:00', title: 'Stay for dinner', copy: 'Grilled coastal produce, modern Asian flavours and cocktails after sunset.', img: 'https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-05.webp' },
]

const root = ref<HTMLElement>()
let ctx: gsap.Context | undefined

onMounted(() => {
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
    <button type="button" class="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-raised text-ink shadow-soft ring-1 ring-line transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
    </button>

    <section data-hero class="relative isolate flex min-h-[100svh] flex-col bg-[#174c61] text-[#f4f0e7] dark:bg-navy">
      <header class="relative z-20">
        <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <RouterLink to="/" class="leading-none" aria-label="GIOI Ocean Gourmet, home"><img src="/logo.jpg" alt="" class="h-14 w-14 rounded-full object-cover" /></RouterLink>
          <nav class="flex items-center gap-1 sm:gap-2">
            <a href="#experience" class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Experience</a>
            <a href="#visit" class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Visit</a>
            <RouterLink to="/book" class="btn bg-sand text-navy hover:bg-white">Reserve a table</RouterLink>
          </nav>
        </div>
      </header>

      <div class="mx-auto grid w-full max-w-7xl flex-1 items-end gap-10 px-4 pb-10 pt-4 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:px-8 md:pb-16">
        <div class="relative z-10 order-2 md:order-1">
          <p data-hero-fade class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80"><PhSunHorizon :size="16" class="text-sun" aria-hidden="true" /> Beachfront dining in Kuta</p>
          <h1 aria-label="Fresh from the coast. Made for the sunset." class="font-display text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.94] tracking-[-0.035em]">
            <span v-for="(line, i) in ['Fresh from', 'the coast.', 'Made for sunset.']" :key="i" class="block overflow-hidden pb-[0.06em]" aria-hidden="true"><span v-for="w in line.split(' ')" :key="w" data-hero-word class="inline-block pr-[0.22em]" :class="i === 2 ? 'text-sun' : ''">{{ w }}</span></span>
          </h1>
          <p data-hero-fade class="mt-6 max-w-[42ch] text-lg leading-relaxed text-white/75">A beachfront restaurant for seafood, modern Asian flavours and long afternoons beside Kuta Beach.</p>
          <form data-hero-fade class="mt-8 flex max-w-xl flex-wrap items-end gap-3 rounded-[20px] bg-white/[0.06] p-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm" @submit.prevent="quickBook">
            <div class="min-w-[9.5rem] flex-1"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-date">Date</label><DatePicker id="q-date" v-model="qDate" :min="today" :max="addDays(today, 90)" :closed="data.settings.closedDates" class="h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30" /></div>
            <div class="w-28"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-party">Guests</label><select id="q-party" v-model.number="qParty" class="field h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30"><option v-for="n in max - min + 1" :key="n" :value="min + n - 1">{{ min + n - 1 }}</option></select></div>
            <button class="btn h-12 flex-1 bg-sun px-6 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy sm:flex-none" type="submit">Find a table</button>
          </form>
        </div>
        <div data-hero-media class="relative order-1 overflow-hidden rounded-[28px] md:order-2"><div class="aspect-[4/3] bg-navy md:aspect-[4/5]"><img src="https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-06.webp" alt="GIOI Ocean Gourmet beachfront dining area" class="h-full w-full object-cover" fetchpriority="high" /></div></div>
      </div>
    </section>

    <section id="experience" class="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-36">
      <div class="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end"><p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">From first light to last call</p><h2 data-reveal aria-label="Come for the view. Stay for the flavour." class="text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[1]"> <span aria-hidden="true"><span v-for="w in 'Come for the view. Stay for the flavour.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2></div>
      <ol class="mt-16 grid gap-6 md:mt-24 md:grid-cols-3 md:gap-8"><li v-for="(scene, i) in scenes" :key="scene.title" data-rise :class="scene.feature ? 'md:-translate-y-12' : ''"><div class="group relative overflow-hidden rounded-surface"><div class="aspect-[4/5] overflow-hidden bg-line/50"><img :src="scene.img" :alt="scene.title" loading="lazy" class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /></div><span class="absolute left-4 top-4 rounded-full bg-navy/85 px-3 py-1 font-display text-sm font-bold text-sand backdrop-blur">{{ scene.time }}</span></div><div class="mt-5 flex items-baseline gap-4"><span class="font-display text-sm font-bold text-muted">0{{ i + 1 }}</span><div><h3 class="text-2xl font-extrabold">{{ scene.title }}</h3><p class="mt-2 max-w-[36ch] leading-relaxed text-muted">{{ scene.copy }}</p></div></div></li></ol>
    </section>

    <section class="border-y border-line bg-raised"><div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-3 md:px-8 md:py-20"><div data-rise><PhWaves :size="28" class="text-accent" aria-hidden="true" /><h3 class="mt-5 text-2xl font-extrabold">Right on the water</h3><p class="mt-2 leading-relaxed text-muted">Find us on the beachfront at Discovery Mall Bali, with Kuta Beach in view.</p></div><div data-rise><PhForkKnife :size="28" class="text-accent" aria-hidden="true" /><h3 class="mt-5 text-2xl font-extrabold">Made to share</h3><p class="mt-2 leading-relaxed text-muted">Fresh seafood, grilled favourites, sharing plates and modern Indonesian touches.</p></div><div data-rise><PhSunHorizon :size="28" class="text-accent" aria-hidden="true" /><h3 class="mt-5 text-2xl font-extrabold">Stay for sunset</h3><p class="mt-2 leading-relaxed text-muted">Come early for the best chance of an outdoor table when the sky turns gold.</p></div></div></section>

    <section id="visit" class="border-b border-line"><div class="mx-auto grid max-w-7xl gap-16 px-4 py-24 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-32"><div><p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Find us</p><h2 data-reveal aria-label="On the beach at Discovery Mall." class="mt-4 text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.02]"><span aria-hidden="true"><span v-for="w in 'On the beach at Discovery Mall.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2><p data-rise class="mt-8 flex gap-3 text-lg leading-relaxed"><PhMapPin :size="24" class="mt-1 shrink-0 text-accent" aria-hidden="true" /><span>{{ info.address }}<br /><a :href="info.mapsUrl" target="_blank" rel="noopener" class="group inline-flex min-h-11 items-center gap-1 font-medium text-accent underline decoration-line underline-offset-4">Get directions <PhArrowUpRight :size="16" aria-hidden="true" /></a></span></p><div data-rise class="mt-10 flex flex-wrap gap-3"><a :href="wa" class="btn-secondary"><PhWhatsappLogo :size="20" aria-hidden="true" /> WhatsApp</a><a :href="`tel:${info.phone}`" class="btn-secondary"><PhPhone :size="20" aria-hidden="true" /> {{ info.phone }}</a></div></div><div data-rise class="self-end"><div class="flex items-center justify-between"><h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted"><PhClock :size="18" aria-hidden="true" /> Hours</h3><span class="text-sm font-semibold uppercase tracking-[0.2em] tabular-nums" aria-label="Current time in Bali">{{ wita }} <span class="text-muted">WITA</span></span></div><ul class="mt-4 divide-y divide-line border-y border-line"><li v-for="d in days" :key="d" class="flex justify-between py-3"><span class="text-muted">{{ dayLabel[d] }}</span><span class="font-medium">{{ hours[d].open }} to {{ hours[d].close }}</span></li></ul></div></div></section>

    <section class="bg-navy text-[#f4f0e7]"><div class="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8 md:pt-32"><h2 data-reveal aria-label="Make sunset your reservation." class="max-w-[14ch] text-[clamp(2.5rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.03em]"><span aria-hidden="true"><span v-for="w in 'Make sunset your reservation.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]" :class="w === 'reservation.' ? 'text-sun' : ''">{{ w }}</span></span></span></h2><div data-rise class="mt-10 flex flex-wrap items-center gap-6"><RouterLink to="/book" class="btn min-h-12 bg-sun px-8 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy">Reserve a table</RouterLink><p class="max-w-[48ch] text-sm leading-relaxed text-white/65">For sunset seating, booking ahead is recommended.</p></div><footer class="mt-24 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between"><img src="/logo.jpg" alt="GIOI Ocean Gourmet" class="h-10 w-10 rounded-full object-cover" /><span>GIOI Ocean Gourmet · Kuta, Bali · <RouterLink to="/login" class="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white">Staff login</RouterLink></span></footer></div></section>
  </div>
</template>


<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from '#app'
import { PhMapPin, PhClock, PhWhatsappLogo, PhPhone, PhSunHorizon, PhArrowUpRight, PhMoon, PhSun } from '@phosphor-icons/vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { addDays, todayISO } from '@gioi/domain'
import DatePicker from '@/components/DatePicker.vue'
import { useTheme } from '@/composables/useTheme'
import { useVenue } from '@/composables/useVenue'

gsap.registerPlugin(ScrollTrigger)

const route = useRoute()
const venue = (route.params.venue as string) || 'bali'
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { venue: venueData } = useVenue()

const info = venueData.value
const hours = venueData.value?.openingHours ?? {}
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const dayLabel = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const wa = info ? `https://wa.me/${info.whatsapp.replace(/\D/g, '')}` : '#'
const today = todayISO()
const witaFmt = new Intl.DateTimeFormat('en-GB', { timeZone: info?.timeZone ?? 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const wita = ref(witaFmt.format(new Date()))
const clockTimer = ref<ReturnType<typeof setInterval> | null>(null)
onBeforeUnmount(() => { if (clockTimer.value) clearInterval(clockTimer.value) })
const qDate = ref(today)
const qParty = ref(2)
const max = info?.partySizeLimits?.max ?? 8
const min = info?.partySizeLimits?.min ?? 1

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
  if (typeof window !== 'undefined') clockTimer.value = setInterval(() => { wita.value = witaFmt.format(new Date()) }, 1000)
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
    <button
      type="button"
      class="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-raised text-ink shadow-soft ring-1 ring-line transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    >
      <component :is="isDark ? PhSun : PhMoon" :size="22" class="transition-transform duration-300 hover:rotate-12" aria-hidden="true" />
    </button>
    <section data-hero class="relative isolate flex min-h-[100svh] flex-col bg-navy text-white">
      <header class="relative z-20">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <NuxtLink to="/" class="leading-none" aria-label="GIOI Ocean Gourmet, home"><img src="/logo.jpg" alt="" class="h-12 w-12 rounded-full object-cover" /></NuxtLink>
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
          <form data-hero-fade class="mt-6 flex max-w-xl flex-wrap items-end gap-3 rounded-[20px] bg-white/[0.08] p-3 ring-1 ring-white/15 backdrop-blur-sm" @submit.prevent="quickBook">
            <div class="min-w-[9.5rem] flex-1"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-date">Date</label><DatePicker id="q-date" v-model="qDate" :min="today" :max="addDays(today, 90)" :closed="info?.closedDates" class="h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30" /></div>
            <div class="w-28"><label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-party">Guests</label><select id="q-party" v-model.number="qParty" class="field h-12 border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30"><option v-for="n in max - min + 1" :key="n" :value="min + n - 1">{{ min + n - 1 }}</option></select></div>
            <button class="btn h-12 flex-1 bg-sun px-6 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy sm:flex-none" type="submit">Find a table</button>
          </form>
        </div>
        <div data-hero-media class="relative order-1 overflow-hidden rounded-[28px] md:order-2"><div class="aspect-[4/3] bg-navy md:aspect-auto md:h-[min(60svh,34rem)]"><img src="https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-06.webp" alt="GIOI Ocean Gourmet beachfront dining area" class="h-full w-full object-cover" fetchpriority="high" /></div></div>
      </div>
    </section>

    <section id="experience" class="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-36">
      <div class="max-w-3xl space-y-3"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">From first light to last call</p><h2 data-reveal aria-label="Come for the view. Stay for the flavour." class="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.05]"><span aria-hidden="true"><span v-for="w in 'Come for the view. Stay for the flavour.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2></div>
      <ol class="mt-16 grid gap-6 md:mt-24 md:grid-cols-3 md:gap-8"><li v-for="scene in scenes" :key="scene.title" data-rise :class="scene.feature ? 'md:-translate-y-12' : ''"><div class="group relative overflow-hidden rounded-surface"><div class="aspect-[4/5] overflow-hidden bg-line/50"><img :src="scene.img" :alt="scene.title" loading="lazy" class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /></div><span class="absolute left-4 top-4 rounded-full bg-navy/85 px-3 py-1 font-display text-sm font-bold text-sand backdrop-blur">{{ scene.time }}</span></div><div class="mt-5"><h3 class="text-2xl font-extrabold">{{ scene.title }}</h3><p class="mt-2 max-w-[36ch] leading-relaxed text-muted">{{ scene.copy }}</p></div></li></ol>
    </section>

    <section id="visit" class="border-b border-line"><div class="mx-auto grid max-w-7xl gap-16 px-4 py-24 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-32"><div><p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Find us</p><h2 data-reveal aria-label="On the beach at Discovery Mall." class="mt-4 text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.02]"><span aria-hidden="true"><span v-for="w in 'On the beach at Discovery Mall.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w }}</span></span></span></h2><p data-rise class="mt-8 flex gap-3 text-lg leading-relaxed"><PhMapPin :size="24" class="mt-1 shrink-0 text-accent" aria-hidden="true" /><span>{{ info?.address }}<br /></span></p>
      <p class="mt-4 flex items-center gap-2"><PhClock :size="20" class="text-accent" aria-hidden="true" /><span class="font-semibold">WITA</span> <span id="wita-clock">{{ wita }}</span></p>
      <div class="mt-6 space-y-3">
        <p v-for="(d, i) in days" :key="d" class="text-sm">
          <span class="w-10 text-muted">{{ dayLabel[d] }}</span>:
          <span class="text-ink">{{ hours[d] ? `${hours[d].open} – ${hours[d].close}` : '–' }}</span>
        </p>
      </div>
      <p class="mt-5"><a :href="wa" class="font-medium text-accent underline underline-offset-4"><PhWhatsappLogo :size="18" aria-hidden="true" /> WhatsApp</a> ·
        <a :href="`tel:${info?.phone.replace(/\D/g, '')}`" class="font-medium text-accent underline underline-offset-4"><PhPhone :size="18" aria-hidden="true" /> Call</a></p>
      </div>
      <div class="relative order-2 md:order-1"><img src="https://www.gioigroup.com/images/brands/3/GIOI-OG_Gallery-image-outlet-03.webp" alt="GIOI Ocean Gourmet interior" class="w-full h-[22rem] object-cover rounded-surface shadow-soft" /></div></div></section>

    <section class="bg-navy text-white"><div class="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8 md:pt-32"><h2 data-reveal aria-label="Make sunset your reservation." class="max-w-[14ch] text-[clamp(2.5rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white"><span aria-hidden="true"><span v-for="w in 'Make sunset your reservation.'.split(' ')" :key="w" class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]" :class="w === 'reservation.' ? 'text-sun' : ''">{{ w }}</span></span></span></h2><div data-rise class="mt-10 flex flex-wrap items-center gap-6"><NuxtLink :to="`/${venue}/book`" class="btn min-h-12 bg-sun px-8 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy">Reserve a table</NuxtLink><a :href="wa" class="btn-secondary min-h-12 px-8 text-base"><PhWhatsappLogo :size="20" aria-hidden="true" /> Message us</a></div></div></section>
  </div>
</template>

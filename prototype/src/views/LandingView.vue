<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhMapPin, PhClock, PhWhatsappLogo, PhPhone, PhSunHorizon, PhArrowUpRight, PhMoon, PhSun } from '@phosphor-icons/vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useDataStore } from '../stores/data'
import { addDays, todayISO } from '../domain/dates'
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
const qDate = ref(today)
const qParty = ref(2)
const max = data.settings.partySizeLimits.max
const min = data.settings.partySizeLimits.min

function quickBook() {
  router.push({ path: '/book', query: { date: qDate.value, party: String(qParty.value) } })
}

// hero headline split per line; words are decorative, the h1 keeps the full aria-label
const heroLines = ['Sunset,', 'served on', 'Kuta sand.']
const words = (s: string) => s.split(' ')

// ponytail: fixed approximation (Kuta sunset drifts ~18:10-18:30 across the year); compute per date if the client wants it exact
const sunset = '18:20'

const moments = [
  { time: '12:00', title: 'Lunch by the water', copy: 'Bean bags on the sand, cold coconuts, shade under the umbrellas.', slot: 'hero-day-beanbags 1200x1500', img: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Qgp6TwuZrof2N59kLWF8rzT3N_7A67L0GKrpnpeX5tm3yflSx4g6rUcLZnabFMreQN6Ahx8WVDEvGpwjp7DY-xDt0dvpMX2_-LgWl1L-qxMqJjx37y18h3EudcA8vNXj3K5s0=s1360-w1360-h1020-rw' },
  { time: sunset, title: 'The golden hour', copy: 'The reason people come. Book early, the front row goes first.', slot: 'hero-beachfront-golden-hour 1200x1500', feature: true, img: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9SP1Lan4aYg9eJNX2SKIRKZCT295K_0WORQTHXLcbG73gsa4ZyU2eTwUFrPYY9ZTrJCwyPmKW1j4v5NKXsrE6oQhT3K6ao5WEnN3FT9OuU_u6wyWXduG7E742l-apFYzPg9DgXiFCuTunBe=s1360-w1360-h1020-rw' },
  { time: '20:00', title: 'Fairy lights and dinner', copy: 'Asian fusion from the sea, a lounge that stays warm after dark.', slot: 'night-lounge-fairy-lights 1200x1500', img: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9QIRBVNQJvYTkfAuBsuRL2PSNfS5SyJuY1XO-e7RzAASN4CiDKh-r3_yjPSgwL6vq0SfSiyx5UGeo_yCZRhMbnppEZhazGIHsC5QTySrDwKQYC__9mbz4lnRpI_dRBqTOH8vfXIPa4yUHis=s1360-w1360-h1020-rw' },
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

    gsap.to('[data-hero-media] > div', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
    })

    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.from(el.querySelectorAll('[data-word]'), {
        yPercent: 100, opacity: 0, duration: 1, stagger: 0.04, ease,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      })
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
    <!-- HERO: dusk-navy (dark) / brand blue (light); floating toggle stays reachable at any scroll -->
    <button type="button" class="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-raised text-ink shadow-soft ring-1 ring-line transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
    </button>
    <section data-hero class="relative isolate flex min-h-[100svh] flex-col bg-[#1F4A6B] text-[#F3EEE4] transition-colors duration-500 dark:bg-navy">
      <header class="relative z-20">
        <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <RouterLink to="/" class="leading-none" aria-label="GIOI Ocean Gourmet, home">
            <img src="/logo.jpg" alt="" class="h-14 w-14 rounded-full object-cover" />
          </RouterLink>
          <nav class="flex items-center gap-1 sm:gap-2">
            <a href="#moments"
              class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">The
              day</a>
            <a href="#visit"
              class="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand sm:inline-flex">Visit</a>
            <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sand"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
              <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
            </button>
            <RouterLink to="/book" class="btn bg-sand text-navy hover:bg-white">Book a table</RouterLink>
          </nav>
        </div>
      </header>

      <div
        class="mx-auto grid w-full max-w-7xl flex-1 items-end gap-10 px-4 pb-10 pt-4 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:px-8 md:pb-16">
        <div class="relative z-10 order-2 md:order-1">
          <p data-hero-fade
            class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80">
            <PhSunHorizon :size="16" class="text-sun" aria-hidden="true" /> Tonight's sunset around {{ sunset }}
          </p>
          <h1 :aria-label="heroLines.join(' ')"
            class="font-display text-[clamp(3rem,9vw,7.5rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            <span v-for="(line, i) in heroLines" :key="i" class="block overflow-hidden pb-[0.06em]" aria-hidden="true">
              <span v-for="(w, j) in words(line)" :key="j" data-hero-word class="inline-block pr-[0.22em]"
                :class="i === 2 && j === 1 ? 'text-sun' : ''">{{ w }}</span>
            </span>
          </h1>
          <p data-hero-fade class="mt-6 max-w-[42ch] text-lg leading-relaxed text-white/75">{{ info.intro }}</p>

          <form data-hero-fade
            class="mt-8 flex max-w-xl flex-wrap items-end gap-3 rounded-[20px] bg-white/[0.06] p-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm"
            @submit.prevent="quickBook">
            <div class="min-w-[9.5rem] flex-1">
              <label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-date">Date</label>
              <input id="q-date" v-model="qDate" type="date" :min="today" :max="addDays(today, 90)"
                class="field border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30" />
            </div>
            <div class="w-24">
              <label class="mb-1 block px-1 text-xs font-medium text-white/70" for="q-party">Guests</label>
              <select id="q-party" v-model.number="qParty"
                class="field border-white/15 bg-navy/60 text-white [color-scheme:dark] focus:border-sand focus:ring-sand/30">
                <option v-for="n in max - min + 1" :key="n" :value="min + n - 1">{{ min + n - 1 }}</option>
              </select>
            </div>
            <button
              class="btn min-h-[46px] flex-1 bg-sun px-6 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy sm:flex-none"
              type="submit">Find a table</button>
          </form>
        </div>

        <div data-hero-media class="relative order-1 overflow-hidden rounded-[28px] md:order-2">
          <div class="aspect-[4/3] bg-navy md:aspect-[4/5]">
            <img
              src="https://lh3.googleusercontent.com/gps-cs-s/ANWiy9QSIVVaeDWmorJsr5AWwCTM4Hkawb-fHAj2f_lHHj3Lae-n0DuUDF4_oPGH9xJ1GchQTUm80v8ext597ucKsrGk9AHDDT-CvQkxh9B6UV8X32MYtj1LND0uIAdbDs6KZAi-pCQ=s1360-w1360-h1020-rw"
              alt="Beachfront lounge at golden hour" class="h-full w-full object-cover" fetchpriority="high" />
          </div>
        </div>
      </div>

      <!-- <div data-hero-fade class="mx-auto flex w-full max-w-7xl justify-between border-t border-white/10 px-4 py-4 text-xs uppercase tracking-[0.25em] text-white/50 md:px-8">
        <span>Kuta, Bali</span><span class="hidden sm:inline">{{ info.hoursSummary }}</span><span>Scroll</span>
      </div> -->
    </section>

    <!-- MOMENTS: the day as the menu -->
    <section id="moments" class="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-36">
      <div class="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">One table, three moods</p>
        <h2 data-reveal aria-label="Come for lunch. Stay for the sun."
          class="text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[1]">
          <span aria-hidden="true"><span v-for="(w, i) in words('Come for lunch. Stay for the sun.')" :key="i"
              class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w
                }}</span></span></span>
        </h2>
      </div>

      <ol class="mt-16 grid gap-6 md:mt-24 md:grid-cols-3 md:gap-8">
        <li v-for="(m, i) in moments" :key="m.title" data-rise :class="m.feature ? 'md:-translate-y-12' : ''">
          <div class="group relative overflow-hidden rounded-surface" :class="m.feature ? 'ring-2 ring-sun/70' : ''">
            <div
              class="grid aspect-[4/5] place-items-center bg-line/50 text-xs text-muted transition duration-700 group-hover:scale-[1.03]">
              <img v-if="m.img" :src="m.img" :alt="m.title" loading="lazy" class="h-full w-full object-cover" />
              <template v-else>{{ m.slot }}</template></div>
            <span
              class="absolute left-4 top-4 rounded-full bg-navy/85 px-3 py-1 font-display text-sm font-bold text-sand backdrop-blur">{{
              m.time }}</span>
          </div>
          <div class="mt-5 flex items-baseline gap-4">
            <span class="font-display text-sm font-bold text-muted">0{{ i + 1 }}</span>
            <div>
              <h3 class="text-2xl font-extrabold">{{ m.title }}</h3>
              <p class="mt-2 max-w-[36ch] leading-relaxed text-muted">{{ m.copy }}</p>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <!-- VISIT -->
    <section id="visit" class="border-t border-line">
      <div class="mx-auto grid max-w-7xl gap-16 px-4 py-24 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-32">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Find us</p>
          <h2 data-reveal aria-label="On the beach at Discovery Mall."
            class="mt-4 text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.02]">
            <span aria-hidden="true"><span v-for="(w, i) in words('On the beach at Discovery Mall.')" :key="i"
                class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]">{{ w
                  }}</span></span></span>
          </h2>
          <p data-rise class="mt-8 flex gap-3 text-lg leading-relaxed">
            <PhMapPin :size="24" class="mt-1 shrink-0 text-accent" aria-hidden="true" />
            <span>{{ info.address }}<br />
              <a :href="info.mapsUrl" target="_blank" rel="noopener"
                class="group inline-flex items-center gap-1 font-medium text-accent underline decoration-line underline-offset-4 transition hover:decoration-accent">Get
                directions
                <PhArrowUpRight :size="16" class="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true" />
              </a>
            </span>
          </p>
          <div data-rise class="mt-10 flex flex-wrap gap-3">
            <a :href="wa" class="btn-secondary">
              <PhWhatsappLogo :size="20" aria-hidden="true" /> WhatsApp
            </a>
            <a :href="`tel:${info.phone}`" class="btn-secondary">
              <PhPhone :size="20" aria-hidden="true" /> {{ info.phone }}
            </a>
          </div>
        </div>
        <div data-rise class="self-end">
          <h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            <PhClock :size="18" aria-hidden="true" /> Hours
          </h3>
          <ul class="mt-4 divide-y divide-line border-y border-line">
            <li v-for="d in days" :key="d" class="flex justify-between py-3">
              <span class="text-muted">{{ dayLabel[d] }}</span>
              <span class="font-medium">{{ hours[d].open }} – {{ hours[d].close }}</span>
            </li>
          </ul>
          <p v-if="data.settings.closedDates.length" class="pt-3 text-xs text-muted">Closed: {{
            data.settings.closedDates.join(', ') }}</p>
        </div>
      </div>
    </section>

    <!-- FINAL CTA + FOOTER -->
    <section class="bg-navy text-[#F3EEE4]">
      <div class="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8 md:pt-32">
        <h2 data-reveal aria-label="Save your table for sunset."
          class="max-w-[14ch] text-[clamp(2.5rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
          <span aria-hidden="true"><span v-for="(w, i) in words('Save your table for sunset.')" :key="i"
              class="inline-block overflow-hidden align-bottom"><span data-word class="inline-block pr-[0.2em]"
                :class="w === 'sunset.' ? 'text-sun' : ''">{{ w }}</span></span></span>
        </h2>
        <div data-rise class="mt-10 flex flex-wrap items-center gap-6">
          <RouterLink to="/book"
            class="btn min-h-12 bg-sun px-8 text-base text-navy hover:bg-sand focus-visible:ring-sand focus-visible:ring-offset-navy">
            Book a table</RouterLink>
          <p class="max-w-[48ch] text-sm leading-relaxed text-white/65">Book direct. We keep your allergies and
            favourite spot on file for next time.</p>
        </div>
        <p class="mt-6 max-w-[70ch] text-xs leading-relaxed text-white/45">{{ data.settings.cancellationPolicy }}</p>

        <footer
          class="mt-24 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <img src="/logo.jpg" alt="GIOI Ocean Gourmet" class="h-10 w-10 rounded-full object-cover" />
          <span>Demo prototype. Data lives in your browser only. <RouterLink to="/login"
              class="underline underline-offset-4 hover:text-white">Staff login</RouterLink></span>
        </footer>
      </div>
    </section>
  </div>
</template>

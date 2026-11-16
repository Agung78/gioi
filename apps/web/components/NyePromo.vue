<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'

defineProps<{ bookHref: string }>()

// One campaign, hardcoded. Bump `id` for the next promo so returning guests see it again.
const PROMO = { id: 'nye-2027', endsAt: '2027-01-01T00:00:00+08:00' }
const KEY = `promo-seen:${PROMO.id}`

const live = Date.now() < Date.parse(PROMO.endsAt)
const popup = ref(false)
const posthog = usePostHog()
const track = (event: string) => posthog?.capture(event, { promo: PROMO.id })

function close() {
	popup.value = false
	track('promo_popup_dismissed')
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && popup.value) close() }

// Client-only: the page is prerendered, so localStorage must not influence SSR output.
onMounted(() => {
	if (!live) return
	document.addEventListener('keydown', onKey)
	try {
		if (localStorage.getItem(KEY)) return
		localStorage.setItem(KEY, '1')
	} catch { /* storage blocked: still show once per page load */ }
	setTimeout(() => { popup.value = true; track('promo_popup_shown') }, 1200)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <template v-if="live">
    <div class="bg-sun text-navy">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-sm font-medium md:px-8">
        <span><strong class="font-extrabold">The Final Splash NYE 2027</strong> · Early Bird from IDR 450,000++</span>
        <a :href="bookHref" class="inline-flex min-h-8 items-center font-extrabold underline underline-offset-4 hover:no-underline" @click="track('promo_banner_clicked')">Book your table</a>
      </div>
    </div>
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="popup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="The Final Splash NYE 2027" @click.self="close">
        <div class="relative max-h-full">
          <button type="button" class="absolute -right-2 -top-2 z-10 grid size-11 place-items-center rounded-full bg-white text-navy shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sun" aria-label="Close" @click="close"><PhX :size="20" weight="bold" aria-hidden="true" /></button>
          <img src="/images/promo/nye-2027.webp" srcset="/images/promo/nye-2027-640.webp 640w, /images/promo/nye-2027.webp 1080w" sizes="(min-width: 768px) 45svh, 90vw" alt="The Final Splash, NYE 2027 at GIOI Ocean Gourmet. Early Bird IDR 450,000++ per adult, IDR 225,000++ per child (6 to 12 years)." width="1080" height="1920" class="max-h-[calc(100svh-6.5rem)] w-auto rounded-surface object-contain" />
          <a :href="bookHref" class="btn mt-3 w-full bg-sun text-navy hover:bg-sand" @click="track('promo_popup_cta_clicked')">Book your table</a>
        </div>
      </div>
    </Transition>
  </template>
</template>

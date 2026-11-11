<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhClock } from '@phosphor-icons/vue'

defineOptions({ inheritAttrs: false })
// Value is 24h "HH:mm", the same shape <input type="time"> produced; the UI shows 12h.
// `min` ("HH:mm") disables earlier times and pulls a too-early value up to the first valid one.
const props = withDefaults(defineProps<{ modelValue: string; id?: string; step?: number; min?: string }>(), { step: 5 })
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const root = ref<HTMLElement>()
const open = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const to24 = (h12: number, p: 'am' | 'pm') => (h12 % 12) + (p === 'pm' ? 12 : 0)
const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`
const h24 = computed(() => (props.modelValue ? Number(props.modelValue.slice(0, 2)) : 12))
const minute = computed(() => (props.modelValue ? Number(props.modelValue.slice(3, 5)) : 0))
const h12 = computed(() => h24.value % 12 || 12)
const period = computed<'am' | 'pm'>(() => (h24.value >= 12 ? 'pm' : 'am'))
const label = computed(() => (props.modelValue ? `${pad(h12.value)}:${pad(minute.value)} ${period.value}` : 'Select time'))

const hours = Array.from({ length: 12 }, (_, i) => i + 1)
const minutes = computed(() => Array.from({ length: Math.floor(60 / props.step) }, (_, i) => i * props.step))
const periods = ['am', 'pm'] as const

const lastMinute = computed(() => minutes.value[minutes.value.length - 1])
const tooEarly = (h: number, m: number) => !!props.min && hhmm(h, m) < props.min
const periodOff = (p: 'am' | 'pm') => tooEarly(p === 'am' ? 11 : 23, lastMinute.value)
const hourOff = (h: number) => tooEarly(to24(h, period.value), lastMinute.value)
const minuteOff = (m: number) => tooEarly(h24.value, m)

function set(h: number, m: number, p: 'am' | 'pm') {
  const h24v = to24(h, p)
  const ok = minutes.value.find((x) => !tooEarly(h24v, x))
  emit('update:modelValue', hhmm(h24v, tooEarly(h24v, m) && ok !== undefined ? ok : m))
}

function clamp() {
  if (!props.modelValue || !props.min || props.modelValue >= props.min) return
  const mh = Number(props.min.slice(0, 2))
  const first = minutes.value.find((x) => hhmm(mh, x) >= props.min!)
  emit('update:modelValue', first !== undefined ? hhmm(mh, first) : hhmm(Math.min(mh + 1, 23), 0))
}
watch(() => [props.min, props.modelValue], clamp, { immediate: true })

function centerSelected(smooth: boolean) {
  root.value?.querySelectorAll<HTMLElement>('[data-sel="true"]').forEach((el) => el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'instant' }))
}
watch(open, (v) => { if (v) nextTick(() => centerSelected(false)) })
watch(() => props.modelValue, () => { if (open.value) nextTick(() => centerSelected(true)) })

const away = (e: Event) => { if (!root.value?.contains(e.target as Node)) open.value = false }
const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
onMounted(() => { document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) })

const col = 'h-48 snap-y snap-mandatory overflow-y-auto overscroll-contain py-[4.75rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const cell = 'relative grid h-10 w-full snap-center place-items-center rounded-full text-base tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through'
const tone = (on: boolean) => (on ? 'font-bold text-accent' : 'text-muted')
</script>

<template>
  <div ref="root" class="relative">
    <button :id="id" type="button" v-bind="$attrs" aria-haspopup="dialog" :aria-expanded="open"
      class="field flex items-center justify-between gap-2 text-left tabular-nums" @click="open = !open">
      <span>{{ label }}</span>
      <PhClock :size="18" class="shrink-0 opacity-70" />
    </button>

    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="open" role="dialog" aria-label="Choose a time"
        class="absolute left-0 top-full z-50 mt-2 w-full min-w-[13rem] rounded-surface border border-line bg-raised p-2 text-ink shadow-soft">
        <div class="relative grid grid-cols-3 gap-1">
          <div class="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-full bg-line/50" aria-hidden="true" />
          <div :class="col" role="listbox" aria-label="Hour">
            <button v-for="h in hours" :key="h" type="button" role="option" :aria-selected="h === h12" :data-sel="h === h12"
              :disabled="hourOff(h)" :class="[cell, tone(h === h12)]" @click="set(h, minute, period)">{{ pad(h) }}</button>
          </div>
          <div :class="col" role="listbox" aria-label="Minute">
            <button v-for="m in minutes" :key="m" type="button" role="option" :aria-selected="m === minute" :data-sel="m === minute"
              :disabled="minuteOff(m)" :class="[cell, tone(m === minute)]" @click="set(h12, m, period)">{{ pad(m) }}</button>
          </div>
          <div :class="col" role="listbox" aria-label="AM or PM">
            <button v-for="p in periods" :key="p" type="button" role="option" :aria-selected="p === period" :data-sel="p === period"
              :disabled="periodOff(p)" :class="[cell, tone(p === period)]" @click="set(h12, minute, p)">{{ p }}</button>
          </div>
        </div>
        <div class="mt-2 flex justify-end border-t border-line pt-2">
          <button type="button" class="px-2 text-sm font-semibold text-accent hover:underline" @click="open = false">Done</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

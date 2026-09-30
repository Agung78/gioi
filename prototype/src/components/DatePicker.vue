<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PhCalendarBlank, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import { fromISODate, toISODate, todayISO } from '../domain/dates'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ modelValue: string; min?: string; max?: string; closed?: string[]; id?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const root = ref<HTMLElement>()
const open = ref(false)
const view = ref(fromISODate(props.modelValue || todayISO())) // first-of-month cursor
view.value.setDate(1)

const today = todayISO()
const label = computed(() =>
  props.modelValue
    ? fromISODate(props.modelValue).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Select date')
const title = computed(() => view.value.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))

const cells = computed(() => {
  const y = view.value.getFullYear(), m = view.value.getMonth()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7 // Monday-first
  const days = new Date(y, m + 1, 0).getDate()
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toISODate(new Date(y, m, i + 1)))] as (string | null)[]
})
const off = (iso: string) => (props.min && iso < props.min) || (props.max && iso > props.max) || props.closed?.includes(iso)
const canPrev = computed(() => !props.min || toISODate(new Date(view.value.getFullYear(), view.value.getMonth(), 0)) >= props.min)
const canNext = computed(() => !props.max || toISODate(new Date(view.value.getFullYear(), view.value.getMonth() + 1, 1)) <= props.max)
const step = (n: number) => { view.value = new Date(view.value.getFullYear(), view.value.getMonth() + n, 1) }

function pick(iso: string) { emit('update:modelValue', iso); open.value = false }
function toggle() {
  if (!open.value && props.modelValue) { view.value = fromISODate(props.modelValue); view.value.setDate(1) }
  open.value = !open.value
}
const away = (e: Event) => { if (!root.value?.contains(e.target as Node)) open.value = false }
const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
onMounted(() => { document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) })
</script>

<template>
  <div ref="root" class="relative">
    <button :id="id" type="button" v-bind="$attrs" aria-haspopup="dialog" :aria-expanded="open"
      class="field flex items-center justify-between gap-2 text-left" @click="toggle">
      <span>{{ label }}</span>
      <PhCalendarBlank :size="18" class="shrink-0 opacity-70" />
    </button>

    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="open" role="dialog" aria-label="Choose a date"
        class="absolute left-0 top-full z-50 mt-2 w-[19rem] rounded-surface border border-line bg-raised p-4 text-ink shadow-soft">
        <div class="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Previous month" :disabled="!canPrev"
            class="grid h-9 w-9 place-items-center rounded-full hover:bg-line/50 disabled:opacity-30 disabled:hover:bg-transparent" @click="step(-1)">
            <PhCaretLeft :size="16" /></button>
          <span class="font-display text-base font-bold">{{ title }}</span>
          <button type="button" aria-label="Next month" :disabled="!canNext"
            class="grid h-9 w-9 place-items-center rounded-full hover:bg-line/50 disabled:opacity-30 disabled:hover:bg-transparent" @click="step(1)">
            <PhCaretRight :size="16" /></button>
        </div>
        <div class="grid grid-cols-7 text-center text-xs font-medium text-muted">
          <span v-for="(d, i) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="i" class="py-1">{{ d }}</span>
        </div>
        <div class="grid grid-cols-7 gap-y-1 text-center text-sm">
          <template v-for="(iso, i) in cells" :key="i">
            <span v-if="!iso" />
            <button v-else type="button" :disabled="!!off(iso)" :aria-pressed="iso === modelValue"
              class="relative mx-auto grid h-9 w-9 place-items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sun"
              :class="iso === modelValue
                ? 'bg-sun font-bold text-navy'
                : off(iso) ? 'cursor-not-allowed text-muted/40 line-through decoration-muted/30' : 'hover:bg-line/60'"
              @click="pick(iso)">
              {{ Number(iso.slice(8)) }}
              <span v-if="iso === today && iso !== modelValue" class="absolute bottom-1 h-1 w-1 rounded-full bg-sun" />
            </button>
          </template>
        </div>
        <div class="mt-3 flex justify-end border-t border-line pt-3">
          <button type="button" class="text-sm font-semibold text-sun hover:underline disabled:opacity-40"
            :disabled="!!off(today)" @click="pick(today)">Today</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-ink ring-1 ring-line transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
  </button>
</template>

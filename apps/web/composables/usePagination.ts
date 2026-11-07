import { computed, ref, type Ref } from 'vue'

// Client-side paging; page is clamped so shrinking the list (filter/search) never strands you past the end.
export function usePagination<T>(items: Ref<T[]>, size = 20) {
	const requested = ref(1)
	const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / size)))
	const page = computed({
		get: () => Math.min(requested.value, pageCount.value),
		set: (v: number) => { requested.value = v },
	})
	const paged = computed(() => items.value.slice((page.value - 1) * size, page.value * size))
	return { page, pageCount, paged }
}

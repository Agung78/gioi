import { useState } from '#app'

export type ToastKind = 'success' | 'error'
export interface ToastAction { label: string; run: () => void | Promise<void> }

// One toast at a time: a new message replaces the current one. Errors stay up longer so they can be read.
let timer = 0
const PENDING = 'gioi-toast'

// For flows that end in location.reload(): the message is shown by ToastHost on the next page load.
export function toastAfterReload(text: string) {
	sessionStorage.setItem(PENDING, text)
}

export function takePendingToast(): string | null {
	const text = sessionStorage.getItem(PENDING)
	sessionStorage.removeItem(PENDING)
	return text
}

export function useToast() {
	const message = useState<{ id: number; text: string; kind: ToastKind; action?: ToastAction } | null>('toast', () => null)
	function toast(text: string, kind: ToastKind = 'success', action?: ToastAction) {
		window.clearTimeout(timer)
		message.value = { id: Date.now(), text, kind, action }
		timer = window.setTimeout(() => { message.value = null }, action ? 8000 : kind === 'error' ? 6000 : 3500)
	}
	return { message, toast }
}

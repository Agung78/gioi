<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from '#app'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const next = computed(() => {
	const raw = route.query.next
	return typeof raw === 'string' && /^\/(?![/\\])/.test(raw) ? raw : null
})

const formLogin = ref('')
const formPassword = ref('')
const error = ref<string | null>(route.query.reason === 'session' ? 'You were signed out: your session expired or you signed in on another device.' : null)
const submitting = ref(false)

async function handleLogin() {
	error.value = null
	submitting.value = true
	try {
		const user = await auth.login({ login: formLogin.value, password: formPassword.value })
		if (!user) throw new Error('Sign in failed. Please try again.')
		const dest = next.value ?? (auth.isAdmin ? '/admin' : '/host')
		await router.push(dest)
	} catch (e: any) {
		const s = e.statusCode ?? e.status ?? 0
		error.value = s >= 500 ? 'Service unavailable. Please try again shortly.' : s === 429 ? 'Too many attempts. Try again later.' : s ? 'Invalid login or password.' : e.message
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<div class="mx-auto max-w-2xl px-4 py-16">
		<div class="card text-center">
			<div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink">
				<span class="font-display text-2xl font-bold">G</span>
			</div>
			<h1 class="mt-4 font-display text-3xl font-semibold text-gioi-moss">Sign in to GIOI</h1>
			<p class="mt-2 text-gioi-ink/70">Staff sign in. Enter your login and password.</p>
			<form class="mx-auto mt-8 max-w-sm space-y-4 text-left" @submit.prevent="handleLogin">
				<div>
					<label class="label" for="login">Login</label>
					<input id="login" v-model="formLogin" class="field" type="text" autocomplete="username" required />
				</div>
				<div>
					<label class="label" for="password">Password</label>
					<input id="password" v-model="formPassword" class="field" type="password" autocomplete="current-password" required />
				</div>
				<button class="btn-primary min-h-12 w-full" type="submit" :disabled="submitting">{{ submitting ? 'Signing in…' : 'Sign in' }}</button>
			</form>

			<div v-if="error" class="alert-danger mt-6">{{ error }}</div>
		</div>
	</div>
</template>

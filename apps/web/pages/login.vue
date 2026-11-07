<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from '#app'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const next = computed(() => {
	const raw = route.query.next
	return typeof raw === 'string' ? raw : null
})

const formLogin = ref('')
const formPassword = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

async function handleLogin() {
	error.value = null
	submitting.value = true
	try {
		const user = await auth.login({ login: formLogin.value, password: formPassword.value })
		const dest = next.value ?? (user.isSuperAdmin ? '/admin' : '/host')
		await router.push(dest)
	} catch (e: any) {
		error.value = e.message ?? 'Invalid login or password.'
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

			<div class="mt-8 space-y-4">
				<div class="text-left">
					<label class="label block mb-1">Login</label>
					<input v-model="formLogin" type="text" class="field w-full" autocomplete="username" placeholder="e.g. host" />
				</div>
				<div class="text-left">
					<label class="label block mb-1">Password</label>
					<input v-model="formPassword" type="password" class="field w-full" autocomplete="current-password" placeholder="••••••••" />
				</div>
				<button class="btn-primary w-full" type="button" @click="handleLogin" :disabled="submitting">
					{{ submitting ? 'Signing in…' : 'Sign in' }}
				</button>
			</div>

			<div class="mt-6 grid gap-4 sm:grid-cols-2 text-left">
				<button class="card hover:border-gioi-moss/60 text-left transition-colors" type="button" @click="() => { formLogin = 'host'; formPassword = 'password' }">
					<p class="label">Host — Putu</p>
					<p class="mt-1 text-sm text-gioi-ink/70">host / password</p>
				</button>
				<button class="card hover:border-gioi-moss/60 text-left transition-colors" type="button" @click="() => { formLogin = 'admin'; formPassword = 'password' }">
					<p class="label">Super Admin</p>
					<p class="mt-1 text-sm text-gioi-ink/70">admin / password</p>
				</button>
			</div>

			<div v-if="error" class="alert-danger mt-6">{{ error }}</div>
		</div>
	</div>
</template>

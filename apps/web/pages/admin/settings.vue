<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from '#app'
import type { SeatingArea, User, DayOfWeek } from '@gioi/domain'
import {
	fetchVenue, updateVenue,
	fetchOpeningHours, saveOpeningHours,
	fetchClosedDates, saveClosedDates,
	fetchSeatingAreas, saveSeatingAreas,
	fetchUsers, saveUsers, createUser, fetchMe,
	downloadExportCSV,
	type VenueSettings, type OpeningHoursRow, type ClosedDateRow, type SeatingAreaRow, type StaffUserRow,
} from '@/composables/useApi'

const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function hhmm(minutes: number | undefined): string {
	if (minutes === undefined || minutes === null) return ''
	const h = String(Math.floor(minutes / 60)).padStart(2, '0')
	const m = String(minutes % 60).padStart(2, '0')
	return `${h}:${m}`
}

const route = useRoute()
let venueId = String(route.query.venueId || '')
const auth = useAuthStore()

const venue = ref<VenueSettings | null>(null)
const loading = ref(true)
const saved = ref<string | null>(null)
function flash() { saved.value = `Saved at ${new Date().toLocaleTimeString()}`; setTimeout(() => { saved.value = null }, 2000) }

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const draft = ref<VenueSettings | null>(null)
watch(() => venue.value, (val) => { if (val) draft.value = clone(val) }, { deep: true })

const opening = ref<OpeningHoursRow[]>([])
const closed = ref<ClosedDateRow[]>([])
const areas = ref<SeatingAreaRow[]>([])
const users = ref<StaffUserRow[]>([])

const dayLabel: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

async function load() {
	loading.value = true
	try {
		const [v, oh, cd, ar, us] = await Promise.all([
			fetchVenue(venueId),
			fetchOpeningHours(venueId),
			fetchClosedDates(venueId),
			fetchSeatingAreas(venueId),
			auth.isSuperAdmin ? fetchUsers(venueId) : Promise.resolve([]), // /admin/users is super-admin only
		])
		venue.value = v
		draft.value = clone(v)
		opening.value = oh.map((r) => ({ weekday: r.weekday, openMinute: r.openMinute, closeMinute: r.closeMinute }))
		closed.value = cd
		areas.value = ar
		users.value = us
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	if (!venueId) venueId = (await fetchMe())?.venueIds?.[0] ?? ''
	await load()
})

const parseTags = (text: string) => text.split(',').map((t) => t.trim()).filter(Boolean)
const feedbackTagsText = ref((draft.value?.feedbackTags ?? []).join(', '))
watch(() => draft.value?.feedbackTags, (val) => { feedbackTagsText.value = (val ?? []).join(', ') }, { deep: true })
const feedbackTagsPreview = computed(() => parseTags(feedbackTagsText.value))

// Run a save, then reload; surface API failures instead of swallowing them.
async function run(fn: () => Promise<unknown>) {
	try {
		await fn()
		await load()
		flash()
	} catch (e) {
		const msg = (e as { data?: { message?: string } })?.data?.message
		saved.value = `Save failed${msg ? `: ${msg}` : '.'}`
	}
}

// Restaurant info, booking rules and feedback: one save (the prototype's "Save restaurant" /
// "Save feedback settings"). `name` and `feedbackTags` are not in the API PATCH whitelist, so
// those inputs stay read-only — the prototype can persist them, production cannot.
function saveSettings() {
	const d = draft.value
	if (!d) return
	const keys = ['tagline', 'intro', 'address', 'phone', 'whatsapp', 'email', 'mapsUrl',
		'bookingIntervalMinutes', 'partyMin', 'partyMax', 'diningMinutes', 'leadTimeMinutes',
		'cutoffMinutes', 'noShowTargetPercent', 'overCapacityAlertPercent', 'cancellationPolicy',
		'feedbackTitle', 'feedbackSubtitle', 'feedbackMessageTemplate'] as const
	const body = Object.fromEntries(keys.map((k) => [k, d[k]]))
	return run(async () => {
		await updateVenue(venueId, body)
	})
}

// Opening hours & closed dates: one save (the prototype's "Save hours & rules").
async function saveHours() {
	return run(async () => {
		await saveOpeningHours(venueId, opening.value)
		await saveClosedDates(venueId, closed.value.map((c) => ({ date: c.date, reason: c.reason ?? null })))
	})
}

const saveAreas = () => run(() => saveSeatingAreas(venueId, areas.value))
const saveUsersApi = () => run(() => saveUsers(users.value.map((u) => ({ userId: u.id, venueId: u.venueId, role: u.role, name: u.name, login: u.login, active: u.active }))))
const newUser = ref({ name: '', login: '', password: '', role: 'host' })
const addUser = () => run(async () => {
	await createUser({ venueId, ...newUser.value })
	newUser.value = { name: '', login: '', password: '', role: 'host' }
})

const newClosedDate = ref('')
const closedDateError = ref<string | null>(null)
function addClosedDate() {
	const date = newClosedDate.value
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { closedDateError.value = 'Pick a valid date.'; return }
	closedDateError.value = null
	if (!closed.value.some((d) => d.date === date)) {
		closed.value = [...closed.value, { date, reason: null }].sort((a, b) => a.date.localeCompare(b.date))
	}
	newClosedDate.value = ''
}
function removeClosedDate(date: string) {
	closed.value = closed.value.filter((d) => d.date !== date)
}

function updateDay(day: string, key: 'open' | 'close', val: string) {
	const weekday = DAYS_OF_WEEK.indexOf(day as DayOfWeek)
	const [h, m] = val.split(':').map(Number)
	if (Number.isNaN(h)) return
	let cur = opening.value.find((o) => o.weekday === weekday)
	if (!cur) {
		cur = { weekday, openMinute: 0, closeMinute: 0 }
		opening.value = [...opening.value, cur]
	}
	cur[key === 'open' ? 'openMinute' : 'closeMinute'] = h * 60 + m
}

function updateArea(idx: number, patch: Partial<SeatingArea>) {
	const next = [...areas.value]
	next[idx] = { ...next[idx], ...patch }
	areas.value = next
}
function addArea() {
	const id = `area-${Math.random().toString(36).slice(2, 6)}`
	areas.value = [...areas.value, { id, name: 'New area', capacity: 10, bookable: true }]
}
function removeArea(idx: number) {
	areas.value = areas.value.filter((_, i) => i !== idx)
}

function updateUser(idx: number, patch: Partial<User>) {
	const next = [...users.value]
	next[idx] = { ...next[idx], ...patch }
	users.value = next
}

function exportReservations() {
	downloadExportCSV(venueId).then((csv) => {
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `gioi-reservations-${new Date().toISOString().slice(0, 10)}.csv`
		a.click()
		setTimeout(() => URL.revokeObjectURL(url), 1000)
	}).catch(() => { saved.value = 'Export failed.' })
}

const totalCapacity = computed(() => areas.value.filter((a) => a.bookable).reduce((s, a) => s + a.capacity, 0))

definePageMeta({ middleware: ['auth', 'admin'] })
</script>

<template>
	<div class="mx-auto max-w-5xl px-4 py-8">
		<header class="mb-6 flex items-baseline justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-wide text-muted">{{ auth.isSuperAdmin ? 'Super Admin' : 'Admin' }}</p>
				<h1 class="font-display text-3xl font-semibold text-ink">Settings</h1>
			</div>
			<p v-if="saved" class="text-sm text-ink">{{ saved }}</p>
		</header>

		<div v-if="loading" class="card text-center py-16">
			<p class="text-muted">Loading settings…</p>
		</div>

		<div v-else-if="!draft" class="card py-16 text-center">
			<p class="text-muted">No venue found for this account. Run the create-super-admin script, or check the API.</p>
		</div>

		<div v-else>
			<section v-if="!auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Restaurant</h2>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<div>
						<label class="label">Name</label>
						<input v-model="draft!.name" class="field" disabled />
					</div>
					<div>
						<label class="label">Tagline</label>
						<input v-model="draft!.tagline" class="field" />
					</div>
					<div class="sm:col-span-2">
						<label class="label">Intro</label>
						<textarea v-model="draft!.intro" rows="2" class="field" />
					</div>
					<div>
						<label class="label">Address</label>
						<input v-model="draft!.address" class="field" />
					</div>
					<div>
						<label class="label">Maps URL</label>
						<input v-model="draft!.mapsUrl" class="field" />
					</div>
					<div>
						<label class="label">Phone</label>
						<input v-model="draft!.phone" class="field" />
					</div>
					<div>
						<label class="label">WhatsApp</label>
						<input v-model="draft!.whatsapp" class="field" />
					</div>
					<div class="sm:col-span-2">
						<label class="label">Cancellation policy</label>
						<textarea v-model="draft!.cancellationPolicy" rows="2" class="field" />
					</div>
				</div>
				<div class="mt-4 flex justify-end">
					<button class="btn-primary" type="button" @click="saveSettings">Save restaurant</button>
				</div>
			</section>

			<section v-if="!auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Opening hours & rules</h2>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div v-for="day in DAYS_OF_WEEK" :key="day" class="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-sm">
						<span class="font-medium text-ink">{{ dayLabel[day] }}</span>
						<input type="time" class="field" :value="hhmm(opening.find((o) => o.weekday === DAYS_OF_WEEK.indexOf(day))?.openMinute)" @change="updateDay(day, 'open', ($event.target as HTMLInputElement).value)" />
						<input type="time" class="field" :value="hhmm(opening.find((o) => o.weekday === DAYS_OF_WEEK.indexOf(day))?.closeMinute)" @change="updateDay(day, 'close', ($event.target as HTMLInputElement).value)" />
					</div>
				</div>
				<div class="mt-6 grid gap-4 sm:grid-cols-3">
					<div>
						<label class="label">Booking interval (minutes)</label>
						<input v-model.number="draft!.bookingIntervalMinutes" type="number" min="5" step="5" class="field" />
					</div>
					<div>
						<label class="label">Min party size</label>
						<input v-model.number="draft!.partyMin" type="number" min="1" class="field" />
					</div>
					<div>
						<label class="label">Max party size</label>
						<input v-model.number="draft!.partyMax" type="number" min="1" class="field" />
					</div>
					<div>
						<label class="label">Lead time (minutes)</label>
						<input v-model.number="draft!.leadTimeMinutes" type="number" min="0" class="field" />
					</div>
					<div>
						<label class="label">Cut-off (minutes)</label>
						<input v-model.number="draft!.cutoffMinutes" type="number" min="0" class="field" />
					</div>
					<div>
						<label class="label">No-show target %</label>
						<input v-model.number="draft!.noShowTargetPercent" type="number" min="0" max="100" class="field" />
					</div>
					<div>
						<label class="label">Over-capacity alert %</label>
						<input v-model.number="draft!.overCapacityAlertPercent" type="number" min="0" max="100" class="field" />
					</div>
				</div>
				<div class="mt-6">
					<p class="label">Closed dates</p>
					<div class="mt-2 flex flex-wrap items-center gap-2">
						<span v-for="d in closed" :key="d.date" class="chip bg-line/50 text-ink">
							{{ d.date }}
							<button type="button" class="-my-2 -mr-2 grid h-11 w-11 place-items-center text-muted hover:text-ink" :aria-label="`Remove ${d.date}`" @click="removeClosedDate(d.date)">×</button>
						</span>
						<input v-model="newClosedDate" type="date" class="field !w-auto !py-1 !px-2.5 text-sm" aria-label="Closed date" @keydown.enter.prevent="addClosedDate" />
						<button class="btn-ghost" type="button" @click="addClosedDate">+ Add</button>
					</div>
					<p v-if="closedDateError" class="mt-1 text-xs text-danger">{{ closedDateError }}</p>
				</div>
				<div class="mt-4 flex justify-end">
					<button class="btn-primary" type="button" @click="saveHours">Save hours &amp; rules</button>
				</div>
			</section>

			<section v-if="!auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Guest feedback</h2>
				<p class="mt-1 text-sm text-muted">Configure the WhatsApp message template and feedback tags.</p>
				<div class="mt-4 grid gap-4">
					<div>
						<label class="label">Feedback question / title</label>
						<input v-model="draft!.feedbackTitle" type="text" class="field" placeholder="How was your visit?" />
					</div>
					<div>
						<label class="label">Feedback subtitle / description</label>
						<input v-model="draft!.feedbackSubtitle" type="text" class="field" placeholder="A few words from you help our team make the next visit better." />
					</div>
					<div>
						<label class="label">What stood out? tags (comma-separated)</label>
						<input v-model="feedbackTagsText" type="text" class="field" placeholder="Food, Service, Atmosphere, Value" disabled />
						<div class="mt-2 flex flex-wrap gap-2"><span v-for="tag in feedbackTagsPreview" :key="tag" class="chip bg-line/50">{{ tag }}</span></div>
					</div>
					<div>
						<label class="label">WhatsApp message template</label>
						<textarea v-model="draft!.feedbackMessageTemplate" rows="3" class="field" placeholder="Use {{guestName}}, {{restaurantName}}, and {{feedbackUrl}}" />
					</div>
				</div>
				<div class="mt-4 flex justify-end"><button class="btn-primary" type="button" @click="saveSettings">Save feedback settings</button></div>
			</section>

			<section v-if="!auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Seating areas</h2>
				<p class="text-sm text-muted">Total bookable capacity: {{ totalCapacity }} covers</p>
				<div class="mt-4 space-y-3">
					<div v-for="(area, idx) in areas" :key="area.id" class="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
						<div>
							<label class="label">Name</label>
							<input :value="area.name" class="field" @input="updateArea(idx, { name: ($event.target as HTMLInputElement).value })" />
						</div>
						<div>
							<label class="label">Capacity</label>
							<input type="number" min="0" :value="area.capacity" class="field" @input="updateArea(idx, { capacity: Number(($event.target as HTMLInputElement).value) })" />
						</div>
						<div>
							<label class="label">Min party</label>
							<input type="number" min="0" :value="area.minParty ?? ''" class="field" @input="updateArea(idx, { minParty: Number(($event.target as HTMLInputElement).value) || undefined })" />
						</div>
						<div>
							<label class="label">Max party</label>
							<input type="number" min="0" :value="area.maxParty ?? ''" class="field" @input="updateArea(idx, { maxParty: Number(($event.target as HTMLInputElement).value) || undefined })" />
						</div>
						<div class="flex items-center gap-2">
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" :checked="area.bookable" @change="updateArea(idx, { bookable: ($event.target as HTMLInputElement).checked })" />
								Bookable
							</label>
							<button class="btn-ghost" type="button" @click="removeArea(idx)" aria-label="Remove area">Remove</button>
						</div>
					</div>
					<button class="btn-secondary" type="button" @click="addArea">+ Add seating area</button>
				</div>
				<div class="mt-4 flex justify-end">
					<button class="btn-primary" type="button" @click="saveAreas">Save seating areas</button>
				</div>
			</section>

			<section v-if="auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Users</h2>
				<div class="mt-4 space-y-3">
					<div v-for="(u, idx) in users" :key="u.id" class="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
						<div>
							<label class="label">Name</label>
							<input :value="u.name" class="field" @input="updateUser(idx, { name: ($event.target as HTMLInputElement).value })" />
						</div>
						<div>
							<label class="label">Login</label>
							<input :value="u.login" class="field" @input="updateUser(idx, { login: ($event.target as HTMLInputElement).value })" />
						</div>
						<div>
							<label class="label">Role</label>
							<select :value="u.role" class="field" @change="updateUser(idx, { role: ($event.target as HTMLSelectElement).value as User['role'] })">
								<option value="admin">Admin</option>
								<option value="host">Host</option>
							</select>
						</div>
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" :checked="u.active" @change="updateUser(idx, { active: ($event.target as HTMLInputElement).checked })" />
							Active
						</label>
					</div>
				</div>
				<div class="mt-4 flex justify-end">
					<button class="btn-primary" type="button" @click="saveUsersApi">Save users</button>
				</div>
				<form class="mt-6 grid items-end gap-3 border-t border-line pt-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" @submit.prevent="addUser">
					<div><label class="label">Name</label><input v-model="newUser.name" class="field" required /></div>
					<div><label class="label">Login</label><input v-model="newUser.login" class="field" required autocomplete="off" /></div>
					<div><label class="label">Password (12+)</label><input v-model="newUser.password" type="password" minlength="12" class="field" required autocomplete="new-password" /></div>
					<div>
						<label class="label">Role</label>
						<select v-model="newUser.role" class="field"><option value="admin">Admin</option><option value="host">Host</option></select>
					</div>
					<button class="btn-primary" type="submit">Add user</button>
				</form>
			</section>

			<section v-if="!auth.isSuperAdmin" class="card">
				<h2 class="font-display text-xl font-semibold text-ink">Data export</h2>
				<p class="mt-1 text-sm text-muted">Download every reservation as CSV. The file includes guest contact details and allergy/accessibility notes — handle accordingly.</p>
				<button class="btn-primary mt-4" type="button" @click="exportReservations">Download reservations CSV</button>
			</section>
		</div>
	</div>
</template>

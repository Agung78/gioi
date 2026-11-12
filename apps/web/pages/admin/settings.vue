<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from '#app'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import DatePicker from '@/components/DatePicker.vue'
import TimePicker from '@/components/TimePicker.vue'
import type { AdminFloorPlan } from '@gioi/domain'
import { todayISO, type User, type DayOfWeek } from '@gioi/domain'
import {
	fetchVenue, updateVenue,
	fetchOpeningHours, saveOpeningHours,
	fetchClosedDates, saveClosedDates,
	fetchUsers, saveUsers, createUser, removeUser, createVenue, fetchMe,
	downloadExportCSV, fetchFloorPlan, saveFloorImage,
	type VenueSettings, type OpeningHoursRow, type ClosedDateRow, type StaffUserRow,
} from '@/composables/useApi'

const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function hhmm(minutes: number | undefined): string {
	if (minutes === undefined || minutes === null) return ''
	const h = String(Math.floor(minutes / 60)).padStart(2, '0')
	const m = String(minutes % 60).padStart(2, '0')
	return `${h}:${m}`
}

const route = useRoute()
const auth = useAuthStore()
let venueId = String(route.query.venueId || (auth.isSuperAdmin ? auth.selectedVenueId : '') || '')

const venue = ref<VenueSettings | null>(null)
const loading = ref(true)
const saved = ref<string | null>(null)
function flash() { saved.value = `Saved at ${new Date().toLocaleTimeString()}`; setTimeout(() => { saved.value = null }, 2000) }

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const draft = ref<VenueSettings | null>(null)
watch(() => venue.value, (val) => { if (val) draft.value = clone(val) }, { deep: true })

const opening = ref<OpeningHoursRow[]>([])
const closed = ref<ClosedDateRow[]>([])
const users = ref<StaffUserRow[]>([])
const floorPlan = ref<AdminFloorPlan | null>(null)
const imageError = ref<string | null>(null)

const dayLabel: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

async function load() {
	loading.value = true
	try {
		if (auth.isSuperAdmin) {
			if (!auth.selectedVenueId) auth.setSelectedVenueId(null)
			venueId = auth.selectedVenueId ?? ''
			users.value = venueId ? await fetchUsers(venueId) : []
			floorPlan.value = venueId ? await fetchFloorPlan(venueId) : null
			return
		}
		let [v, oh, cd] = await Promise.all([
			fetchVenue(venueId),
			fetchOpeningHours(venueId),
			fetchClosedDates(venueId),
		])
		// Expired notice (date before today): switch it off using the admin session.
		if (v.noticeDate && v.noticeDate < todayISO()) v = await updateVenue(venueId, { noticeEnabled: false, noticeDate: null })
		venue.value = v
		draft.value = clone(v)
		opening.value = oh.map((r) => ({ weekday: r.weekday, openMinute: r.openMinute, closeMinute: r.closeMinute }))
		closed.value = cd
	} finally {
		loading.value = false
	}
}

watch(() => auth.selectedVenueId, (id) => {
	if (auth.isSuperAdmin && id) { venueId = id; load() }
})

// Super admin backdrop upload. The API derives the plan height from the drawing's aspect ratio.
async function saveImageFile(input: HTMLInputElement) {
	const file = input.files?.[0]
	input.value = '' // allow picking the same file again
	if (!file) return
	if (file.size > 3 * 1024 * 1024) { imageError.value = 'Drawing must be under 3 MB.'; return }
	imageError.value = null
	const image = await new Promise<string>((resolve, reject) => {
		const r = new FileReader()
		r.onload = () => resolve(String(r.result))
		r.onerror = () => reject(r.error)
		r.readAsDataURL(file)
	})
	const img = new Image()
	img.src = image
	try { await img.decode() } catch { imageError.value = 'Could not read that image.'; return }
	let width = img.naturalWidth, height = img.naturalHeight
	if (!width || !height) {
		// SVG without width/height: fall back to its viewBox, then a 4:3 canvas
		const vb = new DOMParser().parseFromString(await file.text(), 'image/svg+xml').documentElement.getAttribute('viewBox')
		const [, , w, h] = (vb ?? '').split(/[\s,]+/).map(Number)
		width = w > 0 ? w : 1200
		height = h > 0 ? h : 900
	}
	await run(() => saveFloorImage(venueId, { image, width, height }))
}

function removeImage() {
	if (confirm('Remove the floor plan drawing?')) return run(() => saveFloorImage(venueId, { image: null }))
}

onMounted(async () => {
	if (!venueId && !auth.isSuperAdmin) venueId = (await fetchMe())?.venueIds?.[0] ?? ''
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
function settingsBody() {
	const d = draft.value!
	const keys = ['tagline', 'intro', 'address', 'phone', 'whatsapp', 'email', 'mapsUrl',
		'bookingIntervalMinutes', 'partyMin', 'partyMax', 'diningMinutes', 'leadTimeMinutes',
		'cutoffMinutes', 'graceMinutes', 'noShowTargetPercent', 'overCapacityAlertPercent', 'cancellationPolicy',
		'noticeEnabled', 'noticeDate', 'noticeText',
		'feedbackTitle', 'feedbackSubtitle', 'feedbackMessageTemplate'] as const
	return Object.fromEntries(keys.map((k) => [k, d[k]]))
}

function saveSettings() {
	if (!draft.value) return
	return run(() => updateVenue(venueId, settingsBody()))
}

// Opening hours & closed dates: one save (the prototype's "Save hours & rules").
async function saveHours() {
	if (!draft.value) return
	return run(async () => {
		await updateVenue(venueId, settingsBody())
		await saveOpeningHours(venueId, opening.value)
		await saveClosedDates(venueId, closed.value.map((c) => ({ date: c.date, reason: c.reason ?? null })))
	})
}

const saveUsersApi = () => run(async () => {
	await saveUsers(users.value.map((u) => ({ userId: u.id, venueId: u.venueId, role: u.role, name: u.name, login: u.login, active: u.active, password: resetPasswords.value[u.id] || undefined })))
	resetPasswords.value = {}
})
const newUser = ref({ name: '', login: '', password: '', role: 'host' })
const addUser = () => run(async () => {
	await createUser({ venueId, ...newUser.value })
	newUser.value = { name: '', login: '', password: '', role: 'host' }
})
const resetPasswords = ref<Record<string, string>>({})
const newVenue = ref({ name: '', slug: '' })
const addVenue = async () => {
	try {
		auth.setSelectedVenueId((await createVenue(newVenue.value)).id)
		location.reload() // header venue list loads once; reload picks up the new venue
	} catch (e) {
		const msg = (e as { data?: { message?: string } })?.data?.message
		saved.value = `Save failed${msg ? `: ${msg}` : '.'}`
	}
}

const removeAccount = (u: StaffUserRow) => {
	if (confirm(`Remove ${u.login} from this venue?`)) return run(() => removeUser(u.id, venueId))
}

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

definePageMeta({ middleware: ['auth', 'admin'] })
</script>

<template>
	<div class="mx-auto max-w-5xl px-4 py-8">
		<header class="mb-6 flex items-baseline justify-between gap-3">
			<div>
				<h1 class="font-display text-3xl font-semibold text-ink">Settings</h1>
			</div>
			<p v-if="saved" class="text-sm text-ink">{{ saved }}</p>
		</header>

		<div v-if="loading" class="card text-center py-16">
			<p class="text-muted">Loading settings…</p>
		</div>

		<div v-else-if="!auth.isSuperAdmin && !draft" class="card py-16 text-center">
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
					<div class="sm:col-span-2 space-y-3">
						<label class="flex items-center gap-2 text-sm">
							<input v-model="draft!.noticeEnabled" type="checkbox" class="h-5 w-5 accent-[rgb(var(--accent))]" />
							<span>Enable special notice</span>
						</label>
						<div v-if="draft!.noticeEnabled" class="grid gap-4 sm:grid-cols-2">
							<div>
								<label class="label">Notice date</label>
								<DatePicker :model-value="draft!.noticeDate ?? ''" @update:model-value="draft!.noticeDate = $event" />
							</div>
							<div>
								<label class="label">Notice text</label>
								<input v-model="draft!.noticeText" class="field" />
							</div>
						</div>
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
						<TimePicker :model-value="hhmm(opening.find((o) => o.weekday === DAYS_OF_WEEK.indexOf(day))?.openMinute)" :aria-label="`${dayLabel[day]} opens`" @update:model-value="updateDay(day, 'open', $event)" />
						<TimePicker :model-value="hhmm(opening.find((o) => o.weekday === DAYS_OF_WEEK.indexOf(day))?.closeMinute)" :aria-label="`${dayLabel[day]} closes`" @update:model-value="updateDay(day, 'close', $event)" />
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
						<label class="label">Table hold grace (minutes)</label>
						<input v-model.number="draft!.graceMinutes" type="number" min="0" max="120" class="field" />
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
						<DatePicker v-model="newClosedDate" class="!w-auto !py-1 !px-2.5 text-sm" aria-label="Closed date" />
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

			<section v-if="auth.isSuperAdmin" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">New venue</h2>
				<form class="mt-4 grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto]" @submit.prevent="addVenue">
					<div><label class="label">Venue name</label><input v-model="newVenue.name" class="field" required /></div>
					<div><label class="label">Slug (URL)</label><input v-model="newVenue.slug" class="field" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="bali" /></div>
					<button class="btn-primary" type="submit">Create venue</button>
				</form>
			</section>
			<section v-if="auth.isSuperAdmin && venueId" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Floor plan drawing</h2>
				<div class="mt-4 grid items-start gap-4 sm:grid-cols-[minmax(0,28rem)_1fr]">
					<FloorPlanSvg v-if="floorPlan" :plan="floorPlan" label="Floor plan preview" />
					<div class="flex flex-col items-start gap-2">
						<label class="label" for="floorPlanFile">Upload drawing (SVG, PNG, JPEG or WebP, max 3 MB)</label>
						<input id="floorPlanFile" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" @change="saveImageFile($event.target as HTMLInputElement)" />
						<p v-if="imageError" class="text-xs text-danger">{{ imageError }}</p>
						<button v-if="floorPlan?.image" class="btn-ghost" type="button" @click="removeImage">Remove drawing</button>
					</div>
				</div>
				<p class="mt-2 text-xs text-muted">Venue admins place tables on this drawing in Floor plan.</p>
			</section>

			<section v-if="auth.isSuperAdmin && venueId" class="card mb-6">
				<h2 class="font-display text-xl font-semibold text-ink">Accounts</h2>
				<p v-if="!users.length" class="mt-2 text-sm text-muted">No admin or host accounts for this venue yet.</p>
				<div class="mt-4 space-y-3">
					<div v-for="(u, idx) in users" :key="u.id" class="grid items-end gap-3 sm:grid-cols-[2fr_1.5fr_1fr_1.5fr_auto_auto]">
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
						<div>
							<label class="label">New password</label>
							<input v-model="resetPasswords[u.id]" type="password" minlength="12" class="field" placeholder="leave blank to keep" autocomplete="new-password" />
						</div>
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" :checked="u.active" @change="updateUser(idx, { active: ($event.target as HTMLInputElement).checked })" />
							Active
						</label>
						<button class="btn-ghost" type="button" @click="removeAccount(u)">Remove</button>
					</div>
				</div>
				<div v-if="users.length" class="mt-4 flex justify-end">
					<button class="btn-primary" type="button" @click="saveUsersApi">Save accounts</button>
				</div>
				<form class="mt-6 grid items-end gap-3 border-t border-line pt-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" @submit.prevent="addUser">
					<div><label class="label">Name</label><input v-model="newUser.name" class="field" required /></div>
					<div><label class="label">Login</label><input v-model="newUser.login" class="field" required autocomplete="off" /></div>
					<div><label class="label">Password (12+)</label><input v-model="newUser.password" type="password" minlength="12" class="field" required autocomplete="new-password" /></div>
					<div>
						<label class="label">Role</label>
						<select v-model="newUser.role" class="field"><option value="admin">Admin</option><option value="host">Host</option></select>
					</div>
					<button class="btn-primary" type="submit">Add account</button>
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

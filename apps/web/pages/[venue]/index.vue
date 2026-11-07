<script setup lang="ts">
const route = useRoute()
const venue = (route.params.venue as string) || 'bali'

interface VenueHours {
	open: string
	close: string
}

interface VenueData {
	id: string
	slug: string
	name: string
	tagline: string
	intro: string
	address: string
	phone: string
	whatsapp: string
	email: string
	mapsUrl: string
	timeZone: string
	openingHours: Record<string, VenueHours>
	closedDates: string[]
	bookingIntervalMinutes: number
	partySizeLimits: { min: number; max: number }
	leadTimeMinutes: number
	cutoffMinutes: number
	seatingAreas: Array<{
		id: string
		name: string
		capacity: number
		bookable: boolean
		minParty?: number
		maxParty?: number
	}>
	cancellationPolicy: string
	feedbackTitle?: string
	feedbackSubtitle?: string
	feedbackTags?: string[]
}

const { data: venueData } = await useFetch<VenueData>(`/api/public/venues/${venue}`, {
	server: true,
})

useSeoMeta({
	title: venueData.value ? `${venueData.value.name} — Direct Reservations` : 'GIOI — Direct Reservations',
	description: venueData.value ? venueData.value.tagline : 'Book a table at GIOI.',
	ogTitle: venueData.value ? venueData.value.name : 'GIOI',
	ogDescription: venueData.value ? venueData.value.intro : 'Coastal dining in Bali.',
	ogType: 'website',
	twitterCard: 'summary_large_image',
})

const jsonLd = venueData.value
	? {
			'@context': 'https://schema.org',
			'@type': 'Restaurant',
			name: venueData.value.name,
			description: venueData.value.intro,
			address: {
				'@type': 'PostalAddress',
				streetAddress: venueData.value.address,
			},
			phone: venueData.value.phone,
			url: `https://book.gioigroup.com/${venue}`,
			acceptsReservations: `https://book.gioigroup.com/${venue}/book`,
			cuisine: ['Indonesian', 'Asian', 'Balinese', 'Western'],
			openingHoursSpecification: Object.entries(
				venueData.value.openingHours,
			).map(([day, hours]) => ({
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: [
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday',
					'Sunday',
				][Number(day)],
				opens: hours.open,
				closes: hours.close,
			})),
		}
	: {}
</script>

<template>
	<div class="landing">
		<header class="hero">
			<h1 v-if="venueData">{{ venueData.name }}</h1>
			<p v-if="venueData">{{ venueData.tagline }}</p>
			<NuxtLink v-if="venueData" :to="`/${venue}/book`" class="cta">
				Book a table
			</NuxtLink>
		</header>

		<section v-if="venueData" class="hours">
			<h2>Opening hours</h2>
			<ul>
				<li v-for="(hours, day) in venueData.openingHours" :key="day">
					{{ day }}: {{ hours.open }} – {{ hours.close }}
				</li>
			</ul>
		</section>

		<script type="application/ld+json">{{ jsonLd }}</script>
	</div>
</template>

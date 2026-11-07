<script setup lang="ts">
const route = useRoute()
const venue = route.params.venue as string
</script>

<template>
	<div class="book">
		<h1>Book a table at {{ venue }}</h1>
		<p>Booking flow comes here.</p>
	</div>
</template>

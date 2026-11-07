<script setup lang="ts">
const route = useRoute()
const code = route.params.code as string
</script>

<template>
	<div class="confirmation">
		<h1>Confirmation</h1>
		<p v-if="code">Booking code: {{ code }}</p>
		<p>Confirmation details come here.</p>
	</div>
</template>

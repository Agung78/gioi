<script setup lang="ts">
const route = useRoute()
const code = route.params.code as string
</script>

<template>
	<div class="feedback">
		<h1>Feedback</h1>
		<p v-if="code">Feedback for booking {{ code }}</p>
		<p>Feedback form comes here.</p>
	</div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
</script>

<template>
	<div class="guest-profile">
		<h1>Guest Profile</h1>
		<p v-if="id">Guest: {{ id }}</p>
	</div>
</template>

<script setup lang="ts">
defineEmits<{
	reset: [];
	bot: [active: boolean];
}>();
</script>

<template>
	<div class="controls">
		<button @click="$emit('reset')">Reset</button>
		<input type="checkbox" @click="$emit('bot', (<HTMLInputElement>$event.target).checked)" />
	</div>
</template>

<style scoped>
button {
	font-size: 25px;
}
.controls {
	padding: 10px;
}
</style>

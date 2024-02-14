<script setup lang="ts">
defineEmits<{
	reset: [];
	historyBack: [];
	historyForward: [];
	bot: [active: boolean];
	highlight: [active: boolean];
}>();
</script>

<template>
	<div class="controls">
		<button @click="$emit('reset')">Reset</button>
		<button @click="$emit('historyBack')">Back</button>
		<button @click="$emit('historyForward')">Forward</button>
		<input type="checkbox" @click="$emit('bot', (<HTMLInputElement>$event.target).checked)" />
		<input type="checkbox" @click="$emit('highlight', (<HTMLInputElement>$event.target).checked)" />
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

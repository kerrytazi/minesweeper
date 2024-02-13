<script setup lang="ts">
defineEmits<{
	reset: [];
}>();
</script>

<template>
	<div class="controls">
		<button @click="$emit('reset')">Reset</button>
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

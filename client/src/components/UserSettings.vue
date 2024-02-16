<script setup lang="ts">
import { ref } from 'vue';

const darkTheme = ref(JSON.parse(localStorage.getItem('darkTheme') ?? 'false'));

const emit = defineEmits<{
	onDarkTheme: [active: boolean];
}>();

const onClientDarkTheme = (e: Event) => {
	let active = (<HTMLInputElement>e.target).checked;
	localStorage.setItem('darkTheme', JSON.stringify(active));
	emit('onDarkTheme', active);
};

</script>

<template>
	<div class="user-settings">
		<label for="checkbox-dark-theme">Dark theme</label>
		<input id="checkbox-dark-theme" type="checkbox" @change="onClientDarkTheme" :checked="darkTheme" />
	</div>
</template>

<style scoped>
label {
	font-size: 25px;
	margin: 5px;
	margin-left: 10px;
}
input[type="checkbox"] {
	width: 20px;
	height: 20px;
}
.controls {
	padding: 10px;
}
</style>

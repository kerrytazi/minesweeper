<script setup lang="ts">
import { ref } from 'vue';
import Controls from './components/Controls.vue';
import GameField from './components/GameField.vue';
import FieldSettings from './components/FieldSettings.vue';

const gameField = ref<typeof GameField | null>(null);
</script>

<template>
	<div class="app-wrapper theme-light">
		<Controls
			@reset="gameField?.onReset"
			@bot="gameField?.onBot"/>
		<GameField ref="gameField" />
		<FieldSettings
			@onSettingsChanged="gameField?.onSettingsChanged"/>
	</div>
</template>

<style>
input {
	padding: 0;
	margin: 0;
	border: 0;
	outline: none;
}
body {
	margin: 0;
	padding: 0;
	border: 0;
	font-size: 0;
	white-space: nowrap;
}
.app-wrapper {
	width: 100vw;
	height: 100vh;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
}
.theme-light {
	--cell-color-default: rgb(160, 160, 160);
	--cell-color-hover: rgb(140, 140, 140);
	--cell-color-open: rgb(220, 220, 220);
}
</style>

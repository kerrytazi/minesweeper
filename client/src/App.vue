<script setup lang="ts">
import { ref } from 'vue';
import Controls from '@/components/Controls.vue';
import GameField from '@/components/GameField.vue';
import FieldSettings from '@/components/FieldSettings.vue';
import JoinLink from '@/components/JoinLink.vue';
import UserSettings from "./components/UserSettings.vue";

const themeId = ref(JSON.parse(localStorage.getItem('darkTheme') ?? 'false') ? 1 : 0);

interface Theme {
	'app-color': string;
	'font-color': string;
	'cell-color-default': string;
	'cell-color-hover': string;
	'cell-color-open': string;
}

const themes: Theme[] = [
	{ // light
		'app-color': 'rgb(240 240 240)',
		'font-color': 'rgb(70 70 70)',
		'cell-color-default': 'rgb(160 160 160)',
		'cell-color-hover': 'rgb(140 140 140)',
		'cell-color-open': 'rgb(220 220 220)',
	},
	{ // dark
		'app-color': 'rgb(70 70 70)',
		'font-color': 'rgb(240 240 240)',
		'cell-color-default': 'rgb(110 110 110)',
		'cell-color-hover': 'rgb(160, 160 160)',
		'cell-color-open': 'rgb(180 180 180)',
	}
];

const controls = ref<typeof Controls | null>(null);
const gameField = ref<typeof GameField | null>(null);
</script>

<template>
	<div class="app-wrapper">
		<UserSettings
			@onDarkTheme="(active: boolean) => { themeId = active ? 1 : 0; }"/>
		<Controls
			ref="controls"
			@reset="gameField?.onReset"
			@historyBack="gameField?.onHistoryBack"
			@historyForward="gameField?.onHistoryForward"
			@bot="gameField?.onBot"
			@highlight="gameField?.onHighlight"/>
		<GameField
			ref="gameField"
			@minesUpdate="controls?.onMinesUpdated"
			@gameStart="controls?.onGameStarted"
			@gameEnd="controls?.onGameEnded" />
		<FieldSettings
			@onSettingsChanged="gameField?.onSettingsChanged"/>
		<JoinLink />
	</div>
</template>

<style>
@font-face {
	font-family: "Chakra Petch";
	src: url("assets/ChakraPetch-Bold.ttf");
	font-weight: bold;
}
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
	font-family: "Chakra Petch";
	white-space: nowrap;
}
.app-wrapper {
	--app-color: v-bind(themes[themeId]['app-color']);
	--font-color: v-bind(themes[themeId]['font-color']);
	--cell-color-default: v-bind(themes[themeId]['cell-color-default']);
	--cell-color-hover: v-bind(themes[themeId]['cell-color-hover']);
	--cell-color-open: v-bind(themes[themeId]['cell-color-open']);

	width: 100vw;
	height: 100vh;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	background-color: var(--app-color);
	color: var(--font-color);
}
button {
	background-color: var(--app-color);
	border-color: var(--font-color);
	color: var(--font-color);

	margin: calc(50px / 16);
	height: 42.95px;
	padding: 6.25px;
}
input {
	background-color: var(--app-color);
	color: var(--font-color);
}
fieldset {
	border-color: var(--font-color) !important;
}
.placeholder {
	color: var(--font-color) !important;
}
* {
	vertical-align: top;
}
</style>

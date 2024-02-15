<script setup lang="ts">
import { ref } from 'vue';
import Controls from './components/Controls.vue';
import GameField from './components/GameField.vue';
import FieldSettings from './components/FieldSettings.vue';
import { socket } from './socket';

const dec2hex = (dec: number) => {
	return dec.toString(16).padStart(2, "0");
};

const generateId = (len: number) => {
	var arr = new Uint8Array(len / 2);
	window.crypto.getRandomValues(arr);
	return Array.from(arr, dec2hex).join('');
};

const createNewRoom = () => {
	let roomId = generateId(16);
	console.log(roomId);
	socket.emit('createRoom', roomId);
};

socket.on('connect', () => {
	let url = new URL(window.location.toString());

	if (url.pathname === '/join' && url.searchParams.has('id')) {
		socket.emit('joinRoom', url.searchParams.get('id')!);
	} else {
		createNewRoom();
	}
});

socket.on('joinError', () => {
	console.log("Error: Can't join room. Creating a new one.");
	window.location.href = window.location.origin;
	createNewRoom();
});

const gameField = ref<typeof GameField | null>(null);
</script>

<template>
	<div class="app-wrapper theme-light">
		<Controls
			@reset="gameField?.onReset"
			@historyBack="gameField?.onHistoryBack"
			@historyForward="gameField?.onHistoryForward"
			@bot="gameField?.onBot"
			@highlight="gameField?.onHighlight"/>
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

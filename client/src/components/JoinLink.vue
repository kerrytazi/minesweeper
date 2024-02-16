<script setup lang="ts">
import { ref } from 'vue';
import PInput from './PInput.vue';
import { socket, isHost } from '@/socket';

const roomId = ref<string | null>(null);

const dec2hex = (dec: number) => {
	return dec.toString(16).padStart(2, '0');
};

const generateId = (len: number) => {
	var arr = new Uint8Array(len / 2);
	window.crypto.getRandomValues(arr);
	return Array.from(arr, dec2hex).join('');
};

const onCopy = () => {
	navigator.clipboard.writeText(roomId.value ?? '');
};

const createNewRoom = () => {
	let newRoomId = generateId(16);
	let url = new URL(window.location.origin);
	url.pathname = '/join';
	url.searchParams.set('id', newRoomId);
	roomId.value = url.toString();
	socket.emit('createRoom', newRoomId);
};

socket.on('connect', () => {
	let url = new URL(window.location.toString());

	if (url.pathname === '/join' && url.searchParams.has('id')) {
		isHost.value = false;
		socket.emit('joinRoom', url.searchParams.get('id')!);
	} else {
		isHost.value = true;
		createNewRoom();
	}
});

socket.on('joinError', () => {
	console.log("Error: Can't join room. Creating a new room.");
	window.location.href = window.location.origin;
	isHost.value = true;
	createNewRoom();
});
</script>

<template>
	<div>
		<PInput
			class="pinput"
			:value="roomId ?? ''"
			:placeholder="'Room link'"
			:width="'800px'"
			:readonly="true" />
		<button @click="onCopy">Copy</button>
	</div>
</template>

<style scoped>
.pinput {
	display: inline-block;
}
button {
	font-size: 25px;
	display: inline-block;
}
</style>

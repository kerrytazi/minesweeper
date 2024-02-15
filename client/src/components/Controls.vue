<script setup lang="ts">
import { ref } from 'vue';
import { socket } from '@/socket';

const bot = ref(false);
const highlight = ref(false);

const emit = defineEmits<{
	reset: [];
	historyBack: [];
	historyForward: [];
	bot: [active: boolean];
	highlight: [active: boolean];
}>();

const onClientReset = () => {
	emit('reset');
	socket.emit('reset');
};

const onServerReset = () => {
	emit('reset');
};

const onClientHistoryBack = () => {
	emit('historyBack');
	socket.emit('historyBack');
};

const onServerHistoryBack = () => {
	emit('historyBack');
};

const onClientHistoryForward = () => {
	emit('historyForward');
	socket.emit('historyForward');
};

const onServerHistoryForward = () => {
	emit('historyForward');
};

const onClientBot = (e: Event) => {
	let active = (<HTMLInputElement>e.target).checked;
	emit('bot', active);
	socket.emit('bot', active);
};

const onServerBot = (active: boolean) => {
	bot.value = active;
	emit('bot', active);
};

const onClientHighlight = (e: Event) => {
	let active = (<HTMLInputElement>e.target).checked;
	emit('highlight', active);
	socket.emit('highlight', active);
};

const onServerHighlight = (active: boolean) => {
	highlight.value = active;
	emit('highlight', active);
};

socket.on('reset', onServerReset);
socket.on('historyBack', onServerHistoryBack);
socket.on('historyForward', onServerHistoryForward);
socket.on('bot', onServerBot);
socket.on('highlight', onServerHighlight);
</script>

<template>
	<div class="controls">
		<button @click="onClientReset">Reset</button>
		<button @click="onClientHistoryBack">Back</button>
		<button @click="onClientHistoryForward">Forward</button>
		<input type="checkbox" @click="onClientBot" v-model="bot" />
		<input type="checkbox" @click="onClientHighlight" v-model="highlight" />
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

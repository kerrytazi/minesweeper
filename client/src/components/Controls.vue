<script setup lang="ts">
import { onBeforeUpdate, onUpdated, ref } from 'vue';
import { socket } from '@/socket';
import PInput from './PInput.vue';

const autosolver = ref(false);
const highlight = ref(false);

const emit = defineEmits<{
	reset: [];
	historyBack: [];
	historyForward: [];
	autosolver: [active: boolean];
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

const onClientAutoSolver = (e: Event) => {
	let active = (<HTMLInputElement>e.target).checked;
	emit('autosolver', active);
	socket.emit('autosolver', active);
};

const onServerAutoSolver = (active: boolean) => {
	autosolver.value = active;
	emit('autosolver', active);
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
socket.on('autosolver', onServerAutoSolver);
socket.on('highlight', onServerHighlight);

const nGameFieldMines = ref(0);
const gameFieldStartTime = ref<number | null>(null);
const gameFieldEndTime = ref<number | null>(null);
const gameFieldDeltaTime = ref<number | null>(null);

const updateTimer = () => {
	if (gameFieldStartTime.value) {
		if (gameFieldEndTime.value) {
			gameFieldDeltaTime.value = gameFieldEndTime.value - gameFieldStartTime.value;
		} else {
			gameFieldDeltaTime.value = performance.now() - gameFieldStartTime.value;
			requestAnimationFrame(() => updateTimer());
		}
	} else {
		gameFieldDeltaTime.value = null;
	}
};

const onMinesUpdated = (nMines: number) => {
	nGameFieldMines.value = nMines;
};

const onGameStarted = (gameStartTime: number | null) => {
	gameFieldStartTime.value = gameStartTime;
	gameFieldEndTime.value = null;
	updateTimer();
};

const onGameEnded = (gameEndTime: number | null) => {
	gameFieldEndTime.value = gameEndTime;
	updateTimer();
};

defineExpose({
	onMinesUpdated,
	onGameStarted,
	onGameEnded,
});
</script>

<template>
	<div class="controls">
		<PInput class="pinput" :width="'150px'" :value="nGameFieldMines.toString()" :placeholder="'Mines'" :readonly="true"/>
		<PInput class="pinput" :width="'150px'" :value="gameFieldDeltaTime ? (gameFieldDeltaTime / 1000.0).toFixed(1) : '0.0'" :placeholder="'Time'" :readonly="true"/>
		<button @click="onClientReset">Reset</button>
		<button @click="onClientHistoryBack">Back</button>
		<button @click="onClientHistoryForward">Forward</button>
		<label for="checkboxauto-solver">AutoSolver</label>
		<input id="checkboxauto-solver" type="checkbox" @click="onClientAutoSolver" v-model="autosolver" />
		<label for="checkbox-highlight">Help highlight</label>
		<input id="checkbox-highlight" type="checkbox" @click="onClientHighlight" v-model="highlight" />
	</div>
</template>

<style scoped>
.pinput {
	display: inline-block;
}
label {
	font-size: 25px;
	margin: 5px;
	margin-left: 10px;
}
input[type="checkbox"] {
	width: 20px;
	height: 20px;
}
button {
	font-size: 25px;
}
.controls {
	padding: 10px;
}
</style>

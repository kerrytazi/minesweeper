<script setup lang="ts">
import { ref } from 'vue';
import { socket } from '@/socket';
import PInput from './PInput.vue';
import type { ControlsData } from '@common/socket-types';

const autosolver = ref(false);
const highlight = ref(false);
const editor = ref(false);

const emit = defineEmits<{
	reset: [];
	historyBack: [];
	historyForward: [];
	autosolver: [active: boolean];
	highlight: [active: boolean];
	editor: [active: boolean];
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

const onClientEditor = (e: Event) => {
	let active = (<HTMLInputElement>e.target).checked;
	emit('editor', active);
	socket.emit('editor', active);
};

const onServerEditor = (active: boolean) => {
	editor.value = active;
	emit('editor', active);
};

socket.on('reset', onServerReset);
socket.on('historyBack', onServerHistoryBack);
socket.on('historyForward', onServerHistoryForward);
socket.on('autosolver', onServerAutoSolver);
socket.on('highlight', onServerHighlight);
socket.on('editor', onServerEditor);

const nGameFieldMines = ref(0);
const gameFieldStartTime = ref<number | null>(null);
const gameFieldEndTime = ref<number | null>(null);
const gameFieldDeltaTime = ref<number | null>(null);

const updateTimer = (now: number) => {
	if (gameFieldStartTime.value) {
		if (gameFieldEndTime.value) {
			gameFieldDeltaTime.value = gameFieldEndTime.value - gameFieldStartTime.value;
		} else {
			gameFieldDeltaTime.value = now - gameFieldStartTime.value;
			requestAnimationFrame(updateTimer);
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
	updateTimer(performance.now());
};

const onGameEnded = (gameEndTime: number | null) => {
	gameFieldEndTime.value = gameEndTime;
	updateTimer(performance.now());
};

const onSync = (controls: ControlsData) => {
	autosolver.value = controls.autosolver;
	highlight.value = controls.highlight;
	editor.value = controls.editor;
};

defineExpose({
	onMinesUpdated,
	onGameStarted,
	onGameEnded,
	onSync,
});
</script>

<template>
	<div class="controls">
		<PInput class="pinput" :width="'150px'" :value="nGameFieldMines.toString()" :placeholder="'Mines'" :readonly="true"/>
		<PInput class="pinput" :width="'150px'" :value="gameFieldDeltaTime ? (gameFieldDeltaTime / 1000.0).toFixed(1) : '0.0'" :placeholder="'Time'" :readonly="true"/>
		<button @click="onClientReset">Reset</button>
		<button @click="onClientHistoryBack">Back</button>
		<button @click="onClientHistoryForward">Forward</button>
		<label for="checkboxauto-solver" title="Bot that automatically open/flag cells.&#010;Uses logic of 'Help highlight'.">AutoSolver</label>
		<input id="checkboxauto-solver" type="checkbox" @click="onClientAutoSolver" v-model="autosolver" />
		<label for="checkbox-highlight" title="Blue cells - should be flagged. Obvious mine.&#010;Green cells - should be opened. Obvious clear cells.">Help highlight</label>
		<input id="checkbox-highlight" type="checkbox" @click="onClientHighlight" v-model="highlight" />
		<label for="checkbox-editor" title="LMB - open/close cell.&#010;Shift+LMB - set/unset mine in cell.&#010;RMB - flag/unflag cell.&#010;digit/numpad - set 'flags around'. '0' to clear.">Editor mode</label>
		<input id="checkbox-editor" type="checkbox" @click="onClientEditor" v-model="editor" />
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

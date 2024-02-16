<script setup lang="ts">
import { ref } from 'vue';
import PInput from '@/components/PInput.vue';
import { socket } from '@/socket';

export interface GameFieldSettings {
	nRows: number;
	nCols: number;
	nMines: number;
	randomSeed: number;
}

const emit = defineEmits<{
	onSettingsChanged: [settings: GameFieldSettings];
}>();

const nRowsText = ref('16');
const nColsText = ref('30');
const nMinesText = ref('99');

const onClientSettingsChanged = () => {
	let randomSeed = performance.now() | 0;

	const nRows = parseInt(nRowsText.value);
	const nCols = parseInt(nColsText.value);
	const nMines = parseInt(nMinesText.value);

	if (!isNaN(nRows) && !isNaN(nCols) && !isNaN(nMines)) {
		let newSettings = { nRows, nCols, nMines, randomSeed };
		emit('onSettingsChanged', newSettings);
		socket.emit('settingsChanged', newSettings);
	}
};

setTimeout(() => { onClientSettingsChanged(); }, 0);

const onServerSettingsChanged = (settings: GameFieldSettings) => {
	nRowsText.value = settings.nRows.toString();
	nColsText.value = settings.nCols.toString();
	nMinesText.value = settings.nMines.toString();
	emit('onSettingsChanged', settings);
};

socket.on('settingsChanged', onServerSettingsChanged);
</script>

<template>
	<div class="field-settings">
		<PInput class="pinput" :value="nRowsText" @input="nRowsText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Rows'" />
		<PInput class="pinput" :value="nColsText" @input="nColsText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Columns'" />
		<PInput class="pinput" :value="nMinesText" @input="nMinesText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Mines'" />
		<button @click="onClientSettingsChanged">Apply</button>
	</div>
</template>

<style scoped>
button {
	font-size: 25px;
}
.field-settings {
	padding: 10px;
}
.pinput {
	display: inline-block;
}
</style>

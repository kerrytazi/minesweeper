<script setup lang="ts">
import { ref, watch } from 'vue';
import PInput from './PInput.vue';

export interface GameFieldSettings {
	nRows: number;
	nCols: number;
	nMines: number;
}

const emits = defineEmits<{
	onSettingsChanged: [settings: GameFieldSettings];
}>();

const nRowsText = ref('16');
const nColsText = ref('30');
const nMinesText = ref('99');

const tryUpdateSettings = () => {
	const nRows = parseInt(nRowsText.value);
	const nCols = parseInt(nColsText.value);
	const nMines = parseInt(nMinesText.value);

	if (!isNaN(nRows) && !isNaN(nCols) && !isNaN(nMines)) {
		emits('onSettingsChanged', { nRows, nCols, nMines });
	}
};
</script>

<template>
	<div class="field-settings">
		<PInput class="pinput" :value="nRowsText" @input="nRowsText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Rows'" />
		<PInput class="pinput" :value="nColsText" @input="nColsText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Columns'" />
		<PInput class="pinput" :value="nMinesText" @input="nMinesText = (<HTMLInputElement>$event.target!).value" :input-mask="/^\d*$/" :placeholder="'Mines'" />
		<button @click="tryUpdateSettings">Apply</button>
	</div>
</template>

<style scoped>
button {
	font-size: 25px;
	vertical-align: top;
}
.field-settings {
	padding: 10px;
}
.pinput {
	display: inline-block;
}
</style>

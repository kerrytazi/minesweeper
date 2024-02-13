<script setup lang="ts">
import { ref } from 'vue';
import Cell from './Cell.vue';
import type { GameFieldSettings } from './FieldSettings.vue';

interface CellData {
	nMinesAround: number;
	isMine: boolean;
	isFlag: boolean;
	isOpen: boolean;
	rowIndex: number;
	colIndex: number;
}

const createDefaultCellData = (row: number, col: number): CellData => ({ nMinesAround: 0, isMine: false, isFlag: false, isOpen: false, rowIndex: row, colIndex: col });
const createTableCols = (row: number, nCols: number) => Array.from({length: nCols}, (_, col) => createDefaultCellData(row, col));
const createTableRows = (nRows: number, nCols: number) => Array.from({length: nRows}, (_, row) => createTableCols(row, nCols));

let nRows = ref(5);
let nCols = ref(5);
let nMines = ref(5);

let generated = ref(false);
let gameLose = ref(false);
let gameWin = ref(false);
let nFlags = ref(0);
let nOpened = ref(0);
let table = ref(createTableRows(nRows.value, nCols.value));

const resetField = () => {
	generated.value = false;
	gameLose.value = false;
	gameWin.value = false;
	nFlags.value = 0;
	nOpened.value = 0;
	table.value = createTableRows(nRows.value, nCols.value);
};

resetField();

const posValid = (row: number, col: number) => {
	return row >= 0 && col >= 0 && row < nRows.value && col < nCols.value;
};

const forEachAround = (cell: CellData, callback: (cell: CellData) => void) => {
	let idxs = [
		[ cell.rowIndex - 1, cell.colIndex - 1 ],
		[ cell.rowIndex - 1, cell.colIndex     ],
		[ cell.rowIndex - 1, cell.colIndex + 1 ],
		[ cell.rowIndex    , cell.colIndex - 1 ],
		// [ cell.rowIndex    , cell.colIndex     ],
		[ cell.rowIndex    , cell.colIndex + 1 ],
		[ cell.rowIndex + 1, cell.colIndex - 1 ],
		[ cell.rowIndex + 1, cell.colIndex     ],
		[ cell.rowIndex + 1, cell.colIndex + 1 ],
	];

	for (let idx of idxs) {
		if (posValid(idx[0], idx[1])) {
			callback(table.value[idx[0]][idx[1]]);
		}
	}
};

const createMine = (cell: CellData) => {
	cell.isMine = true;
	forEachAround(cell, (c) => { ++c.nMinesAround; });
}

const generateField = (skipCell: CellData) => {
	let poses = Array.from({length: nRows.value}, (_, row) => Array.from({length: nCols.value}, (_, col) => [row, col])).flat();
	let skipIndex = skipCell.rowIndex * nCols.value + skipCell.colIndex;
	poses.splice(skipIndex, 1);

	for (let i = 0; i < nMines.value; ++i) {
		let toRemove = (Math.random() * poses.length) | 0;
		let pos = poses.splice(toRemove, 1)[0];

		createMine(table.value[pos[0]][pos[1]]);
	}
};

const onGameLose = () => {
	gameLose.value = true;
};

const onGameWin = () => {
	gameWin.value = true;
};

const _openCell = (cell: CellData) => {
	if (cell.isOpen || cell.isFlag) {
		return;
	}

	cell.isOpen = true;
	++nOpened.value;

	if (cell.nMinesAround === 0) {
		forEachAround(cell, openCell);
	}
};

const openCell = (cell: CellData) => {
	const toOpen = [cell];
	let openIndex = 0;

	while (openIndex < toOpen.length) {
		let cell = toOpen[openIndex++];

		if (cell.isOpen || cell.isFlag) {
			continue;
		}

		cell.isOpen = true;
		++nOpened.value;

		if (cell.nMinesAround === 0) {
			forEachAround(cell, (c) => toOpen.push(c));
		}
	}
};

const onContextmenu = (cell: CellData) => {
	if (gameLose.value || gameWin.value) {
		return;
	}

	if (generated.value) {
		if (cell.isOpen) {
			return;
		}

		if (cell.isFlag) {
			cell.isFlag = false;
			--nFlags.value;
		} else {
			cell.isFlag = true;
			++nFlags.value;
		}
	}
};

const countFlagsAround = (cell: CellData) => {
	let flagsAround = 0;

	forEachAround(cell, (c) => {
		if (c.isFlag) {
			++flagsAround;
		}
	});

	return flagsAround;
};

const checkWin = () => {
	if (nRows.value * nCols.value - nOpened.value === nMines.value) {
		onGameWin();
	}
};

const onClick = (cell: CellData) => {
	if (gameLose.value || gameWin.value) {
		return;
	}

	if (generated.value) {
		if (cell.isFlag) {
			return;
		}

		if (cell.isMine) {
			cell.isOpen = true;
			onGameLose();
			return;
		}

		if (cell.isOpen)
		{
			if (cell.nMinesAround > 0) {
				let flagsAround = countFlagsAround(cell);

				if (cell.nMinesAround <= flagsAround) {
					forEachAround(cell, (c) => {
						if (!c.isFlag && !c.isOpen) {
							openCell(c);
						}
					});
				}
			}

			return;
		}

		openCell(cell);
		checkWin();
	} else {
		generateField(cell);
		generated.value = true;
		openCell(cell);
		checkWin();
	}
};

const onReset = () => {
	resetField();
};

const onSettingsChanged = (settings: GameFieldSettings) => {
	nCols.value = settings.nCols;
	nRows.value = settings.nRows;
	nMines.value = settings.nMines;

	resetField();
};

defineExpose({
	onReset,
	onSettingsChanged,
});
</script>

<template>
	<div class="game-field" :class="{ 'game-lose': gameLose, 'game-win': gameWin }">
		<div class="row" v-for="row in table">
			<Cell
				class="col"
				v-for="cell in row"
				:nMinesAround="cell.nMinesAround"
				:isMine="gameLose && cell.isMine && !cell.isFlag"
				:isFlag="cell.isFlag"
				:isWrongFlag="gameLose && cell.isFlag && !cell.isMine"
				:isOpen="cell.isOpen"
				@click="onClick(cell)"
				@contextmenu.prevent="onContextmenu(cell)" />
		</div>
	</div>
</template>

<style scoped>
.game-field {
	-webkit-user-select: none;
	-ms-user-select: none;
	user-select: none;
}
.col {
	width: 50px;
	height: 50px;
	margin: 2px;
	display: inline-block;
}
</style>

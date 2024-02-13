<script setup lang="ts">
import { ref } from 'vue';
import Cell from './Cell.vue';
import type { GameFieldSettings } from './FieldSettings.vue';

interface CellData {
	nMinesAround: number;
	nFlagsAround: number;
	isMine: boolean;
	isFlag: boolean;
	isOpen: boolean;
	rowIndex: number;
	colIndex: number;
}

const createDefaultCellData = (row: number, col: number): CellData => ({ nMinesAround: 0, nFlagsAround: 0, isMine: false, isFlag: false, isOpen: false, rowIndex: row, colIndex: col });
const createTableCols = (row: number, nCols: number) => Array.from({length: nCols}, (_, col) => createDefaultCellData(row, col));
const createTableRows = (nRows: number, nCols: number) => Array.from({length: nRows}, (_, row) => createTableCols(row, nCols));

let nRows = ref(10);
let nCols = ref(10);
let nMines = ref(20);

let useBot = ref(false);
let botInterval: number | null = null;
let botStepDelay = 500;

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

	if (useBot.value) {
		console.log(`[bot] reset field`);
	}
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
	forEachAround(cell, (c) => ++c.nMinesAround);
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

	if (useBot.value) {
		console.log(`[bot] game lost`);
	}
};

const onGameWin = () => {
	gameWin.value = true;

	if (useBot.value) {
		console.log(`[bot] game won`);
	}
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
			forEachAround(cell, (c) => --c.nFlagsAround);
		} else {
			cell.isFlag = true;
			++nFlags.value;
			forEachAround(cell, (c) => ++c.nFlagsAround);
		}
	}
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
				if (cell.nMinesAround <= cell.nFlagsAround) {
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

const botStep = () => {
	if (gameLose.value || gameWin.value) {
		// resetField();
		return;
	}

	if (!generated.value) {
		let row = (Math.random() * nRows.value) | 0;
		let col = (Math.random() * nCols.value) | 0;
		onClick(table.value[row][col]);
		return;
	}

	{
		for (let row of table.value) {
			for (let cell of row) {
				if (cell.isOpen && !cell.isFlag && cell.nMinesAround > 0) {
					let closed = 0;
					forEachAround(cell, (c) => {
						if (!c.isOpen && !c.isFlag) {
							++closed;
						}
					});
					if (closed > 0 && closed === cell.nMinesAround - cell.nFlagsAround) {
						forEachAround(cell, (c) => {
							if (!c.isOpen && !c.isFlag) {
								console.log(`[bot] obvious flag {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								onContextmenu(c);
							}
						});
						return;
					}
				}
			}
		}
	}

	{
		for (let row of table.value) {
			for (let cell of row) {
				if (cell.isOpen && !cell.isFlag && cell.nMinesAround > 0) {
					let closed = 0;
					forEachAround(cell, (c) => {
						if (!c.isOpen && !c.isFlag) {
							++closed;
						}
					});
					if (closed > 0 && cell.nMinesAround === cell.nFlagsAround) {
						forEachAround(cell, (c) => {
							if (!c.isOpen && !c.isFlag) {
								console.log(`[bot] open click {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								onClick(c);
							}
						});
						return;
					}
				}
			}
		}
	}

	{
		let found = false;

		for (let row of table.value) {
			for (let cell of row) {
				if (cell.isOpen && !cell.isFlag && cell.nMinesAround > 0) {
					let aroundCells: CellData[] = [];

					forEachAround(cell, (c) => {
						if (!c.isOpen && !c.isFlag) {
							aroundCells.push(c);
						}
					});

					for (let c of aroundCells) {
						forEachAround(c, (c2) => {
							if (found) {
								return;
							}

							if (c2 !== cell && c2.isOpen && c2.nMinesAround > 0) {
								let combine: CellData[] = [];
								let aroundCells2: CellData[] = [];

								forEachAround(c2, (c3) => {
									if (!c3.isOpen && !c3.isFlag) {
										aroundCells2.push(c3);
									}
									if (aroundCells.includes(c3)) {
										combine.push(c3);
									}
								});

								if (combine.length > c2.nMinesAround - c2.nFlagsAround) {
									if (aroundCells.length > combine.length) {
										if (aroundCells.length - combine.length + c2.nMinesAround - c2.nFlagsAround === cell.nMinesAround - cell.nFlagsAround) {
											found = true;

											for (let cc of aroundCells) {
												if (!combine.includes(cc)) {
													console.log(`[bot] flag {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													onContextmenu(cc);
												}
											}
										} else if (cell.nMinesAround - cell.nFlagsAround === 1 && c2.nMinesAround - c2.nFlagsAround === 1 && aroundCells2.length === combine.length && aroundCells.length - combine.length + c2.nMinesAround - c2.nFlagsAround > cell.nMinesAround - cell.nFlagsAround) { // kill me pls
											found = true;

											for (let cc of aroundCells) {
												if (!combine.includes(cc)) {
													console.log(`[bot] 1-1-X click {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													onClick(cc);
												}
											}
										}
									}
								}
							}
						});

						if (found) {
							return;
						}
					}
				}
			}
		}
	}

	// resetField();

	if (true)
	{
		let poses = [];

		for (let row of table.value) {
			for (let cell of row) {
				if (!cell.isOpen && !cell.isFlag) {
					poses.push([cell.rowIndex, cell.colIndex]);
				}
			}
		}

		let index = (Math.random() * poses.length) | 0;
		let pos = poses[index];

		console.log(`[bot] random click {${pos[0]} ${pos[1]}}`);
		onClick(table.value[pos[0]][pos[1]]);
		return;
	}
};

const onBot = (active: boolean) => {
	if (useBot.value === active) {
		return;
	}

	useBot.value = active;

	if (botInterval) {
		clearInterval(botInterval);
		botInterval = null;
	}

	if (active) {
		botInterval = setInterval(() => {
			botStep();
		}, botStepDelay);
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
	onBot,
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

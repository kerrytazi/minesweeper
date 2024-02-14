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

let useBot = false;
let botInterval: number | null = null;
let botStepDelay = 0;

let useHighlight = ref(false);
const highlightsClick = ref<CellData[]>([]);
const highlightsFlag = ref<CellData[]>([]);

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

	if (useBot) {
		console.log(`[bot] reset field`);
	}

	if (useHighlight.value) {
		highlightsClick.value = [];
		highlightsFlag.value = [];
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

	if (useBot) {
		console.log(`[bot] game lost`);
	}
};

const onGameWin = () => {
	for (let row of table.value) {
		for (let cell of row) {
			if (!cell.isOpen && !cell.isFlag) {
				onContextmenu(cell);
			}
		}
	}

	gameWin.value = true;

	if (useBot) {
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

	if (useHighlight.value) {
		updateHighlights();
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

		if (useHighlight.value) {
			updateHighlights();
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

interface BotStepParams {
	clickCallback: (cell: CellData) => void;
	flagCallback: (cell: CellData) => void;
	singleStep: boolean;
	allowRandom: boolean;
	allowRestart: boolean;
	useLog?: boolean;
	logPrefix?: string;
}

const botStep = (botParams: BotStepParams) => {
	if (gameLose.value || gameWin.value) {
		return;
	}

	if (!generated.value) {
		if (!botParams.allowRandom) {
			return;
		}

		let row = (Math.random() * nRows.value) | 0;
		let col = (Math.random() * nCols.value) | 0;
		botParams.clickCallback(table.value[row][col]);
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
								if (botParams.useLog) {
									console.log(`[${botParams.logPrefix??'bot'}] obvious flag {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								}

								botParams.flagCallback(c);
							}
						});

						if (botParams.singleStep) {
							return;
						}
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
								if (botParams.useLog) {
									console.log(`[${botParams.logPrefix??'bot'}] open click {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								}

								botParams.clickCallback(c);
							}
						});

						if (botParams.singleStep) {
							return;
						}
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
								if (botParams.singleStep) {
									return;
								}
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
													if (botParams.useLog) {
														console.log(`[${botParams.logPrefix??'bot'}] flag {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													}
													
													botParams.flagCallback(cc);
												}
											}
										} else if (cell.nMinesAround - cell.nFlagsAround === 1 && c2.nMinesAround - c2.nFlagsAround === 1 && aroundCells2.length === combine.length && aroundCells.length - combine.length + c2.nMinesAround - c2.nFlagsAround > cell.nMinesAround - cell.nFlagsAround) { // kill me pls
											found = true;

											for (let cc of aroundCells) {
												if (!combine.includes(cc)) {
													if (botParams.useLog) {
														console.log(`[${botParams.logPrefix??'bot'}] 1-1-X click {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													}

													botParams.clickCallback(cc);
												}
											}
										}
									}
								}
							}
						});

						if (found) {
							if (botParams.singleStep) {
								return;
							}
						}
					}
				}
			}
		}
	}

	if (botParams.allowRandom)
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

		if (botParams.useLog) {
			console.log(`[${botParams.logPrefix??'bot'}] random click {${pos[0]} ${pos[1]}}`);
		}

		onClick(table.value[pos[0]][pos[1]]);
		return;
	}

	if (botParams.allowRestart) {
		resetField();
	}
};

const onReset = () => {
	resetField();
};

const onBot = (active: boolean) => {
	if (useBot === active) {
		return;
	}

	useBot = active;

	if (botInterval) {
		clearInterval(botInterval);
		botInterval = null;
	}

	if (active) {
		botInterval = setInterval(() => {
			botStep({
				clickCallback: onClick,
				flagCallback: onContextmenu,
				singleStep: true,
				allowRandom: true,
				allowRestart: false,
				useLog: true,
				logPrefix: 'bot',
			});
		}, botStepDelay);
	}
};

const updateHighlights = () => {
	highlightsClick.value = [];
	highlightsFlag.value = [];

	botStep({
		clickCallback: (c: CellData) => { highlightsClick.value.push(c); },
		flagCallback: (c: CellData) => { highlightsFlag.value.push(c); },
		singleStep: false,
		allowRandom: false,
		allowRestart: false,
	});
};

const onHighlight = (active: boolean) => {
	if (useHighlight.value === active) {
		return;
	}

	useHighlight.value = active;

	updateHighlights();
};

const onSettingsChanged = (settings: GameFieldSettings) => {
	nCols.value = settings.nCols;
	nRows.value = settings.nRows;
	nMines.value = settings.nMines;

	resetField();
};

defineExpose({
	onReset,
	onBot,
	onHighlight,
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
				:isHighlightClick="useHighlight && highlightsClick.includes(cell)"
				:isHighlightFlag="useHighlight && highlightsFlag.includes(cell)"
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
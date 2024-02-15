<script setup lang="ts">
import { ref } from 'vue';
import Cell from './Cell.vue';
import type { GameFieldSettings } from './FieldSettings.vue';
import { socket } from '@/socket';
import type { PlayerCursor } from '../../../common/socket-types';

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

const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const splitmix32 = (a: number) => {
	return () => {
		a |= 0; a = a + 0x9e3779b9 | 0;
		let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
			t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
		return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
	}
};

interface ServerPlayerCursor extends PlayerCursor {
	playerId: string;
}

let gameField = ref<HTMLElement | null>(null);

let playerCursors = ref<ServerPlayerCursor[]>([]);

let nRows = ref(10);
let nCols = ref(10);
let nMines = ref(20);
let rand = splitmix32(1337);

let useBot = false;
let botInterval: ReturnType<typeof setInterval> | null = null;
let botStepDelay = 10;

let useHighlight = ref(false);
const highlightsClick = ref<CellData[]>([]);
const highlightsFlag = ref<CellData[]>([]);

let generated = ref(false);
let gameLose = ref(false);
let gameWin = ref(false);
let nFlags = ref(0);
let nOpened = ref(0);
let table = ref(createTableRows(nRows.value, nCols.value));

interface HistoryItem {
	generated: boolean;
	gameLose: boolean;
	gameWin: boolean;
	nFlags: number;
	nOpened: number;
	table: CellData[][];
}

let history: HistoryItem[] = [];
let historyIndex = -1;

const historyPush = () => {
	if (historyIndex + 1 < history.length) {
		history.splice(historyIndex + 1);
	}

	history.push({
		generated: deepCopy(generated.value),
		gameLose: deepCopy(gameLose.value),
		gameWin: deepCopy(gameWin.value),
		nFlags: deepCopy(nFlags.value),
		nOpened: deepCopy(nOpened.value),
		table: deepCopy(table.value),
	});

	++historyIndex;
};

const historyApply = () => {
	generated.value = deepCopy(history[historyIndex].generated);
	gameLose.value = deepCopy(history[historyIndex].gameLose);
	gameWin.value = deepCopy(history[historyIndex].gameWin);
	nFlags.value = deepCopy(history[historyIndex].nFlags);
	nOpened.value = deepCopy(history[historyIndex].nOpened);
	table.value = deepCopy(history[historyIndex].table);

	if (useHighlight.value) {
		updateHighlights();
	}
}

const historyBack = () => {
	if (historyIndex === 0) {
		return;
	}

	--historyIndex;
	historyApply();
};

const historyForward = () => {
	if (historyIndex === history.length - 1) {
		return;
	}

	++historyIndex;
	historyApply();
};

const resetField = () => {
	generated.value = false;
	gameLose.value = false;
	gameWin.value = false;
	nFlags.value = 0;
	nOpened.value = 0;
	table.value = createTableRows(nRows.value, nCols.value);

	history = [];
	historyIndex = -1;
	historyPush(); // Empty field

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
		let toRemove = (rand() * poses.length) | 0;
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
				onFlag(cell);
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

const onFlag = (cell: CellData) => {
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

	historyPush();
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
			historyPush();
			return;
		}

		if (cell.isOpen)
		{
			let changed = false;

			if (cell.nMinesAround > 0) {
				if (cell.nMinesAround <= cell.nFlagsAround) {
					forEachAround(cell, (c) => {
						if (!c.isFlag && !c.isOpen) {
							changed = true;
							openCell(c);
						}
					});
				}
			}

			if (changed) {
				historyPush();
			}

			return;
		}

		openCell(cell);
		checkWin();
		historyPush();
	} else {
		generateField(cell);
		generated.value = true;
		openCell(cell);
		checkWin();
		historyPush();
	}
};

interface BotStepParams {
	clickCallback: (cell: CellData) => void;
	flagCallback: (cell: CellData) => void;
	singleStep: boolean;
	allowRandom: boolean;
	allowRestartOnFail: boolean;
	useLog?: boolean;
	logPrefix?: string;
}

const botStep = (botParams: BotStepParams) => {
	if (gameLose.value || gameWin.value) {
		if (gameLose.value && botParams.allowRestartOnFail) {
			resetField();
		}

		return;
	}

	if (!generated.value) {
		if (!botParams.allowRandom) {
			return;
		}

		let row = (rand() * nRows.value) | 0;
		let col = (rand() * nCols.value) | 0;
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

		let index = (rand() * poses.length) | 0;
		let pos = poses[index];

		if (botParams.useLog) {
			console.log(`[${botParams.logPrefix??'bot'}] random click {${pos[0]} ${pos[1]}}`);
		}

		onClick(table.value[pos[0]][pos[1]]);
		return;
	}

	if (botParams.allowRestartOnFail) {
		resetField();
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
		allowRestartOnFail: false,
	});
};

const onReset = () => {
	resetField();
};

const onHistoryBack = () => {
	historyBack();
};

const onHistoryForward = () => {
	historyForward();
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
				flagCallback: onFlag,
				singleStep: true,
				allowRandom: true,
				allowRestartOnFail: true,
				useLog: true,
				logPrefix: 'bot',
			});
		}, botStepDelay);
	}
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
	rand = splitmix32(settings.randomSeed);

	resetField();
};

const onClientClick = (cell: CellData) => {
	onClick(cell);
	socket.emit('click', cell.rowIndex, cell.colIndex);
}

const onClientFlag = (cell: CellData) => {
	onFlag(cell);
	socket.emit('flag', cell.rowIndex, cell.colIndex);
}

const onServerClick = (row: number, col: number) => {
	onClick(table.value[row][col]);
};

const onServerFlag = (row: number, col: number) => {
	onFlag(table.value[row][col]);
};

const onClientPointerMove = (e: Event) => {
	if (gameField.value) {
		let rect = gameField.value.getBoundingClientRect();
		socket.emit('pointerMove', { x: (<MouseEvent>e).x - rect.x, y: (<MouseEvent>e).y - rect.y });
	}
}

const onServerPointerMove = (playerId: string, cursor: PlayerCursor) => {
	let found = playerCursors.value.find((c) => c.playerId == playerId);

	if (found) {
		found.x = cursor.x;
		found.y = cursor.y;
	}
};

const onServerPlayerJoined = (playerId: string) => {
	playerCursors.value.push({ playerId, x: 0, y: 0 });
};

const onServerPlayerLeft = (playerId: string) => {
	let idx = playerCursors.value.findIndex((c) => c.playerId == playerId);

	if (idx !== -1) {
		playerCursors.value.splice(idx, 1);
	}
};

socket.on('click', onServerClick);
socket.on('flag', onServerFlag);
socket.on('pointerMove', onServerPointerMove);

socket.on('playerJoined', onServerPlayerJoined);
socket.on('playerLeft', onServerPlayerLeft);

defineExpose({
	onReset,
	onHistoryBack,
	onHistoryForward,
	onBot,
	onHighlight,
	onSettingsChanged,
});
</script>

<template>
	<div class="game-field" :class="{ 'game-lose': gameLose, 'game-win': gameWin }" @mousemove="onClientPointerMove" ref="gameField">
		<div class="player-cursor-wrapper" v-for="cur in playerCursors">
			<div class="player-cursor" :style="`left: ${cur.x - 3}px; top: ${cur.y}px;`"></div>
		</div>
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
				@click="onClientClick(cell)"
				@contextmenu.prevent="onClientFlag(cell)" />
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
.player-cursor-wrapper {
	position: relative;
}
.player-cursor {
	background-image: url("/cursor.svg");
	background-size: 30px;
	background-repeat: no-repeat;
	background-position: center;
	width: 30px;
	height: 30px;
	position: absolute;
	z-index: 1;
}
</style>

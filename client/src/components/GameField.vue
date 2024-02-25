<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import Cell from '@/components/Cell.vue';
import type { GameFieldSettings } from '@/components/FieldSettings.vue';
import { socket, isHost } from '@/socket';
import type { PlayerCursor, CellData, HistoryItem, SyncData, ControlsData } from '@common/socket-types';

const createDefaultCellData = (row: number, col: number): CellData => ({ nMinesAround: 0, nFlagsAround: 0, isMine: false, isFlag: false, isOpen: false, rowIndex: row, colIndex: col });
const createTableCols = (row: number, nCols: number) => Array.from({length: nCols}, (_, col) => createDefaultCellData(row, col));
const createTableRows = (nRows: number, nCols: number) => Array.from({length: nRows}, (_, row) => createTableCols(row, nCols));

const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const splitmix32 = (a: number) => {
	return {
		rand: () => {
			a |= 0; a = a + 0x9e3779b9 | 0;
			let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
				t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
			return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
		},
		rand_get: () => a,
	};
};

interface ServerPlayerCursor extends PlayerCursor {
	playerId: string;
}

const gameField = ref<HTMLElement | null>(null);

const playerCursors = ref<ServerPlayerCursor[]>([]);

const nRows = ref(16);
const nCols = ref(30);
const nMines = ref(99);
let { rand, rand_get } = splitmix32(1337);

let useAutoSolver = false;
let autosolverInterval: ReturnType<typeof setInterval> | null = null;
let playerCursorInterval: ReturnType<typeof setInterval> | null = null;
let autosolverStepDelay = 10;

const useHighlight = ref(false);
const highlightsClick = ref<CellData[]>([]);
const highlightsFlag = ref<CellData[]>([]);

const useEditor = ref(false);

let generated = false;
const gameLose = ref(false);
const gameWin = ref(false);
const nFlags = ref(0);
const nOpened = ref(0);
const table = ref(createTableRows(nRows.value, nCols.value));

let gameStartTime: number | null = null;

let history: HistoryItem[] = [];
let historyIndex = -1;

const emit = defineEmits<{
	minesUpdate: [nMines: number];
	gameStart: [gameStartTime: number | null];
	gameEnd: [gameEndTime: number | null];
	syncControls: [controls: ControlsData];
}>();

watch(nMines, () => { emit('minesUpdate', nMines.value - nFlags.value); });
watch(nFlags, () => { emit('minesUpdate', nMines.value - nFlags.value); });

const historyPush = () => {
	if (historyIndex + 1 < history.length) {
		history.splice(historyIndex + 1);
	}

	history.push({
		generated: deepCopy(generated),
		gameLose: deepCopy(gameLose.value),
		gameWin: deepCopy(gameWin.value),
		nFlags: deepCopy(nFlags.value),
		nOpened: deepCopy(nOpened.value),
		table: deepCopy(table.value),
	});

	++historyIndex;
};

const historyApply = () => {
	let gameEnded = gameWin.value || gameLose.value;

	generated = deepCopy(history[historyIndex].generated);
	gameLose.value = deepCopy(history[historyIndex].gameLose);
	gameWin.value = deepCopy(history[historyIndex].gameWin);
	nFlags.value = deepCopy(history[historyIndex].nFlags);
	nOpened.value = deepCopy(history[historyIndex].nOpened);
	table.value = deepCopy(history[historyIndex].table);

	if (useHighlight.value) {
		updateHighlights();
	}

	if (gameEnded) {
		emit('gameEnd', null);
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
	generated = false;
	gameLose.value = false;
	gameWin.value = false;
	nFlags.value = 0;
	nOpened.value = 0;
	table.value = createTableRows(nRows.value, nCols.value);

	history = [];
	historyIndex = -1;
	historyPush(); // Empty field

	gameStartTime = null;
	emit('gameStart', null);
	emit('minesUpdate', nMines.value - nFlags.value);

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

	emit('gameEnd', performance.now());

	if (useAutoSolver) {
		console.log(`[autosolver] game lost`);
	}
};

const onGameWin = () => {
	for (let row of table.value) {
		for (let cell of row) {
			if (!cell.isOpen && !cell.isFlag) {
				onFlag(cell, false);
			}
		}
	}

	gameWin.value = true;

	emit('gameEnd', performance.now());

	if (useAutoSolver) {
		console.log(`[autosolver] game won`);
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

const onFlag = (cell: CellData, shift: boolean) => {
	if (!useEditor.value) {
		if (gameLose.value || gameWin.value) {
			return;
		}
	}

	if (generated || useEditor.value) {
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

const onClick = (cell: CellData, shift: boolean) => {
	if (useEditor.value) {
		if (shift) {
			cell.isMine = !cell.isMine;
		} else {
			cell.isOpen = !cell.isOpen;
		}

		historyPush();
		updateHighlights();
		return;
	}

	if (gameLose.value || gameWin.value) {
		return;
	}

	if (generated) {
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
				checkWin();
				historyPush();
			}

			return;
		}

		openCell(cell);
		checkWin();
		historyPush();
	} else {
		generateField(cell);
		generated = true;
		openCell(cell);
		checkWin();
		historyPush();

		gameStartTime = performance.now();
		emit('gameStart', gameStartTime);
		emit('minesUpdate', nMines.value - nFlags.value);
	}
};

const onKeydown = (cell: CellData, num: number) => {
	if (!useEditor.value) {
		return;
	}

	cell.nMinesAround = num;

	historyPush();
	updateHighlights();
};

interface AutoSolverStepParams {
	clickCallback: (cell: CellData) => void;
	flagCallback: (cell: CellData) => void;
	singleStep: boolean;
	allowRandom: boolean;
	allowRestartOnFail: boolean;
	useLog?: boolean;
	logPrefix?: string;
}

const autosolverStep = (autosolverParams: AutoSolverStepParams) => {
	if (!useEditor.value) {
		if (gameLose.value || gameWin.value) {
			if (gameLose.value && autosolverParams.allowRestartOnFail) {
				if (autosolverParams.useLog) {
					console.log(`[${autosolverParams.logPrefix??'autosolver'}] reset field`);
				}
				
				resetField();
			}
			
			return;
		}
		
		if (!generated) {
			if (!autosolverParams.allowRandom) {
				return;
			}
			
			let row = (rand() * nRows.value) | 0;
			let col = (rand() * nCols.value) | 0;
			autosolverParams.clickCallback(table.value[row][col]);
			return;
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
					if (closed > 0 && closed === cell.nMinesAround - cell.nFlagsAround) {
						forEachAround(cell, (c) => {
							if (!c.isOpen && !c.isFlag) {
								if (autosolverParams.useLog) {
									console.log(`[${autosolverParams.logPrefix??'autosolver'}] obvious flag {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								}

								autosolverParams.flagCallback(c);
							}
						});

						if (autosolverParams.singleStep) {
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
								if (autosolverParams.useLog) {
									console.log(`[${autosolverParams.logPrefix??'autosolver'}] open click {${c.rowIndex} ${c.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}}`);
								}

								autosolverParams.clickCallback(c);
							}
						});

						if (autosolverParams.singleStep) {
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
								if (autosolverParams.singleStep) {
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
													if (autosolverParams.useLog) {
														console.log(`[${autosolverParams.logPrefix??'autosolver'}] flag {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													}
													
													autosolverParams.flagCallback(cc);
												}
											}
										} else if (cell.nMinesAround - cell.nFlagsAround === 1 && c2.nMinesAround - c2.nFlagsAround === 1 && aroundCells2.length === combine.length && aroundCells.length - combine.length + c2.nMinesAround - c2.nFlagsAround > cell.nMinesAround - cell.nFlagsAround) { // kill me pls
											found = true;

											for (let cc of aroundCells) {
												if (!combine.includes(cc)) {
													if (autosolverParams.useLog) {
														console.log(`[${autosolverParams.logPrefix??'autosolver'}] 1-1-X click {${cc.rowIndex} ${cc.colIndex}}; because of {${cell.rowIndex} ${cell.colIndex}} and {${c2.rowIndex} ${c2.colIndex}}`);
													}

													autosolverParams.clickCallback(cc);
												}
											}
										}
									}
								}
							}
						});

						if (found) {
							if (autosolverParams.singleStep) {
								return;
							}
						}
					}
				}
			}
		}
	}

	if (autosolverParams.allowRandom)
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

		if (autosolverParams.useLog) {
			console.log(`[${autosolverParams.logPrefix??'autosolver'}] random click {${pos[0]} ${pos[1]}}`);
		}

		onClick(table.value[pos[0]][pos[1]], false);
		return;
	}

	if (autosolverParams.allowRestartOnFail) {
		if (autosolverParams.useLog) {
			console.log(`[${autosolverParams.logPrefix??'autosolver'}] reset field`);
		}

		resetField();
	}
};

const updateHighlights = () => {
	highlightsClick.value = [];
	highlightsFlag.value = [];

	autosolverStep({
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

const onAutoSolver = (active: boolean) => {
	if (useAutoSolver === active) {
		return;
	}

	useAutoSolver = active;

	if (autosolverInterval) {
		clearInterval(autosolverInterval);
		autosolverInterval = null;
	}

	if (active) {
		autosolverInterval = setInterval(() => {
			autosolverStep({
				clickCallback: (cell: CellData) => { onClick(cell, false); },
				flagCallback: (cell: CellData) => { onFlag(cell, false); },
				singleStep: true,
				allowRandom: true,
				allowRestartOnFail: true,
				useLog: true,
				logPrefix: 'autosolver',
			});
		}, autosolverStepDelay);
	}
};

const onHighlight = (active: boolean) => {
	if (useHighlight.value === active) {
		return;
	}

	useHighlight.value = active;

	updateHighlights();
};

const onEditor = (active: boolean) => {
	if (useEditor.value === active) {
		return;
	}

	useEditor.value = active;

	if (useEditor.value) {
		document.addEventListener('keydown', onClientKeydown);
	} else {
		document.removeEventListener('keydown', onClientKeydown);
	}
};

const onSettingsChanged = (settings: GameFieldSettings) => {
	nCols.value = settings.nCols;
	nRows.value = settings.nRows;
	nMines.value = settings.nMines;
	({ rand, rand_get } = splitmix32(1337));

	resetField();
};

const onClientClick = (cell: CellData, e: MouseEvent) => {
	onClick(cell, e.shiftKey);
	socket.emit('click', cell.rowIndex, cell.colIndex, e.shiftKey);
}

const onClientFlag = (cell: CellData, e: MouseEvent) => {
	onFlag(cell, e.shiftKey);
	socket.emit('flag', cell.rowIndex, cell.colIndex, e.shiftKey);
}

const onServerClick = (row: number, col: number, shift: boolean) => {
	onClick(table.value[row][col], shift);
};

const onServerFlag = (row: number, col: number, shift: boolean) => {
	onFlag(table.value[row][col], shift);
};

const onClientKeydown = (e: KeyboardEvent) => {
	if (!useEditor.value) {
		return;
	}

	let num = parseInt(e.key);

	if (isNaN(num)) {
		return;
	}

	let elements = document.querySelectorAll(':hover');

	if (elements.length === 0) {
		return;
	}

	let domCol = elements[elements.length - 1];

	if (!domCol.classList.contains('col')) {
		return;
	}

	let domRow = domCol.parentElement!;
	let domField = domRow.parentElement!;

	let col = Array.from(domRow.children).indexOf(domCol);
	let row = Array.from(domField.children).indexOf(domRow);

	onKeydown(table.value[row][col], num);
};

const onServerKeydown = () => {
};

let lastPlayerCursor: PlayerCursor | null = null;

const onClientPointerMove = (e: Event) => {
	if (gameField.value !== null && playerCursorInterval !== null) {
		let rect = gameField.value.getBoundingClientRect();
		lastPlayerCursor = { x: (<MouseEvent>e).x - rect.x, y: (<MouseEvent>e).y - rect.y };
		// socket.emit('pointerMove', { x: (<MouseEvent>e).x - rect.x, y: (<MouseEvent>e).y - rect.y });
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

	if (isHost.value) {
		onClientSync();
	}

	if (playerCursors.value.length === 1) {
		playerCursorInterval = setInterval(() => {
			if (lastPlayerCursor) {
				socket.emit('pointerMove', lastPlayerCursor);
				lastPlayerCursor = null;
			}
		}, 10);
	}
};

const onServerPlayerLeft = (playerId: string) => {
	let idx = playerCursors.value.findIndex((c) => c.playerId == playerId);

	if (idx !== -1) {
		playerCursors.value.splice(idx, 1);
	}

	if (playerCursors.value.length === 0 && playerCursorInterval !== null) {
		clearInterval(playerCursorInterval);
		playerCursorInterval = null;
	}
};

const onClientSync = () => {
	socket.emit('sync', {
		history: deepCopy(history),
		historyIndex: deepCopy(historyIndex),
		settings: {
			nRows: nRows.value,
			nCols: nCols.value,
			nMines: nMines.value,
			randomSeed: rand_get(),
		},
		gameTime: gameStartTime ? performance.now() - gameStartTime : null,
		controls: {
			autosolver: useAutoSolver,
			highlight: useHighlight.value,
			editor: useEditor.value,
		},
	});
};

const onServerSync = (data: SyncData) => {
	history = data.history;
	historyIndex = data.historyIndex;

	nRows.value = data.settings.nRows;
	nCols.value = data.settings.nCols;
	nMines.value = data.settings.nMines;
	({ rand, rand_get } = splitmix32(data.settings.randomSeed));

	gameStartTime = data.gameTime ? performance.now() - data.gameTime : null;
	emit('gameStart', gameStartTime);

	useAutoSolver = data.controls.autosolver;
	useHighlight.value = data.controls.highlight;
	useEditor.value = data.controls.editor;

	emit('syncControls', data.controls);

	historyApply();
};

socket.on('click', onServerClick);
socket.on('flag', onServerFlag);
//socket.on('keydown', onServerKeydown);
socket.on('pointerMove', onServerPointerMove);

socket.on('playerJoined', onServerPlayerJoined);
socket.on('playerLeft', onServerPlayerLeft);

socket.on('sync', onServerSync)

defineExpose({
	onReset,
	onHistoryBack,
	onHistoryForward,
	onAutoSolver,
	onHighlight,
	onEditor,
	onSettingsChanged,
});

onBeforeUnmount(() => {
	document.removeEventListener('keydown', onClientKeydown);
});
</script>

<template>
	<div
		class="game-field"
		:class="{
			'game-lose': gameLose,
			'game-win': gameWin,
		}"
		@mousemove="onClientPointerMove"
		ref="gameField"
		@contextmenu.prevent=""
	>
		<div class="player-cursor-wrapper" v-for="cur in playerCursors">
			<div class="player-cursor" :style="`left: ${cur.x - 3}px; top: ${cur.y}px;`"></div>
		</div>
		<div class="row" v-for="row in table">
			<Cell
				class="col"
				v-for="cell in row"
				:nMinesAround="cell.nMinesAround"
				:isMine="(gameLose || useEditor) && cell.isMine && !cell.isFlag"
				:isFlag="cell.isFlag"
				:isWrongFlag="gameLose && cell.isFlag && !cell.isMine"
				:isOpen="cell.isOpen"
				:isHighlightClick="useHighlight && highlightsClick.includes(cell)"
				:isHighlightFlag="useHighlight && highlightsFlag.includes(cell)"
				@click="onClientClick(cell, $event)"
				@contextmenu.prevent="onClientFlag(cell, $event)" />
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

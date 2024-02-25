export interface CellData {
	nMinesAround: number;
	nFlagsAround: number;
	isMine: boolean;
	isFlag: boolean;
	isOpen: boolean;
	rowIndex: number;
	colIndex: number;
}

export interface HistoryItem {
	generated: boolean;
	gameLose: boolean;
	gameWin: boolean;
	nFlags: number;
	nOpened: number;
	table: CellData[][];
}

export interface GameFieldSettings {
	nRows: number;
	nCols: number;
	nMines: number;
	randomSeed: number;
}

export interface PlayerCursor {
	x: number;
	y: number;
}

export interface SyncData {
	history: HistoryItem[];
	historyIndex: number;
	settings: GameFieldSettings;
	gameTime: number | null;
}

export interface RoomClientToServerEvents {
	reset: () => void;
	historyBack: () => void;
	historyForward: () => void;
	autosolver: (active: boolean) => void;
	highlight: (active: boolean) => void;

	settingsChanged: (settings: GameFieldSettings) => void;

	click: (row: number, col: number) => void;
	flag: (row: number, col: number) => void;
	pointerMove: (cursor: PlayerCursor) => void;

	createRoom: (roomId: string) => void;
	joinRoom: (roomId: string) => void;

	sync: (data: SyncData) => void;
}

export interface RoomServerToClientEvents {
	reset: () => void;
	historyBack: () => void;
	historyForward: () => void;
	autosolver: (active: boolean) => void;
	highlight: (active: boolean) => void;

	settingsChanged: (settings: GameFieldSettings) => void;

	click: (row: number, col: number) => void;
	flag: (row: number, col: number) => void;
	pointerMove: (playerId: string, cursor: PlayerCursor) => void;

	playerJoined: (playerId: string) => void;
	playerLeft: (playerId: string) => void;

	joinError: () => void;

	sync: (data: SyncData) => void;
}

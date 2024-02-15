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

export interface RoomClientToServerEvents {
	reset: () => void;
	historyBack: () => void;
	historyForward: () => void;
	bot: (active: boolean) => void;
	highlight: (active: boolean) => void;

	settingsChanged: (settings: GameFieldSettings) => void;

	click: (row: number, col: number) => void;
	flag: (row: number, col: number) => void;
	pointerMove: (cursor: PlayerCursor) => void;

	createRoom: (roomId: string) => void;
	joinRoom: (roomId: string) => void;
}

export interface RoomServerToClientEvents {
	reset: () => void;
	historyBack: () => void;
	historyForward: () => void;
	bot: (active: boolean) => void;
	highlight: (active: boolean) => void;

	settingsChanged: (settings: GameFieldSettings) => void;

	click: (row: number, col: number) => void;
	flag: (row: number, col: number) => void;
	pointerMove: (playerId: string, cursor: PlayerCursor) => void;

	playerJoined: (playerId: string) => void;
	playerLeft: (playerId: string) => void;

	joinError: () => void;
}

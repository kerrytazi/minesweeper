import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

interface RoomClientToServerEvents {
	ping: (arg: string) => void
}

interface RoomServerToClientEvents {
	pong: (arg: string) => void;
}

export const socket: Socket<
	RoomServerToClientEvents,
	RoomClientToServerEvents
> = io();

//export const socket = io(window.location);

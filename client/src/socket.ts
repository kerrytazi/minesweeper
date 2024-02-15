import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { RoomClientToServerEvents, RoomServerToClientEvents } from '../../common/socket-types';

export const socket: Socket<
	RoomServerToClientEvents,
	RoomClientToServerEvents
> = io();

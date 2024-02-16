import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import type { GameFieldSettings, PlayerCursor, SyncData, RoomClientToServerEvents, RoomServerToClientEvents } from '@common/socket-types';

const port = process.env.PORT || 3000;

const app = express();
app.get('\\S+\/$', (req, res) => {
	return res.redirect(301, req.path.slice(0, -1) + req.url.slice(req.path.length));
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/join', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const httpServer = createServer(app);

const io = new Server<RoomClientToServerEvents, RoomServerToClientEvents>(httpServer);

const socketToRooms = new WeakMap<Socket<RoomClientToServerEvents, RoomServerToClientEvents>, string>();
const roomToSockets = new Map<string, Socket<RoomClientToServerEvents, RoomServerToClientEvents>[]>();

io.on('connection', (socket) => {
	socket.on('reset', () => { socket.to(socketToRooms.get(socket)).emit('reset'); });
	socket.on('historyBack', () => { socket.to(socketToRooms.get(socket)).emit('historyBack'); });
	socket.on('historyForward', () => { socket.to(socketToRooms.get(socket)).emit('historyForward'); });
	socket.on('bot', (active: boolean) => { socket.to(socketToRooms.get(socket)).emit('bot', active); });
	socket.on('highlight', (active: boolean) => { socket.to(socketToRooms.get(socket)).emit('highlight', active); });
	socket.on('settingsChanged', (settings: GameFieldSettings) => { socket.to(socketToRooms.get(socket)).emit('settingsChanged', settings); });
	socket.on('click', (row: number, col: number) => { socket.to(socketToRooms.get(socket)).emit('click', row, col); });
	socket.on('flag', (row: number, col: number) => { socket.to(socketToRooms.get(socket)).emit('flag', row, col); });
	socket.on('pointerMove', (cursor: PlayerCursor) => { socket.to(socketToRooms.get(socket)).emit('pointerMove', socket.id, cursor); });

	socket.on('createRoom', (roomId: string) => {
		socket.join(roomId);
		socketToRooms.set(socket, roomId);
		roomToSockets.set(roomId, [socket]);
		socket.emit('reset');
	});

	socket.on('joinRoom', (roomId: string) => {
		if (roomToSockets.has(roomId)) {
			socket.join(roomId);
			socketToRooms.set(socket, roomId);

			let sockets = roomToSockets.get(roomId);
			for (let s of sockets) {
				socket.emit('playerJoined', s.id);
			}

			sockets.push(socket);
			socket.to(socketToRooms.get(socket)).emit('playerJoined', socket.id);
		} else {
			socket.emit('joinError');
		}
	});

	socket.on('disconnecting', () => {
		let roomId = socketToRooms.get(socket);
		socketToRooms.delete(socket);

		let newSockets = roomToSockets.get(roomId).filter((s) => s !== socket);
		if (newSockets.length === 0) {
			roomToSockets.delete(roomId);
		} else {
			roomToSockets.set(roomId, roomToSockets.get(roomId).filter((s) => s !== socket));
		}

		socket.to(roomId).emit('playerLeft', socket.id);
	});

	socket.on('sync', (data: SyncData) => { socket.to(socketToRooms.get(socket)).emit('sync', data); });
});

httpServer.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

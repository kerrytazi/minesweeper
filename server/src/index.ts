import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

interface RoomClientToServerEvents {
	ping: (arg: string) => void
}

interface RoomServerToClientEvents {
	pong: (arg: string) => void;
}

const io = new Server<RoomClientToServerEvents, RoomServerToClientEvents>(httpServer);

io.on('connection', (socket) => {
	socket.on('ping', (arg: string) => {
		console.log('ping', arg);
		socket.emit('pong', arg);
	});
});

httpServer.listen(3000, () => { console.log(`Listening on port 3000`); });

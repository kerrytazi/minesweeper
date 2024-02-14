import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';

const port = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

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

httpServer.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

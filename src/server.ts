import http from "http";
import { Server as ServerIO } from "socket.io";

type Player = {
    pseudo: string;
    avatar: string;
    socketId: string;
};

const players: Record<string, Player[]> = {};

const server = http.createServer();

const io = new ServerIO(server, {
    cors: {
        origin: "https://hs-gartic-clone.netlify.app/",
        methods: ["GET", "POST"],
        // credentials: true,
    },
    transports: ["polling"],
});

io.on("connection", (socket) => {
    const { pseudo, avatar } = socket.handshake.query;
    const player = {
        pseudo: typeof pseudo === "string" ? pseudo : "",
        avatar: typeof avatar === "string" ? avatar : "",
        socketId: socket.id,
    };

    socket.join(socket.id + "-room");
    const room = socket.id + "-room";
    if (!players[room]) players[room] = [];
    players[room].push(player);

    io.in(room).emit("players-list", room, players[room]);

    socket.on("join-room", (room, previousRoom, userData) => {
        const index = players[previousRoom].findIndex(
            (p) => p.socketId === socket.id
        );
        if (index !== -1) players[previousRoom].splice(index, 1);
        io.in(previousRoom).emit(
            "players-list",
            previousRoom,
            players[previousRoom]
        );
        socket.leave(previousRoom);

        socket.join(room);
        socket.to(room).emit("new-player", userData);
        players[room].push(player);
        io.in(room).emit("players-list", room, players[room]);
    });

    socket.on("player-leaving-the-room", (roomId) => {
        const index = players[roomId].findIndex(
            (p) => p.socketId === socket.id
        );
        if (index !== -1) players[roomId].splice(index, 1);
        io.in(roomId).emit("players-list", roomId, players[roomId]);
        socket.leave(roomId);
    });

    socket.on("start-btn-been-pressed", (roomId, players) => {
        io.in(roomId).emit("game-starting", players);
    });

    socket.on("player-ready", (playerIndex, round, content, roomId) => {
        io.in(roomId).emit("player-saved-content", playerIndex, round, content);
    });
    socket.on("save-content", (playerIndex, round, content, roomId) => {
        io.in(roomId).emit("player-saved-content", playerIndex, round, content);
    });

    socket.on("ran-out-of-time", (roomId) => {
        io.in(roomId).emit("time-to-save-content");
    });

    socket.on("disconnect", () => {
        const index = players[room].findIndex((p) => p.socketId === socket.id);
        if (index !== -1) players[room].splice(index, 1);
        io.in(room).emit("players-list", room, players[room]);
    });
});

server.listen(3001, () => {
    console.log("Server listening on 3001");
});

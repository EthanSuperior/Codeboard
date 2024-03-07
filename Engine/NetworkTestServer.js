// Networking
// ├───Event RPCs
// ├───UUID Sync
// ├───UUID=>Event
// └───Prediction

const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 3000 });

server.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("message", (message) => {
        console.log(`Received message: ${message}`);
        socket.send(`Server echoes: ${message}`);
    });

    socket.on("close", () => {
        console.log("Client disconnected");
    });
});

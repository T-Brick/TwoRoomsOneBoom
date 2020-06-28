var express = require("express");
var app = express();
var root_dir = __dirname

var server = require("http").createServer(app);

var rooms = {}
var players = {}
var playerNames = {}

app.get("/", function(req, res) {
    res.sendFile(root_dir + "/client/index.html");
});
app.use("/client", express.static(root_dir + "/client"));

SOCKET_LIST = {};

var io = require("socket.io")(server);
io.sockets.on("connection", function(socket) {
    var socketId = Math.random();
    SOCKET_LIST[socketId] = socket;

    socket.on("assignName", function(data) {
        if (playerNames[data] == null) {
            var playerId = socketId
            players[playerId] = {
                name: data,
                id: playerId,
                socket: socket,
                room: null
            }

            playerNames[data] = {
                id: playerId,
                socket: socket
            }

            socket.emit("assignName", playerId);
        } else {
            socket.emit("assignName", -1);
        }
    });

    socket.on("disconnect", function() {
        delete SOCKET_LIST[socket.id];

        if (players[socket.id] != null) {
            var playerName = players[socket.id].name;
            var playerRoom = players[socket.id].room;
            delete players[socket.id];
            delete playerNames[playerName];
            // TODO: delete from rooms and such
        }
    });
});

server.listen(3000);
console.log("Server started!");
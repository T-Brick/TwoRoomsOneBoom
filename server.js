var express = require("express");
var app = express();
var root_dir = __dirname

var server = require("http").createServer(app);

var joinURL = root_dir + "/client/index.html";
var gameURL = root_dir + "/client/game/index.html"

const LOBBY_STATUS = {
    PRE_GAME: "pre_game",
    IN_GAME: "in_game"
};

var lobbies = {};
var players = {};
var playerNames = {};

var addPlayerData = function(socket, playerId, data) {
    var playerName = data.playerName;
    var lobbyName = data.lobbyName;
    if (playerNames[playerName] == null) {
        players[playerId] = {
            socket: socket,
            public: {
                name: playerName,
                id: playerId,
                lobby: lobbyName
            }
        };
        playerNames[playerName] = {
            id: playerId,
            socket: socket
        };
        return playerId;
    }
    return -1;
}

app.get("/game/:lobbyName", function(req, res) {
    res.sendFile(gameURL);

    var lobbyName = req.lobbyName;
    var playerId = req.sessionID;

    if (lobbies[lobbyName] == null) {
        lobbies[lobbyName] = {
            status: LOBBY_STATUS.PRE_GAME,
            players: [playerId]
        };
    } else {
        lobbies[lobbyName].players.push(playerId);
    }

    if (players[playerId] == null) {
        data = {
            playerName: "Anonymous",
            lobbyName: lobbyName
        };
        addPlayerData(null, playerId, data);
    } else {
        players[playerId].public.lobby = lobbyName;
    }
});

app.get("/", function(req, res) {
    res.sendFile(joinURL);
});

app.use("/client", express.static(root_dir + "/client"));


SOCKET_LIST = {};

var io = require("socket.io")(server);
io.sockets.on("connection", function(socket) {
    var socketId = socket.id;
    SOCKET_LIST[socketId] = socket;

    if (players[socketId] != null) {
        console.log("returning player");
        players[socketId].socket = socket;
        socket.emit("userData", players[playerId].public);
    }

    socket.on("joinGame", function(data) {
       var uid = addPlayerData(socket, socketId, data);
       socket.emit("joinGame", uid);
    });

    socket.on("disconnect", function() {
        // delete SOCKET_LIST[socketId];
        if (players[socketId] != null) {
            var playerName = players[socketId].name;
            var playerLobby = players[socketId].lobby;
            players[socketId].socket = null;
            // delete playerNames[playerName];
            // TODO: delete from rooms and such
        }
    });
});

server.listen(3000);
console.log("Server started!");
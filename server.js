var express = require("express");
var app = express();
var uniqid = require("uniqid");
var xss = require("xss");
const root_dir = __dirname

var server = require("http").createServer(app);

const joinURL = root_dir + "/client/index.html";
const gameURL = root_dir + "/client/game/index.html"
const xssSettings = {
    whiteList: ["b", "i", "u", "em", "strong"],
    stripIgnoreTag: true,
    stripIgnoreBody: ["script"]
};

const LOBBY_STATUS = {
    PRE_GAME: "pre_game",
    IN_GAME: "in_game",
    PAUSED: "pause"
};

var lobbies = {};
var players = {};
var playerNames = {};

var addPlayerData = function(socket, playerId, data) {
    var playerName = xss(data.playerName, xssSettings);
    var lobbyName = data.lobbyName;
    var anonymous = data.anonymous;
    
    if (lobbies[lobbyName] != null && lobbies[lobbyName].status != LOBBY_STATUS.PRE_GAME) {
        return -1;
    }
    if (players[playerId] == null && (anonymous || playerNames[playerName] == null)) {
        players[playerId] = {
            socket: socket,
            public: {
                name: playerName,
                id: playerId,
                lobby: lobbyName,
                host: false,
                anonymous: anonymous
            }
        };
        if (!anonymous) {
            playerNames[playerName] = {
                id: playerId
            };
        }
        return playerId;
    }
    return -1;
}

var genMissingNameNum = function(list) {
    var last = 0;
    for (var i of list) {
        if (last + 1 != i)
            break;
        last = i;
    }
    return last + 1;
};

var emitToLobby = function(lobbyName, event, data) {
    lobbies[lobbyName].players.forEach(function(playerId) {
        if(players[playerId].socket != null) {
            players[playerId].socket.emit(event, data);
        } else {
            console.log("Couldn't send " + event + " packet to player " + players[playerId].name + " [" + playerId + "]");
            console.log(data);
        }
    });
}

app.get("/game/:lobbyName", function(req, res) {
    res.sendFile(gameURL);

    var lobbyName = req.params["lobbyName"];
    if (lobbies[lobbyName] == null) {
        lobbies[lobbyName] = {
            status: LOBBY_STATUS.PRE_GAME,
            missing_names: [],
            round: -1,
            players: []
        };
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
    var playerId = uniqid();
    SOCKET_LIST[socketId] = socket;

    socket.on("joinGame", function(data) {
       var uid = addPlayerData(socket, playerId, data);
       socket.emit("joinGame", uid);
    });

    socket.on("userData", function(data) {
        var lobbyName = data.lobbyName
        if (data.playerId == "" || data.playerName == "") {
            // anonymous player join
            lobbies[lobbyName].missing_names.sort();
            var missingNameNum = genMissingNameNum(lobbies[lobbyName].missing_names, 0);
            playerData = {
                playerName: missingNameNum,
                lobbyName: lobbyName,
                anonymous: true
            };
            addPlayerData(socket, playerId, playerData);
            lobbies[lobbyName].missing_names.push(missingNameNum);
            socket.emit("userData", players[playerId].public);
        } else {
            playerId = data.playerId;
            if (players[playerId] == null) {
                data.anonymous = false;
                addPlayerData(socket, playerId, data);
            } else {
                players[playerId].socket = socket;
            }
        }

        if (lobbies[lobbyName].players.length == 0) {
            players[playerId].public.host = true;
            socket.emit("host", playerId);
        }

        lobbies[lobbyName].players.forEach(pid => socket.emit("playerJoin", players[pid].public));
        lobbies[lobbyName].players.push(playerId);
        emitToLobby(lobbyName, "playerJoin", players[playerId].public);
     });

    socket.on("startGame", function() {
        if (players[playerId].public.host) {
            // TODO: start game
            console.log("Starting lobby " + players[playerId].public.lobby + " with " 
                        + lobbies[players[playerId].public.lobby].players.length + " players");
        }
    });

    socket.on("disconnect", function() {
        delete SOCKET_LIST[socketId];
        if (players[playerId] != null) {
            var playerLobby = players[playerId].public.lobby;

            players[playerId].socket = null;

            var lobby = lobbies[playerLobby];
            if (lobby != null) {
                lobby.players.splice(lobby.players.indexOf(playerId), 1);
                emitToLobby(playerLobby, "playerLeave", players[playerId].public);
                if (lobby.players.length == 0) {
                    return;
                }
                
                if(players[playerId].public.host) {
                    players[playerId].public.host = false;
                    emitToLobby(playerLobby, "host", lobby.players[0]);
                }
                
                if (players[playerId].public.anonymous)
                    lobby.missing_names.splice(lobby.missing_names.indexOf(players[playerId].public.name), 1);
            }
        }
    });
});

server.listen(3000);
console.log("Server started!");
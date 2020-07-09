var express = require("express");
var app = express();
var uniqid = require("uniqid");
var xss = require("xss");
const root_dir = __dirname;

var server = require("http").createServer(app);

const joinURL = root_dir + "/client/index.html";
const gameURL = root_dir + "/client/game/index.html";
const gameFailURL = root_dir + "/client/game/failed.html";
const game_settings = require("./game_settings.json");
require("./client/game_states.js");
const xssSettings = {
    whiteList: ["b", "i", "u", "em", "strong"],
    stripIgnoreTag: true,
    stripIgnoreBody: ["script"]
};

var lobbies = {};
var players = {};
var playerNames = {};

var addPlayerData = function(socket, playerId, data) {
    var playerName = xss(data.playerName, xssSettings);
    var lobbyName = data.lobbyName;
    var anonymous = data.anonymous;
    if (playerName == "")
        return CONNECTION.INVALID;
    
    if (lobbies[lobbyName] != null && lobbies[lobbyName].status != LOBBY_STATUS.PRE_GAME) {
        return CONNECTION.LOBBY_STARTED;
    }
    if (players[playerId] == null && (anonymous || playerNames[playerName] == null)) {
        players[playerId] = {
            socket: socket,
            alive: true,
            public: {
                name: playerName,
                id: playerId,
                lobby: lobbyName,
                host: false,
                anonymous: anonymous,
                room: 0,
                leader: LEADER.NONE,
                votes: 0,
                transfer: false
            },
            private: {
                role: "unknown",
                sharing: [],
                voting: []
            }
        };
        if (!anonymous) {
            playerNames[playerName] = {
                id: playerId
            };
        }
        return playerId;
    }
    return CONNECTION.NAME_USED;
}

var emitToList = function(list, event, data) {
    for (var pid of list) {
        if(players[pid].socket != null) {
            players[pid].socket.emit(event, data);
        }
    }
}

var emitToLobby = function(lobbyName, event, data) {
    emitToList(lobbies[lobbyName].players, event, data);
}

var emitToRoom = function(lobbyName, roomNum, event, data) {
    emitToList(lobbies[lobbyName].rooms["room" + roomNum].players, event, data);
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

var pollRand = function(list) {
    return list.splice(Math.floor(Math.random() * list.length), 1);
}

var assignRole = function(unassignedPlayers, role) {
    var p = players[pollRand(unassignedPlayers)];
    p.private.role = role;
    p.socket.emit("assignRole", role);
    return unassignedPlayers;
}

var assignRoles = function(lobby) {
    lobby.status = LOBBY_STATUS.STARTING;

    var unassignedPlayers = lobby.players.map(x => x); // clones the array
    var i;

    var ruleset = null;
    for(var rules of Object.values(game_settings["gamemodes"])) {
        if (rules["players"].includes(unassignedPlayers.length)) {
            ruleset = game_settings["rules"][rules["ruleset"]];
            break;
        }
    }
    if (ruleset == null)
        return -1;
    
    lobby.ruleset = ruleset;

    // assign gambler
    if (ruleset["oddGambler"] && unassignedPlayers.length % 2 == 1)
        unassignedPlayers = assignRole(unassignedPlayers, "gambler");

    // special roles
    for(i = 0; i < ruleset["specialRoles"].length; i++) {
        unassignedPlayers = assignRole(unassignedPlayers, ruleset["specialRoles"][i]);
    }

    // generic roles
    i = 0;
    while (unassignedPlayers.length > 0) {
        unassignedPlayers = assignRole(unassignedPlayers, ruleset["genericRoles"][i++]);
        if (i >= ruleset["genericRoles"].length)
            i = 0;
    }
    return 0;
}

var assignRooms = function(lobby) {
    var p;
    var unassignedPlayers = lobby.players.map(x => x);

    var i = 1;
    while (unassignedPlayers.length > 0) {
        p = players[pollRand(unassignedPlayers)];
        p.public.room = i;
        lobby.rooms["room" + i].players.push(p.public.id);
        i = (i % 2) + 1;
    }

    emitToLobby(lobby.name, "assignRooms", lobby.rooms);
}

var endRound = function(lobbyName) {
    var lobby = lobbies[lobbyName]

    lobby.round.status = ROUND.PRE_ROUND;
    lobby.round.duration = -1;
    lobby.round.endtime = -1;

    emitToLobby(lobby.name, "setRound", lobby.round);
    var room1 = lobby.rooms["room1"];
    var room2 = lobby.rooms["room2"];

    var pid;
    for (pid of room1.transfers) room1.players.splice(room1.players.indexOf(pid), 1);
    for (pid of room2.transfers) room2.players.splice(room2.players.indexOf(pid), 1);

    var fillTransfer = function(room) {
        var p;
        while(room.transfers.length < lobby.round.transfers) {
            p = pollRand(room.players);
            if (p.id != room.leader) room.transfers.push(p);
            else room.players.push(p);
        }
        return room;
    };
    room1 = fillTransfer(room1);
    room2 = fillTransfer(room2);

    for (pid of room1.transfers) {
        players[pid].public.room = 2;
        players[pid].public.transfer = false;
        players[pid].public.votes = 0;
        players[pid].public.leader = LEADER.NONE;

        players[pid].private.voting = [];

        room2.players.push(pid);
    }
    for (pid of room2.transfers) {
        players[pid].public.room = 1;
        players[pid].public.transfer = false;
        players[pid].public.votes = 0;
        players[pid].public.leader = LEADER.NONE;

        players[pid].private.voting = [];

        room1.players.push(pid);
    }

    room1.transfers = [];
    room2.transfers = [];

    emitToLobby(lobby.name, "assignRooms", lobby.rooms);
}

app.get("/game/:lobbyName", function(req, res) {
    var lobbyName = req.params["lobbyName"].trim();
    if (lobbyName != "") {
        if (lobbies[lobbyName] == null) {
            lobbies[lobbyName] = {
                name: lobbyName,
                status: LOBBY_STATUS.PRE_GAME,
                missing_names: [],
                round: {
                    roundNum: 0,
                    maxRoundNum: 0,
                    status: ROUND.NONE,
                    endtime: -1,
                    transfers: 0
                },
                players: [],
                ruleset: null,
                rooms: {
                    room1: {
                        players: [],
                        leader: null,
                        transfers: []
                    },
                    room2: {
                        players: [],
                        leader: null,
                        transfers: []
                    }
                }
            };
        } else if(lobbies[lobbyName].status != LOBBY_STATUS.PRE_GAME) {
            res.sendFile(gameFailURL);
            return;
        }
        res.sendFile(gameURL);
        return;
    }
    res.sendFile(gameFailURL);
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
            if(addPlayerData(socket, playerId, playerData) < 0)
                return;
            lobbies[lobbyName].missing_names.push(missingNameNum);
            socket.emit("userData", players[playerId].public);
        } else {
            playerId = data.playerId;
            if (players[playerId] == null) {
                data.anonymous = false;
                addPlayerData(socket, playerId, data);
            } else {
                players[playerId].socket = socket;
                players[playerId].alive = true;
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
            var lobby = lobbies[players[playerId].public.lobby];
            if (assignRoles(lobby) < 0) {
                return;
            }

            console.log("Starting lobby " + players[playerId].public.lobby + " with " 
                        + lobbies[players[playerId].public.lobby].players.length + " players");
            assignRooms(lobby);
            lobby.round.status = ROUND.PRE_ROUND;
            emitToLobby(lobby.name, "setRound", lobby.round);
        }
    });

    socket.on("shareRole", function(data) {
        var room = players[data.target].public.room;
        var lobby = players[data.target].public.lobby;

        if (room != players[playerId].public.room
        ||  lobby != players[playerId].public.lobby)
            return;
        
        var i = players[data.target].private.sharing.indexOf(playerId);
        if (i < 0) {
            i = players[playerId].private.sharing.indexOf(data.target);
            if (i < 0) {
                players[playerId].private.sharing.push(data.target);
                data.cancel = false;
            } else {
                players[playerId].private.sharing.splice(i, 1);
                data.cancel = true;
            }
            data.shared = false;
            data.mutual = true;
            emitToRoom(lobby, room, "shareRole", data);
        } else {
            var roleData = {
                id: data.target,
                role: players[data.target].private.role,
                mutual: true
            };
            socket.emit("revealRole", roleData);

            roleData = {
                id: playerId,
                role: players[playerId].private.role,
                mutual: true
            };
            players[data.target].socket.emit("revealRole", roleData);

            data.shared = true;
            data.mutual = true;
            data.cancel = false;
            emitToRoom(lobby, room, "shareRole", data);
        }
    });

    socket.on("revealRole", function(data) {
        var room = players[data.target].public.room;
        var lobby = players[data.target].public.lobby;

        if (room != players[playerId].public.room
        ||  lobby != players[playerId].public.lobby)
            return;
        
        var roleData = {
            id: playerId,
            role: players[playerId].private.role,
            mutual: false
        };
        players[data.target].socket.emit("revealRole", roleData);

        data.shared = true;
        data.mutual = false;
        data.cancel = false;
        emitToRoom(lobby, room, "shareRole", data);
    });

    socket.on("vote", function(data) {
        if (players[data.target].public.room != players[playerId].public.room
        ||  players[data.target].public.lobby != players[playerId].public.lobby
        ||  data.room != players[playerId].public.room
        ||  data.lobby != players[playerId].public.lobby)
            return;

        var i = players[playerId].private.voting.indexOf(data.target);
        if (i < 0) {
            players[playerId].private.voting.push(data.target);

            if (players[data.target].public.votes == 0)
                players[data.target].public.leader = LEADER.NOMINATED;
            
            players[data.target].public.votes++;
            var roomSize = lobbies[data.lobby].rooms["room" + data.room].players.length;
            if (players[data.target].public.votes >= roomSize / 2) {
                for (var pid of lobbies[data.lobby].rooms["room" + data.room].players) {
                    players[pid].public.leader = LEADER.NONE;
                    players[pid].public.votes = 0;
                    players[pid].private.voting = [];
                }
                players[data.target].public.leader = LEADER.IN_OFFICE;
                lobbies[data.lobby].rooms["room" + data.room].leader = data.target;
            }

            data.status = players[data.target].public.leader;
            data.votes = players[data.target].public.votes;
            data.cancel = false;
            data.newLeader = data.status == LEADER.IN_OFFICE;

            emitToRoom(players[playerId].public.lobby, data.room, "vote", data);
        } else {
            players[playerId].private.voting.splice(i, 1);

            if (players[data.target].public.votes == 0)
                players[data.target].public.leader = LEADER.NONE;
            
            data.status = players[data.target].public.leader;
            data.votes = players[data.target].public.votes;
            data.cancel = true;
            data.newLeader = false;

            emitToRoom(players[playerId].public.lobby, data.room, "vote", data);
        }
    });

    socket.on("transfer", function(data) {
        if (players[data.target].public.room != players[playerId].public.room
        ||  players[data.target].public.lobby != players[playerId].public.lobby
        ||  players[playerId].public.leader != LEADER.IN_OFFICE)
            return;

        var room = lobbies[data.lobby].rooms["room" + data.room];
        var i = room.transfers.indexOf(data.target);
        if (i < 0) {
            if (room.transfers.length >= lobbies[data.lobby].round.transfers)
                room.transfers.splice(0, 1);
            room.transfers.push(data.target);
            players[data.target].public.transfer = true;
            emitToRoom(players[playerId].public.lobby, data.room, "updateRoom", room);
        } else {
            room.transfers.splice(i, 1);
            players[data.target].public.transfer = false;
            emitToRoom(players[playerId].public.lobby, data.room, "updateRoom", room);
        }
    });

    socket.on("startRound", function() {
        var lobby = lobbies[players[playerId].public.lobby];
        if (lobby.round.status == ROUND.PRE_ROUND) {
            var ruleset = lobby.ruleset;
            lobby.round.roundNum++;
            if (lobby.round.roundNum == 1)
                lobby.round.maxRoundNum = ruleset["roundTimes"].length
            if (lobby.round.roundNum > lobby.round.maxRoundNum) {
                // TODO: end game
                return;
            }

            lobby.round.status = ROUND["ROUND" + lobby.round.roundNum];
            var time = ruleset["roundTimes"][lobby.round.roundNum - 1];
            lobby.round.duration = time * 60 * 1000;
            lobby.round.endtime = new Date().getTime() + lobby.round.duration;
            setTimeout(endRound, lobby.round.duration, lobby.name);

            lobby.round.transfers = ruleset["hostages"][lobby.round.roundNum - 1];
            emitToLobby(lobby.name, "setRound", lobby.round);
        }
    });

    socket.on("disconnect", function() {
        delete SOCKET_LIST[socketId];
        if (players[playerId] != null) {
            var playerLobby = players[playerId].public.lobby;

            players[playerId].socket = null;
            players[playerId].alive = false;

            var lobby = lobbies[playerLobby];
            if (lobby != null) {
                if (lobby.status == LOBBY_STATUS.PRE_GAME) {
                    lobby.players.splice(lobby.players.indexOf(playerId), 1);
                    emitToLobby(playerLobby, "playerLeave", players[playerId].public);
                    if (lobby.players.length == 0) {
                        return;
                    }
                    
                    if(players[playerId].public.host) {
                        players[playerId].public.host = false;
                        players[lobby.players[0]].public.host = true;
                        emitToLobby(playerLobby, "host", lobby.players[0]);
                    }
                    
                    if (players[playerId].public.anonymous)
                        lobby.missing_names.splice(lobby.missing_names.indexOf(players[playerId].public.name), 1);
                }
            }
        }
    });
});

server.listen(3000);
console.log("Server started!");
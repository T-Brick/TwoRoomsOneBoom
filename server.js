var express = require("express");
var app = express();
var uniqid = require("uniqid");
var xss = require("xss");
const args = process.argv.slice(2);
const root_dir = __dirname;

var dev = false;
var port = 80;

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
                transfer: false,
                dead: false
            },
            private: {
                role: ROLES.UNKNOWN,
                role_knowledge: [],
                sharing: [],
                voting: [],
                endgame_choice: null
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

var createLobby = function(lobbyName) {
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
        endgame_pause: {
            gambler: []
        },
        endgame_messages: [],
        ruleset: null,
        clock: null,
        rolesmap: {},
        settings: {
            spectating: false,
            revealing: true
        },
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
}

var emitToList = function(list, event, data) {
    for (var pid of list) 
        emitToPlayer(pid, event, data);
}

var emitToLobby = function(lobbyName, event, data) {
    emitToList(lobbies[lobbyName].players, event, data);
}

var emitToRoom = function(lobbyName, roomNum, event, data) {
    emitToList(lobbies[lobbyName].rooms["room" + roomNum].players, event, data);
}

var emitToPlayer = function(pid, event, data) {
    if (players[pid] != null && players[pid].socket != null)
        players[pid].socket.emit(event, data);
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
    return list.splice(Math.floor(Math.random() * list.length), 1)[0];
}

var hasDecisions = function(lobbyName) {
    for (var plist of Object.values(lobbies[lobbyName].endgame_pause)) {
        if (plist.length > 0) return true;
    }
    return false;
}

var assignRole = function(unassignedPlayers, role) {
    var p = players[pollRand(unassignedPlayers)];
    if (p == null) return null;
    p.private.role = role;
    emitToPlayer(p.public.id, "assignRole", role);
    return p;
}

var assignRoles = function(lobby, rulegroup) {
    lobby.status = LOBBY_STATUS.STARTING;

    var unassignedPlayers = lobby.players.map(x => x); // clones the array
    var i;

    var ruleset = null;
    for(var rules of Object.values(game_settings["gamemodes"][rulegroup.gamemode])) {
        if (rules["dev"] && !dev) continue;
        if (rules["players"].includes(unassignedPlayers.length)) {
            ruleset = game_settings["rules"][rules["ruleset"]];
            break;
        }
    }
    if (ruleset == null)
        return -1;
    
    lobby.ruleset = ruleset;

    var balanceVal;
    if (ruleset["balancing"] == "odd") balanceVal = 1;
    else if (ruleset["balancing"] == "even") balanceVal = 0;
    else balanceVal = 2;
    var p;
    // assign gambler
    if (unassignedPlayers.length % 2 == balanceVal) {
        p = assignRole(unassignedPlayers, rulegroup.balancing);
        if (p == null) return -1;

        if (rulegroup.balancing == ROLES.GAMBLER) lobby.endgame_pause[rulegroup.balancing].push(p.public.id);
        if (lobby.rolesmap[rulegroup.balancing] == null) lobby.rolesmap[rulegroup.balancing] = [p.public.id];
        else lobby.rolesmap[rulegroup.balancing].push(p.public.id);
    }

    // special roles
    for(i = 0; i < ruleset["specialRoles"].length; i++) {
        p = assignRole(unassignedPlayers, ruleset["specialRoles"][i]);
        if (p == null) return 1;

        if (ROLE_INFO[ruleset["specialRoles"][i]].endgame_pause_val > 0)
            lobby.endgame_pause[ruleset["specialRoles"][i]].push(p.public.id);
        if (lobby.rolesmap[ruleset["specialRoles"][i]] == null) lobby.rolesmap[ruleset["specialRoles"][i]] = [p.public.id];
        else lobby.rolesmap[ruleset["specialRoles"][i]].push(p.public.id);
    }

    // special buriable roles
    for(i = 0; i < ruleset["buriableRoles"].length; i++) {
        p = assignRole(unassignedPlayers, ruleset["buriableRoles"][i]);
        if (p == null) return 1;

        if (ROLE_INFO[ruleset["buriableRoles"][i]].endgame_pause_val > 0)
            lobby.endgame_pause[ruleset["buriableRoles"][i]].push(p.public.id);
        if (lobby.rolesmap[ruleset["buriableRoles"][i]] == null) lobby.rolesmap[ruleset["buriableRoles"][i]] = [p.public.id];
        else lobby.rolesmap[ruleset["buriableRoles"][i]].push(p.public.id);
    }

    // generic roles
    i = 0;
    while (unassignedPlayers.length > 0) {
        p = assignRole(unassignedPlayers, ruleset["genericRoles"][i]);
        if (p == null) return 1;

        if (ROLE_INFO[ruleset["genericRoles"][i]].endgame_pause_val > 0)
            lobby.endgame_pause[ruleset["genericRoles"][i]].push(p.public.id);
        if (lobby.rolesmap[ruleset["genericRoles"][i]] == null) lobby.rolesmap[ruleset["genericRoles"][i]] = [p.public.id];
        else lobby.rolesmap[ruleset["genericRoles"][i]].push(p.public.id);
        
        if (++i >= ruleset["genericRoles"].length)
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

var fillTransfer = function(lobbyName, startNum, endNum) {
    var lobby = lobbies[lobbyName];
    var start = lobby.rooms["room" + startNum];
    var transfer_list = [];

    var pid;

    for (pid of start.transfers) start.players.splice(start.players.indexOf(pid), 1);

    while(start.transfers.length < lobby.round.transfers) {
        pid = pollRand(start.players);

        if (pid != start.leader) start.transfers.push(pid);
        else start.players.push(pid);

        if (start.players.length == 0) break;
        if (start.players.length == 1 && start.players[0] == start.leader) break;
    }

    for (pid of start.transfers) {
        players[pid].public.room = endNum;
        players[pid].public.transfer = false;
        players[pid].public.votes = 0;
        players[pid].public.leader = LEADER.NONE;

        players[pid].private.voting = [];

        transfer_list.push(pid);
    }

    start.transfers = [];
    return transfer_list;
};

var endRound = function(lobbyName) {
    var lobby = lobbies[lobbyName];
    if (lobby.round.roundNum == lobby.round.maxRoundNum) {
        if (hasDecisions(lobbyName)) lobby.round.status = ROUND.ENDGAME;
        else lobby.round.status = ROUND.POSTGAME;
    } else {
        lobby.round.status = ROUND.PRE_ROUND;
    }
    lobby.round.duration = -1;
    lobby.round.endtime = -1;

    emitToLobby(lobby.name, "setRound", lobby.round);

    var transfer_list_1 = fillTransfer(lobbyName, 1, 2);
    var transfer_list_2 = fillTransfer(lobbyName, 2, 1);
    lobby.rooms["room1"].players = lobby.rooms["room1"].players.concat(transfer_list_2);
    lobby.rooms["room2"].players = lobby.rooms["room2"].players.concat(transfer_list_1);

    emitToLobby(lobbyName, "assignRooms", lobby.rooms);
    if (lobby.round.status == ROUND.POSTGAME) {
        endGame(lobbyName);
    }
}

var makeEndgameDecision = function(playerId, data) {
    if (data == null || data.team == null)
        return;

    var i;
    switch (players[playerId].private.role) {
        case ROLES.GAMBLER:
            var gamblers = lobbies[players[playerId].public.lobby].endgame_pause.gambler;
            i = gamblers.indexOf(playerId);
            if (i >= 0) {
                gamblers.splice(i, 1);
                players[playerId].private.endgame_choice = data.team;
            }

            emitToLobby(players[playerId].public.lobby, "gamblerVote", data);

            if (!hasDecisions(players[playerId].public.lobby)) {
                lobbies[players[playerId].public.lobby].round.status = ROUND.POSTGAME;
                emitToLobby(players[playerId].public.lobby, "setRound", lobbies[players[playerId].public.lobby].round);
                endGame(players[playerId].public.lobby);
            }
            break;
        default:
            break;
    }
};

var endGame = function(lobbyName) {
    var lobby = lobbies[lobbyName];
    lobby.players.forEach(pid => {
        var roleData = {
            id: pid,
            role: players[pid].private.role,
            mutual: true,
            endgame: true
        };
        emitToLobby(lobbyName, "revealRole", roleData);
    });

    var bomberRoom = players[lobby.rolesmap[ROLES.BOMBER][0]].public.room;
    var presidentRoom = players[lobby.rolesmap[ROLES.PRESIDENT][0]].public.room;
    var results = {
        winTeam: null,
        winGrey: []
    };

    if (lobby.rolesmap[ROLES.ENGINEER] != null) {
        var i = players[lobby.rolesmap[ROLES.BOMBER][0]].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.ENGINEER][0]);
        var j = players[lobby.rolesmap[ROLES.ENGINEER][0]].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.BOMBER][0]);
        lobby.rooms["room" + bomberRoom].players.forEach(pid => {
            var dead = players[pid].public.dead;
            players[pid].public.dead = dead || (i >= 0 && j>= 0);
        });
        if (i >= 0 && j >= 0) {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.ENGINEER][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.ENGINEER].display + ") met " 
                + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so the bomb was fixed, allowing it to explode.");
        } else {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.ENGINEER][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.ENGINEER].display + ") didn't meet " 
                + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so the bomb wasn't fixed.");
        }
    } else {
        lobby.rooms["room" + bomberRoom].players.forEach(pid => players[pid].public.dead = true);
    }

    if (lobby.rolesmap[ROLES.DOCTOR] != null) {
        var i = players[lobby.rolesmap[ROLES.PRESIDENT][0]].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.DOCTOR][0]);
        var j = players[lobby.rolesmap[ROLES.DOCTOR][0]].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.PRESIDENT][0]);
        var dead = players[lobby.rolesmap[ROLES.PRESIDENT][0]].public.dead
        players[lobby.rolesmap[ROLES.PRESIDENT][0]].public.dead = dead || (i < 0 || j < 0);
        if (i < 0 && j < 0) {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.DOCTOR][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.DOCTOR].display + ") didn't meet " 
                + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") so they were not healed.");
        } else {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.DOCTOR][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.DOCTOR].display + ") met " 
                + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") and healed them.");
        }
    }
    results.winTeam = players[lobby.rolesmap[ROLES.PRESIDENT][0]].public.dead ? TEAM.RED : TEAM.BLUE;

    // WC: picking the right team
    if (lobby.rolesmap[ROLES.GAMBLER] != null) {
        lobby.rolesmap[ROLES.GAMBLER].forEach(pid => {
            if (players[pid].private.endgame_choice == results.winTeam) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.GAMBLER].display + ") selected the right team and won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.GAMBLER].display + ") selected the wrong team and lost.");
            }
        });
    }
    // WC: card sharing with president and bomber
    if (lobby.rolesmap[ROLES.MI6] != null) {
        lobby.rolesmap[ROLES.MI6].forEach(pid => {
            if (players[pid].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.PRESIDENT][0]) >= 0
            &&  players[pid].private.role_knowledge.indexOf(lobby.rolesmap[ROLES.BOMBER][0]) >= 0) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.MI6].display + ") met both " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") and "
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.MI6].display + ") didn't meet both " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") and "
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they lost.");
            }
        });
    }
    // WC: dif room than pres
    if (lobby.rolesmap[ROLES.RIVAL] != null) {
        lobby.rolesmap[ROLES.RIVAL].forEach(pid => {
            if (players[pid].public.room != presidentRoom) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.RIVAL].display + ") ended in a different room than " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") so they won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.RIVAL].display + ") ended in the same room as " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") so they lost.");
            }
        });
    }
    // WC: dif room than bomber
    if (lobby.rolesmap[ROLES.SURVIVOR] != null) {
        lobby.rolesmap[ROLES.SURVIVOR].forEach(pid => {
            if (players[pid].public.room != bomberRoom) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.SURVIVOR].display + ") ended in a different room than " 
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.SURVIVOR].display + ") ended in the same room as " 
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they lost.");
            }
        });
    }
    // WC: same room as pres
    if (lobby.rolesmap[ROLES.INTERN] != null) {
        lobby.rolesmap[ROLES.INTERN].forEach(pid => {
            if (players[pid].public.room == presidentRoom) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.INTERN].display + ") ended in a same room as " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") so they won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.INTERN].display + ") ended in a different room than " 
                    + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") so they lost.");
            }
        });
    }
    // WC: same room as bomber
    if (lobby.rolesmap[ROLES.VICTIM] != null) {
        lobby.rolesmap[ROLES.VICTIM].forEach(pid => {
            if (players[pid].public.room == bomberRoom) {
                results.winGrey.push(pid);
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.VICTIM].display + ") ended in a same room as " 
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they won.");
            } else {
                lobby.endgame_messages.push(displayName(players[pid].public, true) 
                    + " (the " + ROLE_INFO[ROLES.VICTIM].display + ") ended in a different room than " 
                    + displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true)
                    + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") so they lost.");
            }
        });
    }
    // WC: ahab - moby with bomber without self; moby - ahab with bomber without self
    if (lobby.rolesmap[ROLES.AHAB] != null && lobby.rolesmap[ROLES.MOBY] != null) {
        var ahabRoom = players[lobby.rolesmap[ROLES.AHAB][0]].public.room;
        var mobyRoom = players[lobby.rolesmap[ROLES.MOBY][0]].public.room;
        if (ahabRoom != bombRoom && mobyRoom == bombRoom) {
            results.winGrey.push(lobby.rolesmap[ROLES.AHAB][0]);
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") killed " 
                + displayName(players[lobby.rolesmap[ROLES.MOBY][0]].public, true)
                + " (" + ROLE_INFO[ROLES.MOBY].display + ") but not "
                + displayName(players[lobby.rolesmap[ROLES.AHAB][0]].public, true)
                + " (" + ROLE_INFO[ROLES.AHAB].display + ") so "
                + displayName(players[lobby.rolesmap[ROLES.AHAB][0]].public, true)
                + " won.");
        } else if (mobyRoom != bombRoom && ahabRoom == bombRoom) {
            results.winGrey.push(lobby.rolesmap[ROLES.MOBY][0]);
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.BOMBER][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.BOMBER].display + ") killed " 
                + displayName(players[lobby.rolesmap[ROLES.AHAB][0]].public, true)
                + " (" + ROLE_INFO[ROLES.AHAB].display + ") but not "
                + displayName(players[lobby.rolesmap[ROLES.MOBY][0]].public, true)
                + " (" + ROLE_INFO[ROLES.MOBY].display + ") so "
                + displayName(players[lobby.rolesmap[ROLES.MOBY][0]].public, true)
                + " won.");
        } else {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.AHAB][0]].public, true)
                + " (" + ROLE_INFO[ROLES.AHAB].display + ") and "
                + displayName(players[lobby.rolesmap[ROLES.MOBY][0]].public, true)
                + " (" + ROLE_INFO[ROLES.MOBY].display + ") both lost.");
        }
    }
    // WC: wife - with president without mistress; mistress - with president without wife
    if (lobby.rolesmap[ROLES.WIFE] != null && lobby.rolesmap[ROLES.MISTRESS] != null) {
        var mistressRoom = players[lobby.rolesmap[ROLES.MISTRESS][0]].public.room;
        var wifeRoom = players[lobby.rolesmap[ROLES.WIFE][0]].public.room;
        if (wifeRoom != presidentRoom && mistressRoom == presidentRoom) {
            results.winGrey.push(lobby.rolesmap[ROLES.MISTRESS][0]);
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.MISTRESS][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.MISTRESS].display + ") is in the same room as " 
                + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") but not "
                + displayName(players[lobby.rolesmap[ROLES.WIFE][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.WIFE].display + ") so "
                + displayName(players[lobby.rolesmap[ROLES.MISTRESS][0]].public, true)
                + " won.");
            
        } else if (mistressRoom != presidentRoom && wifeRoom == presidentRoom) {
            results.winGrey.push(lobby.rolesmap[ROLES.WIFE][0]);
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.WIFE][0]].public, true) 
                + " (the " + ROLE_INFO[ROLES.WIFE].display + ") is in the same room as " 
                + displayName(players[lobby.rolesmap[ROLES.PRESIDENT][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.PRESIDENT].display + ") but not "
                + displayName(players[lobby.rolesmap[ROLES.MISTRESS][0]].public, true)
                + " (the " + ROLE_INFO[ROLES.MISTRESS].display + ") so "
                + displayName(players[lobby.rolesmap[ROLES.WIFE][0]].public, true)
                + " won.");
        } else {
            lobby.endgame_messages.push(displayName(players[lobby.rolesmap[ROLES.MISTRESS][0]].public, true)
                + " (" + ROLE_INFO[ROLES.MISTRESS].display + ") and "
                + displayName(players[lobby.rolesmap[ROLES.WIFE][0]].public, true)
                + " (" + ROLE_INFO[ROLES.WIFE].display + ") both lost.");
        }
    }

    results.endgame_messages = lobby.endgame_messages;

    emitToLobby(lobbyName, "win", results);
    for (var pid of lobby.players) {
        playerNames[players[pid].public.name] = null;
        players[pid] = null;
    }

    console.log("Lobby " + lobbyName + " has finished.");

    lobbies[lobbyName] = null;
    delete lobbies[lobbyName];
};

var roleShareSpecial = function(playerId, targetId) {
    var targetRole = players[targetId].private.role;
    var lobby = lobbies[players[playerId].public.lobby];
    var room = lobby.rooms["room" + players[playerId].public.room]
    switch (players[playerId].private.role) {
        case ROLES.BOOM:
            if (targetRole == ROLES.PRESIDENT) {
                clearInterval(lobby.clock);
                lobby.round.roundNum = lobby.round.maxRoundNum;
                room.players.forEach((pid) => players[pid].public.dead = true);

                lobby.endgame_messages.push(ROLE_INFO[ROLES.BOOM].display + " has met the " + ROLE_INFO[ROLES.PRESIDENT] + " and blew up!") ;
                endRound(lobby.name);
            }
            break;
        case ROLES.KNIGHT:
            if (targetRole == ROLES.BOMBER) {
                clearInterval(lobby.clock);
                lobby.round.roundNum = lobby.round.maxRoundNum;
                room.players.forEach((pid) => {
                    if (players[pid].private.role != ROLES.PRESIDENT) 
                        players[pid].public.dead = true;
                });

                lobby.endgame_messages.push(ROLE_INFO[ROLES.KNIGHT].display + " has met the " + ROLE_INFO[ROLES.BOMBER] 
                    + " and blew them up, saving the president!") ;
                endRound(lobby.name);
            }
            break;
    }
};

app.get("/game/:lobbyName", function(req, res) {
    var lobbyName = req.params["lobbyName"].trim();
    if (lobbyName != "") {
        if (lobbies[lobbyName] == null) {
            createLobby(lobbyName);
        } else if(!lobbies[lobbyName].settings.spectating && lobbies[lobbyName].status != LOBBY_STATUS.PRE_GAME) {
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


var io = require("socket.io")(server);
io.sockets.on("connection", function(socket) {
    var socketId = socket.id;
    var playerId = uniqid();

    socket.on("joinGame", function(data) {
       var uid = addPlayerData(socket, playerId, data);
       emitToPlayer(playerId, "joinGame", uid);
    });

    socket.on("userData", function(data) {
        if (data == null || lobbies[data.lobbyName] == null) return;

        var lobbyName = data.lobbyName;

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
            emitToPlayer(playerId, "userData", players[playerId].public);
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
            emitToPlayer(playerId, "host", playerId);
        }

        lobbies[lobbyName].players.forEach((pid) => emitToPlayer(playerId, "playerJoin", players[pid].public));
        lobbies[lobbyName].players.push(playerId);
        emitToLobby(lobbyName, "playerJoin", players[playerId].public);
    });

    socket.on("startGame", function(data) {
        if (data == null) return;
            
        if (players[playerId].public.host) {
            var lobby = lobbies[players[playerId].public.lobby];
            if (data.gamemode == null) data.gamemode = "Standard";
            if (data.balancing == null) data.balancing = ROLES.GAMBLER;
            if (assignRoles(lobby, data) < 0) {
                return;
            }

            lobbies[players[playerId].public.lobby].settings.spectating = data.spectating;
            lobbies[players[playerId].public.lobby].settings.revealing = data.revealing;

            console.log("Starting lobby " + players[playerId].public.lobby + " with " 
                        + lobbies[players[playerId].public.lobby].players.length + " players with gamemode "
                        + data.gamemode);
            assignRooms(lobby);
            lobby.round.status = ROUND.PRE_ROUND;
            emitToLobby(lobby.name, "setSettings", lobby.settings);
            emitToLobby(lobby.name, "setRound", lobby.round);
        }
    });

    socket.on("shareRole", function(data) {
        if (data == null || players[data.target] == null) return;

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
            data.endgame = false;
            emitToRoom(lobby, room, "shareRole", data);
        } else {
            var roleData = {
                id: data.target,
                role: players[data.target].private.role,
                mutual: true,
                endgame: false
            };
            emitToPlayer(playerId, "revealRole", roleData);

            roleData = {
                id: playerId,
                role: players[playerId].private.role,
                mutual: true,
                endgame: false
            };
            emitToPlayer(data.target, "revealRole", roleData);

            players[playerId].private.role_knowledge.push(data.target);
            players[data.target].private.role_knowledge.push(playerId);

            data.shared = true;
            data.mutual = true;
            data.cancel = false;
            data.endgame = false;
            emitToRoom(lobby, room, "shareRole", data);

            roleShareSpecial(playerId, data.target);
        }
    });

    socket.on("revealRole", function(data) {
        if (data == null || players[data.target] == null) return;

        var room = players[data.target].public.room;
        var lobby = players[data.target].public.lobby;

        if (room != players[playerId].public.room
        ||  lobby != players[playerId].public.lobby)
            return;
        
        var roleData = {
            id: playerId,
            role: players[playerId].private.role,
            mutual: false,
            endgame: false
        };
        emitToPlayer(data.target, "revealRole", roleData);

        players[data.target].private.role_knowledge.push(playerId);

        data.shared = true;
        data.mutual = false;
        data.cancel = false;
        data.endgame = false;
        emitToRoom(lobby, room, "shareRole", data);

        roleShareSpecial(playerId, data.target);
    });

    socket.on("vote", function(data) {
        if (data == null
        ||  players[data.target] == null
        ||  players[data.target].public.room != players[playerId].public.room
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
            players[data.target].public.votes--;

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
        if (data == null
        ||  players[data.target] == null
        ||  players[data.target].public.room != players[playerId].public.room
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
                lobby.round.maxRoundNum = ruleset["roundTimes"].length;

            lobby.round.status = ROUND["ROUND" + lobby.round.roundNum];
            var time = ruleset["roundTimes"][lobby.round.roundNum - 1];
            lobby.round.duration = time * 60 * 1000;
            lobby.round.endtime = new Date().getTime() + lobby.round.duration;
            lobby.clock = setTimeout(endRound, lobby.round.duration, lobby.name);

            lobby.round.transfers = ruleset["hostages"][lobby.round.roundNum - 1];
            emitToLobby(lobby.name, "setRound", lobby.round);
        }
    });

    socket.on("gamblerVote", (data) => makeEndgameDecision(playerId, data));

    socket.on("disconnect", function() {
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

var parseArgs = function(args) {
    var portArg = args.indexOf("-port");
    if (portArg >= 0) port = args[portArg + 1];

    var devArg = args.indexOf("-dev");
    dev = devArg >= 0;
}

parseArgs(args);
server.listen(port);
console.log("Server started on port " + port + ".");
if (dev) console.log("Development mode enabled.");
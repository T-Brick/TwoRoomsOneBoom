var title = document.getElementById("title");
var copyLinkBtn = document.getElementById("copylink");

var socket = io();

var player = {
    name: getCookie("username"),
    id: getCookie("uid"),
    lobby: window.location.pathname.substring("/game/".length),
    host: false,
    anonymous: false,
    room: 0,
    leader: LEADER.NONE,
    votes: 0,
    transfer: false,
    // local vars
    role: "unknown", 
    vote_for: false,
    revealed: false
};
var role;
var players = {};
var rooms;
var lobby_status = LOBBY_STATUS.PRE_GAME;
var clock;
var round = {
    roundNum: 0,
    maxRoundNum: 0,
    status: ROUND.NONE,
    endtime: -1,
    transfers: 0
};

var startGame = function() {
    if (player.host) {
        socket.emit("startGame");
    }
};

var shareRole = function(targetId) {
    if (targetId == player.id)
        return;
    var data = {
        source: player.id,
        target: targetId
    };
    socket.emit("shareRole", data);
};

var revealRole = function(targetId) {
    if (targetId == player.id)
        return;
    var data = {
        source: player.id,
        target: targetId
    };
    socket.emit("revealRole", data);
};

var vote = function(targetId) {
    players[targetId].voted_for = !players[targetId].voted_for;
    var data = {
        source: player.id,
        target: targetId,
        lobby: player.lobby,
        room: player.room
    };
    socket.emit("vote", data);
};

var transfer = function(targetId) {
    if (player.leader == LEADER.IN_OFFICE) {
        data = {
            source: player.id,
            target: targetId,
            lobby: player.lobby,
            room: player.room
        }
        socket.emit("transfer", data);
    }
}

var startRound = function() {
    if (player.host)
        socket.emit("startRound");
}

socket.on("host", function(playerId) {
    if (playerId == player.id)
        player.host = true;
    if (players[playerId] != null)
        players[playerId].host = true;
    updateDisplay();
});

socket.on("playerJoin", function(data) {
    players[data.id] = data;
    players[data.id].role = "unknown";
    updateDisplay();
});

socket.on("playerLeave", function(data) {
    delete players[data.id];
    updateDisplay();
});

socket.on("userData", function(data) {
    player = data;
    players[data.id] = player;
    updateDisplay();
});

socket.on("assignRole", function(data) {
    lobby_status = LOBBY_STATUS.STARTING;
    role = ROLES[data];
    player.role = data;
    console.log("Assigned role: " + role["display"]);
    updateDisplay();
});

socket.on("assignRooms", function(data) {
    rooms = data;
    for (var i of [1,2]) {
        for (var pid of rooms["room" + i].players) {
            players[pid].room = i;
            players[pid].transfer = false;
            players[pid].votes = 0;
            players[pid].vote_for = false;

            if (rooms["room" + i].leader == pid) players[pid].leader = LEADER.IN_OFFICE;
            else players[pid].leader = LEADER.NONE;

            if (pid == player.id)
                player.room = i;
        }
    }
    updateDisplay();
});

socket.on("shareRole", function(data) {
    // TODO: announce sharing
});

socket.on("revealRole", function(data) {
    players[data.id].role = data.role;
    players[data.id].revealed = data.mutual;
    updateDisplay();
});

socket.on("vote", function(data) {
    // TODO: announce voting
    if (data.newLeader) {
        rooms["room" + data.room].leader = data.target;
        for (var pid of rooms["room" + data.room].players) {
            players[pid].leader = LEADER.NONE;
            players[pid].votes = 0;
            players[pid].voting_for = false;
        }
        player.leader = LEADER.NONE;
        player.votes = 0;
        player.voting_for = false;
    }
    players[data.target].leader = data.status;
    players[data.target].votes = data.votes;
    
    if (data.target == player.id)
        player.leader = data.status;

    updateDisplay();
});

socket.on("setRound", function(data) {
    round = data;
    console.log("Round status: " + round.status + " (round " + round.roundNum + ")");
    switch (round.status) {
        case ROUND.NONE:
            genRoundData = lobbyRoundData;
            genPlayerList = lobbyPlayerList;
            break;
        case ROUND.PRE_ROUND:
            genRoundData = preRoundData;
            genPlayerList = preRoundPlayerList;
            break;
        case ROUND.ENDGAME:
            break;
        case ROUND.POSTGAME:
            break;
        default:
            clock = window.setInterval(updateTime, 500);
            genRoundData = runningRoundData;
            genPlayerList = ingamePlayerList;
            break;
    }

    updateDisplay();
});

socket.on("updateRoom", function(data) {
    rooms["room" + player.room] = data;
    for (var pid of data.players) {
        players[pid].transfer = data.transfers.indexOf(pid) >= 0;
    }
    updateDisplay();
});

var joinGame = function() {
    copyLinkBtn.value = window.location.href;

    var userData = {
        playerName: player.name,
        playerId: player.id,
        lobbyName: player.lobby
    };
    
    socket.emit("userData", userData);
};
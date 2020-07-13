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
    revealed: false,
    revealed_for: [],
    shared_for: []
};
var win;
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
        socket.emit("startGame", "standard");
    }
};

var shareRole = function(targetId) {
    if (targetId == player.id)
        return;
    var data = {
        source: player.id,
        target: targetId
    };
    var i = player.shared_for.indexOf(targetId);
    if (i < 0) {
        player.shared_for.push(targetId);
    } else {
        player.shared_for.splice(i, 1);
    }
    socket.emit("shareRole", data);
    updateDisplay();
};

var revealRole = function(targetId) {
    if (targetId == player.id)
        return;
    var data = {
        source: player.id,
        target: targetId
    };
    player.revealed_for.push(targetId);
    socket.emit("revealRole", data);
    updateDisplay();
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

var gamblerVote = function(team) {
    if (ROLES[player.role] == ROLES["gambler"].id) {
        data = {
            id: player.id,
            team: team
        };
        socket.emit("gamblerVote", data);
    }
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
    player.role = "unknown"; 
    player.vote_for = false;
    player.revealed = false;
    player.revealed_for = [];
    player.shared_for = [];
    players[data.id] = player;
    updateDisplay();
});

socket.on("assignRole", function(data) {
    lobby_status = LOBBY_STATUS.STARTING;
    role = ROLES[data];
    player.role = data;
    players[player.id].role = data;
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

socket.on("gamblerVote", function(data) {
    // TODO: announce gambler vote
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
            genRoundData = pregameRoundData;
            genPlayerList = pregameRoundPlayerList;
            break;
        case ROUND.ENDGAME:
            genRoundData = endgameRoundData;
            genPlayerList = endgamePlayerList;
            break;
        case ROUND.POSTGAME:
            genRoundData = postgameRoundData;
            genPlayerList = postgamePlayerList;
            break;
        default:
            clock = window.setInterval(updateTime, 500);
            genRoundData = ingameRoundData;
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

socket.on("win", function(data) {
    win = data.winTeam == ROLES[player.role].team;

    for (var pid of data.winGamblers) {
        if (pid == player.id) {
            win = true;
            break;
        }
    }

    updateDisplay();
});

var rejoinGame = function() {
    window.location = window.location;
}

var joinGame = function() {
    copyLinkBtn.value = window.location.href;

    var userData = {
        playerName: player.name,
        playerId: player.id,
        lobbyName: player.lobby
    };
    
    socket.emit("userData", userData);
};
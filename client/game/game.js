var title = document.getElementById("title");
var copyLinkBtn = document.getElementById("copylink");

var playersList = document.getElementById("playersList");
var playersTitle = document.getElementById("playersTitle");

var settings = document.getElementById("settings");
var gameInfo = document.getElementById("gameInfo");

var round = document.getElementById("round");
var maxRound = document.getElementById("maxRound");
var disp_role = document.getElementById("role");
var goal = document.getElementById("goal");

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

var genPlayerList = pregamePlayerList;

var updatePlayerList = function() {
    // var list = genPlayerList(players, "<table>");
    var list = genPlayerList(players, "", player.id);
    // list[1] += "</table>";

    playersList.innerHTML = list[1];
    playersTitle.innerHTML = "<b>Players (" + list[0] + ")</b>";
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

socket.on("host", function(playerId) {
    if (playerId == player.id) {
        player.host = true;
        settings.style = "display: block;";
    }
    if (players[playerId] != null)
        players[playerId].host = true;
    updatePlayerList();
});

socket.on("playerJoin", function(data) {
    players[data.id] = data;
    players[data.id].role = "unknown";
    updatePlayerList();
});

socket.on("playerLeave", function(data) {
    delete players[data.id];
    updatePlayerList();
});

socket.on("userData", function(data) {
    player = data;
    players[data.id] = player;
    updatePlayerList();
});

socket.on("assignRole", function(data) {
    lobby_status = LOBBY_STATUS.STARTING;
    role = ROLES[data];
    player.role = data;
    console.log("Assigned role: " + role["display"]);

    disp_role.innerHTML = role.display;
    goal.innerHTML = role.goal;

    settings.style = "display: none;";
    gameInfo.style = "display: block;"
    updatePlayerList();
});

socket.on("assignRooms", function(data) {
    rooms = data;
    for (var i of [1,2]) {
        for (var pid of rooms["room" + i].players) {
            players[pid].room = i;
            if (pid == player.id)
                player.room = i;
        }
    }
    genPlayerList = startingPlayerList;
    updatePlayerList();
});

socket.on("shareRole", function(data) {
    // TODO: announce sharing
});

socket.on("revealRole", function(data) {
    players[data.id].role = data.role;
    players[data.id].revealed = data.mutual;
    updatePlayerList();
});

socket.on("vote", function(data) {
    // TODO: announce voting
    if (data.newLeader) {
        for (var pid of rooms["room" + data.room].players) {
            players[pid].leader = LEADER.NONE;
            players[pid].votes = 0;
            players[pid].voting_for = false;
        }
    }
    players[data.target].leader = data.status;
    players[data.target].votes = data.votes;
    updatePlayerList();
});

var joinGame = function() {
    copyLinkBtn.value = window.location.href;

    var userData = {
        playerName: player.name,
        playerId: player.id,
        lobbyName: player.lobby
    };
    
    socket.emit("userData", userData);
}
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
    anonymous: false
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
}

var startGame = function() {
    if (player.host) {
        socket.emit("startGame");
    }
}

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
    console.log("Assigned role: " + role["display"]);

    disp_role.innerHTML = role.display;
    goal.innerHTML = role.goal;

    settings.style = "display: none;";
    gameInfo.style = "display: block;"
    updatePlayerList();
});

socket.on("assignRooms", function(data) {
    rooms = data;
    console.log(data);
    for (var i of [1,2]) {
        for (var pid of rooms["room" + i]) {
            players[pid].room = i;
            if (pid == player.id)
                player.room = i;
        }
    }
    genPlayerList = startingPlayerList;
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
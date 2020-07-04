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
var lobby_status = LOBBY_STATUS.PRE_GAME;

var updatePlayerList = function() {
    var html = "<table>";
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;

        html += "<tr><td style='min-width:100px;'>" + pname + "</td>";
        if (lobby_status == LOBBY_STATUS.PRE_GAME) {
            if (p.host) html += "<th style='min-width:60px;'>Host</th>";
            else html += "<td></td>";
        }
        html += "</tr>"
        count++;
    }
    html += "</table>";

    playersList.innerHTML = html;
    playersTitle.innerHTML = "<b>Players (" + count + ")</b>";
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

var joinGame = function() {
    copyLinkBtn.value = window.location.href;

    var userData = {
        playerName: player.name,
        playerId: player.id,
        lobbyName: player.lobby
    };
    
    socket.emit("userData", userData);
}
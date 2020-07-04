var title = document.getElementById("title");
var copyLinkBtn = document.getElementById("copylink");

var playersList = document.getElementById("playersList");
var playersTitle = document.getElementById("playersTitle");

var settings = document.getElementById("settings");
var gameInfo = document.getElementById("gameInfo");

var socket = io();
const missingNameTitle = "Anonymous";

var player = {
    name: getCookie("username"),
    id: getCookie("uid"),
    lobby: window.location.pathname.substring("/game/".length),
    host: false,
    anonymous: false
};
var players = {};

var updatePlayerList = function() {
    var html = "<table>";
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;

        html += "<tr><td style='min-width:100px;'>" + pname + "</td>";
        if (p.host) html += "<th style='min-width:60px;'>Host</th>";
        else html += "<td></td>";
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

var joinGame = function() {
    var userData = {
        playerName: player.name,
        playerId: player.id,
        lobbyName: player.lobby
    };
    
    socket.emit("userData", userData);
}

copyLinkBtn.value = window.location.href;
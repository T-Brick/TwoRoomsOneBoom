var title = document.getElementById('title');
var copyLinkBtn = document.getElementById("copylink");
var playersList = document.getElementById('playersList');
var playersTitle = document.getElementById('playersTitle');

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
    for (const p of Object.values(players)) {
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

socket.on("host", function() {
    console.log("Set as host");
    host = true;
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
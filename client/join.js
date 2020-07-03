var nameInput = document.getElementById("name-input");
var lobbyInput = document.getElementById("lobby-input");
var joinForm = document.getElementById("join-form");
var errorOutput = document.getElementById("error");

var socket = io();
var known = false;

socket.on("joinGame", function(data) {
    if (data < 0) {
        nameInput.readOnly = false;
        lobbyInput.readOnly = false;

        console.log("Name already in use...");
        errorOutput.innerHTML = "Name is already being used...";
    } else {
        console.log("Set username to " + nameInput.value + " with id = " + data);
        console.log("Joining lobby: " + lobbyInput.value);

        setCookie("username", nameInput.value, 100);
        setCookie("uid", data, 100);

        window.location.href = "./game/" + lobbyInput.value;
    }
});

joinForm.onsubmit = function(e) {
    e.preventDefault();
    if (known) {
        window.location.href = "./game/" + lobbyInput.value;
        return;
    }

    joinGame = {
        playerName: nameInput.value,
        lobbyName: lobbyInput.value,
        anonymous: false
    };

    socket.emit("joinGame", joinGame);

    nameInput.readOnly = true;
    lobbyInput.readOnly = true;
};

var isPlayerKnown = function() {
    var username = getCookie("username");
    var uid = getCookie("uid");
    if (username != "" && uid != "") {
        console.log("Known player... Loading in data");
        
        nameInput.readOnly = true;
        nameInput.setAttribute("value", username);

        known = true;
    }
};
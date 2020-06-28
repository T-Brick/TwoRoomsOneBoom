var nameInput = document.getElementById('name-input');
var joinForm = document.getElementById('join-form');

var socket = io();
var typing = false;

var userId = -1;
var users = [];

// heartbeat
socket.on("heartbeat", function(data) {
    socket.emit("heartbeat", data);
});

socket.on("assignName", function(data) {
    if (data < 0) {
        nameInput.setAttribute("readonly", false);
        console.log("Name already in use...");
    } else {
        console.log("Set username to " + nameInput.value + " with id = " + data);
        userId = data;
    }
});

joinForm.onsubmit = function(e) {
    e.preventDefault();

    socket.emit("assignName", nameInput.value);
    nameInput.setAttribute("readonly", true);
    // nameInput.value = "";
}
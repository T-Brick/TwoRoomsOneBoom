var nameInput = document.getElementById('name-input');
var roomInput = document.getElementById('room-input');
var joinForm = document.getElementById('join-form');

var socket = io();

socket.on("userData", function(data) {
    console.log(data.name + "\t" + data.id + "\t" + data.room);
});
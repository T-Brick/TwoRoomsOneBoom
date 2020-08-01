var playersList = document.getElementById("playersList");
var playersTitle = document.getElementById("playersTitle");

// settings
var settings_disp = document.getElementById("settings");
var gamemode_list_disp = document.getElementById("gamemode_list");
var revealing_disp = document.getElementById("revealing");

// preround
var preRoundBox_disp = document.getElementById("preRoundBox");
var startRound_disp = document.getElementById("startRound");

// round
var gameInfoBox_disp = document.getElementById("gameInfoBox");
var timer_disp = document.getElementById("timer");
var round_disp = document.getElementById("round");
var maxRound_disp = document.getElementById("maxRounds");

var role_name_disp = document.getElementById("role");
var role_desc_disp = document.getElementById("role_desc");
var goal_disp = document.getElementById("goal");

var chat_disp = document.getElementById("chat");

// endgame
var endgameBox_disp = document.getElementById("endgameBox");
var waiting_disp = document.getElementById("waiting");
var gambler_disp = document.getElementById("gambler");

// postgame
var postgameBox_disp = document.getElementById("postgameBox");
var win_disp = document.getElementById("you_win");
var lose_disp = document.getElementById("you_lose");

const displayName = function(player, bold = false) {
    var name;
    if (player.anonymous) name = missingNameTitle + " " + player.name;
    else name = player.name;

    if (bold) name = "<b>" + name + "</b>";

    return name;
}

const lobbyPlayerList = function(html) {
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        pname = displayName(p);

        html += "<div class='player playerList" + count % 2 + "'>"
        if (p.host) html += "<div id='pregame_host'><strong>Host</strong></div>"
        html += "<div class='pregame_player_name'>" + pname + "</div></div>";

        count++;
    }
    return [count, html];
}

const pregameRoundPlayerList = function(html) {
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        pname = displayName(p);

        if (p.transfer) pname = "<em>" + pname + "</em>";
        if (p.leader == LEADER.IN_OFFICE) pname = "<strong>" + pname + "</strong>";
        else if (p.votes != 0) pname += " <b>(" + p.votes + ")</b>";

        if (p.room == player.room) {
            html += "<div class='player playerList" + count % 2 + "'>";

            html += "<div class='ingame ingame_player_first_group'>";
            html += "<div id='ingame_player_name'>" + pname + "</div>";
            html += "</div>";

            var disp_role = "<div id='ingame_player_role'>" + ROLES[p.role].display + "</div>";
            html += "<div class='ingame ingame_player_role_group'>";
            html += disp_role;
            html += "</div>";

            html += "</div>";
            count++;
        }
    }
    return [count, html];
}

const startingPlayerList = pregameRoundPlayerList;

const ingamePlayerList = function(html) {
    var pname;
    var count = 0;
    var p;
    for (const pid of rooms["room" + player.room].players) {
        p = players[pid];
        pname = displayName(p);

        if (p.transfer) pname = "<em>" + pname + "</em>";
        if (p.leader == LEADER.IN_OFFICE) pname = "<strong>" + pname + "</strong>";
        else if (p.votes != 0) pname += " <b>(" + p.votes + ")</b>";

        html += "<div class='player playerList" + count % 2 + "'>";

        html += "<div class='ingame ingame_player_first_group'>";
        html += "<div id='ingame_player_name'>" + pname + "</div>";
        if (player.leader == LEADER.IN_OFFICE) {
            if (p.id != player.id) {
                html += "<input class='btn' id='leader_btn' type='button' onclick='transfer(\"" + p.id + "\")' ";
                if (p.transfer)
                    html += "value='Cancel Transfer'></input>";
                else
                    html += "value='Transfer'></input>";
            } else {
                // TODO: add resigning
            }
        }
        if (player.leader != LEADER.IN_OFFICE) {
            if (p.leader == LEADER.NONE) {
                html += "<input class='btn' id='leader_btn' type='button' value='Nominate' onclick='vote(\"" + p.id + "\")'></input>";
            } else if (p.leader == LEADER.NOMINATED && !p.voted_for) {
                html += "<input class='btn' id='leader_btn' type='button' value='Vote' onclick='vote(\"" + p.id + "\")'></input>";
            } else if (p.leader == LEADER.NOMINATED && p.voted_for) {
                html += "<input class='btn' id='leader_btn' type='button' value='Unvote' onclick='vote(\"" + p.id + "\")'></input>";
            }
        }
        html += "</div>";

        var disp_role = "<div id='ingame_player_role'>" + ROLES[p.role].display + "</div>";
        html += "<div class='ingame ingame_player_role_group'>";
        
        if (p.id != player.id) {
            if (p.role == "unknown") {
                var shareTitle = "";
                if (player.shared_for.indexOf(p.id) < 0) shareTitle = "Share Role";
                else shareTitle = "Unshare Role";

                html += "<input class='btn' id='share_role_btn' type='button' value='" + shareTitle + "' ";
                html += "onclick='shareRole(\"" + p.id + "\")'></input>";
            } else {
                html += disp_role;
            }
            if (settings.revealing && !p.revealed && player.revealed_for.indexOf(p.id) < 0) {
                html += "<input class='btn' id='reveal_role_btn' type='button' value='Reveal Role' ";
                html += "onclick='revealRole(\"" + p.id + "\")'></input>";
            }
        } else {
            html += disp_role;
        }
        html += "</div>";

        html += "</div>";
        count++;
    }
    return [count, html];
}

const endgamePlayerList = function(html) {
    var pname;
    var count = 0;
    var createList = function(roomNum) {
        var p;
        for (const pid of rooms["room" + roomNum].players) {
            p = players[pid];
            pname = displayName(p);

            html += "<div class='player playerList" + count % 2 + "'>";

            html += "<div class='ingame ingame_player_first_group'>";
            html += "<div id='ingame_player_name'>" + pname + "</div>";
            html += "</div>";

            html += "<div class='ingame ingame_player_role_group'>";
            html += "<div id='ingame_player_role'>" + ROLES[p.role].display + "</div>";
            html += "</div>";

            html += "</div>";

            count++;
        }
    }

    createList(1);
    html += "<br /><br />";
    createList(2);

    return [count, html];
}

const postgamePlayerList = endgamePlayerList;

const clearDisplay = function() {
    settings_disp.style = "display: none;";
    chat_disp.style = "display: none;";

    preRoundBox_disp.style = "display: none;";
    startRound_disp.style = "display: none;";

    gameInfoBox_disp.style = "display: none;";

    endgameBox_disp.style = "display: none;";
    waiting_disp.style = "display: none;";
    gambler_disp.style = "display: none;";

    postgameBox_disp.style = "display: none;";
    win_disp.style = "display: none;";
    lose_disp.style = "display: none;";
}

const lobbyRoundData = function() {
    clearDisplay();

    if(player.host)
        settings_disp.style = "display: block;";
}

const startingRoundData = function() {
    clearDisplay();
};

const pregameRoundData = function() {
    clearDisplay();
    preRoundBox_disp.style = "display: block;";

    if (player.host)
        startRound_disp.style = "display: block;";
    chat_disp.style = "display: block;";
};

const ingameRoundData = function() {
    role_name_disp.innerHTML = role.display;
    role_desc_disp.innerHTML = role.description;
    goal_disp.innerHTML = role.goal;

    round_disp.innerHTML = round.roundNum;
    maxRound_disp.innerHTML = round.maxRoundNum;

    clearDisplay();
    gameInfoBox_disp.style = "display: block;";
    chat_disp.style = "display: block;";
};

const endgameRoundData = function() {
    clearDisplay();
    endgameBox_disp.style = "display: block;";
    chat_disp.style = "display: block;";
    switch (player.role) {
        case "gambler":
            gambler_disp.style = "display: block;";
            break;
        default:
            waiting_disp.style = "display: block;";
            break;
    }
};

const postgameRoundData = function() {
    clearDisplay();
    postgameBox_disp.style = "display: block;";
    chat_disp.style = "display: block;";
    if (win) {
        win_disp.style = "display: block;";
    } else {
        lose_disp.style = "display: block;";
    }
};

const updateTime = function() {
    var time_ms = round.endtime - new Date().getTime();
    if (time_ms < 0) {
        clearInterval(clock);
        timer_disp.innerHTML = "0:00";
        return;
    }
    var time_min = Math.floor(time_ms / (1000 * 60));
    var time_sec = Math.floor(time_ms / 1000 % 60);

    timer_disp.innerHTML = time_min + ":" + (time_sec < 10 ? "0" + time_sec : time_sec);
}

var genChat = function() {
    var html = "";
    chatlog.forEach(c => html += "<div class='msg'>" + c + "</div>");
    chat_disp.innerHTML = html;
    chat_disp.scrollTop = chat_disp.scrollHeight;
}

var genPlayerList = lobbyPlayerList;
var genRoundData = lobbyRoundData;

const updateDisplay = function() {
    var list = genPlayerList("");
    genRoundData();
    genChat();

    playersList.innerHTML = list[1];
    playersTitle.innerHTML = "<b>Players (" + list[0] + ")</b>";
};
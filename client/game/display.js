var playersList = document.getElementById("playersList");
var playersTitle = document.getElementById("playersTitle");

var settings = document.getElementById("settings");
var gameInfo = document.getElementById("gameInfo");

var roundText = document.getElementById("round");
var maxRound = document.getElementById("maxRounds");
var timer = document.getElementById("timer");

var disp_role = document.getElementById("role");
var goal = document.getElementById("goal");

var preRoundBox = document.getElementById("preRoundBox");
var startRoundBox = document.getElementById("startRoundBox");

const lobbyPlayerList = function(players, html) {
    var pname;
    var count = 0;
    var colours = ["white", "lightgrey"];
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;

        html += "<div class='player playerList" + count % 2 + "'>"
        if (p.host) html += "<div id='pregame_host'><strong>Host</strong></div>"
        html += "<div class='pregame_player_name'>" + pname + "</div></div>";

        count++;
    }
    return [count, html];
}

const preRoundPlayerList = function(players, html) {
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;

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

const startingPlayerList = preRoundPlayerList;

const ingamePlayerList = function(players, html) {
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;

        if (p.transfer) pname = "<em>" + pname + "</em>";
        if (p.leader == LEADER.IN_OFFICE) pname = "<strong>" + pname + "</strong>";
        else if (p.votes != 0) pname += " <b>(" + p.votes + ")</b>";

        if (p.room == player.room) {
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
                    html += "<input class='btn' id='share_role_btn' type='button' value='Share Role' ";
                    html += "onclick='shareRole(\"" + p.id + "\")'></input>";
                } else {
                    html += disp_role;
                }
                if (!p.revealed) {
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
    }
    return [count, html];
}

const lobbyRoundData = function() {
    if(player.host)
        settings.style = "display: block;";
}

const startingRoundData = function() {
    settings.style = "display: none;";
};

const preRoundData = function() {
    settings.style = "display: none;";
    gameInfo.style = "display: none;";
    preRoundBox.style = "display: block;";

    if (player.host)
        startRoundBox.style = "display: block;";
};

const runningRoundData = function() {
    disp_role.innerHTML = role.display;
    goal.innerHTML = role.goal;

    roundText.innerHTML = round.roundNum;
    maxRound.innerHTML = round.maxRoundNum;

    startRoundBox.style = "display: none;";
    preRoundBox.style = "display: none;";
    settings.style = "display: none;";
    gameInfo.style = "display: block;";
};

const updateTime = function() {
    var time_ms = round.endtime - new Date().getTime();
    if (time_ms < 0) {
        clearInterval(clock);
        timer.innerHTML = "0:00";
        return;
    }
    var time_min = Math.floor(time_ms / (1000 * 60));
    var time_sec = Math.floor(time_ms / 1000 % 60);

    timer.innerHTML = time_min + ":" + (time_sec < 10 ? "0" + time_sec : time_sec);
}

var genPlayerList = lobbyPlayerList;
var genRoundData = lobbyRoundData;

const updateDisplay = function() {
    var list = genPlayerList(players, "");
    genRoundData();

    playersList.innerHTML = list[1];
    playersTitle.innerHTML = "<b>Players (" + list[0] + ")</b>";
};
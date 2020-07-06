const pregamePlayerList = function(players, html) {
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

const startingPlayerList = function(players, html, playerId) {
    // TODO: make seperate
    return ingamePlayerList(players, html, playerId);
}

const ingamePlayerList = function(players, html, playerId) {
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
            if (players[playerId].leader == LEADER.IN_OFFICE) {
                if (p.id != playerId) {
                    html += "<input class='btn' id='leader_btn' type='button' value='Transfer' "
                    html += "onclick='transfer(\"" + p.id + "\")'></input>";
                } else {
                    // TODO: add resigning
                }
            }
            if (p.leader == LEADER.NONE) {
                html += "<input class='btn' id='leader_btn' type='button' value='Nominate' onclick='vote(\"" + p.id + "\")'></input>";
            } else if (p.leader == LEADER.NOMINATED && !p.voted_for) {
                html += "<input class='btn' id='leader_btn' type='button' value='Vote' onclick='vote(\"" + p.id + "\")'></input>";
            } else if (p.leader == LEADER.NOMINATED && p.voted_for) {
                html += "<input class='btn' id='leader_btn' type='button' value='Unvote' onclick='vote(\"" + p.id + "\")'></input>";
            }
            html += "</div>";

            var disp_role = "<div id='ingame_player_role'>" + ROLES[p.role].display + "</div>";
            html += "<div class='ingame ingame_player_role_group'>";
            
            if (p.id != playerId) {
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
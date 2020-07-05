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

const startingPlayerList = function(players, html) {
    // TODO: make seperate
    return ingamePlayerList(players, html);
}

const ingamePlayerList = function(players, html, playerId) {
    var pname;
    var count = 0;
    for (const p of Object.values(players).sort()) {
        if (p.anonymous) pname = missingNameTitle + " " + p.name;
        else pname = p.name;


        if (p.transfer) pname = "<em>" + pname + "</em>";
        if (p.leader == LEADER.IN_OFFICE) pname = "<strong>" + pname + "</strong>";
        else if (p.votes != 0) pname += pname + " <b>(" + p.votes + ")</b>";

        if (p.room == player.room) {
            html += "<div class='player playerList" + count % 2 + "'>";

            html += "<div class='ingame ingame_player_first_group'>";
            html += "<div id='ingame_player_name'>" + pname + "</div>";
            switch (p.leader) {
                case LEADER.NONE:
                    html += "<input class='btn' id='leader_btn' type='button' value='Nominate' onclick='vote(" + p.id + ")'></input>";
                    break;
                case LEADER.NOMINATED:
                    html += "<input class='btn' id='leader_btn' type='button' value='Vote' onclick='vote(" + p.id + ")'></input>";
                    break;
                case LEADER.VOTED:
                    html += "<input class='btn' id='leader_btn' type='button' value='Unvote' onclick='vote(" + p.id + ")'></input>";
                    break;
                case LEADER.IN_OFFICE:
                    if (p.id != playerId)
                        html += "<input class='btn' id='leader_btn' type='button' value='Transfer' onclick='transfer(" + p.id + ")'></input>";
                    break;
            }
            html += "</div>";

            html += "<div class='ingame ingame_player_role_group'>";
            html += "<div id='ingame_player_role'>" + ROLES[p.role].display + "</div>";
            html += "<input class='btn' id='share_role_btn' type='button' value='Share Role' onclick='shareRole(" + p.id + ")'></input>";
            html += "</div>";

            html += "</div>";
            count++;
        }
    }
    return [count, html];
}
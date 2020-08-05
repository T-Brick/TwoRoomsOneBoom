missingNameTitle = "Anonymous";

LOBBY_STATUS = {
    PRE_GAME: "pre_game",
    STARTING: "starting",
    PRE_ROUND: "pre_round",
    IN_GAME: "in_game",
    END_GAME: "end_game",
    POST_GAME: "post_game",
    PAUSED: "pause"
};

CONNECTION = {
    OK: 0,
    INVALID: -1,
    NAME_USED: -100,
    LOBBY_STARTED: -200
};


LEADER = {
    NONE: "none",
    NOMINATED: "nominated",
    IN_OFFICE: "in_office"
};

ROUND = {
    NONE: "none",
    PRE_ROUND: "pre_round",
    ROUND1: "round1",
    ROUND2: "round2",
    ROUND3: "round3",
    ROUND4: "round4",
    ROUND5: "round5",
    ENDGAME: "endgame",
    POSTGAME: "postgame"
};

displayName = function(player, bold = false) {
    var name;
    if (player.anonymous) name = missingNameTitle + " " + player.name;
    else name = player.name;

    if (bold) name = "<b>" + name + "</b>";

    return name;
}
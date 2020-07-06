missingNameTitle = "Anonymous";

LOBBY_STATUS = {
    PRE_GAME: "pre_game",
    STARTING: "starting",
    IN_GAME: "in_game",
    PAUSED: "pause"
};

CONNECTION = {
    OK: 0,
    INVALID: -1,
    NAME_USED: -100,
    LOBBY_STARTED: -200
};

ROLES = {
    "unknown": {
        id: 0,
        display: "Unknown",
        team: "unknown",
        goal: "Unknown."
    },
    "president": {
        id: 100,
        display: "President",
        team: "blue",
        goal: "Be in a room without the bomber at the end of the game."
    },
    "blue": {
        id: 101,
        display: "Blue Team",
        team: "blue",
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game."
    },
    "bomber": {
        id: 200,
        display: "Bomber",
        team: "red",
        goal: "Be in the same room as the president at the end of the game."
    },
    "red": {
        id: 201,
        display: "Red Team",
        team: "red",
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game."
    },
    "gambler": {
        id: 300,
        display: "Gambler",
        team: "grey",
        goal: "Correctly select which team is going to win the game at the end of the game."
    }
};

LEADER = {
    NONE: "none",
    NOMINATED: "nominated",
    IN_OFFICE: "in_office"
};
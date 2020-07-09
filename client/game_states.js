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

ROLES = {
    "unknown": {
        id: 0,
        display: "Unknown",
        description: "Unknown.",
        team: "unknown",
        goal: "Unknown."
    },
    "president": {
        id: 100,
        display: "President",
        description: "The primary character for the blue team.",
        team: "blue",
        goal: "Be alive at the end of the game by ending the game in the room without the bomber."
    },
    "blue": {
        id: 101,
        display: "Blue Team",
        description: "Keep the president alive.",
        team: "blue",
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game."
    },
    "bomber": {
        id: 200,
        display: "Bomber",
        description: "The primary character for the red team. Everyone in the same room as you at the end of the game gains the “dead” condition if you are still alive.",
        team: "red",
        goal: "Kill the president by ending the game in the same room as them."
    },
    "red": {
        id: 201,
        display: "Red Team",
        description: "Help kill the president.",
        team: "red",
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game."
    },
    "gambler": {
        id: 300,
        display: "Gambler",
        description: "After the end of the last round, before player cards are revealed, select the team you believed to have won the game.",
        team: "grey",
        goal: "Correctly select which team is going to win the game at the end of the game."
    }
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
missingNameTitle = "Anonymous";

TEAM = {
    UNKNOWN: "unknown",
    BLUE: "blue",
    RED: "red",
    GREY: "grey"
};

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
        team: TEAM.UNKNOWN,
        goal: "Unknown.",
        endgame_pause_val: 0
    },
    "president": {
        id: 100,
        display: "President",
        description: "The primary character for the blue team. If the doctor is in play you must card-share with them before the end of the game.",
        team: TEAM.BLUE,
        goal: "Be alive at the end of the game by ending the game in the room without the bomber.",
        endgame_pause_val: 0
    },
    "doctor": {
        id: 110,
        display: "Doctor",
        description: "The secondary character for the blue team.",
        team: TEAM.BLUE,
        goal: "You must card-share with the president before the game is over for the blue team to win.",
        endgame_pause_val: 0
    },
    "knight": {
        id: 120,
        display: "Tuesday Knight",
        description: "You have the HUG power, when you card share with the bomber everyone in the room dies except the president and the game ends.",
        team: TEAM.RED,
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game, or card-share with the bomber.",
        endgame_pause_val: 0
    },
    "blue": {
        id: 150,
        display: "Blue Team",
        description: "Keep the president alive.",
        team: TEAM.BLUE,
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game.",
        endgame_pause_val: 0
    },
    "bomber": {
        id: 200,
        display: "Bomber",
        description: "The primary character for the red team. Everyone in the same room as you at the end of the game gains the \“dead\” condition if you are still alive. If the engineer is in play you must card-share with them before the end of the game.",
        team: TEAM.RED,
        goal: "Kill the president by ending the game in the same room as them.",
        endgame_pause_val: 0
    },
    "engineer": {
        id: 210,
        display: "Engineer",
        description: "The secondary character for the red team.",
        team: TEAM.RED,
        goal: "You must card-share with the bomber before the game is over for the red team to win.",
        endgame_pause_val: 0
    },
    "boom": {
        id: 220,
        display: "Dr. Boom",
        description: "You have the BOOM power, when you card share with the president everyone in the room dies and the game ends.",
        team: TEAM.RED,
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game, or card-share with the president.",
        endgame_pause_val: 0
    },
    "red": {
        id: 250,
        display: "Red Team",
        description: "Help kill the president.",
        team: TEAM.RED,
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game.",
        endgame_pause_val: 0
    },
    "gambler": {
        id: 300,
        display: "Gambler",
        description: "After the end of the last round, before player cards are revealed, select the team you believed to have won the game.",
        team: TEAM.GREY,
        goal: "Correctly select which team is going to win the game at the end of the game.",
        endgame_pause_val: 10
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
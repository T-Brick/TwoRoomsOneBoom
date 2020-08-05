TEAM = {
    UNKNOWN: "unknown",
    BLUE: "blue",
    RED: "red",
    GREY: "grey"
};

ROLES = {
    UNKNOWN: "unknown",
    PRESIDENT: "president",
    DOCTOR: "doctor",
    BOOM: "boom",
    BLUE_TEAM: "blue",
    BOMBER: "bomber",
    ENGINEER: "engineer",
    KNIGHT: "knight",
    RED_TEAM: "red",
    GAMBLER: "gambler",
    RIVAL: "rival",
    SURVIVOR: "survivor",
    INTERN: "intern",
    VICTIM: "victim",
    AHAB: "ahab",
    MOBY: "moby",
    WIFE: "wife",
    MISTRESS: "mistress",
    MI6: "mi6"
};

ROLE_INFO = {
    "unknown": {
        id: 0,
        display: "Unknown",
        description: "Unknown.",
        team: TEAM.UNKNOWN,
        goal: "Unknown.",
        endgame_pause_val: 0,
        buriable: false
    },
    "president": {
        id: 100,
        display: "President",
        description: "The primary character for the blue team. If the doctor is in play you must card share with them before the end of the game.",
        team: TEAM.BLUE,
        goal: "Be alive at the end of the game by ending the game in the room without the bomber.",
        endgame_pause_val: 0,
        buriable: false
    },
    "doctor": {
        id: 110,
        display: "Doctor",
        description: "The secondary character for the blue team.",
        team: TEAM.BLUE,
        goal: "Card share with the president before the game is over for the blue team to win.",
        endgame_pause_val: 0,
        buriable: false
    },
    "boom": {
        id: 120,
        display: "Dr. Boom",
        description: "You have the BOOM power, when you card share with the president everyone in the room dies and the game ends.",
        team: TEAM.BLUE,
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game. Don't card share with the president.",
        endgame_pause_val: 0,
        buriable: true
    },
    "blue": {
        id: 150,
        display: "Blue Team",
        description: "Keep the president alive.",
        team: TEAM.BLUE,
        goal: "Assist the president by having the president and the bomber in different rooms at the end of the game.",
        endgame_pause_val: 0,
        buriable: true
    },
    "bomber": {
        id: 200,
        display: "Bomber",
        description: "The primary character for the red team. Everyone in the same room as you at the end of the game gains the \“dead\” condition if you are still alive. If the engineer is in play you must card share with them before the end of the game.",
        team: TEAM.RED,
        goal: "Kill the president by ending the game in the same room as them.",
        endgame_pause_val: 0,
        buriable: false
    },
    "engineer": {
        id: 210,
        display: "Engineer",
        description: "The secondary character for the red team.",
        team: TEAM.RED,
        goal: "Card share with the bomber before the game is over for the red team to win.",
        endgame_pause_val: 0,
        buriable: true
    },
    "knight": {
        id: 220,
        display: "Tuesday Knight",
        description: "You have the HUG power, when you card share with the bomber everyone in the room dies except the president and the game ends.",
        team: TEAM.RED,
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game. Don't card share with the bomber.",
        endgame_pause_val: 0,
        buriable: true
    },
    "red": {
        id: 250,
        display: "Red Team",
        description: "Help kill the president.",
        team: TEAM.RED,
        goal: "Assist the bomber by having the president and the bomber in the same room at the end of the game.",
        endgame_pause_val: 0,
        buriable: true
    },
    "gambler": {
        id: 300,
        display: "Gambler",
        description: "After the end of the last round, before player cards are revealed, select the team you believed to have won the game.",
        team: TEAM.GREY,
        goal: "Correctly select which team is going to win the game at the end of the game.",
        endgame_pause_val: 10,
        buriable: true
    },
    "rival": {
        id: 310,
        display: "Rival",
        description: "Try to end the game in the room without the president.",
        team: TEAM.GREY,
        goal: "End the game in the room without the president.",
        endgame_pause_val: 0,
        buriable: true
    },
    "survivor": {
        id: 311,
        display: "Survivor",
        description: "Try to end the game in the room without the bomber.",
        team: TEAM.GREY,
        goal: "End the game in the room without the bomber.",
        endgame_pause_val: 0,
        buriable: true
    },
    "intern": {
        id: 320,
        display: "Intern",
        description: "Try to end the game in the room with the president.",
        team: TEAM.GREY,
        goal: "End the game in the room with the president.",
        endgame_pause_val: 0,
        buriable: true
    },
    "victim": {
        id: 321,
        display: "Victim",
        description: "Try to end the game in the room with the bomber.",
        team: TEAM.GREY,
        goal: "End the game in the room with the bomber.",
        endgame_pause_val: 0,
        buriable: true
    },
    "ahab": {
        id: 330,
        display: "Ahab",
        description: "Kill Moby and survive to this time.",
        team: TEAM.GREY,
        goal: "End the game with Moby in the same room as the bomber and you in the other room.",
        endgame_pause_val: 0,
        buriable: false
    },
    "moby": {
        id: 331,
        display: "Moby",
        description: "Kill Ahab and survive to win one for the whales.",
        team: TEAM.GREY,
        goal: "End the game with Ahab in the same room as the bomber and you in the other room.",
        endgame_pause_val: 0,
        buriable: false
    },
    "wife": {
        id: 340,
        display: "Wife",
        description: "Stand by your vows by being with the president.",
        team: TEAM.GREY,
        goal: "End the game in the same room as the president but without the mistress there.",
        endgame_pause_val: 0,
        buriable: false
    },
    "mistress": {
        id: 341,
        display: "Mistress",
        description: "Feel the power in being the other women.",
        team: TEAM.GREY,
        goal: "End the game in the same room as the president but without the wife there.",
        endgame_pause_val: 0,
        buriable: false
    },
    "mi6": {
        id: 350,
        display: "MI6",
        description: "Identify the president and the bomber by card sharing with them.",
        team: TEAM.GREY,
        goal: "Card share with both the president and the bomber by the end of the game.",
        endgame_pause_val: 0,
        buriable: true
    }
};
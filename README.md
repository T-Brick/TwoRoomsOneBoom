# Two Rooms and a Boom
Web versions of the game [Two Rooms and a Boom](https://www.tuesdayknightgames.com/tworoomsandaboom) (6-30 players) which can be played over a VOIP service or in-person using phones.

Players may select a name and a lobby name to create one. 
The first player to join a lobby becomes the host of it, and defines the rules for the game. They also are able to indicate when everyone is ready to start the next round.

## Dependencies

Developed on Node.js v12.18.1
Dependencies can be installed using npm, more info can be found in `./package.json` and `./package-lock.json`.

## Starting the server

Running `node server.js` launches the server with the default port of 80.

Add `-port [port number]` flag to specify a different port.
Add `-dev` flag to run the server in development mode (allows launch games with fewer players than required).

## Game Settings

Game-mode information can be found in `./game_settings.json`.
Role information can be found in `./client/roles.js`.

## Implemented Gamemodes
* Standard (6-30 players) - President and Bomber with Blue/Red Team roles filling the rest.
* Instant Death (6-7 players) - President, Bomber, Doctor, Engineer, Tuesday Knight, and Dr. Boom.
* At Least One Loser (6-7 players) - President, Bomber, Rival, Intern, Survivor, and Victim.
* A Game of Love and Hate (6-7 players) - President, Bomber, Ahab, Moby, Wife, and Mistress.
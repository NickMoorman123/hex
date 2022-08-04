# hex
2-player web based game written in JavaScript utilizing [Firebase](firebase.google.com)

Hex is a two-player game in which you place tiles on an 11x11 diamond-shaped grid of hexagons in order to create a path between your two opposing sides, which blocks your opponent from doing the same.

This web app utilizes Google's Firebase Realtime Database to relay information on game status between the two players within a game. Interactions with the web page fire off asynchronous getter and setter methods to check and update information in the database, while listeners await updates from your opponent. Authentication is anonymous but the Firebase Rules have been set up to prevent frivolous data writing and reading.

The game can be played [here](https://hex-game-d982b.web.app).

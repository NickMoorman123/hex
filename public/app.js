import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-app.js";
import { getDatabase, ref, get, update, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-auth.js";

/*
Interacting with the Firebase Realtime Database is done with getters, setters, and listeners:
-The get function provides a snapshot of the data in the database reference provided at the time the
get function call (asynchronously) reached Google's server
-The update function sends a request out to add or edit information to your provided reference
-The onValue function is a listener that reacts when there are changes to the database, which would
include any changes you made
-The onDisconnect function is a listener that reacts when the browser leaves the page

Permissions to read and write are determined by Firebase Rules
*/

// this looks crazy insecure but is actually perfectly correct to include per Firebase instructions
const firebaseConfig = { 
apiKey: `AIzaSyBp7KVrEne2uV3Rtk4U4p-UYuonO-jBmd8`,
authDomain: `hex-game-d982b.firebaseapp.com`,
databaseURL: `https://hex-game-d982b-default-rtdb.firebaseio.com`,
projectId: `hex-game-d982b`,
storageBucket: `hex-game-d982b.appspot.com`,
messagingSenderId: `393175293244`,
appId: `1:393175293244:web:a20d0d264c06835382d239`
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseDB = getDatabase(firebaseApp);
const firebaseAuth = getAuth();

var gameRef;
var isHost;
const largeHeader = document.getElementById(`large`);
const smallHeader = document.getElementById(`small`);
const boardSize = 11;
const cellDivs = document.querySelector(`.cell`);
const cells = [...new Array(boardSize)].map(() => 
                [...new Array(boardSize)].map(() => 
                    document.createElement(`div`)));
const hostCell = 1;
const guestCell = 2;

function parseURL() {
    if (window.location.search.length == 0) {
        isHost = true;
        return;
    }
    isHost = false;

    if (window.location.search.substring(0, 8) != `?gameid=`) {
        window.location.replace(window.location.origin);
    }
}

function makeid() {
    return [...new Array(30)].map(() => randomChar()).join(``);
}

function randomChar() {
    const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
    const charactersLength = characters.length;
    return characters.charAt(Math.floor(Math.random() * charactersLength))
}

// We initialize with these loops because the grid is turned 45 degrees on its side, and it makes things easy to add the cells top to bottom
function addCells() {
    for (let i = boardSize - 1; i > 0; i--) {
        let row = 0;
        let col = i;
        while (col < boardSize) {
            cells[row][col].addEventListener(`click`, clickCell(row, col));
            cellDivs.appendChild(cells[row][col]);
            row++;
            col++;
        }
        cellDivs.appendChild(document.createElement(`br`));
    }
    for (let i = 0; i < boardSize; i++) {
        let row = i;
        let col = 0;
        while (row < boardSize) {
            cells[row][col].addEventListener(`click`, clickCell(row, col));
            cellDivs.appendChild(cells[row][col]);
            row++;
            col++;
        }
        cellDivs.appendChild(document.createElement(`br`));
    }
}

function clickCell(row, col) {
    return () => get(gameRef).then((snapshot) => {
        if (snapshot.val().guestTurn != !isHost) return;

        let newBoard = snapshot.val().board;
        if (newBoard[row][col] != 0) return;
        
        newBoard[row][col] = isHost ? hostCell : guestCell;

        let updateData = {
            board: newBoard,
            lastClick: [row, col],
            guestTurn: !snapshot.val().guestTurn
        };

        if (checkWin(newBoard)) {
            updateData.winner = isHost;
        }

        update(gameRef, updateData).catch((error) => {
            largeHeader.textContent = error;
            console.error(error);
        });
    }).catch((error) => {
        console.error(error);
    });
}

function addGoals() {
    let line1 = document.querySelector(`.line1`);
    let line2 = document.querySelector(`.line2`);

    line1.className = isHost ? `line1host` : `line1guest`;
    line2.className = isHost ? `line2host` : `line2guest`;
}

// depth-first search to see if we can reach one end of the board from the other
function checkWin(gameBoard) {
    let visited = [...new Array(boardSize)].map(() => new Array(boardSize).fill(false));

    // directions is a circular list of the ways to move to adjacent hexagons, counter-clockwise for host
    // but we need to mirror them for the guest since the guest has mirrored goal sides
    if (isHost) {
        let directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
        for (let col = boardSize - 1; col > -1; col--) {
            if (move(gameBoard, visited, directions, 0, col, 0, boardSize - 1)) {
                return true;
            }
        }
    } else {
        try {
        let directions = [[0, -1], [-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1]];
        for (let row = 0; row < boardSize; row++) {
            if (move(gameBoard, visited, directions, row, boardSize - 1, 0, 0)) {
                return true;
            }
        }
    } catch (err) {
        largeHeader.textContent = err;
    }
    }
    
    return false;
}

// each time we move, if we can continue moving, we will check a left turn, continuing straight, or a right turn
function move(gameBoard, visited, directions, row, col, dirIndex, goal) {
    if (row == -1 || row == boardSize || col == -1 || col == boardSize) return false;
    if (gameBoard[row][col] != (isHost ? hostCell : guestCell)) return false;
    if (visited[row][col]) return false;

    visited[row][col] = true;

    if ((isHost ? row : col) == goal) return true;

    let newDir = fixedModSix(dirIndex + 1);
    if (move(gameBoard, visited, directions, row + directions[newDir][0], col + directions[newDir][1], newDir, goal)) return true;
    
    if (move(gameBoard, visited, directions, row + directions[dirIndex][0], col + directions[dirIndex][1], dirIndex, goal)) return true;

    newDir = fixedModSix(dirIndex - 1);
    if (move(gameBoard, visited, directions, row + directions[newDir][0], col + directions[newDir][1], newDir, goal)) return true;

    return false;
}

function fixedModSix(n) {
    return ((n % 6) + 6) % 6;
}

function setSmallHeaderOnDisconnect() {
    if (isHost) {
        smallHeader.textContent = `Refresh the page to host a new game`;
    } else {
        smallHeader.innerHTML = `Go here to host a new game: <a href=\"/\">${window.location.origin}</a>`;
    }
}

function setDBListener() {
    onValue(gameRef, (snapshot) => {
        const game = snapshot.val();

        if (!game) {
            largeHeader.textContent = `Opponent has disconnected!`;
            
            setSmallHeaderOnDisconnect();
            return;
        }

        if (!game.guest) {
            return;
        }

        if (game.lastClick) {
            cells[game.lastClick[0]][game.lastClick[1]].style.background = game.guestTurn ? `blue` : `red`;
        }

        if (game.winner != null) {
            if (game.winner == isHost) {
                largeHeader.textContent = `You win!`;
            } else {
                largeHeader.textContent = `You lose!`;
            }

            setSmallHeaderOnDisconnect();
            return;
        }

        if (isHost) {
            smallHeader.innerHTML = `Place tiles to create a path connecting the <u style='color:blue;'> goals </u>`;
        } else {
            smallHeader.innerHTML = `Place tiles to create a path connecting the <u style='color:red;'> goals </u>`;
        }

        if (game.guestTurn == !isHost) {
            largeHeader.textContent = `Your turn!`;
        } else {
            largeHeader.textContent = `Opponent\'s turn!`;
        }
    });
}

(function () {
    largeHeader.textContent = `Connecting...`;
    smallHeader.textContent = `...`;

    parseURL();

    addCells();
    addGoals();

    onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) {
            return;
            // logged out. Nothing to do
        }
        
        let playerID = user.uid;
        let gameID = makeid();

        if (isHost) {
            gameRef = ref(firebaseDB, `games/${gameID}`);

            update(gameRef, {
                host: playerID,
                board: new Array(boardSize).fill(new Array(boardSize).fill(0))
            }).catch((error) => {
                console.error(error);
            });

            largeHeader.textContent = `Provide the link below to your opponent`;
            let gameLink = `${window.location.origin}/?gameid=${gameID}`;
            smallHeader.innerHTML = `${gameLink}\n<button onclick=\"navigator.clipboard.writeText(\'${gameLink}\')\">Copy Link</button>`;

            setDBListener();
        } else {
            gameRef = ref(firebaseDB, `games/${window.location.search.substring(8)}`);

            get(gameRef).then((snapshot) => {
                if (!snapshot.val()) {
                    largeHeader.textContent = `Invalid game link!`;
                    setSmallHeaderOnDisconnect();
                    remove(gameRef);
                    return;
                }

                update(gameRef, {
                    guest: playerID,
                    guestTurn: true
                }).then(() => setDBListener());
            }).catch((error) => {
                console.error(error);
            });
        }

        onDisconnect(gameRef).remove().catch((error) => {
            console.error(error);
        });
    });

    signInAnonymously(firebaseAuth).catch((error) => {
        console.error(error);
    });
})();
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-app.js";
import { getDatabase, ref, get, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-auth.js";

const firebaseConfig = { 
apiKey: "AIzaSyBp7KVrEne2uV3Rtk4U4p-UYuonO-jBmd8",
authDomain: "hex-game-d982b.firebaseapp.com",
databaseURL: "https://hex-game-d982b-default-rtdb.firebaseio.com",
projectId: "hex-game-d982b",
storageBucket: "hex-game-d982b.appspot.com",
messagingSenderId: "393175293244",
appId: "1:393175293244:web:a20d0d264c06835382d239"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseDB = getDatabase(firebaseApp);
const firebaseAuth = getAuth();

var gameRef;
const isHost = setHost();
const largeHeader = document.getElementById(`large`);
const smallHeader = document.getElementById(`small`);
const boardSize = 11;
const cellDivs = document.querySelector(".cell");
const cells = new Array(boardSize).fill(null).map(()=> 
             (new Array(boardSize).fill(null).map(()=> 
             (document.createElement("div")))));

function validateURL() {
    if (window.location.search == "") {
        return true;
    }
    if (window.location.search.substring(0, 8) == "?gameid=") {
        return true;
    }
    return false;
}
      
function setHost() {
    if (window.location.search == "") {
        return true;
    }
    return false;
}

function makeid() {
    let result = ``;
    let characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
    let charactersLength = characters.length;
    for (let i = 0; i < 30; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function addCells() {
    for (let i = boardSize - 1; i > 0; i--) {
        let r = 0;
        let c = i;
        while (r < boardSize && c < boardSize) {
            cells[r][c].addEventListener("click", clickCell(r, c));
            cellDivs.appendChild(cells[r][c]);
            r++;
            c++;
        }
        const br = document.createElement("br");
        cellDivs.appendChild(br);
    }
    for (let i = 0; i < boardSize; i++) {
        let r = i;
        let c = 0;
        while (r < boardSize && c < boardSize) {
            cells[r][c].addEventListener("click", clickCell(r, c));
            cellDivs.appendChild(cells[r][c]);
            r++;
            c++;
        }
        const br = document.createElement("br");
        cellDivs.appendChild(br);
    }
}

function clickCell(row, col) {
    return function() {
        get(gameRef).then((snapshot) => {
            if (!(snapshot.val().guestTurn == !isHost)) return;

            let tempBoard = snapshot.val().board;
            if (tempBoard[row][col] > 0) return;
            
            tempBoard[row][col]++;
            if (!isHost) tempBoard[row][col]++;

            update(gameRef, {
                board: tempBoard,
                lastClick: [row, col],
                guestTurn: !snapshot.val().guestTurn
            }).then(() => {
                checkWin();
            }).catch((error) => {
                console.error(error);
            });
        }).catch((error) => {
            console.error(error);
        });
    }
}
 
function checkWin() {
    get(gameRef).then((snapshot) => {
        let gameBoard = snapshot.val().board;
        let visited = new Array(boardSize).fill(null).map(()=>(new Array(boardSize).fill(null).map(()=>(false))));
        let id;

        if (isHost) {
            id = 1;
        } else {
            id = 2;
            for (let i = 1; i < 11; i++) {
                for (let j = 0; j < i; j++) {
                    const tempCell = gameBoard[i][j];
                    gameBoard[i][j] = gameBoard[j][i];
                    gameBoard[j][i] = tempCell;
                }
            }
        }

        let directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
        function move(r, c, dir) {
            if (r == -1 || r == 11 || c == -1 || c == 11) return false;
            if (gameBoard[r][c] != id) return false;
            if (visited[r][c]) return false;
            visited[r][c] = true;

            if (r == 10) return true;

            let newDir = fixedModSix(dir + 1);
            if (move(r + directions[newDir][0], c + directions[newDir][1], newDir)) return true;
            
            if (move(r + directions[dir][0], c + directions[dir][1], dir)) return true;

            newDir = fixedModSix(dir - 1);
            if (move(r + directions[newDir][0], c + directions[newDir][1], newDir)) return true;

            return false;
        }

        for (let c = 10; c > -1; c--) {
            if (move(0, c, 0)) {
                update(gameRef, {
                    winner: isHost
                }).catch((error) => {
                    console.error(error);
                });
            }
        }

    }).catch((error) => {
        console.error(error);
    });
}

function fixedModSix(n) {
    return ((n % 6) + 6) % 6;
}

function addGoals() {
    let line1 = document.querySelector(".line1");
    let line2 = document.querySelector(".line2");

    if (isHost) {
        line1.className = "line1host";
        line2.className = "line2host";
    } else {
        line1.className = "line1guest";
        line2.className = "line2guest";
    }
}

(function () {
    if (!validateURL()) {
        window.location.replace(`${window.location.origin}/404`);
        return;
    }

    if (isHost) {
        largeHeader.textContent = `Provide the link below to your opponent`;
        smallHeader.textContent =  window.location.origin;
    } else {
        largeHeader.textContent = `Your turn!`;
        smallHeader.innerHTML = `Place tiles to create a path connecting the <u style='color:red;'> goals </u>`;
    }

    addCells();
    addGoals();

    onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
            let playerID = user.uid;
            let gameID = makeid();
            if (isHost) {
                gameRef = ref(firebaseDB, `games/${gameID}`);
            } else {
                gameRef = ref(firebaseDB, `games/${window.location.search.substring(8)}`);
            }
            onDisconnect(gameRef).remove().catch((error) => {
                console.error(error);
            });

            if (isHost) {
                smallHeader.textContent = `${window.location.origin}/?gameid=${gameID}`;

                update(gameRef, {
                    host: playerID,
                    board: new Array(boardSize).fill(new Array(boardSize).fill(0))
                }).catch((error) => {
                    console.error(error);
                });
            } else {
                update(gameRef, {
                    guest: playerID,
                    guestTurn: true
                }).catch((error) => {
                    console.error(error);
                });
            }

            onValue(gameRef, (snapshot) => {
                const game = snapshot.val();

                if (game == null) {
                    largeHeader.textContent = `Opponent has disconnected!`;
                    
                    if (isHost) {
                        smallHeader.textContent = `Refresh the page to host a new game`;
                    } else {
                        smallHeader.innerHTML = `Go here to host a new game: <a href=\"index.html\">${window.location.origin}</a>`;
                    }
                    return;
                }

                if (game.guest != null) {
                    if (game.winner != null) {
                        if (game.winner == isHost) {
                            largeHeader.textContent = `You win!`;
                        } else {
                            largeHeader.textContent = `You lose!`;
                        }

                        if (isHost) {
                            smallHeader.textContent = `Refresh the page to host a new game`;
                        } else {
                            smallHeader.innerHTML = `Go here to host a new game: <a href=\"index.html\">${window.location.origin}</a>`;
                        }
                        return;
                    }

                    if (game.guestTurn === !isHost) {
                        largeHeader.textContent = `Your turn!`;
                    } else {
                        largeHeader.textContent = `Opponent\'s turn!`;
                        smallHeader.innerHTML = `Place tiles to create a path connecting the <u style='color:blue;'> goals </u>`;
                    }
        
                    if (game.lastClick != null) {
                        if (game.guestTurn) {
                            cells[game.lastClick[0]][game.lastClick[1]].style.background = "blue";
                        } else {
                            cells[game.lastClick[0]][game.lastClick[1]].style.background = "red";
                        }
                    }
                }
            });
        } else {
            //logged out
        }
    })

    signInAnonymously(firebaseAuth).catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        // ...
        console.log(errorCode, errorMessage);
    });
})();
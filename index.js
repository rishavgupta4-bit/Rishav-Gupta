// --- DOM Elements ---
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const singlePlayerBtn = document.getElementById('single-player-btn');
const multiplayerBtn = document.getElementById('multiplayer-btn');
const playerXBtn = document.getElementById('player-x-btn');
const playerOBtn = document.getElementById('player-o-btn');
const difficultySection = document.getElementById('difficulty-section');
const easyBtn = document.getElementById('easy-btn');
const hardBtn = document.getElementById('hard-btn');
const startGameBtn = document.getElementById('start-game-btn');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status-text');
const totalGamesEl = document.getElementById('total-games');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const drawsEl = document.getElementById('draws');
const playAgainBtn = document.getElementById('play-again-btn');
const shareBtn = document.getElementById('share-btn');
const homeBtn = document.getElementById('home-btn');
const winLineSVG = document.getElementById('win-line-svg');
const winPath = document.getElementById('win-path');
const interstitialAdPlaceholder = document.getElementById('interstitial-ad-placeholder');
const resultNotification = document.getElementById('result-notification');
const resultNotificationText = document.getElementById('result-notification-text');

// --- Game State ---
const gameState = {
    mode: 'single', // 'single' or 'multi'
    playerSymbol: 'X',
    aiSymbol: 'O',
    difficulty: 'easy', // 'easy', 'hard'
    currentPlayer: 'X',
    board: ['', '', '', '', '', '', '', '', ''],
    isActive: true,
    score: {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
    },
    gamesSinceLastAd: 0,
};

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

// --- Event Listeners ---
function setupEventListeners() {
    singlePlayerBtn.addEventListener('click', () => setGameMode('single'));
    multiplayerBtn.addEventListener('click', () => setGameMode('multi'));
    playerXBtn.addEventListener('click', () => setPlayerSymbol('X'));
    playerOBtn.addEventListener('click', () => setPlayerSymbol('O'));
    easyBtn.addEventListener('click', () => setDifficulty('easy'));
    hardBtn.addEventListener('click', () => setDifficulty('hard'));
    startGameBtn.addEventListener('click', startGame);
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    playAgainBtn.addEventListener('click', () => handleAdThenReset('playAgain'));
    shareBtn.addEventListener('click', shareResult);
    homeBtn.addEventListener('click', () => handleAdThenReset('home'));
}

// --- Home Screen Logic ---
function setGameMode(mode) {
    gameState.mode = mode;
    singlePlayerBtn.classList.toggle('active', mode === 'single');
    multiplayerBtn.classList.toggle('active', mode === 'multi');
    difficultySection.style.display = mode === 'single' ? 'block' : 'none';
}

function setPlayerSymbol(symbol) {
    gameState.playerSymbol = symbol;
    gameState.aiSymbol = symbol === 'X' ? 'O' : 'X';
    playerXBtn.classList.toggle('active', symbol === 'X');
    playerOBtn.classList.toggle('active', symbol === 'O');
}

function setDifficulty(level) {
    gameState.difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${level}-btn`).classList.add('active');
}

// --- Game Flow ---
function startGame() {
    gameState.score = { total: 0, wins: 0, losses: 0, draws: 0 };
    gameState.gamesSinceLastAd = 0;
    homeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    resetGame();
}

function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (gameState.board[clickedCellIndex] !== '' || !gameState.isActive) {
        return;
    }

    placeMark(clickedCell, clickedCellIndex);
    if (checkEndCondition()) return;

    if (gameState.mode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
        cells.forEach(cell => cell.disabled = true);
        aiMove();
        cells.forEach(cell => {
            if (gameState.board[parseInt(cell.dataset.index)] === '') {
                cell.disabled = false;
            }
        });
    }
}

function placeMark(cell, index) {
    gameState.board[index] = gameState.currentPlayer;
    cell.textContent = gameState.currentPlayer;
    cell.classList.add(gameState.currentPlayer);
    cell.disabled = true;
    switchPlayer();
}

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
}

function checkEndCondition() {
    const winnerInfo = checkWinner();
    if (winnerInfo.winner) {
        endGame(false, winnerInfo);
        return true;
    }
    if (!gameState.board.includes('')) {
        endGame(true);
        return true;
    }
    return false;
}

function checkWinner() {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (gameState.board[a] &&
            gameState.board[a] === gameState.board[b] &&
            gameState.board[a] === gameState.board[c]) {
            return { winner: gameState.board[a], combination: [a, b, c] };
        }
    }
    return { winner: null, combination: [] };
}

function endGame(isDraw, winnerInfo = { winner: null, combination: [] }) {
    gameState.isActive = false;
    cells.forEach(cell => cell.disabled = true);
    let resultMessage = '';

    if (isDraw) {
        resultMessage = "It's a Draw!";
        gameState.score.draws++;
    } else {
        resultMessage = `${winnerInfo.winner} Wins!`;
        if (winnerInfo.winner === gameState.playerSymbol) {
            gameState.score.wins++;
        } else {
            gameState.score.losses++;
        }
        highlightWinningCells(winnerInfo.combination);
        drawWinningLine(winnerInfo.combination);
    }

    gameState.score.total++;
    gameState.gamesSinceLastAd++;
    updateScore();

    showResultNotification(resultMessage);
}

function handleAdThenReset(action) {
    const shouldShowAd = (action === 'home') || (action === 'playAgain' && gameState.gamesSinceLastAd >= 5);

    if (shouldShowAd) {
        showInterstitialAd(() => {
            if (action === 'playAgain') {
                gameState.gamesSinceLastAd = 0; // Reset counter after "Play Again" ad
            }
            if (action === 'home') {
                goHome();
            } else {
                resetGame();
            }
        });
    } else {
        // No ad, just perform the action
        if (action === 'home') {
            goHome();
        } else {
            resetGame();
        }
    }
}

function resetGame() {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.isActive = true;
    gameState.currentPlayer = 'X';

    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('X', 'O', 'winning-cell');
        cell.disabled = false;
    });

    hideWinningLine();
    resultNotification.classList.add('hidden');
    updateStatus();
    updateScore();

    if (gameState.mode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
        cells.forEach(cell => cell.disabled = true);
        aiMove();
        cells.forEach(cell => {
            if (gameState.board[parseInt(cell.dataset.index)] === '') {
                cell.disabled = false;
            }
        });
    }
}

function goHome() {
    gameScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
}

// --- AI Logic ---
function aiMove() {
    if (!gameState.isActive) return;

    statusText.textContent = 'AI is thinking...';
    
    // Use setTimeout to allow the "thinking" message to render before the AI calculates its move.
    setTimeout(() => {
        let move;
        switch (gameState.difficulty) {
            case 'easy':
                move = getEasyMove();
                break;
            case 'hard':
                move = getHardMove();
                break;
        }

        if (move !== null && move !== undefined) {
            const cell = document.querySelector(`.cell[data-index='${move}']`);
            placeMark(cell, move);
            checkEndCondition();
        } else {
             updateStatus(); // Update status back if no move was made
        }
    }, 200); // A short delay for better UX
}


function getAvailableMoves(board) {
    return board.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
}

function getEasyMove() {
    const availableMoves = getAvailableMoves(gameState.board);
    if (availableMoves.length === 0) return null;
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function getHardMove() {
    // Minimax algorithm for an unbeatable AI
    const result = minimax(gameState.board, 0, true);
    return result.index;
}

function minimax(newBoard, depth, isMaximizing) {
    // Check for terminal states
    if (checkWinnerForMinimax(newBoard, gameState.aiSymbol)) {
        return { score: 10 - depth };
    }
    if (checkWinnerForMinimax(newBoard, gameState.playerSymbol)) {
        return { score: -10 + depth };
    }
    if (getAvailableMoves(newBoard).length === 0) {
        return { score: 0 }; // Draw
    }

    const availableMoves = getAvailableMoves(newBoard);
    const moves = [];

    for (let i = 0; i < availableMoves.length; i++) {
        const move = {};
        move.index = availableMoves[i];
        newBoard[availableMoves[i]] = isMaximizing ? gameState.aiSymbol : gameState.playerSymbol;

        const result = minimax(newBoard, depth + 1, !isMaximizing);
        move.score = result.score;
        
        newBoard[availableMoves[i]] = ''; // Undo the move
        moves.push(move);
    }

    let bestMove;
    if (isMaximizing) {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    return moves[bestMove];
}

function checkWinnerForMinimax(board, player) {
    for (const combination of winningConditions) {
        if (combination.every(index => board[index] === player)) {
            return true;
        }
    }
    return false;
}

// --- UI Updates ---
function updateStatus() {
    if (gameState.isActive) {
        statusText.textContent = `Player ${gameState.currentPlayer}'s Turn`;
    }
}

function updateScore() {
    totalGamesEl.textContent = String(gameState.score.total);
    winsEl.textContent = String(gameState.score.wins);
    lossesEl.textContent = String(gameState.score.losses);
    drawsEl.textContent = String(gameState.score.draws);
}

function highlightWinningCells(combination) {
    combination.forEach(index => {
        document.querySelector(`.cell[data-index='${index}']`).classList.add('winning-cell');
    });
}

function drawWinningLine(combination) {
    const boardRect = document.getElementById('board').getBoundingClientRect();
    const startCell = document.querySelector(`.cell[data-index='${combination[0]}']`);
    const endCell = document.querySelector(`.cell[data-index='${combination[2]}']`);
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2 - boardRect.left;
    const startY = startRect.top + startRect.height / 2 - boardRect.top;
    const endX = endRect.left + endRect.width / 2 - boardRect.left;
    const endY = endRect.top + endRect.height / 2 - boardRect.top;

    const pathData = `M ${startX},${startY} L ${endX},${endY}`;
    winPath.setAttribute('d', pathData);
    winLineSVG.classList.remove('hidden');
}

function hideWinningLine() {
    winLineSVG.classList.add('hidden');
}

function showResultNotification(message) {
    resultNotificationText.textContent = message;
    resultNotification.classList.remove('hidden');

    setTimeout(() => {
        resultNotification.classList.add('hidden');
    }, 2000);
}

// --- Web APIs (Share, Service Worker) ---
async function shareResult() {
    const resultText = `I just played Tic-Tac-Toe AI! Current score: ${gameState.score.wins} Wins, ${gameState.score.losses} Losses. Can you beat the AI?`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Tic-Tac-Toe AI',
                text: resultText,
                url: window.location.href,
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    } else {
        alert('Web Share not supported on this browser. Try copying the page URL!');
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('Service Worker registration failed: ', err);
                });
        });
    }
}

// --- Ad Logic ---
function showInterstitialAd(callback) {
    interstitialAdPlaceholder.classList.remove('hidden');
    let adShown = false;

    const adTimeout = setTimeout(() => {
        if (!adShown) {
            console.log('Ad timed out.');
            interstitialAdPlaceholder.classList.add('hidden');
            if (callback) callback();
        }
    }, 3000);

    try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
            type: 'ad_break',
            name: 'play_again_ad',
            beforeAd: () => {
                adShown = true;
                console.log('Ad break starting...');
            },
            afterAd: () => {
                console.log('Ad break finished.');
                clearTimeout(adTimeout);
                interstitialAdPlaceholder.classList.add('hidden');
                if (callback) callback();
            },
            adDismissed: () => {
                console.log('Ad dismissed by user.');
                clearTimeout(adTimeout);
                interstitialAdPlaceholder.classList.add('hidden');
                if (callback) callback();
            },
            adNotShown: (reason) => {
                console.log('Ad not shown by Google.', reason);
                clearTimeout(adTimeout);
                interstitialAdPlaceholder.classList.add('hidden');
                if (callback) callback();
            }
        });
    } catch(e) {
        console.error("Ad call failed", e);
        clearTimeout(adTimeout);
        interstitialAdPlaceholder.classList.add('hidden');
        if (callback) callback();
    }
}

// --- Init ---
setupEventListeners();
registerServiceWorker();
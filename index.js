
"use strict";
// --- DOM Elements ---
let homeScreen;
let gameScreen;
let singlePlayerBtn;
let multiplayerBtn;
let playerXBtn;
let playerOBtn;
let difficultySection;
let easyBtn;
let mediumBtn;
let hardBtn;
let startGameBtn;
let cells;
let statusText;
let totalGamesEl;
let winsEl;
let lossesEl;
let drawsEl;
let playAgainBtn;
let shareBtn;
let homeBtn;
let winLineSVG;
let winPath;
let interstitialAdPlaceholder;
let resultsModal;
let resultsText;
// --- Game State ---
const gameState = {
    mode: 'single', // 'single' or 'multi'
    playerSymbol: 'X',
    aiSymbol: 'O',
    difficulty: 'easy', // 'easy', 'medium', 'hard'
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
// --- Initialization ---
function init() {
    // Query DOM elements after the DOM is loaded
    homeScreen = document.getElementById('home-screen');
    gameScreen = document.getElementById('game-screen');
    singlePlayerBtn = document.getElementById('single-player-btn');
    multiplayerBtn = document.getElementById('multiplayer-btn');
    playerXBtn = document.getElementById('player-x-btn');
    playerOBtn = document.getElementById('player-o-btn');
    difficultySection = document.getElementById('difficulty-section');
    easyBtn = document.getElementById('easy-btn');
    mediumBtn = document.getElementById('medium-btn');
    hardBtn = document.getElementById('hard-btn');
    startGameBtn = document.getElementById('start-game-btn');
    cells = document.querySelectorAll('.cell');
    statusText = document.getElementById('status-text');
    totalGamesEl = document.getElementById('total-games');
    winsEl = document.getElementById('wins');
    lossesEl = document.getElementById('losses');
    drawsEl = document.getElementById('draws');
    playAgainBtn = document.getElementById('play-again-btn');
    shareBtn = document.getElementById('share-btn');
    homeBtn = document.getElementById('home-btn');
    winLineSVG = document.getElementById('win-line-svg');
    winPath = document.getElementById('win-path');
    interstitialAdPlaceholder = document.getElementById('interstitial-ad-placeholder');
    resultsModal = document.getElementById('results-modal');
    resultsText = document.getElementById('results-text');
    setupEventListeners();
    registerServiceWorker();
}
// --- Event Listeners ---
function setupEventListeners() {
    singlePlayerBtn.addEventListener('click', () => setGameMode('single'));
    multiplayerBtn.addEventListener('click', () => setGameMode('multi'));
    playerXBtn.addEventListener('click', () => setPlayerSymbol('X'));
    playerOBtn.addEventListener('click', () => setPlayerSymbol('O'));
    easyBtn.addEventListener('click', () => setDifficulty('easy'));
    mediumBtn.addEventListener('click', () => setDifficulty('medium'));
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
    // Reset scoreboard when starting a new session from home
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
    if (checkEndCondition())
        return;
    if (gameState.mode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
        setTimeout(aiMove, 500); // AI moves after a short delay
    }
}
function placeMark(cell, index) {
    gameState.board[index] = gameState.currentPlayer;
    cell.textContent = gameState.currentPlayer;
    cell.classList.add(gameState.currentPlayer);
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
    let resultMessage = '';
    if (isDraw) {
        resultMessage = "It's a Draw!";
        gameState.score.draws++;
    }
    else {
        resultMessage = `${winnerInfo.winner} Wins!`;
        if (winnerInfo.winner === gameState.playerSymbol) {
            gameState.score.wins++;
        }
        else {
            gameState.score.losses++;
        }
        highlightWinningCells(winnerInfo.combination);
        drawWinningLine(winnerInfo.combination);
    }
    gameState.score.total++;
    gameState.gamesSinceLastAd++;
    updateScore();
    showResultsModal(resultMessage);
}
function handleAdThenReset(action) {
    const shouldShowAd = (action === 'home') || (action === 'playAgain' && gameState.gamesSinceLastAd >= 5);
    if (shouldShowAd) {
        showInterstitialAd(() => {
            if (action === 'home') {
                goHome();
            }
            else {
                resetGame();
            }
        });
    }
    else {
        if (action === 'home') {
            goHome();
        }
        else {
            resetGame();
        }
    }
}
function resetGame() {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.isActive = true;
    gameState.currentPlayer = 'X'; // X always starts
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('X', 'O', 'winning-cell');
    });
    hideWinningLine();
    updateStatus();
    updateScore();
    if (gameState.mode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
        setTimeout(aiMove, 500);
    }
    if (gameState.gamesSinceLastAd >= 5) {
        gameState.gamesSinceLastAd = 0;
    }
}
function goHome() {
    gameScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
}
// --- AI Logic ---
function aiMove() {
    if (!gameState.isActive) return;

    let move;
    switch (gameState.difficulty) {
        case 'easy':
            move = getEasyMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getHardMove();
            break;
        default:
            move = getEasyMove(); // Fallback to easy
    }

    const cell = document.querySelector(`.cell[data-index='${move}']`);
    placeMark(cell, move);
    checkEndCondition();
}

function getAvailableMoves(board) {
    return board.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
}

function getEasyMove() {
    const availableMoves = getAvailableMoves(gameState.board);
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function getMediumMove() {
    if (Math.random() > 0.5) {
        return getHardMove(); // Play optimally
    }
    else {
        return getEasyMove(); // Play randomly
    }
}

function getHardMove() {
    // We pass a copy of the board to prevent the minimax function from modifying the actual game state
    return minimax([...gameState.board], gameState.aiSymbol).index;
}

function minimax(newBoard, player) {
    const availSpots = getAvailableMoves(newBoard);
    if (checkWinnerForMinimax(newBoard, gameState.playerSymbol)) {
        return { score: -10 };
    }
    else if (checkWinnerForMinimax(newBoard, gameState.aiSymbol)) {
        return { score: 10 };
    }
    else if (availSpots.length === 0) {
        return { score: 0 };
    }
    const moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        const move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;
        if (player === gameState.aiSymbol) {
            const result = minimax(newBoard, gameState.playerSymbol);
            move.score = result.score;
        }
        else {
            const result = minimax(newBoard, gameState.aiSymbol);
            move.score = result.score;
        }
        newBoard[availSpots[i]] = '';
        moves.push(move);
    }
    let bestMove;
    if (player === gameState.aiSymbol) {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    else {
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
    // Padding to not touch the edges
    const padding = 5;
    const angle = Math.atan2(endY - startY, endX - startX);
    const startXPadded = startX + Math.cos(angle) * padding;
    const startYPadded = startY + Math.sin(angle) * padding;
    const endXPadded = endX - Math.cos(angle) * padding;
    const endYPadded = endY - Math.sin(angle) * padding;
    // Add a curve
    const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * 50;
    const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * 50;
    const pathData = `M ${startXPadded},${startYPadded} Q ${controlX},${controlY} ${endXPadded},${endYPadded}`;
    winPath.setAttribute('d', pathData);
    winLineSVG.classList.remove('hidden');
}
function hideWinningLine() {
    winLineSVG.classList.add('hidden');
}
function showResultsModal(message) {
    resultsText.textContent = message;
    resultsModal.classList.remove('hidden');
    setTimeout(() => {
        resultsModal.classList.add('hidden');
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
        }
        catch (error) {
            console.error('Share failed:', error);
        }
    }
    else {
        // Fallback for browsers that don't support Web Share API
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
    // Fail-safe timer
    const adTimeout = setTimeout(() => {
        if (!adShown) {
            console.log('Ad timed out.');
            interstitialAdPlaceholder.classList.add('hidden');
            if (callback)
                callback();
        }
    }, 5000); // 5-second timeout
    
    // The official way to request a programmatic ad break
    (window.adsbygoogle = window.adsbygoogle || []).push({
        type: 'ad_break',
        name: 'play_again_ad',
        beforeAd: () => {
            adShown = true;
            console.log('Ad break starting...');
            // Google will handle showing an overlay
        },
        afterAd: () => {
            console.log('Ad break finished.');
            clearTimeout(adTimeout);
            interstitialAdPlaceholder.classList.add('hidden');
            if (callback)
                callback();
        },
        adDismissed: () => {
            console.log('Ad dismissed by user.');
            clearTimeout(adTimeout);
            interstitialAdPlaceholder.classList.add('hidden');
            if (callback)
                callback();
        },
        adNotShown: () => {
            console.log('Ad not shown by Google.');
            clearTimeout(adTimeout);
            interstitialAdPlaceholder.classList.add('hidden');
            if (callback)
                callback();
        }
    });
}
// --- Start the App ---
document.addEventListener('DOMContentLoaded', init);

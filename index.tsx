/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- STATE MANAGEMENT ---
type PlayerSymbol = 'X' | 'O';
type GameMode = 'single' | 'multi';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameState {
    gameMode: GameMode;
    playerSymbol: PlayerSymbol;
    aiSymbol: PlayerSymbol;
    difficulty: Difficulty;
    board: (PlayerSymbol | null)[];
    currentPlayer: PlayerSymbol;
    isGameOver: boolean;
    showAiThinking: boolean;
    scores: {
        total: number;
        wins: number;
        losses: number;
        draws: number;
    };
}

let gameState: GameState = {
    gameMode: 'single',
    playerSymbol: 'X',
    aiSymbol: 'O',
    difficulty: 'easy',
    board: Array(9).fill(null),
    currentPlayer: 'X',
    isGameOver: false,
    showAiThinking: false,
    scores: {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
    },
};

// --- DOM ELEMENTS ---
const homeScreen = document.getElementById('home-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const boardElement = document.getElementById('board')!;
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status-text')!;

// Home Screen Elements
const singlePlayerBtn = document.getElementById('single-player-btn')!;
const multiPlayerBtn = document.getElementById('multi-player-btn')!;
const playerXBtn = document.getElementById('player-x-btn')!;
const playerOBtn = document.getElementById('player-o-btn')!;
const difficultySection = document.getElementById('difficulty-section')!;
const difficultyButtons = document.querySelectorAll('#difficulty-section .btn');
const startGameBtn = document.getElementById('start-game-btn')!;

// Game Screen Elements
const totalGamesEl = document.getElementById('total-games')!;
const winsEl = document.getElementById('wins')!;
const lossesEl = document.getElementById('losses')!;
const drawsEl = document.getElementById('draws')!;
const playAgainBtn = document.getElementById('play-again-btn')!;
const homeBtn = document.getElementById('home-btn')!;
const shareBtn = document.getElementById('share-btn')! as HTMLButtonElement;
const winLineSvg = document.getElementById('win-line-svg')!;
const winLine = document.getElementById('win-line') as unknown as SVGLineElement;
const resultsModal = document.getElementById('results-modal')!;
const resultsText = document.getElementById('results-text')!;
const aiThinkingToggleContainer = document.getElementById('ai-thinking-toggle-container')!;
const aiThinkingToggle = document.getElementById('ai-thinking-toggle') as HTMLInputElement;
const aiReasoningText = document.getElementById('ai-reasoning-text')!;


// --- GAME LOGIC ---
const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]  // diagonals
];

function handleCellClick(e: Event) {
    const target = e.target as HTMLElement;
    const index = parseInt(target.dataset.index!);
    if (gameState.board[index] || gameState.isGameOver) return;

    makeMove(index, gameState.currentPlayer);

    if (gameState.isGameOver) return;

    if (gameState.gameMode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
        setTimeout(aiMove, 500);
    }
}

function makeMove(index: number, player: 'X' | 'O') {
    gameState.board[index] = player;
    renderBoard();

    const winningInfo = checkWinner();
    if (winningInfo) {
        endGame(winningInfo.winner, winningInfo.combo);
        return;
    }

    if (isBoardFull()) {
        endGame('draw');
        return;
    }

    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
}


function checkWinner(): { winner: PlayerSymbol; combo: number[] } | null {
    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
            return { winner: gameState.board[a] as PlayerSymbol, combo };
        }
    }
    return null;
}

function isBoardFull() {
    return gameState.board.every(cell => cell !== null);
}

function endGame(result: 'X' | 'O' | 'draw', combo: number[] | null = null) {
    gameState.isGameOver = true;
    aiReasoningText.textContent = ''; // Clear reasoning text on game end
    updateScores(result);

    let message = '';
    if (result === 'draw') {
        message = "It's a Draw!";
    } else {
        message = `${result} Wins!`;
        if (combo) {
            drawWinningLine(combo);
            combo.forEach(index => {
                cells[index].classList.add('winning-cell');
            });
        }
    }
    
    statusText.textContent = message;
    
    resultsText.textContent = message;
    resultsModal.style.display = 'flex';
    
    setTimeout(() => {
        resultsModal.style.display = 'none';
    }, 2000);
}


function resetGame() {
    gameState.board = Array(9).fill(null);
    gameState.isGameOver = false;
    gameState.currentPlayer = 'X';
    winLineSvg.classList.remove('visible');
    cells.forEach(cell => {
        cell.classList.remove('winning-cell', 'ai-move-highlight');
    });
    resultsModal.style.display = 'none';
    aiReasoningText.textContent = '';
    renderBoard();
    updateStatus();
    
    if (gameState.gameMode === 'single' && gameState.currentPlayer === gameState.aiSymbol) {
         setTimeout(aiMove, 500);
    }
}

function goToHomePage() {
    gameScreen.classList.remove('active');
    homeScreen.classList.add('active');
    aiThinkingToggleContainer.style.display = 'none'; // Hide toggle on home
    resetGame();
    gameState.scores = { total: 0, wins: 0, losses: 0, draws: 0 };
    updateScoreboard();
}

// --- AI LOGIC ---
function aiMove() {
    if (gameState.isGameOver) return;

    let move;

    if (gameState.difficulty === 'easy') {
        move = getEasyMove();
        makeMove(move, gameState.aiSymbol);
    } else if (gameState.difficulty === 'medium') {
        move = getMediumMove();
        makeMove(move, gameState.aiSymbol);
    } else { // hard
        if (gameState.showAiThinking) {
            const { move, reason } = getHardMoveWithReasoning();
            aiReasoningText.textContent = 'AI is thinking... 🤔';

            setTimeout(() => {
                aiReasoningText.textContent = reason;
                cells[move].classList.add('ai-move-highlight');

                setTimeout(() => {
                    cells[move].classList.remove('ai-move-highlight');
                    if (!gameState.isGameOver) { // Check if game ended while thinking
                        makeMove(move, gameState.aiSymbol);
                    }
                }, 1200);
            }, 500);
        } else {
            move = getHardMove();
            makeMove(move, gameState.aiSymbol);
        }
    }
}

function getAvailableMoves(board = gameState.board) {
    const moves: number[] = [];
    board.forEach((cell, index) => {
        if (!cell) moves.push(index);
    });
    return moves;
}

function getEasyMove() {
    const availableMoves = getAvailableMoves();
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function getMediumMove() {
    return Math.random() < 0.5 ? getEasyMove() : getHardMove();
}

function getHardMove() {
    return getHardMoveWithReasoning().move;
}

function getHardMoveWithReasoning(): { move: number, reason: string } {
    // 1. Check if AI can win in the next move
    for (const move of getAvailableMoves()) {
        const boardCopy = [...gameState.board];
        boardCopy[move] = gameState.aiSymbol;
        if (checkWinnerForMinimax(boardCopy, gameState.aiSymbol)) {
            return { move, reason: "Completing a winning line to secure victory." };
        }
    }

    // 2. Check if player can win, and block them
    for (const move of getAvailableMoves()) {
        const boardCopy = [...gameState.board];
        boardCopy[move] = gameState.playerSymbol;
        if (checkWinnerForMinimax(boardCopy, gameState.playerSymbol)) {
            return { move, reason: "Blocking an opponent's potential win." };
        }
    }
    
    // 3. If center is free, take it
    if (gameState.board[4] === null) {
        return { move: 4, reason: "Taking the center for strategic advantage." };
    }

    // 4. Fallback to minimax for optimal move
    const bestMove = minimax(gameState.board, gameState.aiSymbol);
    return { move: bestMove.index, reason: "Calculating the optimal long-term move." };
}


function minimax(newBoard: (PlayerSymbol|null)[], player: 'X'|'O'): { score: number, index: number } {
    const availSpots = getAvailableMoves(newBoard);

    if (checkWinnerForMinimax(newBoard, gameState.playerSymbol)) {
        return { score: -10, index: -1 };
    } else if (checkWinnerForMinimax(newBoard, gameState.aiSymbol)) {
        return { score: 10, index: -1 };
    } else if (availSpots.length === 0) {
        return { score: 0, index: -1 };
    }

    const moves: { score: number, index: number }[] = [];

    for (let i = 0; i < availSpots.length; i++) {
        const move: { score: number, index: number } = { score: 0, index: availSpots[i] };
        newBoard[availSpots[i]] = player;

        if (player === gameState.aiSymbol) {
            const result = minimax(newBoard, gameState.playerSymbol);
            move.score = result.score;
        } else {
            const result = minimax(newBoard, gameState.aiSymbol);
            move.score = result.score;
        }

        newBoard[availSpots[i]] = null;
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
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }

    return moves[bestMove!];
}

function checkWinnerForMinimax(board: (PlayerSymbol|null)[], player: 'X'|'O') {
    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] === player && board[b] === player && board[c] === player) {
            return true;
        }
    }
    return false;
}

// --- UI UPDATES ---

function drawWinningLine(combo: number[]) {
    const boardWidth = (boardElement as HTMLElement).offsetWidth;
    const boardHeight = (boardElement as HTMLElement).offsetHeight;
    const startCell = cells[combo[0]] as HTMLElement;

    let x1, y1, x2, y2;

    const sortedCombo = JSON.stringify([...combo].sort((a, b) => a - b));

    const startCellCenterY = startCell.offsetTop + startCell.offsetHeight / 2;
    const startCellCenterX = startCell.offsetLeft + startCell.offsetWidth / 2;

    // Horizontal wins
    if (sortedCombo === '[0,1,2]' || sortedCombo === '[3,4,5]' || sortedCombo === '[6,7,8]') {
        y1 = y2 = startCellCenterY;
        x1 = 0;
        x2 = boardWidth;
    }
    // Vertical wins
    else if (sortedCombo === '[0,3,6]' || sortedCombo === '[1,4,7]' || sortedCombo === '[2,5,8]') {
        x1 = x2 = startCellCenterX;
        y1 = 0;
        y2 = boardHeight;
    }
    // Diagonal TL-BR
    else if (sortedCombo === '[0,4,8]') {
        x1 = 0; y1 = 0;
        x2 = boardWidth; y2 = boardHeight;
    }
    // Diagonal TR-BL
    else if (sortedCombo === '[2,4,6]') {
        x1 = boardWidth; y1 = 0;
        x2 = 0; y2 = boardHeight;
    }

    winLine.setAttribute('x1', x1!.toString());
    winLine.setAttribute('y1', y1!.toString());
    winLine.setAttribute('x2', x2!.toString());
    winLine.setAttribute('y2', y2!.toString());

    winLineSvg.classList.add('visible');
}


function renderBoard() {
    gameState.board.forEach((value, index) => {
        const cell = cells[index];
        if (cell.textContent !== value) {
            cell.textContent = value;
            cell.classList.remove('X', 'O');
            if (value) {
                cell.classList.add(value);
            }
        }
    });
}

function updateStatus() {
    if (gameState.isGameOver) return;
    statusText.textContent = `Player ${gameState.currentPlayer}'s Turn`;
}

function updateScores(result: 'X' | 'O' | 'draw') {
    gameState.scores.total++;
    if (result === 'draw') {
        gameState.scores.draws++;
    } else {
        if (result === gameState.playerSymbol) {
            gameState.scores.wins++;
        } else { 
             gameState.scores.losses++;
        }
    }
    updateScoreboard();
}

function updateScoreboard() {
    totalGamesEl.textContent = gameState.scores.total.toString();
    winsEl.textContent = gameState.scores.wins.toString();
    lossesEl.textContent = gameState.scores.losses.toString();
    drawsEl.textContent = gameState.scores.draws.toString();
}


// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Home Screen
    singlePlayerBtn.addEventListener('click', () => {
        gameState.gameMode = 'single';
        singlePlayerBtn.classList.add('active');
        multiPlayerBtn.classList.remove('active');
        difficultySection.style.display = 'block';
    });

    multiPlayerBtn.addEventListener('click', () => {
        gameState.gameMode = 'multi';
        multiPlayerBtn.classList.add('active');
        singlePlayerBtn.classList.remove('active');
        difficultySection.style.display = 'none';
    });

    playerXBtn.addEventListener('click', () => {
        gameState.playerSymbol = 'X';
        gameState.aiSymbol = 'O';
        playerXBtn.classList.add('active');
        playerOBtn.classList.remove('active');
    });

    playerOBtn.addEventListener('click', () => {
        gameState.playerSymbol = 'O';
        gameState.aiSymbol = 'X';
        playerOBtn.classList.add('active');
        playerXBtn.classList.remove('active');
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            gameState.difficulty = (button as HTMLElement).dataset.difficulty as 'easy' | 'medium' | 'hard';
        });
    });

    startGameBtn.addEventListener('click', () => {
        homeScreen.classList.remove('active');
        gameScreen.classList.add('active');
        if (gameState.gameMode === 'single' && gameState.difficulty === 'hard') {
            aiThinkingToggleContainer.style.display = 'flex';
        } else {
            aiThinkingToggleContainer.style.display = 'none';
        }
        resetGame();
    });

    // Game Screen
    boardElement.addEventListener('click', handleCellClick);
    
    playAgainBtn.addEventListener('click', resetGame);
    
    homeBtn.addEventListener('click', goToHomePage);

    aiThinkingToggle.addEventListener('change', () => {
        gameState.showAiThinking = aiThinkingToggle.checked;
    });

    if (navigator.share) {
        shareBtn.addEventListener('click', async () => {
            const { wins, losses, draws } = gameState.scores;
            let resultMessage = 'I just played a game of Tic-Tac-Toe!';
            const statusContent = statusText.textContent || '';
            if (statusContent.includes('Wins')) {
                resultMessage = `I just won a game of Tic-Tac-Toe! 🏆`;
            } else if (statusContent.includes('Draw')) {
                 resultMessage = `I just tied in a game of Tic-Tac-Toe! 🤝`;
            }

            const shareText = `${resultMessage}\nMy current score is: Wins: ${wins}, Losses: ${losses}, Draws: ${draws}.`;

            try {
                await navigator.share({
                    title: 'Tic-Tac-Toe Neon',
                    text: shareText,
                    url: 'https://tic-tac-toe-neon.web.app'
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        });
    } else {
        (shareBtn as HTMLElement).style.display = 'none';
    }
}


// --- INITIALIZATION ---
function init() {
    setupEventListeners();
}

init();
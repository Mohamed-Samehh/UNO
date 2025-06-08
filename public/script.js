// Game state
let socket;
let currentGameId = null;
let currentPlayerId = null;
let playerName = '';
let gameState = null;
let playerHand = [];
let pendingWildCard = null;

// DOM elements
const setupScreen = document.getElementById('setupScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const colorChooserModal = document.getElementById('colorChooserModal');
const messageContainer = document.getElementById('messageContainer');

// Initialize socket connection
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showMessage('Disconnected from server', 'error');
    });

    socket.on('gameCreated', (data) => {
        currentGameId = data.gameId;
        currentPlayerId = data.playerId;
        document.getElementById('gameCodeDisplay').textContent = currentGameId;
        showScreen('lobbyScreen');
        showMessage('Game created successfully!', 'success');
    });

    socket.on('gameJoined', (data) => {
        currentGameId = data.gameId;
        currentPlayerId = data.playerId;
        document.getElementById('gameCodeDisplay').textContent = currentGameId;
        showScreen('lobbyScreen');
        showMessage('Joined game successfully!', 'success');
    });

    socket.on('gameState', (state) => {
        gameState = state;
        updateGameDisplay();
    });

    socket.on('gameStarted', () => {
        showScreen('gameScreen');
        showMessage('Game started!', 'success');
    });

    socket.on('playerHand', (hand) => {
        playerHand = hand;
        updatePlayerHand();
    });

    socket.on('cardPlayed', (data) => {
        if (data.hasUno) {
            showMessage(`${getPlayerName(data.playerId)} has UNO!`, 'info');
        }
        if (data.hasWon) {
            showMessage(`${getPlayerName(data.playerId)} wins!`, 'success');
        }
    });

    socket.on('gameWon', (data) => {
        const winnerName = getPlayerName(data.winner);
        showMessage(`🎉 ${winnerName} wins the game! 🎉`, 'success');
        setTimeout(() => {
            if (confirm('Game ended! Would you like to return to the main menu?')) {
                location.reload();
            }
        }, 3000);
    });

    socket.on('cardDrawn', (card) => {
        showMessage('Card drawn!', 'info');
    });

    socket.on('playerLeft', (playerId) => {
        const playerName = getPlayerName(playerId);
        showMessage(`${playerName} left the game`, 'info');
    });

    socket.on('error', (message) => {
        showMessage(message, 'error');
    });
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Message system
function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    messageContainer.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 4000);
}

// Setup screen handlers
document.getElementById('createGameBtn').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        showMessage('Please enter your name', 'error');
        return;
    }
    socket.emit('createGame', playerName);
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim();
    const gameCode = document.getElementById('gameCodeInput').value.trim().toUpperCase();
    
    if (!playerName) {
        showMessage('Please enter your name', 'error');
        return;
    }
    
    if (!gameCode) {
        showMessage('Please enter a game code', 'error');
        return;
    }
    
    socket.emit('joinGame', { gameId: gameCode, playerName });
});

// Lobby screen handlers
document.getElementById('copyCodeBtn').addEventListener('click', () => {
    const gameCode = document.getElementById('gameCodeDisplay').textContent;
    navigator.clipboard.writeText(gameCode).then(() => {
        showMessage('Game code copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Failed to copy game code', 'error');
    });
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    const playerCount = parseInt(document.getElementById('playerCount').textContent);
    
    if (playerCount < 2) {
        showMessage('You need at least one more player to start the game', 'warning');
        return;
    }

    socket.emit('startGame');
});

document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the lobby?')) {
        location.reload();
    }
});

// Game screen handlers
document.getElementById('drawCardBtn').addEventListener('click', () => {
    socket.emit('drawCard');
});

document.getElementById('passTurnBtn').addEventListener('click', () => {
    socket.emit('passTurn');
});

// Color chooser handlers
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        colorChooserModal.classList.remove('active');
        
        if (pendingWildCard !== null) {
            socket.emit('playCard', { cardIndex: pendingWildCard, chosenColor: color });
            pendingWildCard = null;
        }
    });
});

// Game display updates
function updateGameDisplay() {
    if (!gameState) return;

    // Update lobby if in lobby
    if (lobbyScreen.classList.contains('active')) {
        updateLobbyDisplay();
        return;
    }

    // Update game screen
    if (gameScreen.classList.contains('active')) {
        updateGameScreen();
    }
}

function updateLobbyDisplay() {
    if (!gameState) return;

    const playerCount = document.getElementById('playerCount');
    const playersList = document.getElementById('playersList');
    const startBtn = document.getElementById('startGameBtn');

    playerCount.textContent = gameState.players.length;
    
    playersList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.textContent = player.name + (player.id === currentPlayerId ? ' (You)' : '');
        playersList.appendChild(playerDiv);
    });
}

function updateGameScreen() {
    if (!gameState) return;

    // Update current player indicator
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentPlayerName = document.getElementById('currentPlayerName');
    const turnIndicator = document.getElementById('turnIndicator');
    
    if (currentPlayer) {
        currentPlayerName.textContent = currentPlayer.id === currentPlayerId ? 
            "Your Turn" : `${currentPlayer.name}'s Turn`;
        
        if (currentPlayer.id === currentPlayerId) {
            turnIndicator.style.display = 'inline';
        } else {
            turnIndicator.style.display = 'none';
        }
    }

    // Update game stats
    document.getElementById('deckCount').textContent = gameState.deckCount;
    document.getElementById('direction').textContent = gameState.direction === 1 ? 'right' : 'left';

    // Update top card
    if (gameState.topCard) {
        updateTopCard(gameState.topCard);
    }

    // Update current color
    updateCurrentColor(gameState.currentColor);

    // Update other players
    updateOtherPlayers();

    // Update action buttons
    updateActionButtons();
}

function updateTopCard(card) {
    const topCardElement = document.getElementById('topCard');
    topCardElement.className = `card ${card.color} ${card.type}`;
    
    let cardText = '';
    if (card.type === 'number') {
        cardText = card.value.toString();
    } else if (card.type === 'special') {
        switch (card.value) {
            case 'skip': cardText = '⊘'; break;
            case 'reverse': cardText = '⇄'; break;
            case 'draw2': cardText = '+2'; break;
        }
    } else if (card.type === 'wild') {
        cardText = card.value === 'wild' ? '🌈' : '+4';
    }
    
    topCardElement.textContent = cardText;
}

function updateCurrentColor(color) {
    const colorDisplay = document.getElementById('currentColorDisplay');
    const colorIndicator = document.querySelector('.current-color-indicator');
    
    colorDisplay.textContent = color.charAt(0).toUpperCase() + color.slice(1);
    colorDisplay.style.color = getColorHex(color);
    colorDisplay.style.fontWeight = 'bold';
    
    // Update the color indicator circle
    colorIndicator.style.backgroundColor = getColorHex(color);
}

function updateOtherPlayers() {
    const otherPlayersContainer = document.getElementById('otherPlayers');
    otherPlayersContainer.innerHTML = '';

    gameState.players.forEach((player, index) => {
        if (player.id === currentPlayerId) return;

        const playerDiv = document.createElement('div');
        playerDiv.className = 'other-player';
        
        if (index === gameState.currentPlayerIndex) {
            playerDiv.classList.add('current-turn');
        }

        playerDiv.innerHTML = `
            <div class="other-player-name">${player.name}</div>
            <div class="other-player-cards">Cards: ${player.cardCount}</div>
        `;

        otherPlayersContainer.appendChild(playerDiv);
    });
}

function updateActionButtons() {
    const drawBtn = document.getElementById('drawCardBtn');
    const passBtn = document.getElementById('passTurnBtn');
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    const isMyTurn = currentPlayer && currentPlayer.id === currentPlayerId;
    const hasDrawn = isMyTurn && currentPlayer.hasDrawn;
    
    drawBtn.disabled = !isMyTurn || hasDrawn;
    passBtn.disabled = !isMyTurn || !hasDrawn;
}

function updatePlayerHand() {
    const handContainer = document.getElementById('playerHand');
    handContainer.innerHTML = '';

    playerHand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.color} ${card.type}`;
        
        // Check if card is playable
        if (canPlayCard(card)) {
            cardElement.classList.add('playable');
        }

        let cardText = '';
        if (card.type === 'number') {
            cardText = card.value.toString();
        } else if (card.type === 'special') {
            switch (card.value) {
                case 'skip': cardText = '⊘'; break;
                case 'reverse': cardText = '⇄'; break;
                case 'draw2': cardText = '+2'; break;
            }
        } else if (card.type === 'wild') {
            cardText = card.value === 'wild' ? '🌈' : '+4';
        }
        
        cardElement.textContent = cardText;
        
        cardElement.addEventListener('click', () => {
            playCard(index);
        });

        handContainer.appendChild(cardElement);
    });
}

function canPlayCard(card) {
    if (!gameState || !gameState.topCard) return false;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) return false;

    if (card.type === 'wild') return true;

    const topCard = gameState.topCard;
    return card.color === gameState.currentColor || 
           card.value === topCard.value ||
           (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value);
}

function playCard(cardIndex) {
    const card = playerHand[cardIndex];
    
    // Check if it's the player's turn first
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) {
        showMessage('Wait for your turn', 'warning');
        return;
    }
    
    if (!canPlayCard(card)) {
        showMessage('Cannot play this card', 'error');
        return;
    }

    if (card.type === 'wild') {
        pendingWildCard = cardIndex;
        colorChooserModal.classList.add('active');
    } else {
        socket.emit('playCard', { cardIndex });
    }
}

function getPlayerName(playerId) {
    if (!gameState) return 'Unknown Player';
    const player = gameState.players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
}

function getColorHex(color) {
    switch (color) {
        case 'red': return '#e74c3c';
        case 'blue': return '#3498db';
        case 'green': return '#27ae60';
        case 'yellow': return '#f39c12';
        default: return '#333';
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    
    // Focus on name input
    document.getElementById('playerName').focus();
    
    // Enter key handlers
    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('createGameBtn').click();
        }
    });
    
    document.getElementById('gameCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('joinGameBtn').click();
        }
    });
    
    // Auto-uppercase game code input
    document.getElementById('gameCodeInput').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
});

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
    });    socket.on('gameState', (state) => {
        console.log('Received gameState:', state);
        gameState = state;
        updateGameDisplay();
    });socket.on('gameStarted', () => {
        console.log('Game started event received');
        showScreen('gameScreen');
        showMessage('Game started!', 'success');
    });socket.on('playerHand', (hand) => {
        console.log('Received playerHand:', hand);
        playerHand = hand;
        updatePlayerHand();
    });socket.on('cardPlayed', (data) => {
        if (data.hasUno) {
            showMessage(`${getPlayerName(data.playerId)} has UNO!`, 'info');
            // Add celebration effect
            document.body.classList.add('celebration');
            setTimeout(() => document.body.classList.remove('celebration'), 2000);
        }
        if (data.hasWon) {
            showMessage(`${getPlayerName(data.playerId)} wins!`, 'success');
            // Add victory celebration
            createConfetti();
        }
    });

    socket.on('gameWon', (data) => {
        const winnerName = getPlayerName(data.winner);
        showMessage(`🎉 ${winnerName} wins the game! 🎉`, 'success');
        createConfetti();
        setTimeout(() => {
            if (confirm('Game ended! Would you like to return to the main menu?')) {
                location.reload();
            }
        }, 3000);
    });

    socket.on('cardDrawn', (card) => {
        showMessage('Card drawn!', 'info');
        // Add draw animation to the deck
        const deck = document.getElementById('drawPile');
        if (deck) {
            deck.style.transform = 'scale(1.1)';
            setTimeout(() => deck.style.transform = '', 200);
        }
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

    // Add entrance animation
    message.style.opacity = '0';
    message.style.transform = 'translateX(100%) scale(0.8)';
    
    requestAnimationFrame(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateX(0) scale(1)';
    });

    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transform = 'translateX(100%) scale(0.8)';
        setTimeout(() => message.remove(), 300);
    }, 4000);
}

// Add particle effect
function createParticles(element, color = '#ffd700') {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.background = color;
        particle.style.left = (rect.left + rect.width / 2) + 'px';
        particle.style.top = (rect.top + rect.height / 2) + 'px';
        particle.style.animationDelay = (i * 100) + 'ms';
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
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
    socket.emit('startGame');
});

document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the lobby?')) {
        location.reload();
    }
});

// Game screen handlers
document.getElementById('drawCardBtn').addEventListener('click', () => {
    const btn = document.getElementById('drawCardBtn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 150);
    socket.emit('drawCard');
});

document.getElementById('passTurnBtn').addEventListener('click', () => {
    const btn = document.getElementById('passTurnBtn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 150);
    socket.emit('passTurn');
});

// Color chooser handlers
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        
        // Add click animation
        btn.style.transform = 'scale(0.9)';
        createParticles(btn, getCardColor(color));
        
        setTimeout(() => {
            btn.style.transform = '';
            colorChooserModal.classList.remove('active');
            
            if (pendingWildCard !== null) {
                socket.emit('playCard', { cardIndex: pendingWildCard, chosenColor: color });
                pendingWildCard = null;
            }
        }, 200);
    });
    
    // Add hover effect
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.15) translateY(-4px)';
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
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

    startBtn.disabled = gameState.players.length < 2;
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
    document.getElementById('direction').textContent = gameState.direction === 1 ? '→' : '←';

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
    
    // Add update animation
    topCardElement.style.transform = 'scale(1.1) rotate(5deg)';
    setTimeout(() => {
        topCardElement.style.transform = 'scale(1) rotate(0deg)';
    }, 300);
}

function updateCurrentColor(color) {
    const colorDisplay = document.getElementById('currentColorDisplay');
    const colorIndicator = document.querySelector('.current-color-indicator');
    
    colorDisplay.textContent = color.charAt(0).toUpperCase() + color.slice(1);
    colorDisplay.style.color = getColorHex(color);
    colorDisplay.style.fontWeight = 'bold';
    
    if (colorIndicator) {
        colorIndicator.style.backgroundColor = getColorHex(color);
        colorIndicator.classList.add(`glow-${color}`);
    }
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
    console.log('updatePlayerHand called with:', playerHand);
    const handContainer = document.getElementById('playerHand');
    const unoBtn = document.getElementById('unoBtn');
    
    if (!handContainer) {
        console.error('playerHand container not found!');
        return;
    }
    
    console.log('Clearing hand container and adding', playerHand.length, 'cards');
    handContainer.innerHTML = '';
    
    // Add a temporary debug message to see if this function is running
    if (playerHand.length === 0) {
        handContainer.innerHTML = '<div style="color: white; padding: 1rem; text-align: center;">No cards in hand</div>';
        return;
    }

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
        
        // Add draw animation for new cards
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0) rotate(180deg)';
        requestAnimationFrame(() => {
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'scale(1) rotate(0deg)';
        });
          cardElement.addEventListener('click', () => {
            playCard(index);
        });

        console.log('Adding card to hand:', card, cardElement);
        handContainer.appendChild(cardElement);
    });
    
    console.log('Final hand container innerHTML length:', handContainer.innerHTML.length);
    console.log('Hand container children count:', handContainer.children.length);
    
    // Show UNO button if player has 2 cards (will have 1 after playing)
    if (playerHand.length === 2) {
        unoBtn.style.display = 'block';
        unoBtn.onclick = () => {
            createParticles(unoBtn, '#ff4757');
            showMessage('UNO!', 'success');
            unoBtn.style.display = 'none';
        };
    } else {
        unoBtn.style.display = 'none';
    }
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
    if (!canPlayCard(card)) {
        showMessage('Cannot play this card', 'error');
        return;
    }

    // Add play animation
    const cardElement = document.querySelector(`#playerHand .card:nth-child(${cardIndex + 1})`);
    if (cardElement) {
        cardElement.classList.add('playing');
        createParticles(cardElement, getCardColor(card.color));
    }

    if (card.type === 'wild') {
        pendingWildCard = cardIndex;
        colorChooserModal.classList.add('active');
    } else {
        socket.emit('playCard', { cardIndex });
    }
}

// Helper function to get card color hex
function getCardColor(color) {
    switch (color) {
        case 'red': return '#ff6b6b';
        case 'blue': return '#74b9ff';
        case 'green': return '#55efc4';
        case 'yellow': return '#fdcb6e';
        default: return '#a29bfe';
    }
}

// Create confetti effect for celebrations
function createConfetti() {
    const colors = ['#ff6b6b', '#74b9ff', '#55efc4', '#fdcb6e', '#a29bfe'];
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.animation = `confettiFall ${2 + Math.random() * 3}s linear forwards`;
        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => {
        document.body.removeChild(confettiContainer);
    }, 5000);
}

// Add confetti animation CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

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

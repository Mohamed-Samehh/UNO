const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// UNO Game Logic
class UnoGame {
    constructor(gameId) {
        this.gameId = gameId;
        this.players = [];
        this.deck = [];
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
        this.gameStarted = false;
        this.drawTwoStack = 0;
        this.drawFourStack = 0;
        this.skipNext = false;
        this.currentColor = null;
        this.lastCardPlayed = null;
    }

    addPlayer(playerId, playerName) {
        if (this.players.length >= 10) return false;
        
        const player = {
            id: playerId,
            name: playerName,
            hand: [],
            hasDrawn: false
        };
        
        this.players.push(player);
        return true;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        if (this.players.length < 2 && this.gameStarted) {
            this.gameStarted = false;
        }
    }

    initializeDeck() {
        this.deck = [];
        const colors = ['red', 'blue', 'green', 'yellow'];
        const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const specials = ['skip', 'reverse', 'draw2'];

        // Add number cards (0 has 1 card per color, 1-9 have 2 cards per color)
        colors.forEach(color => {
            this.deck.push({ color, value: 0, type: 'number' });
            for (let i = 1; i <= 9; i++) {
                this.deck.push({ color, value: i, type: 'number' });
                this.deck.push({ color, value: i, type: 'number' });
            }
        });

        // Add special cards (2 per color)
        colors.forEach(color => {
            specials.forEach(special => {
                this.deck.push({ color, value: special, type: 'special' });
                this.deck.push({ color, value: special, type: 'special' });
            });
        });

        // Add wild cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({ color: 'wild', value: 'wild', type: 'wild' });
            this.deck.push({ color: 'wild', value: 'draw4', type: 'wild' });
        }

        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        this.players.forEach(player => {
            player.hand = [];
            for (let i = 0; i < 7; i++) {
                player.hand.push(this.drawCard());
            }
        });

        // Place first card
        let firstCard;
        do {
            firstCard = this.drawCard();
        } while (firstCard.type === 'wild');

        this.discardPile.push(firstCard);
        this.currentColor = firstCard.color;
        this.lastCardPlayed = firstCard;
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.reshuffleDeck();
        }
        return this.deck.pop();
    }

    reshuffleDeck() {
        if (this.discardPile.length <= 1) return;
        
        const topCard = this.discardPile.pop();
        this.deck = [...this.discardPile];
        this.discardPile = [topCard];
        this.shuffleDeck();
    }

    startGame() {
        if (this.players.length < 2) return false;
        
        this.initializeDeck();
        this.dealCards();
        this.gameStarted = true;
        this.currentPlayerIndex = 0;
        return true;
    }

    canPlayCard(card, playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.players[this.currentPlayerIndex].id !== playerId) {
            return false;
        }

        if (card.type === 'wild') return true;

        const topCard = this.discardPile[this.discardPile.length - 1];
        return card.color === this.currentColor || 
               card.value === topCard.value ||
               (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value);
    }

    playCard(cardIndex, playerId, chosenColor = null) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.players[this.currentPlayerIndex].id !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { success: false, message: 'Invalid card' };
        }

        const card = player.hand[cardIndex];
        
        if (!this.canPlayCard(card, playerId)) {
            return { success: false, message: 'Cannot play this card' };
        }

        // Remove card from player's hand
        player.hand.splice(cardIndex, 1);
        this.discardPile.push(card);
        this.lastCardPlayed = card;

        // Handle special cards
        if (card.type === 'wild') {
            this.currentColor = chosenColor || 'red';
            if (card.value === 'draw4') {
                this.drawFourStack += 4;
            }
        } else {
            this.currentColor = card.color;
            
            if (card.value === 'skip') {
                this.skipNext = true;
            } else if (card.value === 'reverse') {
                this.direction *= -1;
                if (this.players.length === 2) {
                    this.skipNext = true;
                }
            } else if (card.value === 'draw2') {
                this.drawTwoStack += 2;
            }
        }

        // Check for UNO (one card left)
        const hasUno = player.hand.length === 1;
        
        // Check for win
        const hasWon = player.hand.length === 0;

        if (!hasWon) {
            this.nextTurn();
        }

        return { 
            success: true, 
            hasUno, 
            hasWon,
            card: card
        };
    }

    nextTurn() {
        // Handle draw stacks
        if (this.drawTwoStack > 0 || this.drawFourStack > 0) {
            const nextPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
            const nextPlayer = this.players[nextPlayerIndex];
            
            const totalDraw = this.drawTwoStack + this.drawFourStack;
            for (let i = 0; i < totalDraw; i++) {
                nextPlayer.hand.push(this.drawCard());
            }
            
            this.drawTwoStack = 0;
            this.drawFourStack = 0;
            this.skipNext = true;
        }

        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
        
        // Handle skip
        if (this.skipNext) {
            this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
            this.skipNext = false;
        }

        // Reset draw flag for all players
        this.players.forEach(player => player.hasDrawn = false);
    }

    drawCardForPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.players[this.currentPlayerIndex].id !== playerId || player.hasDrawn) {
            return { success: false };
        }

        const card = this.drawCard();
        player.hand.push(card);
        player.hasDrawn = true;

        return { success: true, card };
    }

    passTurn(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.players[this.currentPlayerIndex].id !== playerId || !player.hasDrawn) {
            return false;
        }

        this.nextTurn();
        return true;
    }

    getGameState() {
        return {
            gameId: this.gameId,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length,
                hasDrawn: p.hasDrawn
            })),
            currentPlayerIndex: this.currentPlayerIndex,
            topCard: this.discardPile[this.discardPile.length - 1],
            currentColor: this.currentColor,
            deckCount: this.deck.length,
            gameStarted: this.gameStarted,
            direction: this.direction
        };
    }

    getPlayerHand(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.hand : [];
    }
}

// Game management
const games = new Map();
const playerToGame = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createGame', (playerName) => {
        const gameId = uuidv4().substring(0, 6).toUpperCase();
        const game = new UnoGame(gameId);
        
        if (game.addPlayer(socket.id, playerName)) {
            games.set(gameId, game);
            playerToGame.set(socket.id, gameId);
            socket.join(gameId);
            
            socket.emit('gameCreated', { gameId, playerId: socket.id });
            io.to(gameId).emit('gameState', game.getGameState());
        }
    });

    socket.on('joinGame', ({ gameId, playerName }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }

        if (game.addPlayer(socket.id, playerName)) {
            playerToGame.set(socket.id, gameId);
            socket.join(gameId);
            
            socket.emit('gameJoined', { gameId, playerId: socket.id });
            io.to(gameId).emit('gameState', game.getGameState());
        } else {
            socket.emit('error', 'Game is full');
        }
    });

    socket.on('startGame', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (game && game.startGame()) {
            io.to(gameId).emit('gameStarted');
            io.to(gameId).emit('gameState', game.getGameState());
            
            // Send each player their hand
            game.players.forEach(player => {
                io.to(player.id).emit('playerHand', game.getPlayerHand(player.id));
            });
        }
    });

    socket.on('playCard', ({ cardIndex, chosenColor }) => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (game) {
            const result = game.playCard(cardIndex, socket.id, chosenColor);
            
            if (result.success) {
                io.to(gameId).emit('cardPlayed', {
                    playerId: socket.id,
                    card: result.card,
                    hasUno: result.hasUno,
                    hasWon: result.hasWon
                });
                
                io.to(gameId).emit('gameState', game.getGameState());
                
                // Send updated hands
                game.players.forEach(player => {
                    io.to(player.id).emit('playerHand', game.getPlayerHand(player.id));
                });

                if (result.hasWon) {
                    io.to(gameId).emit('gameWon', { winner: socket.id });
                }
            } else {
                socket.emit('error', result.message);
            }
        }
    });

    socket.on('drawCard', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (game) {
            const result = game.drawCardForPlayer(socket.id);
            
            if (result.success) {
                socket.emit('cardDrawn', result.card);
                socket.emit('playerHand', game.getPlayerHand(socket.id));
                io.to(gameId).emit('gameState', game.getGameState());
            }
        }
    });

    socket.on('passTurn', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (game && game.passTurn(socket.id)) {
            io.to(gameId).emit('gameState', game.getGameState());
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            const game = games.get(gameId);
            if (game) {
                game.removePlayer(socket.id);
                
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    io.to(gameId).emit('playerLeft', socket.id);
                    io.to(gameId).emit('gameState', game.getGameState());
                }
            }
            playerToGame.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`UNO game server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to play!`);
});

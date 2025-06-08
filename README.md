# 🎴 UNO Multiplayer Game

A real-time multiplayer UNO game built with Node.js, Socket.io, and modern web technologies. Play with 2-4 friends in real-time!

## ✨ Features

- 🌐 **Real-time multiplayer** - Play with 2-4 players simultaneously
- 🎨 **Beautiful modern UI** - Responsive design that works on all devices
- 🃏 **Complete UNO rules** - All special cards, proper game flow, and win conditions
- 🔗 **Easy game sharing** - Share a simple 6-character game code with friends
- 📱 **Mobile friendly** - Play on desktop, tablet, or mobile
- ⚡ **Fast deployment** - Easy to set up and deploy anywhere

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Play the Game
Open your browser and go to `http://localhost:3000`

## 🎮 How to Play

1. **Create or Join Game**
   - Enter your name
   - Click "Create New Game" to start a new game
   - Or enter a game code and click "Join Game" to join an existing game

2. **Game Lobby**
   - Share the 6-character game code with your friends
   - Wait for 2-4 players to join
   - Click "Start Game" when ready

3. **Playing UNO**
   - Players take turns playing cards that match either the color or number/symbol
   - Special cards: Skip, Reverse, Draw Two, Wild, Wild Draw Four
   - Draw a card if you can't play
   - Pass your turn after drawing if you still can't play
   - First player to empty their hand wins!

## 🃏 UNO Rules Included

- **Number Cards (0-9)**: Must match color or number
- **Skip Cards**: Next player loses their turn
- **Reverse Cards**: Changes direction of play
- **Draw Two Cards**: Next player draws 2 cards and loses turn
- **Wild Cards**: Can be played anytime, player chooses next color
- **Wild Draw Four**: Can be played anytime, next player draws 4 cards

## 🛠️ Development

### Scripts
- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-restart

### File Structure
```
UNO/
├── server.js          # Main server file with game logic
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Game interface
│   ├── style.css      # Beautiful styling
│   └── script.js      # Client-side game logic
└── README.md         # This file
```

## 🎯 Game Features

### Real-time Synchronization
- All players see moves instantly
- Live game state updates
- Player connection/disconnection handling

### Smart Game Logic
- Proper card validation
- Turn management
- Special card effects
- Win condition detection
- Automatic deck reshuffling

### User Experience
- Intuitive card selection
- Visual feedback for playable cards
- Color selection for wild cards
- Game notifications and messages
- Mobile-responsive design

## 🔧 Technical Details

- **Backend**: Node.js with Express
- **Real-time**: Socket.io for WebSocket connections
- **Frontend**: Vanilla JavaScript with modern CSS
- **Game Logic**: Complete UNO rule implementation
- **Session Management**: Room-based multiplayer system

---

**Enjoy playing UNO with your friends! 🎉**

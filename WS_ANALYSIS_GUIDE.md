# Chess.com WebSocket Analysis Guide

## What You Have: ws-analysis.js

A WebSocket client that connects to `wss://analysis.chess.com/` to receive real-time game analysis.

## How to Use

### 1. Test Connection
```bash
node ws-analysis.js test
```

This will:
- Connect to the WebSocket
- Try different message formats
- Show any responses received
- Help you understand the protocol

### 2. Subscribe to a Game
```bash
node ws-analysis.js game 144540017288
```

This will:
- Connect to the WebSocket
- Try various subscription message formats
- Listen for analysis data for that game
- Display any messages received

### 3. Interactive Mode
```bash
node ws-analysis.js interactive
```

This lets you:
- Send custom messages
- Type JSON or simple commands
- Experiment with the protocol
- See responses in real-time

## Expected Output (When Network Works)

### Successful Connection
```
══════════════════════════════════════════════════════════════════════
CHESS.COM WEBSOCKET ANALYSIS TEST
══════════════════════════════════════════════════════════════════════

🔌 Connecting to Chess.com Analysis WebSocket...
   wss://analysis.chess.com/

✅ WebSocket connected!

📊 Connection successful!

Now testing different message types...

TEST 1: Sending hello message
────────────────────────────────────────────────────────────────────
{"action":"hello","version":"1.0"}
────────────────────────────────────────────────────────────────────

📨 Received message:
────────────────────────────────────────────────────────────────────
{
  "type": "welcome",
  "version": "1.0",
  "serverTime": 1729498234
}
────────────────────────────────────────────────────────────────────
```

### When Subscribing to Game Analysis
```
📤 Sending message:
────────────────────────────────────────────────────────────────────
{"action":"subscribe","channel":"analysis","gameId":"144540017288"}
────────────────────────────────────────────────────────────────────

📨 Received message:
────────────────────────────────────────────────────────────────────
{
  "type": "analysis",
  "gameId": "144540017288",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "evaluation": 0.2,
  "depth": 20,
  "bestMove": "e2e4",
  "pv": ["e2e4", "c7c5", "g1f3"],
  "moveNumber": 1
}
────────────────────────────────────────────────────────────────────
```

## Message Formats to Try

Based on typical WebSocket patterns, here are formats to experiment with:

### 1. JSON Subscribe
```json
{
  "action": "subscribe",
  "channel": "game",
  "gameId": "144540017288"
}
```

### 2. Analysis Request
```json
{
  "action": "analyze",
  "gameId": "144540017288",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

### 3. Position Analysis
```json
{
  "type": "analyze",
  "position": {
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "moves": ["e2e4"]
  }
}
```

### 4. String Protocol
```
SUBSCRIBE:game:144540017288
ANALYZE:144540017288
GET:/analysis/144540017288
```

## Interactive Mode Commands

Once connected in interactive mode:

```
# Subscribe to game
game:144540017288

# Send ping
ping

# Custom JSON
{"action":"subscribe","gameId":"144540017288"}

# Simple string
HELLO

# Exit
quit
```

## What Data You Might Receive

### Game Analysis Data
```json
{
  "type": "analysis",
  "gameId": "144540017288",
  "move": 15,
  "evaluation": -2.5,
  "classification": "blunder",
  "bestMove": "Nf6",
  "accuracy": 73.2
}
```

### Position Evaluation
```json
{
  "type": "evaluation",
  "gameId": "144540017288",
  "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  "score": {
    "type": "cp",
    "value": 30
  },
  "depth": 20,
  "bestMove": "d2d3"
}
```

### Accuracy Update
```json
{
  "type": "accuracy",
  "gameId": "144540017288",
  "white": 87.3,
  "black": 73.2,
  "moves": [
    { "move": 1, "accuracy": 95.2 },
    { "move": 2, "accuracy": 92.1 },
    { "move": 15, "accuracy": 45.3, "classification": "blunder" }
  ]
}
```

## How to Use the Data

### 1. Save to Database
When you receive analysis data:

```javascript
client.onMessage((message) => {
  try {
    const data = JSON.parse(message);
    
    if (data.type === 'analysis') {
      // Save to database
      saveAnalysisToDB(data.gameId, data);
    }
  } catch (error) {
    // Not JSON or error parsing
  }
});
```

### 2. Real-Time Analysis Display
```javascript
client.onMessage((message) => {
  const data = JSON.parse(message);
  
  if (data.type === 'evaluation') {
    console.log(`Move ${data.move}: ${data.evaluation}`);
    console.log(`Best move: ${data.bestMove}`);
  }
});
```

### 3. Track Blunders
```javascript
client.onMessage((message) => {
  const data = JSON.parse(message);
  
  if (data.classification === 'blunder') {
    console.log(`⚠️  Blunder at move ${data.move}!`);
    console.log(`   Should have played: ${data.bestMove}`);
  }
});
```

## Debugging Tips

### 1. Check Connection
```bash
# Should see "WebSocket connected!"
node ws-analysis.js test
```

### 2. Monitor All Messages
```bash
# Interactive mode shows all incoming messages
node ws-analysis.js interactive
```

### 3. Try Different Formats
In interactive mode, try:
- `{"action":"hello"}`
- `game:144540017288`
- `ping`
- `SUBSCRIBE:game:144540017288`

### 4. Check Browser DevTools
1. Open Chess.com game analysis page
2. Open DevTools → Network → WS
3. Click on the WebSocket connection
4. See Messages tab
5. Copy the exact format they use

## Common Issues

### Connection Refused
- Chess.com may require authentication for WebSocket
- Try including cookies from logged-in session
- May need to connect from browser context

### No Messages Received
- Protocol might be different than expected
- May need specific subscription format
- Could require game to be actively being analyzed

### Authentication Required
If you get auth errors, you may need:
```javascript
const ws = new WebSocket(WS_URL, {
  headers: {
    'Cookie': 'your-chess-com-session-cookie',
    'Authorization': 'Bearer your-token'
  }
});
```

## Integrating with Your Tools

Once you figure out the protocol:

### 1. Real-Time Analysis
```javascript
// Connect when user starts analyzing
const client = new ChessComAnalysisWS();
await client.connect();

// Subscribe to their game
client.subscribeToGame(gameId);

// Display analysis as it comes
client.onMessage((data) => {
  updateUI(data);
  saveToDatabase(data);
});
```

### 2. Batch Analysis
```javascript
// Analyze multiple games
for (const gameId of gameIds) {
  client.subscribeToGame(gameId);
  
  // Wait for analysis
  await new Promise(resolve => {
    client.onMessage((data) => {
      if (data.type === 'complete') {
        saveToDatabase(gameId, data);
        resolve();
      }
    });
  });
}
```

### 3. Live Game Analysis
```javascript
// Connect to live game
client.subscribeToGame(liveGameId);

// Show evaluation in real-time
client.onMessage((data) => {
  if (data.type === 'evaluation') {
    console.log(`Current position: ${data.evaluation}`);
    console.log(`Best move: ${data.bestMove}`);
  }
});
```

## Comparison: WebSocket vs HTTP API

### WebSocket (ws-analysis.js)
- ✅ Real-time updates
- ✅ Push notifications
- ✅ Lower latency
- ❌ More complex protocol
- ❌ May require authentication

### HTTP API (chesscom-analysis.js)
- ✅ Simple REST calls
- ✅ No authentication needed
- ✅ Easier to debug
- ❌ No real-time updates
- ❌ Requires polling

**Recommendation**: Use HTTP API (`chesscom-analysis.js`) for batch analysis of completed games. Use WebSocket for real-time analysis of games in progress.

## Next Steps

### 1. On Your Machine
```bash
# Test the connection
node ws-analysis.js test

# Try interactive mode
node ws-analysis.js interactive
```

### 2. Reverse Engineer Protocol
1. Open Chess.com analysis page in browser
2. Open DevTools → Network → WS tab
3. Watch the WebSocket messages
4. Copy the exact format
5. Update ws-analysis.js with correct format

### 3. Integrate with Database
Once you know the message format:
```javascript
client.onMessage((message) => {
  const data = JSON.parse(message);
  saveToDatabase(data.gameId, data);
});
```

## Example: Complete Integration

```javascript
const { ChessComAnalysisWS } = require('./ws-analysis.js');
const sqlite3 = require('sqlite3').verbose();

async function analyzeGameRealtime(gameId) {
  const db = new sqlite3.Database('./chess_games.db');
  const client = new ChessComAnalysisWS();
  
  await client.connect();
  
  // Subscribe to game
  client.subscribeToGame(gameId);
  
  // Handle messages
  client.onMessage((message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'analysis') {
        // Save to database
        db.run(`
          INSERT INTO realtime_analysis 
          (game_id, move_number, evaluation, best_move, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `, [
          data.gameId,
          data.moveNumber,
          data.evaluation,
          data.bestMove,
          Date.now()
        ]);
        
        console.log(`Move ${data.moveNumber}: ${data.evaluation}`);
      }
    } catch (error) {
      // Handle error
    }
  });
  
  // Keep connection alive
  setInterval(() => {
    client.send({ type: 'ping' });
  }, 30000);
}
```

## Summary

The WebSocket tool (`ws-analysis.js`) is ready to use. On your machine:

1. **Test it**: `node ws-analysis.js test`
2. **Try a game**: `node ws-analysis.js game 144540017288`
3. **Go interactive**: `node ws-analysis.js interactive`
4. **Watch the browser** to see exact message formats
5. **Update the code** with correct protocol
6. **Integrate** with your database

The HTTP API tool (`chesscom-analysis.js`) is simpler and works now for completed games. Use that for most cases, and use WebSocket when you need real-time updates!

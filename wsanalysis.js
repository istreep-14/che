#!/usr/bin/env node
// Chess.com WebSocket Analysis Client
// Connects to wss://analysis.chess.com/ to receive real-time game analysis

const WebSocket = require('/tmp/test-ws/node_modules/ws');

const WS_URL = 'wss://analysis.chess.com/';

class ChessComAnalysisWS {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Chess.com Analysis WebSocket...');
      console.log(`   ${WS_URL}\n`);

      this.ws = new WebSocket(WS_URL, {
        headers: {
          'Origin': 'https://www.chess.com',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected!\n');
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`\n🔌 WebSocket closed (code: ${code}, reason: ${reason || 'none'})`);
        this.connected = false;
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  handleMessage(data) {
    try {
      const text = data.toString();
      console.log('\n📨 Received message:');
      console.log('─'.repeat(70));
      
      // Try to parse as JSON
      try {
        const json = JSON.parse(text);
        
        // Check if it's an analyzeGame message
        if (json.action === 'analyzeGame' && json.data) {
          this.displayAnalysis(json);
        } else {
          console.log(JSON.stringify(json, null, 2));
        }
      } catch {
        // Not JSON, just print the text
        console.log(text);
      }
      
      console.log('─'.repeat(70));

      // Notify handlers
      this.messageHandlers.forEach(handler => handler(text));
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  displayAnalysis(message) {
    const data = message.data;
    const positions = data.positions || [];
    
    // Count classifications
    let blunders = 0, mistakes = 0, inaccuracies = 0;
    positions.forEach(pos => {
      const classification = pos.classificationName;
      if (classification === 'blunder') blunders++;
      else if (classification === 'mistake') mistakes++;
      else if (classification === 'inaccuracy') inaccuracies++;
    });
    
    // Calculate accuracy
    const whitePositions = positions.filter(p => p.color === 'white' && p.caps2 !== null);
    const blackPositions = positions.filter(p => p.color === 'black' && p.caps2 !== null);
    
    const whiteAccuracy = whitePositions.length > 0 
      ? (whitePositions.reduce((sum, p) => sum + p.caps2, 0) / whitePositions.length).toFixed(1)
      : 'N/A';
    
    const blackAccuracy = blackPositions.length > 0
      ? (blackPositions.reduce((sum, p) => sum + p.caps2, 0) / blackPositions.length).toFixed(1)
      : 'N/A';
    
    console.log('\n🎯 ANALYSIS RECEIVED!');
    console.log(`Total Positions: ${positions.length}`);
    console.log(`\nAccuracy:`);
    console.log(`  White: ${whiteAccuracy}%`);
    console.log(`  Black: ${blackAccuracy}%`);
    console.log(`\nErrors:`);
    console.log(`  Blunders: ${blunders}`);
    console.log(`  Mistakes: ${mistakes}`);
    console.log(`  Inaccuracies: ${inaccuracies}`);
  }

  send(message) {
    if (!this.connected) {
      console.error('❌ Not connected');
      return false;
    }

    console.log('\n📤 Sending message:');
    console.log('─'.repeat(70));
    
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(messageStr);
    console.log('─'.repeat(70));

    this.ws.send(messageStr);
    return true;
  }

  // Subscribe to game analysis
  subscribeToGame(gameId) {
    const message = {
      action: 'subscribe',
      channel: 'game',
      gameId: gameId
    };
    return this.send(message);
  }

  // Request analysis for specific game
  requestAnalysis(gameId) {
    const message = {
      action: 'analyze',
      gameId: gameId
    };
    return this.send(message);
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// ============ TEST SCENARIOS ============

async function testConnection() {
  console.log('\n' + '═'.repeat(70));
  console.log('CHESS.COM WEBSOCKET ANALYSIS TEST');
  console.log('═'.repeat(70) + '\n');

  const client = new ChessComAnalysisWS();

  try {
    // Connect
    await client.connect();

    console.log('📊 Connection successful!\n');
    console.log('Now testing different message types...\n');

    // Test 1: Send a ping or hello message
    console.log('TEST 1: Sending hello message');
    client.send({ action: 'hello', version: '1.0' });

    await wait(2000);

    // Test 2: Subscribe to a game (using your example game ID)
    console.log('\nTEST 2: Subscribing to game analysis');
    client.subscribeToGame('144540017288');

    await wait(2000);

    // Test 3: Request analysis
    console.log('\nTEST 3: Requesting analysis');
    client.requestAnalysis('144540017288');

    await wait(2000);

    // Test 4: Try different message format
    console.log('\nTEST 4: Trying alternative message format');
    client.send('SUBSCRIBE:game:144540017288');

    await wait(2000);

    // Test 5: Ping
    console.log('\nTEST 5: Sending ping');
    client.send({ type: 'ping' });

    await wait(2000);

    console.log('\n✅ Test complete!\n');
    console.log('If you saw messages above, the WebSocket is working!');
    console.log('The actual message format depends on Chess.com\'s protocol.\n');

    // Keep connection open for a bit to see if we get any responses
    console.log('Waiting 10 seconds for any responses...\n');
    await wait(10000);

    client.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function subscribeToGame(gameId) {
  console.log('\n' + '═'.repeat(70));
  console.log(`SUBSCRIBING TO GAME: ${gameId}`);
  console.log('═'.repeat(70) + '\n');

  const client = new ChessComAnalysisWS();

  try {
    await client.connect();

    // Try various subscription formats
    console.log('Trying subscription formats...\n');

    // Format 1: Standard JSON
    client.send({ 
      action: 'subscribe', 
      channel: 'analysis',
      gameId: gameId 
    });

    await wait(1000);

    // Format 2: Game channel
    client.send({ 
      type: 'subscribe',
      game: gameId 
    });

    await wait(1000);

    // Format 3: Simple string
    client.send(`subscribe:${gameId}`);

    await wait(1000);

    // Format 4: Analysis request
    client.send({ 
      method: 'GET',
      path: `/analysis/${gameId}` 
    });

    console.log('\n⏳ Listening for messages (30 seconds)...\n');
    
    // Keep listening
    await wait(30000);

    client.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function interactiveMode() {
  console.log('\n' + '═'.repeat(70));
  console.log('INTERACTIVE WEBSOCKET MODE');
  console.log('═'.repeat(70) + '\n');

  const client = new ChessComAnalysisWS();
  const readline = require('readline');

  try {
    await client.connect();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n✅ Connected! You can now send messages.\n');
    console.log('Commands:');
    console.log('  - Type JSON to send: {"action": "subscribe", "gameId": "12345"}');
    console.log('  - Type "quit" to exit');
    console.log('  - Type "ping" to send ping');
    console.log('  - Type "game:ID" to subscribe to game\n');

    const promptUser = () => {
      rl.question('> ', (input) => {
        const trimmed = input.trim();

        if (trimmed === 'quit' || trimmed === 'exit') {
          console.log('\n👋 Goodbye!');
          client.disconnect();
          rl.close();
          process.exit(0);
        }

        if (trimmed === 'ping') {
          client.send({ type: 'ping' });
        } else if (trimmed.startsWith('game:')) {
          const gameId = trimmed.split(':')[1];
          client.subscribeToGame(gameId);
        } else if (trimmed.startsWith('{')) {
          try {
            const json = JSON.parse(trimmed);
            client.send(json);
          } catch (error) {
            console.error('Invalid JSON');
          }
        } else {
          client.send(trimmed);
        }

        promptUser();
      });
    };

    promptUser();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Helper
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Chess.com WebSocket Analysis Client

Connects to wss://analysis.chess.com/ to receive real-time game analysis.

Usage:
  node ws-analysis.js test              Test connection and message formats
  node ws-analysis.js game <id>         Subscribe to specific game analysis
  node ws-analysis.js interactive       Interactive mode - send custom messages

Examples:
  node ws-analysis.js test
  node ws-analysis.js game 144540017288
  node ws-analysis.js interactive

Note: The exact message protocol is not documented, so we'll try various formats.
`);
    return;
  }

  const command = args[0];

  switch (command) {
    case 'test':
      await testConnection();
      break;

    case 'game':
      if (args.length < 2) {
        console.error('❌ Please provide a game ID');
        console.log('Usage: node ws-analysis.js game <game-id>');
        process.exit(1);
      }
      await subscribeToGame(args[1]);
      break;

    case 'interactive':
    case 'i':
      await interactiveMode();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run with --help for usage');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
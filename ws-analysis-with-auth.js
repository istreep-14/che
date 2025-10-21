#!/usr/bin/env node
// Chess.com WebSocket Analysis Client with Authentication
// Connects to wss://analysis.chess.com/ with auth token support

const WebSocket = require('ws');

const WS_URL = 'wss://analysis.chess.com/';

class ChessComAnalysisWS {
  constructor(authToken = null) {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = [];
    this.authToken = authToken;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Chess.com Analysis WebSocket...');
      console.log(`   ${WS_URL}`);
      if (this.authToken) {
        console.log('🔑 Using authentication token');
      } else {
        console.log('⚠️  No authentication token provided');
      }
      console.log('');

      const headers = {
        'Origin': 'https://www.chess.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Add authentication if token is provided
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
        // Alternative: headers['Cookie'] = `PHPSESSID=${this.authToken}`;
        // Alternative: headers['X-Auth-Token'] = this.authToken;
      }

      this.ws = new WebSocket(WS_URL, { headers });

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected!\n');
        this.connected = true;
        
        // Send authentication message if token is provided
        if (this.authToken) {
          this.sendAuth();
        }
        
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

  sendAuth() {
    // Try different authentication message formats
    const authMessages = [
      { action: 'auth', token: this.authToken },
      { action: 'authenticate', token: this.authToken },
      { type: 'auth', token: this.authToken },
      { auth: this.authToken },
      `AUTH:${this.authToken}`,
      `TOKEN:${this.authToken}`
    ];

    console.log('🔑 Sending authentication...');
    this.send(authMessages[0]); // Start with the first format
  }

  handleMessage(data) {
    try {
      const text = data.toString();
      console.log('\n📨 Received message:');
      console.log('─'.repeat(70));
      
      // Try to parse as JSON
      try {
        const json = JSON.parse(text);
        
        // Check for authentication responses
        if (json.err === 0 && json.message === 'authenticated') {
          console.log('✅ Authentication successful!');
        } else if (json.err === 1 && json.message === 'no auth token in request') {
          console.log('❌ Authentication failed: No auth token in request');
          console.log('💡 Try providing a valid authentication token');
        } else if (json.err === 1 && json.message === 'invalid auth token') {
          console.log('❌ Authentication failed: Invalid auth token');
          console.log('💡 Check if your token is correct and not expired');
        }
        
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

    console.log('\n📊 ANALYSIS RESULTS:');
    console.log(`  Positions analyzed: ${positions.length}`);
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

async function testConnection(authToken = null) {
  console.log('\n' + '═'.repeat(70));
  console.log('CHESS.COM WEBSOCKET ANALYSIS TEST WITH AUTH');
  console.log('═'.repeat(70) + '\n');

  const client = new ChessComAnalysisWS(authToken);

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

    // Wait for any additional responses
    console.log('Waiting 10 seconds for any responses...\n');
    await wait(10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    client.disconnect();
  }
}

// ============ INTERACTIVE MODE ============

async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '═'.repeat(70));
  console.log('CHESS.COM WEBSOCKET INTERACTIVE MODE');
  console.log('═'.repeat(70) + '\n');

  // Get auth token
  const authToken = await new Promise((resolve) => {
    rl.question('Enter your Chess.com auth token (or press Enter to skip): ', (answer) => {
      resolve(answer.trim() || null);
    });
  });

  const client = new ChessComAnalysisWS(authToken);

  try {
    await client.connect();
    console.log('\n✅ Connected! Type messages to send (or "quit" to exit):\n');

    rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (trimmed === 'quit') {
        console.log('👋 Goodbye!');
        client.disconnect();
        rl.close();
        process.exit(0);
      } else if (trimmed === 'ping') {
        client.send({ type: 'ping' });
      } else if (trimmed.startsWith('game:')) {
        const gameId = trimmed.split(':')[1];
        if (gameId) {
          client.subscribeToGame(gameId);
        } else {
          console.log('Usage: game:<game-id>');
        }
      } else if (trimmed.startsWith('analyze:')) {
        const gameId = trimmed.split(':')[1];
        if (gameId) {
          client.requestAnalysis(gameId);
        } else {
          console.log('Usage: analyze:<game-id>');
        }
      } else if (trimmed) {
        try {
          const json = JSON.parse(trimmed);
          client.send(json);
        } catch {
          client.send(trimmed);
        }
      }
    });

    // Keep alive
    setInterval(() => {
      if (client.connected) {
        client.send({ type: 'ping' });
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
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
Chess.com WebSocket Analysis Client with Authentication

Usage:
  node ws-analysis-with-auth.js test [auth-token]     Test connection with optional auth
  node ws-analysis-with-auth.js interactive          Interactive mode
  node ws-analysis-with-auth.js game <game-id> [auth-token]  Analyze specific game

Examples:
  node ws-analysis-with-auth.js test
  node ws-analysis-with-auth.js test "your-auth-token-here"
  node ws-analysis-with-auth.js interactive
  node ws-analysis-with-auth.js game 144540017288 "your-auth-token-here"

Authentication:
  You can get auth tokens from:
  1. Chess.com session cookies (PHPSESSID)
  2. Chess.com API tokens (if available)
  3. Browser developer tools → Application → Cookies
`);
    return;
  }

  try {
    switch (args[0]) {
      case 'test':
        const authToken = args[1] || process.env.CHESSCOM_AUTH_TOKEN || null;
        await testConnection(authToken);
        break;
        
      case 'interactive':
        await interactiveMode();
        break;
        
      case 'game':
        if (args.length < 2) {
          console.log('Usage: node ws-analysis-with-auth.js game <game-id> [auth-token]');
          process.exit(1);
        }
        const gameId = args[1];
        const gameAuthToken = args[2] || process.env.CHESSCOM_AUTH_TOKEN || null;
        
        const client = new ChessComAnalysisWS(gameAuthToken);
        await client.connect();
        client.subscribeToGame(gameId);
        client.requestAnalysis(gameId);
        
        // Keep alive
        setInterval(() => {
          if (client.connected) {
            client.send({ type: 'ping' });
          }
        }, 30000);
        break;
        
      default:
        console.log('Unknown command. Run with --help for usage');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
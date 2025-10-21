#!/usr/bin/env node
// Example: Using Chess.com WebSocket with Authentication
// This shows how to use the authenticated WebSocket client

const ChessComAnalysisWS = require('./ws-analysis-with-auth.js');

async function exampleWithAuth() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║              CHESS.COM WEBSOCKET AUTHENTICATION EXAMPLE             ║
╚══════════════════════════════════════════════════════════════════════╝

This example shows how to use authentication with the Chess.com WebSocket.

════════════════════════════════════════════════════════════════════════
`);

  // Example 1: Without authentication (will show auth error)
  console.log('EXAMPLE 1: Without Authentication');
  console.log('─'.repeat(50));
  
  const client1 = new ChessComAnalysisWS();
  
  try {
    await client1.connect();
    console.log('✅ Connected without auth (but will get auth errors)');
    
    // Try to subscribe to a game
    client1.subscribeToGame('144540017288');
    
    // Wait a bit to see the auth error
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  } finally {
    client1.disconnect();
  }

  console.log('\n' + '═'.repeat(70) + '\n');

  // Example 2: With authentication (if token provided)
  const authToken = process.env.CHESSCOM_AUTH_TOKEN || process.argv[2];
  
  if (authToken) {
    console.log('EXAMPLE 2: With Authentication');
    console.log('─'.repeat(50));
    console.log(`Using token: ${authToken.substring(0, 10)}...`);
    
    const client2 = new ChessComAnalysisWS(authToken);
    
    try {
      await client2.connect();
      console.log('✅ Connected with authentication!');
      
      // Subscribe to a game
      client2.subscribeToGame('144540017288');
      
      // Request analysis
      client2.requestAnalysis('144540017288');
      
      // Wait to see responses
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
    } finally {
      client2.disconnect();
    }
  } else {
    console.log('EXAMPLE 2: With Authentication');
    console.log('─'.repeat(50));
    console.log('⚠️  No authentication token provided');
    console.log('   To test with auth, run:');
    console.log('   CHESSCOM_AUTH_TOKEN="your-token" node example-with-auth.js');
    console.log('   or:');
    console.log('   node example-with-auth.js "your-token"');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('EXAMPLE COMPLETE');
  console.log('═'.repeat(70));
  console.log(`
To get your authentication token:

1. Open Chess.com in your browser and log in
2. Press F12 → Application → Cookies → https://www.chess.com
3. Find PHPSESSID or similar cookie
4. Copy the value

Then run:
  CHESSCOM_AUTH_TOKEN="your-token" node example-with-auth.js
`);
}

// Run the example
exampleWithAuth().catch(console.error);
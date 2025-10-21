#!/usr/bin/env node
// Chess.com Token Tester
// Tests authentication tokens with different methods

const https = require('https');

class TokenTester {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  }

  /**
   * Test token with different authentication methods
   */
  async testToken(token, gameId = '143445742366') {
    console.log(`\n🧪 Testing token: ${token.substring(0, 20)}...`);
    console.log(`Game ID: ${gameId}\n`);

    const tests = [
      () => this.testWithCookie(token, gameId),
      () => this.testWithBearer(token, gameId),
      () => this.testWithXAuthToken(token, gameId),
      () => this.testWithAuthHeader(token, gameId)
    ];

    let success = false;

    for (let i = 0; i < tests.length; i++) {
      try {
        console.log(`Test ${i + 1}: Testing authentication method ${i + 1}...`);
        const result = await tests[i]();
        if (result.success) {
          console.log(`✅ Test ${i + 1} SUCCESS: ${result.message}`);
          success = true;
          break;
        } else {
          console.log(`❌ Test ${i + 1} FAILED: ${result.message}`);
        }
      } catch (error) {
        console.log(`❌ Test ${i + 1} ERROR: ${error.message}`);
      }
    }

    if (success) {
      console.log('\n🎉 Token is working! You can use it with the WebSocket client.');
      console.log(`node ws-analysis-with-auth.js test "${token}"`);
    } else {
      console.log('\n💡 Token might not be valid or might need different format.');
      console.log('Try getting a fresh token from your browser.');
    }

    return success;
  }

  /**
   * Test with Cookie authentication
   */
  async testWithCookie(token, gameId) {
    return new Promise((resolve) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Cookie': `PHPSESSID=${token}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.game) {
                resolve({ success: true, message: 'Cookie auth works - got game data' });
              } else {
                resolve({ success: false, message: 'Got response but no game data' });
              }
            } catch {
              resolve({ success: false, message: 'Invalid JSON response' });
            }
          } else {
            resolve({ success: false, message: `HTTP ${res.statusCode}` });
          }
        });
      }).on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  }

  /**
   * Test with Bearer token authentication
   */
  async testWithBearer(token, gameId) {
    return new Promise((resolve) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.game) {
                resolve({ success: true, message: 'Bearer auth works - got game data' });
              } else {
                resolve({ success: false, message: 'Got response but no game data' });
              }
            } catch {
              resolve({ success: false, message: 'Invalid JSON response' });
            }
          } else {
            resolve({ success: false, message: `HTTP ${res.statusCode}` });
          }
        });
      }).on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  }

  /**
   * Test with X-Auth-Token header
   */
  async testWithXAuthToken(token, gameId) {
    return new Promise((resolve) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'X-Auth-Token': token
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.game) {
                resolve({ success: true, message: 'X-Auth-Token works - got game data' });
              } else {
                resolve({ success: false, message: 'Got response but no game data' });
              }
            } catch {
              resolve({ success: false, message: 'Invalid JSON response' });
            }
          } else {
            resolve({ success: false, message: `HTTP ${res.statusCode}` });
          }
        });
      }).on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  }

  /**
   * Test with generic Auth header
   */
  async testWithAuthHeader(token, gameId) {
    return new Promise((resolve) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Auth': token
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.game) {
                resolve({ success: true, message: 'Auth header works - got game data' });
              } else {
                resolve({ success: false, message: 'Got response but no game data' });
              }
            } catch {
              resolve({ success: false, message: 'Invalid JSON response' });
            }
          } else {
            resolve({ success: false, message: `HTTP ${res.statusCode}` });
          }
        });
      }).on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Chess.com Token Tester

Usage:
  node token-tester.js <token> [game-id]

Examples:
  node token-tester.js "your-token-here"
  node token-tester.js "your-token-here" 143445742366

This will test your token with different authentication methods.
`);
    return;
  }

  const token = args[0];
  const gameId = args[1] || '143445742366';
  
  const tester = new TokenTester();
  
  try {
    await tester.testToken(token, gameId);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
#!/usr/bin/env node
// Chess.com Auth Token Fetcher
// Discovers and fetches authentication tokens for WebSocket connections

const https = require('https');
const http = require('http');

class ChessComAuthFetcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  }

  /**
   * Fetch game data and extract UUID
   */
  async getGameUuid(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      console.log(`🔍 Fetching game data for ID: ${gameId}`);
      console.log(`   URL: ${url}\n`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              const uuid = json.game?.uuid;
              
              if (uuid) {
                console.log(`✅ Found UUID: ${uuid}`);
                resolve(uuid);
              } else {
                console.log('❌ No UUID found in game data');
                console.log('Available keys:', Object.keys(json));
                reject(new Error('No UUID found'));
              }
            } catch (error) {
              console.log('❌ Failed to parse game data');
              reject(error);
            }
          } else {
            console.log(`❌ Game data request failed: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Try to get auth token using different methods
   */
  async getAuthToken(gameId, uuid) {
    const methods = [
      () => this.tryAuthEndpoint(uuid),
      () => this.tryAuthEndpointWithGameId(gameId),
      () => this.tryAnalysisEndpoint(gameId),
      () => this.tryWebSocketAuthEndpoint(uuid)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`\n🔑 Trying auth method ${i + 1}...`);
        const token = await methods[i]();
        if (token) {
          console.log(`✅ Auth token found with method ${i + 1}!`);
          return token;
        }
      } catch (error) {
        console.log(`❌ Method ${i + 1} failed: ${error.message}`);
      }
    }

    throw new Error('All auth methods failed');
  }

  /**
   * Method 1: Try auth service endpoint with UUID
   */
  async tryAuthEndpoint(uuid) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/auth/service/analysis?game_id=${uuid}`;
      
      console.log(`   Trying: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Referer': 'https://www.chess.com/',
          'Origin': 'https://www.chess.com'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Response: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log(`   Response data:`, json);
              
              // Look for token in various possible fields
              const token = json.token || json.auth_token || json.access_token || json.authToken;
              if (token) {
                resolve(token);
              } else {
                reject(new Error('No token found in response'));
              }
            } catch (error) {
              console.log(`   Raw response: ${data}`);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.log(`   Error response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Method 2: Try auth service endpoint with numeric game ID
   */
  async tryAuthEndpointWithGameId(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/auth/service/analysis?game_id=${gameId}`;
      
      console.log(`   Trying: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Referer': 'https://www.chess.com/',
          'Origin': 'https://www.chess.com'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Response: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log(`   Response data:`, json);
              
              const token = json.token || json.auth_token || json.access_token || json.authToken;
              if (token) {
                resolve(token);
              } else {
                reject(new Error('No token found in response'));
              }
            } catch (error) {
              console.log(`   Raw response: ${data}`);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.log(`   Error response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Method 3: Try analysis endpoint
   */
  async tryAnalysisEndpoint(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/game/analysis/${gameId}`;
      
      console.log(`   Trying: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Referer': 'https://www.chess.com/',
          'Origin': 'https://www.chess.com'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Response: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log(`   Response data:`, json);
              
              const token = json.token || json.auth_token || json.access_token || json.authToken;
              if (token) {
                resolve(token);
              } else {
                reject(new Error('No token found in response'));
              }
            } catch (error) {
              console.log(`   Raw response: ${data}`);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.log(`   Error response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Method 4: Try WebSocket auth endpoint
   */
  async tryWebSocketAuthEndpoint(uuid) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/ws/auth?game_id=${uuid}`;
      
      console.log(`   Trying: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Referer': 'https://www.chess.com/',
          'Origin': 'https://www.chess.com'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Response: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log(`   Response data:`, json);
              
              const token = json.token || json.auth_token || json.access_token || json.authToken;
              if (token) {
                resolve(token);
              } else {
                reject(new Error('No token found in response'));
              }
            } catch (error) {
              console.log(`   Raw response: ${data}`);
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.log(`   Error response: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Main method: Get auth token for a game
   */
  async fetchAuthToken(gameId) {
    try {
      console.log('\n' + '═'.repeat(70));
      console.log('CHESS.COM AUTH TOKEN FETCHER');
      console.log('═'.repeat(70) + '\n');

      // Step 1: Get game UUID
      const uuid = await this.getGameUuid(gameId);
      
      // Step 2: Try to get auth token
      const token = await this.getAuthToken(gameId, uuid);
      
      console.log('\n' + '═'.repeat(70));
      console.log('SUCCESS!');
      console.log('═'.repeat(70));
      console.log(`Game ID: ${gameId}`);
      console.log(`UUID: ${uuid}`);
      console.log(`Auth Token: ${token}`);
      console.log('\nYou can now use this token with the WebSocket client:');
      console.log(`node ws-analysis-with-auth.js test "${token}"`);
      console.log('═'.repeat(70) + '\n');
      
      return { gameId, uuid, token };
      
    } catch (error) {
      console.log('\n' + '═'.repeat(70));
      console.log('FAILED');
      console.log('═'.repeat(70));
      console.log(`Error: ${error.message}`);
      console.log('\nThis might mean:');
      console.log('- The game is not publicly accessible');
      console.log('- The game requires authentication');
      console.log('- The auth endpoint has changed');
      console.log('═'.repeat(70) + '\n');
      
      throw error;
    }
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Chess.com Auth Token Fetcher

Usage:
  node auth-token-fetcher.js <game-id>

Examples:
  node auth-token-fetcher.js 143445742366
  node auth-token-fetcher.js 144540017288

This will:
1. Fetch the game data to get the UUID
2. Try multiple auth endpoints to get a token
3. Return the token for use with WebSocket client
`);
    return;
  }

  const gameId = args[0];
  const fetcher = new ChessComAuthFetcher();
  
  try {
    await fetcher.fetchAuthToken(gameId);
  } catch (error) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
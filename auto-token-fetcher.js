#!/usr/bin/env node
// Automatic Token Fetcher for Chess.com
// Extracts tokens from browser without user interaction

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class AutoTokenFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.tokens = {};
  }

  /**
   * Launch browser in headless mode
   */
  async launch() {
    console.log('🚀 Launching headless browser...');
    
    this.browser = await puppeteer.launch({
      headless: true, // Headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    console.log('✅ Browser launched');
  }

  /**
   * Try to extract tokens from public endpoints
   */
  async extractTokensFromAPI(gameId = '143445742366') {
    console.log('🔍 Trying to extract tokens from public API...');

    try {
      // First, get the game data to extract UUID
      const gameResponse = await this.page.evaluate(async (gameId) => {
        const response = await fetch(`https://www.chess.com/callback/live/game/${gameId}`);
        return await response.json();
      }, gameId);

      if (gameResponse.game && gameResponse.game.uuid) {
        const uuid = gameResponse.game.uuid;
        console.log(`✅ Found game UUID: ${uuid}`);

        // Try to get auth token using the UUID
        const authResponse = await this.page.evaluate(async (uuid) => {
          try {
            const response = await fetch(`https://www.chess.com/callback/auth/service/analysis?game_id=${uuid}`);
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        }, uuid);

        if (authResponse.token || authResponse.auth_token) {
          const token = authResponse.token || authResponse.auth_token;
          this.tokens['api_auth_token'] = token;
          console.log(`✅ Found API auth token: ${token.substring(0, 20)}...`);
          return true;
        } else {
          console.log('❌ No auth token in API response');
          console.log('Response:', authResponse);
        }
      } else {
        console.log('❌ No UUID found in game data');
      }
    } catch (error) {
      console.log('❌ API extraction failed:', error.message);
    }

    return false;
  }

  /**
   * Try to extract tokens from game page
   */
  async extractTokensFromPage(gameId = '143445742366') {
    console.log('🔍 Extracting tokens from game page...');

    try {
      // Navigate to game page
      await this.page.goto(`https://www.chess.com/game/live/${gameId}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract from page content
      const pageTokens = await this.page.evaluate(() => {
        const tokens = {};

        // Look for tokens in script tags
        const scripts = Array.from(document.querySelectorAll('script'));
        scripts.forEach(script => {
          const content = script.textContent || script.innerHTML;
          
          // Look for various token patterns
          const patterns = [
            /"authToken":\s*"([^"]+)"/g,
            /"auth_token":\s*"([^"]+)"/g,
            /"accessToken":\s*"([^"]+)"/g,
            /"access_token":\s*"([^"]+)"/g,
            /"token":\s*"([^"]+)"/g,
            /"sessionId":\s*"([^"]+)"/g,
            /"session_id":\s*"([^"]+)"/g,
            /"PHPSESSID":\s*"([^"]+)"/g,
            /"wsToken":\s*"([^"]+)"/g,
            /"websocketToken":\s*"([^"]+)"/g
          ];

          patterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              tokens[`script_token_${index}`] = match[1];
            }
          });
        });

        // Look for tokens in meta tags
        const metaTags = Array.from(document.querySelectorAll('meta'));
        metaTags.forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          
          if (name && content && (
            name.toLowerCase().includes('token') ||
            name.toLowerCase().includes('auth') ||
            name.toLowerCase().includes('session')
          )) {
            tokens[`meta_${name}`] = content;
          }
        });

        // Look for tokens in data attributes
        const elements = Array.from(document.querySelectorAll('[data-token], [data-auth], [data-session]'));
        elements.forEach((element, index) => {
          const token = element.getAttribute('data-token') || 
                      element.getAttribute('data-auth') || 
                      element.getAttribute('data-session');
          if (token) {
            tokens[`data_token_${index}`] = token;
          }
        });

        return tokens;
      });

      Object.entries(pageTokens).forEach(([key, value]) => {
        this.tokens[key] = value;
        console.log(`   ${key}: ${value.substring(0, 20)}...`);
      });

      return Object.keys(pageTokens).length > 0;

    } catch (error) {
      console.log('❌ Page extraction failed:', error.message);
      return false;
    }
  }

  /**
   * Try to extract tokens from network requests
   */
  async extractTokensFromNetwork(gameId = '143445742366') {
    console.log('🔍 Monitoring network requests...');

    const networkTokens = {};

    // Set up request interception
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const headers = request.headers();
      
      // Check for auth headers
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('session')) {
          networkTokens[`request_${key}`] = value;
        }
      });
      
      request.continue();
    });

    // Set up response interception
    this.page.on('response', async (response) => {
      try {
        const url = response.url();
        if (url.includes('auth') || url.includes('token') || url.includes('session')) {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            if (json.token || json.auth_token || json.access_token) {
              const token = json.token || json.auth_token || json.access_token;
              networkTokens[`response_${url.split('/').pop()}`] = token;
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
      } catch (error) {
        // Ignore response errors
      }
    });

    // Navigate to game page to trigger requests
    await this.page.goto(`https://www.chess.com/game/live/${gameId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for requests to complete
    await this.page.waitForTimeout(5000);

    Object.entries(networkTokens).forEach(([key, value]) => {
      this.tokens[key] = value;
      console.log(`   ${key}: ${value.substring(0, 20)}...`);
    });

    return Object.keys(networkTokens).length > 0;
  }

  /**
   * Test extracted tokens
   */
  async testTokens() {
    console.log('\n🧪 Testing extracted tokens...');

    const testResults = [];

    for (const [name, token] of Object.entries(this.tokens)) {
      try {
        console.log(`   Testing ${name}...`);
        
        // Test with a simple API call
        const response = await this.page.evaluate(async (token, name) => {
          try {
            const response = await fetch('https://www.chess.com/callback/live/game/143445742366', {
              headers: {
                'Cookie': name.includes('PHPSESSID') ? `PHPSESSID=${token}` : undefined,
                'Authorization': name.includes('Bearer') ? `Bearer ${token}` : undefined,
                'X-Auth-Token': name.includes('X-Auth') ? token : undefined,
                'User-Agent': 'Mozilla/5.0 (Chess Analysis Tool)'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              return { success: true, hasGameData: !!data.game };
            } else {
              return { success: false, status: response.status };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, token, name);

        if (response.success) {
          console.log(`   ✅ ${name} works!`);
          testResults.push({ name, token, working: true });
        } else {
          console.log(`   ❌ ${name} failed: ${response.error || response.status}`);
          testResults.push({ name, token, working: false });
        }
      } catch (error) {
        console.log(`   ❌ ${name} error: ${error.message}`);
        testResults.push({ name, token, working: false });
      }
    }

    return testResults;
  }

  /**
   * Save tokens to file
   */
  async saveTokens() {
    const tokenFile = path.join(__dirname, 'auto-extracted-tokens.json');
    
    const tokenData = {
      timestamp: new Date().toISOString(),
      tokens: this.tokens,
      instructions: {
        usage: 'Use these tokens with the WebSocket client:',
        command: 'node ws-analysis-with-auth.js test "TOKEN_VALUE"',
        note: 'Replace TOKEN_VALUE with one of the working tokens above'
      }
    };

    await fs.promises.writeFile(tokenFile, JSON.stringify(tokenData, null, 2));
    console.log(`💾 Tokens saved to: ${tokenFile}`);
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  /**
   * Main method to fetch tokens
   */
  async fetchTokens(gameId = '143445742366') {
    try {
      console.log('\n' + '═'.repeat(70));
      console.log('CHESS.COM AUTO TOKEN FETCHER');
      console.log('═'.repeat(70) + '\n');

      // Launch browser
      await this.launch();

      // Try different extraction methods
      const methods = [
        () => this.extractTokensFromAPI(gameId),
        () => this.extractTokensFromPage(gameId),
        () => this.extractTokensFromNetwork(gameId)
      ];

      let success = false;
      for (let i = 0; i < methods.length; i++) {
        try {
          console.log(`\n🔍 Trying extraction method ${i + 1}...`);
          const result = await methods[i]();
          if (result) {
            success = true;
            console.log(`✅ Method ${i + 1} found tokens`);
          }
        } catch (error) {
          console.log(`❌ Method ${i + 1} failed: ${error.message}`);
        }
      }

      if (Object.keys(this.tokens).length === 0) {
        console.log('\n❌ No tokens found with any method');
        console.log('💡 This might mean:');
        console.log('   - The game is not publicly accessible');
        console.log('   - Chess.com has changed their token system');
        console.log('   - Authentication is required for this game');
        return;
      }

      // Test tokens
      const testResults = await this.testTokens();

      // Show results
      console.log('\n' + '═'.repeat(70));
      console.log('EXTRACTION RESULTS');
      console.log('═'.repeat(70));

      const workingTokens = testResults.filter(r => r.working);
      
      if (workingTokens.length > 0) {
        console.log('✅ Working tokens found:');
        workingTokens.forEach(({ name, token }) => {
          console.log(`   ${name}: ${token.substring(0, 30)}...`);
        });
        
        console.log('\n🎉 You can now use these tokens!');
        console.log('Example:');
        console.log(`node ws-analysis-with-auth.js test "${workingTokens[0].token}"`);
      } else {
        console.log('❌ No working tokens found');
        console.log('💡 The tokens were extracted but may not be valid for WebSocket auth');
        console.log('💡 Try the manual browser method: node browser-token-fetcher.js');
      }

      // Save tokens
      await this.saveTokens();

    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await this.close();
    }
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Chess.com Auto Token Fetcher

Usage:
  node auto-token-fetcher.js [game-id]

Examples:
  node auto-token-fetcher.js
  node auto-token-fetcher.js 143445742366

This will:
1. Launch a headless browser
2. Try to extract tokens from public APIs
3. Test the extracted tokens
4. Save results to auto-extracted-tokens.json

Note: This method may not work if the game requires authentication.
For better results, use: node browser-token-fetcher.js
`);
    return;
  }

  const gameId = args[0] || '143445742366';
  const fetcher = new AutoTokenFetcher();
  await fetcher.fetchTokens(gameId);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
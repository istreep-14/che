#!/usr/bin/env node
// Browser Token Fetcher for Chess.com
// Uses Puppeteer to automate browser and extract authentication tokens

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class BrowserTokenFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.tokens = {};
  }

  /**
   * Launch browser and navigate to Chess.com
   */
  async launch() {
    console.log('🚀 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    console.log('✅ Browser launched successfully');
  }

  /**
   * Navigate to Chess.com and wait for login
   */
  async navigateToChessCom() {
    console.log('🌐 Navigating to Chess.com...');
    
    await this.page.goto('https://www.chess.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Loaded Chess.com');
    console.log('🔐 Please log in to your Chess.com account in the browser window');
    console.log('   After logging in, press Enter in this terminal to continue...');
    
    // Wait for user to press Enter
    await this.waitForUserInput();
  }

  /**
   * Wait for user input
   */
  async waitForUserInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  /**
   * Extract tokens from the current page
   */
  async extractTokens() {
    console.log('🔍 Extracting tokens from browser...');

    // Extract cookies
    const cookies = await this.page.cookies();
    console.log('🍪 Found cookies:');
    cookies.forEach(cookie => {
      if (cookie.name.toLowerCase().includes('auth') || 
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('token') ||
          cookie.name === 'PHPSESSID') {
        this.tokens[cookie.name] = cookie.value;
        console.log(`   ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      }
    });

    // Extract from localStorage
    const localStorage = await this.page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('session') ||
            key.toLowerCase().includes('token')) {
          storage[key] = window.localStorage.getItem(key);
        }
      }
      return storage;
    });

    if (Object.keys(localStorage).length > 0) {
      console.log('💾 Found localStorage tokens:');
      Object.entries(localStorage).forEach(([key, value]) => {
        this.tokens[`localStorage_${key}`] = value;
        console.log(`   ${key}: ${value.substring(0, 20)}...`);
      });
    }

    // Extract from sessionStorage
    const sessionStorage = await this.page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('session') ||
            key.toLowerCase().includes('token')) {
          storage[key] = window.sessionStorage.getItem(key);
        }
      }
      return storage;
    });

    if (Object.keys(sessionStorage).length > 0) {
      console.log('🗂️ Found sessionStorage tokens:');
      Object.entries(sessionStorage).forEach(([key, value]) => {
        this.tokens[`sessionStorage_${key}`] = value;
        console.log(`   ${key}: ${value.substring(0, 20)}...`);
      });
    }

    // Extract from window object
    const windowTokens = await this.page.evaluate(() => {
      const tokens = {};
      const windowKeys = ['authToken', 'accessToken', 'sessionId', 'wsToken', 'token'];
      
      windowKeys.forEach(key => {
        if (window[key]) {
          tokens[key] = window[key];
        }
      });
      
      return tokens;
    });

    if (Object.keys(windowTokens).length > 0) {
      console.log('🪟 Found window tokens:');
      Object.entries(windowTokens).forEach(([key, value]) => {
        this.tokens[`window_${key}`] = value;
        console.log(`   ${key}: ${value.substring(0, 20)}...`);
      });
    }

    // Extract from network requests
    await this.extractFromNetworkRequests();
  }

  /**
   * Extract tokens from network requests
   */
  async extractFromNetworkRequests() {
    console.log('🌐 Monitoring network requests for tokens...');

    // Set up request interception
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const headers = request.headers();
      
      // Check for auth headers
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('session')) {
          this.tokens[`header_${key}`] = value;
          console.log(`   ${key}: ${value.substring(0, 20)}...`);
        }
      });
      
      request.continue();
    });

    // Navigate to a game page to trigger requests
    console.log('🎮 Navigating to a game page...');
    await this.page.goto('https://www.chess.com/game/live/143445742366', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for requests to complete
    await this.page.waitForTimeout(3000);
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
                'X-Auth-Token': name.includes('X-Auth') ? token : undefined
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
    const tokenFile = path.join(__dirname, 'extracted-tokens.json');
    
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
  async fetchTokens() {
    try {
      console.log('\n' + '═'.repeat(70));
      console.log('CHESS.COM BROWSER TOKEN FETCHER');
      console.log('═'.repeat(70) + '\n');

      // Launch browser
      await this.launch();

      // Navigate to Chess.com
      await this.navigateToChessCom();

      // Extract tokens
      await this.extractTokens();

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
        console.log('💡 Make sure you are logged in to Chess.com');
        console.log('💡 Try refreshing the page and running again');
      }

      // Save tokens
      await this.saveTokens();

      console.log('\n' + '═'.repeat(70));
      console.log('Press Enter to close the browser...');
      await this.waitForUserInput();

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
Chess.com Browser Token Fetcher

Usage:
  node browser-token-fetcher.js

This will:
1. Launch a browser window
2. Navigate to Chess.com
3. Wait for you to log in
4. Extract authentication tokens
5. Test the tokens
6. Save results to extracted-tokens.json

Requirements:
- You need to be logged into Chess.com
- The script will open a browser window
- Follow the prompts in the terminal

After running:
- Check extracted-tokens.json for your tokens
- Use working tokens with: node ws-analysis-with-auth.js test "TOKEN"
`);
    return;
  }

  const fetcher = new BrowserTokenFetcher();
  await fetcher.fetchTokens();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
#!/usr/bin/env node
// Login Token Fetcher for Chess.com
// Automates browser login and extracts proper authentication tokens

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class LoginTokenFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.tokens = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Launch browser
   */
  async launch() {
    console.log('🚀 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for login
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
    
    console.log('✅ Browser launched');
  }

  /**
   * Get login credentials from user
   */
  async getCredentials() {
    return new Promise((resolve) => {
      console.log('\n🔐 Please provide your Chess.com login credentials:');
      
      this.rl.question('Username/Email: ', (username) => {
        this.rl.question('Password: ', (password) => {
          resolve({ username, password });
        });
      });
    });
  }

  /**
   * Login to Chess.com
   */
  async login(credentials) {
    console.log('🌐 Navigating to Chess.com login...');
    
    await this.page.goto('https://www.chess.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('📝 Filling login form...');
    
    // Wait for login form
    await this.page.waitForSelector('input[name="username"], input[name="email"]', { timeout: 10000 });
    
    // Fill username/email
    await this.page.type('input[name="username"], input[name="email"]', credentials.username);
    
    // Fill password
    await this.page.type('input[name="password"]', credentials.password);
    
    console.log('🔑 Submitting login form...');
    
    // Click login button
    await this.page.click('button[type="submit"], input[type="submit"]');
    
    // Wait for login to complete
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✅ Login successful!');
      return true;
    } catch (error) {
      console.log('❌ Login failed or timed out');
      return false;
    }
  }

  /**
   * Extract tokens after login
   */
  async extractTokens() {
    console.log('🔍 Extracting authentication tokens...');

    // Extract cookies
    const cookies = await this.page.cookies();
    console.log('🍪 Found cookies:');
    cookies.forEach(cookie => {
      if (cookie.name.toLowerCase().includes('auth') || 
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('token') ||
          cookie.name === 'PHPSESSID' ||
          cookie.name === 'sessionid') {
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
      const windowKeys = ['authToken', 'accessToken', 'sessionId', 'wsToken', 'token', 'userToken'];
      
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

    // Try to get auth token from the discovered endpoint
    await this.extractAuthTokenFromAPI();
  }

  /**
   * Try to get auth token from the API endpoint
   */
  async extractAuthTokenFromAPI() {
    console.log('🔍 Trying to get auth token from API...');

    try {
      // Navigate to a game page first
      await this.page.goto('https://www.chess.com/game/live/143445742366', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Get the game UUID
      const gameData = await this.page.evaluate(async () => {
        try {
          const response = await fetch('https://www.chess.com/callback/live/game/143445742366');
          return await response.json();
        } catch (error) {
          return { error: error.message };
        }
      });

      if (gameData.game && gameData.game.uuid) {
        const uuid = gameData.game.uuid;
        console.log(`✅ Found game UUID: ${uuid}`);

        // Try to get auth token
        const authData = await this.page.evaluate(async (uuid) => {
          try {
            const response = await fetch(`https://www.chess.com/callback/auth/service/analysis?game_id=${uuid}`);
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        }, uuid);

        if (authData.token || authData.auth_token) {
          const token = authData.token || authData.auth_token;
          this.tokens['api_auth_token'] = token;
          console.log(`✅ Found API auth token: ${token.substring(0, 20)}...`);
        } else {
          console.log('❌ No auth token in API response');
          console.log('Response:', authData);
        }
      }
    } catch (error) {
      console.log('❌ API extraction failed:', error.message);
    }
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
        
        // Test with WebSocket client
        const { spawn } = require('child_process');
        
        const testPromise = new Promise((resolve) => {
          const child = spawn('node', ['ws-analysis-with-auth.js', 'test', token], {
            stdio: 'pipe'
          });
          
          let output = '';
          child.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          child.stderr.on('data', (data) => {
            output += data.toString();
          });
          
          child.on('close', (code) => {
            const success = output.includes('authenticated') || 
                          output.includes('Connection successful') ||
                          !output.includes('no auth token in request');
            resolve({ success, output });
          });
        });

        const result = await Promise.race([
          testPromise,
          new Promise(resolve => setTimeout(() => resolve({ success: false, output: 'timeout' }), 10000))
        ]);

        if (result.success) {
          console.log(`   ✅ ${name} works!`);
          testResults.push({ name, token, working: true });
        } else {
          console.log(`   ❌ ${name} failed`);
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
    const tokenFile = path.join(__dirname, 'login-extracted-tokens.json');
    
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
   * Close browser and readline
   */
  async close() {
    if (this.rl) {
      this.rl.close();
    }
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
      console.log('CHESS.COM LOGIN TOKEN FETCHER');
      console.log('═'.repeat(70) + '\n');

      // Launch browser
      await this.launch();

      // Get credentials
      const credentials = await this.getCredentials();

      // Login
      const loginSuccess = await this.login(credentials);
      if (!loginSuccess) {
        console.log('❌ Login failed. Please check your credentials and try again.');
        return;
      }

      // Extract tokens
      await this.extractTokens();

      if (Object.keys(this.tokens).length === 0) {
        console.log('\n❌ No tokens found after login');
        console.log('💡 This might mean Chess.com has changed their token system');
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
        console.log('💡 Try using the HTTP API methods instead:');
        console.log('   node chesscom-analysis.js "https://www.chess.com/game/live/143445742366"');
      }

      // Save tokens
      await this.saveTokens();

      console.log('\n' + '═'.repeat(70));
      console.log('Press Enter to close the browser...');
      await new Promise(resolve => {
        this.rl.question('', () => resolve());
      });

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
Chess.com Login Token Fetcher

Usage:
  node login-token-fetcher.js

This will:
1. Launch a browser window
2. Ask for your Chess.com login credentials
3. Automatically log in to Chess.com
4. Extract authentication tokens
5. Test the tokens with WebSocket client
6. Save results to login-extracted-tokens.json

Requirements:
- You need a Chess.com account
- The script will open a browser window
- You'll need to enter your username/email and password

After running:
- Check login-extracted-tokens.json for your tokens
- Use working tokens with: node ws-analysis-with-auth.js test "TOKEN"
`);
    return;
  }

  const fetcher = new LoginTokenFetcher();
  await fetcher.fetchTokens();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
#!/usr/bin/env node
// Browser Token Extractor for Chess.com
// Extracts authentication tokens from browser session

const https = require('https');

class BrowserTokenExtractor {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  }

  /**
   * Extract tokens from game page HTML
   */
  async extractTokensFromGamePage(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/game/live/${gameId}`;
      
      console.log(`🔍 Fetching game page: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`✅ Game page fetched (${data.length} bytes)`);
          
          const tokens = this.parseTokensFromHTML(data);
          resolve(tokens);
        });
      }).on('error', reject);
    });
  }

  /**
   * Parse tokens from HTML content
   */
  parseTokensFromHTML(html) {
    const tokens = {};
    
    // Look for various token patterns in the HTML
    const patterns = [
      // Auth tokens
      /"authToken":\s*"([^"]+)"/g,
      /"auth_token":\s*"([^"]+)"/g,
      /"accessToken":\s*"([^"]+)"/g,
      /"access_token":\s*"([^"]+)"/g,
      /"token":\s*"([^"]+)"/g,
      
      // Session tokens
      /"sessionId":\s*"([^"]+)"/g,
      /"session_id":\s*"([^"]+)"/g,
      /"PHPSESSID":\s*"([^"]+)"/g,
      
      // WebSocket tokens
      /"wsToken":\s*"([^"]+)"/g,
      /"websocketToken":\s*"([^"]+)"/g,
      /"ws_token":\s*"([^"]+)"/g,
      
      // Analysis tokens
      /"analysisToken":\s*"([^"]+)"/g,
      /"analysis_token":\s*"([^"]+)"/g,
      
      // Game-specific tokens
      /"gameToken":\s*"([^"]+)"/g,
      /"game_token":\s*"([^"]+)"/g,
      
      // Generic token patterns
      /token['"]\s*:\s*['"]([^'"]+)['"]/g,
      /['"]token['"]\s*:\s*['"]([^'"]+)['"]/g
    ];

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const tokenName = `token_${index}`;
        tokens[tokenName] = match[1];
        console.log(`🔑 Found ${tokenName}: ${match[1].substring(0, 20)}...`);
      }
    });

    // Look for script tags with token data
    const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
    if (scriptMatches) {
      scriptMatches.forEach((script, index) => {
        const scriptTokens = this.parseTokensFromHTML(script);
        Object.assign(tokens, scriptTokens);
      });
    }

    return tokens;
  }

  /**
   * Try to get auth token using discovered patterns
   */
  async getAuthToken(gameId) {
    try {
      console.log('\n' + '═'.repeat(70));
      console.log('CHESS.COM BROWSER TOKEN EXTRACTOR');
      console.log('═'.repeat(70) + '\n');

      // Extract tokens from game page
      const tokens = await this.extractTokensFromGamePage(gameId);
      
      if (Object.keys(tokens).length === 0) {
        console.log('❌ No tokens found in game page');
        console.log('\n💡 Try this manual approach:');
        console.log('1. Open the game in your browser: https://www.chess.com/game/live/' + gameId);
        console.log('2. Press F12 → Application → Cookies → https://www.chess.com');
        console.log('3. Look for PHPSESSID or similar session cookie');
        console.log('4. Copy the value and use it as auth token');
        return null;
      }

      console.log('\n' + '═'.repeat(70));
      console.log('TOKENS FOUND');
      console.log('═'.repeat(70));
      
      Object.entries(tokens).forEach(([name, token]) => {
        console.log(`${name}: ${token.substring(0, 50)}${token.length > 50 ? '...' : ''}`);
      });

      // Try the first token with WebSocket
      const firstToken = Object.values(tokens)[0];
      console.log('\n🎯 Testing first token with WebSocket...');
      
      return firstToken;
      
    } catch (error) {
      console.log('\n❌ Error extracting tokens:', error.message);
      return null;
    }
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Chess.com Browser Token Extractor

Usage:
  node browser-token-extractor.js <game-id>

Examples:
  node browser-token-extractor.js 143445742366
  node browser-token-extractor.js 144540017288

This will:
1. Fetch the game page HTML
2. Extract any authentication tokens
3. Show you what tokens were found
`);
    return;
  }

  const gameId = args[0];
  const extractor = new BrowserTokenExtractor();
  
  try {
    const token = await extractor.getAuthToken(gameId);
    
    if (token) {
      console.log('\n🎉 Token extracted! You can now test it:');
      console.log(`node ws-analysis-with-auth.js test "${token}"`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
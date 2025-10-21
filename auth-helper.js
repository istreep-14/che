#!/usr/bin/env node
// Chess.com Authentication Helper
// Helps you find and test authentication tokens

const https = require('https');

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    CHESS.COM AUTHENTICATION HELPER                  ║
╚══════════════════════════════════════════════════════════════════════╝

This helper will guide you through finding and testing Chess.com authentication tokens.

════════════════════════════════════════════════════════════════════════

METHOD 1: Browser Session Token
════════════════════════════════════════════════════════════════════════

1. Open Chess.com in your browser and log in
2. Press F12 to open Developer Tools
3. Go to Application tab (Chrome) or Storage tab (Firefox)
4. Click on "Cookies" in the left sidebar
5. Click on "https://www.chess.com"
6. Look for one of these cookies:
   - PHPSESSID
   - sessionid
   - auth_token
   - access_token
7. Copy the value (the long string of characters)

Example:
  PHPSESSID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0

════════════════════════════════════════════════════════════════════════

METHOD 2: Test Your Token
════════════════════════════════════════════════════════════════════════

Once you have a token, test it with:

  node ws-analysis-with-auth.js test "your-token-here"

Or set it as an environment variable:

  export CHESSCOM_AUTH_TOKEN="your-token-here"
  node ws-analysis-with-auth.js test

════════════════════════════════════════════════════════════════════════

METHOD 3: API Token (Advanced)
════════════════════════════════════════════════════════════════════════

If you have access to Chess.com's API documentation, you might be able to:

1. Register for API access
2. Get an API key or token
3. Use that token for WebSocket authentication

Check: https://www.chess.com/news/view/published-data-api

════════════════════════════════════════════════════════════════════════

TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════

❌ "no auth token in request"
   → You need to provide an authentication token

❌ "invalid auth token" 
   → Your token is incorrect or expired
   → Try getting a fresh token from your browser

❌ "authentication failed"
   → The token format might be wrong
   → Try different token formats (PHPSESSID, Bearer token, etc.)

✅ "authenticated" or no auth errors
   → Your token is working!

════════════════════════════════════════════════════════════════════════

EXAMPLE USAGE
════════════════════════════════════════════════════════════════════════

# Test without auth (will show auth error)
node ws-analysis-with-auth.js test

# Test with token from browser
node ws-analysis-with-auth.js test "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"

# Interactive mode with auth
node ws-analysis-with-auth.js interactive

# Analyze specific game with auth
node ws-analysis-with-auth.js game 144540017288 "your-token-here"

════════════════════════════════════════════════════════════════════════

SECURITY NOTES
════════════════════════════════════════════════════════════════════════

⚠️  Keep your tokens secure!
⚠️  Don't share them in public repositories
⚠️  They may expire, so you might need to refresh them
⚠️  Consider using environment variables for storage

════════════════════════════════════════════════════════════════════════
`);

// Test if a token works by making a simple API call
async function testToken(token) {
  if (!token) {
    console.log('❌ No token provided');
    return false;
  }

  console.log(`\n🧪 Testing token: ${token.substring(0, 10)}...`);
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.chess.com',
      path: '/api/user',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Chess Analysis Tool)',
        'Cookie': `PHPSESSID=${token}`,
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('✅ Token appears to be valid!');
            console.log(`   User: ${json.username || 'Unknown'}`);
            resolve(true);
          } catch {
            console.log('⚠️  Token might be valid but response format unexpected');
            resolve(true);
          }
        } else {
          console.log(`❌ Token test failed (status: ${res.statusCode})`);
          resolve(false);
        }
      });
    }).on('error', () => {
      console.log('❌ Token test failed (network error)');
      resolve(false);
    });
  });
}

// If token provided as argument, test it
const token = process.argv[2];
if (token) {
  testToken(token).then(success => {
    if (success) {
      console.log('\n🎉 Your token works! You can now use it with the WebSocket client.');
    } else {
      console.log('\n💡 Try getting a fresh token from your browser.');
    }
  });
}
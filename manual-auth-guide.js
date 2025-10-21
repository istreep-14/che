#!/usr/bin/env node
// Manual Authentication Guide for Chess.com WebSocket
// Step-by-step guide to get and test authentication tokens

const https = require('https');

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║              CHESS.COM WEBSOCKET AUTHENTICATION GUIDE               ║
╚══════════════════════════════════════════════════════════════════════╝

Based on your discovery of the auth endpoint, here's how to get working tokens:

════════════════════════════════════════════════════════════════════════

METHOD 1: Browser Session Cookie (Recommended)
════════════════════════════════════════════════════════════════════════

1. Open Chess.com in your browser and log in
2. Navigate to any game: https://www.chess.com/game/live/143445742366
3. Press F12 to open Developer Tools
4. Go to Application tab (Chrome) or Storage tab (Firefox)
5. Click on "Cookies" in the left sidebar
6. Click on "https://www.chess.com"
7. Look for these cookies and copy their values:
   - PHPSESSID (most common)
   - sessionid
   - auth_token
   - access_token
   - Any cookie with "auth" or "session" in the name

Example:
  PHPSESSID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0

════════════════════════════════════════════════════════════════════════

METHOD 2: Network Tab Token Extraction
════════════════════════════════════════════════════════════════════════

1. Open the game in your browser
2. Press F12 → Network tab
3. Refresh the page
4. Look for requests to:
   - /callback/auth/service/analysis
   - /callback/ws/auth
   - Any WebSocket connection requests
5. Check the request headers for:
   - Authorization: Bearer <token>
   - Cookie: PHPSESSID=<token>
   - X-Auth-Token: <token>
6. Copy the token value

════════════════════════════════════════════════════════════════════════

METHOD 3: JavaScript Console Token Extraction
════════════════════════════════════════════════════════════════════════

1. Open the game in your browser
2. Press F12 → Console tab
3. Run this JavaScript code:

   // Look for tokens in window object
   console.log('Window tokens:', {
     authToken: window.authToken,
     accessToken: window.accessToken,
     sessionId: window.sessionId,
     wsToken: window.wsToken
   });

   // Look for tokens in localStorage
   console.log('LocalStorage tokens:', {
     authToken: localStorage.getItem('authToken'),
     accessToken: localStorage.getItem('accessToken'),
     sessionId: localStorage.getItem('sessionId')
   });

   // Look for tokens in sessionStorage
   console.log('SessionStorage tokens:', {
     authToken: sessionStorage.getItem('authToken'),
     accessToken: sessionStorage.getItem('accessToken'),
     sessionId: sessionStorage.getItem('sessionId')
   });

4. Copy any token values you find

════════════════════════════════════════════════════════════════════════

TESTING YOUR TOKEN
════════════════════════════════════════════════════════════════════════

Once you have a token, test it:

# Test with WebSocket client
node ws-analysis-with-auth.js test "your-token-here"

# Test with environment variable
export CHESSCOM_AUTH_TOKEN="your-token-here"
node ws-analysis-with-auth.js test

# Test specific game
node ws-analysis-with-auth.js game 143445742366 "your-token-here"

════════════════════════════════════════════════════════════════════════

TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════

❌ "no auth token in request"
   → Your token format might be wrong
   → Try different token formats (PHPSESSID, Bearer, etc.)

❌ "invalid auth token"
   → Your token is expired or incorrect
   → Get a fresh token from your browser

❌ "authentication failed"
   → The token might not have the right permissions
   → Try a different token or method

✅ "authenticated" or no auth errors
   → Your token is working!

════════════════════════════════════════════════════════════════════════

AUTH ENDPOINT DISCOVERY
════════════════════════════════════════════════════════════════════════

You discovered this endpoint:
  https://www.chess.com/callback/auth/service/analysis?game_id=<uuid>

This suggests the auth flow might be:
1. Get game UUID from: /callback/live/game/<game_id>
2. Use UUID to get auth token from: /callback/auth/service/analysis?game_id=<uuid>
3. Use that token for WebSocket authentication

However, the auth endpoint requires authentication itself, so you need:
- A valid session cookie (PHPSESSID)
- Or proper authentication headers
- Or the game must be publicly accessible

════════════════════════════════════════════════════════════════════════

QUICK TEST COMMANDS
════════════════════════════════════════════════════════════════════════

# Test without auth (will show auth error)
node ws-analysis-with-auth.js test

# Test with your token
node ws-analysis-with-auth.js test "your-token-here"

# Interactive mode
node ws-analysis-with-auth.js interactive

# Get help
node auth-helper.js

════════════════════════════════════════════════════════════════════════

NEXT STEPS
════════════════════════════════════════════════════════════════════════

1. Try Method 1 (Browser Session Cookie) - most likely to work
2. If that doesn't work, try Method 2 (Network Tab)
3. Test your token with the WebSocket client
4. If still not working, the game might require special permissions

Remember: The HTTP API methods work without authentication, so you can
still get game data using:
  node chesscom-analysis.js "https://www.chess.com/game/live/143445742366"

════════════════════════════════════════════════════════════════════════
`);

// Test function for manual token testing
async function testToken(token) {
  if (!token) {
    console.log('❌ No token provided for testing');
    return;
  }

  console.log(`\n🧪 Testing token: ${token.substring(0, 20)}...`);
  
  // Test with WebSocket client
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const child = spawn('node', ['ws-analysis-with-auth.js', 'test', token], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Token test completed successfully!');
      } else {
        console.log('\n❌ Token test failed');
      }
      resolve();
    });
  });
}

// If token provided as argument, test it
const token = process.argv[2];
if (token) {
  testToken(token);
}
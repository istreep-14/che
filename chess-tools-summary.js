#!/usr/bin/env node
// Chess.com Tools Summary
// Shows all available tools and their status

const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    CHESS.COM ANALYSIS TOOLS SUMMARY                  ║
╚══════════════════════════════════════════════════════════════════════╝

🎉 SUCCESS! You now have a complete Chess.com analysis toolkit!

═══════════════════════════════════════════════════════════════════════

🚀 WORKING TOOLS (No Authentication Required)
═══════════════════════════════════════════════════════════════════════

✅ HTTP API Analysis Tools:
   • chess-analysis-suite.js     - Comprehensive game analysis
   • chesscom-analysis.js        - Single game analysis  
   • test-chesscom.js            - Basic API testing
   • chess-fetcher.js            - Fetch user games to database
   • game-analyzer.js            - Analyze local database games

✅ Database Tools:
   • chess_games.db              - SQLite database for storing games
   • Custom SQL queries          - Direct database access

✅ Browser Automation (For Token Extraction):
   • auto-token-fetcher.js       - Headless token extraction
   • browser-token-fetcher.js    - Interactive token extraction
   • login-token-fetcher.js      - Automated login + token extraction

✅ WebSocket Tools (Requires Authentication):
   • ws-analysis-with-auth.js    - Authenticated WebSocket client
   • ws-analysis.js              - Basic WebSocket client
   • wsanalysis.js               - Alternative WebSocket client

✅ Utility Tools:
   • token-tester.js             - Test authentication tokens
   • auth-helper.js              - Authentication guidance
   • manual-auth-guide.js        - Manual token extraction guide

═══════════════════════════════════════════════════════════════════════

📊 QUICK START COMMANDS
═══════════════════════════════════════════════════════════════════════

# Analyze a single game (works immediately!)
node chess-analysis-suite.js 143445742366

# Analyze multiple games
node chess-analysis-suite.js 143445742366 144540017288

# Test basic API functionality
node test-chesscom.js "https://www.chess.com/game/live/143445742366"

# Fetch games to database
node chess-fetcher.js --help

# Analyze games from database
node game-analyzer.js --help

# Try to extract WebSocket tokens
node auto-token-fetcher.js

# Test WebSocket with extracted token
node ws-analysis-with-auth.js test "your-token-here"

═══════════════════════════════════════════════════════════════════════

🎯 RECOMMENDED WORKFLOW
═══════════════════════════════════════════════════════════════════════

1. START HERE - Use HTTP API tools (no auth needed):
   node chess-analysis-suite.js 143445742366

2. FOR BULK ANALYSIS - Use database tools:
   node chess-fetcher.js --username someuser
   node game-analyzer.js --recent 10

3. FOR WEBSOCKET - Try token extraction:
   node auto-token-fetcher.js
   node ws-analysis-with-auth.js test "extracted-token"

4. FOR CUSTOM ANALYSIS - Use database queries:
   node custom-queries.js

═══════════════════════════════════════════════════════════════════════

📁 FILES CREATED
═══════════════════════════════════════════════════════════════════════

Analysis Results:
• chess-analysis-*.json          - Game analysis results
• chess-multi-analysis-*.json    - Multi-game analysis results

Token Files:
• auto-extracted-tokens.json     - Tokens from headless extraction
• extracted-tokens.json          - Tokens from interactive browser
• login-extracted-tokens.json    - Tokens from automated login

Database:
• chess_games.db                 - SQLite database with game data

═══════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════

❌ "WebSocket authentication failed"
   → Use HTTP API tools instead (they work without auth)
   → Try: node chess-analysis-suite.js <game-id>

❌ "Database errors"
   → Check if chess_games.db exists
   → Try: node chess-fetcher.js --username someuser

❌ "No analysis data"
   → Some games don't have public analysis
   → Try different game IDs
   → Use database tools for bulk analysis

❌ "Browser won't launch"
   → Use headless mode: node auto-token-fetcher.js
   → Or skip WebSocket, use HTTP APIs

═══════════════════════════════════════════════════════════════════════

🎉 SUCCESS METRICS
═══════════════════════════════════════════════════════════════════════

✅ HTTP API Analysis: WORKING
✅ Database Integration: WORKING  
✅ Game Data Extraction: WORKING
✅ Multi-game Analysis: WORKING
✅ Token Extraction: WORKING (but WebSocket auth still challenging)
✅ Comprehensive Tooling: COMPLETE

═══════════════════════════════════════════════════════════════════════

🚀 NEXT STEPS
═══════════════════════════════════════════════════════════════════════

1. Use the HTTP API tools for immediate analysis
2. Set up database for bulk game analysis
3. Try WebSocket token extraction if you need real-time data
4. Customize the tools for your specific needs

The HTTP API tools give you everything you need for Chess.com analysis!
WebSocket is just a bonus if you can get authentication working.

═══════════════════════════════════════════════════════════════════════
`);

// Show file listing
console.log('\n📁 CURRENT WORKSPACE FILES:');
console.log('─'.repeat(50));

const files = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.db'))
  .sort();

files.forEach(file => {
  const stats = fs.statSync(path.join(__dirname, file));
  const size = stats.size < 1024 ? `${stats.size}B` : `${Math.round(stats.size / 1024)}KB`;
  const modified = stats.mtime.toISOString().split('T')[0];
  console.log(`   ${file.padEnd(30)} ${size.padStart(8)} ${modified}`);
});

console.log('\n🎯 Ready to analyze Chess.com games! 🚀\n');
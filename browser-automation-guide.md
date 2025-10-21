# Chess.com Browser Token Extraction Guide

I've created several browser automation scripts to extract authentication tokens from Chess.com. Here are your options:

## 🚀 **Quick Start - Choose Your Method**

### **Method 1: Automatic Extraction (No Login Required)**
```bash
node auto-token-fetcher.js
```
- ✅ **Pros**: No login required, fully automated
- ❌ **Cons**: May not find valid WebSocket tokens
- 🎯 **Best for**: Quick testing, public games

### **Method 2: Interactive Browser (Manual Login)**
```bash
node browser-token-fetcher.js
```
- ✅ **Pros**: More likely to find valid tokens
- ❌ **Cons**: Requires manual login
- 🎯 **Best for**: When you want to see what's happening

### **Method 3: Automated Login (Full Automation)**
```bash
node login-token-fetcher.js
```
- ✅ **Pros**: Fully automated, most likely to work
- ❌ **Cons**: Requires your Chess.com credentials
- 🎯 **Best for**: When you want full automation

## 📋 **What Each Script Does**

### **`auto-token-fetcher.js`**
- Launches headless browser
- Tries to extract tokens from public APIs
- Tests extracted tokens
- Saves results to `auto-extracted-tokens.json`

### **`browser-token-fetcher.js`**
- Launches visible browser
- Waits for you to manually log in
- Extracts tokens from cookies, localStorage, etc.
- Tests tokens automatically
- Saves results to `extracted-tokens.json`

### **`login-token-fetcher.js`**
- Launches visible browser
- Asks for your Chess.com credentials
- Automatically logs in
- Extracts all possible tokens
- Tests tokens with WebSocket client
- Saves results to `login-extracted-tokens.json`

## 🔧 **Installation & Setup**

The scripts are already set up! Just run:

```bash
# Test the automatic extraction
node auto-token-fetcher.js

# Or try the interactive method
node browser-token-fetcher.js
```

## 🎯 **Expected Results**

### **If Tokens Are Found:**
```json
{
  "timestamp": "2025-10-21T09:39:16.405Z",
  "tokens": {
    "PHPSESSID": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "api_auth_token": "38eed29.JjGi_DGvRmapPACKA6EttrU3hM4kPYRsvn_HW1UYCmo..."
  }
}
```

### **Using Found Tokens:**
```bash
# Test with WebSocket
node ws-analysis-with-auth.js test "your-token-here"

# Or set as environment variable
export CHESSCOM_AUTH_TOKEN="your-token-here"
node ws-analysis-with-auth.js test
```

## 🚨 **Troubleshooting**

### **"No tokens found"**
- Try the login method: `node login-token-fetcher.js`
- Make sure you're logged into Chess.com
- Check if the game is publicly accessible

### **"Tokens found but not working"**
- The tokens might be for different purposes
- Try different token formats
- Use the HTTP API methods instead

### **"Browser won't launch"**
- Make sure Puppeteer is installed: `npm install puppeteer`
- Check if you have Chrome/Chromium installed
- Try running with `--no-sandbox` flag

## 🎉 **Success! What Next?**

Once you have working tokens:

1. **Test WebSocket connection:**
   ```bash
   node ws-analysis-with-auth.js test "your-token"
   ```

2. **Use interactive mode:**
   ```bash
   node ws-analysis-with-auth.js interactive
   ```

3. **Analyze specific games:**
   ```bash
   node ws-analysis-with-auth.js game 143445742366 "your-token"
   ```

## 🔄 **Alternative: HTTP API (No Auth Required)**

If WebSocket authentication is too complex, you can still get Chess.com data using HTTP APIs:

```bash
# Get game analysis
node chesscom-analysis.js "https://www.chess.com/game/live/143445742366"

# Get recent games
node chesscom-analysis.js --recent 5

# Use local database
node game-analyzer.js --recent 10
```

## 📁 **Files Created**

- `auto-extracted-tokens.json` - Tokens from automatic extraction
- `extracted-tokens.json` - Tokens from interactive browser
- `login-extracted-tokens.json` - Tokens from automated login

## 🎯 **Recommendation**

1. **Start with**: `node auto-token-fetcher.js` (easiest)
2. **If that fails**: `node browser-token-fetcher.js` (manual login)
3. **For best results**: `node login-token-fetcher.js` (full automation)
4. **If all else fails**: Use HTTP API methods (no auth needed)

The browser automation gives you the best chance of getting working WebSocket tokens! 🚀
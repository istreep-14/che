# Chess Data Analysis Toolkit

Comprehensive analysis tools for your Chess.com game data - NO opening database required!

## 📁 Files

- **chess-fetcher.js** - Your original data fetcher (fetches games from Chess.com)
- **chesscom-analysis.js** - 🔥 NEW: Fetch Chess.com's computer analysis (accuracy, blunders!)
- **game-analyzer.js** - ⭐ Simple PGN analyzer (works without openings!)
- **chess-analyzer.js** - Statistical analysis with 10 different reports
- **custom-queries.js** - Custom query builder with 15 pre-built queries
- **EXPANSION_GUIDE.md** - Detailed guide for advanced features

## 🚀 Quick Start

### 1. Fetch Your Games (if you haven't already)
```bash
node chess-fetcher.js
```

### 2. List Your Recent Games
```bash
node game-analyzer.js --list
```

### 3. Analyze a Specific Game
```bash
node game-analyzer.js <game-id>
```

### 4. Fetch Chess.com's Analysis (Accuracy & Blunders!) 🔥
```bash
# By URL
node chesscom-analysis.js https://www.chess.com/game/live/123456789

# By game ID from your database
node chesscom-analysis.js 123456789 --save

# Analyze recent games
node chesscom-analysis.js --recent 5
```

This fetches Chess.com's official computer analysis including:
- ✅ Accuracy scores (White & Black)
- ✅ Blunders, Mistakes, Inaccuracies
- ✅ Position evaluations
- ✅ Saves to your database for later review

Example output:
```
GAME 12345678 - BLITZ
══════════════════════════════════════
🔗 URL: https://chess.com/...
📅 Date: 2024-10-15
⏱️  Duration: 00:08:23
🎯 You: white (1542)
👤 Opponent: player123 (1556)
📊 Result: WIN
📖 Opening: Sicilian Defense
🔢 Plies: 47

📊 GAME STATISTICS:
  Total moves: 47
  Captures: 12
  Checks: 3
  Castles: 2
  Promotions: 0

♟️ PIECE ACTIVITY:
  Pawn moves: 18 (38.3%)
  Knight moves: 8 (17.0%)
  Bishop moves: 6 (12.8%)
  ...
```

## 🎯 Game Analyzer Features

### Fetch Chess.com Analysis 🔥 NEW!
Get official Chess.com computer analysis:
```bash
# Analyze by URL
node chesscom-analysis.js "https://www.chess.com/analysis/game/live/144540017288"

# Analyze from your database
node chesscom-analysis.js 123456789 --save

# Batch analyze recent games
node chesscom-analysis.js --recent 10

# View saved analysis
node chesscom-analysis.js --show 123456789
```

**What you get:**
- Accuracy scores for both players
- Exact blunder positions (move numbers)
- Mistake and inaccuracy counts
- Position evaluations throughout the game
- All saved to database for comparison over time

### Analyze Individual Games
```bash
# By game ID from database
node game-analyzer.js 12345678

# From PGN file
node game-analyzer.js --pgn mygame.pgn

# Recent games
node game-analyzer.js --recent 5
```

### Search Your Games
```bash
# Find Sicilian Defense games
node game-analyzer.js --opening "Sicilian"

# Find games against specific opponent
node game-analyzer.js --opponent "magnus"

# Find your blitz wins
node game-analyzer.js --outcome win --format blitz

# Find games above certain rating
node game-analyzer.js --min-rating 1500
```

### What You Get
- ✅ Complete game information
- ✅ Move statistics (captures, checks, castles)
- ✅ Piece activity breakdown
- ✅ Full move list display
- ✅ No opening database needed!

## 📊 Statistical Analysis

### Run All Analyses
```bash
node chess-analyzer.js
```

### Run Specific Analysis
```bash
node chess-analyzer.js openings      # Opening win rates
node chess-analyzer.js streaks       # Win/loss streaks
node chess-analyzer.js timecontrols  # Performance by format
node chess-analyzer.js opponents     # Most frequent opponents
node chess-analyzer.js timeofday     # Best playing times
```

Available analyses:
- `openings` - Win rates by opening
- `timecontrols` - Bullet/blitz/rapid performance
- `color` - White vs Black statistics
- `streaks` - Longest win/loss streaks
- `opponents` - Most frequent opponents
- `rating` - Rating progression
- `duration` - Game length analysis
- `terminations` - How games end
- `timeofday` - Performance by hour
- `monthly` - Monthly statistics

## 🔍 Custom Queries

### List Available Queries
```bash
node custom-queries.js --list
```

### Run Pre-Built Queries
```bash
node custom-queries.js biggest-upsets
node custom-queries.js my-peak-ratings
node custom-queries.js quick-wins
node custom-queries.js comeback-games
```

15 Pre-built queries including:
- **biggest-upsets** - Wins vs much higher rated
- **quick-wins** - Wins in under 15 moves
- **timeout-games** - Games lost on time
- **perfect-sessions** - Days with 100% wins
- **tough-opponents** - Players who beat you most
- And 10 more!

### Interactive Mode
```bash
node custom-queries.js --interactive
```

### Custom SQL
```bash
node custom-queries.js --custom "SELECT * FROM games WHERE plies > 100"
```

## 📈 Example Workflows

### After Playing a Game 🔥
```bash
# List your recent games
node game-analyzer.js --list 10

# Fetch Chess.com's analysis
node chesscom-analysis.js --recent 1

# See your moves and statistics
node game-analyzer.js --recent 1
```

### Deep Dive on a Game
```bash
# Get the game ID from the list
node game-analyzer.js --list

# Fetch official analysis with accuracy
node chesscom-analysis.js 123456789 --save

# Review moves and statistics
node game-analyzer.js 123456789

# View saved analysis anytime
node chesscom-analysis.js --show 123456789
```

### Weekly Review
```bash
# Run all statistical analyses
node chess-analyzer.js

# Check your recent upsets
node custom-queries.js biggest-upsets

# Look at opening performance
node chess-analyzer.js openings
```

### Preparation Against Opponent
```bash
# Find all games vs specific opponent
node game-analyzer.js --opponent "theirname"

# Analyze one of those games
node game-analyzer.js <game-id>
```

### Opening Research
```bash
# Find all games with an opening
node game-analyzer.js --opening "Queen's Gambit"

# See your opening statistics
node chess-analyzer.js openings
```

## 🎨 What Each Tool Does

### chesscom-analysis.js - Official Chess.com Analysis 🔥
**Best for:** Getting accuracy scores, finding blunders, tracking improvement
- Fetches Chess.com's computer analysis
- Shows accuracy percentages
- Lists all blunders, mistakes, inaccuracies
- Position evaluations
- Saves to database for historical tracking

### game-analyzer.js - Game Details
**Best for:** Reviewing individual games, searching your history
- Shows full game information
- Displays all moves
- Calculates move statistics
- Works without opening database

### chess-analyzer.js - Statistical Reports
**Best for:** Understanding patterns, tracking progress
- Win rates by category
- Time-based trends
- Opponent analysis
- Rating progression

### custom-queries.js - Flexible Queries
**Best for:** Finding specific games, custom analysis
- Pre-built interesting queries
- Custom SQL support
- Interactive exploration

## 💡 Pro Tips

1. **After each session (BEST!):**
   ```bash
   node chesscom-analysis.js --recent 5
   node game-analyzer.js --recent 5
   ```

2. **Weekly check:**
   ```bash
   node chess-analyzer.js
   ```

3. **Find your weaknesses:**
   ```bash
   # Get accuracy data for recent games
   node chesscom-analysis.js --recent 10
   
   # See what openings cause blunders
   node custom-queries.js biggest-disappointments
   ```

4. **Compare accuracy over time:**
   ```bash
   # Fetch analysis for games
   node chesscom-analysis.js --recent 20
   
   # Query accuracy trends
   sqlite3 chess_games.db "
     SELECT AVG(white_accuracy), AVG(black_accuracy) 
     FROM chesscom_analysis
   "
   ```

4. **Track opening repertoire:**
   ```bash
   node chess-analyzer.js openings
   node game-analyzer.js --opening "your-favorite-opening"
   ```

5. **Export to spreadsheet:**
   ```bash
   node custom-queries.js --custom "SELECT * FROM games" > all_games.csv
   ```

## 🗄️ Database Schema

Your database (`chess_games.db`) contains:
- Complete game history with PGN
- Rating changes and progression
- Move-by-move data with timestamps
- Game metadata (format, duration, outcome)
- Opening information
- Opponent details

Key fields:
- `game_id`, `url`, `pgn`
- `start_datetime`, `end_datetime`, `duration_seconds`
- `format` (bullet, blitz, rapid, daily)
- `color`, `opponent`, `my_rating`, `opp_rating`
- `outcome`, `termination`
- `opening_name`, `opening_family`, `eco`
- `plies`, `moves_count`

View the schema:
```bash
sqlite3 chess_games.db ".schema games"
```

## 📚 Advanced Usage

### Export to CSV
```bash
# Export all games
sqlite3 -header -csv chess_games.db "SELECT * FROM games" > all_games.csv

# Export specific format
sqlite3 -header -csv chess_games.db "SELECT * FROM games WHERE format='blitz'" > blitz.csv
```

### Complex Searches
```bash
# Games where you were outrated but won
node custom-queries.js --custom "
  SELECT end_date, format, my_rating, opp_rating, opening_name, url
  FROM games
  WHERE outcome = 'win' AND opp_rating > my_rating + 50
  ORDER BY (opp_rating - my_rating) DESC
  LIMIT 10
"
```

### Combine Analyses
```bash
# Find your best opening, then review recent games with it
node chess-analyzer.js openings  # Note your best opening
node game-analyzer.js --opening "Your Best Opening" --recent
```

## 🔧 Customization

### Add Your Own Query
Edit `custom-queries.js` and add to `CUSTOM_QUERIES`:
```javascript
'my-query': {
  description: 'What this does',
  query: `SELECT ... FROM games WHERE ...`
}
```

### Add Your Own Analysis
Edit `chess-analyzer.js` and add a function:
```javascript
async function analyzeMyThing(db) {
  return new Promise((resolve, reject) => {
    db.all(`YOUR SQL`, (err, rows) => {
      console.table(rows);
      resolve(rows);
    });
  });
}
```

## 🐛 Troubleshooting

**"Database locked"**: Close other programs accessing the database

**"Game not found"**: Make sure you've run `chess-fetcher.js` first

**"No results"**: Try different search criteria or check your data

**Empty analysis**: Run the fetcher to populate your database

## 📖 Learn More

See **EXPANSION_GUIDE.md** for:
- How to add Stockfish engine analysis
- Fetching additional data (tournaments, clubs, player profiles)
- Advanced statistics and patterns
- Machine learning ideas
- Visualization options

## 🎓 SQL Tips for Custom Analysis

```sql
-- Your best format
SELECT format, AVG(CASE WHEN outcome='win' THEN 1 ELSE 0 END)*100 as win_pct
FROM games GROUP BY format;

-- Rating by month
SELECT archive, AVG(my_rating) FROM games GROUP BY archive;

-- Performance vs rating ranges
SELECT 
  CASE 
    WHEN opp_rating < my_rating - 100 THEN 'Much Weaker'
    WHEN opp_rating < my_rating THEN 'Weaker'
    WHEN opp_rating < my_rating + 100 THEN 'Similar'
    ELSE 'Stronger'
  END as opponent_level,
  COUNT(*) as games,
  SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) as wins
FROM games
GROUP BY opponent_level;
```

## ❓ Quick Reference

```bash
# Essential commands
node game-analyzer.js --list              # See recent games
node chesscom-analysis.js --recent 1      # Get Chess.com analysis 🔥
node game-analyzer.js <id>                # Analyze game details
node chess-analyzer.js                    # Run all stats
node custom-queries.js --list             # See queries

# Search
node game-analyzer.js --opening "name"    # Find opening
node game-analyzer.js --opponent "name"   # Find opponent
node game-analyzer.js --outcome win       # Find wins

# Analysis
node chess-analyzer.js openings           # Opening stats
node chess-analyzer.js streaks            # Streaks
node custom-queries.js biggest-upsets     # Special query
```

## 🎯 Next Steps

1. ✅ List your games: `node game-analyzer.js --list`
2. 🔍 Analyze recent games: `node game-analyzer.js --recent 3`
3. 📊 Run statistics: `node chess-analyzer.js`
4. 🎲 Try queries: `node custom-queries.js --list`
5. 📖 Read EXPANSION_GUIDE.md for advanced features

---

Happy analyzing! ♟️📊

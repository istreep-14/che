# Chess.com Analysis Fetcher Guide 🔥

Get official Chess.com computer analysis including accuracy scores, blunders, mistakes, and position evaluations!

## What It Does

This tool fetches the **same analysis you see on Chess.com** including:
- ✅ **Accuracy scores** for both White and Black
- ✅ **Blunder identification** - exact move numbers
- ✅ **Mistake and inaccuracy counts**
- ✅ **Position evaluations** throughout the game
- ✅ **Saves to database** for historical tracking

## Quick Start

### 1. Analyze Your Last Game
```bash
node chesscom-analysis.js --recent 1
```

### 2. Analyze by URL
```bash
node chesscom-analysis.js "https://www.chess.com/game/live/144540017288"
# or
node chesscom-analysis.js "https://www.chess.com/analysis/game/live/144540017288"
```

### 3. Analyze from Your Database
```bash
# First, list your games to get the ID
node game-analyzer.js --list

# Then analyze and save
node chesscom-analysis.js 144540017288 --save
```

### 4. Batch Analyze Recent Games
```bash
node chesscom-analysis.js --recent 10
```

## Example Output

```
CHESS.COM ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📋 GAME INFORMATION:
  URL: https://www.chess.com/game/live/144540017288
  White: player1 (1542)
  Black: player2 (1556)
  Result: 1-0
  Time Control: 300+0

🎯 ACCURACY:
  White: 87.3%
  Black: 73.2%

❌ ERROR ANALYSIS:
  Blunders: 2
    Move 15 (Black)
    Move 23 (Black)
  Mistakes: 4
    Move 8 (White)
    Move 12 (Black)
    Move 18 (Black)
    Move 21 (White)
  Inaccuracies: 7

📊 POSITION EVALUATIONS:
  (First 10 positions)
    1. White: +0.3
    1. Black: +0.2
    2. White: +0.5
    2. Black: +0.3
    ...
```

## Usage Patterns

### Pattern 1: After Each Game Session
```bash
# Fetch analysis for your 5 most recent games
node chesscom-analysis.js --recent 5
```

This will:
1. Fetch each game's analysis from Chess.com
2. Display accuracy and error counts
3. Save to database (optional with `--save`)

### Pattern 2: Analyze a Specific Game in Detail
```bash
# Step 1: Get the game ID
node game-analyzer.js --list

# Step 2: Fetch Chess.com analysis
node chesscom-analysis.js 123456789 --save

# Step 3: View moves and statistics
node game-analyzer.js 123456789

# Step 4: View saved analysis anytime
node chesscom-analysis.js --show 123456789
```

### Pattern 3: Track Accuracy Over Time
```bash
# Fetch analysis for many games
node chesscom-analysis.js --recent 50

# Query your average accuracy
sqlite3 chess_games.db "
  SELECT 
    AVG(white_accuracy) as avg_white_accuracy,
    AVG(black_accuracy) as avg_black_accuracy
  FROM chesscom_analysis
"

# Accuracy by color you played
sqlite3 chess_games.db "
  SELECT 
    g.color,
    AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
             ELSE ca.black_accuracy END) as my_accuracy
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
  GROUP BY g.color
"
```

### Pattern 4: Find Games with Most Blunders
```bash
# Query games with most blunders
sqlite3 chess_games.db "
  SELECT g.game_id, g.end_date, g.outcome, ca.blunders, ca.mistakes
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
  ORDER BY ca.blunders DESC
  LIMIT 10
"
```

## Command Reference

```bash
# Analyze by URL
node chesscom-analysis.js <chess.com-url>

# Analyze by game ID
node chesscom-analysis.js <game-id>

# Analyze and save to database
node chesscom-analysis.js <game-id> --save

# Analyze recent games
node chesscom-analysis.js --recent [N]

# Show saved analysis
node chesscom-analysis.js --show <game-id>

# Help
node chesscom-analysis.js --help
```

## Database Schema

The tool creates a `chesscom_analysis` table:

```sql
CREATE TABLE chesscom_analysis (
  game_id TEXT PRIMARY KEY,
  white_accuracy REAL,
  black_accuracy REAL,
  blunders INTEGER,
  mistakes INTEGER,
  inaccuracies INTEGER,
  evaluations TEXT,
  analysis_data TEXT,
  fetched_at TEXT
);
```

## Advanced Queries

### Average Accuracy by Opening
```sql
SELECT 
  g.opening_name,
  COUNT(*) as games,
  AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
           ELSE ca.black_accuracy END) as my_accuracy
FROM games g
JOIN chesscom_analysis ca ON g.game_id = ca.game_id
WHERE g.opening_name IS NOT NULL
GROUP BY g.opening_name
HAVING games >= 5
ORDER BY my_accuracy DESC;
```

### Accuracy Trends Over Time
```sql
SELECT 
  g.archive as month,
  AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
           ELSE ca.black_accuracy END) as avg_accuracy,
  AVG(ca.blunders) as avg_blunders
FROM games g
JOIN chesscom_analysis ca ON g.game_id = ca.game_id
GROUP BY g.archive
ORDER BY g.archive DESC
LIMIT 12;
```

### Games by Accuracy Range
```sql
SELECT 
  CASE 
    WHEN my_acc < 70 THEN 'Poor (<70%)'
    WHEN my_acc < 80 THEN 'Fair (70-79%)'
    WHEN my_acc < 90 THEN 'Good (80-89%)'
    ELSE 'Excellent (90%+)'
  END as accuracy_range,
  COUNT(*) as games,
  AVG(CASE WHEN g.outcome = 'win' THEN 1.0 ELSE 0.0 END) * 100 as win_rate
FROM (
  SELECT 
    g.game_id,
    g.outcome,
    CASE WHEN g.color = 'white' THEN ca.white_accuracy 
         ELSE ca.black_accuracy END as my_acc
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
)
GROUP BY accuracy_range
ORDER BY 
  CASE accuracy_range
    WHEN 'Poor (<70%)' THEN 1
    WHEN 'Fair (70-79%)' THEN 2
    WHEN 'Good (80-89%)' THEN 3
    ELSE 4
  END;
```

### Blunder Patterns
```sql
-- Games with 0 blunders
SELECT COUNT(*) as zero_blunder_games
FROM chesscom_analysis
WHERE blunders = 0;

-- Average blunders by outcome
SELECT 
  g.outcome,
  AVG(ca.blunders) as avg_blunders,
  AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
           ELSE ca.black_accuracy END) as avg_accuracy
FROM games g
JOIN chesscom_analysis ca ON g.game_id = ca.game_id
GROUP BY g.outcome;
```

## Tips & Best Practices

### 1. Rate Limiting
Chess.com may rate-limit requests. The script includes a 2-second delay between batch requests.

### 2. When Analysis is Available
- Live games: Usually available immediately after the game
- Daily games: Available once the game is complete
- Not all games have analysis - it's a Chess.com premium feature

### 3. Combine with Other Tools
```bash
# Get full picture of a game:
node chesscom-analysis.js 123456789 --save    # Accuracy & errors
node game-analyzer.js 123456789               # Move details
node custom-queries.js --custom "SELECT * FROM games WHERE game_id='123456789'"
```

### 4. Track Improvement
```bash
# Fetch analysis regularly
node chesscom-analysis.js --recent 10

# Compare monthly
sqlite3 chess_games.db "
  SELECT 
    substr(g.archive, 1, 7) as month,
    AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
             ELSE ca.black_accuracy END) as accuracy
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
  GROUP BY month
  ORDER BY month DESC
  LIMIT 6
"
```

### 5. Focus on High-Blunder Games
```bash
# Find games where you blundered most
sqlite3 chess_games.db "
  SELECT g.game_id, g.url, g.end_date, ca.blunders, g.opening_name
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
  ORDER BY ca.blunders DESC
  LIMIT 5
"

# Then review those games
node game-analyzer.js <game-id>
```

## Troubleshooting

**"No analysis available"**: Not all games have Chess.com analysis. Premium members get more analysis.

**"API returned status 404"**: The game ID might be wrong, or the game doesn't exist.

**"Rate limited"**: Wait a few minutes and try again. Use smaller batch sizes.

**Empty results**: Some games don't have computer analysis available yet.

## What You Can Learn

### Accuracy Patterns
- Do you play better as White or Black?
- Which openings lead to higher accuracy?
- Does your accuracy drop in longer games?
- Are you more accurate in faster or slower time controls?

### Blunder Analysis
- When do you blunder most? (opening, middlegame, endgame)
- What time controls cause more blunders?
- Do you blunder more in wins or losses?
- Which openings lead to more mistakes?

### Progress Tracking
- Is your average accuracy improving over time?
- Are you making fewer blunders per game?
- How does your accuracy compare across formats?

## Integration Ideas

### 1. Weekly Report Script
Create `weekly-report.sh`:
```bash
#!/bin/bash
echo "Fetching analysis for recent games..."
node chesscom-analysis.js --recent 20

echo "\nAccuracy Statistics:"
sqlite3 chess_games.db "
  SELECT 
    COUNT(*) as games,
    AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
             ELSE ca.black_accuracy END) as avg_accuracy,
    AVG(ca.blunders) as avg_blunders
  FROM games g
  JOIN chesscom_analysis ca ON g.game_id = ca.game_id
  WHERE g.end_date >= date('now', '-7 days')
"
```

### 2. Custom Analysis Script
Add your own analysis logic in `my-analysis.js`:
```javascript
const { analyzeGameUrl } = require('./chesscom-analysis.js');

async function customAnalysis(gameId) {
  const result = await analyzeGameUrl(gameId, true);
  
  // Your custom logic here
  if (result.accuracy.white < 70) {
    console.log('⚠️  Low accuracy game - needs review!');
  }
  
  if (result.blunders.length > 2) {
    console.log('⚠️  Multiple blunders detected');
  }
}
```

## Summary

The Chess.com analysis fetcher is your most powerful tool for:
- 📊 Understanding your accuracy
- 🎯 Finding specific blunders
- 📈 Tracking improvement over time
- 🔍 Identifying patterns in mistakes

Use it regularly to understand where you need to improve!

---

**Pro tip**: Combine this with `game-analyzer.js` to see exactly which moves were blunders, then study those positions!

# Chess Data Expansion & Analysis Guide

## Current Data Collection
Your script already collects extensive data:
- ✅ Game metadata (ID, URL, PGN, dates, times)
- ✅ Game details (format, time control, rated/unrated)
- ✅ Player info (color, ratings, rating changes)
- ✅ Results (outcome, termination method)
- ✅ Opening analysis (ECO codes, names, variations)
- ✅ Move data (move counts, plies, move list with clock times)

## Additional Data You Can Fetch

### 1. Player Profile Data
**What to fetch:**
- Player stats from Chess.com API
- Country, join date, status (premium/basic)
- Best ratings in each time control
- Puzzle rating, lessons completed
- Titled player status

**How to implement:**
```javascript
async function fetchPlayerProfile(username) {
  const url = `https://api.chess.com/pub/player/${username}`;
  const response = await fetchAPI(url);
  return {
    country: response.country,
    joined: response.joined,
    status: response.status,
    title: response.title || null,
    followers: response.followers,
    is_streamer: response.is_streamer
  };
}

async function fetchPlayerStats(username) {
  const url = `https://api.chess.com/pub/player/${username}/stats`;
  const response = await fetchAPI(url);
  return {
    blitz_best: response.chess_blitz?.best?.rating,
    bullet_best: response.chess_bullet?.best?.rating,
    rapid_best: response.chess_rapid?.best?.rating,
    daily_best: response.chess_daily?.best?.rating,
    puzzle_rush_best: response.puzzle_rush?.best?.score,
    tactics_highest: response.tactics?.highest?.rating
  };
}
```

### 2. Opponent Profile Data
Enrich your database by fetching opponent profiles:
- Opponent's rating in other formats
- Opponent's country
- Title (if any)
- When they joined

**Implementation:**
```javascript
// Add to insertGame() function
async function fetchAndStoreOpponentData(db, opponentUsername) {
  try {
    const profile = await fetchPlayerProfile(opponentUsername);
    const stats = await fetchPlayerStats(opponentUsername);
    
    // Store in opponents table
    await db.run(`
      INSERT OR REPLACE INTO opponents 
      (username, country, title, joined, best_blitz, best_bullet, best_rapid)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      opponentUsername,
      profile.country,
      profile.title,
      profile.joined,
      stats.blitz_best,
      stats.bullet_best,
      stats.rapid_best
    ]);
  } catch (error) {
    console.warn(`Could not fetch opponent data for ${opponentUsername}`);
  }
}
```

### 3. Tournament Data
If you play in tournaments:
```javascript
async function fetchTournaments(username) {
  const url = `https://api.chess.com/pub/player/${username}/tournaments`;
  const data = await fetchAPI(url);
  return data.finished; // Array of tournament URLs
}

async function fetchTournamentDetails(tournamentUrl) {
  const data = await fetchAPI(tournamentUrl);
  return {
    name: data.settings.name,
    status: data.status,
    finish_time: data.settings.finish_time,
    total_players: data.players.length,
    // Parse standings, scores, etc.
  };
}
```

### 4. Club Data
If you're in chess clubs:
```javascript
async function fetchPlayerClubs(username) {
  const url = `https://api.chess.com/pub/player/${username}/clubs`;
  const data = await fetchAPI(url);
  return data.clubs; // Array of club URLs
}

async function fetchClubMatches(clubUrl) {
  const url = `${clubUrl}/matches`;
  const data = await fetchAPI(url);
  return data; // Club match history
}
```

### 5. Enhanced Move Analysis
You already have move data, but you can add:

**Time pressure analysis:**
```javascript
function analyzeTimePressure(movesData) {
  // Identify moves made with less than 10 seconds
  const timePressureMoves = movesData.filter(m => m.clock < 10);
  
  // Calculate average time per move
  const avgTimePerMove = movesData.reduce((sum, m, i, arr) => {
    if (i === 0) return sum;
    return sum + (arr[i-1].clock - m.clock);
  }, 0) / (movesData.length - 1);
  
  return {
    movesInTimePressure: timePressureMoves.length,
    avgTimePerMove: avgTimePerMove,
    fastestMove: Math.min(...movesData.map((m, i, arr) => 
      i === 0 ? Infinity : arr[i-1].clock - m.clock
    )),
    slowestMove: Math.max(...movesData.map((m, i, arr) => 
      i === 0 ? 0 : arr[i-1].clock - m.clock
    ))
  };
}
```

**Opening phase analysis:**
```javascript
function analyzeOpeningPhase(movesData, plies) {
  const openingMoves = movesData.slice(0, Math.min(10, movesData.length));
  const openingTime = openingMoves[0]?.clock - openingMoves[openingMoves.length - 1]?.clock || 0;
  
  return {
    openingTime: openingTime,
    openingMovesPlayed: openingMoves.length,
    avgTimePerOpeningMove: openingTime / openingMoves.length
  };
}
```

### 6. External Data Sources

**Lichess Data (if you also play there):**
```javascript
async function fetchLichessGames(username) {
  const url = `https://lichess.org/api/games/user/${username}`;
  // Requires streaming/pagination handling
  // Can compare your Chess.com vs Lichess performance
}
```

**Opening Database Integration:**
You already use openings.db, but you could enhance with:
- Opening win rates from master games
- Opening popularity trends
- Recommended variations based on your style

**Computer Analysis:**
Use a chess engine to analyze your games:
```javascript
const { Chess } = require('chess.js');
const { Engine } = require('node-uci'); // Stockfish integration

async function analyzeGameWithEngine(pgn) {
  const chess = new Chess();
  const engine = new Engine('/path/to/stockfish');
  
  await engine.init();
  
  chess.loadPgn(pgn);
  const moves = chess.history({ verbose: true });
  
  const analysis = [];
  chess.reset();
  
  for (const move of moves) {
    chess.move(move);
    const position = chess.fen();
    
    // Get engine evaluation
    const result = await engine.go({ depth: 20 });
    analysis.push({
      move: move.san,
      evaluation: result.info[0]?.score,
      bestMove: result.bestmove
    });
  }
  
  await engine.quit();
  return analysis;
}
```

## Analysis Ideas

### 1. Performance Trends
```javascript
// Identify if you're improving over time
async function calculateEloTrendline(db, format, months = 6) {
  const games = await db.all(`
    SELECT end_date, my_rating 
    FROM games 
    WHERE format = ? 
      AND end_date >= date('now', '-${months} months')
    ORDER BY end_date
  `, [format]);
  
  // Calculate linear regression
  // Determine if rating is trending up or down
}
```

### 2. Weakness Identification
```javascript
// Find your worst openings
async function findWeakOpenings(db, minGames = 10) {
  return db.all(`
    SELECT opening_name, 
           COUNT(*) as games,
           AVG(CASE WHEN outcome = 'win' THEN 1 
                    WHEN outcome = 'draw' THEN 0.5 
                    ELSE 0 END) as score
    FROM games
    WHERE opening_name IS NOT NULL
    GROUP BY opening_name
    HAVING games >= ?
    ORDER BY score ASC
    LIMIT 10
  `, [minGames]);
}
```

### 3. Optimal Playing Times
```javascript
// When do you play best?
async function findBestPlayingTimes(db) {
  // Analyze win rate by:
  // - Hour of day
  // - Day of week
  // - Month
  // - Session length (consecutive games)
}
```

### 4. Opponent Strength Analysis
```javascript
// Performance vs different rating ranges
async function analyzeVsRatingRanges(db) {
  return db.all(`
    SELECT 
      CASE 
        WHEN opp_rating < my_rating - 200 THEN 'Much Weaker'
        WHEN opp_rating < my_rating - 50 THEN 'Weaker'
        WHEN opp_rating < my_rating + 50 THEN 'Similar'
        WHEN opp_rating < my_rating + 200 THEN 'Stronger'
        ELSE 'Much Stronger'
      END as opponent_strength,
      COUNT(*) as games,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
      ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                     WHEN outcome = 'draw' THEN 0.5 
                     ELSE 0 END) * 100, 1) as score
    FROM games
    WHERE my_rating IS NOT NULL AND opp_rating IS NOT NULL
    GROUP BY opponent_strength
    ORDER BY 
      CASE opponent_strength
        WHEN 'Much Weaker' THEN 1
        WHEN 'Weaker' THEN 2
        WHEN 'Similar' THEN 3
        WHEN 'Stronger' THEN 4
        WHEN 'Much Stronger' THEN 5
      END
  `);
}
```

### 5. Game Length Patterns
```javascript
// Do you perform better in quick or long games?
async function analyzeByGameLength(db, format) {
  return db.all(`
    SELECT 
      CASE 
        WHEN plies < 20 THEN 'Very Short (< 20 moves)'
        WHEN plies < 40 THEN 'Short (20-39 moves)'
        WHEN plies < 60 THEN 'Medium (40-59 moves)'
        WHEN plies < 80 THEN 'Long (60-79 moves)'
        ELSE 'Very Long (80+ moves)'
      END as game_length,
      COUNT(*) as games,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
      ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                     WHEN outcome = 'draw' THEN 0.5 
                     ELSE 0 END) * 100, 1) as win_rate
    FROM games
    WHERE format = ? AND plies > 0
    GROUP BY game_length
    ORDER BY 
      CASE game_length
        WHEN 'Very Short (< 20 moves)' THEN 1
        WHEN 'Short (20-39 moves)' THEN 2
        WHEN 'Medium (40-59 moves)' THEN 3
        WHEN 'Long (60-79 moves)' THEN 4
        ELSE 5
      END
  `, [format]);
}
```

### 6. Blunder Detection (without engine)
```javascript
// Detect potential blunders by large rating swings after game
async function detectPotentialBlunders(db) {
  return db.all(`
    SELECT game_id, end_date, format, outcome, 
           rating_delta, my_rating, opp_rating
    FROM games
    WHERE outcome = 'loss' 
      AND rating_delta < -20  -- Large rating drop
      AND my_rating > opp_rating + 50  -- Against lower-rated
    ORDER BY rating_delta ASC
    LIMIT 20
  `);
}
```

### 7. Repertoire Coverage
```javascript
// How diverse is your opening repertoire?
async function analyzeRepertoireDiversity(db) {
  const whiteOpenings = await db.all(`
    SELECT opening_family, COUNT(*) as games
    FROM games
    WHERE color = 'white' AND opening_family IS NOT NULL
    GROUP BY opening_family
  `);
  
  const blackOpenings = await db.all(`
    SELECT opening_family, COUNT(*) as games
    FROM games
    WHERE color = 'black' AND opening_family IS NOT NULL
    GROUP BY opening_family
  `);
  
  return {
    whiteRepertoire: whiteOpenings.length,
    blackRepertoire: blackOpenings.length,
    whiteMainLine: whiteOpenings[0],  // Most played
    blackMainLine: blackOpenings[0]
  };
}
```

### 8. Recovery Analysis
```javascript
// How well do you recover from losses?
async function analyzeRecoveryFromLosses(db) {
  const games = await db.all(`
    SELECT outcome, end_timestamp
    FROM games
    ORDER BY end_timestamp ASC
  `);
  
  let afterLossPerformance = { wins: 0, losses: 0, draws: 0 };
  
  for (let i = 1; i < games.length; i++) {
    if (games[i-1].outcome === 'loss') {
      afterLossPerformance[games[i].outcome + 's']++;
    }
  }
  
  return afterLossPerformance;
}
```

## Visualization Ideas

### 1. Export to CSV for Spreadsheets
```javascript
async function exportToCSV(db, filename) {
  const games = await db.all('SELECT * FROM games ORDER BY end_timestamp');
  
  const csv = [
    Object.keys(games[0]).join(','),
    ...games.map(g => Object.values(g).join(','))
  ].join('\n');
  
  fs.writeFileSync(filename, csv);
}
```

### 2. Generate JSON for Web Visualization
```javascript
async function exportForVisualization(db) {
  const data = {
    ratingHistory: await getRatingHistory(db),
    openingStats: await analyzeOpenings(db),
    monthlyStats: await analyzeMonthly(db),
    // ... other analyses
  };
  
  fs.writeFileSync('chess-viz-data.json', JSON.stringify(data, null, 2));
}
```

### 3. Create HTML Report
```javascript
async function generateHTMLReport(db) {
  const analyses = await runAllAnalyses(db);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Chess Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <h1>Chess Performance Report</h1>
      ${renderAnalysisHTML(analyses)}
    </body>
    </html>
  `;
  
  fs.writeFileSync('report.html', html);
}
```

## Database Schema Additions

Consider adding these tables:

```sql
-- Store opponent profiles
CREATE TABLE IF NOT EXISTS opponents (
  username TEXT PRIMARY KEY,
  country TEXT,
  title TEXT,
  joined INTEGER,
  best_blitz INTEGER,
  best_bullet INTEGER,
  best_rapid INTEGER,
  last_updated TEXT
);

-- Store session data
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  start_time TEXT,
  end_time TEXT,
  games_played INTEGER,
  wins INTEGER,
  losses INTEGER,
  rating_change INTEGER
);

-- Store annotations/notes
CREATE TABLE IF NOT EXISTS game_notes (
  game_id TEXT PRIMARY KEY,
  notes TEXT,
  lessons_learned TEXT,
  mistakes TEXT,
  created_at TEXT,
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);

-- Store goals and progress
CREATE TABLE IF NOT EXISTS goals (
  goal_id TEXT PRIMARY KEY,
  format TEXT,
  target_rating INTEGER,
  target_date TEXT,
  achieved INTEGER DEFAULT 0,
  created_at TEXT
);
```

## Running the Analyzer

```bash
# Run all analyses
node chess-analyzer.js

# Run specific analysis
node chess-analyzer.js openings
node chess-analyzer.js timecontrols
node chess-analyzer.js streaks
node chess-analyzer.js opponents

# Available analyses:
# - openings
# - timecontrols
# - color
# - streaks
# - opponents
# - rating
# - duration
# - terminations
# - timeofday
# - monthly
```

## Next Steps

1. **Run the analyzer** to see what insights you can already get
2. **Identify gaps** - what questions can't you answer yet?
3. **Add new data sources** - implement the fetch functions above
4. **Create custom queries** - write SQL for specific questions
5. **Visualize results** - export to CSV/JSON for charts
6. **Set up automation** - run analysis weekly/monthly
7. **Track progress** - compare current vs past performance

## Advanced: Machine Learning

If you want to go further:
- Predict game outcomes based on opening, time control, opponent rating
- Classify games by quality (blunder-free, tactical, positional)
- Recommend openings based on your style and success rate
- Identify patterns in losses to focus training

## Resources

- Chess.com API Docs: https://www.chess.com/news/view/published-data-api
- Lichess API Docs: https://lichess.org/api
- Chess.js (PGN parsing): https://github.com/jhlywa/chess.js
- Stockfish (engine): https://stockfishchess.org/
- PGN spec: http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm

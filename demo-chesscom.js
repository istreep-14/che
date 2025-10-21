#!/usr/bin/env node
// Chess.com Analysis Demo
// Shows what the tool outputs with mock data

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                  CHESS.COM ANALYSIS DEMO OUTPUT                      ║
╚══════════════════════════════════════════════════════════════════════╝

This demonstrates what you'll see when running the real tool.

════════════════════════════════════════════════════════════════════════

EXAMPLE 1: Analyzing a game by URL
════════════════════════════════════════════════════════════════════════

Command: 
  node chesscom-analysis.js "https://www.chess.com/game/live/144540017288"

Output:

Analyzing game: https://www.chess.com/game/live/144540017288

Game Type: live
Game ID: 144540017288

📡 Fetching game data from Chess.com API...
✓ Game data received

📊 Fetching analysis data...
✓ Analysis data received

🎯 Fetching game insights...
✓ Insights data received

✓ Data fetched successfully

══════════════════════════════════════════════════════════════════════
CHESS.COM ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📋 GAME INFORMATION:
  URL: https://www.chess.com/game/live/144540017288
  White: frankscobey (1542)
  Black: opponent123 (1556)
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
    3. White: +0.4
    3. Black: +0.6
    4. White: +0.7
    4. Black: -0.2
    5. White: +1.2
    5. Black: +0.8

══════════════════════════════════════════════════════════════════════

✓ Analysis saved to database


════════════════════════════════════════════════════════════════════════

EXAMPLE 2: Batch analyzing recent games
════════════════════════════════════════════════════════════════════════

Command:
  node chesscom-analysis.js --recent 3

Output:

Analyzing 3 recent games...

Processing game 144540017288 from 2024-10-20...

══════════════════════════════════════════════════════════════════════
CHESS.COM ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📋 GAME INFORMATION:
  White: frankscobey (1542)
  Black: player1 (1556)
  Result: 1-0
  Time Control: 300+0

🎯 ACCURACY:
  White: 87.3%
  Black: 73.2%

❌ ERROR ANALYSIS:
  Blunders: 2
  Mistakes: 4
  Inaccuracies: 7

══════════════════════════════════════════════════════════════════════

✓ Analysis saved to database


Processing game 144539876543 from 2024-10-20...

══════════════════════════════════════════════════════════════════════
CHESS.COM ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📋 GAME INFORMATION:
  White: player2 (1588)
  Black: frankscobey (1542)
  Result: 0-1
  Time Control: 180+2

🎯 ACCURACY:
  White: 78.5%
  Black: 91.2%

❌ ERROR ANALYSIS:
  Blunders: 1
  Mistakes: 2
  Inaccuracies: 3

══════════════════════════════════════════════════════════════════════

✓ Analysis saved to database


Processing game 144538765432 from 2024-10-19...

══════════════════════════════════════════════════════════════════════
CHESS.COM ANALYSIS REPORT
══════════════════════════════════════════════════════════════════════

📋 GAME INFORMATION:
  White: frankscobey (1540)
  Black: player3 (1525)
  Result: 1/2-1/2
  Time Control: 600+5

🎯 ACCURACY:
  White: 82.7%
  Black: 84.1%

❌ ERROR ANALYSIS:
  Blunders: 0
  Mistakes: 3
  Inaccuracies: 5

══════════════════════════════════════════════════════════════════════

✓ Analysis saved to database


✓ Analyzed 3 games


════════════════════════════════════════════════════════════════════════

EXAMPLE 3: Viewing saved analysis
════════════════════════════════════════════════════════════════════════

Command:
  node chesscom-analysis.js --show 144540017288

Output:

══════════════════════════════════════════════════════════════════════
STORED ANALYSIS
══════════════════════════════════════════════════════════════════════

Game ID: 144540017288
Fetched: 2024-10-21T08:15:32.123Z

White Accuracy: 87.3%
Black Accuracy: 73.2%

Blunders: 2
Mistakes: 4
Inaccuracies: 7

══════════════════════════════════════════════════════════════════════


════════════════════════════════════════════════════════════════════════

EXAMPLE 4: Querying accuracy trends
════════════════════════════════════════════════════════════════════════

Command:
  sqlite3 chess_games.db "
    SELECT 
      g.archive as month,
      AVG(CASE WHEN g.color = 'white' THEN ca.white_accuracy 
               ELSE ca.black_accuracy END) as my_accuracy,
      AVG(ca.blunders) as avg_blunders
    FROM games g
    JOIN chesscom_analysis ca ON g.game_id = ca.game_id
    GROUP BY g.archive
    ORDER BY g.archive DESC
    LIMIT 6
  "

Output:

month       my_accuracy  avg_blunders
----------  -----------  ------------
2024-10     85.7         1.2
2024-09     83.4         1.8
2024-08     81.2         2.1
2024-07     79.8         2.5
2024-06     78.3         2.7
2024-05     76.9         3.0

📈 You're improving! Accuracy up, blunders down!


════════════════════════════════════════════════════════════════════════

WHAT THE TOOL DOES:
════════════════════════════════════════════════════════════════════════

✅ Fetches Chess.com's official computer analysis
✅ Gets accuracy scores for both players
✅ Lists exact move numbers for blunders
✅ Provides mistake and inaccuracy counts
✅ Shows position evaluations throughout the game
✅ Saves everything to database for historical tracking
✅ Works with game URLs or game IDs from your database

REAL-WORLD USAGE:
════════════════════════════════════════════════════════════════════════

1. After playing games:
   node chesscom-analysis.js --recent 5

2. Deep dive on specific game:
   node chesscom-analysis.js 144540017288 --save
   node game-analyzer.js 144540017288

3. Track improvement:
   node chesscom-analysis.js --recent 50
   # Then query accuracy trends in SQL

4. Find your worst games:
   sqlite3 chess_games.db "
     SELECT g.game_id, g.url, ca.blunders, 
            CASE WHEN g.color='white' THEN ca.white_accuracy 
                 ELSE ca.black_accuracy END as my_acc
     FROM games g
     JOIN chesscom_analysis ca ON g.game_id = ca.game_id
     ORDER BY ca.blunders DESC
     LIMIT 10
   "


════════════════════════════════════════════════════════════════════════

KEY FEATURES:
════════════════════════════════════════════════════════════════════════

🎯 ACCURACY TRACKING
   See exactly how accurately you played each game (%)

❌ ERROR IDENTIFICATION  
   Know which moves were blunders/mistakes/inaccuracies

📊 HISTORICAL DATA
   Track improvement over time with database storage

📈 TREND ANALYSIS
   Query your data to find patterns and weaknesses

🔍 GAME REVIEW
   Combine with game-analyzer.js for complete analysis


════════════════════════════════════════════════════════════════════════

To use on your machine:
════════════════════════════════════════════════════════════════════════

1. Make sure you have your chess database:
   node chess-fetcher.js

2. Analyze recent games:
   node chesscom-analysis.js --recent 10

3. Track your progress:
   # Fetch regularly, then query trends
   sqlite3 chess_games.db "SELECT * FROM chesscom_analysis"

════════════════════════════════════════════════════════════════════════
`);

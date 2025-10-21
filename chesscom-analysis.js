#!/usr/bin/env node
// Chess.com Analysis Fetcher
// Fetches analysis data from Chess.com games

const https = require('https');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const { URL } = require('url');

const DB_PATH = './chess_games.db';

// ============ CHESS.COM ANALYSIS API ============

/**
 * Parse Chess.com game URL to extract game ID
 * Supports formats:
 * - https://www.chess.com/game/live/123456789
 * - https://www.chess.com/analysis/game/live/123456789
 * - https://www.chess.com/game/daily/123456789
 */
function parseGameUrl(url) {
  const match = url.match(/chess\.com\/(game|analysis\/game)\/(live|daily)\/(\d+)/);
  if (match) {
    return {
      type: match[2], // 'live' or 'daily'
      gameId: match[3]
    };
  }
  return null;
}

/**
 * Fetch game data from Chess.com public API
 */
async function fetchGameData(gameType, gameId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.chess.com/callback/live/game/${gameId}`;
    
    console.log(`Fetching game data from Chess.com API...`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Chess Analysis Tool)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error('Failed to parse game data'));
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch game analysis from Chess.com
 * This includes computer analysis results if available
 */
async function fetchGameAnalysis(gameType, gameId) {
  return new Promise((resolve, reject) => {
    // Try the analysis callback endpoint
    const url = `https://www.chess.com/callback/game/analysis/${gameId}`;
    
    console.log(`Fetching analysis data...`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Chess Analysis Tool)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            // Analysis might not be available
            resolve(null);
          }
        } else {
          resolve(null); // No analysis available
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Try to fetch insights/accuracy data
 */
async function fetchGameInsights(gameId) {
  return new Promise((resolve) => {
    const url = `https://www.chess.com/callback/insights/game/${gameId}`;
    
    console.log(`Fetching game insights...`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Chess Analysis Tool)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// ============ ANALYSIS PROCESSOR ============

function processAnalysisData(gameData, analysisData, insightsData) {
  const result = {
    gameInfo: null,
    analysis: null,
    insights: null,
    moves: [],
    evaluations: [],
    accuracy: null,
    blunders: [],
    mistakes: [],
    inaccuracies: []
  };

  // Process game data
  if (gameData && gameData.game) {
    const game = gameData.game;
    result.gameInfo = {
      id: game.id,
      url: game.url || `https://www.chess.com/game/live/${game.id}`,
      white: game.white?.username || 'Unknown',
      black: game.black?.username || 'Unknown',
      whiteRating: game.white?.rating,
      blackRating: game.black?.rating,
      result: game.result,
      timeControl: game.time_control,
      timeClass: game.time_class,
      rules: game.rules,
      endTime: game.end_time,
      pgn: game.pgn
    };
  }

  // Process analysis data
  if (analysisData) {
    if (analysisData.analysis) {
      result.analysis = analysisData.analysis;
      
      // Extract move evaluations if available
      if (analysisData.analysis.moves) {
        result.moves = analysisData.analysis.moves;
      }
      
      // Extract evaluations
      if (analysisData.analysis.evals) {
        result.evaluations = analysisData.analysis.evals;
      }
    }
  }

  // Process insights data (accuracy, classifications)
  if (insightsData) {
    if (insightsData.accuracy) {
      result.accuracy = {
        white: insightsData.accuracy.white,
        black: insightsData.accuracy.black
      };
    }
    
    if (insightsData.moveClassifications) {
      const classifications = insightsData.moveClassifications;
      
      // Extract blunders, mistakes, inaccuracies
      for (let i = 0; i < classifications.length; i++) {
        const classification = classifications[i];
        const moveNum = Math.floor(i / 2) + 1;
        const side = i % 2 === 0 ? 'White' : 'Black';
        
        if (classification === 'blunder') {
          result.blunders.push({ move: i, moveNum, side });
        } else if (classification === 'mistake') {
          result.mistakes.push({ move: i, moveNum, side });
        } else if (classification === 'inaccuracy') {
          result.inaccuracies.push({ move: i, moveNum, side });
        }
      }
    }
  }

  return result;
}

// ============ DISPLAY FUNCTIONS ============

function displayAnalysisReport(data) {
  console.log('\n' + '='.repeat(70));
  console.log('CHESS.COM ANALYSIS REPORT');
  console.log('='.repeat(70));

  if (data.gameInfo) {
    console.log('\n📋 GAME INFORMATION:');
    console.log(`  URL: ${data.gameInfo.url}`);
    console.log(`  White: ${data.gameInfo.white} (${data.gameInfo.whiteRating || 'N/A'})`);
    console.log(`  Black: ${data.gameInfo.black} (${data.gameInfo.blackRating || 'N/A'})`);
    console.log(`  Result: ${data.gameInfo.result || 'N/A'}`);
    console.log(`  Time Control: ${data.gameInfo.timeControl || 'N/A'}`);
  }

  if (data.accuracy) {
    console.log('\n🎯 ACCURACY:');
    console.log(`  White: ${data.accuracy.white ? data.accuracy.white.toFixed(1) + '%' : 'N/A'}`);
    console.log(`  Black: ${data.accuracy.black ? data.accuracy.black.toFixed(1) + '%' : 'N/A'}`);
  }

  console.log('\n❌ ERROR ANALYSIS:');
  console.log(`  Blunders: ${data.blunders.length}`);
  if (data.blunders.length > 0) {
    data.blunders.forEach(b => {
      console.log(`    Move ${b.moveNum} (${b.side})`);
    });
  }
  
  console.log(`  Mistakes: ${data.mistakes.length}`);
  if (data.mistakes.length > 0 && data.mistakes.length <= 5) {
    data.mistakes.forEach(m => {
      console.log(`    Move ${m.moveNum} (${m.side})`);
    });
  }
  
  console.log(`  Inaccuracies: ${data.inaccuracies.length}`);

  if (data.evaluations && data.evaluations.length > 0) {
    console.log('\n📊 POSITION EVALUATIONS:');
    console.log('  (First 10 positions)');
    
    for (let i = 0; i < Math.min(10, data.evaluations.length); i++) {
      const moveNum = Math.floor(i / 2) + 1;
      const side = i % 2 === 0 ? 'White' : 'Black';
      const eval = data.evaluations[i];
      
      if (eval) {
        console.log(`    ${moveNum}. ${side}: ${eval}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// ============ SAVE TO DATABASE ============

async function saveAnalysisToDatabase(gameId, analysisData) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create analysis table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS chesscom_analysis (
          game_id TEXT PRIMARY KEY,
          white_accuracy REAL,
          black_accuracy REAL,
          blunders INTEGER,
          mistakes INTEGER,
          inaccuracies INTEGER,
          evaluations TEXT,
          analysis_data TEXT,
          fetched_at TEXT
        )
      `, (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        // Insert or replace analysis
        db.run(`
          INSERT OR REPLACE INTO chesscom_analysis
          (game_id, white_accuracy, black_accuracy, blunders, mistakes, inaccuracies, 
           evaluations, analysis_data, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          gameId,
          analysisData.accuracy?.white || null,
          analysisData.accuracy?.black || null,
          analysisData.blunders.length,
          analysisData.mistakes.length,
          analysisData.inaccuracies.length,
          JSON.stringify(analysisData.evaluations || []),
          JSON.stringify(analysisData),
          new Date().toISOString()
        ], (err) => {
          db.close();
          if (err) reject(err);
          else {
            console.log(`✓ Analysis saved to database`);
            resolve();
          }
        });
      });
    });
  });
}

// ============ MAIN FUNCTIONS ============

async function analyzeGameUrl(url, saveToDb = false) {
  console.log(`\nAnalyzing game: ${url}\n`);

  const parsed = parseGameUrl(url);
  if (!parsed) {
    throw new Error('Invalid Chess.com game URL');
  }

  console.log(`Game Type: ${parsed.type}`);
  console.log(`Game ID: ${parsed.gameId}\n`);

  // Fetch all available data
  const [gameData, analysisData, insightsData] = await Promise.all([
    fetchGameData(parsed.type, parsed.gameId),
    fetchGameAnalysis(parsed.type, parsed.gameId),
    fetchGameInsights(parsed.gameId)
  ]);

  console.log('\n✓ Data fetched successfully\n');

  // Process the data
  const result = processAnalysisData(gameData, analysisData, insightsData);

  // Display the report
  displayAnalysisReport(result);

  // Save to database if requested
  if (saveToDb) {
    await saveAnalysisToDatabase(parsed.gameId, result);
  }

  return result;
}

async function analyzeGameFromDatabase(gameId, saveAnalysis = true) {
  return new Promise(async (resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.get('SELECT game_id, url FROM games WHERE game_id = ?', [gameId], async (err, row) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          reject(new Error(`Game ${gameId} not found in database`));
          return;
        }

        try {
          const result = await analyzeGameUrl(row.url, saveAnalysis);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function batchAnalyzeRecent(limit = 5, saveToDb = true) {
  return new Promise(async (resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(`
        SELECT game_id, url, end_date
        FROM games
        WHERE url IS NOT NULL
        ORDER BY end_timestamp DESC
        LIMIT ?
      `, [limit], async (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        console.log(`\nAnalyzing ${rows.length} recent games...\n`);

        const results = [];
        for (const row of rows) {
          console.log(`\nProcessing game ${row.game_id} from ${row.end_date}...`);
          
          try {
            const result = await analyzeGameUrl(row.url, saveToDb);
            results.push(result);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`Error analyzing game ${row.game_id}:`, error.message);
          }
        }

        console.log(`\n✓ Analyzed ${results.length} games`);
        resolve(results);
      });
    });
  });
}

async function showAnalysisFromDatabase(gameId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.get(`
        SELECT * FROM chesscom_analysis WHERE game_id = ?
      `, [gameId], (err, row) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          console.log(`No analysis found for game ${gameId}`);
          console.log(`Run: node chesscom-analysis.js ${gameId} --fetch`);
          resolve(null);
          return;
        }

        console.log('\n' + '='.repeat(70));
        console.log('STORED ANALYSIS');
        console.log('='.repeat(70));
        console.log(`\nGame ID: ${row.game_id}`);
        console.log(`Fetched: ${row.fetched_at}`);
        console.log(`\nWhite Accuracy: ${row.white_accuracy ? row.white_accuracy.toFixed(1) + '%' : 'N/A'}`);
        console.log(`Black Accuracy: ${row.black_accuracy ? row.black_accuracy.toFixed(1) + '%' : 'N/A'}`);
        console.log(`\nBlunders: ${row.blunders}`);
        console.log(`Mistakes: ${row.mistakes}`);
        console.log(`Inaccuracies: ${row.inaccuracies}`);
        console.log('\n' + '='.repeat(70) + '\n');

        resolve(row);
      });
    });
  });
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Chess.com Analysis Fetcher

Fetches game analysis, accuracy scores, and error classifications from Chess.com

Usage:
  node chesscom-analysis.js <url>                     Analyze game by URL
  node chesscom-analysis.js <game-id>                 Analyze game from database
  node chesscom-analysis.js --recent [N]              Analyze N recent games
  node chesscom-analysis.js --show <game-id>          Show stored analysis
  node chesscom-analysis.js --save                    Save analysis to database

Examples:
  node chesscom-analysis.js https://www.chess.com/game/live/123456789
  node chesscom-analysis.js https://www.chess.com/analysis/game/live/123456789
  node chesscom-analysis.js 123456789 --save
  node chesscom-analysis.js --recent 5
  node chesscom-analysis.js --show 123456789

Note: This fetches Chess.com's computer analysis when available.
      For games without analysis, only basic data is shown.
`);
    return;
  }

  const saveToDb = args.includes('--save');

  try {
    if (args.includes('--recent')) {
      const limit = args[args.indexOf('--recent') + 1] 
        ? parseInt(args[args.indexOf('--recent') + 1]) 
        : 5;
      await batchAnalyzeRecent(limit, saveToDb);
    }
    else if (args.includes('--show')) {
      const gameId = args[args.indexOf('--show') + 1];
      await showAnalysisFromDatabase(gameId);
    }
    else {
      const input = args[0];
      
      if (input.startsWith('http')) {
        // It's a URL
        await analyzeGameUrl(input, saveToDb);
      } else {
        // It's a game ID
        await analyzeGameFromDatabase(input, saveToDb);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeGameUrl,
  analyzeGameFromDatabase,
  batchAnalyzeRecent,
  parseGameUrl
};

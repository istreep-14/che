#!/usr/bin/env node
// Simple Stockfish PGN Analyzer
// Analyzes chess games and shows move statistics

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const DB_PATH = './chess_games.db';

// ============ PGN PARSER ============

function parsePGN(pgn) {
  if (!pgn) return { headers: {}, moves: [] };

  const headers = {};
  const headerRegex = /\[(\w+)\s+"([^"]+)"\]/g;
  let match;
  
  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }

  // Get moves section
  const lines = pgn.split('\n');
  let movesText = '';
  let inMoves = false;
  
  for (const line of lines) {
    if (line.trim() === '') {
      if (Object.keys(headers).length > 0) {
        inMoves = true;
      }
    } else if (inMoves) {
      movesText += ' ' + line;
    }
  }

  // Clean up moves
  movesText = movesText
    .replace(/\{[^}]*\}/g, '') // Remove comments in braces
    .replace(/\([^)]*\)/g, '') // Remove variations
    .replace(/\$\d+/g, '') // Remove NAGs
    .replace(/[!?]+/g, '') // Remove annotations
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // Remove result
    .replace(/\s+/g, ' ')
    .trim();

  // Extract moves
  const movePattern = /\d+\.\s*([a-h1-8NBRQKOx=+#-]+)\s*([a-h1-8NBRQKOx=+#-]+)?/g;
  const moves = [];
  
  while ((match = movePattern.exec(movesText)) !== null) {
    if (match[1]) moves.push(match[1]);
    if (match[2]) moves.push(match[2]);
  }

  return { headers, moves };
}

// ============ MOVE ANALYZER ============

function analyzeMoves(moves) {
  const stats = {
    totalMoves: moves.length,
    captures: 0,
    checks: 0,
    checkmates: 0,
    castles: 0,
    pawnMoves: 0,
    pieceMoves: 0,
    queenMoves: 0,
    rookMoves: 0,
    bishopMoves: 0,
    knightMoves: 0,
    kingMoves: 0,
    promotions: 0,
    whiteMoves: [],
    blackMoves: []
  };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const side = i % 2 === 0 ? 'white' : 'black';
    
    if (side === 'white') {
      stats.whiteMoves.push(move);
    } else {
      stats.blackMoves.push(move);
    }

    // Count features
    if (move.includes('x')) stats.captures++;
    if (move.includes('+')) stats.checks++;
    if (move.includes('#')) stats.checkmates++;
    if (move.includes('O-O')) stats.castles++;
    if (move.includes('=')) stats.promotions++;
    
    // Piece identification
    if (/^[a-h]/.test(move)) stats.pawnMoves++;
    else if (move.startsWith('N')) stats.knightMoves++;
    else if (move.startsWith('B')) stats.bishopMoves++;
    else if (move.startsWith('R')) stats.rookMoves++;
    else if (move.startsWith('Q')) stats.queenMoves++;
    else if (move.startsWith('K')) stats.kingMoves++;
  }

  stats.pieceMoves = stats.knightMoves + stats.bishopMoves + 
                     stats.rookMoves + stats.queenMoves + stats.kingMoves;

  return stats;
}

// ============ DISPLAY GAME ANALYSIS ============

function displayGameAnalysis(pgn, myColor = null) {
  const { headers, moves } = parsePGN(pgn);
  const stats = analyzeMoves(moves);
  
  console.log('\n' + '='.repeat(70));
  console.log('GAME ANALYSIS');
  console.log('='.repeat(70));
  
  console.log('\n📋 GAME INFORMATION:');
  console.log(`  White: ${headers.White || 'Unknown'}`);
  console.log(`  Black: ${headers.Black || 'Unknown'}`);
  console.log(`  Result: ${headers.Result || 'Unknown'}`);
  console.log(`  Date: ${headers.Date || 'Unknown'}`);
  if (headers.Event) console.log(`  Event: ${headers.Event}`);
  if (headers.ECO) console.log(`  ECO: ${headers.ECO}`);
  if (headers.Opening) console.log(`  Opening: ${headers.Opening}`);
  
  console.log('\n📊 GAME STATISTICS:');
  console.log(`  Total moves: ${stats.totalMoves} (${Math.ceil(stats.totalMoves / 2)} full moves)`);
  console.log(`  Captures: ${stats.captures}`);
  console.log(`  Checks: ${stats.checks}`);
  console.log(`  Checkmates: ${stats.checkmates}`);
  console.log(`  Castles: ${stats.castles}`);
  console.log(`  Promotions: ${stats.promotions}`);
  
  console.log('\n♟️  PIECE ACTIVITY:');
  console.log(`  Pawn moves: ${stats.pawnMoves} (${(stats.pawnMoves/stats.totalMoves*100).toFixed(1)}%)`);
  console.log(`  Knight moves: ${stats.knightMoves} (${(stats.knightMoves/stats.totalMoves*100).toFixed(1)}%)`);
  console.log(`  Bishop moves: ${stats.bishopMoves} (${(stats.bishopMoves/stats.totalMoves*100).toFixed(1)}%)`);
  console.log(`  Rook moves: ${stats.rookMoves} (${(stats.rookMoves/stats.totalMoves*100).toFixed(1)}%)`);
  console.log(`  Queen moves: ${stats.queenMoves} (${(stats.queenMoves/stats.totalMoves*100).toFixed(1)}%)`);
  console.log(`  King moves: ${stats.kingMoves} (${(stats.kingMoves/stats.totalMoves*100).toFixed(1)}%)`);
  
  console.log('\n📝 GAME MOVES:');
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = moves[i] || '';
    const blackMove = moves[i + 1] || '';
    
    let line = `  ${moveNum}. ${whiteMove.padEnd(10)}`;
    if (blackMove) {
      line += blackMove;
    }
    console.log(line);
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  return { headers, moves, stats };
}

// ============ DATABASE FUNCTIONS ============

async function analyzeFromDatabase(gameId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.get(`
        SELECT game_id, pgn, url, end_date, color, opponent, 
               outcome, my_rating, opp_rating, opening_name, format,
               plies, duration
        FROM games 
        WHERE game_id = ?
      `, [gameId], (err, row) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          reject(new Error(`Game ${gameId} not found in database`));
          return;
        }

        console.log('\n' + '='.repeat(70));
        console.log(`GAME ${gameId} - ${row.format.toUpperCase()}`);
        console.log('='.repeat(70));
        console.log(`🔗 URL: ${row.url}`);
        console.log(`📅 Date: ${row.end_date}`);
        console.log(`⏱️  Duration: ${row.duration || 'Unknown'}`);
        console.log(`🎯 You: ${row.color} (${row.my_rating})`);
        console.log(`👤 Opponent: ${row.opponent} (${row.opp_rating})`);
        console.log(`📊 Result: ${row.outcome.toUpperCase()}`);
        console.log(`📖 Opening: ${row.opening_name || 'Unknown'}`);
        console.log(`🔢 Plies: ${row.plies}`);

        const result = displayGameAnalysis(row.pgn, row.color);
        resolve({ ...result, gameInfo: row });
      });
    });
  });
}

async function listRecentGames(limit = 20) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(`
        SELECT game_id, end_date, format, color, outcome,
               my_rating, opp_rating, opponent, opening_name, plies
        FROM games
        ORDER BY end_timestamp DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        console.log(`\n📋 RECENT GAMES (last ${limit}):\n`);
        console.table(rows);
        console.log(`\n💡 To analyze a game, run: node game-analyzer.js <game_id>\n`);
        
        resolve(rows);
      });
    });
  });
}

async function analyzeRecentGames(limit = 3) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(`
        SELECT game_id
        FROM games
        WHERE pgn IS NOT NULL
        ORDER BY end_timestamp DESC
        LIMIT ?
      `, [limit], async (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        console.log(`\nAnalyzing ${rows.length} most recent games...\n`);

        const results = [];
        for (const row of rows) {
          try {
            const result = await analyzeFromDatabase(row.game_id);
            results.push(result);
          } catch (error) {
            console.error(`Error analyzing game ${row.game_id}:`, error.message);
          }
        }

        resolve(results);
      });
    });
  });
}

async function searchGames(criteria) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      let query = 'SELECT game_id, end_date, format, color, outcome, my_rating, opp_rating, opponent, opening_name FROM games WHERE 1=1';
      const params = [];

      if (criteria.opening) {
        query += ' AND opening_name LIKE ?';
        params.push(`%${criteria.opening}%`);
      }
      if (criteria.opponent) {
        query += ' AND opponent LIKE ?';
        params.push(`%${criteria.opponent}%`);
      }
      if (criteria.outcome) {
        query += ' AND outcome = ?';
        params.push(criteria.outcome);
      }
      if (criteria.format) {
        query += ' AND format = ?';
        params.push(criteria.format);
      }
      if (criteria.minRating) {
        query += ' AND my_rating >= ?';
        params.push(criteria.minRating);
      }

      query += ' ORDER BY end_timestamp DESC LIMIT 50';

      db.all(query, params, (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }

        console.log(`\n🔍 Found ${rows.length} games matching criteria:\n`);
        console.table(rows);
        
        resolve(rows);
      });
    });
  });
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎯 Chess Game Analyzer

Usage:
  node game-analyzer.js <game-id>              Analyze specific game
  node game-analyzer.js --recent [N]           Analyze N recent games (default: 3)
  node game-analyzer.js --list [N]             List N recent games (default: 20)
  node game-analyzer.js --pgn <file>           Analyze PGN file
  node game-analyzer.js --search               Search games (interactive)

Search options:
  --opening <name>                             Filter by opening name
  --opponent <name>                            Filter by opponent
  --outcome <win|loss|draw>                    Filter by outcome
  --format <bullet|blitz|rapid|daily>          Filter by format
  --min-rating <N>                             Filter by minimum rating

Examples:
  node game-analyzer.js --list                      # List recent games
  node game-analyzer.js 12345678                    # Analyze game by ID
  node game-analyzer.js --recent 5                  # Analyze 5 most recent
  node game-analyzer.js --pgn game.pgn              # Analyze PGN file
  node game-analyzer.js --opening "Sicilian"        # Find Sicilian games
  node game-analyzer.js --opponent "magnus"         # Find games vs opponent
  node game-analyzer.js --outcome win --format blitz  # Find blitz wins
`);
    return;
  }

  try {
    if (args.includes('--list')) {
      const limit = args[args.indexOf('--list') + 1] 
        ? parseInt(args[args.indexOf('--list') + 1]) 
        : 20;
      await listRecentGames(limit);
    } 
    else if (args.includes('--recent')) {
      const limit = args[args.indexOf('--recent') + 1]
        ? parseInt(args[args.indexOf('--recent') + 1])
        : 3;
      await analyzeRecentGames(limit);
    }
    else if (args.includes('--pgn')) {
      const pgnFile = args[args.indexOf('--pgn') + 1];
      if (!fs.existsSync(pgnFile)) {
        console.error(`❌ Error: File ${pgnFile} not found`);
        process.exit(1);
      }
      const pgn = fs.readFileSync(pgnFile, 'utf8');
      displayGameAnalysis(pgn);
    }
    else if (args.includes('--opening') || args.includes('--opponent') || 
             args.includes('--outcome') || args.includes('--format') ||
             args.includes('--min-rating')) {
      const criteria = {};
      
      if (args.includes('--opening')) {
        criteria.opening = args[args.indexOf('--opening') + 1];
      }
      if (args.includes('--opponent')) {
        criteria.opponent = args[args.indexOf('--opponent') + 1];
      }
      if (args.includes('--outcome')) {
        criteria.outcome = args[args.indexOf('--outcome') + 1];
      }
      if (args.includes('--format')) {
        criteria.format = args[args.indexOf('--format') + 1];
      }
      if (args.includes('--min-rating')) {
        criteria.minRating = parseInt(args[args.indexOf('--min-rating') + 1]);
      }
      
      await searchGames(criteria);
    }
    else {
      // Assume it's a game ID
      const gameId = args[0];
      await analyzeFromDatabase(gameId);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  displayGameAnalysis,
  analyzeFromDatabase,
  listRecentGames,
  searchGames
};

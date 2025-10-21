// Chess.com Game Fetcher
// Fetches games from Chess.com API and stores them in SQLite database

const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configuration
const USERNAME = 'frankscobey'; // Replace with your Chess.com username
const DB_PATH = './chess_games.db';
const OPENINGS_DB_PATH = './openings.db'; // Path to your openings database
const RATE_LIMIT_DELAY = 100; // ms between requests to respect API limits

// Openings database cache
let openingsCache = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let lastCacheTime = null;

// Result mapping
const RESULT_MAP = {
  'win': 'Win',
  'checkmated': 'Loss',
  'agreed': 'Draw',
  'repetition': 'Draw',
  'timeout': 'Loss',
  'resigned': 'Loss',
  'stalemate': 'Draw',
  'lose': 'Loss',
  'insufficient': 'Draw',
  '50move': 'Draw',
  'abandoned': 'Loss',
  'kingofthehill': 'Loss',
  'threecheck': 'Loss',
  'timevsinsufficient': 'Draw',
  'bughousepartnerlose': 'Loss'
};

// ===== GAME FORMAT DETECTION (synced with setup.gs) =====
function getGameFormat(game) {
  const rules = (game.rules || 'chess').toLowerCase();
  let timeClass = (game.time_class || '').toLowerCase();
  
  // Handle Chess960
  if (rules === 'chess960') {
    return timeClass === 'daily' ? 'daily960' : 'live960';
  }
  
  // Handle other variants
  if (rules !== 'chess') {
    return rules;
  }
  
  // Standard chess - use time class if valid
  if (['bullet', 'blitz', 'rapid', 'daily'].includes(timeClass)) {
    return timeClass;
  }
  
  // Fallback: calculate from time control
  const tc = game.time_control || '';
  const match = tc.match(/(\d+)\+(\d+)/);
  
  if (!match) return timeClass || 'unknown';
  
  const base = parseInt(match[1]);
  const inc = parseInt(match[2]);
  const estimated = base + 40 * inc;
  
  if (estimated < 180) return 'bullet';
  if (estimated < 600) return 'blitz';
  return 'rapid';
}

// ===== PARSE TIME CONTROL (FIXED - synced with helper.gs) =====
function parseTimeControl(timeControl, timeClass) {
  if (!timeControl) {
    return { baseTime: null, increment: null, correspondenceTime: null };
  }
  
  const tcStr = String(timeControl).trim();
  
  // Daily/correspondence format (1/86400 or just number for days)
  if (timeClass === 'daily' || tcStr.includes('/')) {
    // Format: "1/86400" means 1 day = 86400 seconds
    if (tcStr.includes('/')) {
      const parts = tcStr.split('/');
      if (parts.length === 2) {
        const days = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return {
          baseTime: 0,
          increment: 0,
          correspondenceTime: seconds
        };
      }
    }
    // Just a number - treat as days and convert to seconds
    const days = parseInt(tcStr) || 0;
    return {
      baseTime: 0,
      increment: 0,
      correspondenceTime: days * 86400
    };
  }
  
  // Live format with increment (180+0, 600+5, etc.)
  if (tcStr.includes('+')) {
    const parts = tcStr.split('+');
    if (parts.length === 2) {
      return {
        baseTime: parseInt(parts[0]) || 0,
        increment: parseInt(parts[1]) || 0,
        correspondenceTime: null
      };
    }
  }
  
  // Simple live format - just base time, no increment (60, 180, etc.)
  const baseOnly = parseInt(tcStr);
  if (!isNaN(baseOnly)) {
    return {
      baseTime: baseOnly,
      increment: 0,
      correspondenceTime: null
    };
  }
  
  return { baseTime: null, increment: null, correspondenceTime: null };
}

// ===== EXTRACT ECO CODE FROM PGN (synced with helper.gs) =====
function extractECOCodeFromPGN(pgn) {
  if (!pgn) return '';
  
  const match = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  return match ? match[1] : '';
}

// ===== EXTRACT ECO URL FROM PGN (synced with helper.gs) =====
function extractECOFromPGN(pgn) {
  if (!pgn) return '';
  
  const match = pgn.match(/\[ECOUrl\s+"([^"]+)"\]/);
  return match ? match[1] : '';
}

// ===== EXTRACT DURATION FROM PGN (synced with helper.gs) =====
function extractDurationFromPGN(pgn) {
  if (!pgn) return null;
  
  try {
    const startDateMatch = pgn.match(/\[UTCDate\s+"([^"]+)"\]/);
    const startTimeMatch = pgn.match(/\[UTCTime\s+"([^"]+)"\]/);
    const endDateMatch = pgn.match(/\[EndDate\s+"([^"]+)"\]/);
    const endTimeMatch = pgn.match(/\[EndTime\s+"([^"]+)"\]/);
    
    if (!startDateMatch || !startTimeMatch || !endDateMatch || !endTimeMatch) {
      return null;
    }
    
    const startDate = parseUTCDateTime(startDateMatch[1], startTimeMatch[1]);
    const endDate = parseUTCDateTime(endDateMatch[1], endTimeMatch[1]);
    
    if (!startDate || !endDate) return null;
    
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.floor(durationMs / 1000);
  } catch (error) {
    console.error(`Error parsing duration: ${error.message}`);
    return null;
  }
}

// ===== CALCULATE START TIME FROM END - DURATION (synced with helper.gs) =====
function calculateStartFromEnd(endDate, durationSeconds) {
  if (!endDate || !durationSeconds || durationSeconds <= 0) {
    return null;
  }
  
  return new Date(endDate.getTime() - (durationSeconds * 1000));
}

// Helper function to parse UTC date/time
function parseUTCDateTime(dateStr, timeStr) {
  try {
    const dateParts = dateStr.split('.');
    const timeParts = timeStr.split(':');
    
    if (dateParts.length === 3 && timeParts.length === 3) {
      const [year, month, day] = dateParts.map(p => parseInt(p));
      const [hour, minute, second] = timeParts.map(p => parseInt(p));
      
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }
  } catch (error) {
    console.error(`Error parsing date/time: ${error.message}`);
  }
  return null;
}

// ===== GET GAME OUTCOME (synced with helper.gs) =====
function getGameOutcome(game, username) {
  if (!game.white || !game.black) return 'unknown';
  
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const myResult = isWhite ? game.white.result : game.black.result;
  
  // Win conditions
  if (myResult === 'win') return 'win';
  if (['checkmated', 'resigned', 'timeout', 'abandoned'].includes(myResult)) return 'loss';
  
  // Draw conditions
  if (['agreed', 'stalemate', 'repetition', 'insufficient', 'timevsinsufficient', '50move'].includes(myResult)) {
    return 'draw';
  }
  
  return 'unknown';
}

// ===== GET GAME TERMINATION (synced with helper.gs - FIXED VERSION) =====
function getGameTermination(game, username) {
  if (!game.white || !game.black) return 'unknown';
  
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const myResult = isWhite ? game.white.result : game.black.result;
  const oppResult = isWhite ? game.black.result : game.white.result;
  
  // FIX: If I won, use opponent's result for termination
  if (myResult === 'win') {
    return oppResult || 'win';
  }
  
  // Otherwise use my result
  return myResult || 'unknown';
}

// ===== PARSE MOVES AND CLOCKS (enhanced version) =====
function parseMovesAndClocks(pgn) {
  if (!pgn) return { moves: null, plies: 0, totalMoves: 0 };
  
  try {
    // Extract move section (after headers, before result)
    const moveSection = pgn.split(/\n\n/)[1] || '';
    
    // Count plies (individual moves)
    const moves = moveSection.match(/\d+\.\s+\S+(\s+\S+)?/g) || [];
    const plyCount = moves.reduce((count, move) => {
      const plies = move.match(/\S+/g).length - 1;  // -1 for move number
      return count + plies;
    }, 0);
    
    // Extract moves with clocks
    const movePattern = /([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?|O-O(?:-O)?)\s*\{?\[%clk\s+(\d+):(\d+):(\d+)(?:\.(\d+))?\]?\}?/g;
    const movesData = [];
    let match;
    
    while ((match = movePattern.exec(moveSection)) !== null) {
      const move = match[1];
      const hours = parseInt(match[2]) || 0;
      const minutes = parseInt(match[3]) || 0;
      const seconds = parseInt(match[4]) || 0;
      const deciseconds = parseInt(match[5]) || 0;
      
      const clockSeconds = hours * 3600 + minutes * 60 + seconds + deciseconds / 10;
      
      movesData.push({
        move: move,
        clock: clockSeconds
      });
    }
    
    return {
      moves: JSON.stringify(movesData),
      plies: plyCount,
      totalMoves: Math.ceil(plyCount / 2)
    };
  } catch (error) {
    console.error(`Error parsing moves: ${error.message}`);
    return { moves: null, plies: 0, totalMoves: 0 };
  }
}

// ===== FORMAT DURATION (synced with helper.gs) =====
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ===== OPENINGS DATABASE FUNCTIONS (synced with opening.gs) =====

/**
 * Split ECO URL into base slug and extra moves
 */
function splitEcoUrl(ecoUrl) {
  if (!ecoUrl || !ecoUrl.includes('chess.com/openings/')) {
    return { baseSlug: '', extraMoves: '' };
  }
  
  const fullSlug = ecoUrl.split('/openings/')[1] || '';
  if (!fullSlug) return { baseSlug: '', extraMoves: '' };
  
  let slug = fullSlug;
  const withPatterns = [];
  
  // Protect "with-NUMBER-MOVE" patterns (these are part of opening names)
  slug = slug.replace(/with-(\d+)-(O-O(?:-O)?|[a-zA-Z0-9]+)(?:-and-(\d+)-(O-O(?:-O)?|[a-zA-Z0-9]+))?/g, (match) => {
    const placeholder = `__WITH_${withPatterns.length}__`;
    withPatterns.push(match);
    return placeholder;
  });
  
  // Find first move sequence: -3...Nf6 or -4.g3 or ...8.Nf3
  const movePattern = /(-\d+\.{0,3}[a-zA-Z]|\.{3}\d+\.|\.{3}[a-zA-Z])/;
  const moveMatch = slug.match(movePattern);
  
  let baseSlug, extraMoves;
  if (moveMatch) {
    baseSlug = slug.substring(0, moveMatch.index);
    extraMoves = slug.substring(moveMatch.index);
  } else {
    baseSlug = slug;
    extraMoves = '';
  }
  
  // Restore "with" patterns
  withPatterns.forEach((pattern, i) => {
    baseSlug = baseSlug.replace(`__WITH_${i}__`, pattern);
  });
  
  return { 
    baseSlug: baseSlug.toLowerCase(), 
    extraMoves 
  };
}

/**
 * Format extra moves from slug to PGN notation
 */
function formatExtraMoves(extraMovesSlug) {
  if (!extraMovesSlug || extraMovesSlug.trim() === '') {
    return '';
  }
  
  let slug = extraMovesSlug.trim();
  slug = slug.replace(/^[-\.]+/, '');
  if (!slug) return '';
  
  const tokens = slug.split('-').filter(Boolean);
  if (tokens.length === 0) return '';
  
  const moves = [];
  let i = 0;
  
  while (i < tokens.length) {
    const token = tokens[i];
    const moveNumMatch = token.match(/^(\d+)(\.{0,3})$/);
    
    if (moveNumMatch) {
      const num = moveNumMatch[1];
      const dots = moveNumMatch[2];
      
      if (dots === '...') {
        moves.push(`${num}...`);
        i++;
        if (i < tokens.length && !tokens[i].match(/^\d+\.{0,3}$/)) {
          moves.push(tokens[i]);
          i++;
        }
      } else {
        moves.push(`${num}.`);
        i++;
        if (i < tokens.length && !tokens[i].match(/^\d+\.{0,3}$/)) {
          moves.push(tokens[i]);
          i++;
          if (i < tokens.length && !tokens[i].match(/^\d+\.{0,3}$/)) {
            moves.push(tokens[i]);
            i++;
          }
        }
      }
    } else {
      moves.push(token);
      i++;
    }
  }
  
  return moves.join(' ');
}

/**
 * Load openings database (with caching)
 */
async function loadOpeningsDb() {
  const now = Date.now();
  
  // Return cache if valid
  if (openingsCache && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION_MS) {
    return openingsCache;
  }
  
  const cache = new Map();
  
  // Check if openings database exists
  if (!fs.existsSync(OPENINGS_DB_PATH)) {
    console.log('Openings database not found, skipping opening enrichment');
    openingsCache = cache;
    lastCacheTime = now;
    return cache;
  }
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(OPENINGS_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error opening openings database:', err.message);
        openingsCache = cache;
        lastCacheTime = now;
        resolve(cache);
        return;
      }
      
      db.all('SELECT * FROM openings', (err, rows) => {
        if (err) {
          console.error('Error reading openings:', err.message);
          db.close();
          openingsCache = cache;
          lastCacheTime = now;
          resolve(cache);
          return;
        }
        
        for (const row of rows) {
          const trimSlug = String(row.trim_slug || '').trim().toLowerCase();
          if (!trimSlug) continue;
          
          cache.set(trimSlug, {
            fullName: String(row.full_name || ''),
            slug: trimSlug,
            family: String(row.family || ''),
            baseName: String(row.base_name || ''),
            var1: String(row.variation_1 || ''),
            var2: String(row.variation_2 || ''),
            var3: String(row.variation_3 || ''),
            var4: String(row.variation_4 || ''),
            var5: String(row.variation_5 || ''),
            var6: String(row.variation_6 || '')
          });
        }
        
        db.close();
        openingsCache = cache;
        lastCacheTime = now;
        console.log(`Loaded ${cache.size} openings from database`);
        resolve(cache);
      });
    });
  });
}

/**
 * Lookup opening in database with fallback logic
 */
function lookupOpening(db, slug) {
  // Try direct match
  if (db.has(slug)) {
    return db.get(slug);
  }
  
  // Try without "with-" suffix
  const withoutWith = slug.split('-with-')[0];
  if (withoutWith && withoutWith !== slug && db.has(withoutWith)) {
    return db.get(withoutWith);
  }
  
  // Not found - return empty
  return null;
}

/**
 * Get opening data for game
 */
async function getOpeningDataForGame(ecoUrl) {
  const empty = {
    openingName: '',
    openingSlug: '',
    openingFamily: '',
    openingBase: '',
    var1: '',
    var2: '',
    var3: '',
    var4: '',
    var5: '',
    var6: '',
    extraMoves: ''
  };
  
  if (!ecoUrl) return empty;
  
  // Split URL into base slug + extra moves
  const { baseSlug, extraMoves } = splitEcoUrl(ecoUrl);
  if (!baseSlug) return empty;
  
  // Load database (cached)
  const db = await loadOpeningsDb();
  
  // Lookup in database
  const opening = lookupOpening(db, baseSlug);
  
  if (!opening) {
    return {
      ...empty,
      openingSlug: baseSlug,
      extraMoves: formatExtraMoves(extraMoves)
    };
  }
  
  return {
    openingName: opening.fullName,
    openingSlug: opening.slug,
    openingFamily: opening.family,
    openingBase: opening.baseName,
    var1: opening.var1,
    var2: opening.var2,
    var3: opening.var3,
    var4: opening.var4,
    var5: opening.var5,
    var6: opening.var6,
    extraMoves: formatExtraMoves(extraMoves)
  };
}

// ===== INITIALIZE DATABASE WITH PROPER DATA TYPES =====
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else {
        db.run(`
          CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            type TEXT,
            url TEXT,
            pgn TEXT,
            
            -- Dates & Times
            start_datetime TEXT,
            start_date TEXT,
            start_time TEXT,
            start_epoch INTEGER,
            end_datetime TEXT,
            end_date TEXT,
            end_time TEXT,
            end_epoch INTEGER,
            archive TEXT,
            
            -- Game Details
            rules TEXT,
            is_live INTEGER,
            time_class TEXT,
            format TEXT,
            rated INTEGER,
            time_control TEXT,
            base_time INTEGER,
            increment INTEGER,
            correspondence_time INTEGER,
            duration TEXT,
            duration_seconds INTEGER,
            
            -- Players
            color TEXT,
            opponent TEXT,
            
            -- Ratings
            my_rating INTEGER,
            opp_rating INTEGER,
            rating_before INTEGER,
            rating_delta INTEGER,
            
            -- Result
            outcome TEXT,
            termination TEXT,
            
            -- Opening
            eco TEXT,
            eco_url TEXT,
            opening_name TEXT,
            opening_slug TEXT,
            opening_family TEXT,
            opening_base TEXT,
            variation_1 TEXT,
            variation_2 TEXT,
            variation_3 TEXT,
            variation_4 TEXT,
            variation_5 TEXT,
            variation_6 TEXT,
            extra_moves TEXT,
            
            -- Move Data
            moves_count INTEGER,
            plies INTEGER,
            tcn TEXT,
            moves_data TEXT,
            
            -- Metadata
            fetch_date TEXT,
            last_updated TEXT,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('✓ Games table created/verified');
            resolve(db);
          }
        });
      }
    });
  });
}

/**
 * Initialize openings database schema
 * Call this once to set up the openings database
 */
function initOpeningsDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(OPENINGS_DB_PATH, (err) => {
      if (err) reject(err);
      else {
        db.run(`
          CREATE TABLE IF NOT EXISTS openings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            trim_slug TEXT UNIQUE,
            family TEXT,
            base_name TEXT,
            variation_1 TEXT,
            variation_2 TEXT,
            variation_3 TEXT,
            variation_4 TEXT,
            variation_5 TEXT,
            variation_6 TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('✓ Openings table created');
            db.close();
            resolve();
          }
        });
      }
    });
  });
}

// ===== RATINGS TRACKER (synced with callback.gs) =====
class RatingsTracker {
  constructor() {
    this.ledger = {};
    this.loaded = false;
  }
  
  async loadFromDatabase(db) {
    if (this.loaded) return;
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT format, my_rating FROM games WHERE my_rating IS NOT NULL ORDER BY end_epoch ASC',
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          const formatLastRating = {};
          for (const row of rows) {
            if (row.format && row.my_rating) {
              formatLastRating[row.format] = row.my_rating;
            }
          }
          
          this.ledger = formatLastRating;
          this.loaded = true;
          console.log('Loaded ratings ledger:', this.ledger);
          resolve();
        }
      );
    });
  }
  
  calculateRating(format, currentRating) {
    const ratingBefore = this.ledger[format] || null;
    const ratingDelta = (ratingBefore !== null && currentRating !== null) 
      ? (currentRating - ratingBefore) 
      : null;
    
    if (currentRating !== null) {
      this.ledger[format] = currentRating;
    }
    
    return {
      before: ratingBefore,
      delta: ratingDelta
    };
  }
}

// ===== INSERT GAME WITH FULL DATA (synced with fetch.gs) =====
async function insertGame(db, game, myUsername, ratingsTracker) {
  return new Promise(async (resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO games (
        game_id, type, url, pgn,
        start_datetime, start_date, start_time, start_epoch,
        end_datetime, end_date, end_time, end_epoch, archive,
        rules, is_live, time_class, format, rated, time_control, base_time, increment, correspondence_time,
        duration, duration_seconds,
        color, opponent,
        my_rating, opp_rating, rating_before, rating_delta,
        outcome, termination,
        eco, eco_url, opening_name, opening_slug, opening_family, opening_base,
        variation_1, variation_2, variation_3, variation_4, variation_5, variation_6, extra_moves,
        moves_count, plies, tcn, moves_data,
        fetch_date, last_updated
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    try {
      const gameId = game.url.split('/').pop();
      const gameType = (game.time_class || '').toLowerCase() === 'daily' ? 'daily' : 'live';
      const endDate = new Date(game.end_time * 1000);
      const archive = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Extract duration and calculate start time
      const duration = extractDurationFromPGN(game.pgn);
      const startDate = calculateStartFromEnd(endDate, duration);
      
      // Determine player info
      const isWhite = game.white?.username.toLowerCase() === myUsername.toLowerCase();
      const color = isWhite ? 'white' : 'black';
      const opponent = (isWhite ? game.black?.username : game.white?.username || '').toLowerCase();
      const myRating = isWhite ? game.white?.rating : game.black?.rating;
      const oppRating = isWhite ? game.black?.rating : game.white?.rating;
      
      // Game details
      const rules = (game.rules || 'chess').toLowerCase();
      const isLive = gameType === 'live';
      const timeClass = (game.time_class || '').toLowerCase();
      const format = getGameFormat(game).toLowerCase();
      const rated = game.rated || false;
      
      // Time control - FIXED
      const tcParsed = parseTimeControl(game.time_control, game.time_class);
      
      // Calculate ratings using tracker
      const ratings = ratingsTracker.calculateRating(format, myRating);
      
      // Get outcome and termination
      const outcome = getGameOutcome(game, myUsername).toLowerCase();
      const termination = getGameTermination(game, myUsername).toLowerCase();
      
      // Extract opening details
      const ecoCode = extractECOCodeFromPGN(game.pgn) || '';
      const ecoUrl = extractECOFromPGN(game.pgn) || '';
      
      // Get opening data from database
      const openingData = await getOpeningDataForGame(ecoUrl);
      
      // Move data
      const moveData = parseMovesAndClocks(game.pgn);
      
      const now = new Date().toISOString();

      stmt.run(
        gameId,
        gameType,
        game.url,
        game.pgn || '',
        
        // Dates & Times
        startDate ? startDate.toISOString() : null,
        startDate ? startDate.toISOString().split('T')[0] : null,
        startDate ? startDate.toISOString().split('T')[1].split('.')[0] : null,
        startDate ? Math.floor(startDate.getTime() / 1000) : null,
        endDate.toISOString(),
        endDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[1].split('.')[0],
        game.end_time,
        archive,
        
        // Game Details
        rules,
        isLive ? 1 : 0,
        timeClass,
        format,
        rated ? 1 : 0,
        game.time_control || '',
        tcParsed.baseTime,
        tcParsed.increment,
        tcParsed.correspondenceTime,
        duration ? formatDuration(duration) : null,
        duration || 0,
        
        // Players
        color,
        opponent,
        
        // Ratings
        myRating,
        oppRating,
        ratings.before,
        ratings.delta,
        
        // Result
        outcome,
        termination,
        
        // Opening
        ecoCode,
        ecoUrl,
        openingData.openingName,
        openingData.openingSlug,
        openingData.openingFamily,
        openingData.openingBase,
        openingData.var1,
        openingData.var2,
        openingData.var3,
        openingData.var4,
        openingData.var5,
        openingData.var6,
        openingData.extraMoves,
        
        // Move Data
        moveData.totalMoves,
        moveData.plies,
        game.tcn || '',
        moveData.moves,
        
        // Metadata
        now,
        now,
        
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    } catch (error) {
      reject(error);
    }

    stmt.finalize();
  });
}

// Fetch data from Chess.com API
function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'ChessGameFetcher/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API returned status ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Get list of available archives (months with games)
async function getArchives(username) {
  const url = `https://api.chess.com/pub/player/${username}/games/archives`;
  const data = await fetchAPI(url);
  return data.archives;
}

// Fetch games from a specific archive
async function getArchiveGames(archiveUrl) {
  const data = await fetchAPI(archiveUrl);
  return data.games;
}

// Delay helper for rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  console.log(`Starting Chess.com game fetch for user: ${USERNAME}\n`);
  
  let db;
  try {
    // Initialize database
    db = await initDatabase();
    console.log('✓ Database initialized');
    
    // Initialize ratings tracker
    const ratingsTracker = new RatingsTracker();
    await ratingsTracker.loadFromDatabase(db);
    console.log('✓ Ratings tracker loaded');

    // Get all archives
    console.log('Fetching archive list...');
    const archives = await getArchives(USERNAME);
    console.log(`✓ Found ${archives.length} archives\n`);

    let totalGames = 0;
    let newGames = 0;

    // Process each archive
    for (let i = 0; i < archives.length; i++) {
      const archive = archives[i];
      const month = archive.split('/').slice(-2).join('/');
      
      console.log(`[${i + 1}/${archives.length}] Processing ${month}...`);
      
      await delay(RATE_LIMIT_DELAY);
      const games = await getArchiveGames(archive);
      
      // Sort games by end time to maintain chronological order
      games.sort((a, b) => a.end_time - b.end_time);
      
      // Insert each game
      for (const game of games) {
        try {
          await insertGame(db, game, USERNAME, ratingsTracker);
          newGames++;
        } catch (err) {
          // Game already exists (PRIMARY KEY constraint)
          if (!err.message.includes('UNIQUE constraint')) {
            console.error(`Error inserting game: ${err.message}`);
          }
        }
        totalGames++;
      }
      
      console.log(`  → ${games.length} games processed`);
    }

    console.log(`\n✓ Complete! Processed ${totalGames} games (${newGames} new)`);
    console.log(`Database saved to: ${DB_PATH}`);

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  initDatabase, 
  initOpeningsDatabase,
  getArchives, 
  getArchiveGames, 
  insertGame, 
  RatingsTracker,
  getOpeningDataForGame
};
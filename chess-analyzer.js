// Chess Game Analyzer
// Comprehensive analysis tools for your chess database

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const DB_PATH = './chess_games.db';

// ============ ANALYSIS FUNCTIONS ============

// 1. OPENING ANALYSIS
async function analyzeOpenings(db) {
  console.log('\n=== OPENING ANALYSIS ===\n');
  
  return new Promise((resolve, reject) => {
    // Win rate by opening
    db.all(`
      SELECT 
        opening_name,
        opening_family,
        COUNT(*) as games_played,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'draw' THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as score_percentage,
        ROUND(AVG(my_rating), 0) as avg_rating,
        ROUND(AVG(opp_rating), 0) as avg_opp_rating
      FROM games
      WHERE opening_name IS NOT NULL 
        AND opening_name != ''
      GROUP BY opening_name, opening_family
      HAVING games_played >= 5
      ORDER BY games_played DESC, score_percentage DESC
      LIMIT 20
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Top 20 Most Played Openings (min 5 games):');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 2. TIME CONTROL PERFORMANCE
async function analyzeTimeControls(db) {
  console.log('\n=== TIME CONTROL PERFORMANCE ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        format,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'draw' THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as win_rate,
        MAX(my_rating) as peak_rating,
        ROUND(AVG(my_rating), 0) as avg_rating
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid', 'daily')
      GROUP BY format
      ORDER BY games DESC
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Performance by Time Control:');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 3. COLOR STATISTICS
async function analyzeByColor(db) {
  console.log('\n=== WHITE vs BLACK PERFORMANCE ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        color,
        format,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as score_percent
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid', 'daily')
      GROUP BY color, format
      ORDER BY format, color
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Performance by Color and Format:');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 4. WIN/LOSS STREAKS
async function findStreaks(db) {
  console.log('\n=== STREAKS ANALYSIS ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        game_id,
        end_date,
        format,
        color,
        outcome,
        my_rating,
        opponent,
        opp_rating
      FROM games
      ORDER BY end_timestamp ASC
    `, (err, rows) => {
      if (err) reject(err);
      
      let currentStreak = [];
      let longestWinStreak = [];
      let longestLossStreak = [];
      let currentType = null;
      
      rows.forEach(game => {
        if (game.outcome === 'win') {
          if (currentType === 'win') {
            currentStreak.push(game);
          } else {
            if (currentType === 'loss' && currentStreak.length > longestLossStreak.length) {
              longestLossStreak = [...currentStreak];
            }
            currentStreak = [game];
            currentType = 'win';
          }
        } else if (game.outcome === 'loss') {
          if (currentType === 'loss') {
            currentStreak.push(game);
          } else {
            if (currentType === 'win' && currentStreak.length > longestWinStreak.length) {
              longestWinStreak = [...currentStreak];
            }
            currentStreak = [game];
            currentType = 'loss';
          }
        } else {
          // Draw breaks streak
          if (currentType === 'win' && currentStreak.length > longestWinStreak.length) {
            longestWinStreak = [...currentStreak];
          } else if (currentType === 'loss' && currentStreak.length > longestLossStreak.length) {
            longestLossStreak = [...currentStreak];
          }
          currentStreak = [];
          currentType = null;
        }
      });
      
      // Check final streak
      if (currentType === 'win' && currentStreak.length > longestWinStreak.length) {
        longestWinStreak = [...currentStreak];
      } else if (currentType === 'loss' && currentStreak.length > longestLossStreak.length) {
        longestLossStreak = [...currentStreak];
      }
      
      console.log(`Longest Win Streak: ${longestWinStreak.length} games`);
      if (longestWinStreak.length > 0) {
        console.log(`  From: ${longestWinStreak[0].end_date}`);
        console.log(`  To: ${longestWinStreak[longestWinStreak.length - 1].end_date}`);
      }
      
      console.log(`\nLongest Loss Streak: ${longestLossStreak.length} games`);
      if (longestLossStreak.length > 0) {
        console.log(`  From: ${longestLossStreak[0].end_date}`);
        console.log(`  To: ${longestLossStreak[longestLossStreak.length - 1].end_date}`);
      }
      
      resolve({ longestWinStreak, longestLossStreak });
    });
  });
}

// 5. OPPONENT ANALYSIS
async function analyzeOpponents(db) {
  console.log('\n=== OPPONENT ANALYSIS ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        opponent,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'draw' THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND(AVG(opp_rating), 0) as avg_opp_rating,
        MIN(end_date) as first_game,
        MAX(end_date) as last_game
      FROM games
      WHERE opponent IS NOT NULL AND opponent != ''
      GROUP BY opponent
      HAVING games >= 3
      ORDER BY games DESC
      LIMIT 15
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Most Frequent Opponents (min 3 games):');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 6. RATING PROGRESSION
async function analyzeRatingProgression(db) {
  console.log('\n=== RATING PROGRESSION ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        format,
        DATE(end_datetime) as date,
        AVG(my_rating) as avg_rating,
        MIN(my_rating) as min_rating,
        MAX(my_rating) as max_rating,
        COUNT(*) as games_that_day
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
        AND my_rating IS NOT NULL
      GROUP BY format, DATE(end_datetime)
      ORDER BY format, date DESC
      LIMIT 30
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Rating by Date (last 30 entries):');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 7. GAME DURATION ANALYSIS
async function analyzeDuration(db) {
  console.log('\n=== GAME DURATION ANALYSIS ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        format,
        COUNT(*) as games,
        ROUND(AVG(duration_seconds) / 60.0, 1) as avg_duration_min,
        ROUND(MIN(duration_seconds) / 60.0, 1) as min_duration_min,
        ROUND(MAX(duration_seconds) / 60.0, 1) as max_duration_min,
        ROUND(AVG(plies), 1) as avg_moves
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
        AND duration_seconds > 0
      GROUP BY format
      ORDER BY format
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Average Game Duration:');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 8. TERMINATION ANALYSIS
async function analyzeTerminations(db) {
  console.log('\n=== HOW GAMES END ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        termination,
        outcome,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY termination, outcome
      ORDER BY count DESC
      LIMIT 20
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Most Common Game Endings:');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 9. TIME OF DAY ANALYSIS
async function analyzeTimeOfDay(db) {
  console.log('\n=== TIME OF DAY PERFORMANCE ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        CAST(SUBSTR(end_time, 1, 2) AS INTEGER) as hour,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as win_rate
      FROM games
      WHERE end_time IS NOT NULL
        AND format IN ('bullet', 'blitz', 'rapid')
      GROUP BY hour
      HAVING games >= 10
      ORDER BY hour
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Performance by Hour of Day (min 10 games):');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// 10. MONTHLY STATISTICS
async function analyzeMonthly(db) {
  console.log('\n=== MONTHLY STATISTICS ===\n');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        archive as month,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'draw' THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as score_percent
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY archive
      ORDER BY archive DESC
      LIMIT 12
    `, (err, rows) => {
      if (err) reject(err);
      
      console.log('Recent Monthly Performance:');
      console.table(rows);
      
      resolve(rows);
    });
  });
}

// ============ MAIN RUNNER ============

async function runAllAnalyses() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to chess database');
      console.log('Starting comprehensive analysis...\n');
      
      try {
        await analyzeOpenings(db);
        await analyzeTimeControls(db);
        await analyzeByColor(db);
        await findStreaks(db);
        await analyzeOpponents(db);
        await analyzeRatingProgression(db);
        await analyzeDuration(db);
        await analyzeTerminations(db);
        await analyzeTimeOfDay(db);
        await analyzeMonthly(db);
        
        console.log('\n✓ Analysis complete!');
        
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        console.error('Error during analysis:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// Run specific analysis
async function runSpecificAnalysis(analysisName) {
  const analyses = {
    'openings': analyzeOpenings,
    'timecontrols': analyzeTimeControls,
    'color': analyzeByColor,
    'streaks': findStreaks,
    'opponents': analyzeOpponents,
    'rating': analyzeRatingProgression,
    'duration': analyzeDuration,
    'terminations': analyzeTerminations,
    'timeofday': analyzeTimeOfDay,
    'monthly': analyzeMonthly
  };
  
  const analysisFn = analyses[analysisName.toLowerCase()];
  if (!analysisFn) {
    console.error(`Unknown analysis: ${analysisName}`);
    console.log('Available analyses:', Object.keys(analyses).join(', '));
    return;
  }
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      try {
        await analysisFn(db);
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        console.error('Error during analysis:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all analyses
    runAllAnalyses().catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
  } else {
    // Run specific analysis
    const analysisName = args[0];
    runSpecificAnalysis(analysisName).catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
  }
}

module.exports = {
  analyzeOpenings,
  analyzeTimeControls,
  analyzeByColor,
  findStreaks,
  analyzeOpponents,
  analyzeRatingProgression,
  analyzeDuration,
  analyzeTerminations,
  analyzeTimeOfDay,
  analyzeMonthly,
  runAllAnalyses,
  runSpecificAnalysis
};

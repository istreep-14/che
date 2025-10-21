// Custom Chess Query Builder
// Run custom SQL queries and analysis on your chess database

const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const DB_PATH = './chess_games.db';

// ============ PRE-BUILT CUSTOM QUERIES ============

const CUSTOM_QUERIES = {
  'my-peak-ratings': {
    description: 'Show my peak rating in each format',
    query: `
      SELECT 
        format,
        MAX(my_rating) as peak_rating,
        end_date as achieved_on,
        opponent,
        opp_rating as opponent_rating
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid', 'daily')
      GROUP BY format
    `
  },
  
  'biggest-upsets': {
    description: 'Games where I beat much higher-rated opponents',
    query: `
      SELECT 
        end_date,
        format,
        color,
        my_rating,
        opp_rating,
        (opp_rating - my_rating) as rating_diff,
        opponent,
        opening_name,
        url
      FROM games
      WHERE outcome = 'win'
        AND opp_rating > my_rating + 100
      ORDER BY rating_diff DESC
      LIMIT 15
    `
  },
  
  'biggest-disappointments': {
    description: 'Games where I lost to much lower-rated opponents',
    query: `
      SELECT 
        end_date,
        format,
        color,
        my_rating,
        opp_rating,
        (my_rating - opp_rating) as rating_diff,
        opponent,
        opening_name,
        termination,
        url
      FROM games
      WHERE outcome = 'loss'
        AND my_rating > opp_rating + 100
      ORDER BY rating_diff DESC
      LIMIT 15
    `
  },
  
  'comeback-games': {
    description: 'Wins in games lasting 60+ moves (endgame comebacks)',
    query: `
      SELECT 
        end_date,
        format,
        color,
        plies,
        my_rating,
        opp_rating,
        opening_name,
        duration,
        url
      FROM games
      WHERE outcome = 'win'
        AND plies >= 60
      ORDER BY plies DESC
      LIMIT 20
    `
  },
  
  'quick-wins': {
    description: 'Wins in under 15 moves (crushing victories)',
    query: `
      SELECT 
        end_date,
        format,
        color,
        plies,
        termination,
        my_rating,
        opp_rating,
        opening_name,
        url
      FROM games
      WHERE outcome = 'win'
        AND plies <= 30
      ORDER BY plies ASC
      LIMIT 20
    `
  },
  
  'most-active-days': {
    description: 'Days when I played the most games',
    query: `
      SELECT 
        end_date,
        COUNT(*) as games_played,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        GROUP_CONCAT(format, ', ') as formats
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY end_date
      HAVING games_played >= 5
      ORDER BY games_played DESC
      LIMIT 20
    `
  },
  
  'opening-experiments': {
    description: 'Openings I tried only once (experiments)',
    query: `
      SELECT 
        opening_name,
        opening_family,
        end_date,
        format,
        color,
        outcome,
        my_rating,
        opp_rating,
        url
      FROM games
      WHERE opening_name IN (
        SELECT opening_name 
        FROM games 
        WHERE opening_name IS NOT NULL
        GROUP BY opening_name 
        HAVING COUNT(*) = 1
      )
      ORDER BY end_date DESC
      LIMIT 30
    `
  },
  
  'perfect-sessions': {
    description: 'Days where I won every game',
    query: `
      SELECT 
        end_date,
        COUNT(*) as games,
        AVG(my_rating) as avg_rating,
        AVG(opp_rating) as avg_opp_rating,
        GROUP_CONCAT(DISTINCT format) as formats
      FROM games
      GROUP BY end_date
      HAVING SUM(CASE WHEN outcome != 'win' THEN 1 ELSE 0 END) = 0
        AND games >= 3
      ORDER BY games DESC
    `
  },
  
  'tough-opponents': {
    description: 'Opponents who beat me most often (min 3 games)',
    query: `
      SELECT 
        opponent,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(opp_rating), 0) as avg_rating,
        MIN(end_date) as first_game,
        MAX(end_date) as last_game
      FROM games
      WHERE opponent IS NOT NULL
      GROUP BY opponent
      HAVING games >= 3 
        AND losses > wins
      ORDER BY losses DESC
      LIMIT 15
    `
  },
  
  'rating-peaks-by-month': {
    description: 'Highest rating achieved each month',
    query: `
      SELECT 
        archive as month,
        format,
        MAX(my_rating) as peak_rating,
        end_date as achieved_on
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY archive, format
      ORDER BY archive DESC, format
      LIMIT 30
    `
  },
  
  'timeout-games': {
    description: 'Games lost on time',
    query: `
      SELECT 
        end_date,
        format,
        color,
        plies,
        my_rating,
        opp_rating,
        opening_name,
        time_control,
        url
      FROM games
      WHERE termination = 'timeout'
        AND outcome = 'loss'
      ORDER BY end_date DESC
      LIMIT 20
    `
  },
  
  'resignation-rate': {
    description: 'How often games end in resignation vs other endings',
    query: `
      SELECT 
        format,
        termination,
        outcome,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY format), 1) as percentage
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY format, termination, outcome
      ORDER BY format, count DESC
    `
  },
  
  'weekend-warrior': {
    description: 'Performance on weekends vs weekdays',
    query: `
      SELECT 
        CASE 
          WHEN CAST(strftime('%w', end_date) AS INTEGER) IN (0, 6) 
          THEN 'Weekend'
          ELSE 'Weekday'
        END as day_type,
        COUNT(*) as games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as score_pct
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
      GROUP BY day_type
    `
  },
  
  'consistency-score': {
    description: 'Standard deviation of ratings (lower = more consistent)',
    query: `
      SELECT 
        format,
        COUNT(*) as games,
        ROUND(AVG(my_rating), 0) as avg_rating,
        MAX(my_rating) as peak,
        MIN(my_rating) as lowest,
        ROUND(AVG(my_rating) - MIN(my_rating), 0) as rating_range
      FROM games
      WHERE format IN ('bullet', 'blitz', 'rapid')
        AND my_rating IS NOT NULL
      GROUP BY format
    `
  },
  
  'opening-loyalty': {
    description: 'Openings played most consistently over time',
    query: `
      SELECT 
        opening_name,
        opening_family,
        COUNT(*) as times_played,
        COUNT(DISTINCT archive) as months_used,
        MIN(end_date) as first_used,
        MAX(end_date) as last_used,
        ROUND(AVG(CASE WHEN outcome = 'win' THEN 1 
                       WHEN outcome = 'draw' THEN 0.5 
                       ELSE 0 END) * 100, 1) as score_pct
      FROM games
      WHERE opening_name IS NOT NULL
      GROUP BY opening_name, opening_family
      HAVING times_played >= 10
      ORDER BY times_played DESC
      LIMIT 15
    `
  }
};

// ============ QUERY RUNNER ============

function runQuery(db, queryName) {
  return new Promise((resolve, reject) => {
    const queryInfo = CUSTOM_QUERIES[queryName];
    
    if (!queryInfo) {
      reject(new Error(`Unknown query: ${queryName}`));
      return;
    }
    
    console.log(`\n=== ${queryInfo.description.toUpperCase()} ===\n`);
    
    db.all(queryInfo.query, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (rows.length === 0) {
        console.log('No results found.');
      } else {
        console.table(rows);
      }
      
      resolve(rows);
    });
  });
}

function runCustomSQL(db, sql) {
  return new Promise((resolve, reject) => {
    console.log(`\nExecuting query...\n`);
    
    db.all(sql, (err, rows) => {
      if (err) {
        console.error('Error executing query:', err.message);
        reject(err);
        return;
      }
      
      if (rows.length === 0) {
        console.log('No results found.');
      } else {
        console.table(rows);
        console.log(`\n${rows.length} rows returned.`);
      }
      
      resolve(rows);
    });
  });
}

function listQueries() {
  console.log('\n=== AVAILABLE CUSTOM QUERIES ===\n');
  
  Object.keys(CUSTOM_QUERIES).forEach(key => {
    console.log(`  ${key}`);
    console.log(`    ${CUSTOM_QUERIES[key].description}\n`);
  });
}

function showHelp() {
  console.log(`
Chess Query Builder - Usage:

  node custom-queries.js [query-name]         Run a pre-built query
  node custom-queries.js --list               List all available queries
  node custom-queries.js --interactive        Interactive mode
  node custom-queries.js --custom "SQL"       Run custom SQL

Examples:
  node custom-queries.js biggest-upsets
  node custom-queries.js my-peak-ratings
  node custom-queries.js --custom "SELECT * FROM games WHERE plies > 100"

Available Queries:
  `);
  
  Object.keys(CUSTOM_QUERIES).forEach(key => {
    console.log(`  - ${key}: ${CUSTOM_QUERIES[key].description}`);
  });
}

// ============ INTERACTIVE MODE ============

async function interactiveMode() {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n=== INTERACTIVE QUERY MODE ===');
  console.log('Type a query name, custom SQL, or "help" for options');
  console.log('Type "exit" to quit\n');
  
  const promptUser = () => {
    rl.question('chess> ', async (input) => {
      const trimmed = input.trim();
      
      if (trimmed === 'exit' || trimmed === 'quit') {
        rl.close();
        db.close();
        return;
      }
      
      if (trimmed === 'help') {
        listQueries();
        promptUser();
        return;
      }
      
      if (trimmed === 'list') {
        listQueries();
        promptUser();
        return;
      }
      
      if (trimmed === '') {
        promptUser();
        return;
      }
      
      try {
        // Check if it's a named query
        if (CUSTOM_QUERIES[trimmed]) {
          await runQuery(db, trimmed);
        } else {
          // Treat as custom SQL
          await runCustomSQL(db, trimmed);
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
      
      promptUser();
    });
  };
  
  promptUser();
}

// ============ MAIN CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  if (args[0] === '--list') {
    listQueries();
    return;
  }
  
  if (args[0] === '--interactive' || args[0] === '-i') {
    await interactiveMode();
    return;
  }
  
  // Connect to database
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, async (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
    
    try {
      if (args[0] === '--custom') {
        const sql = args.slice(1).join(' ');
        await runCustomSQL(db, sql);
      } else {
        const queryName = args[0];
        await runQuery(db, queryName);
      }
      
      db.close();
    } catch (error) {
      console.error('Error:', error.message);
      db.close();
      process.exit(1);
    }
  });
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runQuery,
  runCustomSQL,
  listQueries,
  CUSTOM_QUERIES
};

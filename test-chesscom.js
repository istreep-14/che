#!/usr/bin/env node
// Chess.com Analysis Fetcher - Standalone Test
// Tests fetching analysis from Chess.com without database

const https = require('https');

// ============ CHESS.COM ANALYSIS API ============

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

async function fetchGameData(gameType, gameId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.chess.com/callback/live/game/${gameId}`;
    
    console.log(`\n📡 Fetching game data from Chess.com API...`);
    console.log(`URL: ${url}\n`);
    
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
            console.log(`✓ Game data received (${data.length} bytes)`);
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

async function fetchGameAnalysis(gameType, gameId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.chess.com/callback/game/analysis/${gameId}`;
    
    console.log(`\n📊 Fetching analysis data...`);
    console.log(`URL: ${url}\n`);
    
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
            console.log(`✓ Analysis data received`);
            resolve(json);
          } catch (error) {
            console.log(`⚠️  No analysis data available (or parse error)`);
            resolve(null);
          }
        } else {
          console.log(`⚠️  Analysis endpoint returned ${res.statusCode}`);
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log(`⚠️  Could not fetch analysis`);
      resolve(null);
    });
  });
}

async function fetchGameInsights(gameId) {
  return new Promise((resolve) => {
    const url = `https://www.chess.com/callback/insights/game/${gameId}`;
    
    console.log(`\n🎯 Fetching game insights...`);
    console.log(`URL: ${url}\n`);
    
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
            console.log(`✓ Insights data received`);
            resolve(json);
          } catch (error) {
            console.log(`⚠️  No insights data available`);
            resolve(null);
          }
        } else {
          console.log(`⚠️  Insights endpoint returned ${res.statusCode}`);
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log(`⚠️  Could not fetch insights`);
      resolve(null);
    });
  });
}

function displayResults(gameData, analysisData, insightsData) {
  console.log('\n' + '='.repeat(70));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\n📦 GAME DATA:');
  if (gameData && gameData.game) {
    const game = gameData.game;
    console.log(`  ✓ Game ID: ${game.id}`);
    console.log(`  ✓ White: ${game.white?.username || 'Unknown'} (${game.white?.rating || 'N/A'})`);
    console.log(`  ✓ Black: ${game.black?.username || 'Unknown'} (${game.black?.rating || 'N/A'})`);
    console.log(`  ✓ Result: ${game.result || 'N/A'}`);
    console.log(`  ✓ Time Control: ${game.time_control || 'N/A'}`);
    console.log(`  ✓ Time Class: ${game.time_class || 'N/A'}`);
  } else {
    console.log('  ✗ No game data received');
  }
  
  console.log('\n📊 ANALYSIS DATA:');
  if (analysisData) {
    console.log(`  ✓ Analysis available!`);
    console.log(`  Keys: ${Object.keys(analysisData).join(', ')}`);
    
    if (analysisData.analysis) {
      console.log(`  Analysis keys: ${Object.keys(analysisData.analysis).join(', ')}`);
    }
  } else {
    console.log('  ✗ No analysis data available');
    console.log('  (This may be normal - not all games have computer analysis)');
  }
  
  console.log('\n🎯 INSIGHTS DATA:');
  if (insightsData) {
    console.log(`  ✓ Insights available!`);
    console.log(`  Keys: ${Object.keys(insightsData).join(', ')}`);
    
    if (insightsData.accuracy) {
      console.log(`  White Accuracy: ${insightsData.accuracy.white?.toFixed(1)}%`);
      console.log(`  Black Accuracy: ${insightsData.accuracy.black?.toFixed(1)}%`);
    }
    
    if (insightsData.moveClassifications) {
      const classifications = insightsData.moveClassifications;
      const blunders = classifications.filter(c => c === 'blunder').length;
      const mistakes = classifications.filter(c => c === 'mistake').length;
      const inaccuracies = classifications.filter(c => c === 'inaccuracy').length;
      
      console.log(`  Blunders: ${blunders}`);
      console.log(`  Mistakes: ${mistakes}`);
      console.log(`  Inaccuracies: ${inaccuracies}`);
    }
  } else {
    console.log('  ✗ No insights data available');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

async function testGameUrl(url) {
  console.log('\n' + '='.repeat(70));
  console.log('CHESS.COM ANALYSIS TEST');
  console.log('='.repeat(70));
  console.log(`\nTesting URL: ${url}`);
  
  const parsed = parseGameUrl(url);
  if (!parsed) {
    console.error('\n❌ Invalid Chess.com game URL');
    console.log('\nValid formats:');
    console.log('  https://www.chess.com/game/live/123456789');
    console.log('  https://www.chess.com/analysis/game/live/123456789');
    console.log('  https://www.chess.com/game/daily/123456789');
    return;
  }
  
  console.log(`\n✓ Parsed successfully:`);
  console.log(`  Game Type: ${parsed.type}`);
  console.log(`  Game ID: ${parsed.gameId}`);
  
  try {
    // Fetch all data
    const [gameData, analysisData, insightsData] = await Promise.all([
      fetchGameData(parsed.type, parsed.gameId),
      fetchGameAnalysis(parsed.type, parsed.gameId),
      fetchGameInsights(parsed.gameId)
    ]);
    
    // Display results
    displayResults(gameData, analysisData, insightsData);
    
    console.log('\n✓ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Chess.com Analysis Test Tool

Usage:
  node test-chesscom.js <game-url>

Examples:
  node test-chesscom.js "https://www.chess.com/game/live/123456789"
  node test-chesscom.js "https://www.chess.com/analysis/game/live/123456789"

This tests fetching data from Chess.com's APIs without database dependencies.
`);
    return;
  }
  
  await testGameUrl(args[0]);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node
// Chess.com Analysis Suite
// Comprehensive analysis tools that work without WebSocket authentication

const https = require('https');
const fs = require('fs');
const path = require('path');

class ChessAnalysisSuite {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  }

  /**
   * Fetch game data from Chess.com
   */
  async fetchGameData(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/live/game/${gameId}`;
      
      console.log(`🔍 Fetching game data for ID: ${gameId}`);
      console.log(`   URL: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log('✅ Game data fetched successfully');
              resolve(json);
            } catch (error) {
              console.log('❌ Failed to parse game data');
              reject(error);
            }
          } else {
            console.log(`❌ Game data request failed: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch game analysis
   */
  async fetchGameAnalysis(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/game/analysis/${gameId}`;
      
      console.log(`🔍 Fetching game analysis for ID: ${gameId}`);
      console.log(`   URL: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log('✅ Game analysis fetched successfully');
              resolve(json);
            } catch (error) {
              console.log('❌ Failed to parse game analysis');
              reject(error);
            }
          } else {
            console.log(`❌ Game analysis request failed: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch game insights
   */
  async fetchGameInsights(gameId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.chess.com/callback/game/insights/${gameId}`;
      
      console.log(`🔍 Fetching game insights for ID: ${gameId}`);
      console.log(`   URL: ${url}`);

      https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              console.log('✅ Game insights fetched successfully');
              resolve(json);
            } catch (error) {
              console.log('❌ Failed to parse game insights');
              reject(error);
            }
          } else {
            console.log(`❌ Game insights request failed: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Analyze a game comprehensively
   */
  async analyzeGame(gameId) {
    console.log('\n' + '═'.repeat(70));
    console.log('CHESS.COM GAME ANALYSIS SUITE');
    console.log('═'.repeat(70) + '\n');

    try {
      // Fetch all data in parallel
      console.log('📊 Fetching comprehensive game data...\n');
      
      const [gameData, analysisData, insightsData] = await Promise.allSettled([
        this.fetchGameData(gameId),
        this.fetchGameAnalysis(gameId),
        this.fetchGameInsights(gameId)
      ]);

      // Process results
      const results = {
        gameId: gameId,
        timestamp: new Date().toISOString(),
        gameData: gameData.status === 'fulfilled' ? gameData.value : null,
        analysisData: analysisData.status === 'fulfilled' ? analysisData.value : null,
        insightsData: insightsData.status === 'fulfilled' ? insightsData.value : null,
        errors: []
      };

      // Collect errors
      if (gameData.status === 'rejected') {
        results.errors.push({ type: 'gameData', error: gameData.reason.message });
      }
      if (analysisData.status === 'rejected') {
        results.errors.push({ type: 'analysisData', error: analysisData.reason.message });
      }
      if (insightsData.status === 'rejected') {
        results.errors.push({ type: 'insightsData', error: insightsData.reason.message });
      }

      // Display results
      this.displayResults(results);

      // Save results
      await this.saveResults(results);

      return results;

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Display analysis results
   */
  displayResults(results) {
    console.log('\n' + '═'.repeat(70));
    console.log('ANALYSIS RESULTS');
    console.log('═'.repeat(70));

    // Game Data
    if (results.gameData) {
      console.log('\n📊 GAME DATA:');
      const game = results.gameData.game;
      if (game) {
        console.log(`   Game ID: ${game.id}`);
        console.log(`   UUID: ${game.uuid}`);
        console.log(`   White: ${game.white?.username || 'Unknown'}`);
        console.log(`   Black: ${game.black?.username || 'Unknown'}`);
        console.log(`   Result: ${game.result || 'Unknown'}`);
        console.log(`   Time Control: ${game.time_class || 'Unknown'}`);
        console.log(`   Rated: ${game.rated ? 'Yes' : 'No'}`);
        console.log(`   Moves: ${game.moves?.length || 0}`);
      }
    } else {
      console.log('\n❌ GAME DATA: Not available');
    }

    // Analysis Data
    if (results.analysisData) {
      console.log('\n🔍 ANALYSIS DATA:');
      console.log('   Analysis data structure:');
      console.log(`   Keys: ${Object.keys(results.analysisData).join(', ')}`);
      
      // Look for specific analysis fields
      if (results.analysisData.positions) {
        console.log(`   Positions analyzed: ${results.analysisData.positions.length}`);
      }
      if (results.analysisData.accuracy) {
        console.log(`   Accuracy data: ${JSON.stringify(results.analysisData.accuracy)}`);
      }
    } else {
      console.log('\n❌ ANALYSIS DATA: Not available');
    }

    // Insights Data
    if (results.insightsData) {
      console.log('\n💡 INSIGHTS DATA:');
      console.log('   Insights data structure:');
      console.log(`   Keys: ${Object.keys(results.insightsData).join(', ')}`);
    } else {
      console.log('\n❌ INSIGHTS DATA: Not available');
    }

    // Errors
    if (results.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      results.errors.forEach(error => {
        console.log(`   ${error.type}: ${error.error}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
  }

  /**
   * Save results to file
   */
  async saveResults(results) {
    const filename = `chess-analysis-${results.gameId}-${Date.now()}.json`;
    const filepath = path.join(__dirname, filename);
    
    await fs.promises.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${filename}`);
  }

  /**
   * Analyze multiple games
   */
  async analyzeMultipleGames(gameIds) {
    console.log('\n' + '═'.repeat(70));
    console.log('CHESS.COM MULTI-GAME ANALYSIS');
    console.log('═'.repeat(70) + '\n');

    const results = [];

    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i];
      console.log(`\n🎮 Analyzing game ${i + 1}/${gameIds.length}: ${gameId}`);
      
      try {
        const result = await this.analyzeGame(gameId);
        results.push(result);
        
        // Small delay between requests
        if (i < gameIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`❌ Failed to analyze game ${gameId}: ${error.message}`);
        results.push({
          gameId: gameId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Save combined results
    const filename = `chess-multi-analysis-${Date.now()}.json`;
    const filepath = path.join(__dirname, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Multi-game results saved to: ${filename}`);

    return results;
  }
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Chess.com Analysis Suite

Usage:
  node chess-analysis-suite.js <game-id>                    Analyze single game
  node chess-analysis-suite.js <game-id1> <game-id2> ...    Analyze multiple games
  node chess-analysis-suite.js --recent <count>             Analyze recent games from database

Examples:
  node chess-analysis-suite.js 143445742366
  node chess-analysis-suite.js 143445742366 144540017288
  node chess-analysis-suite.js --recent 5

This will:
1. Fetch game data, analysis, and insights
2. Display comprehensive results
3. Save results to JSON files
4. Work without authentication (HTTP API only)

Note: This uses HTTP APIs only, no WebSocket authentication required.
`);
    return;
  }

  const suite = new ChessAnalysisSuite();

  try {
    if (args[0] === '--recent') {
      // Analyze recent games from database
      const count = parseInt(args[1]) || 5;
      console.log(`📊 Analyzing recent ${count} games from database...`);
      
      // This would require database integration
      console.log('❌ Database integration not implemented yet');
      console.log('💡 Use: node game-analyzer.js --recent 5');
      
    } else {
      // Analyze provided game IDs
      const gameIds = args;
      console.log(`📊 Analyzing ${gameIds.length} game(s)...`);
      
      if (gameIds.length === 1) {
        await suite.analyzeGame(gameIds[0]);
      } else {
        await suite.analyzeMultipleGames(gameIds);
      }
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
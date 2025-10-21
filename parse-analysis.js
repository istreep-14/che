#!/usr/bin/env node
// Chess.com WebSocket Analysis Parser
// Parses the actual Chess.com analysis message format

const fs = require('fs');

// Parse the actual Chess.com analysis response
function parseChessComAnalysis(message) {
  try {
    const data = typeof message === 'string' ? JSON.parse(message) : message;
    
    if (data.action === 'analyzeGame' && data.data) {
      return parseAnalysisData(data.data);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing message:', error.message);
    return null;
  }
}

function parseAnalysisData(analysisData) {
  const result = {
    gameInfo: {
      startingFen: analysisData.startingFen,
      firstMoveNumber: analysisData.firstMoveNumber,
      playerToMove: analysisData.playerToMove
    },
    positions: [],
    summary: {
      totalMoves: analysisData.positions.length,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      excellent: 0,
      good: 0,
      book: 0
    }
  };

  // Parse each position
  for (let i = 0; i < analysisData.positions.length; i++) {
    const pos = analysisData.positions[i];
    
    const positionData = {
      moveNumber: Math.floor(i / 2) + 1,
      color: pos.color,
      fen: pos.fen,
      playedMove: null,
      bestMove: null,
      evaluation: null,
      classification: pos.classificationName,
      difference: pos.difference,
      caps2: pos.caps2 // accuracy score (0-100)
    };

    // Get played move
    if (pos.playedMove) {
      positionData.playedMove = {
        lan: pos.playedMove.moveLan,
        score: pos.playedMove.score,
        depth: pos.playedMove.depth,
        classification: pos.playedMove.classification
      };
    }

    // Get best move
    if (pos.bestMove) {
      positionData.bestMove = {
        lan: pos.bestMove.moveLan,
        score: pos.bestMove.score,
        depth: pos.bestMove.depth,
        classification: pos.bestMove.classification
      };
    }

    // Get evaluation
    if (pos.evals && pos.evals.length > 0) {
      positionData.evaluation = {
        cp: pos.evals[0].cp, // centipawns
        pv: pos.evals[0].pv  // principal variation
      };
    }

    // Count classifications
    const classification = pos.classificationName;
    if (classification) {
      switch (classification.toLowerCase()) {
        case 'blunder':
          result.summary.blunders++;
          break;
        case 'mistake':
          result.summary.mistakes++;
          break;
        case 'inaccuracy':
          result.summary.inaccuracies++;
          break;
        case 'excellent':
          result.summary.excellent++;
          break;
        case 'good':
          result.summary.good++;
          break;
        case 'book':
          result.summary.book++;
          break;
      }
    }

    result.positions.push(positionData);
  }

  return result;
}

// Calculate accuracy from caps2 values
function calculateAccuracy(positions, color) {
  const colorMoves = positions.filter(p => p.color === color && p.caps2 !== null);
  
  if (colorMoves.length === 0) return null;
  
  const total = colorMoves.reduce((sum, p) => sum + p.caps2, 0);
  return (total / colorMoves.length).toFixed(1);
}

// Generate readable report
function generateReport(analysis) {
  console.log('\n' + '═'.repeat(70));
  console.log('CHESS.COM ANALYSIS REPORT');
  console.log('═'.repeat(70));

  console.log('\n📋 GAME INFORMATION:');
  console.log(`  Starting Position: ${analysis.gameInfo.startingFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' ? 'Standard' : 'Custom'}`);
  console.log(`  First Move Number: ${analysis.gameInfo.firstMoveNumber}`);
  console.log(`  Player to Move: ${analysis.gameInfo.playerToMove}`);
  console.log(`  Total Positions: ${analysis.summary.totalMoves}`);

  console.log('\n🎯 ACCURACY:');
  const whiteAccuracy = calculateAccuracy(analysis.positions, 'white');
  const blackAccuracy = calculateAccuracy(analysis.positions, 'black');
  
  if (whiteAccuracy) console.log(`  White: ${whiteAccuracy}%`);
  if (blackAccuracy) console.log(`  Black: ${blackAccuracy}%`);

  console.log('\n📊 MOVE CLASSIFICATIONS:');
  console.log(`  Book moves: ${analysis.summary.book}`);
  console.log(`  Excellent: ${analysis.summary.excellent}`);
  console.log(`  Good: ${analysis.summary.good}`);
  console.log(`  Inaccuracies: ${analysis.summary.inaccuracies}`);
  console.log(`  Mistakes: ${analysis.summary.mistakes}`);
  console.log(`  Blunders: ${analysis.summary.blunders}`);

  // Show blunders
  if (analysis.summary.blunders > 0) {
    console.log('\n❌ BLUNDERS:');
    const blunders = analysis.positions.filter(p => p.classification === 'blunder');
    blunders.forEach(b => {
      console.log(`  Move ${b.moveNumber} (${b.color || 'unknown'})`);
      if (b.playedMove) {
        console.log(`    Played: ${b.playedMove.lan} (${b.playedMove.score})`);
      }
      if (b.bestMove) {
        console.log(`    Best: ${b.bestMove.lan} (${b.bestMove.score})`);
      }
      if (b.difference) {
        console.log(`    Evaluation loss: ${Math.abs(b.difference).toFixed(2)}`);
      }
    });
  }

  // Show mistakes
  if (analysis.summary.mistakes > 0) {
    console.log('\n⚠️  MISTAKES:');
    const mistakes = analysis.positions.filter(p => p.classification === 'mistake');
    mistakes.forEach(m => {
      console.log(`  Move ${m.moveNumber} (${m.color || 'unknown'})`);
      if (m.playedMove && m.bestMove) {
        console.log(`    Played: ${m.playedMove.lan}, Best: ${m.bestMove.lan}`);
      }
    });
  }

  // Show some position evaluations
  console.log('\n📈 POSITION EVALUATIONS (first 10):');
  for (let i = 0; i < Math.min(10, analysis.positions.length); i++) {
    const pos = analysis.positions[i];
    if (pos.evaluation) {
      const eval = pos.evaluation.cp / 100; // Convert centipawns to pawns
      console.log(`  Move ${pos.moveNumber} (${pos.color || 'start'}): ${eval > 0 ? '+' : ''}${eval.toFixed(2)}`);
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

// Generate detailed JSON report
function generateJSONReport(analysis) {
  return JSON.stringify(analysis, null, 2);
}

// Generate CSV report
function generateCSV(analysis) {
  const lines = ['moveNumber,color,classification,playedMove,bestMove,evaluation,accuracy,difference'];
  
  analysis.positions.forEach(pos => {
    const line = [
      pos.moveNumber,
      pos.color || '',
      pos.classification || '',
      pos.playedMove ? pos.playedMove.lan : '',
      pos.bestMove ? pos.bestMove.lan : '',
      pos.evaluation ? (pos.evaluation.cp / 100).toFixed(2) : '',
      pos.caps2 !== null ? pos.caps2 : '',
      pos.difference !== null ? pos.difference.toFixed(2) : ''
    ].join(',');
    
    lines.push(line);
  });
  
  return lines.join('\n');
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Chess.com Analysis Parser

Parses Chess.com analysis messages and generates reports.

Usage:
  node parse-analysis.js <json-file>                Parse analysis file
  node parse-analysis.js <json-file> --report       Generate text report
  node parse-analysis.js <json-file> --json         Generate JSON report
  node parse-analysis.js <json-file> --csv          Generate CSV report

Examples:
  node parse-analysis.js analysis.json
  node parse-analysis.js analysis.json --report
  node parse-analysis.js analysis.json --csv > report.csv
`);
    return;
  }

  const filename = args[0];
  const format = args[1] || '--report';

  try {
    // Read file
    const content = fs.readFileSync(filename, 'utf8');
    const message = JSON.parse(content);

    // Parse analysis
    const analysis = parseChessComAnalysis(message);

    if (!analysis) {
      console.error('Could not parse analysis data');
      process.exit(1);
    }

    // Generate output
    switch (format) {
      case '--report':
        generateReport(analysis);
        break;
      
      case '--json':
        console.log(generateJSONReport(analysis));
        break;
      
      case '--csv':
        console.log(generateCSV(analysis));
        break;
      
      default:
        generateReport(analysis);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseChessComAnalysis,
  generateReport,
  generateJSONReport,
  generateCSV
};

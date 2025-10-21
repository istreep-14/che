const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const readline = require('readline');

const OPENINGS_DB_PATH = './openings.db';
const TSV_PATH = './openings.tsv'; // Your TSV file path

async function importOpeningsFromTSV() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(OPENINGS_DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('Creating table...');

      // Create table
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
        if (err) {
          reject(err);
          return;
        }

        console.log('✓ Table created');
        console.log('Reading TSV file...');

        const stmt = db.prepare(`
          INSERT OR REPLACE INTO openings (
            full_name, trim_slug, family, base_name,
            variation_1, variation_2, variation_3, variation_4, variation_5, variation_6
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        let skipped = 0;
        let lineNumber = 0;

        const rl = readline.createInterface({
          input: fs.createReadStream(TSV_PATH),
          crlfDelay: Infinity
        });

        rl.on('line', (line) => {
          lineNumber++;

          // Skip header row
          if (lineNumber === 1) {
            console.log('Header:', line.split('\t').join(' | '));
            return;
          }

          // Skip empty lines
          if (!line.trim()) {
            skipped++;
            return;
          }

          // Split by tab
          const columns = line.split('\t');

          // Expecting format: Name, Trim Slug, Family, Base Name, Var1-6
          // Adjust indices based on your TSV structure
          const fullName = (columns[0] || '').trim();
          const trimSlug = (columns[1] || '').trim().toLowerCase();
          const family = (columns[2] || '').trim();
          const baseName = (columns[3] || '').trim();
          const var1 = (columns[4] || '').trim();
          const var2 = (columns[5] || '').trim();
          const var3 = (columns[6] || '').trim();
          const var4 = (columns[7] || '').trim();
          const var5 = (columns[8] || '').trim();
          const var6 = (columns[9] || '').trim();

          // Skip if no slug
          if (!trimSlug) {
            skipped++;
            console.log(`  Skipping line ${lineNumber}: no slug`);
            return;
          }

          stmt.run(
            fullName,
            trimSlug,
            family,
            baseName,
            var1,
            var2,
            var3,
            var4,
            var5,
            var6,
            (err) => {
              if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                  console.log(`  Duplicate slug: ${trimSlug}`);
                } else {
                  console.error(`  Error on line ${lineNumber}:`, err.message);
                }
              }
            }
          );

          count++;

          // Progress indicator
          if (count % 100 === 0) {
            process.stdout.write(`\r  Imported ${count} openings...`);
          }
        });

        rl.on('close', () => {
          stmt.finalize();
          console.log(`\n\n✓ Import complete!`);
          console.log(`  Imported: ${count} openings`);
          console.log(`  Skipped: ${skipped} rows`);
          
          // Show sample data
          db.all('SELECT * FROM openings LIMIT 5', (err, rows) => {
            if (!err && rows) {
              console.log('\nSample openings:');
              rows.forEach(row => {
                console.log(`  ${row.trim_slug} → ${row.full_name}`);
              });
            }
            db.close();
            resolve();
          });
        });

        rl.on('error', (err) => {
          reject(err);
        });
      });
    });
  });
}

// Run import
importOpeningsFromTSV()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
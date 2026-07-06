const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const outputFile = path.join(__dirname, 'full_schema_snapshot.sql');

try {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sorting ensures chronological order based on timestamp prefix

  let combinedSql = '-- FULL SCHEMA SNAPSHOT (Aggregated from local migrations)\n\n';

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    combinedSql += `-- ==========================================\n`;
    combinedSql += `-- MIGRATION: ${file}\n`;
    combinedSql += `-- ==========================================\n\n`;
    combinedSql += content;
    combinedSql += '\n\n';
  }

  fs.writeFileSync(outputFile, combinedSql);
  console.log(`Successfully aggregated ${files.length} migration files into ${outputFile}`);
} catch (error) {
  console.error('Error generating schema snapshot:', error);
}

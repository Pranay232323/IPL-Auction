import { closeDb, getDb } from './connection.js';
import { runMigrations } from './migrate.js';

const reset = process.argv.includes('--reset');
const db = getDb();
const applied = runMigrations(db, reset);
console.log(
  applied.length > 0
    ? `[DB Migrate] Applied ${applied.length} migration(s): ${applied.join(', ')}`
    : '[DB Migrate] Schema is already up to date.'
);
closeDb();

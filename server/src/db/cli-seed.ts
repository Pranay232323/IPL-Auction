import { closeDb, getDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { seedPlayers } from './seed.js';

const db = getDb();
runMigrations(db);
const count = seedPlayers(db);
console.log(`[DB Seed] Successfully seeded ${count} registered IPL players.`);
closeDb();

-- =============================================================================
-- Migration 001: Initial Schema for Real-Time Multiplayer IPL Mega Auction
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 0,
  avatar_color TEXT NOT NULL DEFAULT '#F59E0B',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  is_overseas INTEGER NOT NULL CHECK (is_overseas IN (0, 1)),
  is_capped INTEGER NOT NULL CHECK (is_capped IN (0, 1)),
  role TEXT NOT NULL CHECK (role IN ('WK', 'BAT', 'AR', 'BOWL')),
  batting_style TEXT NOT NULL,
  bowling_style TEXT NOT NULL,
  speciality TEXT NOT NULL,
  base_price_lakhs INTEGER NOT NULL,
  auction_set TEXT NOT NULL,
  set_order INTEGER NOT NULL,
  overall_rating INTEGER NOT NULL,
  batting_rating INTEGER NOT NULL,
  bowling_rating INTEGER NOT NULL,
  fielding_rating INTEGER NOT NULL,
  powerplay_rating INTEGER NOT NULL,
  death_rating INTEGER NOT NULL,
  ipl_matches INTEGER NOT NULL DEFAULT 0,
  ipl_runs INTEGER NOT NULL DEFAULT 0,
  ipl_strike_rate REAL NOT NULL DEFAULT 0,
  ipl_wickets INTEGER NOT NULL DEFAULT 0,
  ipl_economy REAL NOT NULL DEFAULT 0,
  previous_team TEXT NOT NULL DEFAULT 'FA',
  marquee INTEGER NOT NULL DEFAULT 0 CHECK (marquee IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_players_set ON players(set_order, overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_role ON players(role);
CREATE INDEX IF NOT EXISTS idx_players_capped ON players(is_capped, is_overseas);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  initial_purse_lakhs INTEGER NOT NULL DEFAULT 12000,
  max_squad_size INTEGER NOT NULL DEFAULT 25,
  min_squad_size INTEGER NOT NULL DEFAULT 18,
  max_overseas INTEGER NOT NULL DEFAULT 8,
  timer_seconds INTEGER NOT NULL DEFAULT 15,
  player_pool_limit INTEGER NOT NULL DEFAULT 550,
  current_lot_id TEXT,
  auction_round INTEGER NOT NULL DEFAULT 1,
  accelerated_mode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status, visibility);

CREATE TABLE IF NOT EXISTS room_teams (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  team_code TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  owner_name TEXT,
  is_bot INTEGER NOT NULL DEFAULT 0 CHECK (is_bot IN (0, 1)),
  bot_strategy TEXT,
  purse_remaining_lakhs INTEGER NOT NULL DEFAULT 12000,
  squad_count INTEGER NOT NULL DEFAULT 0,
  overseas_count INTEGER NOT NULL DEFAULT 0,
  is_ready INTEGER NOT NULL DEFAULT 0 CHECK (is_ready IN (0, 1)),
  is_connected INTEGER NOT NULL DEFAULT 0 CHECK (is_connected IN (0, 1)),
  joined_at TEXT,
  UNIQUE(room_id, team_code)
);

CREATE INDEX IF NOT EXISTS idx_room_teams_room ON room_teams(room_id);
CREATE INDEX IF NOT EXISTS idx_room_teams_user ON room_teams(room_id, user_id);

CREATE TABLE IF NOT EXISTS auction_lots (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  set_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ON_BLOCK', 'SOLD', 'UNSOLD')),
  base_price_lakhs INTEGER NOT NULL,
  current_bid_lakhs INTEGER,
  current_bidder_team TEXT,
  sold_to_team TEXT,
  sold_price_lakhs INTEGER,
  round_offered INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lots_room_order ON auction_lots(room_id, lot_number);
CREATE INDEX IF NOT EXISTS idx_lots_room_status ON auction_lots(room_id, status);
CREATE INDEX IF NOT EXISTS idx_lots_sold_team ON auction_lots(room_id, sold_to_team);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_code TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  amount_lakhs INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bids_room_lot ON bids(room_id, lot_id, amount_lakhs DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  team_code TEXT,
  message_type TEXT NOT NULL DEFAULT 'USER' CHECK (message_type IN ('USER', 'SYSTEM', 'REACTION')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_room_created ON chat_messages(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analysis_reports (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  rankings_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

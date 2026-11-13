-- =============================================================================
-- Migration 003: Post-Auction Franchise Trade Window
-- =============================================================================

ALTER TABLE rooms ADD COLUMN trade_window_active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN trade_window_ends_at INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS room_trades (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  proposer_team TEXT NOT NULL,
  receiver_team TEXT NOT NULL,
  offered_player_ids TEXT NOT NULL,
  requested_player_ids TEXT NOT NULL,
  purse_transfer_lakhs INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trades_room ON room_trades(room_id, status);


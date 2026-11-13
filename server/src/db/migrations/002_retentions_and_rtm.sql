-- =============================================================================
-- Migration 002: Pre-Auction Retentions and Right-To-Match (RTM) Cards
-- =============================================================================

ALTER TABLE room_teams ADD COLUMN rtm_cards_remaining INTEGER NOT NULL DEFAULT 6;
ALTER TABLE room_teams ADD COLUMN retentions_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE auction_lots ADD COLUMN is_retention INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auction_lots ADD COLUMN is_rtm_buy INTEGER NOT NULL DEFAULT 0;


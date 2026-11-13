# DATABASE SCHEMA — SQLite (`better-sqlite3`)

Migration file location: `server/src/db/migrations/001_initial_schema.sql`  
Runtime settings: `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`

---

## Tables Overview

### 1. `_migrations`
Tracks applied SQL schema migrations idempotently.
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Sequential migration ID |
| `filename` | `TEXT NOT NULL UNIQUE` | Applied `.sql` filename |
| `applied_at` | `TEXT NOT NULL` | UTC timestamp |

### 2. `users`
Stores both registered owners (`is_guest = 0`) and instant-play guest sessions (`is_guest = 1`).
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | UUID v4 |
| `username` | `TEXT NOT NULL UNIQUE` | Unique handle |
| `email` | `TEXT UNIQUE` | Email (nullable for guests) |
| `password_hash` | `TEXT` | `bcryptjs` 10-round hash (nullable for guests) |
| `display_name` | `TEXT NOT NULL` | Broadcast owner display name |
| `is_guest` | `INTEGER NOT NULL DEFAULT 0` | `0` = registered, `1` = guest |
| `avatar_color` | `TEXT NOT NULL` | Hex badge color |
| `created_at` | `TEXT NOT NULL` | Creation timestamp |
| `updated_at` | `TEXT NOT NULL` | Last update timestamp |

### 3. `players`
Master pool of **588 registered IPL cricket players**.
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY` | Deterministic catalog ID (`1..588`) |
| `name` | `TEXT NOT NULL` | Full cricketer name |
| `country` | `TEXT NOT NULL` | Country of representation |
| `is_overseas` | `INTEGER NOT NULL` | `0` = Indian, `1` = Overseas |
| `is_capped` | `INTEGER NOT NULL` | `1` = Capped International, `0` = Uncapped |
| `role` | `TEXT NOT NULL` | `'WK'`, `'BAT'`, `'AR'`, or `'BOWL'` |
| `batting_style` | `TEXT NOT NULL` | `'RHB'` or `'LHB'` |
| `bowling_style` | `TEXT NOT NULL` | Bowling arm/type or `'None'` |
| `speciality` | `TEXT NOT NULL` | Broadcast scouting tag |
| `base_price_lakhs` | `INTEGER NOT NULL` | Registered IPL base price (`30`–`200` Lakhs) |
| `auction_set` | `TEXT NOT NULL` | Set code (`M1`, `M2`, `BA1`, `UWK1`, etc.) |
| `set_order` | `INTEGER NOT NULL` | Auction presentation sequence |
| `overall_rating` | `INTEGER NOT NULL` | Composite rating (`70`–`98`) |
| `batting_rating` | `INTEGER NOT NULL` | Batting skill (`10`–`98`) |
| `bowling_rating` | `INTEGER NOT NULL` | Bowling skill (`10`–`99`) |
| `fielding_rating` | `INTEGER NOT NULL` | Fielding skill (`72`–`96`) |
| `powerplay_rating` | `INTEGER NOT NULL` | Powerplay impact (`70`–`98`) |
| `death_rating` | `INTEGER NOT NULL` | Death-overs impact (`68`–`99`) |
| `ipl_matches` | `INTEGER NOT NULL` | Career T20/IPL matches |
| `ipl_runs` | `INTEGER NOT NULL` | Career T20/IPL runs |
| `ipl_strike_rate` | `REAL NOT NULL` | Batting strike rate |
| `ipl_wickets` | `INTEGER NOT NULL` | Career T20/IPL wickets |
| `ipl_economy` | `REAL NOT NULL` | Bowling economy rate |
| `previous_team` | `TEXT NOT NULL` | Previous IPL team or `'FA'` |
| `marquee` | `INTEGER NOT NULL` | `1` if Marquee Set (`M1`/`M2`) |

### 4. `rooms`
Represents an independent 10-team auction room.
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | UUID v4 |
| `code` | `TEXT NOT NULL UNIQUE` | 6-character invite code (e.g., `IPL9X4`) |
| `name` | `TEXT NOT NULL` | Room title |
| `host_user_id` | `TEXT NOT NULL` | FK -> `users(id)` |
| `status` | `TEXT NOT NULL` | `'WAITING'`, `'ACTIVE'`, `'PAUSED'`, `'COMPLETED'` |
| `visibility` | `TEXT NOT NULL` | `'PUBLIC'` or `'PRIVATE'` |
| `initial_purse_lakhs` | `INTEGER NOT NULL` | Default `12000` (`₹120.00 Cr`) |
| `max_squad_size` | `INTEGER NOT NULL` | Default `25` |
| `min_squad_size` | `INTEGER NOT NULL` | Default `18` |
| `max_overseas` | `INTEGER NOT NULL` | Default `8` |
| `timer_seconds` | `INTEGER NOT NULL` | Countdown seconds per lot (`10`–`30`) |
| `player_pool_limit` | `INTEGER NOT NULL` | Total player lots in room (`588`) |
| `current_lot_id` | `TEXT` | Active `ON_BLOCK` lot UUID |
| `auction_round` | `INTEGER NOT NULL` | Round counter (`1` = Initial, `2+` = Unsold Re-auction) |
| `accelerated_mode` | `INTEGER NOT NULL` | `1` when rapid 7s countdown enabled |
| `created_at` / `started_at` / `completed_at` | `TEXT` | Lifecycle timestamps |

### 5. `room_teams`
10 rows per room (`CSK`, `MI`, `RCB`, `KKR`, `SRH`, `RR`, `DC`, `PBKS`, `GT`, `LSG`). `UNIQUE(room_id, team_code)`.
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | UUID v4 |
| `room_id` | `TEXT NOT NULL` | FK -> `rooms(id)` |
| `team_code` | `TEXT NOT NULL` | Franchise code |
| `user_id` | `TEXT` | FK -> `users(id)` when human-owned |
| `owner_name` | `TEXT` | Cached display name or `AI GM (...)` |
| `is_bot` | `INTEGER NOT NULL` | `1` if managed by AI Bot GM |
| `bot_strategy` | `TEXT` | `'BALANCED'`, `'AGGRESSIVE'`, `'MONEYBALL'`, `'STAR_HUNTER'` |
| `purse_remaining_lakhs` | `INTEGER NOT NULL` | Remaining purse in Lakhs |
| `squad_count` | `INTEGER NOT NULL` | Bought player count |
| `overseas_count` | `INTEGER NOT NULL` | Bought overseas player count |
| `is_ready` / `is_connected` | `INTEGER NOT NULL` | Lobby ready & live socket presence |

### 6. `auction_lots`
Per-room status of every player in the auction pool (`UNIQUE(room_id, player_id)`).
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | UUID v4 |
| `room_id` | `TEXT NOT NULL` | FK -> `rooms(id)` |
| `player_id` | `INTEGER NOT NULL` | FK -> `players(id)` |
| `lot_number` | `INTEGER NOT NULL` | Presentation order (`1..588`) |
| `set_name` | `TEXT NOT NULL` | Set identifier |
| `status` | `TEXT NOT NULL` | `'UPCOMING'`, `'ON_BLOCK'`, `'SOLD'`, `'UNSOLD'` |
| `base_price_lakhs` | `INTEGER NOT NULL` | Starting price |
| `current_bid_lakhs` / `current_bidder_team` | `INTEGER` / `TEXT` | Live highest bid |
| `sold_to_team` / `sold_price_lakhs` | `TEXT` / `INTEGER` | Final hammer outcome |

### 7. `bids`, `chat_messages`, and `analysis_reports`
- `bids`: Immutable audit trail of every valid paddle raise (`id`, `room_id`, `lot_id`, `player_id`, `team_code`, `user_id`, `amount_lakhs`, `created_at`).
- `chat_messages`: Room text messages (`USER`), gavel announcements (`SYSTEM`), and emoji bursts (`REACTION`).
- `analysis_reports`: Cached post-auction AI team rankings (`rankings_json`, `summary_json`, `generated_at`).

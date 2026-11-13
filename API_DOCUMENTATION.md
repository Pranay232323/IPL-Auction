# REST API DOCUMENTATION

Base Path: `/api`  
Authentication Header (where marked 🔒): `Authorization: Bearer <JWT>`

---

## 1. System Health
### `GET /api/health`
Returns server health, seeded player count, and LiveKit configuration flag.
```json
{
  "status": "ok",
  "timestamp": "2026-11-11T12:00:00.000Z",
  "playerCatalogCount": 588,
  "livekitConfigured": false
}
```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
Registers a permanent franchise owner account with `bcryptjs` password hashing.
- **Body**: `{ "username": "virat_18", "email": "vk@rcb.in", "password": "secret123", "displayName": "King Kohli" }`
- **Responses**: `201 { user, token }`, `400` validation error, `409` duplicate username/email.

### `POST /api/auth/login`
Authenticates by username or email.
- **Body**: `{ "identifier": "virat_18", "password": "secret123" }`
- **Responses**: `200 { user, token }`, `401` invalid credentials.

### `POST /api/auth/guest`
Creates a persisted guest user row and returns a signed JWT for frictionless instant play.
- **Body**: `{ "displayName": "Captain Cool" }`
- **Responses**: `201 { user, token }`.

### `GET /api/auth/me` 🔒
Returns `{ user }` for the active Bearer token.

### `PATCH /api/auth/profile` 🔒
Updates `displayName` and returns refreshed `{ user, token }`.

---

## 3. Master IPL Player Pool (`/api/players`)

### `GET /api/players/meta`
Returns catalog counts (`total: 588`, `capped`, `uncapped`, `overseas`, `indian`, `wk`, `bat`, `ar`, `bowl`), official set metadata, and all 10 IPL franchise definitions.

### `GET /api/players`
Returns filtered list of registered IPL players.
- **Query Params** (all optional):
  - `role`: `WK` | `BAT` | `AR` | `BOWL`
  - `capped`: `1` | `0`
  - `overseas`: `1` | `0`
  - `set`: e.g., `M1`, `BA1`, `UWK1`
  - `search`: substring match on name, country, or speciality

---

## 4. Multiplayer Auction Rooms (`/api/rooms`)

### `GET /api/rooms`
Lists active/recent `PUBLIC` rooms with human/bot counts, timer settings, and sold progress.

### `POST /api/rooms` 🔒
Creates a new 10-franchise auction room (`₹120.00 Cr` purse, `588` player lots).
- **Body**:
  ```json
  {
    "name": "IPL Mega Auction Finals",
    "visibility": "PUBLIC",
    "timerSeconds": 15,
    "preferredTeam": "CSK",
    "fillBots": true
  }
  ```
- **Response**: `201 { room: RoomSnapshot }`.

### `GET /api/rooms/:code`
Returns full `RoomSnapshot` for room `:code`.

### `GET /api/rooms/:code/lots`
Returns room-specific player lots with live status, bids, and buyer details.
- **Query Params**: `status` (`UPCOMING` | `ON_BLOCK` | `SOLD` | `UNSOLD`), `role`, `capped` (`1`|`0`), `overseas` (`1`|`0`), `teamCode` (`CSK`..`LSG`), `search`.

### `GET /api/rooms/:code/analysis`
Computes (or returns cached) **Post-Auction AI Team Analysis & Rank-Wise Standings (`#1`–`#10`)**. Pass `?refresh=1` to force live recalculation mid-auction or post-auction.

---

## 5. Voice Communication (`/api/voice`)

### `GET /api/voice/config`
Returns `{ provider: 'livekit' | 'webrtc-mesh', livekitConfigured: boolean, livekitUrl: string | null, iceServers: [...], setupHint: string | null }`.

### `POST /api/voice/token` 🔒
Issues a signed `livekit-server-sdk` `AccessToken` JWT scoped to `ipl-auction-<CODE>` when LiveKit SFU env vars (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) are configured; returns `503` with explicit fallback guidance when unconfigured.

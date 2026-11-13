# ARCHITECTURE — Real-Time Multiplayer IPL Mega Auction

## 1. High-Level System Overview

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        Browser Clients (Up to 10/Room)                     │
│  React 18 + Tailwind CSS Broadcast UI (Mobile / Tablet / Desktop)          │
│  ├─ AuthContext (JWT + Tab-Isolated Multi-Player Session Support)          │
│  ├─ Socket.IO Client ('/socket.io' relative origin)                        │
│  ├─ Voice Engine: LiveKit Client SFU  <--OR-->  WebRTC P2P Audio Mesh      │
│  └─ Web Audio API Synthesizer (Paddle Blip, Countdown Tick, Sold Gavel)    │
└───────────────────────────────┬───────────────────────┬────────────────────┘
                                │ REST (/api/*)         │ WebSocket (/socket.io)
                                ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   Node.js + Express + Socket.IO Server                     │
│  ├─ Security Layer: Helmet, CORS, Express-Rate-Limit, Zod Validation       │
│  ├─ Auth Service: bcryptjs Password Hashing + Signed JWT Middleware        │
│  ├─ AuctionEngineManager (Per-Room Isolated State Machine + Timers)        │
│  │    ├─ Atomic Bid Validation & Slab Calculator                           │
│  │    ├─ Smart AI Bot Franchise GM Scheduler                               │
│  │    └─ Server-Timestamped 250ms Countdown Broadcasts                     │
│  ├─ LiveKit Service: Official `livekit-server-sdk` AccessToken Issuer      │
│  └─ Team Analysis Engine: Optimal XI Hill-Climber + #1–#10 Rank Predictor  │
└──────────────────────────────────────────┬─────────────────────────────────┘
                                           │ Synchronous ACID Transactions
                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 SQLite (`better-sqlite3`, WAL Mode, FK=ON)                 │
│  `users` • `players` (588) • `rooms` • `room_teams` • `auction_lots`       │
│  `bids` • `chat_messages` • `analysis_reports` • `_migrations`             │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```text
ipl-auction/
├── client/                         # Frontend React + TypeScript SPA
│   ├── index.html
│   └── src/
│       ├── api/http.ts             # Relative-path fetch wrapper & token storage
│       ├── components/             # Modular UI components
│       │   ├── Navbar.tsx
│       │   ├── AuthScreen.tsx
│       │   ├── LobbyDirectory.tsx
│       │   ├── MasterPlayerCatalogModal.tsx
│       │   ├── WaitingRoomView.tsx
│       │   ├── AuctionStage.tsx
│       │   ├── TeamsOverviewPanel.tsx
│       │   ├── RoomPlayerListsPanel.tsx
│       │   ├── VoiceAndChatPanel.tsx
│       │   └── AnalysisDashboard.tsx
│       ├── context/AuthContext.tsx
│       ├── hooks/useSocket.ts
│       ├── pages/RoomArenaPage.tsx
│       ├── types/index.ts
│       └── utils/{format.ts,sound.ts}
├── server/                         # Backend Express + Socket.IO + SQLite
│   ├── src/
│   │   ├── config/env.ts           # Typed environment parser
│   │   ├── data/                   # 588 Registered IPL Players dataset
│   │   │   ├── iplPlayersCapped.ts
│   │   │   ├── iplPlayersUncapped.ts
│   │   │   └── iplPlayers.ts
│   │   ├── db/                     # SQLite connection, migrations & seeders
│   │   │   ├── migrations/001_initial_schema.sql
│   │   │   ├── connection.ts
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts
│   │   ├── middleware/authMiddleware.ts
│   │   ├── routes/                 # Modular Express routers
│   │   │   ├── authRoutes.ts
│   │   │   ├── playerRoutes.ts
│   │   │   ├── roomRoutes.ts
│   │   │   └── voiceRoutes.ts
│   │   ├── services/               # Core business logic
│   │   │   ├── authService.ts
│   │   │   ├── auctionEngine.ts
│   │   │   ├── livekitService.ts
│   │   │   └── teamAnalysisService.ts
│   │   ├── socket/socketHandler.ts # Real-time Socket.IO event router
│   │   ├── types/domain.ts
│   │   ├── app.ts                  # Express + Socket.IO factory
│   │   └── index.ts                # Process entrypoint & graceful shutdown
│   └── tests/                      # Automated Vitest + Supertest + Socket.IO suites
│       ├── catalog-and-auth.test.ts
│       └── multiplayer-auction.test.ts
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.{server,client}.json
```

## 3. Concurrency & Server Authority
- **No Client-Side Trust**: Clients submit `{ roomCode, teamCode, amountLakhs? }`. The server verifies JWT ownership of `teamCode`, room `ACTIVE` state, countdown expiry, self-bid check, max 25 squad size, max 8 overseas cap, and `amountLakhs <= purse_remaining_lakhs` inside a single synchronous `better-sqlite3` transaction.
- **Multi-Room Isolation**: `AuctionEngineManager` stores per-room timers in `Map<roomCode, RoomRuntime>` and scopes Socket.IO broadcasts strictly to `room:<CODE>` and `voice:<CODE>`.
- **Clock Synchronization**: Every state/tick payload carries `serverNow` alongside `timerEndsAt`, enabling clients to compute `serverOffsetMs = serverNow - Date.now()` so all 10 browsers display identical countdowns regardless of local system clock skew.

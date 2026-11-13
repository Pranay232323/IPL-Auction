# Real-Time Multiplayer IPL Mega Auction Game 🏏🔨

A complete, server-authoritative **10-Player Real-Time Multiplayer IPL Mega Auction** web application built with **TypeScript, Node.js, Express, Socket.IO, SQLite (`better-sqlite3`), LiveKit Voice SDK + Built-in WebRTC Mesh Fallback, React 18, and Tailwind CSS**.

---

## Key Features

- **10 Official-Style IPL Franchises**: Claim `CSK`, `MI`, `RCB`, `KKR`, `SRH`, `RR`, `DC`, `PBKS`, `GT`, or `LSG` in real time across multiple independent auction rooms.
- **₹120.00 Crore Purse & Official Mega Auction Rules**:
  - Purse: **₹120.00 Cr** (`12,000 Lakhs` integer accounting — zero floating-point drift).
  - Squad Limits: **18–25 players** per team, maximum **8 Overseas players** (`4` max in Playing XI).
  - Official IPL Bid Slab Increments:
    - `< ₹1.00 Cr`: `+₹5 Lakhs`
    - `₹1.00 Cr – ₹1.99 Cr`: `+₹10 Lakhs`
    - `₹2.00 Cr – ₹4.99 Cr`: `+₹20 Lakhs`
    - `₹5.00 Cr+`: `+₹25 Lakhs`
    - Plus server-validated **Jump Bids** (`+25L`, `+50L`, `+1 Cr`) and **Pass** votes.
- **588 Real Registered IPL Players**:
  - Curated catalog of **588 unique real cricket players** (**392 Capped / 196 Uncapped**, **282 Indian / 306 Overseas**) across **Wicketkeepers (`WK`), Batters (`BAT`), All-Rounders (`AR`), and Bowlers (`BOWL`)**, organized into authentic Marquee, Capped, and Uncapped sets (`M1`, `M2`, `BA1`, `AL1`, `WK1`, `FA1`, `SP1`, `UBA1`...).
- **Live Voice Call & Live Text Chat**:
  - **Primary Voice Engine**: Official **LiveKit SFU** (`livekit-server-sdk` + `livekit-client`) when `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are configured in `.env`.
  - **Out-of-the-Box Free Voice Fallback**: Built-in **WebRTC P2P Audio Mesh** signaled over Socket.IO when LiveKit credentials are not configured—so up to 10 players get working browser voice chat immediately with zero external paid keys.
  - **Live Room Chat & Floating Reactions**: Persistent room chat, franchise badges, bid history log, and live broadcast emoji reactions (`🔥 🔨 💰 😱 👏 😂 🧠 💔`).
- **Smart AI Franchise GMs**: Optional AI General Managers (`BALANCED`, `AGGRESSIVE`, `MONEYBALL`, `STAR_HUNTER`) can fill any open franchise slots while still letting human players take over slots in the lobby.
- **Post-Auction Quick Analysis & Rank-Wise Predictor (`#1` to `#10`)**:
  - Solves each team's **Optimal Playing XI (strictly enforcing max 4 Overseas + Wicketkeeper + 5+ Bowling options) + #12 Impact Player**.
  - Scores 7 cricket dimensions (`Batting`, `Pace`, `Spin`, `All-Round Balance`, `Death & Finishing`, `Squad Depth`, `Moneyball ROI`) and predicts **Rank #1 Champion, Top 4 Playoff Qualifiers, Tier Grades (`S+`–`D`), Title Win Probability `%`, MVP, Best Value Steal, Most Expensive Buy, Strengths & Weaknesses**.
- **Responsive Design**: Tailored layouts for **Mobile Phones, Tablets, and Desktops** (mobile tab navigation keeps active voice calls mounted without dropping audio).

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js** `v20+` (and `npm v10+`)
- C++ build tools for `better-sqlite3` if prebuilt binary is not available for your OS/arch (standard on macOS Xcode CLT / Linux `build-essential` / Windows VS Build Tools).

### 1. Install & Configure
```bash
cp .env.example .env
npm install
```

### 2. Run Database Migrations & Seed 588 IPL Players
```bash
npm run db:migrate
npm run db:seed
```
*(Note: The server also auto-migrates and auto-seeds on first boot if the database does not exist yet.)*

### 3. Start Full-Stack Development Mode
```bash
npm run dev
```
- **Frontend (Vite HMR)**: `http://localhost:5173` (proxies `/api` and `/socket.io` WebSockets to backend)
- **Backend API & Socket.IO**: `http://localhost:4000`

### 4. Production Unified Build & Single-Port Start
```bash
npm run build
npm start
```
Serves both the compiled React SPA (`dist/client`) and Express + Socket.IO server on `http://0.0.0.0:4000`.

### 5. Run Automated Tests & Typechecks
```bash
npm run typecheck
npm test
```

---

## Testing Multiplayer on a Single Laptop
1. Open the app in Browser Tab 1 and click **Instant Play** (or Register/Login), then create a room and copy the 6-character **Room Code**.
2. Open Browser Tab 2, click **New Tab Player** in the top navigation bar to create a tab-isolated player identity, and join the same Room Code to test live multi-player franchise claiming, bidding, chat, and voice!

---

## Enabling LiveKit SFU Voice Server (Optional Upgrade)
Out of the box, voice calls work immediately via the built-in WebRTC P2P Mesh. To switch to **LiveKit SFU**:
1. Create a free project at [LiveKit Cloud](https://cloud.livekit.io) or run `livekit-server --dev` locally (`ws://localhost:7880`).
2. Add your credentials to `.env`:
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=APIxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Restart the server—`/api/voice/config` will automatically switch `provider` to `"livekit"`.

---

## Project Memory Documentation Index
- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — Product goals, domain rules, and design decisions
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Modular full-stack architecture & runtime state machine
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — SQLite tables, indexes, and persistence guarantees
- [`SOCKET_EVENTS.md`](./SOCKET_EVENTS.md) — Client-to-server & server-to-client Socket.IO contracts
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — REST endpoints, request/response schemas & auth
- [`DEVELOPMENT_STATUS.md`](./DEVELOPMENT_STATUS.md) — Completed features & honest credential notes
- [`TODO.md`](./TODO.md) — Future roadmap & continuation instructions

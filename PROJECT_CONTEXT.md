# PROJECT CONTEXT — Real-Time Multiplayer IPL Mega Auction

## 1. Product Vision
This project implements a complete, browser-based **Real-Time 10-Player Multiplayer IPL Mega Auction Game**. Up to 10 participants join an auction room, select one of the 10 IPL franchises (`CSK`, `MI`, `RCB`, `KKR`, `SRH`, `RR`, `DC`, `PBKS`, `GT`, `LSG`), and compete with a **₹120.00 Crore (`12,000 Lakhs`)** purse to build balanced cricket squads from **588 real registered IPL players**. Players communicate live via **Voice Call (LiveKit SFU + WebRTC Mesh fallback)** and **Live Text Chat**, and upon auction completion receive an instant **AI Team Analysis & Rank-Wise Best Team Prediction (`#1` to `#10`)**.

## 2. Authentic IPL Mega Auction Rules Enforced
1. **Franchises per Room**: Exactly 10 IPL franchises (`CSK`–`LSG`). Multiple independent rooms can run simultaneously.
2. **Purse**: `₹120.00 Cr` (`12,000 Lakhs`) per franchise. All monetary calculations use integer **Lakhs** (`1 Cr = 100 Lakhs`) to eliminate floating-point rounding bugs.
3. **Squad Constraints**:
   - Maximum Squad Size: **25 players**
   - Minimum Target Squad Size: **18 players**
   - Maximum Overseas Players per Squad: **8 players**
   - Maximum Overseas Players in Playing XI: **4 players**
4. **Official Bid Slab Increments**:
   - Opening bid = Player's registered `base_price_lakhs` (`₹30L`, `₹50L`, `₹75L`, `₹1.00 Cr`, `₹1.25 Cr`, `₹1.50 Cr`, `₹2.00 Cr`).
   - Current bid `< 100L` (`< ₹1 Cr`): `+5L`
   - Current bid `100L–199L` (`₹1 Cr – ₹1.99 Cr`): `+10L`
   - Current bid `200L–499L` (`₹2 Cr – ₹4.99 Cr`): `+20L`
   - Current bid `>= 500L` (`₹5 Cr+`): `+25L`
   - Jump Bids permitted in multiples of `₹5L` above the minimum next slab, strictly capped by remaining purse.
5. **Player Categories**:
   - Roles: Wicketkeeper (`WK`), Batter (`BAT`), All-Rounder (`AR`), Bowler (`BOWL`).
   - Status: **Capped** (`392` players) vs **Uncapped** (`196` players).
   - Nationality: **Indian** (`282` players) vs **Overseas** (`306` players).
   - Live Auction Lists: **Upcoming Pool**, **Sold List**, **Unsold List**, and **Team Squads**.

## 3. Key Technical Decisions
- **SQLite (`better-sqlite3`) in WAL Mode**: Provides zero-dependency local ACID transactions so any developer can clone/unzip and run `npm install && npm run dev` without needing an external PostgreSQL/Redis server, while guaranteeing serialized atomic bid persistence.
- **Dual-Mode Live Voice (`LiveKit SFU` + `WebRTC P2P Mesh`)**: Integrates official `livekit-server-sdk` and `livekit-client` for production SFU voice scaling, while providing an automatic built-in WebRTC Mesh fallback signaled over Socket.IO when `.env` lacks LiveKit Cloud credentials—ensuring zero broken/mock voice buttons out of the box.
- **Deterministic + Optional Hybrid LLM Team Analysis Engine**: Runs a constrained hill-climbing Playing XI + Impact Sub optimizer and 7-dimension cricket analytics model locally in `<20ms` (free, deterministic, zero API key required), with optional OpenAI pundit prose enhancement if `OPENAI_API_KEY` is supplied.

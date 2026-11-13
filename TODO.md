# TODO & CONTINUATION ROADMAP

All core MVP requirements across Workstreams 1–7 are implemented, integrated, and verified via automated tests. Below are optional post-MVP enhancements and exact instructions for continuing in a future session.

---

## Optional Future Enhancements (Post-MVP)
- [ ] **Right-To-Match (RTM) Cards & Pre-Auction Retentions**: Add an optional room toggle allowing each franchise up to 2 RTM cards matching the winning bid on players whose `previous_team` matches their franchise.
- [ ] **Trade Window Between Franchises**: Post-auction 5-minute player-for-player / purse-adjusted trade window before locking final rankings.
- [ ] **Simulated IPL League Season Engine**: Ball-by-ball T20 season simulator using each franchise's Optimal Playing XI + Impact Sub to play a 14-match league table + Qualifier 1, Eliminator, Qualifier 2, and Final.
- [ ] **Export Squad & Rankings PDF/CSV**: One-click CSV/image scorecard export of all 10 drafted squads and `#1`–`#10` rankings.
- [ ] **Horizontal Scaling Adapter (`@socket.io/redis-adapter` + PostgreSQL)**: Swap SQLite to PostgreSQL and attach Redis pub/sub if scaling across multiple stateless Node.js container replicas.

---

## Exact Continuation Instructions for Another Session
1. **Unpack & Install**:
   ```bash
   unzip ipl-auction-game.zip
   cd ipl-auction
   cp .env.example .env
   npm install
   ```
2. **Database & Tests Verification**:
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run typecheck
   npm test
   ```
3. **Configure External LiveKit SFU (Optional)**:
   - Populate `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `.env` (from [LiveKit Cloud](https://cloud.livekit.io) free tier or `livekit-server --dev`).
   - Verify `GET /api/voice/config` returns `{ "provider": "livekit", "livekitConfigured": true }`.
4. **Configure Optional LLM Pundit Prose**:
   - Populate `OPENAI_API_KEY` in `.env` to append GPT-generated broadcast commentary onto the deterministic 7-factor cricket analytics report.

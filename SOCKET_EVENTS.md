# SOCKET.IO EVENTS CONTRACT

**Endpoint**: `/socket.io`  
**Authentication**: Handshake requires `{ auth: { token: "<JWT>" } }` (or `Authorization: Bearer <JWT>` header). Unauthenticated connections are rejected with `AUTH_REQUIRED`.

---

## 1. Client -> Server Events (with Optional Ack Callback)

| Event Name | Payload | Description |
|---|---|---|
| `room:join` | `{ roomCode: string }` | Subscribes socket to `room:<CODE>`, marks franchise connected, returns `{ ok, room, voiceParticipants }`. |
| `room:leave` | `{ roomCode: string }` | Leaves room & cleans up active voice peer if joined. |
| `room:claim_team` | `{ roomCode: string, teamCode: TeamCode }` | Atomically claims an open (or bot-held in lobby) IPL franchise (`CSK`..`LSG`). |
| `room:ready` | `{ roomCode: string, isReady: boolean }` | Updates owner ready state in lobby. |
| `room:configure_bots` | `{ roomCode: string, mode: 'FILL_EMPTY' \| 'CLEAR_BOTS' \| 'TOGGLE_TEAM', teamCode?: TeamCode }` | Host-only AI GM slot configuration. |
| `auction:start` | `{ roomCode: string }` | Host-only: transitions room `WAITING -> ACTIVE` and presents Lot #1. |
| `auction:bid` | `{ roomCode: string, teamCode: TeamCode, amountLakhs?: number }` | Server-validated paddle raise (next slab by default, or jump bid `amountLakhs`). |
| `auction:pass` | `{ roomCode: string }` | Marks caller's franchise as passing on current lot; fast-forwards clock if all humans pass. |
| `auction:pause` | `{ roomCode: string }` | Host-only: freezes countdown timer and pauses bidding. |
| `auction:resume` | `{ roomCode: string }` | Host-only: resumes countdown from exact paused milliseconds. |
| `auction:skip` | `{ roomCode: string }` | Host-only: drops gavel immediately on current lot (`SOLD` if bid exists, else `UNSOLD`). |
| `auction:accelerated` | `{ roomCode: string, enabled: boolean }` | Host-only: toggles 7-second rapid countdown mode. |
| `auction:unsold_round` | `{ roomCode: string }` | Host-only: re-enters `UNSOLD` players into `UPCOMING` for an Accelerated Round. |
| `auction:finish` | `{ roomCode: string }` | Host-only: ends auction and generates final `#1`–`#10` AI Team Analysis Report. |
| `chat:send` | `{ roomCode: string, content: string }` | Sends sanitized text message (`1–280` chars) to room chat. |
| `chat:react` | `{ roomCode: string, emoji: string }` | Broadcasts floating emoji reaction (`🔥 🔨 💰 😱 👏 😂 🧠 💔`). |
| `voice:join` | `{ roomCode: string, teamCode?: TeamCode \| null }` | Joins WebRTC P2P voice mesh room, returns `{ ok, selfSocketId, existingPeers }`. |
| `voice:leave` | `{ roomCode: string }` | Leaves WebRTC voice room and notifies peers. |
| `voice:signal` | `{ roomCode: string, targetSocketId: string, type: 'offer' \| 'answer' \| 'ice-candidate', sdp?: object, candidate?: object }` | Relays WebRTC SDP/ICE signaling packet to target peer. |
| `voice:mute` | `{ roomCode: string, muted: boolean }` | Updates microphone mute indicator across room participants. |

---

## 2. Server -> Client Broadcast Events

| Event Name | Payload | Description |
|---|---|---|
| `room:state` | `RoomSnapshot` | Authoritative room snapshot (10 teams, purses, current lot, counts, recent chat & bids). |
| `auction:lot_started` | `{ currentLot, timerEndsAt, serverNow, counts }` | Fired when a new player is placed `ON_BLOCK`. |
| `auction:tick` | `{ remainingMs, timerEndsAt, serverNow }` | Emitted every `250ms` during active countdown for drift-free clock sync. |
| `auction:bid_placed` | `{ bid, currentLot, timerEndsAt, serverNow, passedTeams }` | Fired immediately upon an accepted bid; resets countdown timer. |
| `auction:pass_updated` | `{ passedTeams: TeamCode[] }` | Broadcasts franchises that passed on the current lot. |
| `auction:lot_sold` | `{ lotId, player, soldToTeam, soldPriceLakhs, teams, counts }` | Fired on hammer drop with winning bid; triggers 3s celebration stamp. |
| `auction:lot_unsold` | `{ lotId, player, counts }` | Fired on hammer drop with zero bids. |
| `auction:completed` | `{ analysis: RoomAnalysisReport, room: RoomSnapshot }` | Fired when auction finishes; delivers `#1`–`#10` predicted team rankings. |
| `auction:error` | `{ error: string }` | Delivers user-facing validation error message to the caller socket. |
| `chat:message` | `ChatMessageDTO` | Real-time `USER` or `SYSTEM` chat message. |
| `chat:reaction` | `ChatMessageDTO` | Floating emoji reaction trigger. |
| `voice:participants` | `{ participants: VoicePeerMeta[] }` | Updated roster of active WebRTC voice call participants. |
| `voice:peer_joined` | `{ peer: VoicePeerMeta }` | Notifies voice channel of a newly joined peer. |
| `voice:peer_left` | `{ socketId: string }` | Notifies voice channel to close `RTCPeerConnection` for departed peer. |
| `voice:signal` | `{ fromSocketId, sender, type, sdp?, candidate? }` | Incoming WebRTC SDP Offer/Answer or ICE candidate. |

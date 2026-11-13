import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { AUCTION_SET_LABELS } from '../data/iplPlayers.js';
import { getDb } from '../db/connection.js';
import {
  AUCTION_CONSTANTS,
  BCCI_MAX_RETENTIONS,
  BCCI_MAX_RTM_AND_RETENTIONS,
  BCCI_MAX_UNCAPPED_RETENTIONS,
  BCCI_RETENTION_SLABS_LAKHS,
  BCCI_UNCAPPED_RETENTION_LAKHS,
  BotStrategy,
  formatCurrencyLakhs,
  getNextMinimumBidLakhs,
  IPL_FRANCHISES,
  LotStatus,
  mapPlayerToDTO,
  PlayerDTO,
  PlayerRecord,
  PublicUser,
  RoomStatus,
  RoomVisibility,
  RTMPromptState,
  TeamCode,
  TradeDTO,
  VALID_TEAM_CODES,
} from '../types/domain.js';
import {
  estimateFairValueLakhs,
  generateRoomAnalysis,
  RoomAnalysisReport,
} from './teamAnalysisService.js';

export interface RoomTeamState {
  teamCode: TeamCode;
  teamName: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  userId: string | null;
  ownerName: string | null;
  isBot: boolean;
  botStrategy: BotStrategy | null;
  purseRemainingLakhs: number;
  squadCount: number;
  overseasCount: number;
  rtmCardsRemaining: number;
  retentionsCount: number;
  isReady: boolean;
  isConnected: boolean;
  roleBreakdown: {
    WK: number;
    BAT: number;
    AR: number;
    BOWL: number;
  };
}

export interface ActiveLotState {
  lotId: string;
  lotNumber: number;
  totalLots: number;
  setName: string;
  setLabel: string;
  status: LotStatus;
  basePriceLakhs: number;
  currentBidLakhs: number | null;
  currentBidderTeam: TeamCode | null;
  nextMinBidLakhs: number;
  soldToTeam: TeamCode | null;
  soldPriceLakhs: number | null;
  isRetention?: boolean;
  isRtmBuy?: boolean;
  player: PlayerDTO;
}

export interface RetentionCandidateDTO extends PlayerDTO {
  isRetained: boolean;
  retentionCostLakhs?: number;
}

export interface BidEntryDTO {
  id: string;
  lotId: string;
  playerId: number;
  playerName: string;
  teamCode: TeamCode;
  amountLakhs: number;
  createdAt: string;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  userId: string | null;
  senderName: string;
  teamCode: TeamCode | null;
  messageType: 'USER' | 'SYSTEM' | 'REACTION';
  content: string;
  createdAt: string;
}

export interface RoomSnapshot {
  id: string;
  code: string;
  name: string;
  hostUserId: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  initialPurseLakhs: number;
  maxSquadSize: number;
  minSquadSize: number;
  maxOverseas: number;
  timerSeconds: number;
  auctionRound: number;
  acceleratedMode: boolean;
  tradeWindowActive: boolean;
  tradeWindowEndsAt: number | null;
  serverNow: number;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  passedTeams: TeamCode[];
  counts: {
    totalLots: number;
    upcoming: number;
    sold: number;
    unsold: number;
  };
  teams: RoomTeamState[];
  currentLot: ActiveLotState | null;
  rtmPrompt: RTMPromptState | null;
  recentBids: BidEntryDTO[];
  recentChat: ChatMessageDTO[];
  activeTrades?: TradeDTO[];
}

interface RoomRuntime {
  roomId: string;
  roomCode: string;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  tickInterval: ReturnType<typeof setInterval> | null;
  intermissionTimeout: ReturnType<typeof setTimeout> | null;
  botTimeout: ReturnType<typeof setTimeout> | null;
  rtmTimeout: ReturnType<typeof setTimeout> | null;
  tradeWindowTimeout: ReturnType<typeof setTimeout> | null;
  rtmState: RTMPromptState | null;
  passedTeams: Set<TeamCode>;
  isTransitioning: boolean;
}

const BOT_STRATEGIES: BotStrategy[] = [
  'BALANCED',
  'AGGRESSIVE',
  'MONEYBALL',
  'STAR_HUNTER',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const db = getDb();
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const exists = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
    if (!exists) return code;
  }
  return uuidv4().slice(0, 6).toUpperCase();
}

export class AuctionEngineError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const OFFICIAL_2025_RETENTIONS: Record<TeamCode, string[]> = {
  CSK: ['Ruturaj Gaikwad', 'Ravindra Jadeja', 'Matheesha Pathirana', 'Shivam Dube', 'MS Dhoni'],
  MI: ['Jasprit Bumrah', 'Suryakumar Yadav', 'Hardik Pandya', 'Rohit Sharma', 'Tilak Varma'],
  RCB: ['Virat Kohli', 'Rajat Patidar', 'Yash Dayal'],
  KKR: ['Rinku Singh', 'Varun Chakaravarthy', 'Sunil Narine', 'Andre Russell', 'Harshit Rana'],
  SRH: ['Heinrich Klaasen', 'Pat Cummins', 'Abhishek Sharma', 'Travis Head', 'Nitish Kumar Reddy'],
  RR: ['Sanju Samson', 'Yashasvi Jaiswal', 'Riyan Parag', 'Dhruv Jurel', 'Shimron Hetmyer'],
  DC: ['Axar Patel', 'Kuldeep Yadav', 'Tristan Stubbs', 'Abishek Porel'],
  PBKS: ['Shashank Singh', 'Prabhsimran Singh'],
  GT: ['Rashid Khan', 'Shubman Gill', 'Sai Sudharsan', 'Rahul Tewatia', 'Shahrukh Khan'],
  LSG: ['Nicholas Pooran', 'Ravi Bishnoi', 'Mayank Yadav', 'Mohsin Khan', 'Ayush Badoni'],
};

export function calculateRetentionAllocation(players: (PlayerRecord | PlayerDTO)[]): {
  allocations: { player: PlayerDTO; costLakhs: number }[];
  totalCostLakhs: number;
  cappedCount: number;
  uncappedCount: number;
  overseasCount: number;
} {
  const capped: (PlayerRecord | PlayerDTO)[] = [];
  const uncapped: (PlayerRecord | PlayerDTO)[] = [];

  for (const p of players) {
    const isCapped = 'isCapped' in p ? p.isCapped : Boolean((p as PlayerRecord).is_capped);
    if (isCapped) {
      capped.push(p);
    } else {
      uncapped.push(p);
    }
  }

  capped.sort((a, b) => {
    const aMarquee = 'marquee' in a ? (a.marquee ? 1 : 0) : ((a as PlayerRecord).marquee ? 1 : 0);
    const bMarquee = 'marquee' in b ? (b.marquee ? 1 : 0) : ((b as PlayerRecord).marquee ? 1 : 0);
    if (bMarquee !== aMarquee) return bMarquee - aMarquee;
    const aRating = 'overallRating' in a ? a.overallRating : (a as PlayerRecord).overall_rating;
    const bRating = 'overallRating' in b ? b.overallRating : (b as PlayerRecord).overall_rating;
    return bRating - aRating;
  });

  const slabs = BCCI_RETENTION_SLABS_LAKHS;
  const allocations: { player: PlayerDTO; costLakhs: number }[] = [];
  let totalCostLakhs = 0;
  let overseasCount = 0;

  capped.forEach((p, idx) => {
    const cost = slabs[idx] ?? 1400;
    const dto = 'isCapped' in p ? (p as PlayerDTO) : mapPlayerToDTO(p as PlayerRecord);
    allocations.push({ player: dto, costLakhs: cost });
    totalCostLakhs += cost;
    if (dto.isOverseas) overseasCount++;
  });

  uncapped.forEach((p) => {
    const cost = BCCI_UNCAPPED_RETENTION_LAKHS;
    const dto = 'isCapped' in p ? (p as PlayerDTO) : mapPlayerToDTO(p as PlayerRecord);
    allocations.push({ player: dto, costLakhs: cost });
    totalCostLakhs += cost;
    if (dto.isOverseas) overseasCount++;
  });

  return {
    allocations,
    totalCostLakhs,
    cappedCount: capped.length,
    uncappedCount: uncapped.length,
    overseasCount,
  };
}

export class AuctionEngineManager {
  private io: SocketIOServer | null = null;
  private runtimes = new Map<string, RoomRuntime>();

  attachSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  private socketRoomKey(roomCode: string): string {
    return `room:${roomCode.toUpperCase()}`;
  }

  private getOrCreateRuntime(roomId: string, roomCode: string): RoomRuntime {
    const code = roomCode.toUpperCase();
    let rt = this.runtimes.get(code);
    if (!rt) {
      rt = {
        roomId,
        roomCode: code,
        timerEndsAt: null,
        pausedRemainingMs: null,
        tickInterval: null,
        intermissionTimeout: null,
        botTimeout: null,
        rtmTimeout: null,
        tradeWindowTimeout: null,
        rtmState: null,
        passedTeams: new Set<TeamCode>(),
        isTransitioning: false,
      };
      this.runtimes.set(code, rt);
    }
    return rt;
  }

  private clearRuntimeTimers(rt: RoomRuntime): void {
    if (rt.tickInterval) {
      clearInterval(rt.tickInterval);
      rt.tickInterval = null;
    }
    if (rt.intermissionTimeout) {
      clearTimeout(rt.intermissionTimeout);
      rt.intermissionTimeout = null;
    }
    if (rt.botTimeout) {
      clearTimeout(rt.botTimeout);
      rt.botTimeout = null;
    }
    if (rt.rtmTimeout) {
      clearTimeout(rt.rtmTimeout);
      rt.rtmTimeout = null;
    }
    if (rt.tradeWindowTimeout) {
      clearTimeout(rt.tradeWindowTimeout);
      rt.tradeWindowTimeout = null;
    }
  }

  destroyAllRuntimes(): void {
    for (const rt of this.runtimes.values()) {
      this.clearRuntimeTimers(rt);
    }
    this.runtimes.clear();
  }

  createRoom(params: {
    hostUser: PublicUser;
    name: string;
    visibility?: RoomVisibility;
    timerSeconds?: number;
    fillBots?: boolean;
    preferredTeam?: TeamCode;
  }): RoomSnapshot {
    const db = getDb();
    const roomId = uuidv4();
    const code = generateRoomCode();
    const visibility = params.visibility || 'PUBLIC';
    const timerSeconds = Math.min(45, Math.max(5, params.timerSeconds || 15));
    const initialPurse = AUCTION_CONSTANTS.DEFAULT_PURSE_LAKHS;
    const hostTeam: TeamCode =
      params.preferredTeam && VALID_TEAM_CODES.has(params.preferredTeam)
        ? params.preferredTeam
        : 'CSK';

    const players = db
      .prepare('SELECT id, auction_set, base_price_lakhs FROM players ORDER BY set_order ASC, overall_rating DESC, id ASC')
      .all() as { id: number; auction_set: string; base_price_lakhs: number }[];

    if (players.length === 0) {
      throw new AuctionEngineError(
        'Player catalog is empty. Run database seed first.',
        500
      );
    }

    const createTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO rooms (
          id, code, name, host_user_id, status, visibility,
          initial_purse_lakhs, max_squad_size, min_squad_size, max_overseas,
          timer_seconds, player_pool_limit
        ) VALUES (?, ?, ?, ?, 'WAITING', ?, ?, 25, 18, 8, ?, ?)`
      ).run(
        roomId,
        code,
        params.name.trim(),
        params.hostUser.id,
        visibility,
        initialPurse,
        timerSeconds,
        players.length
      );

      const insertTeam = db.prepare(
        `INSERT INTO room_teams (
          id, room_id, team_code, user_id, owner_name, is_bot, bot_strategy,
          purse_remaining_lakhs, squad_count, overseas_count, is_ready, is_connected, joined_at,
          rtm_cards_remaining, retentions_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, ?, 6, 0)`
      );

      IPL_FRANCHISES.forEach((franchise, idx) => {
        const isHostSlot = franchise.code === hostTeam;
        const makeBot = !isHostSlot && Boolean(params.fillBots);
        const strategy = makeBot
          ? BOT_STRATEGIES[idx % BOT_STRATEGIES.length]
          : null;

        insertTeam.run(
          uuidv4(),
          roomId,
          franchise.code,
          isHostSlot ? params.hostUser.id : null,
          isHostSlot
            ? params.hostUser.displayName
            : makeBot
              ? `AI GM (${franchise.code})`
              : null,
          makeBot ? 1 : 0,
          strategy,
          initialPurse,
          isHostSlot || makeBot ? 1 : 0,
          isHostSlot || makeBot ? new Date().toISOString() : null
        );
      });

      const insertLot = db.prepare(
        `INSERT INTO auction_lots (
          id, room_id, player_id, lot_number, set_name, status, base_price_lakhs
        ) VALUES (?, ?, ?, ?, ?, 'UPCOMING', ?)`
      );

      players.forEach((p, idx) => {
        insertLot.run(
          uuidv4(),
          roomId,
          p.id,
          idx + 1,
          p.auction_set,
          p.base_price_lakhs
        );
      });

      this.insertSystemChat(
        roomId,
        `🏟️ Welcome to "${params.name.trim()}" (Room ${code})! Purse: ₹120.00 Cr per franchise • ${players.length} Registered IPL Players.`
      );
    });

    createTx();
    this.getOrCreateRuntime(roomId, code);
    return this.getRoomSnapshot(code);
  }

  listPublicRooms(): {
    id: string;
    code: string;
    name: string;
    status: RoomStatus;
    timerSeconds: number;
    humanCount: number;
    botCount: number;
    soldCount: number;
    totalPlayers: number;
    createdAt: string;
  }[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
          r.id, r.code, r.name, r.status, r.timer_seconds, r.player_pool_limit, r.created_at,
          SUM(CASE WHEN rt.user_id IS NOT NULL AND rt.is_bot = 0 THEN 1 ELSE 0 END) as human_count,
          SUM(CASE WHEN rt.is_bot = 1 THEN 1 ELSE 0 END) as bot_count,
          (SELECT COUNT(*) FROM auction_lots al WHERE al.room_id = r.id AND al.status = 'SOLD') as sold_count
        FROM rooms r
        LEFT JOIN room_teams rt ON rt.room_id = r.id
        WHERE r.visibility = 'PUBLIC'
        GROUP BY r.id
        ORDER BY
          CASE r.status WHEN 'WAITING' THEN 1 WHEN 'ACTIVE' THEN 2 WHEN 'PAUSED' THEN 3 ELSE 4 END ASC,
          r.created_at DESC
        LIMIT 30`
      )
      .all() as {
      id: string;
      code: string;
      name: string;
      status: RoomStatus;
      timer_seconds: number;
      player_pool_limit: number;
      created_at: string;
      human_count: number;
      bot_count: number;
      sold_count: number;
    }[];

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      status: r.status,
      timerSeconds: r.timer_seconds,
      humanCount: r.human_count || 0,
      botCount: r.bot_count || 0,
      soldCount: r.sold_count || 0,
      totalPlayers: r.player_pool_limit,
      createdAt: r.created_at,
    }));
  }

  claimTeam(params: {
    roomCode: string;
    user: PublicUser;
    teamCode: TeamCode;
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    if (!VALID_TEAM_CODES.has(params.teamCode)) {
      throw new AuctionEngineError('Invalid IPL franchise code.', 400);
    }

    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as { id: string; status: RoomStatus } | undefined;
    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }
    if (room.status === 'COMPLETED') {
      throw new AuctionEngineError('This auction has already concluded.', 400);
    }

    const claimTx = db.transaction(() => {
      const target = db
        .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
        .get(room.id, params.teamCode) as
        | {
            id: string;
            user_id: string | null;
            is_bot: number;
            squad_count: number;
          }
        | undefined;

      if (!target) {
        throw new AuctionEngineError('Franchise slot not found.', 404);
      }

      if (target.user_id && target.user_id !== params.user.id && target.is_bot === 0) {
        throw new AuctionEngineError(
          `${params.teamCode} is already claimed by another player.`,
          409
        );
      }

      // Check if user already holds a different franchise in this room
      const currentOwned = db
        .prepare('SELECT team_code, squad_count FROM room_teams WHERE room_id = ? AND user_id = ?')
        .get(room.id, params.user.id) as
        | { team_code: TeamCode; squad_count: number }
        | undefined;

      if (currentOwned && currentOwned.team_code !== params.teamCode) {
        if (room.status !== 'WAITING') {
          throw new AuctionEngineError(
            `You already manage ${currentOwned.team_code} in this active auction.`,
            400
          );
        }
        db.prepare(
          `UPDATE room_teams
           SET user_id = NULL, owner_name = NULL, is_bot = 0, bot_strategy = NULL, is_ready = 0, is_connected = 0
           WHERE room_id = ? AND team_code = ?`
        ).run(room.id, currentOwned.team_code);
      }

      // Enforce max 10 participants (inherently bounded by 10 franchises)
      db.prepare(
        `UPDATE room_teams
         SET user_id = ?, owner_name = ?, is_bot = 0, bot_strategy = NULL, is_ready = 1, is_connected = 1, joined_at = datetime('now')
         WHERE room_id = ? AND team_code = ?`
      ).run(params.user.id, params.user.displayName, room.id, params.teamCode);

      if (!currentOwned || currentOwned.team_code !== params.teamCode) {
        this.insertSystemChat(
          room.id,
          `🏏 ${params.user.displayName} took charge of ${params.teamCode}!`
        );
      }
    });

    claimTx();
    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  setReadyState(params: {
    roomCode: string;
    userId: string;
    isReady: boolean;
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id FROM rooms WHERE code = ?')
      .get(code) as { id: string } | undefined;
    if (!room) throw new AuctionEngineError('Room not found.', 404);

    db.prepare(
      'UPDATE room_teams SET is_ready = ? WHERE room_id = ? AND user_id = ?'
    ).run(params.isReady ? 1 : 0, room.id, params.userId);

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  configureBotSlots(params: {
    roomCode: string;
    hostUserId: string;
    mode: 'FILL_EMPTY' | 'CLEAR_BOTS' | 'TOGGLE_TEAM';
    teamCode?: TeamCode;
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id, status FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; host_user_id: string; status: RoomStatus }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the room host can manage AI GM slots.', 403);
    }
    if (room.status === 'COMPLETED') {
      throw new AuctionEngineError('Auction is already completed.', 400);
    }

    if (params.mode === 'FILL_EMPTY') {
      const openSlots = db
        .prepare('SELECT team_code FROM room_teams WHERE room_id = ? AND user_id IS NULL AND is_bot = 0')
        .all(room.id) as { team_code: TeamCode }[];

      openSlots.forEach((slot, idx) => {
        const strat = BOT_STRATEGIES[idx % BOT_STRATEGIES.length];
        db.prepare(
          `UPDATE room_teams
           SET is_bot = 1, bot_strategy = ?, owner_name = ?, is_ready = 1
           WHERE room_id = ? AND team_code = ?`
        ).run(strat, `AI GM (${slot.team_code})`, room.id, slot.team_code);
      });
    } else if (params.mode === 'CLEAR_BOTS') {
      if (room.status !== 'WAITING') {
        throw new AuctionEngineError('Cannot clear bots once bidding has begun.', 400);
      }
      db.prepare(
        `UPDATE room_teams
         SET is_bot = 0, bot_strategy = NULL, owner_name = NULL, is_ready = 0
         WHERE room_id = ? AND is_bot = 1`
      ).run(room.id);
    } else if (params.mode === 'TOGGLE_TEAM' && params.teamCode) {
      const slot = db
        .prepare('SELECT user_id, is_bot FROM room_teams WHERE room_id = ? AND team_code = ?')
        .get(room.id, params.teamCode) as
        | { user_id: string | null; is_bot: number }
        | undefined;

      if (!slot) throw new AuctionEngineError('Team not found.', 404);
      if (slot.user_id) {
        throw new AuctionEngineError('Cannot replace a live human owner with a bot.', 400);
      }
      if (slot.is_bot === 1) {
        db.prepare(
          `UPDATE room_teams SET is_bot = 0, bot_strategy = NULL, owner_name = NULL, is_ready = 0
           WHERE room_id = ? AND team_code = ?`
        ).run(room.id, params.teamCode);
      } else {
        const strat =
          BOT_STRATEGIES[Math.floor(Math.random() * BOT_STRATEGIES.length)];
        db.prepare(
          `UPDATE room_teams SET is_bot = 1, bot_strategy = ?, owner_name = ?, is_ready = 1
           WHERE room_id = ? AND team_code = ?`
        ).run(strat, `AI GM (${params.teamCode})`, room.id, params.teamCode);
      }
    }

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  markConnectionStatus(roomCode: string, userId: string, connected: boolean): void {
    try {
      const db = getDb();
      if (!db.open) return;
      const code = roomCode.trim().toUpperCase();
      const room = db
        .prepare('SELECT id, status FROM rooms WHERE code = ?')
        .get(code) as { id: string; status: RoomStatus } | undefined;
      if (!room) return;

      db.prepare(
        'UPDATE room_teams SET is_connected = ? WHERE room_id = ? AND user_id = ?'
      ).run(connected ? 1 : 0, room.id, userId);

      // Ensure active room timer loop is hydrated if server restarted
      if (connected && room.status === 'ACTIVE') {
        const rt = this.getOrCreateRuntime(room.id, code);
        if (!rt.tickInterval && !rt.intermissionTimeout) {
          this.resumeOrHydrateActiveRoom(code);
        }
      }

      this.broadcastRoomState(code);
    } catch {
      // Ignore late socket disconnects after DB shutdown
    }
  }

  startAuction(params: { roomCode: string; hostUserId: string }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; host_user_id: string; status: RoomStatus; timer_seconds: number }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the room host can start the auction.', 403);
    }
    if (room.status !== 'WAITING') {
      throw new AuctionEngineError('Auction has already started.', 400);
    }

    const activeParticipants = db
      .prepare(
        'SELECT COUNT(*) as cnt FROM room_teams WHERE room_id = ? AND (user_id IS NOT NULL OR is_bot = 1)'
      )
      .get(room.id) as { cnt: number };

    if (activeParticipants.cnt < 2) {
      throw new AuctionEngineError(
        'At least 2 franchises must be claimed (by humans or AI GMs) before starting the auction.',
        400
      );
    }

    db.prepare(
      `UPDATE rooms SET status = 'ACTIVE', started_at = datetime('now') WHERE id = ?`
    ).run(room.id);

    this.insertSystemChat(
      room.id,
      `🔔 GAVEL UP! The IPL Mega Auction is now LIVE with ${activeParticipants.cnt} franchises!`
    );

    const rt = this.getOrCreateRuntime(room.id, code);
    this.advanceToNextLot(rt);
    return this.getRoomSnapshot(code);
  }

  private resumeOrHydrateActiveRoom(roomCode: string): void {
    const db = getDb();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(roomCode) as
      | { id: string; code: string; status: RoomStatus; timer_seconds: number; current_lot_id: string | null }
      | undefined;
    if (!room || room.status !== 'ACTIVE') return;

    const rt = this.getOrCreateRuntime(room.id, room.code);
    if (room.current_lot_id) {
      const lot = db
        .prepare('SELECT status FROM auction_lots WHERE id = ?')
        .get(room.current_lot_id) as { status: LotStatus } | undefined;
      if (lot && lot.status === 'ON_BLOCK') {
        this.startLotTimer(rt, room.timer_seconds * 1000);
        this.scheduleBotConsideration(rt);
        return;
      }
    }
    this.advanceToNextLot(rt);
  }

  private advanceToNextLot(rt: RoomRuntime): void {
    this.clearRuntimeTimers(rt);
    rt.passedTeams.clear();
    rt.isTransitioning = false;

    const db = getDb();
    const room = db
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .get(rt.roomId) as
      | {
          id: string;
          code: string;
          status: RoomStatus;
          timer_seconds: number;
          max_squad_size: number;
          accelerated_mode: number;
        }
      | undefined;

    if (!room || room.status !== 'ACTIVE') return;

    // Check if all participating teams have reached max squad size (25)
    const eligibleTeamsLeft = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM room_teams
         WHERE room_id = ? AND (user_id IS NOT NULL OR is_bot = 1) AND squad_count < ?`
      )
      .get(room.id, room.max_squad_size) as { cnt: number };

    if (eligibleTeamsLeft.cnt === 0) {
      void this.finishAuctionInternal(rt, 'All participating franchises have completed full 25-player squads!');
      return;
    }

    // Clear any stale ON_BLOCK lot first
    db.prepare(
      `UPDATE auction_lots SET status = 'UPCOMING' WHERE room_id = ? AND status = 'ON_BLOCK'`
    ).run(room.id);

    const nextLot = db
      .prepare(
        `SELECT id, player_id, lot_number, set_name FROM auction_lots
         WHERE room_id = ? AND status = 'UPCOMING'
         ORDER BY lot_number ASC LIMIT 1`
      )
      .get(room.id) as
      | { id: string; player_id: number; lot_number: number; set_name: string }
      | undefined;

    if (!nextLot) {
      void this.finishAuctionInternal(rt, 'All players in the auction pool have been presented!');
      return;
    }

    db.prepare(
      `UPDATE auction_lots
       SET status = 'ON_BLOCK', current_bid_lakhs = NULL, current_bidder_team = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextLot.id);

    db.prepare('UPDATE rooms SET current_lot_id = ? WHERE id = ?').run(
      nextLot.id,
      room.id
    );

    const durationMs =
      (room.accelerated_mode ? Math.min(8, room.timer_seconds) : room.timer_seconds) *
      1000;

    this.startLotTimer(rt, durationMs);

    const snapshot = this.getRoomSnapshot(rt.roomCode);
    this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:lot_started', {
      currentLot: snapshot.currentLot,
      timerEndsAt: rt.timerEndsAt,
      serverNow: Date.now(),
      counts: snapshot.counts,
    });
    this.broadcastRoomState(rt.roomCode, snapshot);

    this.scheduleBotConsideration(rt);
  }

  private startLotTimer(rt: RoomRuntime, durationMs: number): void {
    if (rt.tickInterval) {
      clearInterval(rt.tickInterval);
    }
    rt.pausedRemainingMs = null;
    rt.timerEndsAt = Date.now() + durationMs;

    rt.tickInterval = setInterval(() => {
      if (!rt.timerEndsAt || rt.isTransitioning) return;
      const remainingMs = Math.max(0, rt.timerEndsAt - Date.now());

      this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:tick', {
        remainingMs,
        timerEndsAt: rt.timerEndsAt,
        serverNow: Date.now(),
      });

      if (remainingMs <= 0) {
        this.finalizeCurrentLot(rt);
      }
    }, 250);
  }

  placeBid(params: {
    roomCode: string;
    userId?: string;
    teamCode: TeamCode;
    amountLakhs?: number;
    isBotInternal?: boolean;
  }): { snapshot: RoomSnapshot; bid: BidEntryDTO } {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          code: string;
          status: RoomStatus;
          max_squad_size: number;
          max_overseas: number;
          timer_seconds: number;
          accelerated_mode: number;
          current_lot_id: string | null;
        }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.status !== 'ACTIVE') {
      throw new AuctionEngineError('Auction is not currently active.', 400);
    }
    if (!room.current_lot_id) {
      throw new AuctionEngineError('No player is currently on the auction block.', 400);
    }

    const rt = this.getOrCreateRuntime(room.id, room.code);
    if (rt.isTransitioning) {
      throw new AuctionEngineError('Gavel has already fallen on this lot.', 409);
    }
    if (rt.timerEndsAt && Date.now() > rt.timerEndsAt + 250) {
      throw new AuctionEngineError('Bidding countdown has expired.', 409);
    }

    let createdBid!: BidEntryDTO;

    const bidTx = db.transaction(() => {
      const team = db
        .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
        .get(room.id, params.teamCode) as
        | {
            team_code: TeamCode;
            user_id: string | null;
            is_bot: number;
            purse_remaining_lakhs: number;
            squad_count: number;
            overseas_count: number;
          }
        | undefined;

      if (!team) {
        throw new AuctionEngineError('Franchise not found in this room.', 404);
      }

      if (params.isBotInternal) {
        if (team.is_bot !== 1) {
          throw new AuctionEngineError('Bot cannot bid for a human franchise.', 403);
        }
      } else {
        if (!params.userId || team.user_id !== params.userId) {
          throw new AuctionEngineError('You do not own this franchise.', 403);
        }
      }

      const lot = db
        .prepare(
          `SELECT l.*, p.name as player_name, p.is_overseas
           FROM auction_lots l
           JOIN players p ON p.id = l.player_id
           WHERE l.id = ?`
        )
        .get(room.current_lot_id) as
        | {
            id: string;
            player_id: number;
            player_name: string;
            is_overseas: number;
            status: LotStatus;
            base_price_lakhs: number;
            current_bid_lakhs: number | null;
            current_bidder_team: TeamCode | null;
          }
        | undefined;

      if (!lot || lot.status !== 'ON_BLOCK') {
        throw new AuctionEngineError('Player is no longer open for bidding.', 409);
      }

      if (lot.current_bidder_team === params.teamCode) {
        throw new AuctionEngineError(
          `${params.teamCode} already holds the highest bid!`,
          400
        );
      }

      if (team.squad_count >= room.max_squad_size) {
        throw new AuctionEngineError(
          `${params.teamCode} has reached the maximum squad size of ${room.max_squad_size}.`,
          400
        );
      }

      if (lot.is_overseas === 1 && team.overseas_count >= room.max_overseas) {
        throw new AuctionEngineError(
          `${params.teamCode} already has the maximum ${room.max_overseas} overseas players.`,
          400
        );
      }

      const minLegalBid = getNextMinimumBidLakhs(
        lot.base_price_lakhs,
        lot.current_bid_lakhs,
        lot.current_bidder_team
      );

      const bidAmount =
        params.amountLakhs !== undefined ? params.amountLakhs : minLegalBid;

      if (!Number.isInteger(bidAmount) || bidAmount < minLegalBid) {
        throw new AuctionEngineError(
          `Minimum valid bid is ${formatCurrencyLakhs(minLegalBid)}.`,
          400
        );
      }

      if (bidAmount % 5 !== 0) {
        throw new AuctionEngineError(
          'Bids must be in multiples of ₹5 Lakhs.',
          400
        );
      }

      if (bidAmount > team.purse_remaining_lakhs) {
        throw new AuctionEngineError(
          `Insufficient purse! ${params.teamCode} has ${formatCurrencyLakhs(team.purse_remaining_lakhs)} remaining.`,
          400
        );
      }

      const bidId = uuidv4();
      const nowIso = new Date().toISOString();

      db.prepare(
        `UPDATE auction_lots
         SET current_bid_lakhs = ?, current_bidder_team = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(bidAmount, params.teamCode, lot.id);

      db.prepare(
        `INSERT INTO bids (id, room_id, lot_id, player_id, team_code, user_id, amount_lakhs, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        bidId,
        room.id,
        lot.id,
        lot.player_id,
        params.teamCode,
        params.userId || null,
        bidAmount,
        nowIso
      );

      createdBid = {
        id: bidId,
        lotId: lot.id,
        playerId: lot.player_id,
        playerName: lot.player_name,
        teamCode: params.teamCode,
        amountLakhs: bidAmount,
        createdAt: nowIso,
      };
    });

    bidTx();

    // Remove bidder from passedTeams and reset countdown clock
    rt.passedTeams.delete(params.teamCode);
    const resetSeconds = room.accelerated_mode
      ? Math.min(7, room.timer_seconds)
      : Math.min(12, Math.max(6, room.timer_seconds));
    const currentRemaining = rt.timerEndsAt
      ? Math.max(0, rt.timerEndsAt - Date.now())
      : 0;
    rt.timerEndsAt = Date.now() + Math.max(currentRemaining, resetSeconds * 1000);

    const snapshot = this.getRoomSnapshot(code);
    this.io?.to(this.socketRoomKey(code)).emit('auction:bid_placed', {
      bid: createdBid,
      currentLot: snapshot.currentLot,
      timerEndsAt: rt.timerEndsAt,
      serverNow: Date.now(),
      passedTeams: Array.from(rt.passedTeams),
    });

    this.scheduleBotConsideration(rt);
    return { snapshot, bid: createdBid };
  }

  passCurrentLot(params: { roomCode: string; userId: string }): void {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, current_lot_id FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; status: RoomStatus; current_lot_id: string | null }
      | undefined;

    if (!room || room.status !== 'ACTIVE' || !room.current_lot_id) return;

    const team = db
      .prepare('SELECT team_code FROM room_teams WHERE room_id = ? AND user_id = ?')
      .get(room.id, params.userId) as { team_code: TeamCode } | undefined;
    if (!team) return;

    const lot = db
      .prepare('SELECT current_bidder_team FROM auction_lots WHERE id = ?')
      .get(room.current_lot_id) as { current_bidder_team: TeamCode | null } | undefined;

    if (lot?.current_bidder_team === team.team_code) return;

    const rt = this.getOrCreateRuntime(room.id, code);
    rt.passedTeams.add(team.team_code);

    this.io?.to(this.socketRoomKey(code)).emit('auction:pass_updated', {
      passedTeams: Array.from(rt.passedTeams),
    });

    // Check if all connected human teams (except current highest bidder) passed and no bot wants to bid
    const humanTeams = db
      .prepare(
        'SELECT team_code FROM room_teams WHERE room_id = ? AND user_id IS NOT NULL AND is_bot = 0 AND is_connected = 1'
      )
      .all(room.id) as { team_code: TeamCode }[];

    const allHumansPassed =
      humanTeams.length > 0 &&
      humanTeams.every(
        (ht) =>
          ht.team_code === lot?.current_bidder_team || rt.passedTeams.has(ht.team_code)
      );

    if (allHumansPassed && !rt.botTimeout && rt.timerEndsAt) {
      const fastEnd = Date.now() + 700;
      if (rt.timerEndsAt > fastEnd) {
        rt.timerEndsAt = fastEnd;
      }
    }
  }

  private scheduleBotConsideration(rt: RoomRuntime): void {
    if (rt.botTimeout) {
      clearTimeout(rt.botTimeout);
      rt.botTimeout = null;
    }

    const db = getDb();
    const room = db
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .get(rt.roomId) as
      | {
          id: string;
          code: string;
          status: RoomStatus;
          max_squad_size: number;
          min_squad_size: number;
          max_overseas: number;
          current_lot_id: string | null;
        }
      | undefined;

    if (!room || room.status !== 'ACTIVE' || !room.current_lot_id) return;

    const bots = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND is_bot = 1')
      .all(room.id) as {
      team_code: TeamCode;
      bot_strategy: BotStrategy | null;
      purse_remaining_lakhs: number;
      squad_count: number;
      overseas_count: number;
    }[];

    if (bots.length === 0) return;

    const lotRow = db
      .prepare(
        `SELECT l.*, p.*
         FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.id = ?`
      )
      .get(room.current_lot_id) as
      | (PlayerRecord & {
          lot_number: number;
          current_bid_lakhs: number | null;
          current_bidder_team: TeamCode | null;
          status: LotStatus;
        })
      | undefined;

    if (!lotRow || lotRow.status !== 'ON_BLOCK') return;

    const playerDto = mapPlayerToDTO(lotRow);
    const nextMinBid = getNextMinimumBidLakhs(
      lotRow.base_price_lakhs,
      lotRow.current_bid_lakhs,
      lotRow.current_bidder_team
    );

    const fairVal = estimateFairValueLakhs(playerDto);

    // Evaluate which bots want this player at nextMinBid
    const interestedBots: { teamCode: TeamCode; ceiling: number }[] = [];

    for (const bot of bots) {
      if (bot.team_code === lotRow.current_bidder_team) continue;
      if (bot.squad_count >= room.max_squad_size) continue;
      if (playerDto.isOverseas && bot.overseas_count >= room.max_overseas) continue;

      // Reserve ₹30L per remaining minimum slot up to 18
      const slotsNeededForMin = Math.max(0, room.min_squad_size - bot.squad_count - 1);
      const safeSpendable = bot.purse_remaining_lakhs - slotsNeededForMin * 30;
      if (nextMinBid > safeSpendable) continue;

      // Count bot's current role distribution
      const roleCounts = db
        .prepare(
          `SELECT p.role, COUNT(*) as cnt
           FROM auction_lots l
           JOIN players p ON p.id = l.player_id
           WHERE l.room_id = ? AND l.sold_to_team = ? AND l.status = 'SOLD'
           GROUP BY p.role`
        )
        .all(room.id, bot.team_code) as { role: string; cnt: number }[];

      const rMap: Record<string, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
      for (const rc of roleCounts) rMap[rc.role] = rc.cnt;

      let multiplier = 0.95;
      if (bot.bot_strategy === 'AGGRESSIVE') multiplier = 1.12;
      else if (bot.bot_strategy === 'STAR_HUNTER') {
        multiplier = playerDto.overallRating >= 89 ? 1.22 : 0.85;
      } else if (bot.bot_strategy === 'MONEYBALL') {
        multiplier = playerDto.overallRating >= 91 ? 0.88 : 1.08;
      }

      // Role urgency modifiers
      if (playerDto.role === 'WK' && rMap.WK === 0) multiplier *= 1.25;
      else if (playerDto.role === 'WK' && rMap.WK >= 3) multiplier *= 0.45;
      if (playerDto.role === 'BOWL' && rMap.BOWL < 5) multiplier *= 1.1;
      if (playerDto.role === 'AR' && rMap.AR < 3) multiplier *= 1.12;

      //Deterministic per-team-per-player affinity so not all 9 bots value every player identically
      const seed =
        (bot.team_code.charCodeAt(0) * 31 +
          bot.team_code.charCodeAt(1) * 17 +
          playerDto.id * 13) %
        100;

      // Lower-rated depth players shouldn't all be bought early; some go unsold realistically!
      if (playerDto.overallRating <= 78 && seed < 62 && bot.squad_count < 14) {
        continue;
      }
      if (playerDto.overallRating <= 81 && seed < 40) {
        continue;
      }

      const affinityFactor = 0.82 + (seed / 100) * 0.36;
      const maxWilling = Math.min(
        safeSpendable,
        Math.round((fairVal * multiplier * affinityFactor) / 5) * 5
      );

      if (maxWilling >= nextMinBid) {
        interestedBots.push({ teamCode: bot.team_code, ceiling: maxWilling });
      }
    }

    if (interestedBots.length === 0) return;

    // Pick a responsive bot among interested ones
    interestedBots.sort((a, b) => b.ceiling - a.ceiling);
    const topPool = interestedBots.slice(0, Math.min(3, interestedBots.length));
    const chosen = topPool[Math.floor(Math.random() * topPool.length)];

    const delayMs = 850 + Math.floor(Math.random() * 1250);
    rt.botTimeout = setTimeout(() => {
      rt.botTimeout = null;
      try {
        this.placeBid({
          roomCode: rt.roomCode,
          teamCode: chosen.teamCode,
          isBotInternal: true,
        });
      } catch {
        // Ignore if another human bid beat the bot or state changed
      }
    }, delayMs);
  }

  private finalizeCurrentLot(rt: RoomRuntime): void {
    if (rt.isTransitioning) return;
    rt.isTransitioning = true;
    this.clearRuntimeTimers(rt);
    rt.timerEndsAt = null;

    const db = getDb();
    const room = db
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .get(rt.roomId) as
      | { id: string; code: string; status: RoomStatus; current_lot_id: string | null }
      | undefined;

    if (!room || !room.current_lot_id) {
      rt.isTransitioning = false;
      return;
    }

    const lot = db
      .prepare(
        `SELECT l.*, p.*
         FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.id = ?`
      )
      .get(room.current_lot_id) as
      | (PlayerRecord & {
          lot_id_val?: string;
          lot_number: number;
          current_bid_lakhs: number | null;
          current_bidder_team: TeamCode | null;
          status: LotStatus;
        })
      | undefined;

    if (!lot) {
      rt.isTransitioning = false;
      return;
    }

    const lotId = room.current_lot_id;
    const playerDto = mapPlayerToDTO(lot);

    if (lot.current_bidder_team && lot.current_bid_lakhs !== null) {
      const winner = lot.current_bidder_team;
      const price = lot.current_bid_lakhs;
      const origTeamCode = (lot.previous_team || null) as TeamCode | null;

      const canTriggerRtm =
        Boolean(origTeamCode) &&
        VALID_TEAM_CODES.has(origTeamCode!) &&
        origTeamCode !== winner &&
        this.canTeamExerciseRtm(room.id, origTeamCode!, lot, price);

      if (canTriggerRtm) {
        this.initiateRtmPrompt(
          rt,
          room,
          lot as PlayerRecord & { lot_number: number },
          playerDto,
          origTeamCode!,
          winner,
          price
        );
        return;
      }

      this.finalizeSoldLotInternal(rt, room.id, lotId, playerDto, winner, price, false);
      return;
    } else {
      db.prepare(
        `UPDATE auction_lots SET status = 'UNSOLD', updated_at = datetime('now') WHERE id = ?`
      ).run(lotId);

      this.insertSystemChat(
        room.id,
        `❌ UNSOLD: ${playerDto.name} (Base ${formatCurrencyLakhs(lot.base_price_lakhs)}) goes unsold.`
      );

      const snapshot = this.getRoomSnapshot(rt.roomCode);
      this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:lot_unsold', {
        lotId,
        player: playerDto,
        counts: snapshot.counts,
      });
      this.broadcastRoomState(rt.roomCode, snapshot);
    }

    rt.intermissionTimeout = setTimeout(() => {
      rt.intermissionTimeout = null;
      this.advanceToNextLot(rt);
    }, 3000);
  }

  private canTeamExerciseRtm(
    roomId: string,
    teamCode: TeamCode,
    lot: PlayerRecord,
    priceLakhs: number
  ): boolean {
    const db = getDb();
    const team = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(roomId, teamCode) as
      | {
          rtm_cards_remaining: number;
          purse_remaining_lakhs: number;
          squad_count: number;
          overseas_count: number;
          user_id: string | null;
          is_bot: number;
        }
      | undefined;

    if (!team) return false;
    if (!team.user_id && !team.is_bot) return false;
    if (team.rtm_cards_remaining <= 0) return false;
    if (team.squad_count >= AUCTION_CONSTANTS.MAX_SQUAD_SIZE) return false;
    if (lot.is_overseas && team.overseas_count >= AUCTION_CONSTANTS.MAX_OVERSEAS) return false;

    const slotsNeeded = Math.max(0, AUCTION_CONSTANTS.MIN_SQUAD_SIZE - (team.squad_count + 1));
    const minReserve = slotsNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
    if (team.purse_remaining_lakhs - priceLakhs < minReserve) return false;

    return true;
  }

  private initiateRtmPrompt(
    rt: RoomRuntime,
    room: { id: string; current_lot_id: string | null },
    lot: PlayerRecord & { lot_number: number },
    playerDto: PlayerDTO,
    originalTeam: TeamCode,
    highestBidderTeam: TeamCode,
    currentBidLakhs: number
  ): void {
    this.clearRuntimeTimers(rt);
    rt.isTransitioning = false;

    const timerEndsAt = Date.now() + 10000;
    const rtmPrompt: RTMPromptState = {
      lotId: room.current_lot_id!,
      lotNumber: lot.lot_number,
      player: playerDto,
      originalTeam,
      highestBidderTeam,
      currentBidLakhs,
      stage: 'DECISION_ORIGINAL',
      timerEndsAt,
    };
    rt.rtmState = rtmPrompt;

    this.insertSystemChat(
      room.id,
      `🏏 RTM OPPORTUNITY! ${originalTeam} has 10s to exercise Right-To-Match for former player ${playerDto.name} at ${formatCurrencyLakhs(currentBidLakhs)}!`
    );

    const snapshot = this.getRoomSnapshot(rt.roomCode);
    this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:rtm_prompt', rtmPrompt);
    this.broadcastRoomState(rt.roomCode, snapshot);

    const db = getDb();
    const origTeamRow = db
      .prepare('SELECT is_bot FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, originalTeam) as { is_bot: number } | undefined;

    if (origTeamRow?.is_bot) {
      rt.rtmTimeout = setTimeout(() => {
        this.handleBotRtmDecision(rt);
      }, 2500);
    } else {
      rt.rtmTimeout = setTimeout(() => {
        this.handleRtmTimeout(rt);
      }, 10000);
    }
  }

  handleRtmDecision(params: {
    roomCode: string;
    userId: string;
    decision: 'MATCH' | 'DECLINE';
  }): void {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, current_lot_id FROM rooms WHERE code = ?')
      .get(code) as { id: string; status: RoomStatus; current_lot_id: string | null } | undefined;
    if (!room || room.status !== 'ACTIVE' || !room.current_lot_id) {
      throw new AuctionEngineError('No active lot on block.');
    }
    const rt = this.getOrCreateRuntime(room.id, code);
    if (!rt.rtmState || rt.rtmState.lotId !== room.current_lot_id) {
      throw new AuctionEngineError('No pending RTM prompt for this lot.');
    }

    const { originalTeam, highestBidderTeam, currentBidLakhs, player, stage } = rt.rtmState;

    if (stage === 'DECISION_ORIGINAL' || stage === 'FINAL_MATCH_ORIGINAL') {
      const teamRow = db
        .prepare('SELECT user_id, is_bot FROM room_teams WHERE room_id = ? AND team_code = ?')
        .get(room.id, originalTeam) as { user_id: string | null; is_bot: number } | undefined;
      const isOwner = teamRow?.user_id === params.userId;
      const isHost =
        (db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(room.id) as { host_user_id: string })
          ?.host_user_id === params.userId;
      if (!isOwner && !(isHost && teamRow?.is_bot)) {
        throw new AuctionEngineError('Only the original franchise owner can make the RTM decision.', 403);
      }

      if (rt.rtmTimeout) {
        clearTimeout(rt.rtmTimeout);
        rt.rtmTimeout = null;
      }

      if (params.decision === 'DECLINE') {
        this.insertSystemChat(
          room.id,
          `🚫 ${originalTeam} declined to exercise RTM for ${player.name}.`
        );
        const finalBid = rt.rtmState.finalRaisedBidLakhs ?? currentBidLakhs;
        this.finalizeSoldLotInternal(rt, room.id, room.current_lot_id, player, highestBidderTeam, finalBid, false);
      } else {
        if (stage === 'DECISION_ORIGINAL') {
          rt.rtmState.stage = 'FINAL_RAISE_WINNER';
          rt.rtmState.timerEndsAt = Date.now() + 10000;

          this.insertSystemChat(
            room.id,
            `✨ ${originalTeam} MATCHED the bid of ${formatCurrencyLakhs(currentBidLakhs)} for ${player.name}! ${highestBidderTeam} has 10s to make ONE final bid raise or pass!`
          );

          const snapshot = this.getRoomSnapshot(code);
          this.io?.to(this.socketRoomKey(code)).emit('auction:rtm_prompt', rt.rtmState);
          this.broadcastRoomState(code, snapshot);

          const winnerTeamRow = db
            .prepare('SELECT is_bot FROM room_teams WHERE room_id = ? AND team_code = ?')
            .get(room.id, highestBidderTeam) as { is_bot: number } | undefined;
          if (winnerTeamRow?.is_bot) {
            rt.rtmTimeout = setTimeout(() => {
              this.handleBotRtmRaise(rt);
            }, 2500);
          } else {
            rt.rtmTimeout = setTimeout(() => {
              this.handleRtmTimeout(rt);
            }, 10000);
          }
        } else {
          const finalPrice = rt.rtmState.finalRaisedBidLakhs ?? currentBidLakhs;
          this.insertSystemChat(
            room.id,
            `🎉 RTM SUCCESS! ${originalTeam} matched the raised bid of ${formatCurrencyLakhs(finalPrice)} and claims ${player.name}!`
          );
          this.finalizeSoldLotInternal(rt, room.id, room.current_lot_id, player, originalTeam, finalPrice, true);
        }
      }
    }
  }

  handleRtmRaise(params: {
    roomCode: string;
    userId: string;
    action: 'RAISE' | 'PASS';
    raiseAmountLakhs?: number;
  }): void {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, current_lot_id FROM rooms WHERE code = ?')
      .get(code) as { id: string; status: RoomStatus; current_lot_id: string | null } | undefined;
    if (!room || room.status !== 'ACTIVE' || !room.current_lot_id) {
      throw new AuctionEngineError('No active lot on block.');
    }
    const rt = this.getOrCreateRuntime(room.id, code);
    if (!rt.rtmState || rt.rtmState.stage !== 'FINAL_RAISE_WINNER' || rt.rtmState.lotId !== room.current_lot_id) {
      throw new AuctionEngineError('No pending RTM raise prompt for this lot.');
    }

    const { originalTeam, highestBidderTeam, currentBidLakhs, player } = rt.rtmState;

    const teamRow = db
      .prepare('SELECT user_id, is_bot, purse_remaining_lakhs, squad_count FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, highestBidderTeam) as
      | { user_id: string | null; is_bot: number; purse_remaining_lakhs: number; squad_count: number }
      | undefined;
    const isOwner = teamRow?.user_id === params.userId;
    const isHost =
      (db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(room.id) as { host_user_id: string })
        ?.host_user_id === params.userId;
    if (!isOwner && !(isHost && teamRow?.is_bot)) {
      throw new AuctionEngineError('Only the highest bidder can make the final raise decision.', 403);
    }

    if (rt.rtmTimeout) {
      clearTimeout(rt.rtmTimeout);
      rt.rtmTimeout = null;
    }
    if (rt.tradeWindowTimeout) {
      clearTimeout(rt.tradeWindowTimeout);
      rt.tradeWindowTimeout = null;
    }

    if (params.action === 'PASS') {
      this.insertSystemChat(
        room.id,
        `🎉 RTM SUCCESS! ${highestBidderTeam} passed on raising. ${originalTeam} claims ${player.name} for ${formatCurrencyLakhs(currentBidLakhs)} using RTM!`
      );
      this.finalizeSoldLotInternal(rt, room.id, room.current_lot_id, player, originalTeam, currentBidLakhs, true);
    } else {
      const minRaise = getNextMinimumBidLakhs(currentBidLakhs, currentBidLakhs, highestBidderTeam);
      const raisedAmount =
        params.raiseAmountLakhs && params.raiseAmountLakhs >= minRaise
          ? params.raiseAmountLakhs
          : minRaise;

      const slotsNeeded = Math.max(0, AUCTION_CONSTANTS.MIN_SQUAD_SIZE - (teamRow!.squad_count + 1));
      const minReserve = slotsNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
      if (teamRow!.purse_remaining_lakhs - raisedAmount < minReserve) {
        throw new AuctionEngineError(`Insufficient purse for raise to ${formatCurrencyLakhs(raisedAmount)}.`);
      }

      db.prepare(
        `INSERT INTO bids (id, room_id, lot_id, player_id, team_code, amount_lakhs)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), room.id, room.current_lot_id, player.id, highestBidderTeam, raisedAmount);

      db.prepare(
        `UPDATE auction_lots
         SET current_bid_lakhs = ?, current_bidder_team = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(raisedAmount, highestBidderTeam, room.current_lot_id);

      const origTeamRow = db
        .prepare('SELECT purse_remaining_lakhs, squad_count, is_bot FROM room_teams WHERE room_id = ? AND team_code = ?')
        .get(room.id, originalTeam) as
        | { purse_remaining_lakhs: number; squad_count: number; is_bot: number }
        | undefined;
      const origSlotsNeeded = Math.max(0, AUCTION_CONSTANTS.MIN_SQUAD_SIZE - (origTeamRow!.squad_count + 1));
      const origMinReserve = origSlotsNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
      const canAfford = origTeamRow!.purse_remaining_lakhs - raisedAmount >= origMinReserve;

      if (!canAfford) {
        this.insertSystemChat(
          room.id,
          `🔥 ${highestBidderTeam} raised to ${formatCurrencyLakhs(raisedAmount)}! ${originalTeam} cannot afford to match. Sold to ${highestBidderTeam}!`
        );
        this.finalizeSoldLotInternal(rt, room.id, room.current_lot_id, player, highestBidderTeam, raisedAmount, false);
      } else {
        rt.rtmState.stage = 'FINAL_MATCH_ORIGINAL';
        rt.rtmState.finalRaisedBidLakhs = raisedAmount;
        rt.rtmState.timerEndsAt = Date.now() + 10000;

        this.insertSystemChat(
          room.id,
          `🔥 ${highestBidderTeam} raised the bid to ${formatCurrencyLakhs(raisedAmount)}! ${originalTeam} has 10s to match or concede!`
        );

        const snapshot = this.getRoomSnapshot(code);
        this.io?.to(this.socketRoomKey(code)).emit('auction:rtm_prompt', rt.rtmState);
        this.broadcastRoomState(code, snapshot);

        if (origTeamRow?.is_bot) {
          rt.rtmTimeout = setTimeout(() => {
            this.handleBotRtmDecision(rt);
          }, 2500);
        } else {
          rt.rtmTimeout = setTimeout(() => {
            this.handleRtmTimeout(rt);
          }, 10000);
        }
      }
    }
  }

  private handleBotRtmDecision(rt: RoomRuntime): void {
    if (!rt.rtmState) return;
    const db = getDb();
    const { originalTeam, currentBidLakhs, finalRaisedBidLakhs, player, stage } = rt.rtmState;
    const bidToMatch = stage === 'FINAL_MATCH_ORIGINAL' ? (finalRaisedBidLakhs ?? currentBidLakhs) : currentBidLakhs;

    const teamRow = db
      .prepare('SELECT bot_strategy, purse_remaining_lakhs, squad_count FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(rt.roomId, originalTeam) as
      | { bot_strategy: BotStrategy | null; purse_remaining_lakhs: number; squad_count: number }
      | undefined;

    if (!teamRow) {
      this.handleRtmTimeout(rt);
      return;
    }

    const fairValue = estimateFairValueLakhs(player);
    const isMarquee = player.marquee || player.overallRating >= 88;
    const valueMultiplier = isMarquee ? 1.25 : 1.05;
    const willingToMatch = bidToMatch <= fairValue * valueMultiplier;

    const slotsNeeded = Math.max(0, AUCTION_CONSTANTS.MIN_SQUAD_SIZE - (teamRow.squad_count + 1));
    const minReserve = slotsNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
    const canAfford = teamRow.purse_remaining_lakhs - bidToMatch >= minReserve;

    const decision: 'MATCH' | 'DECLINE' = willingToMatch && canAfford ? 'MATCH' : 'DECLINE';
    const hostUser = db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(rt.roomId) as { host_user_id: string };

    this.handleRtmDecision({
      roomCode: rt.roomCode,
      userId: hostUser.host_user_id,
      decision,
    });
  }

  private handleBotRtmRaise(rt: RoomRuntime): void {
    if (!rt.rtmState || rt.rtmState.stage !== 'FINAL_RAISE_WINNER') return;
    const db = getDb();
    const { highestBidderTeam, currentBidLakhs, player } = rt.rtmState;

    const teamRow = db
      .prepare('SELECT bot_strategy, purse_remaining_lakhs, squad_count FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(rt.roomId, highestBidderTeam) as
      | { bot_strategy: BotStrategy | null; purse_remaining_lakhs: number; squad_count: number }
      | undefined;

    if (!teamRow) {
      this.handleRtmTimeout(rt);
      return;
    }

    const fairValue = estimateFairValueLakhs(player);
    const minRaise = getNextMinimumBidLakhs(currentBidLakhs, currentBidLakhs, highestBidderTeam);
    const slotsNeeded = Math.max(0, AUCTION_CONSTANTS.MIN_SQUAD_SIZE - (teamRow.squad_count + 1));
    const minReserve = slotsNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
    const canAfford = teamRow.purse_remaining_lakhs - minRaise >= minReserve;
    const shouldRaise = canAfford && minRaise <= fairValue * 1.15;

    const hostUser = db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(rt.roomId) as { host_user_id: string };

    this.handleRtmRaise({
      roomCode: rt.roomCode,
      userId: hostUser.host_user_id,
      action: shouldRaise ? 'RAISE' : 'PASS',
      raiseAmountLakhs: minRaise,
    });
  }

  private handleRtmTimeout(rt: RoomRuntime): void {
    if (!rt.rtmState) return;
    const { stage, originalTeam, highestBidderTeam, currentBidLakhs, finalRaisedBidLakhs, player } = rt.rtmState;
    const lotId = rt.rtmState.lotId;

    if (stage === 'DECISION_ORIGINAL') {
      this.insertSystemChat(
        rt.roomId,
        `⏰ Time expired! ${originalTeam} did not exercise RTM for ${player.name}.`
      );
      this.finalizeSoldLotInternal(rt, rt.roomId, lotId, player, highestBidderTeam, currentBidLakhs, false);
    } else if (stage === 'FINAL_RAISE_WINNER') {
      this.insertSystemChat(
        rt.roomId,
        `⏰ Time expired! ${highestBidderTeam} did not raise bid. ${originalTeam} claims ${player.name} via RTM!`
      );
      this.finalizeSoldLotInternal(rt, rt.roomId, lotId, player, originalTeam, currentBidLakhs, true);
    } else if (stage === 'FINAL_MATCH_ORIGINAL') {
      const finalPrice = finalRaisedBidLakhs ?? currentBidLakhs;
      this.insertSystemChat(
        rt.roomId,
        `⏰ Time expired! ${originalTeam} did not match raised bid. Sold to ${highestBidderTeam} for ${formatCurrencyLakhs(finalPrice)}!`
      );
      this.finalizeSoldLotInternal(rt, rt.roomId, lotId, player, highestBidderTeam, finalPrice, false);
    }
  }

  private finalizeSoldLotInternal(
    rt: RoomRuntime,
    roomId: string,
    lotId: string,
    playerDto: PlayerDTO,
    soldToTeam: TeamCode,
    priceLakhs: number,
    isRtmBuy: boolean
  ): void {
    rt.rtmState = null;
    if (rt.rtmTimeout) {
      clearTimeout(rt.rtmTimeout);
      rt.rtmTimeout = null;
    }
    if (rt.tradeWindowTimeout) {
      clearTimeout(rt.tradeWindowTimeout);
      rt.tradeWindowTimeout = null;
    }

    const db = getDb();
    const sellTx = db.transaction(() => {
      db.prepare(
        `UPDATE auction_lots
         SET status = 'SOLD', sold_to_team = ?, sold_price_lakhs = ?, is_rtm_buy = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(soldToTeam, priceLakhs, isRtmBuy ? 1 : 0, lotId);

      const rtmDeduction = isRtmBuy ? 1 : 0;
      db.prepare(
        `UPDATE room_teams
         SET purse_remaining_lakhs = purse_remaining_lakhs - ?,
             squad_count = squad_count + 1,
             overseas_count = overseas_count + ?,
             rtm_cards_remaining = CASE WHEN ? = 1 THEN MAX(0, rtm_cards_remaining - 1) ELSE rtm_cards_remaining END
         WHERE room_id = ? AND team_code = ?`
      ).run(priceLakhs, playerDto.isOverseas ? 1 : 0, rtmDeduction, roomId, soldToTeam);

      const rtmBadge = isRtmBuy ? ' 🏏 [RTM EXERCISED]' : '';
      this.insertSystemChat(
        roomId,
        `🔨 SOLD! ${playerDto.name} (${playerDto.role})${rtmBadge} sold to ${soldToTeam} for ${formatCurrencyLakhs(priceLakhs)}!`
      );
    });
    sellTx();

    const snapshot = this.getRoomSnapshot(rt.roomCode);
    this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:lot_sold', {
      lotId,
      player: playerDto,
      soldToTeam,
      soldPriceLakhs: priceLakhs,
      isRtmBuy,
      teams: snapshot.teams,
      counts: snapshot.counts,
    });
    this.broadcastRoomState(rt.roomCode, snapshot);

    rt.intermissionTimeout = setTimeout(() => {
      rt.intermissionTimeout = null;
      this.advanceToNextLot(rt);
    }, 3000);
  }

  getRetentionCandidates(params: {
    roomCode: string;
    teamCode: TeamCode;
  }): {
    teamCode: TeamCode;
    candidates: RetentionCandidateDTO[];
    rtmCardsRemaining: number;
    retentionsCount: number;
    purseRemainingLakhs: number;
    initialPurseLakhs: number;
  } {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, initial_purse_lakhs FROM rooms WHERE code = ?')
      .get(code) as { id: string; status: RoomStatus; initial_purse_lakhs: number } | undefined;
    if (!room) throw new AuctionEngineError('Room not found.', 404);

    const team = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, params.teamCode) as
      | {
          rtm_cards_remaining: number;
          retentions_count: number;
          purse_remaining_lakhs: number;
        }
      | undefined;
    if (!team) throw new AuctionEngineError('Franchise not found in room.', 404);

    const rows = db
      .prepare(
        `SELECT l.id as lot_id, l.status as lot_status, l.sold_to_team, l.sold_price_lakhs, l.is_retention, p.*
         FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.room_id = ? AND p.previous_team = ?
         ORDER BY p.marquee DESC, p.overall_rating DESC, p.name ASC`
      )
      .all(room.id, params.teamCode) as (PlayerRecord & {
      lot_id: string;
      lot_status: LotStatus;
      sold_to_team: string | null;
      sold_price_lakhs: number | null;
      is_retention: number;
    })[];

    const candidates: RetentionCandidateDTO[] = rows.map((r) => {
      const isRetained =
        r.lot_status === 'SOLD' && r.sold_to_team === params.teamCode && Boolean(r.is_retention);
      return {
        ...mapPlayerToDTO(r),
        isRetained,
        retentionCostLakhs: isRetained ? (r.sold_price_lakhs ?? undefined) : undefined,
      };
    });

    return {
      teamCode: params.teamCode,
      candidates,
      rtmCardsRemaining: team.rtm_cards_remaining,
      retentionsCount: team.retentions_count,
      purseRemainingLakhs: team.purse_remaining_lakhs,
      initialPurseLakhs: room.initial_purse_lakhs,
    };
  }

  saveRetentions(params: {
    roomCode: string;
    userId: string;
    teamCode: TeamCode;
    playerIds: number[];
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, initial_purse_lakhs, min_squad_size, max_overseas, host_user_id FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          status: RoomStatus;
          initial_purse_lakhs: number;
          min_squad_size: number;
          max_overseas: number;
          host_user_id: string;
        }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.status !== 'WAITING') {
      throw new AuctionEngineError('Retentions can only be configured in the lobby before auction starts.');
    }

    const team = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, params.teamCode) as
      | {
          user_id: string | null;
          is_bot: number;
          owner_name: string | null;
        }
      | undefined;

    if (!team) throw new AuctionEngineError('Franchise not found in room.', 404);

    const isOwner = team.user_id === params.userId;
    const isHost = room.host_user_id === params.userId;
    if (!isOwner && !isHost) {
      throw new AuctionEngineError('Only the franchise owner or host can submit retentions.', 403);
    }

    const uniqueIds = Array.from(new Set(params.playerIds));
    if (uniqueIds.length > BCCI_MAX_RETENTIONS) {
      throw new AuctionEngineError(`Maximum ${BCCI_MAX_RETENTIONS} retentions allowed per franchise.`);
    }

    let playersToRetain: PlayerRecord[] = [];
    if (uniqueIds.length > 0) {
      const placeholders = uniqueIds.map(() => '?').join(',');
      playersToRetain = db
        .prepare(`SELECT * FROM players WHERE id IN (${placeholders})`)
        .all(...uniqueIds) as PlayerRecord[];

      if (playersToRetain.length !== uniqueIds.length) {
        throw new AuctionEngineError('One or more selected players were not found.');
      }

      for (const p of playersToRetain) {
        if (p.previous_team !== params.teamCode) {
          throw new AuctionEngineError(
            `${p.name} cannot be retained by ${params.teamCode} (former team: ${p.previous_team || 'None'}).`
          );
        }
      }
    }

    const alloc = calculateRetentionAllocation(playersToRetain);
    if (alloc.uncappedCount > BCCI_MAX_UNCAPPED_RETENTIONS) {
      throw new AuctionEngineError(`Maximum ${BCCI_MAX_UNCAPPED_RETENTIONS} uncapped retentions allowed.`);
    }
    if (alloc.overseasCount > room.max_overseas) {
      throw new AuctionEngineError(`Cannot retain more than ${room.max_overseas} overseas players.`);
    }

    const slotsRemainingNeeded = Math.max(0, room.min_squad_size - uniqueIds.length);
    const minReserveNeeded = slotsRemainingNeeded * AUCTION_CONSTANTS.MIN_BASE_PRICE_LAKHS;
    if (room.initial_purse_lakhs - alloc.totalCostLakhs < minReserveNeeded) {
      throw new AuctionEngineError(
        `Retention cost of ${formatCurrencyLakhs(alloc.totalCostLakhs)} exceeds purse limit. Must retain at least ${formatCurrencyLakhs(minReserveNeeded)} for remaining ${slotsRemainingNeeded} squad slots.`
      );
    }

    const retentionsCount = uniqueIds.length;
    const rtmCardsRemaining = Math.max(0, BCCI_MAX_RTM_AND_RETENTIONS - retentionsCount);
    const newPurse = room.initial_purse_lakhs - alloc.totalCostLakhs;

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE auction_lots
         SET status = 'UPCOMING', sold_to_team = NULL, sold_price_lakhs = NULL, is_retention = 0, is_rtm_buy = 0, updated_at = datetime('now')
         WHERE room_id = ? AND sold_to_team = ? AND is_retention = 1`
      ).run(room.id, params.teamCode);

      const markSold = db.prepare(
        `UPDATE auction_lots
         SET status = 'SOLD', sold_to_team = ?, sold_price_lakhs = ?, is_retention = 1, updated_at = datetime('now')
         WHERE room_id = ? AND player_id = ?`
      );

      for (const item of alloc.allocations) {
        markSold.run(params.teamCode, item.costLakhs, room.id, item.player.id);
      }

      db.prepare(
        `UPDATE room_teams
         SET purse_remaining_lakhs = ?,
             squad_count = ?,
             overseas_count = ?,
             retentions_count = ?,
             rtm_cards_remaining = ?
         WHERE room_id = ? AND team_code = ?`
      ).run(
        newPurse,
        retentionsCount,
        alloc.overseasCount,
        retentionsCount,
        rtmCardsRemaining,
        room.id,
        params.teamCode
      );

      if (retentionsCount > 0) {
        const detail = alloc.allocations
          .map((a) => `${a.player.name} (${formatCurrencyLakhs(a.costLakhs)}${a.player.isCapped ? '' : ' Uncapped'})`)
          .join(', ');
        this.insertSystemChat(
          room.id,
          `⭐ ${params.teamCode} finalized ${retentionsCount} retention(s): ${detail}. Purse left: ${formatCurrencyLakhs(newPurse)} • ${rtmCardsRemaining} RTM card(s).`
        );
      } else {
        this.insertSystemChat(
          room.id,
          `🔄 ${params.teamCode} cleared all retentions. Purse: ₹120.00 Cr • 6 RTM cards.`
        );
      }
    });

    tx();

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  applyOfficial2025Retentions(params: {
    roomCode: string;
    hostUserId: string;
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, status, host_user_id FROM rooms WHERE code = ?')
      .get(code) as { id: string; status: RoomStatus; host_user_id: string } | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can auto-apply official 2025 retentions.', 403);
    }
    if (room.status !== 'WAITING') {
      throw new AuctionEngineError('Official retentions can only be applied in the waiting lobby.');
    }

    for (const franchise of IPL_FRANCHISES) {
      const names = OFFICIAL_2025_RETENTIONS[franchise.code] || [];
      if (names.length === 0) continue;

      const placeholders = names.map(() => '?').join(',');
      const rows = db
        .prepare(`SELECT id FROM players WHERE previous_team = ? AND name IN (${placeholders}) LIMIT ${BCCI_MAX_RETENTIONS}`)
        .all(franchise.code, ...names) as { id: number }[];

      if (rows.length > 0) {
        this.saveRetentions({
          roomCode: code,
          userId: params.hostUserId,
          teamCode: franchise.code,
          playerIds: rows.map((r) => r.id),
        });
      }
    }

    this.insertSystemChat(
      room.id,
      '🇮🇳 Official 2025 IPL Pre-Auction Retentions successfully applied across all 10 franchises!'
    );

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  pauseAuction(params: { roomCode: string; hostUserId: string }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id, status FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; host_user_id: string; status: RoomStatus }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can pause the auction.', 403);
    }
    if (room.status !== 'ACTIVE') {
      throw new AuctionEngineError('Auction is not active.', 400);
    }

    const rt = this.getOrCreateRuntime(room.id, code);
    const remaining = rt.rtmState
      ? Math.max(1000, rt.rtmState.timerEndsAt - Date.now())
      : rt.timerEndsAt
        ? Math.max(2000, rt.timerEndsAt - Date.now())
        : 10000;

    this.clearRuntimeTimers(rt);
    rt.timerEndsAt = null;
    rt.pausedRemainingMs = remaining;

    db.prepare(`UPDATE rooms SET status = 'PAUSED' WHERE id = ?`).run(room.id);
    this.insertSystemChat(room.id, '⏸️ Auction paused by Host.');

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  resumeAuction(params: { roomCode: string; hostUserId: string }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id, status, timer_seconds, current_lot_id FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          host_user_id: string;
          status: RoomStatus;
          timer_seconds: number;
          current_lot_id: string | null;
        }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can resume the auction.', 403);
    }
    if (room.status !== 'PAUSED') {
      throw new AuctionEngineError('Auction is not paused.', 400);
    }

    db.prepare(`UPDATE rooms SET status = 'ACTIVE' WHERE id = ?`).run(room.id);
    this.insertSystemChat(room.id, '▶️ Auction resumed!');

    const rt = this.getOrCreateRuntime(room.id, code);
    const currentLot = room.current_lot_id
      ? (db
          .prepare('SELECT status FROM auction_lots WHERE id = ?')
          .get(room.current_lot_id) as { status: LotStatus } | undefined)
      : undefined;

    if (rt.rtmState) {
      const resumeMs = Math.max(1000, rt.pausedRemainingMs || 5000);
      rt.pausedRemainingMs = null;
      rt.rtmState.timerEndsAt = Date.now() + resumeMs;
      rt.rtmTimeout = setTimeout(() => {
        this.handleRtmTimeout(rt);
      }, resumeMs);
    } else if (currentLot?.status === 'ON_BLOCK') {
      const resumeMs = rt.pausedRemainingMs || room.timer_seconds * 1000;
      this.startLotTimer(rt, resumeMs);
      this.scheduleBotConsideration(rt);
    } else {
      this.advanceToNextLot(rt);
    }

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  skipOrHammerCurrentLot(params: { roomCode: string; hostUserId: string }): void {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id, status, current_lot_id, max_squad_size, min_squad_size, max_overseas FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          host_user_id: string;
          status: RoomStatus;
          current_lot_id: string | null;
          max_squad_size: number;
          min_squad_size: number;
          max_overseas: number;
        }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can drop the gavel early.', 403);
    }
    if (room.status !== 'ACTIVE') {
      throw new AuctionEngineError('Auction must be active.', 400);
    }

    const rt = this.getOrCreateRuntime(room.id, code);

    // If current lot is ON_BLOCK and there are AI bots in the room, simulate bot competition
    // up to the player's fair value capability rather than underselling them!
    const actualLotId = room.current_lot_id;
    if (actualLotId) {
      const lotRow = db
        .prepare(
          `SELECT l.id AS lot_id, l.*, p.*
           FROM auction_lots l
           JOIN players p ON p.id = l.player_id
           WHERE l.id = ?`
        )
        .get(actualLotId) as
        | (PlayerRecord & {
            lot_id: string;
            lot_number: number;
            current_bid_lakhs: number | null;
            current_bidder_team: TeamCode | null;
            status: LotStatus;
          })
        | undefined;

      if (lotRow && lotRow.status === 'ON_BLOCK') {
        const bots = db
          .prepare('SELECT * FROM room_teams WHERE room_id = ? AND is_bot = 1')
          .all(room.id) as {
          team_code: TeamCode;
          bot_strategy: BotStrategy | null;
          purse_remaining_lakhs: number;
          squad_count: number;
          overseas_count: number;
        }[];

        if (bots.length > 0) {
          const playerDto = mapPlayerToDTO(lotRow);
          const fairVal = estimateFairValueLakhs(playerDto);
          const currentBid = lotRow.current_bid_lakhs || 0;
          const currentBidder = lotRow.current_bidder_team;

          const interestedBots: { teamCode: TeamCode; ceiling: number }[] = [];

          for (const bot of bots) {
            if (bot.squad_count >= room.max_squad_size) continue;
            if (playerDto.isOverseas && bot.overseas_count >= room.max_overseas) continue;

            const slotsNeededForMin = Math.max(0, room.min_squad_size - bot.squad_count - 1);
            const safeSpendable = bot.purse_remaining_lakhs - slotsNeededForMin * 30;
            if (lotRow.base_price_lakhs > safeSpendable) continue;

            const roleCounts = db
              .prepare(
                `SELECT p.role, COUNT(*) as cnt
                 FROM auction_lots l
                 JOIN players p ON p.id = l.player_id
                 WHERE l.room_id = ? AND l.sold_to_team = ? AND l.status = 'SOLD'
                 GROUP BY p.role`
              )
              .all(room.id, bot.team_code) as { role: string; cnt: number }[];

            const rMap: Record<string, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
            for (const rc of roleCounts) rMap[rc.role] = rc.cnt;

            let multiplier = 0.95;
            if (bot.bot_strategy === 'AGGRESSIVE') multiplier = 1.15;
            else if (bot.bot_strategy === 'STAR_HUNTER') {
              multiplier = playerDto.overallRating >= 89 ? 1.25 : 0.85;
            } else if (bot.bot_strategy === 'MONEYBALL') {
              multiplier = playerDto.overallRating >= 91 ? 0.88 : 1.10;
            }

            if (playerDto.role === 'WK' && rMap.WK === 0) multiplier *= 1.25;
            else if (playerDto.role === 'WK' && rMap.WK >= 3) multiplier *= 0.45;
            if (playerDto.role === 'BOWL' && rMap.BOWL < 5) multiplier *= 1.10;
            if (playerDto.role === 'AR' && rMap.AR < 3) multiplier *= 1.12;

            const seed =
              (bot.team_code.charCodeAt(0) * 31 +
                bot.team_code.charCodeAt(1) * 17 +
                playerDto.id * 13) %
              100;

            if (playerDto.overallRating <= 78 && seed < 62 && bot.squad_count < 14) continue;
            if (playerDto.overallRating <= 81 && seed < 40) continue;

            const affinityFactor = 0.82 + (seed / 100) * 0.36;
            const maxWilling = Math.min(
              safeSpendable,
              Math.round((fairVal * multiplier * affinityFactor) / 5) * 5
            );

            if (maxWilling >= lotRow.base_price_lakhs) {
              interestedBots.push({ teamCode: bot.team_code, ceiling: maxWilling });
            }
          }

          interestedBots.sort((a, b) => b.ceiling - a.ceiling);
          const eligibleBots = interestedBots.filter((b) => b.ceiling > currentBid);

          if (eligibleBots.length > 0) {
            const topBot = eligibleBots[0];
            let winningPrice = lotRow.base_price_lakhs;

            if (eligibleBots.length >= 2) {
              const secondCeiling = Math.max(eligibleBots[1].ceiling, currentBid);
              winningPrice = Math.min(
                topBot.ceiling,
                getNextMinimumBidLakhs(lotRow.base_price_lakhs, secondCeiling, eligibleBots[1].teamCode)
              );
            } else if (currentBid > 0) {
              winningPrice = Math.min(
                topBot.ceiling,
                getNextMinimumBidLakhs(lotRow.base_price_lakhs, currentBid, currentBidder)
              );
            } else {
              winningPrice = lotRow.base_price_lakhs;
            }

            winningPrice = Math.max(lotRow.base_price_lakhs, winningPrice);

            db.prepare(
              `UPDATE auction_lots
               SET current_bid_lakhs = ?, current_bidder_team = ?
               WHERE id = ?`
            ).run(winningPrice, topBot.teamCode, actualLotId);

            db.prepare(
              `INSERT INTO auction_bids (id, lot_id, team_code, amount_lakhs, created_at)
               VALUES (?, ?, ?, ?, ?)`
            ).run(uuidv4(), actualLotId, topBot.teamCode, winningPrice, new Date().toISOString());

            this.insertSystemChat(
              room.id,
              `⚡ Pass to AI: ${topBot.teamCode} secured top simulated bid at ${formatCurrencyLakhs(winningPrice)}!`
            );
          }
        }
      }
    }

    rt.isTransitioning = false;
    this.finalizeCurrentLot(rt);
  }

  toggleAcceleratedMode(params: {
    roomCode: string;
    hostUserId: string;
    enabled: boolean;
  }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id FROM rooms WHERE code = ?')
      .get(code) as { id: string; host_user_id: string } | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can toggle Accelerated Mode.', 403);
    }

    db.prepare('UPDATE rooms SET accelerated_mode = ? WHERE id = ?').run(
      params.enabled ? 1 : 0,
      room.id
    );
    this.insertSystemChat(
      room.id,
      params.enabled
        ? '⚡ Accelerated Auction Mode ENABLED (7s rapid countdowns)!'
        : '⏱️ Standard Countdown Timer restored.'
    );

    const snapshot = this.getRoomSnapshot(code);
    this.broadcastRoomState(code, snapshot);
    return snapshot;
  }

  startUnsoldReauction(params: { roomCode: string; hostUserId: string }): RoomSnapshot {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; host_user_id: string; status: RoomStatus; auction_round: number }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can start the Unsold Round.', 403);
    }

    const unsoldLots = db
      .prepare(`SELECT id FROM auction_lots WHERE room_id = ? AND status = 'UNSOLD'`)
      .all(room.id) as { id: string }[];

    if (unsoldLots.length === 0) {
      throw new AuctionEngineError('There are no unsold players to re-auction yet.', 400);
    }

    const nextRound = room.auction_round + 1;
    db.prepare(
      `UPDATE auction_lots
       SET status = 'UPCOMING', round_offered = ?, current_bid_lakhs = NULL, current_bidder_team = NULL
       WHERE room_id = ? AND status = 'UNSOLD'`
    ).run(nextRound, room.id);

    db.prepare(
      `UPDATE rooms SET status = 'ACTIVE', auction_round = ?, accelerated_mode = 1 WHERE id = ?`
    ).run(nextRound, room.id);

    this.insertSystemChat(
      room.id,
      `🔄 UNSOLD ACCELERATED ROUND ${nextRound}: ${unsoldLots.length} unsold players re-entered the pool!`
    );

    const rt = this.getOrCreateRuntime(room.id, code);
    this.advanceToNextLot(rt);
    return this.getRoomSnapshot(code);
  }

  async finishAuctionByHost(params: {
    roomCode: string;
    hostUserId: string;
  }): Promise<RoomAnalysisReport> {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id, host_user_id, status FROM rooms WHERE code = ?')
      .get(code) as
      | { id: string; host_user_id: string; status: RoomStatus }
      | undefined;

    if (!room) throw new AuctionEngineError('Room not found.', 404);
    if (room.host_user_id !== params.hostUserId) {
      throw new AuctionEngineError('Only the host can conclude the auction.', 403);
    }

    const rt = this.getOrCreateRuntime(room.id, code);
    return this.finishAuctionInternal(
      rt,
      'Auction officially concluded by Host! Generating Post-Auction Team Rankings...'
    );
  }

  private async finishAuctionInternal(
    rt: RoomRuntime,
    reasonMessage: string
  ): Promise<RoomAnalysisReport> {
    this.clearRuntimeTimers(rt);
    rt.timerEndsAt = null;
    rt.pausedRemainingMs = null;
    rt.isTransitioning = false;

    const db = getDb();
    db.prepare(
      `UPDATE auction_lots SET status = 'UPCOMING' WHERE room_id = ? AND status = 'ON_BLOCK'`
    ).run(rt.roomId);

    const tradeWindowDurationMs = 5 * 60 * 1000; // 5 minutes
    const tradeWindowEndsAt = Date.now() + tradeWindowDurationMs;

    db.prepare(
      `UPDATE rooms SET status = 'COMPLETED', current_lot_id = NULL, completed_at = datetime('now'), trade_window_active = 1, trade_window_ends_at = ? WHERE id = ?`
    ).run(tradeWindowEndsAt, rt.roomId);

    this.insertSystemChat(rt.roomId, `🏆 ${reasonMessage}`);
    this.insertSystemChat(
      rt.roomId,
      `🔄 POST-AUCTION TRADE WINDOW IS NOW OPEN (5 mins)! Franchises can propose player-for-player or purse trades to patch squad holes.`
    );

    if (rt.tradeWindowTimeout) {
      clearTimeout(rt.tradeWindowTimeout);
    }
    rt.tradeWindowTimeout = setTimeout(() => {
      void this.concludeTradeWindow({ roomCode: rt.roomCode });
    }, tradeWindowDurationMs);

    const report = await generateRoomAnalysis(rt.roomId, true);
    const snapshot = this.getRoomSnapshot(rt.roomCode);

    this.io?.to(this.socketRoomKey(rt.roomCode)).emit('auction:completed', {
      analysis: report,
      room: snapshot,
    });
    this.io?.to(this.socketRoomKey(rt.roomCode)).emit('trade:window_opened', {
      tradeWindowEndsAt,
      snapshot,
    });
    this.broadcastRoomState(rt.roomCode, snapshot);
    return report;
  }

  sendChatMessage(params: {
    roomCode: string;
    user: PublicUser;
    content: string;
    messageType?: 'USER' | 'REACTION';
  }): ChatMessageDTO {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id FROM rooms WHERE code = ?')
      .get(code) as { id: string } | undefined;
    if (!room) throw new AuctionEngineError('Room not found.', 404);

    const teamRow = db
      .prepare('SELECT team_code FROM room_teams WHERE room_id = ? AND user_id = ?')
      .get(room.id, params.user.id) as { team_code: TeamCode } | undefined;

    const sanitized = params.content
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 280);
    if (!sanitized) {
      throw new AuctionEngineError('Message cannot be empty.', 400);
    }

    const msgId = uuidv4();
    const nowIso = new Date().toISOString();
    const mType = params.messageType || 'USER';

    db.prepare(
      `INSERT INTO chat_messages (id, room_id, user_id, sender_name, team_code, message_type, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      msgId,
      room.id,
      params.user.id,
      params.user.displayName,
      teamRow?.team_code || null,
      mType,
      sanitized,
      nowIso
    );

    const dto: ChatMessageDTO = {
      id: msgId,
      roomId: room.id,
      userId: params.user.id,
      senderName: params.user.displayName,
      teamCode: teamRow?.team_code || null,
      messageType: mType,
      content: sanitized,
      createdAt: nowIso,
    };

    if (mType === 'REACTION') {
      this.io?.to(this.socketRoomKey(code)).emit('chat:reaction', dto);
    } else {
      this.io?.to(this.socketRoomKey(code)).emit('chat:message', dto);
    }
    return dto;
  }

  private insertSystemChat(roomId: string, content: string): void {
    const db = getDb();
    const msgId = uuidv4();
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO chat_messages (id, room_id, user_id, sender_name, team_code, message_type, content, created_at)
       VALUES (?, ?, NULL, 'Auctioneer', NULL, 'SYSTEM', ?, ?)`
    ).run(msgId, roomId, content, nowIso);

    const room = db
      .prepare('SELECT code FROM rooms WHERE id = ?')
      .get(roomId) as { code: string } | undefined;
    if (room && this.io) {
      this.io.to(this.socketRoomKey(room.code)).emit('chat:message', {
        id: msgId,
        roomId,
        userId: null,
        senderName: 'Auctioneer',
        teamCode: null,
        messageType: 'SYSTEM',
        content,
        createdAt: nowIso,
      });
    }
  }

  getRoomLots(params: {
    roomCode: string;
    status?: string;
    role?: string;
    capped?: string;
    overseas?: string;
    teamCode?: string;
    search?: string;
  }) {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT id FROM rooms WHERE code = ?')
      .get(code) as { id: string } | undefined;
    if (!room) throw new AuctionEngineError('Room not found.', 404);

    const conds: string[] = ['l.room_id = ?'];
    const queryParams: (string | number)[] = [room.id];

    if (params.status && ['UPCOMING', 'ON_BLOCK', 'SOLD', 'UNSOLD'].includes(params.status)) {
      conds.push('l.status = ?');
      queryParams.push(params.status);
    }
    if (params.role && ['WK', 'BAT', 'AR', 'BOWL'].includes(params.role)) {
      conds.push('p.role = ?');
      queryParams.push(params.role);
    }
    if (params.capped === 'true' || params.capped === '1') {
      conds.push('p.is_capped = 1');
    } else if (params.capped === 'false' || params.capped === '0') {
      conds.push('p.is_capped = 0');
    }
    if (params.overseas === 'true' || params.overseas === '1') {
      conds.push('p.is_overseas = 1');
    } else if (params.overseas === 'false' || params.overseas === '0') {
      conds.push('p.is_overseas = 0');
    }
    if (params.teamCode && VALID_TEAM_CODES.has(params.teamCode)) {
      conds.push('l.sold_to_team = ?');
      queryParams.push(params.teamCode);
    }
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      conds.push('(LOWER(p.name) LIKE ? OR LOWER(p.country) LIKE ? OR LOWER(p.speciality) LIKE ?)');
      queryParams.push(q, q, q);
    }

    const rows = db
      .prepare(
        `SELECT
          l.id as lot_id, l.lot_number, l.set_name, l.status as lot_status,
          l.base_price_lakhs as lot_base_price, l.current_bid_lakhs, l.current_bidder_team,
          l.sold_to_team, l.sold_price_lakhs, l.is_retention, l.is_rtm_buy, p.*
         FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE ${conds.join(' AND ')}
         ORDER BY l.lot_number ASC`
      )
      .all(...queryParams) as (PlayerRecord & {
      lot_id: string;
      lot_number: number;
      set_name: string;
      lot_status: LotStatus;
      lot_base_price: number;
      current_bid_lakhs: number | null;
      current_bidder_team: TeamCode | null;
      sold_to_team: TeamCode | null;
      sold_price_lakhs: number | null;
      is_retention?: number;
      is_rtm_buy?: number;
    })[];

    return rows.map((r) => ({
      lotId: r.lot_id,
      lotNumber: r.lot_number,
      setName: r.set_name,
      setLabel: AUCTION_SET_LABELS[r.set_name] || r.set_name,
      status: r.lot_status,
      basePriceLakhs: r.lot_base_price,
      currentBidLakhs: r.current_bid_lakhs,
      currentBidderTeam: r.current_bidder_team,
      soldToTeam: r.sold_to_team,
      soldPriceLakhs: r.sold_price_lakhs,
      isRetention: Boolean(r.is_retention),
      isRtmBuy: Boolean(r.is_rtm_buy),
      player: mapPlayerToDTO(r),
    }));
  }

  getRoomTrades(roomCode: string): TradeDTO[] {
    const db = getDb();
    const code = roomCode.trim().toUpperCase();
    const room = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code) as
      | { id: string }
      | undefined;
    if (!room) return [];

    const rows = db
      .prepare(
        `SELECT id, room_id, proposer_team, receiver_team, offered_player_ids, requested_player_ids, purse_transfer_lakhs, status, created_at, updated_at
         FROM room_trades
         WHERE room_id = ?
         ORDER BY created_at DESC`
      )
      .all(room.id) as {
      id: string;
      room_id: string;
      proposer_team: TeamCode;
      receiver_team: TeamCode;
      offered_player_ids: string;
      requested_player_ids: string;
      purse_transfer_lakhs: number;
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
      created_at: string;
      updated_at: string;
    }[];

    if (rows.length === 0) return [];

    const allPlayerIds = new Set<number>();
    const parsedRows = rows.map((r) => {
      let offered: number[] = [];
      let requested: number[] = [];
      try {
        offered = JSON.parse(r.offered_player_ids);
      } catch {}
      try {
        requested = JSON.parse(r.requested_player_ids);
      } catch {}
      offered.forEach((id) => allPlayerIds.add(id));
      requested.forEach((id) => allPlayerIds.add(id));
      return { ...r, offered, requested };
    });

    const playerMap = new Map<number, PlayerDTO>();
    if (allPlayerIds.size > 0) {
      const idsArray = Array.from(allPlayerIds);
      const placeholders = idsArray.map(() => '?').join(',');
      const players = db
        .prepare(`SELECT * FROM players WHERE id IN (${placeholders})`)
        .all(...idsArray) as PlayerRecord[];
      players.forEach((p) => playerMap.set(p.id, mapPlayerToDTO(p)));
    }

    return parsedRows.map((r) => ({
      id: r.id,
      roomId: r.room_id,
      proposerTeam: r.proposer_team,
      receiverTeam: r.receiver_team,
      offeredPlayerIds: r.offered,
      offeredPlayers: r.offered.map((id) => playerMap.get(id)!).filter(Boolean),
      requestedPlayerIds: r.requested,
      requestedPlayers: r.requested.map((id) => playerMap.get(id)!).filter(Boolean),
      purseTransferLakhs: r.purse_transfer_lakhs,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  proposeTrade(params: {
    roomCode: string;
    userId: string;
    proposerTeam: TeamCode;
    receiverTeam: TeamCode;
    offeredPlayerIds: number[];
    requestedPlayerIds: number[];
    purseTransferLakhs?: number;
  }): { trade: TradeDTO; snapshot: RoomSnapshot } {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          code: string;
          status: RoomStatus;
          trade_window_active: number;
          trade_window_ends_at: number | null;
          max_squad_size: number;
          max_overseas: number;
        }
      | undefined;

    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }
    if (!room.trade_window_active) {
      throw new AuctionEngineError('Trade window is currently closed for this room.', 400);
    }
    if (room.trade_window_ends_at && Date.now() > room.trade_window_ends_at) {
      void this.concludeTradeWindow({ roomCode: code });
      throw new AuctionEngineError('Trade window has expired.', 400);
    }

    const { proposerTeam, receiverTeam } = params;
    if (proposerTeam === receiverTeam) {
      throw new AuctionEngineError('Cannot trade with your own franchise.', 400);
    }

    const proposer = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, proposerTeam) as
      | { user_id: string | null; purse_remaining_lakhs: number; is_bot: number }
      | undefined;
    const receiver = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, receiverTeam) as
      | { user_id: string | null; purse_remaining_lakhs: number; is_bot: number }
      | undefined;

    if (!proposer || !receiver) {
      throw new AuctionEngineError('One or both franchises not found in room.', 404);
    }

    if (params.userId !== 'BOT' && proposer.user_id !== params.userId) {
      const hostCheck = db
        .prepare('SELECT host_user_id FROM rooms WHERE id = ?')
        .get(room.id) as { host_user_id: string };
      if (hostCheck.host_user_id !== params.userId) {
        throw new AuctionEngineError('You can only propose trades for your own franchise.', 403);
      }
    }

    const offeredIds = params.offeredPlayerIds || [];
    const requestedIds = params.requestedPlayerIds || [];
    const purseTransfer = params.purseTransferLakhs || 0;

    if (offeredIds.length === 0 && requestedIds.length === 0) {
      throw new AuctionEngineError('Trade must include at least one player to offer or request.', 400);
    }

    if (offeredIds.length > 0) {
      const ph = offeredIds.map(() => '?').join(',');
      const count = db
        .prepare(
          `SELECT COUNT(*) as c FROM auction_lots
           WHERE room_id = ? AND status = 'SOLD' AND sold_to_team = ? AND player_id IN (${ph})`
        )
        .get(room.id, proposerTeam, ...offeredIds) as { c: number };
      if (count.c !== offeredIds.length) {
        throw new AuctionEngineError('One or more offered players are not owned by your team.', 400);
      }
    }

    if (requestedIds.length > 0) {
      const ph = requestedIds.map(() => '?').join(',');
      const count = db
        .prepare(
          `SELECT COUNT(*) as c FROM auction_lots
           WHERE room_id = ? AND status = 'SOLD' AND sold_to_team = ? AND player_id IN (${ph})`
        )
        .get(room.id, receiverTeam, ...requestedIds) as { c: number };
      if (count.c !== requestedIds.length) {
        throw new AuctionEngineError('One or more requested players are not owned by target team.', 400);
      }
    }

    if (purseTransfer > 0 && proposer.purse_remaining_lakhs < purseTransfer) {
      throw new AuctionEngineError(
        `Insufficient purse funds. Your team only has ₹${formatCurrencyLakhs(proposer.purse_remaining_lakhs)} remaining.`,
        400
      );
    }
    if (purseTransfer < 0 && receiver.purse_remaining_lakhs < -purseTransfer) {
      throw new AuctionEngineError(
        `Target franchise has insufficient purse to pay requested amount (has ₹${formatCurrencyLakhs(receiver.purse_remaining_lakhs)}).`,
        400
      );
    }

    const proposerLots = db
      .prepare(
        `SELECT p.id, p.is_overseas FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.room_id = ? AND l.status = 'SOLD' AND l.sold_to_team = ?`
      )
      .all(room.id, proposerTeam) as { id: number; is_overseas: number }[];

    const receiverLots = db
      .prepare(
        `SELECT p.id, p.is_overseas FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.room_id = ? AND l.status = 'SOLD' AND l.sold_to_team = ?`
      )
      .all(room.id, receiverTeam) as { id: number; is_overseas: number }[];

    const proposerNewSquadCount = proposerLots.length - offeredIds.length + requestedIds.length;
    const receiverNewSquadCount = receiverLots.length - requestedIds.length + offeredIds.length;

    if (proposerNewSquadCount > room.max_squad_size) {
      throw new AuctionEngineError(
        `Trade would exceed maximum squad size of ${room.max_squad_size} for ${proposerTeam} (${proposerNewSquadCount}).`,
        400
      );
    }
    if (receiverNewSquadCount > room.max_squad_size) {
      throw new AuctionEngineError(
        `Trade would exceed maximum squad size of ${room.max_squad_size} for ${receiverTeam} (${receiverNewSquadCount}).`,
        400
      );
    }

    const offeredOverseas = offeredIds.length
      ? (db
          .prepare(
            `SELECT COUNT(*) as c FROM players WHERE id IN (${offeredIds.map(() => '?').join(',')}) AND is_overseas = 1`
          )
          .get(...offeredIds) as { c: number })?.c || 0
      : 0;

    const requestedOverseas = requestedIds.length
      ? (db
          .prepare(
            `SELECT COUNT(*) as c FROM players WHERE id IN (${requestedIds.map(() => '?').join(',')}) AND is_overseas = 1`
          )
          .get(...requestedIds) as { c: number })?.c || 0
      : 0;

    const proposerCurrentOverseas = proposerLots.filter((p) => p.is_overseas === 1).length;
    const receiverCurrentOverseas = receiverLots.filter((p) => p.is_overseas === 1).length;

    const proposerNewOverseas = proposerCurrentOverseas - offeredOverseas + requestedOverseas;
    const receiverNewOverseas = receiverCurrentOverseas - requestedOverseas + offeredOverseas;

    if (proposerNewOverseas > room.max_overseas) {
      throw new AuctionEngineError(
        `Trade violates maximum overseas player limit (${room.max_overseas}) for ${proposerTeam} (would have ${proposerNewOverseas}).`,
        400
      );
    }
    if (receiverNewOverseas > room.max_overseas) {
      throw new AuctionEngineError(
        `Trade violates maximum overseas player limit (${room.max_overseas}) for ${receiverTeam} (would have ${receiverNewOverseas}).`,
        400
      );
    }

    const tradeId = uuidv4();
    db.prepare(
      `INSERT INTO room_trades (
        id, room_id, proposer_team, receiver_team, offered_player_ids, requested_player_ids, purse_transfer_lakhs, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))`
    ).run(
      tradeId,
      room.id,
      proposerTeam,
      receiverTeam,
      JSON.stringify(offeredIds),
      JSON.stringify(requestedIds),
      purseTransfer
    );

    const offeredNames = offeredIds.length
      ? (db
          .prepare(`SELECT name FROM players WHERE id IN (${offeredIds.map(() => '?').join(',')})`)
          .all(...offeredIds) as { name: string }[])
          .map((p) => p.name)
      : [];
    const requestedNames = requestedIds.length
      ? (db
          .prepare(`SELECT name FROM players WHERE id IN (${requestedIds.map(() => '?').join(',')})`)
          .all(...requestedIds) as { name: string }[])
          .map((p) => p.name)
      : [];

    let tradeSummary = `🤝 TRADE OFFER: ${proposerTeam} offered `;
    if (offeredNames.length) tradeSummary += offeredNames.join(', ');
    if (purseTransfer > 0) tradeSummary += ` + ₹${formatCurrencyLakhs(purseTransfer)} purse`;
    tradeSummary += ` to ${receiverTeam} for `;
    if (requestedNames.length) tradeSummary += requestedNames.join(', ');
    if (purseTransfer < 0) tradeSummary += ` + ₹${formatCurrencyLakhs(-purseTransfer)} purse`;

    this.insertSystemChat(room.id, tradeSummary);

    const snapshot = this.getRoomSnapshot(code);
    const trades = this.getRoomTrades(code);
    const trade = trades.find((t) => t.id === tradeId)!;

    this.io?.to(this.socketRoomKey(code)).emit('trade:proposed', { trade, snapshot });
    this.broadcastRoomState(code, snapshot);

    if (receiver.is_bot) {
      setTimeout(() => {
        void this.evaluateBotTrade(room.id, code, tradeId);
      }, 2500);
    }

    return { trade, snapshot };
  }

  async respondToTrade(params: {
    roomCode: string;
    userId: string;
    tradeId: string;
    decision: 'ACCEPT' | 'REJECT';
  }): Promise<{ trade: TradeDTO; snapshot: RoomSnapshot; analysis?: RoomAnalysisReport }> {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as
      | { id: string; code: string; status: RoomStatus; trade_window_active: number; max_squad_size: number; max_overseas: number }
      | undefined;

    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }

    const tradeRow = db
      .prepare('SELECT * FROM room_trades WHERE id = ? AND room_id = ?')
      .get(params.tradeId, room.id) as
      | {
          id: string;
          room_id: string;
          proposer_team: TeamCode;
          receiver_team: TeamCode;
          offered_player_ids: string;
          requested_player_ids: string;
          purse_transfer_lakhs: number;
          status: string;
        }
      | undefined;

    if (!tradeRow) {
      throw new AuctionEngineError('Trade proposal not found.', 404);
    }
    if (tradeRow.status !== 'PENDING') {
      throw new AuctionEngineError(`Trade is already ${tradeRow.status.toLowerCase()}.`, 400);
    }

    const receiverTeam = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, tradeRow.receiver_team) as
      | { user_id: string | null; is_bot: number; purse_remaining_lakhs: number }
      | undefined;

    if (!receiverTeam) {
      throw new AuctionEngineError('Receiver franchise not found.', 404);
    }

    if (params.userId !== 'BOT') {
      const hostCheck = db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(room.id) as { host_user_id: string };
      if (receiverTeam.user_id !== params.userId && hostCheck.host_user_id !== params.userId) {
        throw new AuctionEngineError('Only the receiving franchise owner can respond to this trade.', 403);
      }
    }

    if (params.decision === 'REJECT') {
      db.prepare("UPDATE room_trades SET status = 'REJECTED', updated_at = datetime('now') WHERE id = ?").run(params.tradeId);
      this.insertSystemChat(room.id, `❌ TRADE DECLINED: ${tradeRow.receiver_team} turned down the trade offer from ${tradeRow.proposer_team}.`);

      const snapshot = this.getRoomSnapshot(code);
      const trades = this.getRoomTrades(code);
      const trade = trades.find((t) => t.id === params.tradeId)!;
      this.io?.to(this.socketRoomKey(code)).emit('trade:rejected', { trade, snapshot });
      this.broadcastRoomState(code, snapshot);
      return { trade, snapshot };
    }

    // ACCEPT: Atomic player and purse swap
    const offeredIds: number[] = JSON.parse(tradeRow.offered_player_ids || '[]');
    const requestedIds: number[] = JSON.parse(tradeRow.requested_player_ids || '[]');
    const purseTransfer = tradeRow.purse_transfer_lakhs;

    const executeAccept = db.transaction(() => {
      if (offeredIds.length > 0) {
        const ph = offeredIds.map(() => '?').join(',');
        const count = db
          .prepare(
            `SELECT COUNT(*) as c FROM auction_lots
             WHERE room_id = ? AND status = 'SOLD' AND sold_to_team = ? AND player_id IN (${ph})`
          )
          .get(room.id, tradeRow.proposer_team, ...offeredIds) as { c: number };
        if (count.c !== offeredIds.length) {
          throw new AuctionEngineError('Trade invalid: Proposer no longer owns all offered players.', 400);
        }
      }

      if (requestedIds.length > 0) {
        const ph = requestedIds.map(() => '?').join(',');
        const count = db
          .prepare(
            `SELECT COUNT(*) as c FROM auction_lots
             WHERE room_id = ? AND status = 'SOLD' AND sold_to_team = ? AND player_id IN (${ph})`
          )
          .get(room.id, tradeRow.receiver_team, ...requestedIds) as { c: number };
        if (count.c !== requestedIds.length) {
          throw new AuctionEngineError('Trade invalid: Receiver no longer owns all requested players.', 400);
        }
      }

      const propTeam = db.prepare('SELECT purse_remaining_lakhs FROM room_teams WHERE room_id = ? AND team_code = ?').get(room.id, tradeRow.proposer_team) as { purse_remaining_lakhs: number };
      const recTeam = db.prepare('SELECT purse_remaining_lakhs FROM room_teams WHERE room_id = ? AND team_code = ?').get(room.id, tradeRow.receiver_team) as { purse_remaining_lakhs: number };

      if (purseTransfer > 0 && propTeam.purse_remaining_lakhs < purseTransfer) {
        throw new AuctionEngineError('Proposer has insufficient purse funds.', 400);
      }
      if (purseTransfer < 0 && recTeam.purse_remaining_lakhs < -purseTransfer) {
        throw new AuctionEngineError('Receiver has insufficient purse funds.', 400);
      }

      if (offeredIds.length > 0) {
        const ph = offeredIds.map(() => '?').join(',');
        db.prepare(
          `UPDATE auction_lots SET sold_to_team = ?, updated_at = datetime('now')
           WHERE room_id = ? AND player_id IN (${ph})`
        ).run(tradeRow.receiver_team, room.id, ...offeredIds);
      }
      if (requestedIds.length > 0) {
        const ph = requestedIds.map(() => '?').join(',');
        db.prepare(
          `UPDATE auction_lots SET sold_to_team = ?, updated_at = datetime('now')
           WHERE room_id = ? AND player_id IN (${ph})`
        ).run(tradeRow.proposer_team, room.id, ...requestedIds);
      }

      if (purseTransfer !== 0) {
        db.prepare(
          'UPDATE room_teams SET purse_remaining_lakhs = purse_remaining_lakhs - ? WHERE room_id = ? AND team_code = ?'
        ).run(purseTransfer, room.id, tradeRow.proposer_team);
        db.prepare(
          'UPDATE room_teams SET purse_remaining_lakhs = purse_remaining_lakhs + ? WHERE room_id = ? AND team_code = ?'
        ).run(purseTransfer, room.id, tradeRow.receiver_team);
      }

      const refreshTeamCounts = (teamCode: TeamCode) => {
        const stats = db
          .prepare(
            `SELECT COUNT(*) as squad,
                    SUM(CASE WHEN p.is_overseas = 1 THEN 1 ELSE 0 END) as overseas
             FROM auction_lots l
             JOIN players p ON p.id = l.player_id
             WHERE l.room_id = ? AND l.status = 'SOLD' AND l.sold_to_team = ?`
          )
          .get(room.id, teamCode) as { squad: number; overseas: number };

        db.prepare(
          'UPDATE room_teams SET squad_count = ?, overseas_count = ? WHERE room_id = ? AND team_code = ?'
        ).run(stats.squad || 0, stats.overseas || 0, room.id, teamCode);
      };
      refreshTeamCounts(tradeRow.proposer_team);
      refreshTeamCounts(tradeRow.receiver_team);

      db.prepare("UPDATE room_trades SET status = 'ACCEPTED', updated_at = datetime('now') WHERE id = ?").run(params.tradeId);

      const allTraded = [...offeredIds, ...requestedIds];
      const pendingTrades = db
        .prepare("SELECT id, offered_player_ids, requested_player_ids FROM room_trades WHERE room_id = ? AND status = 'PENDING'")
        .all(room.id) as { id: string; offered_player_ids: string; requested_player_ids: string }[];

      for (const pt of pendingTrades) {
        let pOffered: number[] = [];
        let pRequested: number[] = [];
        try { pOffered = JSON.parse(pt.offered_player_ids); } catch {}
        try { pRequested = JSON.parse(pt.requested_player_ids); } catch {}
        const ptPlayers = new Set([...pOffered, ...pRequested]);
        const conflict = allTraded.some((id) => ptPlayers.has(id));
        if (conflict) {
          db.prepare("UPDATE room_trades SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(pt.id);
        }
      }
    });

    executeAccept();

    this.insertSystemChat(
      room.id,
      `🎉 TRADE COMPLETED! ${tradeRow.proposer_team} and ${tradeRow.receiver_team} successfully completed their squad trade!`
    );

    const analysis = await generateRoomAnalysis(room.id, true);
    const snapshot = this.getRoomSnapshot(code);
    const trades = this.getRoomTrades(code);
    const trade = trades.find((t) => t.id === params.tradeId)!;

    this.io?.to(this.socketRoomKey(code)).emit('trade:accepted', {
      trade,
      snapshot,
      analysis,
    });
    this.broadcastRoomState(code, snapshot);

    return { trade, snapshot, analysis };
  }

  cancelTrade(params: {
    roomCode: string;
    userId: string;
    tradeId: string;
  }): { trade: TradeDTO; snapshot: RoomSnapshot } {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code) as
      | { id: string }
      | undefined;
    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }

    const trade = db
      .prepare('SELECT * FROM room_trades WHERE id = ? AND room_id = ?')
      .get(params.tradeId, room.id) as
      | { id: string; proposer_team: TeamCode; status: string }
      | undefined;
    if (!trade) {
      throw new AuctionEngineError('Trade proposal not found.', 404);
    }
    if (trade.status !== 'PENDING') {
      throw new AuctionEngineError(`Trade is already ${trade.status.toLowerCase()}.`, 400);
    }

    const proposer = db
      .prepare('SELECT user_id FROM room_teams WHERE room_id = ? AND team_code = ?')
      .get(room.id, trade.proposer_team) as { user_id: string | null } | undefined;

    if (params.userId !== 'BOT') {
      const hostCheck = db.prepare('SELECT host_user_id FROM rooms WHERE id = ?').get(room.id) as { host_user_id: string };
      if (proposer?.user_id !== params.userId && hostCheck.host_user_id !== params.userId) {
        throw new AuctionEngineError('Only the proposer franchise owner can withdraw this trade.', 403);
      }
    }

    db.prepare("UPDATE room_trades SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(params.tradeId);

    const snapshot = this.getRoomSnapshot(code);
    const trades = this.getRoomTrades(code);
    const updatedTrade = trades.find((t) => t.id === params.tradeId)!;

    this.io?.to(this.socketRoomKey(code)).emit('trade:cancelled', { trade: updatedTrade, snapshot });
    this.broadcastRoomState(code, snapshot);

    return { trade: updatedTrade, snapshot };
  }

  async concludeTradeWindow(params: {
    roomCode: string;
    hostUserId?: string;
  }): Promise<{ snapshot: RoomSnapshot; analysis: RoomAnalysisReport }> {
    const db = getDb();
    const code = params.roomCode.trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as
      | { id: string; code: string; host_user_id: string; trade_window_active: number }
      | undefined;
    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }

    if (params.hostUserId && params.hostUserId !== room.host_user_id) {
      throw new AuctionEngineError('Only the room host can prematurely conclude the trade window.', 403);
    }

    const rt = this.getOrCreateRuntime(room.id, room.code);
    if (rt.tradeWindowTimeout) {
      clearTimeout(rt.tradeWindowTimeout);
      rt.tradeWindowTimeout = null;
    }

    db.prepare(
      `UPDATE rooms SET trade_window_active = 0, trade_window_ends_at = NULL WHERE id = ?`
    ).run(room.id);
    db.prepare(
      `UPDATE room_trades SET status = 'CANCELLED', updated_at = datetime('now') WHERE room_id = ? AND status = 'PENDING'`
    ).run(room.id);

    this.insertSystemChat(
      room.id,
      '🏁 POST-AUCTION TRADE WINDOW CONCLUDED! All team rosters and finances are now officially locked.'
    );

    const analysis = await generateRoomAnalysis(room.id, true);
    const snapshot = this.getRoomSnapshot(code);

    this.io?.to(this.socketRoomKey(code)).emit('trade:window_closed', { snapshot, analysis });
    this.broadcastRoomState(code, snapshot);

    return { snapshot, analysis };
  }

  private async evaluateBotTrade(roomId: string, roomCode: string, tradeId: string): Promise<void> {
    const db = getDb();
    const trade = db.prepare('SELECT * FROM room_trades WHERE id = ? AND room_id = ?').get(tradeId, roomId) as
      | {
          id: string;
          proposer_team: TeamCode;
          receiver_team: TeamCode;
          offered_player_ids: string;
          requested_player_ids: string;
          purse_transfer_lakhs: number;
          status: string;
        }
      | undefined;

    if (!trade || trade.status !== 'PENDING') return;

    const offeredIds: number[] = JSON.parse(trade.offered_player_ids || '[]');
    const requestedIds: number[] = JSON.parse(trade.requested_player_ids || '[]');
    const purseTransfer = trade.purse_transfer_lakhs;

    const offeredPlayers = offeredIds.length
      ? (db.prepare(`SELECT * FROM players WHERE id IN (${offeredIds.map(() => '?').join(',')})`).all(...offeredIds) as PlayerRecord[])
      : [];
    const requestedPlayers = requestedIds.length
      ? (db.prepare(`SELECT * FROM players WHERE id IN (${requestedIds.map(() => '?').join(',')})`).all(...requestedIds) as PlayerRecord[])
      : [];

    const offeredRatingSum = offeredPlayers.reduce((sum, p) => sum + p.overall_rating, 0);
    const requestedRatingSum = requestedPlayers.reduce((sum, p) => sum + p.overall_rating, 0);

    const financialEquity = (purseTransfer / 100) * 3;
    const netTradeValue = (offeredRatingSum - requestedRatingSum) + financialEquity;

    const shouldAccept = netTradeValue >= -2;

    if (shouldAccept) {
      await this.respondToTrade({
        roomCode,
        userId: 'BOT',
        tradeId,
        decision: 'ACCEPT',
      });
    } else {
      await this.respondToTrade({
        roomCode,
        userId: 'BOT',
        tradeId,
        decision: 'REJECT',
      });
    }
  }

  getRoomSnapshot(roomCode: string): RoomSnapshot {
    const db = getDb();
    const code = roomCode.trim().toUpperCase();
    const room = db
      .prepare('SELECT * FROM rooms WHERE code = ?')
      .get(code) as
      | {
          id: string;
          code: string;
          name: string;
          host_user_id: string;
          status: RoomStatus;
          visibility: RoomVisibility;
          initial_purse_lakhs: number;
          max_squad_size: number;
          min_squad_size: number;
          max_overseas: number;
          timer_seconds: number;
          current_lot_id: string | null;
          auction_round: number;
          accelerated_mode: number;
          trade_window_active: number;
          trade_window_ends_at: number | null;
        }
      | undefined;

    if (!room) {
      throw new AuctionEngineError('Room not found.', 404);
    }

    const rt = this.getOrCreateRuntime(room.id, room.code);

    const countsRow = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'UPCOMING' THEN 1 ELSE 0 END) as upcoming,
          SUM(CASE WHEN status = 'SOLD' THEN 1 ELSE 0 END) as sold,
          SUM(CASE WHEN status = 'UNSOLD' THEN 1 ELSE 0 END) as unsold
         FROM auction_lots WHERE room_id = ?`
      )
      .get(room.id) as {
      total: number;
      upcoming: number;
      sold: number;
      unsold: number;
    };

    const roleRows = db
      .prepare(
        `SELECT l.sold_to_team as team_code, p.role, COUNT(*) as cnt
         FROM auction_lots l
         JOIN players p ON p.id = l.player_id
         WHERE l.room_id = ? AND l.status = 'SOLD' AND l.sold_to_team IS NOT NULL
         GROUP BY l.sold_to_team, p.role`
      )
      .all(room.id) as { team_code: TeamCode; role: 'WK' | 'BAT' | 'AR' | 'BOWL'; cnt: number }[];

    const roleByTeam = new Map<TeamCode, { WK: number; BAT: number; AR: number; BOWL: number }>();
    for (const r of roleRows) {
      const entry = roleByTeam.get(r.team_code) || { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
      entry[r.role] = r.cnt;
      roleByTeam.set(r.team_code, entry);
    }

    const teamRows = db
      .prepare('SELECT * FROM room_teams WHERE room_id = ?')
      .all(room.id) as {
      team_code: TeamCode;
      user_id: string | null;
      owner_name: string | null;
      is_bot: number;
      bot_strategy: BotStrategy | null;
      purse_remaining_lakhs: number;
      squad_count: number;
      overseas_count: number;
      rtm_cards_remaining: number;
      retentions_count: number;
      is_ready: number;
      is_connected: number;
    }[];

    const teamMap = new Map(teamRows.map((t) => [t.team_code, t]));

    const teams: RoomTeamState[] = IPL_FRANCHISES.map((f) => {
      const row = teamMap.get(f.code);
      return {
        teamCode: f.code,
        teamName: f.name,
        shortName: f.shortName,
        primaryColor: f.primaryColor,
        secondaryColor: f.secondaryColor,
        userId: row?.user_id || null,
        ownerName: row?.owner_name || null,
        isBot: Boolean(row?.is_bot),
        botStrategy: row?.bot_strategy || null,
        purseRemainingLakhs: row?.purse_remaining_lakhs ?? room.initial_purse_lakhs,
        squadCount: row?.squad_count ?? 0,
        overseasCount: row?.overseas_count ?? 0,
        rtmCardsRemaining: row?.rtm_cards_remaining ?? 6,
        retentionsCount: row?.retentions_count ?? 0,
        isReady: Boolean(row?.is_ready),
        isConnected: Boolean(row?.is_connected),
        roleBreakdown: roleByTeam.get(f.code) || { WK: 0, BAT: 0, AR: 0, BOWL: 0 },
      };
    });

    let currentLot: ActiveLotState | null = null;
    if (room.current_lot_id) {
      const lotRow = db
        .prepare(
          `SELECT
            l.id as lot_id, l.lot_number, l.set_name, l.status as lot_status,
            l.base_price_lakhs as lot_base_price, l.current_bid_lakhs,
            l.current_bidder_team, l.sold_to_team, l.sold_price_lakhs,
            l.is_retention, l.is_rtm_buy, p.*
           FROM auction_lots l
           JOIN players p ON p.id = l.player_id
           WHERE l.id = ?`
        )
        .get(room.current_lot_id) as
        | (PlayerRecord & {
            lot_id: string;
            lot_number: number;
            set_name: string;
            lot_status: LotStatus;
            lot_base_price: number;
            current_bid_lakhs: number | null;
            current_bidder_team: TeamCode | null;
            sold_to_team: TeamCode | null;
            sold_price_lakhs: number | null;
            is_retention?: number;
            is_rtm_buy?: number;
          })
        | undefined;

      if (lotRow) {
        currentLot = {
          lotId: lotRow.lot_id,
          lotNumber: lotRow.lot_number,
          totalLots: countsRow.total || 0,
          setName: lotRow.set_name,
          setLabel: AUCTION_SET_LABELS[lotRow.set_name] || lotRow.set_name,
          status: lotRow.lot_status,
          basePriceLakhs: lotRow.lot_base_price,
          currentBidLakhs: lotRow.current_bid_lakhs,
          currentBidderTeam: lotRow.current_bidder_team,
          nextMinBidLakhs: getNextMinimumBidLakhs(
            lotRow.lot_base_price,
            lotRow.current_bid_lakhs,
            lotRow.current_bidder_team
          ),
          soldToTeam: lotRow.sold_to_team,
          soldPriceLakhs: lotRow.sold_price_lakhs,
          isRetention: Boolean(lotRow.is_retention),
          isRtmBuy: Boolean(lotRow.is_rtm_buy),
          player: mapPlayerToDTO(lotRow),
        };
      }
    }

    const recentBidRows = db
      .prepare(
        `SELECT b.id, b.lot_id, b.player_id, p.name as player_name, b.team_code, b.amount_lakhs, b.created_at
         FROM bids b
         JOIN players p ON p.id = b.player_id
         WHERE b.room_id = ?
         ORDER BY b.created_at DESC, b.amount_lakhs DESC
         LIMIT 30`
      )
      .all(room.id) as {
      id: string;
      lot_id: string;
      player_id: number;
      player_name: string;
      team_code: TeamCode;
      amount_lakhs: number;
      created_at: string;
    }[];

    const recentChatRows = db
      .prepare(
        `SELECT id, room_id, user_id, sender_name, team_code, message_type, content, created_at
         FROM chat_messages
         WHERE room_id = ? AND message_type IN ('USER', 'SYSTEM')
         ORDER BY created_at DESC
         LIMIT 60`
      )
      .all(room.id) as {
      id: string;
      room_id: string;
      user_id: string | null;
      sender_name: string;
      team_code: TeamCode | null;
      message_type: 'USER' | 'SYSTEM';
      content: string;
      created_at: string;
    }[];

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      hostUserId: room.host_user_id,
      status: room.status,
      visibility: room.visibility,
      initialPurseLakhs: room.initial_purse_lakhs,
      maxSquadSize: room.max_squad_size,
      minSquadSize: room.min_squad_size,
      maxOverseas: room.max_overseas,
      timerSeconds: room.timer_seconds,
      auctionRound: room.auction_round,
      acceleratedMode: Boolean(room.accelerated_mode),
      tradeWindowActive: Boolean(room.trade_window_active),
      tradeWindowEndsAt: room.trade_window_ends_at,
      serverNow: Date.now(),
      timerEndsAt: rt.timerEndsAt,
      pausedRemainingMs: rt.pausedRemainingMs,
      passedTeams: Array.from(rt.passedTeams),
      counts: {
        totalLots: countsRow.total || 0,
        upcoming: countsRow.upcoming || 0,
        sold: countsRow.sold || 0,
        unsold: countsRow.unsold || 0,
      },
      teams,
      currentLot,
      rtmPrompt: rt.rtmState,
      recentBids: recentBidRows.map((b) => ({
        id: b.id,
        lotId: b.lot_id,
        playerId: b.player_id,
        playerName: b.player_name,
        teamCode: b.team_code,
        amountLakhs: b.amount_lakhs,
        createdAt: b.created_at,
      })),
      recentChat: recentChatRows
        .reverse()
        .map((c) => ({
          id: c.id,
          roomId: c.room_id,
          userId: c.user_id,
          senderName: c.sender_name,
          teamCode: c.team_code,
          messageType: c.message_type,
          content: c.content,
          createdAt: c.created_at,
        })),
      activeTrades: this.getRoomTrades(room.code),
    };
  }

  broadcastRoomState(roomCode: string, snapshotOverride?: RoomSnapshot): void {
    if (!this.io) return;
    try {
      const snap = snapshotOverride || this.getRoomSnapshot(roomCode);
      this.io.to(this.socketRoomKey(roomCode)).emit('room:state', snap);
    } catch {
      // Ignore if room was deleted
    }
  }
}

export const auctionEngine = new AuctionEngineManager();

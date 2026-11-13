import { Router } from 'express';
import { AUCTION_SET_LABELS, AUCTION_SET_SEQUENCE } from '../data/iplPlayers.js';
import { getDb } from '../db/connection.js';
import { IPL_FRANCHISES, mapPlayerToDTO, PlayerRecord } from '../types/domain.js';

export const playerRouter = Router();

playerRouter.get('/meta', (_req, res) => {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_capped = 1 THEN 1 ELSE 0 END) as capped,
        SUM(CASE WHEN is_capped = 0 THEN 1 ELSE 0 END) as uncapped,
        SUM(CASE WHEN is_overseas = 1 THEN 1 ELSE 0 END) as overseas,
        SUM(CASE WHEN is_overseas = 0 THEN 1 ELSE 0 END) as indian,
        SUM(CASE WHEN role = 'WK' THEN 1 ELSE 0 END) as wk,
        SUM(CASE WHEN role = 'BAT' THEN 1 ELSE 0 END) as bat,
        SUM(CASE WHEN role = 'AR' THEN 1 ELSE 0 END) as ar,
        SUM(CASE WHEN role = 'BOWL' THEN 1 ELSE 0 END) as bowl
      FROM players`
    )
    .get();

  res.json({
    stats,
    sets: AUCTION_SET_SEQUENCE.map((code) => ({
      code,
      label: AUCTION_SET_LABELS[code] || code,
    })),
    franchises: IPL_FRANCHISES,
  });
});

playerRouter.get('/', (req, res) => {
  const db = getDb();
  const { role, capped, overseas, set, search } = req.query;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (role && ['WK', 'BAT', 'AR', 'BOWL'].includes(String(role))) {
    conditions.push('role = ?');
    params.push(String(role));
  }
  if (capped === 'true' || capped === '1') {
    conditions.push('is_capped = 1');
  } else if (capped === 'false' || capped === '0') {
    conditions.push('is_capped = 0');
  }

  if (overseas === 'true' || overseas === '1') {
    conditions.push('is_overseas = 1');
  } else if (overseas === 'false' || overseas === '0') {
    conditions.push('is_overseas = 0');
  }

  if (set && String(set).trim()) {
    conditions.push('auction_set = ?');
    params.push(String(set).trim());
  }

  if (search && String(search).trim()) {
    conditions.push('(LOWER(name) LIKE ? OR LOWER(country) LIKE ? OR LOWER(speciality) LIKE ?)');
    const q = `%${String(search).trim().toLowerCase()}%`;
    params.push(q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT * FROM players ${whereClause} ORDER BY set_order ASC, overall_rating DESC, id ASC`
    )
    .all(...params) as PlayerRecord[];

  res.json({
    total: rows.length,
    players: rows.map(mapPlayerToDTO),
  });
});

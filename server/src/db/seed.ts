import Database from 'better-sqlite3';
import { getFullPlayerCatalog } from '../data/iplPlayers.js';

export function seedPlayers(db: Database.Database): number {
  const catalog = getFullPlayerCatalog();

  const upsert = db.prepare(`
    INSERT INTO players (
      id, name, country, is_overseas, is_capped, role,
      batting_style, bowling_style, speciality, base_price_lakhs,
      auction_set, set_order, overall_rating, batting_rating,
      bowling_rating, fielding_rating, powerplay_rating, death_rating,
      ipl_matches, ipl_runs, ipl_strike_rate, ipl_wickets, ipl_economy,
      previous_team, marquee
    ) VALUES (
      @id, @name, @country, @is_overseas, @is_capped, @role,
      @batting_style, @bowling_style, @speciality, @base_price_lakhs,
      @auction_set, @set_order, @overall_rating, @batting_rating,
      @bowling_rating, @fielding_rating, @powerplay_rating, @death_rating,
      @ipl_matches, @ipl_runs, @ipl_strike_rate, @ipl_wickets, @ipl_economy,
      @previous_team, @marquee
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      is_overseas = excluded.is_overseas,
      is_capped = excluded.is_capped,
      role = excluded.role,
      batting_style = excluded.batting_style,
      bowling_style = excluded.bowling_style,
      speciality = excluded.speciality,
      base_price_lakhs = excluded.base_price_lakhs,
      auction_set = excluded.auction_set,
      set_order = excluded.set_order,
      overall_rating = excluded.overall_rating,
      batting_rating = excluded.batting_rating,
      bowling_rating = excluded.bowling_rating,
      fielding_rating = excluded.fielding_rating,
      powerplay_rating = excluded.powerplay_rating,
      death_rating = excluded.death_rating,
      ipl_matches = excluded.ipl_matches,
      ipl_runs = excluded.ipl_runs,
      ipl_strike_rate = excluded.ipl_strike_rate,
      ipl_wickets = excluded.ipl_wickets,
      ipl_economy = excluded.ipl_economy,
      previous_team = excluded.previous_team,
      marquee = excluded.marquee
  `);

  const runSeedTx = db.transaction(() => {
    for (const player of catalog) {
      upsert.run(player);
    }
  });

  runSeedTx();
  return catalog.length;
}

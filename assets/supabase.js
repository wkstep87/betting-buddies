// assets/supabase.js
// Uses the global UMD client loaded via <script src=".../supabase.js">
// Exposes helpers on the window so inline pages can call them.

window.sb = window.sb || supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
const sb = window.sb;
const SEASON = window.CONFIG.SEASON;
// In production, never fall back to 'Will'. Leave blank if not provided.
let USERNAME = (window.CONFIG.USERNAME && String(window.CONFIG.USERNAME).trim()) || '';

/* =========================
   Weeks / Games / Lock
   ========================= */

// Weeks list (week, locked)
async function sbLoadWeeks() {
  const { data, error } = await sb
    .from('weeks')
    .select('week, locked')
    .eq('season', SEASON)
    .order('week');
  if (error) throw error;
  return data || [];
}

// Games for a week
async function sbLoadGames(week) {
  const { data, error } = await sb
    .from('games')
    .select('id, season, week, away, home, spread, final, winner_ats, home_score, away_score, spread_frozen, spread_is_frozen, spread_frozen_at, commence_time')
    .eq('season', SEASON)
    .eq('week', week)
    .order('commence_time', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Lock state for a week
async function sbLoadWeekLock(week) {
  const { data, error } = await sb
    .from('weeks')
    .select('locked')
    .eq('season', SEASON)
    .eq('week', week)
    .single();
  if (error) throw error;
  return data?.locked ?? false;
}

/* =========================
   Picks API
   ========================= */

async function sbLoadMyPicks(week) {
  const { data, error } = await sb
    .from('picks')
    .select(`
      game_id,
      team,
      confidence,
      result,
      games!inner(id, home, away, final, winner_ats)
    `)
  .eq('season', SEASON)
  .eq('week', week)
  .eq('username', USERNAME);
  if (error) throw error;

  // Flatten joined game fields for UI
  const by = {};
  (data || []).forEach(r => {
    by[r.game_id] = {
      team: r.team,
      confidence: r.confidence,
      result: r.result,
      game_home: r.games.home,
      game_away: r.games.away,
      game_final: r.games.final,
      game_winner_ats: r.games.winner_ats
    };
  });
  return by;
}

// Save a single pick
async function sbSavePick(week, gameId, team, confidence) {
  const row = {
    username: USERNAME,
    season: SEASON,
    week,
    game_id: gameId,
    team,                 // nullable
    confidence            // nullable
  };
  const { error } = await sb
    .from('picks')
    .upsert(row, { onConflict: 'username,season,week,game_id' });
  if (error) throw error;
}

// Consensus (for Add Bet prefill, standings net, etc.)
async function sbLoadConsensus(week) {
  const { data: picks, error: e1 } = await sb
    .from('picks')
    .select('game_id, team, confidence')
    .eq('season', SEASON)
    .eq('week', week);
  if (e1) throw e1;

  const { data: games, error: e2 } = await sb
    .from('games')
    .select('id, away, home, spread, spread_frozen, home_score, away_score, final, winner_ats')
    .eq('season', SEASON)
    .eq('week', week)
    .order('id');
  if (e2) throw e2;

  const map = new Map(
    (games || []).map(g => [g.id, {
      id: g.id,
      away: g.away,
      home: g.home,
      spread: g.spread,
      spread_frozen: g.spread_frozen,
      home_score: g.home_score,
      away_score: g.away_score,
      final: g.final,
      winner_ats: g.winner_ats,
      awaySum: 0,
      homeSum: 0
    }])
  );

  (picks || []).forEach(p => {
    const bucket = map.get(p.game_id);
    if (!bucket) return;
    if (p.team === bucket.home) bucket.homeSum += (p.confidence ?? 0);
    else if (p.team === bucket.away) bucket.awaySum += (p.confidence ?? 0);
  });

  const rows = Array.from(map.values()).map(r => {
    const homeStr = r.homeSum || 0;
    const awayStr = r.awaySum || 0;

    let winner = '';
    let net = 0;
    if (homeStr > awayStr) { winner = r.home; net = homeStr - awayStr; }
    else if (awayStr > homeStr) { winner = r.away; net = awayStr - homeStr; }

    return {
      id: r.id,
      away: r.away,
      home: r.home,
      spread: r.spread,
      spread_frozen: r.spread_frozen,
      home_score: r.home_score,
      away_score: r.away_score,
      final: r.final,
      winner_ats: r.winner_ats,
      awaySum: awayStr,
      homeSum: homeStr,
      net,
      winner
    };
  });

  return rows;
}

// All picks for a single game (row expansion)
async function sbLoadGamePicks(week, gameId) {
  const { data, error } = await sb
    .from('picks')
    .select('username, team, confidence')
    .eq('season', SEASON)
    .eq('week', week)
    .eq('game_id', gameId)
    .order('confidence', { ascending: false });
  if (error) throw error;
  return data || [];
}

// All picks for a set of users (one week)
async function sbLoadUsersWeekPicks(week, users) {
  const { data, error } = await sb
    .from('picks')
    .select('username, game_id, team, confidence')
    .eq('season', SEASON)
    .eq('week', week)
    .in('username', users);
  if (error) throw error;
  return data || [];
}

/* =========================
   Standings / ATS helpers
   ========================= */

async function sbLoadCompletedGames(week = null) {
  let q = sb
    .from('games')
    .select('id, week, away, home, winner_ats, final')
    .eq('season', SEASON)
    .eq('final', true);
  if (week != null) q = q.eq('week', week);
  const { data, error } = await q.order('week').order('id');
  if (error) throw error;
  return data || [];
}

async function sbLoadAllPicks(week = null) {
  let q = sb
    .from('picks')
    .select('username, game_id, team, confidence, week')
    .eq('season', SEASON);
  if (week != null) q = q.eq('week', week);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function computeAts(games, picks, users) {
  const gameById = new Map(games.map(g => [g.id, g]));
  const finalizedWeeks = Array.from(new Set(games.map(g => g.week))).sort((a,b)=>a-b);

  const u = {};
  users.forEach(name => {
    u[name] = { points: 0, wins: 0, losses: 0, pushes: 0, weekly: new Map() };
  });

  picks.forEach(p => {
    const g = gameById.get(p.game_id);
    if (!g) return;

    const conf = Number(p.confidence) || 0;
    let pts = 0;

    if (g.winner_ats === 'PUSH') {
      pts = Math.round(conf / 2);
      u[p.username].pushes += 1;
    } else if (
      (g.winner_ats === 'HOME' && p.team === g.home) ||
      (g.winner_ats === 'AWAY' && p.team === g.away)
    ) {
      pts = conf;
      u[p.username].wins += 1;
    } else {
      u[p.username].losses += 1;
    }

    u[p.username].points += pts;
    const w = g.week;
    u[p.username].weekly.set(w, (u[p.username].weekly.get(w) || 0) + pts);
  });

  users.forEach(name => {
    const rec = u[name];
    const denom = rec.wins + rec.losses;
    rec.winPct = denom ? (rec.wins / denom) : 0;
    rec.weeksFinalized = finalizedWeeks.length;
    rec.weeklyAvg = rec.weeksFinalized ? (rec.points / rec.weeksFinalized) : 0;
  });

  return { perUser: u, finalizedWeeks };
}

/* =========================
   Bankroll
   ========================= */

// Settings
async function sbLoadBankrollSettings() {
  const { data, error } = await sb
    .from('bankroll_settings')
    .select('starting_bank, default_stake')
    .eq('season', SEASON)
    .maybeSingle();
  if (error) throw error;
  return data || { starting_bank: 0, default_stake: 0 };
}

async function sbSaveBankrollSettings({ starting_bank, default_stake }) {
  const payload = {
    season: SEASON,
    starting_bank: Number(String(starting_bank).replace(/,/g,'')) || 0,
    default_stake: Number(String(default_stake).replace(/,/g,'')) || 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb
    .from('bankroll_settings')
    .upsert(payload, { onConflict: 'season' });
  if (error) throw error;
}

// Wagers
async function sbLoadWagers(week) {
  let q = sb.from('wagers')
    .select('id, season, week, placed_at, description, type, side, odds, stake, result, status, payout_override')
    .eq('season', SEASON);

  // Only filter by week when it's an actual number (not null/undefined/"").
  if (typeof week === 'number' && Number.isFinite(week)) {
    q = q.eq('week', week);
  }

  q = q.order('id', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function sbInsertWager(w) {
  const row = {
    season: SEASON,
    week: w.week,
    description: w.description || '',
    type: w.type || 'ATS',
    side: w.side || null,
    odds: w.odds ?? null,
    stake: w.stake ?? null,
    result: w.result ?? null,
    status: w.status ?? null,
    payout_override: w.payout_override ?? null
  };
  const { error } = await sb.from('wagers').insert(row);
  if (error) throw error;
}

async function sbUpdateWagerField(id, field, value) {
  const patch = {};
  patch[field] = value;
  const { error } = await sb.from('wagers').update(patch).eq('id', id);
  if (error) throw error;
}

async function sbDeleteWager(id) {
  const { error } = await sb.from('wagers').delete().eq('id', id);
  if (error) throw error;
}

// Odds/P&L utils
function americanToDecimal(odds) {
  const o = Number(odds);
  if (!Number.isFinite(o)) return 1;
  return o > 0 ? 1 + (o / 100) : 1 + (100 / Math.abs(o));
}
function gradePayout(stake, odds, status, override) {
  if (override != null && override !== '' && !Number.isNaN(Number(override))) {
    return Number(override);
  }
  const s = Number(stake) || 0;
  const o = Number(odds) || 0;
  switch (status) {
    case 'WON':  return +(s * (americanToDecimal(o) - 1)).toFixed(2);
    case 'LOST': return -s;
    case 'PUSH': return 0;
    case 'VOID': return 0;
    default:     return 0;
  }
}

/* =========================
   Admin / Edge helpers
   ========================= */

// Lock/unlock week
async function adminLock(week, action) {
  const { error } = await sb.functions.invoke('admin-lock', {
    body: { season: SEASON, week, action, username: USERNAME }
  });
  if (error) throw error;
}

// Freeze spread (game or whole week)
async function sbFreezeGame(gameId) {
  const { data, error } = await sb.functions.invoke('freeze-spread', {
    body: { season: SEASON, week: null, game_id: gameId }
  });
  if (error) throw error;
  return data;
}
async function sbFreezeWeek(week) {
  const { data, error } = await sb.functions.invoke('freeze-spread', {
    body: { season: SEASON, week, game_id: null }
  });
  if (error) throw error;
  return data;
}

// On-demand scores/grades
async function sbPullScoresNow(week) {
  const payload = { season: SEASON, week: (Number.isFinite(Number(week)) ? Number(week) : null) };
  const { data, error } = await sb.functions.invoke('scores-cron', { body: payload });
  if (error) throw error;
  return data || { ok: true, message: 'Triggered.' };
}

/* =========================
   Season “Default Week”
   ========================= */

async function sbGetCurrentWeek() {
  const { data, error } = await sb
    .from('season_settings')
    .select('current_week')
    .eq('season', SEASON)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // ignore "no rows"
  return data?.current_week ?? null;
}

async function sbSetCurrentWeek(week) {
  const payload = { season: SEASON, current_week: Number(week), updated_at: new Date().toISOString() };
  const { error } = await sb
    .from('season_settings')
    .upsert(payload, { onConflict: 'season' });
  if (error) throw error;
  return true;
}

/* =========================
   Research (Edge: /research)
   ========================= */

// Normalizes flexible call shapes
function __bbNormalizeTeamArgs(a, b, c) {
  if (typeof a === 'object' && a && !Array.isArray(a)) {
    return {
      team: a.team,
      season: a.season ?? SEASON,
      week: a.week ?? null,
    };
  }
  if (typeof a === 'string') {
    return { team: a, season: b ?? SEASON, week: c ?? null };
  }
  return { team: null, season: SEASON, week: null };
}

// GET to Edge function via invoke body; edge converts body to fetch params
async function sbGetInjuries(a, b, c) {
  const { team, season, week } = __bbNormalizeTeamArgs(a, b, c);
  if (!team) throw new Error('sbGetInjuries: team is required');
  const { data, error } = await sb.functions.invoke('research', {
    body: { type: 'injuries', team, season, week }
  });
  if (error) throw error;
  return data;
}

async function sbGetTeamStats(a, b) {
  const { team, season } = __bbNormalizeTeamArgs(a, b, null);
  if (!team) throw new Error('sbGetTeamStats: team is required');
  const { data, error } = await sb.functions.invoke('research', {
    body: { type: 'team_stats', team, season }
  });
  if (error) throw error;
  return data;
}
/* =========================
   Invite-link resolver
   ========================= */
async function sbResolveLink(token) {
  if (!token) throw new Error('Token required');
  const { data, error } = await sb.functions.invoke('resolve-link', {
    body: { t: String(token) }   // POST body; function echoes username
  });
  if (error) throw error;
  return data; // { ok, username }
}

/* =========================
   Small utilities
   ========================= */

function __setUsername(newName) {
  USERNAME = (newName && String(newName).trim()) || '';
}
window.__setUsername = __setUsername;

// Expose functions globally (defensive if bundlers/minifiers are used)
Object.assign(window, {
  sbLoadWeeks,
  sbLoadGames,
  sbLoadWeekLock,
  sbLoadMyPicks,
  sbSavePick,
  sbLoadConsensus,
  sbLoadGamePicks,
  sbLoadUsersWeekPicks,
  sbLoadCompletedGames,
  sbLoadAllPicks,
  computeAts,
  sbResolveLink,
  sbLoadBankrollSettings,
  sbSaveBankrollSettings,
  sbLoadWagers,
  sbInsertWager,
  sbUpdateWagerField,
  sbDeleteWager,
  adminLock,
  sbFreezeGame,
  sbFreezeWeek,
  sbPullScoresNow,
  sbGetInjuries,
  sbGetTeamStats,
  sbGetCurrentWeek,
  sbSetCurrentWeek,
  gradePayout,            // optionally useful in UI
  americanToDecimal       // optionally useful in UI
});

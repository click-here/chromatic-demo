// Chromatic city: pure game logic. No DOM, no three.js, no network.
// Everything here is testable with node --test.
//
// v2 (designed growth, 2026-07-18): the player places nothing. One authored
// MASTER_PLAN grows stage by stage as real sessions work; materials are
// meters and unlock keys, never a wallet. Unlocks are VIEWS and they are a
// pure ratchet: nothing ever re-locks. Spec:
// docs/superpowers/specs/2026-07-18-city-designed-growth.md

export const CONSTANTS = {
  BRICK_BASE: 3,
  BRICK_PER_UNIT: 1,
  BRICK_UNIT_CAP: 10,
  GLASS_PER_EXTRA: 1,
  GLASS_EXTRA_CAP: 3,
  PASSIVE_BRICK_PER_MIN: 0.1,
  PASSIVE_DAILY_CAP: 100,
  RIPE_IDLE_S: 300,
  RESCUE_GOLD_MAX: 3,
  HISTORY_DAYS: 14,
  MIGRATION_BRICK_CAP: 5000,
  RECORD_GOLD: 2,
  // v1 saves banked brick as a wallet; on migration it converts to labor
  // credit against the plan at the old cost-to-labor ratio (~8 brick/point)
  MIGRATION_BRICK_PER_LABOR: 8,
};

// building type registry: model + labor only. Costs are gone; nothing is
// bought. grove keeps its entry (the asset exists) but the plan never
// places it: no trees in the city (the art director, 2026-07-18).
export const CATALOG = [
  { id: 'house',    name: 'House',        tier: 'Small',    model: 'synthwave/synthwave-house',    labor: 30 },
  { id: 'shop',     name: 'Shop',         tier: 'Small',    model: 'synthwave/synthwave-shop',     labor: 40 },
  { id: 'grove',    name: 'Grove',        tier: 'Small',    model: 'synthwave/synthwave-grove',    labor: 25 },
  { id: 'fountain', name: 'Fountain',     tier: 'Small',    model: 'synthwave/synthwave-fountain', labor: 40 },
  { id: 'workshop', name: 'Workshop',     tier: 'Medium',   model: 'synthwave/synthwave-workshop', labor: 120 },
  { id: 'hall',     name: 'Hall',         tier: 'Medium',   model: 'synthwave/synthwave-tower',    labor: 160 },
  { id: 'tower',    name: 'Aurora Tower', tier: 'Landmark', model: 'synthwave/synthwave-faceted',  labor: 400 },
];

export const LOTS = [
  [1, -1], [2, -1], [3, -1], [1, -2], [3, -2], [1, -3], [3, -3],
  [-1, -1], [-2, -1], [-1, -2], [-2, -3],
  [1, 1], [2, 1], [1, 2], [-1, 1], [-2, 1], [-1, 2], [2, 2],
];

// one human name per LOTS entry, same order; coordinates never reach the UI
export const PLOT_NAMES = [
  'old quarry', 'dock row', 'north stand', 'market row', 'hillside',
  'low meadow', 'east bank', 'mill yard', 'stone court', 'birch hollow',
  'lantern walk', 'south gate', 'orchard end', 'ferry landing',
  "king's corner", "tanner's green", 'chapel rise', 'windrow',
];

export function plotName(tile) {
  const i = LOTS.findIndex(l => l[0] === tile[0] && l[1] === tile[1]);
  return i === -1 ? null : PLOT_NAMES[i];
}

// The master plan: the whole city, authored, in the order it rises. Houses
// cluster at the crossroads first so the young town reads intentional; the
// plazas land mid-arc; the halls anchor the south and east late; the Aurora
// Tower crowns the marquee plot as the finale. Every LOTS tile appears
// exactly once. Labor per stage comes from the type's CATALOG entry.
export const MASTER_PLAN = [
  { id: 'plan-01', type: 'house',    tile: [-1, -1] },  // mill yard
  { id: 'plan-02', type: 'house',    tile: [2, -1] },   // dock row
  { id: 'plan-03', type: 'shop',     tile: [1, -2] },   // market row
  { id: 'plan-04', type: 'house',    tile: [1, 1] },    // south gate
  { id: 'plan-05', type: 'fountain', tile: [-1, 1] },   // king's corner
  { id: 'plan-06', type: 'shop',     tile: [3, -1] },   // north stand
  { id: 'plan-07', type: 'house',    tile: [2, 1] },    // orchard end
  { id: 'plan-08', type: 'workshop', tile: [3, -2] },   // hillside
  { id: 'plan-09', type: 'house',    tile: [-1, -2] },  // birch hollow
  { id: 'plan-10', type: 'shop',     tile: [1, 2] },    // ferry landing
  { id: 'plan-11', type: 'house',    tile: [-2, 1] },   // tanner's green
  { id: 'plan-12', type: 'hall',     tile: [1, -3] },   // low meadow
  { id: 'plan-13', type: 'house',    tile: [-1, 2] },   // chapel rise
  { id: 'plan-14', type: 'fountain', tile: [2, 2] },    // windrow (demo cycle plot)
  { id: 'plan-15', type: 'shop',     tile: [-2, -3] },  // lantern walk
  { id: 'plan-16', type: 'workshop', tile: [-2, -1] },  // stone court
  { id: 'plan-17', type: 'hall',     tile: [3, -3] },   // east bank
  { id: 'plan-18', type: 'tower',    tile: [1, -1] },   // old quarry, the marquee
];

// Views: what progression unlocks. Street orbit is always free. Glass
// (parallel sessions) opens elevated vantages; gold leaf (rescues and
// record days) opens the special experiences. PURE RATCHET: once unlocked,
// unlocked forever. Thresholds are first-pass numbers; tune against real
// earn-rate history, not in the abstract.
export const VIEWS = [
  { id: 'overlook', name: 'the overlook', key: '2', gate: { glass: 20 },
    line: 'the overlook is open · see the city from the hillside · press 2' },
  { id: 'rooftop',  name: 'the rooftop',  key: '3', gate: { glass: 60 },
    line: 'the rooftop is open · the skyline from above · press 3' },
  { id: 'ride',     name: 'the train line', key: '4', gate: { gold: 4 },
    line: 'the train line is now running · press 4 to ride' },
  { id: 'tour',     name: 'the cinematic tour', key: '5', gate: { gold: 12 },
    line: 'the cinematic tour is unlocked · press 5 for the full reel' },
];

export function dayKeyOf(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

export function haulOf(today) {
  return (today.brick || 0) + (today.glass || 0) + (today.gold || 0);
}

export function newState(nowMs) {
  return {
    version: 2,
    savedAt: 0,
    createdMs: nowMs,
    materials: { brick: 0, glass: 0, gold: 0 },
    todayKey: dayKeyOf(nowMs),
    today: { brick: 0, glass: 0, gold: 0, passive: 0 },
    history: [],
    records: { bestHaul: null },
    buildings: [],
    queue: null,
    plan: { built: {} },
    views: { unlocked: {} },
    sessionMarks: {},
    ripeMarks: {},
    lastTickMs: nowMs,
    passiveRemainderMin: 0,
    migratedLight: null,
    layers: { fired: {}, enabled: {}, invited: {}, lastInviteMs: 0 },
  };
}

const clone = (s) => JSON.parse(JSON.stringify(s));

const catalogById = (id) => CATALOG.find(c => c.id === id);
const stageById = (id) => MASTER_PLAN.find(p => p.id === id);
const sameTile = (a, b) => a[0] === b[0] && a[1] === b[1];

export function nextStage(state) {
  return MASTER_PLAN.find(p => !state.plan.built[p.id]
    && (!state.queue || state.queue.stageId !== p.id)) || null;
}

// begin raising the plan's next stage; mutates state, returns the queue or
// null when the plan is complete
function startNextStage(state) {
  if (state.queue) return state.queue;
  const stage = nextStage(state);
  if (!stage) return null;
  state.queue = {
    id: stage.id + '-' + state.todayKey,
    stageId: stage.id, type: stage.type, tile: stage.tile,
    laborNeeded: catalogById(stage.type).labor, laborDone: 0,
    startedDayKey: state.todayKey, contributions: {},
  };
  return state.queue;
}

// finish the rising stage; mutates state, returns the new building
function completeStage(state) {
  const q = state.queue;
  const building = {
    id: q.id, stageId: q.stageId, type: q.type, tile: q.tile,
    builtDayKey: state.todayKey,
    plaque: {
      contributions: q.contributions,
      startedDayKey: q.startedDayKey,
      completedDayKey: state.todayKey,
    },
  };
  state.buildings.push(building);
  state.plan.built[q.stageId] = true;
  state.queue = null;
  return building;
}

function viewGateMet(state, view) {
  const m = state.materials;
  return Object.entries(view.gate).every(([mat, n]) => (m[mat] || 0) >= n);
}

// how much of the gate material is still missing (for the next line)
export function viewShortfall(state, view) {
  const m = state.materials;
  const [mat, n] = Object.entries(view.gate)[0];
  return { material: mat, amount: Math.max(0, Math.ceil(n - (m[mat] || 0))) };
}

export function nextLockedView(state) {
  return VIEWS.find(v => !state.views.unlocked[v.id]) || null;
}

// latch any views whose gates are now met; mutates state, returns events.
// The ratchet lives here: this only ever ADDS to unlocked.
function checkViews(state, events) {
  for (const v of VIEWS) {
    if (!state.views.unlocked[v.id] && viewGateMet(state, v)) {
      state.views.unlocked[v.id] = state.todayKey;
      events.push({ type: 'view', id: v.id });
    }
  }
}

export function nextAction(state, snap) {
  const sessions = (snap && snap.sessions) || [];
  const ripe = sessions
    .filter(s => s.status !== 'working' && s.idle_seconds >= CONSTANTS.RIPE_IDLE_S)
    .sort((a, b) => b.idle_seconds - a.idle_seconds)[0];
  if (ripe) {
    const worth = Math.max(1, Math.min(1 + Math.floor(ripe.idle_seconds / 1800),
      CONSTANTS.RESCUE_GOLD_MAX));
    return 'next · ' + (ripe.project || '?') + ' sat idle ' +
      Math.floor(ripe.idle_seconds / 60) + 'm · rescue it for +' + worth + ' gold leaf';
  }
  if (state.queue) {
    const item = catalogById(state.queue.type);
    const left = Math.max(0, state.queue.laborNeeded - state.queue.laborDone);
    return 'next · the ' + item.name + ' is rising on the ' +
      plotName(state.queue.tile) + ' plot · ' + left + ' point' +
      (left === 1 ? '' : 's') + ' to go';
  }
  const locked = nextLockedView(state);
  if (locked) {
    const s = viewShortfall(state, locked);
    const mat = s.material === 'gold' ? 'gold leaf' : s.material;
    return 'next · ' + s.amount + ' more ' + mat + ' opens ' + locked.name;
  }
  return null; // the plan stands complete and every view is open
}

function burstUnits(sess) {
  const raw = (sess.recent_tool_calls || 0) + (sess.recent_turns || 0);
  return Math.min(Math.max(raw, 1), CONSTANTS.BRICK_UNIT_CAP);
}

export function applyTick(prev, snap, nowMs) {
  const state = clone(prev);
  const events = [];
  const sessions = (snap && snap.sessions) || [];
  const workingCount = sessions.filter(s => s.status === 'working').length;

  // the plan raises itself: something is always rising until the city is done
  startNextStage(state);

  // dawn rollover: finalize yesterday when the local day key changes
  const nowKey = dayKeyOf(nowMs);
  if (nowKey !== state.todayKey) {
    const yesterday = { dayKey: state.todayKey, haul: haulOf(state.today) };
    state.history.push(yesterday);
    while (state.history.length > CONSTANTS.HISTORY_DAYS) state.history.shift();
    let record = null;
    const best = state.records.bestHaul;
    if (yesterday.haul > 0 && (!best || yesterday.haul > best.value)) {
      record = { value: yesterday.haul, dayKey: yesterday.dayKey };
      state.records.bestHaul = record;
      state.materials.gold += CONSTANTS.RECORD_GOLD;
    }
    state.todayKey = nowKey;
    state.today = { brick: 0, glass: 0, gold: 0, passive: 0 };
    events.push({ type: 'dawn', yesterday, passiveGift: 0, record });
    // presentation-only: the ticker line for records; gold was minted above
    if (record) events.push({ type: 'record', gold: CONSTANTS.RECORD_GOLD, value: record.value });
  }

  // passive income: bounded gift for time passing, working or not
  const elapsedMin = Math.max(0, (nowMs - state.lastTickMs) / 60000)
    + (state.passiveRemainderMin || 0);
  const allowance = CONSTANTS.PASSIVE_DAILY_CAP - state.today.passive;
  const earnable = Math.min(elapsedMin * CONSTANTS.PASSIVE_BRICK_PER_MIN, allowance);
  const whole = Math.floor(earnable);
  if (whole >= 1) {
    state.materials.brick += whole;
    state.today.passive += whole;
    state.passiveRemainderMin = (earnable - whole) / CONSTANTS.PASSIVE_BRICK_PER_MIN;
    events.push({ type: 'passive', brick: whole });
    const dawn = events.find(e => e.type === 'dawn');
    if (dawn) dawn.passiveGift = whole;
  } else {
    state.passiveRemainderMin = elapsedMin;
  }

  for (const sess of sessions) {
    const sid = sess.session_id;
    const mark = state.sessionMarks[sid] || 0;

    // rescue: was ripe last time we looked, is active now
    const ripeIdle = state.ripeMarks[sid];
    if (ripeIdle !== undefined && sess.last_activity_ms > mark && mark > 0) {
      const gold = Math.max(1, Math.min(
        1 + Math.floor(ripeIdle / 1800), CONSTANTS.RESCUE_GOLD_MAX));
      state.materials.gold += gold;
      state.today.gold += gold;
      events.push({ type: 'rescue', sessionId: sid, gold, project: sess.project,
        idleS: ripeIdle });
      delete state.ripeMarks[sid];
    }

    if (sess.status !== 'working' && sess.idle_seconds >= CONSTANTS.RIPE_IDLE_S) {
      state.ripeMarks[sid] = sess.idle_seconds;
    } else if (sess.status === 'working') {
      delete state.ripeMarks[sid];
    }

    if (sess.last_activity_ms > mark) {
      state.sessionMarks[sid] = sess.last_activity_ms;
      const raw = (sess.recent_tool_calls || 0) + (sess.recent_turns || 0);
      if (raw < 1) continue; // stale idle sessions never mint on sighting
      const units = burstUnits(sess);
      const brick = CONSTANTS.BRICK_BASE + CONSTANTS.BRICK_PER_UNIT * units;
      const others = workingCount - (sess.status === 'working' ? 1 : 0);
      const glass = others >= 1
        ? Math.min(others, CONSTANTS.GLASS_EXTRA_CAP) * CONSTANTS.GLASS_PER_EXTRA
        : 0;
      state.materials.brick += brick;
      state.materials.glass += glass;
      state.today.brick += brick;
      state.today.glass += glass;
      const participants = workingCount + (sess.status === 'working' ? 0 : 1);
      const earnEv = { type: 'earn', sessionId: sid, project: sess.project,
        brick, glass, units, workingCount, participants };

      // labor flows into the rising stage; overflow carries into the next
      // one so no point of work is ever lost between stages
      const completes = [];
      if (state.queue) {
        const item = catalogById(state.queue.type);
        earnEv.raised = { name: item.name,
          points: Math.min(units, Math.max(0, state.queue.laborNeeded - state.queue.laborDone)) };
        let left = units;
        while (left > 0 && state.queue) {
          const put = Math.min(left, state.queue.laborNeeded - state.queue.laborDone);
          state.queue.laborDone += put;
          state.queue.contributions[sess.project] =
            (state.queue.contributions[sess.project] || 0) + put;
          left -= put;
          if (state.queue.laborDone >= state.queue.laborNeeded) {
            completes.push({ type: 'complete', building: completeStage(state) });
            startNextStage(state);
          }
        }
      }
      events.push(earnEv, ...completes);
    }
  }

  // prune bookkeeping for sessions gone from the snapshot so state stays small;
  // a returning session re-baselines and at worst re-mints one recent burst
  const liveIds = new Set(sessions.map(s => s.session_id));
  for (const sid of Object.keys(state.sessionMarks)) {
    if (!liveIds.has(sid)) delete state.sessionMarks[sid];
  }
  for (const sid of Object.keys(state.ripeMarks)) {
    if (!liveIds.has(sid)) delete state.ripeMarks[sid];
  }

  checkViews(state, events);

  state.lastTickMs = nowMs;
  return { state, events };
}

export function convertLight(light) {
  const n = Math.floor(Math.max(0, Number(light) || 0));
  return Math.min(n, CONSTANTS.MIGRATION_BRICK_CAP);
}

export function migrate(prev, lightValue) {
  if (prev.migratedLight !== null) return { state: prev };
  const state = JSON.parse(JSON.stringify(prev));
  const brick = convertLight(lightValue);
  state.materials.brick += brick;
  state.migratedLight = brick;
  return { state };
}

// ---- v1 (blueprint shop) to v2 (designed growth) migration -------------
// One-way and soft: placed buildings grandfather into the nearest matching
// plan slots with plaques intact; the half-risen v1 queue carries its labor;
// banked brick becomes labor credit against the next stages; views seed
// from materials already on hand (checkViews at the end).

function claimStage(taken, type) {
  return MASTER_PLAN.find(p => !taken[p.id] && p.type === type)
    || MASTER_PLAN.find(p => !taken[p.id]) || null;
}

function migrateV1(raw, nowMs) {
  const s = newState(nowMs);
  s.createdMs = raw.createdMs || nowMs;
  s.materials = { ...s.materials, ...(raw.materials || {}) };
  s.todayKey = raw.todayKey || s.todayKey;
  s.today = { ...s.today, ...(raw.today || {}) };
  s.history = Array.isArray(raw.history) ? raw.history : [];
  s.records = { ...s.records, ...(raw.records || {}) };
  s.sessionMarks = raw.sessionMarks || {};
  s.ripeMarks = raw.ripeMarks || {};
  s.lastTickMs = raw.lastTickMs || nowMs;
  s.passiveRemainderMin = raw.passiveRemainderMin || 0;
  s.migratedLight = raw.migratedLight !== undefined ? raw.migratedLight : null;
  const rl = (raw.layers && typeof raw.layers === 'object') ? raw.layers : {};
  s.layers = {
    fired: { ...(rl.fired || {}) },
    enabled: { ...(rl.enabled || {}) },
    invited: { ...(rl.invited || {}) },
    lastInviteMs: rl.lastInviteMs || 0,
  };
  for (const map of [s.layers.fired, s.layers.enabled, s.layers.invited]) {
    delete map.blueprints; // the shop layer is gone
  }

  // grandfather placed buildings into plan slots (same type first)
  const taken = {};
  for (const b of raw.buildings || []) {
    const stage = claimStage(taken, b.type);
    if (!stage) break;
    taken[stage.id] = true;
    s.plan.built[stage.id] = true;
    s.buildings.push({
      id: b.id || stage.id, stageId: stage.id,
      type: stage.type, tile: stage.tile,
      builtDayKey: b.builtDayKey || s.todayKey,
      plaque: b.plaque || { contributions: {}, startedDayKey: s.todayKey,
        completedDayKey: s.todayKey },
    });
  }

  // the half-risen v1 build carries its labor into a matching stage
  if (raw.queue) {
    const stage = claimStage(taken, raw.queue.type);
    if (stage) {
      taken[stage.id] = true;
      const need = catalogById(stage.type).labor;
      const done = Math.min(raw.queue.laborDone || 0, need);
      s.queue = {
        id: stage.id + '-' + s.todayKey,
        stageId: stage.id, type: stage.type, tile: stage.tile,
        laborNeeded: need, laborDone: done,
        startedDayKey: raw.queue.startedDayKey || s.todayKey,
        contributions: raw.queue.contributions || {},
      };
      if (done >= need) completeStage(s);
    }
  }

  // banked brick becomes labor credit against the next stages; stages the
  // credit finishes outright are signed by the old city itself
  let credit = Math.floor((s.materials.brick || 0) / CONSTANTS.MIGRATION_BRICK_PER_LABOR);
  while (credit > 0) {
    if (!startNextStage(s)) break;
    const put = Math.min(credit, s.queue.laborNeeded - s.queue.laborDone);
    s.queue.laborDone += put;
    s.queue.contributions['the old city'] =
      (s.queue.contributions['the old city'] || 0) + put;
    credit -= put;
    if (s.queue.laborDone >= s.queue.laborNeeded) completeStage(s);
  }

  checkViews(s, []); // history seeds unlocks; the events are not replayed
  return s;
}

export function reviveState(raw, nowMs) {
  const fresh = newState(nowMs);
  if (!raw || typeof raw !== 'object' || !raw.materials) return fresh;
  if (raw.version === 1) return migrateV1(raw, nowMs);
  if (raw.version !== 2) return fresh;
  const state = { ...fresh, ...raw };
  state.materials = { ...fresh.materials, ...raw.materials };
  state.today = { ...fresh.today, ...(raw.today || {}) };
  state.records = { ...fresh.records, ...(raw.records || {}) };
  state.plan = { built: { ...((raw.plan && raw.plan.built) || {}) } };
  state.views = { unlocked: { ...((raw.views && raw.views.unlocked) || {}) } };
  const rl = (raw.layers && typeof raw.layers === 'object') ? raw.layers : {};
  state.layers = {
    fired: { ...(rl.fired || {}) },
    enabled: { ...(rl.enabled || {}) },
    invited: { ...(rl.invited || {}) },
    lastInviteMs: rl.lastInviteMs || 0,
  };
  return state;
}

export function formatTickerLine(ev) {
  if (ev.type === 'earn') {
    let s = '+' + ev.brick + ' brick';
    if (ev.glass) s += ', +' + ev.glass + ' glass';
    s += ' · burst in ' + (ev.project || '?');
    if (ev.glass) s += ' while ' + ev.participants + ' sessions worked at once';
    if (ev.raised && ev.raised.points > 0) {
      s += ' · raised the ' + ev.raised.name + ' ' + ev.raised.points +
        ' point' + (ev.raised.points === 1 ? '' : 's');
    }
    return s;
  }
  if (ev.type === 'passive') {
    return '+' + ev.brick +
      ' brick · quiet trickle while you were away (outside the haul, capped each day)';
  }
  if (ev.type === 'rescue') {
    return '+' + ev.gold + ' gold leaf · rescued ' + (ev.project || '?') +
      ' after ' + Math.floor((ev.idleS || 0) / 60) + 'm idle';
  }
  if (ev.type === 'record') {
    return '+' + ev.gold + ' gold leaf · record day! biggest haul in your history';
  }
  if (ev.type === 'complete') {
    const item = catalogById(ev.building.type);
    return 'the ' + item.name + ' is finished on the ' + plotName(ev.building.tile) +
      ' plot · click it for its plaque';
  }
  if (ev.type === 'view') {
    const v = VIEWS.find(x => x.id === ev.id);
    return v ? v.line : null;
  }
  return null;
}

// --- opt-in layers -----------------------------------------------------
// Panels are layers the user enables. The game may only OFFER a layer once
// its subject exists; it never shows one unasked. See the 2026-07-06 spec.
// (v2: the blueprints layer died with the shop.)

export const LAYERS = [
  { id: 'sessions', name: 'sessions',
    desc: 'live sessions and rescue commands' },
  { id: 'yourcity', name: 'your city',
    desc: 'what has risen and what is rising' },
  { id: 'history', name: 'history',
    desc: 'daily haul, last 14 days' },
  { id: 'eventlog', name: 'event log',
    desc: 'the last few payouts instead of only the newest' },
];

export function layerAvailable(state, snap, id) {
  if (id === 'eventlog') return true;
  if (id === 'sessions') {
    return ((snap && snap.sessions) || []).some(s =>
      s.status !== 'working' && s.idle_seconds >= CONSTANTS.RIPE_IDLE_S);
  }
  if (id === 'yourcity') return state.buildings.length >= 1;
  if (id === 'history') return state.history.length >= 3;
  return false;
}

export function fireMoments(prev, snap) {
  const newly = LAYERS.map(l => l.id).filter(id =>
    !prev.layers.fired[id] && layerAvailable(prev, snap, id));
  if (!newly.length) return { state: prev, fired: [] };
  const state = clone(prev);
  for (const id of newly) state.layers.fired[id] = true;
  return { state, fired: newly };
}

export const INVITE_INTERVAL_MS = 300000; // at most one invitation per 5 minutes

export function pickInvitation(state, nowMs) {
  if (nowMs - (state.layers.lastInviteMs || 0) < INVITE_INTERVAL_MS) return null;
  const next = LAYERS.find(l =>
    state.layers.fired[l.id] && !state.layers.invited[l.id]);
  return next ? next.id : null;
}

export function markInvited(prev, id, nowMs) {
  const state = clone(prev);
  state.layers.invited[id] = true;
  state.layers.lastInviteMs = nowMs;
  return state;
}

export function setLayerEnabled(prev, id, on) {
  const state = clone(prev);
  if (on) state.layers.enabled[id] = true;
  else delete state.layers.enabled[id];
  return state;
}

const INVITE_COPY = {
  sessions: 'the sessions panel is now available',
  yourcity: 'the your-city panel is now available',
  history: 'the history chart is now available',
  eventlog: 'the event log is now available',
};

export function invitationLine(id) {
  if (!INVITE_COPY[id]) return null;
  return INVITE_COPY[id] + ' · open the layers menu to enable it';
}

// --- demo: the destination ----------------------------------------------
// Fabricates the endgame for /city?demo: the whole master plan built except
// the cycle stage, every view unlocked, rich history, and a build FOREVER
// RISING on the cycle plot so scripted life always has labor to show. Pure
// and derived from MASTER_PLAN so it never drifts. Never saved; see
// city.html's DEMO guard.

const DEMO_PROJECTS = ['chromatic', 'lanternworks', 'moonpool',
  'teacup-atlas', 'perch', 'quiet-harbor', 'nightwave-fm'];
const DEMO_HAULS = [120, 340, 90, 560, 210, 40, 480, 300, 150, 620, 260, 80, 400, 190];

// the cycle plot: scripted life raises, completes, and resets a build here
export const DEMO_CYCLE_STAGE = 'plan-14';
export const DEMO_CYCLE_TILE = stageById(DEMO_CYCLE_STAGE).tile;

export function demoState(nowMs) {
  const s = newState(nowMs);
  const day = (back) => dayKeyOf(nowMs - back * 86400000);

  MASTER_PLAN.filter(p => p.id !== DEMO_CYCLE_STAGE).forEach((stage, i) => {
    const labor = catalogById(stage.type).labor;
    const a = DEMO_PROJECTS[i % DEMO_PROJECTS.length];
    const b = DEMO_PROJECTS[(i + 3) % DEMO_PROJECTS.length];
    const share = Math.max(1, Math.round(labor * 0.6));
    s.plan.built[stage.id] = true;
    s.buildings.push({
      id: 'demo-' + stage.id, stageId: stage.id,
      type: stage.type, tile: stage.tile, builtDayKey: day(i % 5),
      plaque: {
        contributions: { [a]: share, [b]: Math.max(1, labor - share) },
        startedDayKey: day((i % 5) + 1), completedDayKey: day(i % 5),
      },
    });
  });

  s.materials = { brick: 8200, glass: 940, gold: 42 };
  s.today = { brick: 240, glass: 60, gold: 6, passive: CONSTANTS.PASSIVE_DAILY_CAP };
  s.history = DEMO_HAULS.map((haul, i) =>
    ({ dayKey: day(CONSTANTS.HISTORY_DAYS - i), haul }));
  const best = s.history.reduce((m, h) => h.haul > m.haul ? h : m, s.history[0]);
  s.records = { bestHaul: { value: best.haul, dayKey: best.dayKey } };
  for (const v of VIEWS) s.views.unlocked[v.id] = s.todayKey;
  // a build already partway up on the cycle plot: visitors see scaffolding
  // and rising labor from the first glance
  const cyc = catalogById('workshop');
  s.queue = {
    id: 'demo-cycle-0', stageId: DEMO_CYCLE_STAGE, type: cyc.id,
    tile: DEMO_CYCLE_TILE,
    laborNeeded: cyc.labor, laborDone: Math.round(cyc.labor * 0.35),
    startedDayKey: s.todayKey,
    contributions: { chromatic: Math.round(cyc.labor * 0.35) },
  };
  for (const l of LAYERS) { s.layers.fired[l.id] = true; s.layers.enabled[l.id] = true; }
  return s;
}

// scripted life's reset step: clear the cycle plot and raise the next type
// on it. idSalt keeps queue ids unique across cycles so the renderer sees a
// fresh queue even when the same type comes around again.
export function demoAdvance(prev, type, idSalt) {
  const state = clone(prev);
  state.buildings = state.buildings.filter(b => !sameTile(b.tile, DEMO_CYCLE_TILE));
  delete state.plan.built[DEMO_CYCLE_STAGE];
  const item = catalogById(type);
  if (!item) return state;
  state.queue = {
    id: 'demo-cycle-' + idSalt, stageId: DEMO_CYCLE_STAGE, type: item.id,
    tile: DEMO_CYCLE_TILE, laborNeeded: item.labor, laborDone: 0,
    startedDayKey: state.todayKey, contributions: {},
  };
  return state;
}

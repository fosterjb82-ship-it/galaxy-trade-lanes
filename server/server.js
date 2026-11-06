#!/usr/bin/env node
/* Galaxy Trade Lanes: online game server.
   Runs the rules (../engine.js) for one table of 2-6 human captains and serves the online page.
   Browsers send moves with POST /api/act and wait for changes with GET /api/wait (long polling,
   which works through Cloudflare quick tunnels). Uses only Node.js built-ins.

   Start:  node server/server.js            (or double-click start-online.command / start-online.bat)
   Options: PORT=8787  NO_TUNNEL=1 (skip starting cloudflared) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const E = require('../engine.js');

const PORT = Number(process.env.PORT) || 8787;
const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'online', 'index.html');
const SAVE_FILE = path.join(__dirname, 'saved-game.json');
const MAX_PLAYERS = 6, WAIT_MS = 25000;

/* ---------------- table state ---------------- */
const id = n => crypto.randomBytes(n).toString('hex');
const defaults = () => ({ actionLimit: 2, winMode: 'rounds', rounds: 16, target: 80, boardSize: 4, threats: true });
let T = { server: id(4), hostKey: id(6), version: 1, players: [], hostToken: null, settings: defaults(), game: null, notice: '' };
try { const saved = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8')); if (saved && saved.server) { T = saved; T.version++; if (T.game) E.migrate(T.game); } } catch (e) { /* fresh table */ }
const seen = {};                       // token -> last time this browser was heard from
let saveTimer = null;
function changed(note) {
  T.version++; if (note !== undefined) T.notice = note;
  clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { fs.writeFileSync(SAVE_FILE, JSON.stringify(T)); } catch (e) { console.error('Could not save:', e.message); } }, 300);
  wake();
}
const player = tok => T.players.find(p => p.token === tok);
const online = p => Date.now() - (seen[p.token] || 0) < 40000;

/* What one browser is allowed to see: its own hand, everyone's public piles, nobody's draw order. */
function viewFor(seat) {
  const g = T.game; if (!g) return null;
  const v = JSON.parse(JSON.stringify(g));
  delete v.seed; delete v.bossOrder; v.cdeck = v.cdeck.map(() => 0);
  if (!v.over) v.players.forEach((p, i) => {
    if (i === seat) { p.deck.sort(); return; }
    p.hand = p.hand.map(() => '?'); p.deck = p.deck.map(() => '?');
  });
  return v;
}
function packet(tok) {
  const me = player(tok);
  return {
    version: T.version, server: T.server, notice: T.notice,
    you: me ? { name: me.name, seat: T.players.indexOf(me), host: T.hostToken === me.token } : null,
    players: T.players.map((p, i) => ({ name: p.name, seat: i, host: T.hostToken === p.token, online: online(p) })),
    settings: T.settings, started: !!T.game, game: me && T.game ? viewFor(T.players.indexOf(me)) : null
  };
}

/* ---------------- long polling ---------------- */
let waiters = [];
function wake() { const w = waiters; waiters = []; w.forEach(x => { clearTimeout(x.timer); send(x.res, 200, packet(x.tok)); }); }

/* ---------------- moves ---------------- */
const TURN_MOVES = {
  play: (g, a) => E.play(g, int(a[0]), a[1] === undefined || a[1] === null ? undefined : int(a[1])),
  playResources: g => E.playResources(g), buy: (g, a) => E.buy(g, String(a[0])), complete: (g, a) => E.complete(g, int(a[0])),
  patrol: g => E.patrol(g), cashIn: g => E.cashIn(g), scrap: (g, a) => E.scrap(g, int(a[0])),
  attack: g => E.attack(g), mercs: g => E.mercs(g), end: g => E.end(g)
};
const int = v => (Number.isInteger(Number(v)) ? Number(v) : NaN);
function startTurnIfNeeded() { const g = T.game; if (g && !g.over && g.phase === 'handoff') E.begin(g); }

function act(tok, fn, args) {
  const me = player(tok), g = T.game;
  if (!me || !g) return { ok: false, error: 'No game is running.' };
  const seat = T.players.indexOf(me);
  if (fn === 'confirmBoss') { const ok = E.confirmBoss(g, int(args[0]), seat); if (ok) changed(); return { ok }; }
  if (!TURN_MOVES[fn]) return { ok: false, error: 'Unknown move.' };
  if (g.over) return { ok: false, error: 'The run is over.' };
  if (g.current !== seat) return { ok: false, error: 'It is not your turn.' };
  const ok = TURN_MOVES[fn](g, Array.isArray(args) ? args : []) !== false;
  if (ok) { const name = g.players[seat].name; startTurnIfNeeded(); changed(fn === 'end' ? name + ' ended their turn.' : undefined); }
  return { ok };
}

function lobby(tok, op, body) {
  const me = player(tok); if (!me) return { ok: false, error: 'Join first.' };
  const host = T.hostToken === me.token;
  if (op === 'leave') {
    if (T.game) return { ok: false, error: 'You cannot leave a run in progress. The host can skip your turns.' };
    T.players = T.players.filter(p => p !== me); if (host) T.hostToken = T.players[0] ? T.players[0].token : null;
    changed(me.name + ' left the table.'); return { ok: true };
  }
  if (!host) return { ok: false, error: 'Only the host can do that.' };
  if (op === 'settings') {
    const s = body.settings || {}, S = T.settings;
    if ([0, 2].includes(s.actionLimit)) S.actionLimit = s.actionLimit;
    if (['rounds', 'profit'].includes(s.winMode)) S.winMode = s.winMode;
    if ([10, 12, 16, 20].includes(s.rounds)) S.rounds = s.rounds;
    if ([50, 80, 120].includes(s.target)) S.target = s.target;
    if ([3, 4, 5].includes(s.boardSize)) S.boardSize = s.boardSize;
    if (typeof s.threats === 'boolean') S.threats = s.threats;
    changed(); return { ok: true };
  }
  if (op === 'kick') {
    if (T.game) return { ok: false, error: 'You cannot remove a captain during a run.' };
    const p = T.players[int(body.seat)]; if (!p || p === me) return { ok: false, error: 'No such captain.' };
    T.players = T.players.filter(x => x !== p); changed(p.name + ' was removed from the table.'); return { ok: true };
  }
  if (op === 'start') {
    if (T.game && !T.game.over) return { ok: false, error: 'A run is already in progress.' };
    if (T.players.length < 2) return { ok: false, error: 'You need at least 2 captains.' };
    T.game = E.create({ ...T.settings, mode: 'online', players: T.players.map(p => ({ name: p.name })) });
    E.begin(T.game); changed('The run has started. ' + T.game.players[0].name + ' goes first.'); return { ok: true };
  }
  if (op === 'skip') {       // move a stuck or absent captain's turn along
    const g = T.game; if (!g || g.over) return { ok: false, error: 'No run in progress.' };
    const who = g.players[g.current].name; E.end(g); startTurnIfNeeded(); changed('The host skipped ' + who + "'s turn."); return { ok: true };
  }
  if (op === 'lobby') { T.game = null; changed('The host opened the lobby for a new run.'); return { ok: true }; }
  if (op === 'host') { const p = T.players[int(body.seat)]; if (!p) return { ok: false }; T.hostToken = p.token; changed(p.name + ' is now the host.'); return { ok: true }; }
  return { ok: false, error: 'Unknown request.' };
}

function join(body) {
  const name = String(body.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
  if (!name) return { ok: false, error: 'Enter a name.' };
  if (T.game) return { ok: false, error: 'A run is in progress. Ask the host to open the lobby, or rejoin from the browser you joined with.' };
  if (T.players.length >= MAX_PLAYERS) return { ok: false, error: 'The table is full (6 captains).' };
  if (T.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: 'That name is taken.' };
  const tok = id(16); T.players.push({ token: tok, name });
  if (!T.hostToken || body.hostKey === T.hostKey) T.hostToken = tok;
  seen[tok] = Date.now(); changed(name + ' joined the table.'); return { ok: true, token: tok, server: T.server };
}

/* ---------------- http ---------------- */
function send(res, code, obj) { if (res.writableEnded) return; res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise(resolve => { let d = ''; req.on('data', c => { d += c; if (d.length > 20000) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } }); });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), tok = url.searchParams.get('t') || '';
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      fs.readFile(PAGE, (err, buf) => {
        if (err) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('online/index.html is missing. Run: bash build-online.sh'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(buf);
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/wait') {
      if (player(tok)) { const was = online(player(tok)); seen[tok] = Date.now(); if (!was) changed(); }
      const v = Number(url.searchParams.get('v')) || 0;
      if (v !== T.version) return send(res, 200, packet(tok));
      const w = { res, tok, timer: setTimeout(() => { waiters = waiters.filter(x => x !== w); send(res, 200, packet(tok)); }, WAIT_MS) };
      waiters.push(w); req.on('close', () => { clearTimeout(w.timer); waiters = waiters.filter(x => x !== w); });
      return;
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (url.pathname === '/api/join') return send(res, 200, join(body));
      if (player(body.token)) seen[body.token] = Date.now();
      if (url.pathname === '/api/act') return send(res, 200, act(body.token, String(body.fn || ''), body.args));
      if (url.pathname === '/api/lobby') return send(res, 200, lobby(body.token, String(body.op || ''), body));
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  } catch (e) { console.error(e); send(res, 500, { ok: false, error: 'Server error.' }); }
});
// notice captains who closed their browser
let presence = '';
setInterval(() => { const key = T.players.map(online).join(); if (key !== presence) { presence = key; T.version++; wake(); } }, 10000);

server.listen(PORT, () => {
  const local = 'http://localhost:' + PORT;
  console.log('\n  GALAXY TRADE LANES · online table\n');
  console.log('  Your link (open this yourself, you become the host):\n    ' + local + '/?host=' + T.hostKey + '\n');
  if (process.env.NO_TUNNEL) { console.log('  Tunnel skipped (NO_TUNNEL is set).\n'); return; }
  let cf;
  try { cf = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', local], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { cf = null; }
  const noTunnel = () => console.log('  cloudflared was not found, so there is no public link yet.\n  Install it (see README, "Play online"), or run this in another window:\n    cloudflared tunnel --url ' + local + '\n');
  if (!cf) return noTunnel();
  cf.on('error', noTunnel);
  let shown = false;
  const scan = d => { const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/); if (m && !shown) { shown = true; console.log('  Link for your friends (send them this):\n    ' + m[0] + '\n\n  Keep this window open while you play. Press Ctrl+C to close the table.\n'); } };
  cf.stdout.on('data', scan); cf.stderr.on('data', scan);
  const stop = () => { try { cf.kill(); } catch (e) {} process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
});

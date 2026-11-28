// Factions: node tests/factions.test.cjs
const assert = require('assert');
const E = require('../engine.js');
const SIG = { covenant: 'broadside', lumen: 'datacore', gilded: 'ledger', union: 'orehauler', ember: 'tanker', ghost: 'contacts' };
const all = p => [...p.deck, ...p.hand, ...p.discard, ...p.played];

assert.strictEqual(E.FACTIONS.length, 6);
for (const f of E.FACTIONS) { assert.strictEqual(f.card, SIG[f.id]); assert.strictEqual(E.CARDS[f.card].fac, f.id); assert(!E.MARKET.includes(f.card), f.card + ' not in market'); }

// off (default): no factions, 10-card decks, no signature cards
{
  const s = E.create({ seed: 4, players: [{ name: 'Ann', faction: 'ghost' }, { name: 'Nova', bot: true }] });
  assert(!s.factions); s.players.forEach(p => { assert.strictEqual(p.faction, null); assert.strictEqual(E.deckSize(p), 10); assert(!all(p).some(k => E.CARDS[k].fac)); });
}
// on: picks kept, duplicates and missing picks filled at random, one faction each, signature card added
for (let seed = 1; seed <= 60; seed++) {
  const s = E.create({ seed, factions: true, players: [{ name: 'Ann', faction: 'lumen' }, { name: 'Ben', faction: 'lumen' }, { name: 'Cy', faction: 'bogus' }, { name: 'Nova', bot: true }, { name: 'Orion', bot: true }, { name: 'Vesta', bot: true }] });
  assert(s.factions);
  assert.strictEqual(s.players[0].faction, 'lumen', 'first pick kept');
  const fs = s.players.map(p => p.faction); assert.strictEqual(new Set(fs).size, 6, 'one faction each');
  s.players.forEach(p => {
    assert(E.FACTION_IDS.includes(p.faction));
    assert.strictEqual(E.deckSize(p), 11, p.name + ' has 11 cards');
    const sig = all(p).filter(k => E.CARDS[k].fac); assert.deepStrictEqual(sig, [SIG[p.faction]], p.name + ' has exactly its own signature card');
  });
}
// signature cards do what they say
{
  const want = { broadside: [{ combat: 3, fuel: 1 }, 'act'], datacore: [{ tech: 2 }, 'res'], ledger: [{ cr: 5 }, 'res'], orehauler: [{ ore: 1, cargo: 2, cr: 1 }, 'res'], tanker: [{ fuel: 3, cargo: 2, cr: 2 }, 'res'], contacts: [{ cargo: 1 }, 'res'] };
  for (const [k, [g, cat]] of Object.entries(want)) {
    const s = E.create({ seed: 9, factions: true, threats: false, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
    E.begin(s); const p = E.me(s); p.hand = [k]; p.deck = ['scrip', 'drum', 'sample']; const before = { ...p.pool }, buys = p.buys, orders = p.actions;
    assert(E.play(s, 0), k); assert.strictEqual(E.CARDS[k].cat, cat, k);
    for (const [r, n] of Object.entries(g)) assert.strictEqual(p.pool[r], before[r] + n, k + ' ' + r);
    if (k === 'ledger') assert.strictEqual(p.buys, buys + 1, 'extra deal');
    if (k === 'contacts') assert.strictEqual(p.hand.length, 2, 'drew 2');
    assert.strictEqual(p.actions, cat === 'act' ? orders - 1 : orders);
  }
}
// a full game with factions runs to the end for every table size
for (let n = 2; n <= 6; n++) {
  const s = E.create({ seed: 30 + n, factions: true, players: Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })) });
  let g = 0; while (!s.over && g++ < 3000) { E.botTurn(s); (s.bossDone || []).forEach((r, k) => s.players.forEach((t, i) => E.confirmBoss(s, k, i))); }
  assert(s.over, n + ' captains finish');
}
// leaders: same effect for every faction, join the discard pile at the start of round 4, cannot be scrapped
const LEAD = { covenant: 'kessa', lumen: 'oren', gilded: 'mirabel', union: 'dax', ember: 'sola', ghost: 'nyx' };
for (const f of E.FACTIONS) { const c = E.CARDS[f.leader]; assert.strictEqual(f.leader, LEAD[f.id]); assert(c.leader && c.cat === 'act' && c.draw === 2 && c.refund === 2 && c.fac === f.id, f.leader); assert(!E.MARKET.includes(f.leader)); }
{
  const s = E.create({ seed: 21, factions: true, threats: false, players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Nova', bot: true }] });
  const has = (p, k) => all(p).includes(k);
  while (s.round < E.LEADER_ROUND) { assert(!s.players.some(p => has(p, LEAD[p.faction])), 'no leader before round ' + E.LEADER_ROUND); E.begin(s); E.end(s); }
  s.players.forEach(p => { assert.strictEqual(all(p).filter(k => E.CARDS[k].leader).length, 1, p.name + ' has one leader'); assert(p.discard.includes(LEAD[p.faction]), 'in the discard pile'); assert.strictEqual(E.deckSize(p), 12); });
  assert(s.events.some(e => e.t === 'leaders'));
  // playing a leader: draw 2, uses 1 order and gives 2 back
  E.begin(s); const p = E.me(s); const L = LEAD[p.faction];
  p.hand = [L, 'scrip']; p.deck = ['drum', 'sample', 'rig']; const orders = p.actions;
  assert(E.play(s, 0)); assert.strictEqual(p.actions, orders + 1, '+1 order overall'); assert.strictEqual(p.hand.length, 3, 'drew 2');
  // cannot be scrapped from hand, nor by Salvage Crew
  p.hand = [L, 'salvage', 'scrip']; p.pool.cr = 5; p.scrapped = false;
  assert(!E.scrap(s, 0), 'leader cannot be scrapped'); assert(E.scrap(s, 2), 'ordinary cards still can');
  p.hand = ['salvage', L]; p.deck = ['drum', 'sample']; const trash = s.trash.length; p.actions = 2;
  assert(E.play(s, 0, 1)); assert.strictEqual(s.trash.length, trash, 'Salvage Crew did not scrap the leader'); assert(p.hand.includes(L));
}
// no leaders without factions; unlimited orders: the refund changes nothing
{
  const s = E.create({ seed: 22, threats: false, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
  while (s.round <= E.LEADER_ROUND) { E.begin(s); E.end(s); }
  assert(!s.players.some(p => all(p).some(k => E.CARDS[k].leader)));
  const u = E.create({ seed: 23, factions: true, actionLimit: 0, threats: false, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
  E.begin(u); const q = E.me(u); q.hand = [LEAD[q.faction]]; q.deck = ['drum', 'scrip']; assert(E.play(u, 0)); assert.strictEqual(q.actions, 0);
}
console.log('factions ok');

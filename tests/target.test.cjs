// Race to a favor target, checked at the end of the round: node tests/target.test.cjs
const assert = require('assert');
const E = require('../engine.js');

const race = (o = {}) => E.create({ seed: 12, threats: false, winMode: 'profit', target: 50, players: [{ name: 'Ann' }, { name: 'Ben' }], ...o });
const turn = (s, fn) => { E.begin(s); if (fn) fn(s, E.me(s)); return E.end(s); };
// Ann delivers a contract worth enough to pass the target
function annReaches(s) {
  E.begin(s); const ann = E.me(s); ann.profit = 45; ann.score = { contracts: 45 };
  Object.assign(ann.pool, { fuel: 9, ore: 9, tech: 9, cr: 9, combat: 9, cargo: 9 });
  const c = s.board.slice().sort((a, b) => a.profit - b.profit)[0];
  assert(E.complete(s, c.id)); assert(ann.profit >= 50);
  return c;
}

// reaching the target mid-round no longer locks in the end: the round finishes and the check happens then
{
  const s = race(); annReaches(s);
  assert.strictEqual(s.finalRound, 1, 'flagged as possibly the last round');
  assert(/ends after this round if anyone still holds it/.test(s.log[0]));
  E.end(s); assert(!s.over, 'Ben still gets his turn');
  turn(s); assert(s.over, 'Ann still holds it at the end of the round');
  assert(/End of round 1: Ann holds the favor target/.test(s.log[0]));
}

// a Buyout Contract later in the same round takes Ann below the target: the race goes on
{
  const s = race(); const c = annReaches(s); E.end(s);
  E.begin(s); const ben = E.me(s);
  ben.hand = ['buyout']; Object.assign(ben.pool, { fuel: 9, ore: 9, tech: 9, cr: 9, combat: 9, cargo: 9 });
  assert(E.play(s, 0, c.id));
  assert(s.players[0].profit < 50, 'Ann lost the contract and dropped below 50');
  assert.strictEqual(s.finalRound, null, 'flag cleared at once');
  assert(/Nobody holds the favor target any more/.test(s.log[0]));
  E.end(s);
  assert(!s.over, 'the run continues'); assert.strictEqual(s.round, 2);
}

// the buyer can take the lead instead: Ben passes the target with the bought contract and the run ends
{
  const s = race(); const c = annReaches(s); E.end(s);
  E.begin(s); const ben = E.me(s); ben.profit = 48; ben.score = { contracts: 48 };
  ben.hand = ['buyout']; Object.assign(ben.pool, { fuel: 9, ore: 9, tech: 9, cr: 9, combat: 9, cargo: 9 });
  E.play(s, 0, c.id); E.end(s);
  assert(s.over); assert(ben.profit >= 50 && ben.profit > s.players[0].profit);
}

// a pirate raid at the end of the round counts before the check
{
  const s = race({ threats: true });
  annReaches(s); E.end(s);
  s.boss = { name: 'Test raider', key: 'dread', no: 1, hp: 10, max: 10, until: 1, arrived: 1, dmg: [0, 0], merc: 2, raid: 3, bounty: 1, regen: 0 };
  const ann = s.players[0]; ann.profit = 51;
  turn(s);
  assert(!s.over, 'the raid took Ann below the target before the check');
  assert(ann.profit < 50);
}

// nobody reaches it: no flag, no end
{
  const s = race(); turn(s); turn(s);
  assert(!s.over); assert.strictEqual(s.finalRound, null); assert.strictEqual(s.round, 2);
}

// rounds mode is unchanged: it ends after the last round
{
  const s = E.create({ seed: 3, threats: false, rounds: 10, players: [{ name: 'Ann' }, { name: 'Ben' }] });
  for (let i = 0; i < 20; i++) turn(s);
  assert(s.over); assert.strictEqual(s.round, 10);
}
console.log('target ok');

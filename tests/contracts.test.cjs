// High-value contracts: node tests/contracts.test.cjs
const assert = require('assert');
const E = require('../engine.js');
const HV = { 'Contraband Run': 33, 'Dreadnought Refit': 34, 'Colony Ark Charter': 38, 'Gatebreaker Heist': 40 };

// in the deck twice each; the rest three times
{
  const s = E.create({ seed: 4, players: [{ name: 'A' }, { name: 'B' }] });
  const all = [...s.cdeck, ...s.board];
  assert.strictEqual(all.length, E.TEMPLATES.length * 3 - Object.keys(HV).length);
  assert.strictEqual(new Set(all.map(c => c.id)).size, all.length, 'unique ids');
  for (const [n, fav] of Object.entries(HV)) {
    const cs = all.filter(c => c.name === n);
    assert.strictEqual(cs.length, 2, n); assert.strictEqual(cs[0].profit, fav, n); assert(!('copies' in cs[0]), 'no copies field on cards');
  }
}
// dealt only from round 9, like every contract over 20 favor
{
  for (let seed = 1; seed <= 30; seed++) {
    const s = E.create({ seed, threats: false, players: [{ name: 'A', bot: true }, { name: 'B', bot: true }] });
    let g = 0; while (!s.over && g++ < 400) { E.botTurn(s); if (s.round <= 8) assert(!s.board.some(c => c && c.profit > 20), 'no big contracts before round 9'); }
  }
}
// each can be delivered from one 5-card hand of the right cards
const hands = {
  'Contraband Run': ['quantum', 'hidden', 'wing', 'pack', 'deal'],
  'Dreadnought Refit': ['drill', 'borer', 'reactor', 'gunship', 'hidden'],
  'Colony Ark Charter': ['reactor', 'drill', 'quantum', 'hidden', 'drum'],
  'Gatebreaker Heist': ['reactor', 'quantum', 'gunship', 'wing', 'hidden'],
};
for (const [n, hand] of Object.entries(hands)) {
  const s = E.create({ seed: 2, threats: false, players: [{ name: 'Ann' }, { name: 'Ben' }] });
  E.begin(s); const p = E.me(s); const c = s.cdeck.find(x => x.name === n); s.board[0] = c;
  p.hand = hand.slice(); while (p.hand.length) assert(E.play(s, 0), n + ': play ' + p.hand[0]);
  assert(E.canComplete(s, c), n + ' deliverable from ' + hand.join(', ') + ' · pool ' + JSON.stringify(p.pool));
  const before = p.profit; assert(E.complete(s, c.id)); assert.strictEqual(p.profit, before + HV[n]);
}
console.log('contracts ok');

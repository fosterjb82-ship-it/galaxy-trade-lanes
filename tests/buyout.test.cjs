// Buyout Contract: node tests/buyout.test.cjs
const assert = require('assert');
const E = require('../engine.js');

const sum = p => Object.values(p.score || {}).reduce((a, b) => a + b, 0);
const rich = { fuel: 9, ore: 9, tech: 9, cr: 9, combat: 9, cargo: 9 };

// Ann (seat 0) and Ben (seat 1). Ben delivers the cheapest contract, then it is Ann's turn with a Buyout Contract.
function setup() {
  const s = E.create({ seed: 11, threats: false, players: [{ name: 'Ann' }, { name: 'Ben' }] });
  E.begin(s); E.end(s); E.begin(s);                       // Ben's turn
  Object.assign(E.me(s).pool, rich);
  const c = s.board.slice().sort((a, b) => a.profit - b.profit)[0];
  assert(E.complete(s, c.id));
  E.end(s); E.begin(s);                                    // Ann's turn
  E.me(s).hand = ['buyout', 'scrip', 'drum', 'sample', 'rig'];
  return { s, c, ann: s.players[0], ben: s.players[1] };
}

assert.strictEqual(E.CARDS.buyout.n, 'Buyout Contract');
assert.strictEqual(E.CARDS.buyout.cost, 7);
assert.strictEqual(E.CARDS.buyout.cat, 'act');
assert(!E.CARDS.buyout.draw, 'no longer draws');

// nothing to buy out yet
{
  const s = E.create({ seed: 3, threats: false, players: [{ name: 'Ann' }, { name: 'Ben' }] });
  E.begin(s); E.me(s).hand = ['buyout']; Object.assign(E.me(s).pool, rich);
  assert(!E.canPlay(s, 0) && !E.play(s, 0, 0));
}

// must be able to pay the contract's resources; cargo space is not needed
{
  const { s, c, ann } = setup();
  assert(!E.canPlay(s, 0), 'empty pool cannot pay');
  Object.assign(ann.pool, c.req); ann.pool.cargo = 0;
  assert(E.canPlay(s, 0));
  assert.deepStrictEqual(E.buyoutTargets(s).map(d => d.id), [c.id]);
  const r = Object.keys(c.req).find(k => c.req[k]); ann.pool[r]--;
  assert(!E.canPlay(s, 0) && !E.play(s, 0, c.id), 'one short');
}

// the buyout itself
{
  const { s, c, ann, ben } = setup();
  Object.assign(ann.pool, rich);
  const pool = { ...ann.pool }, benFavor = ben.profit, annFavor = ann.profit, orders = ann.actions;
  assert(!E.play(s, 0, 999), 'unknown contract');
  assert(E.play(s, 0, c.id));
  Object.entries(c.req).forEach(([r, n]) => assert.strictEqual(ann.pool[r], pool[r] - n, 'paid ' + r));
  assert.strictEqual(ann.pool.cargo, pool.cargo, 'cargo untouched');
  assert.strictEqual(ann.profit, annFavor + c.profit);
  assert.strictEqual(ben.profit, benFavor - c.profit);
  assert.strictEqual(ann.completed, 1); assert.strictEqual(ben.completed, 0);
  const d = s.done.find(x => x.id === c.id);
  assert.strictEqual(d.player, 0); assert.strictEqual(d.captain, 'Ann'); assert.strictEqual(d.fromName, 'Ben'); assert.strictEqual(d.boughtRound, s.round);
  assert.strictEqual(ann.actions, orders - 1, 'uses an order');
  assert(!ann.played.includes('buyout') && s.trash.includes('buyout') && ann.scrappedCards.includes('buyout'), 'scrapped');
  assert.strictEqual(sum(ann), ann.profit); assert.strictEqual(sum(ben), ben.profit);
  assert.strictEqual(E.buyoutTargets(s).length, 0, 'your own contracts are not targets');
  assert(/Ann bought out .* from Ben for \+\d+ favor/.test(s.log[0]));
}

// the old owner never drops below 0 favor; the buyer still gets the full value
{
  const { s, c, ann, ben } = setup();
  Object.assign(ann.pool, rich); ben.profit = 2; ben.score = { contracts: 2 };
  E.play(s, 0, c.id);
  assert.strictEqual(ben.profit, 0); assert.strictEqual(ann.profit, c.profit);
  assert.strictEqual(sum(ben), 0);
}

// it is a card play, so Back can take it back (with the other captain's agreement)
{
  const { s, c, ann, ben } = setup();
  Object.assign(ann.pool, rich);
  const before = JSON.stringify([s.players, s.done, s.trash]);
  E.play(s, 0, c.id);
  assert(E.requestUndo(s) && E.voteUndo(s, 1, true));
  assert.strictEqual(JSON.stringify([s.players, s.done, s.trash]), before);
}

// a computer captain uses it when the contract is worth more than anything it could deliver
{
  const { s, c, ann } = setup();
  ann.bot = true; ann.hand = ['buyout']; Object.assign(ann.pool, { ...c.req, cargo: 0 });
  E.botTurn(s);
  assert.strictEqual(s.done.find(x => x.id === c.id).player, 0);
}
console.log('buyout ok');

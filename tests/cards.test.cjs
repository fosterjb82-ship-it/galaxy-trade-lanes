// Card rules that changed after playtests: node tests/cards.test.cjs
const assert = require('assert');
const E = require('../engine.js');

// Quartermaster: costs 3, draws 2, and gives back the order it used
{
  const q = E.CARDS.quarter;
  assert.strictEqual(q.cost, 3); assert.strictEqual(q.draw, 2); assert.strictEqual(q.refund, 1); assert.strictEqual(q.cat, 'act');
  const s = E.create({ seed: 5, threats: false, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
  E.begin(s); const p = E.me(s);
  p.hand = ['quarter', 'gunship', 'rig']; p.deck.push('scrip', 'drum');
  assert.strictEqual(p.actions, 2);
  assert(E.play(s, 0));
  assert.strictEqual(p.actions, 2, 'order given back');
  assert.strictEqual(p.hand.length, 4, 'drew 2');
  // with no orders left it cannot be played (it needs a free order first)
  p.actions = 0; p.hand.push('quarter');
  assert(!E.canPlay(s, p.hand.length - 1));
  // two quartermasters in a row leave the orders untouched
  p.actions = 1; p.hand.push('quarter');
  assert(E.play(s, p.hand.indexOf('quarter'))); assert.strictEqual(p.actions, 1);
}
// unlimited orders: the refund changes nothing
{
  const s = E.create({ seed: 6, threats: false, actionLimit: 0, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
  E.begin(s); const p = E.me(s); p.hand = ['quarter']; p.deck.push('scrip', 'drum');
  assert(E.play(s, 0)); assert.strictEqual(p.actions, 0);
}
// advanced cards: specialists bought with credits plus 2 of a resource, played for free
{
  const want = { reactor: [4, { fuel: 2 }, { fuel: 4, cargo: 1, cr: 1 }], hidden: [4, { cargo: 2 }, { cargo: 3, cr: 2 }],
    quantum: [5, { tech: 2 }, { tech: 4 }], drill: [4, { ore: 2 }, { ore: 3, cargo: 1 }] };
  for (const [k, [cost, pay, g]] of Object.entries(want)) {
    const c = E.CARDS[k];
    assert.strictEqual(c.cat, 'res', k); assert.strictEqual(c.cost, cost, k); assert.deepStrictEqual(c.pay, pay, k); assert.deepStrictEqual(c.g, g, k);
    assert(E.MARKET.includes(k) && E.SPECIALISTS.includes(k) && !E.CORE.includes(k), k + ' is a specialist');
    const s = E.create({ seed: 8, market: 'full', threats: false, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
    E.begin(s); const p = E.me(s); const [r, n] = Object.entries(pay)[0];
    // credits alone are not enough
    Object.assign(p.pool, { fuel: 0, ore: 0, tech: 0, cr: 20, combat: 0, cargo: 0 }); p.pool[r] = n - 1;
    assert(!E.canAfford(s, k) && !E.buy(s, k), k + ': one ' + r + ' short');
    // the resource alone is not enough
    p.pool[r] = n; p.pool.cr = cost - 1; assert(!E.buy(s, k), k + ': one credit short');
    // both: buy it, paying both from the pool
    p.pool.cr = cost + 3; p.pool[r] = n + 1; const stock = s.market[k];
    assert(E.buy(s, k), k + ' bought');
    assert.strictEqual(p.pool.cr, 3); assert.strictEqual(p.pool[r], 1); assert.strictEqual(s.market[k], stock - 1);
    assert.strictEqual(p.discard[p.discard.length - 1], k);
    // played: free (no order), adds its resources
    p.hand = [k]; p.actions = 0; const before = { ...p.pool };
    assert(E.play(s, 0), k + ' plays without an order');
    for (const [res, m] of Object.entries(g)) assert.strictEqual(p.pool[res], before[res] + m, k + ' gives ' + m + ' ' + res);
  }
}
// computer captains buy them when they can pay
{
  let bought = 0;
  for (let seed = 1; seed <= 60 && !bought; seed++) {
    const s = E.create({ seed, market: 'full', threats: false, players: [{ name: 'A', bot: true }, { name: 'B', bot: true }, { name: 'C', bot: true }] });
    let g = 0; while (!s.over && g++ < 400) E.botTurn(s);
    bought = s.players.reduce((a, p) => a + [...p.deck, ...p.hand, ...p.discard, ...p.played].filter(k => ['reactor', 'hidden', 'quantum', 'drill'].includes(k)).length, 0);
  }
  assert(bought > 0, 'bots buy advanced cards');
}
console.log('cards ok');

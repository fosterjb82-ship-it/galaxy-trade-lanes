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
console.log('cards ok');

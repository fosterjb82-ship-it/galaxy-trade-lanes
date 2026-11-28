// Turn order option: node tests/order.test.cjs
const assert = require('assert');
const E = require('../engine.js');
const players = [{ name: 'Ann', ship: 'tug' }, { name: 'Ben', ship: 'miner' }, { name: 'Nova', bot: true }, { name: 'Orion', bot: true }];

// listed (default): seats follow the list
{
  const s = E.create({ seed: 5, players });
  assert.strictEqual(s.order, 'listed');
  assert.deepStrictEqual(s.players.map(p => p.name), ['Ann', 'Ben', 'Nova', 'Orion']);
  assert(!s.log.some(l => /Turn order/.test(l)));
}
// random: a shuffle of the same captains, repeatable from the seed, each keeps its own settings
{
  const first = {};
  for (let seed = 1; seed <= 200; seed++) {
    const s = E.create({ seed, order: 'random', players });
    assert.strictEqual(s.order, 'random');
    assert.deepStrictEqual(s.players.map(p => p.name).sort(), ['Ann', 'Ben', 'Nova', 'Orion']);
    const by = n => s.players.find(p => p.name === n);
    assert.strictEqual(by('Ann').ship, 'tug'); assert.strictEqual(by('Ben').ship, 'miner');
    assert(by('Nova').bot && by('Orion').bot && !by('Ann').bot && !by('Ben').bot, 'computer captains stay computers');
    s.players.forEach(p => assert.strictEqual(p.hand.length, 5));
    assert(/Turn order \(random\): /.test(s.log[0]));
    const again = E.create({ seed, order: 'random', players });
    assert.deepStrictEqual(again.players.map(p => p.name), s.players.map(p => p.name), 'same seed, same order');
    first[s.players[0].name] = (first[s.players[0].name] || 0) + 1;
  }
  // every captain gets to go first, roughly a quarter of the time each
  for (const n of ['Ann', 'Ben', 'Nova', 'Orion']) assert(first[n] > 25 && first[n] < 80, n + ' first ' + first[n] + '/200');
  // the passed-in list is not reordered
  assert.deepStrictEqual(players.map(p => p.name), ['Ann', 'Ben', 'Nova', 'Orion']);
}
console.log('order ok');

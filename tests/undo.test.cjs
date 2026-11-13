// Taking back card plays: node tests/undo.test.cjs
const assert = require('assert');
const E = require('../engine.js');

const KEEP = ['undo', 'undoReq', 'undoStop', 'log', 'events', 'evn', 'feedFrom', 'cpuSpeed', 'warned', 'tutorial'];
const core = s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !KEEP.includes(k))));
function game(players, hand) {
  const s = E.create({ seed: 7, threats: false, players });
  E.begin(s);
  if (hand) E.me(s).hand = hand.slice();
  return s;
}
const solo = hand => game([{ name: 'Ann' }, { name: 'Nova', bot: true }], hand);
const duo = hand => game([{ name: 'Ann' }, { name: 'Ben' }, { name: 'Nova', bot: true }], hand);

// solo: a resource card comes back at once, and the game is exactly as before
{
  const s = solo(['scrip', 'drum', 'rig', 'gunship', 'sample']);
  const before = core(s);
  assert(!E.canUndo(s));
  assert(E.play(s, 0));
  assert(E.canUndo(s));
  assert.notStrictEqual(core(s), before);
  assert(E.requestUndo(s));
  assert.strictEqual(core(s), before, 'state restored exactly');
  assert(!E.canUndo(s));
  assert(/took back Scrip/.test(s.log[0]));
  assert.strictEqual(s.events[s.events.length - 1].t, 'undo');
}

// several steps back, one at a time; an order card gives its order back
{
  const s = solo(['scrip', 'drum', 'rig', 'gunship', 'sample']);
  const s0 = core(s);
  E.play(s, 0); const s1 = core(s);
  E.play(s, E.me(s).hand.indexOf('rig')); const s2 = core(s);
  assert.strictEqual(E.me(s).actions, 1);
  E.play(s, E.me(s).hand.indexOf('gunship'));
  assert.strictEqual(E.me(s).actions, 0);
  E.requestUndo(s); assert.strictEqual(core(s), s2); assert.strictEqual(E.me(s).actions, 1);
  E.requestUndo(s); assert.strictEqual(core(s), s1);
  E.requestUndo(s); assert.strictEqual(core(s), s0);
  assert(!E.requestUndo(s), 'nothing left to take back');
}

// "Play resources" is one step
{
  const s = solo(['scrip', 'drum', 'rig', 'sample', 'scrip']);
  const before = core(s);
  E.playResources(s);
  assert.strictEqual(E.me(s).hand.join(), 'rig');
  assert.strictEqual(s.undo.length, 1);
  assert.match(E.undoLabel(s.undo[0].what), /^4 cards \(2 Scrip, Fuel Drum, Ore Sample\)$/);
  E.requestUndo(s);
  assert.strictEqual(core(s), before);
}

// purchases and every other move clear the history
for (const move of [
  s => { E.me(s).pool.cr = 9; return E.buy(s, 'deal'); },
  s => { E.me(s).pool.cr = 9; return E.cashIn(s); },
  s => { E.me(s).pool.cr = 9; return E.scrap(s, 0); },
  s => { Object.assign(E.me(s).pool, { combat: 3, fuel: 1 }); return E.patrol(s); },
  s => { Object.assign(E.me(s).pool, { fuel: 9, ore: 9, tech: 9, cr: 9, combat: 9, cargo: 9 }); return E.complete(s, s.board[0].id); },
  s => E.end(s),
]) {
  const s = solo(['scrip', 'drum', 'rig', 'sample', 'scrip']);
  E.play(s, 0);
  assert(E.canUndo(s));
  assert(move(s), 'move succeeds: ' + move);
  assert(!E.canUndo(s), 'history cleared by ' + move);
}

// a play that draws cards cannot be taken back (the drawn cards are known), but later plays can
{
  const s = solo(['scrip', 'quarter', 'drum', 'rig', 'sample']);
  E.play(s, 0);
  E.play(s, E.me(s).hand.indexOf('quarter'));
  assert(!E.canUndo(s));
  assert.strictEqual(s.undoStop, 'quarter');
  const after = core(s);
  E.play(s, E.me(s).hand.indexOf('drum'));
  assert(E.canUndo(s));
  E.requestUndo(s);
  assert.strictEqual(core(s), after);
  assert(!E.canUndo(s));
}

// computer captains never store history
{
  const s = E.create({ seed: 3, threats: false, players: [{ name: 'Nova', bot: true }, { name: 'Ann' }] });
  E.botTurn(s);
  assert(!s.undo || !s.undo.length);
}

// with other human captains, every one of them must agree
{
  const s = duo(['scrip', 'drum', 'rig', 'gunship', 'sample']);
  const before = core(s);
  E.play(s, 0); const played = core(s);
  assert.deepStrictEqual(E.undoVoters(s), [1], 'only the other human votes, not the computer');
  assert(E.requestUndo(s));
  assert.strictEqual(core(s), played, 'nothing changes until everyone agrees');
  assert.deepStrictEqual(s.undoReq, { by: 0, what: ['scrip'], need: [1], yes: [] });
  assert(!E.live(s) && !E.play(s, 0) && !E.end(s), 'the turn waits while a request is open');
  assert(!E.requestUndo(s), 'one request at a time');
  assert(!E.voteUndo(s, 0, true), 'the asker does not vote');
  assert(!E.voteUndo(s, 2, true), 'computers do not vote');
  assert(E.voteUndo(s, 1, true));
  assert.strictEqual(core(s), before);
  assert(!s.undoReq && E.live(s));
}

// one "no" cancels; the asker can withdraw; the request survives a save and load
{
  const s = game([{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cy' }], ['scrip', 'drum', 'rig', 'gunship', 'sample']);
  E.play(s, 0); const played = core(s);
  E.requestUndo(s);
  const t = JSON.parse(JSON.stringify(s));
  assert(E.voteUndo(t, 2, true));
  assert(t.undoReq && t.undoReq.yes.join() === '2', 'still waiting for Ben');
  assert(E.voteUndo(t, 1, false));
  assert(!t.undoReq && core(t) === played && /Ben said no/.test(t.log[0]));
  assert(E.canUndo(t), 'can ask again');
  assert(E.cancelUndo(s) && !s.undoReq && core(s) === played);
}

// a take-back restores favor gained from a Trade Charter and its race-to-target trigger
{
  const s = E.create({ seed: 9, threats: false, winMode: 'profit', target: 50, players: [{ name: 'Ann' }, { name: 'Nova', bot: true }] });
  E.begin(s); E.me(s).hand = ['charter', 'scrip']; E.me(s).profit = 49;
  E.play(s, 0);
  assert.strictEqual(E.me(s).profit, 51); assert.strictEqual(s.finalRound, 1);
  E.requestUndo(s);
  assert.strictEqual(E.me(s).profit, 49); assert.strictEqual(s.finalRound, null);
}
console.log('undo ok');

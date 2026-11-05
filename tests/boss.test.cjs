const assert=require('node:assert/strict'),E=require('../engine.js');
// play to the first boss with two humans who do nothing
const s=E.create({seed:11,rounds:16,players:[{name:'A'},{name:'B'}]});
while(!s.boss){E.begin(s);E.end(s)}
assert.equal(s.round,5);assert.equal(s.boss.max,6);assert.equal(s.boss.until,7);
E.begin(s);const a=E.me(s);
// contracts are blocked
a.pool={fuel:9,ore:9,tech:9,cr:9,combat:0,cargo:9};assert.ok(s.board.every(c=>!E.canComplete(s,c)));
// weapons officer doubles combat damage
a.hand=['weapons'];a.actions=2;assert.equal(E.play(s,0),true);assert.equal(a.pool.combat,2);
assert.equal(E.attack(s),true);assert.equal(s.boss.hp,2);assert.equal(s.boss.dmg[0],4);
// mercenaries: 2 credits per damage, final blow pays rewards and reopens contracts
const p0=a.profit;assert.equal(E.mercs(s),true);assert.equal(E.mercs(s),true);
assert.equal(s.boss,null);assert.equal(a.profit,p0+6+E.FINAL_BLOW);assert.equal(s.bossDone[0].won,true);
assert.ok(s.board.some(c=>E.canComplete(s,c)));assert.equal(E.mercs(s),false);
// second boss raids if nobody fights it
E.end(s);while(!s.boss){E.begin(s);E.end(s)}
assert.equal(s.round,11);const before=s.players.map(p=>p.profit);
while(s.boss){E.begin(s);E.end(s)}
assert.deepEqual(s.players.map(p=>p.profit),before.map(v=>Math.max(0,v-E.RAID)));assert.equal(s.bossDone[1].won,false);
// threats off: no bosses
const q=E.create({seed:3,rounds:16,threats:false,players:[{name:'A',bot:true},{name:'B',bot:true}]});while(!q.over){E.botTurn(q);assert.equal(q.boss,null)}
console.log('boss ok');

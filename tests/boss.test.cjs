const assert=require('node:assert/strict'),E=require('../engine.js');
// play to the first boss with two humans who do nothing
const s=E.create({seed:11,rounds:16,bosses:['dread','maw'],players:[{name:'A'},{name:'B'}]});
while(!s.boss){E.begin(s);E.end(s)}
assert.equal(s.round,5);assert.equal(s.boss.max,5);assert.equal(s.boss.until,7);
E.begin(s);const a=E.me(s);
// contracts are blocked
a.pool={fuel:9,ore:9,tech:9,cr:9,combat:0,cargo:9};assert.ok(s.board.every(c=>!E.canComplete(s,c)));
// weapons officer doubles combat damage
a.hand=['weapons'];a.actions=2;assert.equal(E.play(s,0),true);assert.equal(a.pool.combat,2);
assert.equal(E.attack(s),true);assert.equal(s.boss.hp,1);assert.equal(s.boss.dmg[0],4);
// mercenaries: 2 credits per damage, final blow pays rewards and reopens contracts
const p0=a.profit;assert.equal(E.mercs(s),true);
assert.equal(s.boss,null);assert.equal(a.profit,p0+5+E.FINAL_BLOW);assert.equal(s.bossDone[0].won,true);
assert.ok(s.board.some(c=>E.canComplete(s,c)));assert.equal(E.mercs(s),false);
// each human captain must confirm the result
const r=s.bossDone[0];assert.deepEqual(r.change,[5+E.FINAL_BLOW,0]);assert.equal(E.unseen(s,0),0);assert.equal(E.unseen(s,1),0);
assert.equal(E.confirmBoss(s,0,0),true);assert.equal(E.confirmBoss(s,0,0),false);assert.equal(E.unseen(s,0),-1);assert.equal(E.unseen(s,1),0);
assert.equal(E.confirmBoss(s,0,1),true);assert.equal(E.unseen(s,1),-1);
// second boss raids if nobody fights it
E.end(s);while(!s.boss){E.begin(s);E.end(s)}
assert.equal(s.round,10);assert.equal(s.boss.key,'maw');assert.deepEqual(E.bossClock(s),{rounds:3,turns:6});const before=s.players.map(p=>p.profit);
while(s.boss){E.begin(s);E.end(s)}
assert.deepEqual(s.players.map(p=>p.profit),before.map(v=>Math.max(0,v-16)));assert.equal(s.bossDone[1].won,false);
assert.deepEqual(s.bossDone[1].change,before.map(v=>-Math.min(16,v)));
assert.equal(s.nextBoss,15);
// threats off: no bosses
const q=E.create({seed:3,rounds:16,threats:false,players:[{name:'A',bot:true},{name:'B',bot:true}]});while(!q.over){E.botTurn(q);assert.equal(q.boss,null)}
// patrols push the next boss back one round each, never more than 8 rounds away
{const z=E.create({seed:2,rounds:20,players:[{name:'A'},{name:'B'}]});E.begin(z);assert.equal(z.nextBoss,5);
 for(let i=0;i<6;i++){const P=E.me(z);P.patrolled=false;P.pool.combat=3;P.pool.fuel=1;assert.equal(E.patrol(z),true)}assert.equal(z.nextBoss,1+8);}
// only the least helpful captain(s) lose double
{const z=E.create({seed:4,rounds:16,bosses:['dread'],players:[{name:'A'},{name:'B'},{name:'C'}]});while(!z.boss){E.begin(z);E.end(z)}
 z.players.forEach(p=>p.profit=30);E.begin(z);E.me(z).pool.combat=2;E.attack(z);E.end(z);E.begin(z);E.me(z).pool.combat=1;E.attack(z);
 while(z.boss){if(z.phase==='handoff')E.begin(z);E.end(z)}assert.deepEqual(z.bossDone[0].change,[-5,-5,-10]);assert.deepEqual(z.bossDone[0].least,[false,false,true]);}
// abilities
const mk=k=>{const z=E.create({seed:5,rounds:16,bosses:[k],players:[{name:'A'},{name:'B'},{name:'C'}]});while(!z.boss){E.begin(z);E.end(z)}E.begin(z);return z};
let z=mk('armada');assert.equal(E.mercCost(z),3);E.me(z).pool.cr=3;assert.equal(E.mercs(z),true);assert.equal(E.me(z).pool.cr,0);
z=mk('wraith');assert.equal(z.boss.until,z.boss.arrived+1);assert.equal(z.boss.max,Math.max(3,Math.round(2.4*.62*3)));
z=mk('hive');E.me(z).pool.cr=4;E.mercs(z);E.mercs(z);const h=z.boss.hp,r0=z.round;while(z.round===r0){if(z.phase==='handoff')E.begin(z);E.end(z)}assert.equal(z.boss.hp,Math.min(z.boss.max,h+3));
z=mk('siren');const pr=E.me(z).profit;E.me(z).pool.combat=99;E.attack(z);assert.equal(E.me(z).profit,pr+z.bossDone[0].dmg[0]*2+E.FINAL_BLOW);
// random order, no repeats
const orders=new Set();for(let seed=1;seed<=30;seed++){const z=E.create({seed,players:[{name:'A'},{name:'B'}]});assert.equal(new Set(z.bossOrder).size,6);orders.add(z.bossOrder.slice(0,2).join())}assert.ok(orders.size>5);
console.log('boss ok');

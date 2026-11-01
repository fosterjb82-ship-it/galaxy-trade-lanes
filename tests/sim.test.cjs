const assert=require('node:assert/strict'),E=require('../engine.js');
let tot=0,n=0,zero=0;
for(let seed=1;seed<=60;seed++)for(const mode of ['rounds','profit']){
 const s=E.create({seed,winMode:mode,rounds:12,target:50,boardSize:3+seed%3,actionLimit:seed%4?2:0,players:[{name:'A',bot:true},{name:'B',bot:true},{name:'C',bot:true}]});
 let t=0;
 while(!s.over&&t++<2000){E.botTurn(s);
  assert.equal(s.board.length,s.boardSize);assert.ok(s.board.every(Boolean));
  assert.equal(new Set(s.board.map(c=>c.id)).size,s.board.length);
  assert.equal(s.players.reduce((a,p)=>a+E.deckSize(p),0)+s.trash.length,30+130-Object.values(s.market).reduce((a,b)=>a+b,0));
  s.players.forEach(p=>{assert.ok(p.profit>=0);Object.values(p.pool).forEach(v=>assert.ok(v>=0))});}
 assert.ok(s.over,'ends '+seed+mode);
 if(mode==='rounds')s.players.forEach(p=>{tot+=p.profit;n++;if(!p.completed)zero++});
}
// manual turn
let s=E.create({seed:7,players:[{name:'H'},{name:'B',bot:true}]});
assert.equal(E.begin(s),true);const p=E.me(s);
p.hand=['scrip','drum','sample','rig','buyout'];
E.playResources(s);assert.equal(p.pool.cr,1);assert.equal(p.pool.fuel,1);
assert.equal(E.play(s,p.hand.indexOf('buyout')),false);
assert.equal(E.complete(s,s.board.find(c=>c.name==='Seed Stock').id),true);assert.equal(p.profit,8);
assert.equal(E.buy(s,'deal'),false);
console.log('ok avg profit',(tot/n).toFixed(1),'zero',zero,'of',n);

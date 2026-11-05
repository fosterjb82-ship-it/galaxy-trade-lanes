const assert=require('node:assert/strict'),E=require('../engine.js');
let tot=0,n=0,zero=0;
for(let seed=1;seed<=60;seed++)for(const mode of ['rounds','profit']){
 const s=E.create({seed,winMode:mode,rounds:12,target:50,boardSize:3+seed%3,actionLimit:seed%4?2:0,players:[{name:'A',bot:true},{name:'B',bot:true},{name:'C',bot:true}]});
 const stock=Object.values(s.market).reduce((a,b)=>a+b,0);let t=0;
 while(!s.over&&t++<2000){E.botTurn(s);
  assert.equal(s.board.length,s.boardSize);assert.ok(s.board.every(Boolean));
  assert.equal(new Set(s.board.map(c=>c.id)).size,s.board.length);
  assert.equal(s.players.reduce((a,p)=>a+E.deckSize(p),0)+s.trash.length,30+stock-Object.values(s.market).reduce((a,b)=>a+b,0));
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
// trade charter and cashing in
p.pool.cr=9;const before=p.profit;assert.equal(E.cashIn(s),true);assert.equal(E.cashIn(s),true);assert.equal(E.cashIn(s),false);
assert.equal(p.pool.cr,1);assert.equal(p.profit,before+2);
p.hand.push('charter');assert.equal(E.play(s,p.hand.indexOf('charter')),true);assert.equal(p.pool.cr,3);assert.equal(p.profit,before+4);
assert.ok(E.MARKET.includes('charter'));
p.hand.push('scrip');assert.equal(E.scrap(s,p.hand.length-1),true);assert.deepEqual(p.scrappedCards,['scrip']);
// salvage crew: scraps another hand card for free, ignores the once-per-turn scrap, draws 2
p.hand=['drum','salvage','sample'];p.actions=2;const dk=p.deck.length+p.discard.length,tr=s.trash.length;
assert.equal(E.play(s,1,2),true);assert.equal(p.scrappedCards.at(-1),'sample');assert.equal(s.trash.length,tr+1);
assert.equal(p.hand.length,1+Math.min(2,dk));assert.equal(p.hand[0],'drum');
p.hand.push('salvage');assert.equal(E.play(s,p.hand.length-1,-1),true);
// old saves get new market cards
const old=JSON.parse(JSON.stringify(s));delete old.market.salvage;assert.equal(E.migrate(old).market.salvage>0,true);
console.log('ok avg profit',(tot/n).toFixed(1),'zero',zero,'of',n);

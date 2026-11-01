const assert=require('node:assert/strict'),E=require('../engine.js');
let n=0;
for(let seed=1;seed<=40;seed++){const k=2+seed%5;
 const s=E.create({seed,rounds:12,players:Array.from({length:k},(_,i)=>({name:'P'+i,bot:true}))});
 const stock=Object.values(s.market).reduce((a,b)=>a+b,0);let t=0;
 while(!s.over&&t++<3000){E.botTurn(s);assert.ok(s.board.every(Boolean));
  assert.equal(s.players.reduce((a,p)=>a+E.deckSize(p),0)+s.trash.length,10*k+stock-Object.values(s.market).reduce((a,b)=>a+b,0));
  s.players.forEach(p=>assert.equal(p.turnPlayed.length,0))}
 assert.ok(s.over);n++}
const s=E.create({seed:3,players:[{name:'H'},{name:'B',bot:true}]});E.begin(s);E.playResources(s);
assert.ok(E.me(s).turnPlayed.length>0);console.log('6p ok',n,'played',E.me(s).turnPlayed.join(','));

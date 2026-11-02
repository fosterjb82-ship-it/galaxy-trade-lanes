const Engine=(function(){
'use strict';
const RES=['fuel','ore','tech','cr','combat','cargo'];
const RLABEL={fuel:'Fuel',ore:'Ore',tech:'Tech',cr:'Credits',combat:'Combat',cargo:'Cargo'};
const CARDS={
 scrip:{n:'Scrip',cat:'res',kind:'Starter',g:{cr:1},cost:0,t:'Gain 1 credit.'},
 drum:{n:'Fuel Drum',cat:'res',kind:'Starter',g:{fuel:1},cost:0,t:'Gain 1 fuel.'},
 sample:{n:'Ore Sample',cat:'res',kind:'Starter',g:{ore:1},cost:0,t:'Gain 1 ore.'},
 rig:{n:'Hold Rig',cat:'act',kind:'Starter',g:{cargo:2},cost:0,t:'Gain 2 cargo space this turn.'},
 deal:{n:'Dockside Deal',cat:'res',kind:'Economy',g:{cr:2},cost:2,t:'Gain 2 credits.'},
 house:{n:'Clearing House',cat:'res',kind:'Economy',g:{cr:4},cost:4,t:'Gain 4 credits.'},
 pack:{n:'Plasma Pack',cat:'res',kind:'Propulsion',g:{fuel:3},cost:2,t:'Gain 3 fuel.'},
 borer:{n:'Ore Borer',cat:'res',kind:'Mining',g:{ore:2},cost:3,t:'Gain 2 ore.'},
 vault:{n:'Data Vault',cat:'res',kind:'Research',g:{tech:2},cost:3,t:'Gain 2 tech.'},
 quarter:{n:'Quartermaster',cat:'act',kind:'Crew',g:{},draw:2,cost:2,t:'Draw 2 cards.'},
 barge:{n:'Barge',cat:'act',kind:'Storage',g:{cargo:4},cost:2,t:'Gain 4 cargo space this turn.'},
 gunship:{n:'Gunship',cat:'act',kind:'Combat',g:{combat:3},cost:3,t:'Gain 3 combat for escorts or a patrol.'},
 probe:{n:'Scout Probe',cat:'act',kind:'Recon',g:{fuel:1,tech:1},draw:1,cost:4,t:'Gain 1 fuel and 1 tech. Draw a card.'},
 broker:{n:'Brokerage',cat:'act',kind:'Economy',g:{cr:2},buys:1,cost:4,t:'Gain 2 credits and 1 extra purchase.'},
 deck:{n:'Process Deck',cat:'act',kind:'Industry',g:{ore:1,tech:1,cargo:2},cost:4,t:'Gain 1 ore, 1 tech and 2 cargo space.'},
 wing:{n:'Escort Wing',cat:'act',kind:'Combat',g:{combat:2,fuel:1},draw:1,cost:4,t:'Gain 2 combat and 1 fuel. Draw a card.'},
 buyout:{n:'Buyout',cat:'act',kind:'Tactics',g:{},draw:1,cost:6,t:'Take up to 2 profit from another captain. Draw 1 card. Scrap this card.'},
 charter:{n:'Trade Charter',cat:'res',kind:'Economy',g:{cr:2},vp:2,cost:8,t:'Gain 2 credits and 2 profit.'}
};
const CASH=4; // credits per 1 profit when cashing in
const MARKET=['deal','house','pack','borer','vault','quarter','barge','gunship','probe','broker','deck','wing','buyout','charter'];
const TEMPLATES=[
 {name:'Seed Stock',dest:'Harrow',req:{fuel:1,ore:1},profit:8},
 {name:'Hull Plating',dest:'Port Calder',req:{fuel:1,ore:2},profit:11},
 {name:'Ice Harvest',dest:'Tern Belt',req:{fuel:1,ore:1},profit:10},
 {name:'Long-Haul Rations',dest:'Tern Belt',req:{fuel:3,ore:2},profit:15},
 {name:'Nav Cores',dest:'Lumen Gate',req:{fuel:1,tech:1},profit:11},
 {name:'Survey Mission',dest:'Harrow',req:{fuel:2,tech:2},profit:16},
 {name:'Orbital Ring Parts',dest:'Brindle',req:{fuel:2,ore:1,tech:1},profit:19},
 {name:"Broker's Rush",dest:'Port Calder',req:{fuel:2,cr:2},profit:11},
 {name:'Blockade Relief',dest:'Harrow',req:{fuel:1,ore:1,combat:2},profit:13},
 {name:'Narrows Convoy',dest:'Lumen Gate',req:{fuel:1,tech:1,combat:2},profit:18},
 {name:'Fortress Resupply',dest:'Tern Belt',req:{fuel:3,ore:2,tech:1,combat:3},profit:25},
 {name:'Armed Courier',dest:'Brindle',req:{fuel:2,cr:1,combat:2},profit:13},
 {name:'Deepwell Megaproject',dest:'Tern Belt',req:{fuel:4,ore:3,tech:2,combat:2},profit:30},
 {name:'Clinic Shipment',dest:'Harrow',req:{fuel:1,tech:1,cr:1},profit:13},
 {name:'Bulk Ingots',dest:'Brindle',req:{fuel:2,ore:4},profit:20},
 {name:'Sealed Vault Run',dest:'Lumen Gate',req:{fuel:3,tech:3,combat:1},profit:24}
];
function rnd(s){s.seed=(s.seed*16807)%2147483647;return (s.seed-1)/2147483646}
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd(s)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const me=s=>s.players[s.current];
const fresh=()=>({fuel:0,ore:0,tech:0,cr:0,combat:0,cargo:1});
const live=s=>s.phase==='action'&&!s.over;
const need=c=>(c.req.ore||0)+(c.req.tech||0);
const deckSize=p=>p.deck.length+p.discard.length+p.hand.length+p.played.length;
function log(s,t){s.log.unshift('R'+s.round+' · '+t);if(s.log.length>50)s.log.length=50}
function draw(s,p,n){for(let i=0;i<n;i++){if(!p.deck.length)p.deck=shuffle(s,p.discard.splice(0));if(!p.deck.length)break;p.hand.push(p.deck.pop())}}
function isStarter(c){return !c.req.tech&&!c.req.combat&&!c.req.cr&&(c.req.fuel||0)<=2&&(c.req.ore||0)<=2}
function nextContract(s){
 const shown=s.board.filter(Boolean);
 const needEasy=!shown.some(isStarter);
 const cap=s.round<=4?13:s.round<=8?20:Infinity;
 const ok=c=>needEasy?isStarter(c):c.profit<=cap;
 const find=()=>{const i=s.cdeck.findIndex(c=>ok(c)&&!shown.some(x=>x.name===c.name));return i>=0?i:s.cdeck.findIndex(ok)};
 if(!s.cdeck.length)s.cdeck=shuffle(s,s.cdisc.splice(0));
 let i=find();
 if(i<0&&s.cdisc.length){s.cdeck=shuffle(s,[...s.cdeck,...s.cdisc.splice(0)]);i=find()}
 return i>=0?s.cdeck.splice(i,1)[0]:s.cdeck.pop();
}
function create(o={}){
 const s={v:1,id:Date.now()+'-'+Math.random().toString(36).slice(2,7),seed:o.seed||(Date.now()%2147483646)+1,
  current:0,round:1,phase:'handoff',over:false,mode:o.mode||'solo',actionLimit:o.actionLimit===0?0:2,
  winMode:o.winMode||'rounds',maxRounds:o.rounds||16,target:o.target||80,finalRound:null,
  boardSize:o.boardSize||4,board:[],cdeck:[],cdisc:[],done:[],
  market:Object.fromEntries(MARKET.map(k=>[k,Math.max(10,4+2*((o.players||[]).length||3))])),trash:[],log:[],players:[]};
 const cfg=o.players||[{name:'Captain'},{name:'Nova',bot:true},{name:'Orion',bot:true}];
 cfg.forEach(c=>{
  const p={name:String(c.name||'Captain').slice(0,24),bot:!!c.bot,deck:[],hand:[],played:[],discard:[],pool:fresh(),
   buys:1,actions:s.actionLimit,patrolled:false,scrapped:false,profit:0,completed:0,turnPlayed:[],scrappedCards:[]};
  p.deck=shuffle(s,['scrip','scrip','scrip','scrip','drum','drum','drum','sample','sample','rig']);
  draw(s,p,5);s.players.push(p);
 });
 s.cdeck=shuffle(s,Array.from({length:48},(_,i)=>{const t=TEMPLATES[i%16];return {...t,req:{...t.req},id:i}}));
 const e=s.cdeck.findIndex(c=>c.name==='Seed Stock');
 s.board.push(s.cdeck.splice(e,1)[0]);
 while(s.board.length<s.boardSize)s.board.push(nextContract(s));
 log(s,'The contract board is open.');
 return s;
}
function begin(s){if(s.over||s.phase!=='handoff')return false;s.phase='action';log(s,me(s).name+' begins a turn.');return true}
function checkTarget(s){if(s.winMode==='profit'&&s.finalRound===null&&me(s).profit>=s.target){s.finalRound=s.round;log(s,'Profit target reached. Round '+s.round+' is the last round.')}}
function canPlay(s,i){const p=me(s);return live(s)&&Number.isInteger(i)&&i>=0&&i<p.hand.length&&(CARDS[p.hand[i]].cat==='res'||s.actionLimit===0||p.actions>0)}
function play(s,i,target){
 if(!canPlay(s,i))return false;
 const p=me(s),k=p.hand[i],c=CARDS[k];
 if(k==='buyout'&&(!Number.isInteger(target)||target===s.current||!s.players[target]))return false;
 p.hand.splice(i,1);
 (p.turnPlayed=p.turnPlayed||[]).push(k);
 if(c.cat==='act'&&s.actionLimit)p.actions--;
 if(k==='buyout'){
  const v=s.players[target],amt=Math.min(2,v.profit);v.profit-=amt;p.profit+=amt;s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);
  log(s,p.name+' bought out '+amt+' profit from '+v.name+'.');
 }else p.played.push(k);
 Object.entries(c.g).forEach(([r,n])=>p.pool[r]+=n);
 if(c.buys)p.buys+=c.buys;
 if(c.draw)draw(s,p,c.draw);
 if(c.vp){p.profit+=c.vp;log(s,p.name+' played '+c.n+' for +'+c.vp+' profit.')}
 if(k==='buyout'||c.vp)checkTarget(s);
 return true;
}
function playResources(s){if(!live(s))return false;const p=me(s);let i;while((i=p.hand.findIndex(k=>CARDS[k].cat==='res'))>=0)play(s,i);return true}
function canComplete(s,c){if(!live(s)||!c)return false;const p=me(s);return Object.entries(c.req).every(([r,n])=>p.pool[r]>=n)&&p.pool.cargo>=need(c)}
function complete(s,id){
 const c=s.board.find(x=>x&&x.id===id),p=me(s);
 if(!canComplete(s,c))return false;
 Object.entries(c.req).forEach(([r,n])=>p.pool[r]-=n);
 p.pool.cargo-=need(c);p.profit+=c.profit;p.completed++;
 s.done.push({...c,req:{...c.req},captain:p.name,player:s.current,round:s.round});
 const idx=s.board.indexOf(c);s.cdisc.push(c);s.board[idx]=null;s.board[idx]=nextContract(s);
 log(s,p.name+' delivered '+c.name+' for +'+c.profit+'.');
 checkTarget(s);return true;
}
function buy(s,k){
 const p=me(s),c=CARDS[k];
 if(!live(s)||!MARKET.includes(k)||s.market[k]<=0||p.buys<1||p.pool.cr<c.cost)return false;
 p.pool.cr-=c.cost;p.buys--;p.discard.push(k);s.market[k]--;
 log(s,p.name+' bought '+c.n+'.');return true;
}
function patrol(s){const p=me(s);if(!live(s)||p.patrolled||p.pool.combat<3||p.pool.fuel<1)return false;
 p.pool.combat-=3;p.pool.fuel--;p.patrolled=true;p.profit+=5;log(s,p.name+' cleared a pirate patrol for +5.');checkTarget(s);return true}
function cashIn(s){const p=me(s);if(!live(s)||p.pool.cr<CASH)return false;
 p.pool.cr-=CASH;p.profit++;log(s,p.name+' cashed in '+CASH+' credits for +1 profit.');checkTarget(s);return true}
function scrap(s,i){const p=me(s);if(!live(s)||p.scrapped||p.pool.cr<1||!Number.isInteger(i)||i<0||i>=p.hand.length)return false;
 p.pool.cr--;const k=p.hand.splice(i,1)[0];s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);p.scrapped=true;log(s,p.name+' scrapped '+CARDS[k].n+'.');return true}
function end(s){
 if(!live(s))return false;
 const p=me(s);
 p.discard.push(...p.hand,...p.played);p.hand=[];p.played=[];p.pool=fresh();
 p.buys=1;p.actions=s.actionLimit;p.patrolled=false;p.scrapped=false;p.turnPlayed=[];draw(s,p,5);
 s.current++;
 if(s.current>=s.players.length){
  s.current=0;
  if(s.winMode==='rounds'?s.round>=s.maxRounds:s.finalRound===s.round){s.over=true;s.phase='over';log(s,'The run is over. Highest profit wins.');return true}
  s.round++;
 }
 s.phase='handoff';return true;
}
const W={deal:7,house:8,quarter:6,pack:5,borer:4,barge:3.5,vault:4,gunship:3.5,probe:4,deck:4.5,broker:2,wing:4,buyout:2.5,charter:6};
function playAll(s){
 if(!live(s))return false;
 playResources(s);const p=me(s);let g=0;
 while(g++<150){
  const cand=p.hand.map((k,i)=>({k,i})).filter(x=>canPlay(s,x.i));
  if(!cand.length)break;
  const val=x=>{const c=CARDS[x.k];if(c.draw)return 10+c.draw;
   const pool={...p.pool};Object.entries(c.g).forEach(([r,n])=>pool[r]+=n);
   const opens=s.board.some(b=>Object.entries(b.req).every(([r,n])=>pool[r]>=n)&&pool.cargo>=need(b));
   return opens?9:x.k==='deck'?7:x.k==='broker'?6:x.k==='gunship'?5:3};
  cand.sort((a,b)=>val(b)-val(a));
  const foe=s.players.map((t,i)=>({i,pr:t.profit})).filter(t=>t.i!==s.current).sort((a,b)=>b.pr-a.pr)[0];
  play(s,cand[0].i,foe&&foe.i);playResources(s);
 }
 return true;
}
function botTurn(s){
 if(s.over||!me(s).bot)return false;
 if(s.phase==='handoff')begin(s);
 const p=me(s);playAll(s);
 for(let n=0;n<10;n++){const ch=s.board.filter(c=>canComplete(s,c)).sort((a,b)=>b.profit-a.profit);if(!ch.length)break;complete(s,ch[0].id)}
 const owned=()=>{const a=[...p.deck,...p.discard,...p.hand,...p.played];return Object.fromEntries(MARKET.map(k=>[k,a.filter(t=>t===k).length]))};
 while(p.buys>0){
  const o=owned(),ch=MARKET.filter(k=>s.market[k]>0&&CARDS[k].cost<=p.pool.cr);
  if(!ch.length)break;
  const v=k=>W[k]/(o[k]+1)+rnd(s)*.25;
  ch.sort((a,b)=>v(b)-v(a));buy(s,ch[0]);
 }
 patrol(s);while(cashIn(s));end(s);return true;
}
return {RES,RLABEL,CARDS,MARKET,TEMPLATES,create,me,live,begin,canPlay,play,playResources,playAll,canComplete,complete,buy,patrol,cashIn,CASH,scrap,end,botTurn,deckSize,need};
})();
if(typeof module!=='undefined')module.exports=Engine;

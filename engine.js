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
 broker:{n:'Brokerage',cat:'act',kind:'Economy',g:{cr:2},buys:1,cost:4,t:'Gain 2 credits and 1 extra deal.'},
 deck:{n:'Process Deck',cat:'act',kind:'Industry',g:{ore:1,tech:1,cargo:2},cost:4,t:'Gain 1 ore, 1 tech and 2 cargo space.'},
 wing:{n:'Escort Wing',cat:'act',kind:'Combat',g:{combat:2,fuel:1},draw:1,cost:4,t:'Gain 2 combat and 1 fuel. Draw a card.'},
 buyout:{n:'Buyout',cat:'act',kind:'Tactics',g:{},draw:1,cost:6,t:'Take up to 2 profit from another captain. Draw 1 card. Scrap this card.'},
 weapons:{n:'Weapons Officer',cat:'act',kind:'Crew',g:{combat:2},draw:1,dbl:1,cost:5,t:'Gain 2 combat and draw 1 card. This turn, combat you spend on a pirate boss deals double damage.'},
 salvage:{n:'Salvage Crew',cat:'act',kind:'Crew',g:{},draw:2,junk:1,cost:5,t:'Scrap 1 other card from your hand for free, then draw 2 cards.'},
 charter:{n:'Trade Charter',cat:'res',kind:'Economy',g:{cr:2},vp:2,cost:8,t:'Gain 2 credits and 2 profit.'}
};
const CASH=4; // credits per 1 profit when cashing in
const MERC=2; // credits per 1 boss damage when hiring mercenaries
// pirate bosses: one is drawn at random for each threat (no repeats in a run). hp = stage base (3, then 4) x mult x captains
const BOSSES={
 dread:{name:'Blackwake Dreadnought',hp:1,trait:'No tricks. A straight fight.'},
 maw:{name:'Red Maw Marauder',hp:1,raid:8,trait:'Ruthless: if it survives, its raid takes 8 profit instead of 5.'},
 armada:{name:'Iron Corsair Armada',hp:1,merc:3,trait:'Armored: mercenaries cost 3 credits per damage instead of 2.'},
 wraith:{name:'Void Wraith',hp:.62,rounds:2,trait:'Fast: only 2 rounds to beat it, but its hull is thin.'},
 hive:{name:'Scrap Hive Swarm',hp:.75,regen:1,trait:'Regenerates: repairs 1 hull per captain at the end of every round.'},
 siren:{name:'Siren of Lumen Gate',hp:1.15,bounty:2,trait:'Rich prize: +2 profit per damage dealt, but a tougher hull.'}
};
const BOSS_KEYS=Object.keys(BOSSES),STAGE_HP=[2.4,4.6];
const BOSS_ROUNDS=3,RAID=5,FINAL_BLOW=5;
const MARKET=['deal','house','pack','borer','vault','quarter','barge','gunship','probe','broker','deck','wing','buyout','salvage','weapons','charter'];
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
  threats:o.threats!==false,bossNo:0,bossOrder:null,boss:null,bossDone:[],winMode:o.winMode||'rounds',maxRounds:o.rounds||16,target:o.target||80,finalRound:null,
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
 s.bossOrder=o.bosses||shuffle(s,BOSS_KEYS.slice());
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
 let junk=null;
 if(c.junk&&Number.isInteger(target)&&target>=0&&target!==i&&target<p.hand.length)junk=target>i?target-1:target;
 p.hand.splice(i,1);
 if(junk!==null){const j=p.hand.splice(junk,1)[0];s.trash.push(j);(p.scrappedCards=p.scrappedCards||[]).push(j);log(s,p.name+' salvaged '+CARDS[j].n+' out of the deck.')}
 (p.turnPlayed=p.turnPlayed||[]).push(k);
 if(c.cat==='act'&&s.actionLimit)p.actions--;
 if(k==='buyout'){
  const v=s.players[target],amt=Math.min(2,v.profit);v.profit-=amt;p.profit+=amt;s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);
  log(s,p.name+' bought out '+amt+' profit from '+v.name+'.');
 }else p.played.push(k);
 Object.entries(c.g).forEach(([r,n])=>p.pool[r]+=n);
 if(c.buys)p.buys+=c.buys;
 if(c.dbl)p.dbl=true;
 if(c.draw)draw(s,p,c.draw);
 if(c.vp){p.profit+=c.vp;log(s,p.name+' played '+c.n+' for +'+c.vp+' profit.')}
 if(k==='buyout'||c.vp)checkTarget(s);
 return true;
}
function playResources(s){if(!live(s))return false;const p=me(s);let i;while((i=p.hand.findIndex(k=>CARDS[k].cat==='res'))>=0)play(s,i);return true}
function canComplete(s,c){if(!live(s)||!c||s.boss)return false;const p=me(s);return Object.entries(c.req).every(([r,n])=>p.pool[r]>=n)&&p.pool.cargo>=need(c)}
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
/* ---- pirate threats ---- */
function threatRounds(s){if(!s.threats)return [];const n=s.winMode==='rounds'?s.maxRounds:16;const a=Math.max(5,Math.round(n*.3));return [a,Math.max(a+3,Math.round(n*.7))].filter(r=>r<n)}
function nextThreat(s){return threatRounds(s).find(r=>r>s.round)||null}
function spawn(s){if(s.boss||!threatRounds(s).includes(s.round))return false;
 const order=s.bossOrder||BOSS_KEYS,key=order[s.bossNo%order.length],b=BOSSES[key],n=s.players.length;
 const hp=Math.max(n,Math.round(STAGE_HP[Math.min(s.bossNo,STAGE_HP.length-1)]*b.hp*n));s.bossNo++;
 s.boss={key,name:b.name,trait:b.trait,hp,max:hp,merc:b.merc||MERC,raid:b.raid||RAID,bounty:b.bounty||1,regen:(b.regen||0)*n,
  arrived:s.round,until:s.round+(b.rounds||BOSS_ROUNDS)-1,dmg:s.players.map(()=>0),no:s.bossNo};
 log(s,b.name+' blockades the trade lanes! No contracts until it is defeated.');return true}
function hit(s,n){const p=me(s),b=s.boss,d=Math.min(n,b.hp);b.hp-=d;b.dmg[s.current]+=d;p.bossDmg=(p.bossDmg||0)+d;
 if(b.hp<=0){const bounty=b.bounty||1,reward=b.dmg.map((d,i)=>d*bounty+(i===s.current?FINAL_BLOW:0));s.players.forEach((t,i)=>{t.profit+=reward[i]});
  s.bossDone.push({name:b.name,key:b.key,bounty:b.bounty||1,no:b.no,won:true,round:s.round,max:b.max,dmg:b.dmg.slice(),final:s.current,change:reward,profit:s.players.map(t=>t.profit),seen:bots(s)});
  log(s,p.name+' landed the final blow on '+b.name+' (+'+FINAL_BLOW+'). Captains earn +'+(b.bounty||1)+' profit per damage dealt. Contracts are open again.');
  s.boss=null;s.players.forEach((t,i)=>{if(b.dmg[i]){s.current=i;checkTarget(s)}});s.current=s.players.indexOf(p)}
 return d}
const bots=s=>s.players.map((t,i)=>t.bot?i:-1).filter(i=>i>=0);
// boss results a human captain has not confirmed yet
function unseen(s,i){return (s.bossDone||[]).findIndex(r=>r.seen&&!r.seen.includes(i))}
function confirmBoss(s,k,i){const r=(s.bossDone||[])[k];if(!r||!r.seen||r.seen.includes(i))return false;r.seen.push(i);return true}
function attack(s){const p=me(s);if(!live(s)||!s.boss||p.pool.combat<1)return false;
 const c=p.pool.combat;p.pool.combat=0;const d=hit(s,c*(p.dbl?2:1));log(s,p.name+' hit the pirates for '+d+' damage.');return true}
const mercCost=s=>s.boss?(s.boss.merc||MERC):MERC;
function mercs(s){const p=me(s);if(!live(s)||!s.boss||p.pool.cr<mercCost(s))return false;
 p.pool.cr-=mercCost(s);hit(s,1);log(s,p.name+' hired mercenaries for 1 damage.');return true}
function raid(s){const b=s.boss,amt=b.raid||RAID,lost=s.players.map(t=>-Math.min(amt,t.profit));s.players.forEach((t,i)=>{t.profit+=lost[i]});
 s.bossDone.push({name:b.name,key:b.key,raid:amt,no:b.no,won:false,round:s.round,max:b.max,hp:b.hp,dmg:b.dmg.slice(),change:lost,profit:s.players.map(t=>t.profit),seen:bots(s)});
 log(s,b.name+' raided every captain for '+amt+' profit and left the lanes.');s.boss=null}
function cashIn(s){const p=me(s);if(!live(s)||p.pool.cr<CASH)return false;
 p.pool.cr-=CASH;p.profit++;log(s,p.name+' cashed in '+CASH+' credits for +1 profit.');checkTarget(s);return true}
function scrap(s,i){const p=me(s);if(!live(s)||p.scrapped||p.pool.cr<1||!Number.isInteger(i)||i<0||i>=p.hand.length)return false;
 p.pool.cr--;const k=p.hand.splice(i,1)[0];s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);p.scrapped=true;log(s,p.name+' scrapped '+CARDS[k].n+'.');return true}
function end(s){
 if(!live(s))return false;
 const p=me(s);
 p.discard.push(...p.hand,...p.played);p.hand=[];p.played=[];p.pool=fresh();
 p.buys=1;p.actions=s.actionLimit;p.patrolled=false;p.scrapped=false;p.dbl=false;p.turnPlayed=[];draw(s,p,5);
 s.current++;
 if(s.current>=s.players.length){
  s.current=0;
  if(s.winMode==='rounds'?s.round>=s.maxRounds:s.finalRound===s.round){s.over=true;s.phase='over';log(s,'The run is over. Highest profit wins.');return true}
  if(s.boss&&s.round>=s.boss.until)raid(s);
  else if(s.boss&&s.boss.regen&&s.boss.hp<s.boss.max){const r=Math.min(s.boss.regen,s.boss.max-s.boss.hp);s.boss.hp+=r;log(s,s.boss.name+' repaired '+r+' hull.')}
  s.round++;
  spawn(s);
 }
 s.phase='handoff';return true;
}
function migrate(s){(s.bossDone||[]).forEach(r=>{if(!r.seen)r.seen=s.players.map((t,i)=>i)});if(!s.bossOrder)s.bossOrder=BOSS_KEYS.slice();if(s.boss&&!s.boss.key){s.boss.key='dread';s.boss.merc=MERC;s.boss.raid=RAID;s.boss.bounty=1;s.boss.regen=0}if(s.threats===undefined){s.threats=false;s.bossNo=0;s.boss=null;s.bossDone=[]}MARKET.forEach(k=>{if(!(k in s.market))s.market[k]=Math.max(10,4+2*s.players.length)});s.players.forEach(p=>{p.scrappedCards=p.scrappedCards||[]});return s}
const W={deal:7,house:8,quarter:6,pack:5,borer:4,barge:3.5,vault:4,gunship:3.5,probe:4,deck:4.5,broker:2,wing:4,buyout:2.5,charter:6,salvage:3.5,weapons:3.5};
function playAll(s){
 if(!live(s))return false;
 const p=me(s);let si;
 while((si=p.hand.indexOf('salvage'))>=0&&canPlay(s,si)){const t=['scrip','drum','sample'].map(k=>p.hand.indexOf(k)).find(x=>x>=0);play(s,si,t===undefined?-1:t)}
 playResources(s);let g=0;
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
  const war=s.boss||(nextThreat(s)&&nextThreat(s)-s.round<=2),cb=k=>war&&CARDS[k].g.combat?2:1;
  const v=k=>W[k]*cb(k)/(o[k]+1)+rnd(s)*.25;
  ch.sort((a,b)=>v(b)-v(a));buy(s,ch[0]);
 }
 if(s.boss){attack(s);while(s.boss&&mercs(s));}
 if(!s.boss)patrol(s);while(cashIn(s));end(s);return true;
}
return {RES,RLABEL,CARDS,MARKET,TEMPLATES,create,me,live,begin,canPlay,play,playResources,playAll,canComplete,complete,buy,patrol,cashIn,CASH,scrap,end,botTurn,deckSize,need,migrate,attack,mercs,mercCost,BOSSES,BOSS_KEYS,unseen,confirmBoss,threatRounds,nextThreat,MERC,RAID,FINAL_BLOW,BOSS_ROUNDS};
})();
if(typeof module!=='undefined')module.exports=Engine;

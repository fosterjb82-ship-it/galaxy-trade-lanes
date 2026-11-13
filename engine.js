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
 buyout:{n:'Buyout',cat:'act',kind:'Tactics',g:{},draw:1,cost:6,t:'Take up to 2 favor from another captain. Draw 1 card. Scrap this card.'},
 weapons:{n:'Weapons Officer',cat:'act',kind:'Crew',g:{combat:2},draw:1,dbl:1,cost:5,t:'Gain 2 combat and draw 1 card. This turn, combat you spend on a pirate boss deals double damage.'},
 salvage:{n:'Salvage Crew',cat:'act',kind:'Crew',g:{},draw:2,junk:1,cost:5,t:'Scrap 1 other card from your hand for free, then draw 2 cards.'},
 charter:{n:'Trade Charter',cat:'res',kind:'Economy',g:{cr:2},vp:2,cost:8,t:'Gain 2 credits and 2 favor.'}
};
const CASH=4; // credits per 1 profit when cashing in
const MERC=2; // credits per 1 boss damage when hiring mercenaries
// pirate bosses: one is drawn at random for each threat (no repeats in a run). hp = stage base (3, then 4) x mult x captains
const BOSSES={
 dread:{name:'Blackwake Dreadnought',hp:1,trait:'No tricks. A straight fight.'},
 maw:{name:'Red Maw Marauder',hp:1,raid:8,trait:'Ruthless: if it survives, its raid takes 8 favor instead of 5.'},
 armada:{name:'Iron Corsair Armada',hp:1,merc:3,trait:'Armored: mercenaries cost 3 credits per damage instead of 2.'},
 wraith:{name:'Void Wraith',hp:.62,rounds:2,trait:'Fast: only 2 rounds to beat it, but its hull is thin.'},
 hive:{name:'Scrap Hive Swarm',hp:.75,regen:1,trait:'Regenerates: repairs 1 hull per captain at the end of every round.'},
 siren:{name:'Siren of Lumen Gate',hp:1.15,bounty:2,trait:'Rich prize: +2 favor per damage dealt, but a tougher hull.'}
};
// captain ships: picked per captain, unique per run (faction strengths and weaknesses can be added to these entries later)
const SHIPS=[
 {id:'hauler',name:'Longhaul Freighter'},{id:'courier',name:'Starling Courier'},{id:'corvette',name:'Red Talon Corvette'},{id:'explorer',name:'Wayfarer Explorer'},
 {id:'miner',name:'Rockjaw Miner'},{id:'clipper',name:'Solar Clipper'},{id:'tug',name:'Ironclad Tug'},{id:'cruiser',name:'Aurora Cruiser'}];
const SHIP_IDS=SHIPS.map(x=>x.id);
// keep chosen ships if valid and unique; give everyone else the first free ones, in order
function assignShips(players){const used=new Set();players.forEach(p=>{if(SHIP_IDS.includes(p.ship)&&!used.has(p.ship))used.add(p.ship);else p.ship=null});
 players.forEach(p=>{if(!p.ship){p.ship=SHIP_IDS.find(id=>!used.has(id))||SHIP_IDS[0];used.add(p.ship)}});return players}
const BOSS_KEYS=Object.keys(BOSSES),STAGE_HP=[2.4,5.2,6.2];
const BOSS_EVERY=5,PATROL_DELAY=1,MAX_DELAY=2; // a boss every 5 rounds; each pirate patrol pushes the next one back 1 round, at most 2 rounds per boss
const BOSS_ROUNDS=3,RAID=5,FINAL_BLOW=5;
const MARKET=['deal','house','pack','borer','vault','quarter','barge','gunship','probe','broker','deck','wing','buyout','salvage','weapons','charter'];
// Standard market: these 8 core cards every game, plus 4 random specialists (at least one costing 5+ and one extra combat card). 'full' offers all 16.
const CORE=['deal','house','pack','borer','vault','gunship','barge','quarter'],SPECIALISTS=MARKET.filter(k=>!CORE.includes(k)),SPECIAL_COUNT=4;
function pickSpecialists(s){const pool=shuffle(s,SPECIALISTS.slice()),pick=pool.slice(0,SPECIAL_COUNT);
 // guarantees: one card costing 5+ (something to save for) and one extra combat card (bosses need combat)
 const ensure=(test,keep)=>{if(pick.some(test))return;const alt=pool.find(k=>!pick.includes(k)&&test(k));if(!alt)return;const i=pick.findIndex(k=>!keep(k));if(i>=0)pick[i]=alt};
 const big=k=>CARDS[k].cost>=5,fight=k=>!!CARDS[k].g.combat;
 ensure(big,()=>false);ensure(fight,big);if(!pick.some(big))ensure(big,fight);return pick}
const offered=s=>s.offer||MARKET;
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
const live=s=>s.phase==='action'&&!s.over&&!s.undoReq;
/* ---------- taking back card plays ----------
   Each card play by a human captain stores a snapshot of the game before it, so it can be taken back
   one step at a time during that turn. Only card plays can be taken back: buying, delivering, patrols,
   cashing in, scrapping, boss attacks and ending the turn clear the history. A play that drew cards
   also clears it, since the drawn cards are now known. With other human captains in the game, every
   one of them must agree first (undoReq); against computer captains only, it happens at once. */
const UNDO_KEEP=['undo','undoReq','undoStop','log','events','evn','feedFrom','cpuSpeed','warned','tutorial'];
let batching=false;
function snapState(s){const o={};for(const k in s)if(!UNDO_KEEP.includes(k))o[k]=s[k];return JSON.stringify(o)}
function clearUndo(s,stop){s.undo=[];s.undoReq=null;s.undoStop=stop||null}
function undoLabel(what){const ks=Array.isArray(what)?what:[what];if(ks.length===1)return CARDS[ks[0]].n;const n={};ks.forEach(k=>n[CARDS[k].n]=(n[CARDS[k].n]||0)+1);return ks.length+' cards ('+Object.entries(n).map(([x,c])=>c>1?c+' '+x:x).join(', ')+')'}
function undoVoters(s){return s.players.map((p,i)=>i).filter(i=>i!==s.current&&!s.players[i].bot)}
function canUndo(s){return s.phase==='action'&&!s.over&&!s.undoReq&&!!(s.undo&&s.undo.length)}
function stepBack(s){const e=s.undo.pop(),keep={};UNDO_KEEP.forEach(k=>{if(k in s)keep[k]=s[k]});
 Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,JSON.parse(e.snap),keep);s.undoReq=null;s.undoStop=null;
 log(s,me(s).name+' took back '+undoLabel(e.what)+'.');ev(s,{t:'undo',ks:e.what});return true}
function requestUndo(s){if(!canUndo(s))return false;const v=undoVoters(s);if(!v.length)return stepBack(s);
 const top=s.undo[s.undo.length-1];s.undoReq={by:s.current,what:top.what,need:v,yes:[]};log(s,me(s).name+' asked to take back '+undoLabel(top.what)+'.');return true}
function voteUndo(s,seat,yes){const r=s.undoReq;if(!r||!r.need.includes(seat)||r.yes.includes(seat))return false;
 if(!yes){s.undoReq=null;log(s,s.players[seat].name+' said no to taking back '+undoLabel(r.what)+'.');return true}
 r.yes.push(seat);if(r.yes.length===r.need.length){s.undoReq=null;stepBack(s)}return true}
function cancelUndo(s){if(!s.undoReq)return false;s.undoReq=null;return true}
function record(s,before,keys,drew){if(drew)clearUndo(s,keys[keys.length-1]);else{(s.undo=s.undo||[]).push({what:keys,snap:before});s.undoStop=null}}
const need=c=>(c.req.ore||0)+(c.req.tech||0);
const deckSize=p=>p.deck.length+p.discard.length+p.hand.length+p.played.length;
function log(s,t){s.log.unshift('R'+s.round+' · '+t);if(s.log.length>50)s.log.length=50}
// structured record of every move, for the turn feed and animations (last 80 kept)
// where each captain's profit came from (for the victory screen)
function score(p,k,v){if(!v)return;p.score=p.score||{};p.score[k]=(p.score[k]||0)+v}
function ev(s,o){s.evn=(s.evn||0)+1;o.n=s.evn;o.who=s.current;o.r=s.round;(s.events=s.events||[]).push(o);if(s.events.length>80)s.events.shift()}
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
  threats:o.threats!==false,nextBoss:BOSS_EVERY,bossBase:BOSS_EVERY,bossNo:0,bossOrder:null,boss:null,bossDone:[],winMode:o.winMode||'rounds',maxRounds:o.rounds||16,target:o.target||80,finalRound:null,
  boardSize:o.boardSize||4,board:[],cdeck:[],cdisc:[],done:[],
  market:Object.fromEntries(MARKET.map(k=>[k,Math.max(10,4+2*((o.players||[]).length||3))])),trash:[],log:[],players:[]};
 const cfg=o.players||[{name:'Captain'},{name:'Nova',bot:true},{name:'Orion',bot:true}];
 cfg.forEach(c=>{
  const p={name:String(c.name||'Captain').slice(0,24),bot:!!c.bot,ship:c.ship||null,deck:[],hand:[],played:[],discard:[],pool:fresh(),
   buys:1,actions:s.actionLimit,patrolled:false,scrapped:false,profit:0,completed:0,turnPlayed:[],scrappedCards:[]};
  p.deck=shuffle(s,['scrip','scrip','scrip','scrip','drum','drum','drum','sample','sample','rig']);
  draw(s,p,5);s.players.push(p);
 });
 s.cdeck=shuffle(s,Array.from({length:48},(_,i)=>{const t=TEMPLATES[i%16];return {...t,req:{...t.req},id:i}}));
 const e=s.cdeck.findIndex(c=>c.name==='Seed Stock');
 s.board.push(s.cdeck.splice(e,1)[0]);
 while(s.board.length<s.boardSize)s.board.push(nextContract(s));
 assignShips(s.players);
 s.marketMode=o.market==='full'?'full':'standard';
 s.offer=o.offer||(s.marketMode==='full'?MARKET.slice():CORE.concat(pickSpecialists(s)));
 s.bossOrder=o.bosses||shuffle(s,BOSS_KEYS.slice());
 log(s,'The contract board is open.');
 return s;
}
function begin(s){if(s.over||s.phase!=='handoff')return false;s.phase='action';s.feedFrom=s.evn||0;log(s,me(s).name+' begins a turn.');return true}
function checkTarget(s){if(s.winMode==='profit'&&s.finalRound===null&&me(s).profit>=s.target){s.finalRound=s.round;log(s,'Favor target reached. Round '+s.round+' is the last round.')}}
function canPlay(s,i){const p=me(s);return live(s)&&Number.isInteger(i)&&i>=0&&i<p.hand.length&&(CARDS[p.hand[i]].cat==='res'||s.actionLimit===0||p.actions>0)}
function play(s,i,target){
 if(!canPlay(s,i))return false;
 const p=me(s),k=p.hand[i],c=CARDS[k];
 if(k==='buyout'&&(!Number.isInteger(target)||target===s.current||!s.players[target]))return false;
 const before=!p.bot&&!batching?snapState(s):null;
 let junk=null;
 if(c.junk&&Number.isInteger(target)&&target>=0&&target!==i&&target<p.hand.length)junk=target>i?target-1:target;
 p.hand.splice(i,1);
 if(junk!==null){const j=p.hand.splice(junk,1)[0];s.trash.push(j);(p.scrappedCards=p.scrappedCards||[]).push(j);log(s,p.name+' salvaged '+CARDS[j].n+' out of the deck.');ev(s,{t:'salvage',k:j})}
 (p.turnPlayed=p.turnPlayed||[]).push(k);
 if(c.cat==='act'&&s.actionLimit)p.actions--;
 if(k==='buyout'){
  const v=s.players[target],amt=Math.min(2,v.profit);v.profit-=amt;p.profit+=amt;score(p,'buyout',amt);score(v,'stolen',-amt);s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);
  log(s,p.name+' bought out '+amt+' favor from '+v.name+'.');ev(s,{t:'buyout',k,v:target,amt});
 }else{p.played.push(k);ev(s,{t:'play',k})}
 Object.entries(c.g).forEach(([r,n])=>p.pool[r]+=n);
 if(c.buys)p.buys+=c.buys;
 if(c.dbl)p.dbl=true;
 if(c.draw)draw(s,p,c.draw);
 if(c.vp){p.profit+=c.vp;score(p,'charter',c.vp);log(s,p.name+' played '+c.n+' for +'+c.vp+' favor.')}
 if(k==='buyout'||c.vp)checkTarget(s);
 if(before)record(s,before,[k],!!c.draw);
 return true;
}
function playResources(s){if(!live(s))return false;const p=me(s),before=p.bot?null:snapState(s),keys=[];let i,drew=false;
 batching=true;try{while((i=p.hand.findIndex(k=>CARDS[k].cat==='res'))>=0){const k=p.hand[i];if(!play(s,i))break;keys.push(k);if(CARDS[k].draw)drew=true}}finally{batching=false}
 if(before&&keys.length)record(s,before,keys,drew);return true}
function canComplete(s,c){if(!live(s)||!c||s.boss)return false;const p=me(s);return Object.entries(c.req).every(([r,n])=>p.pool[r]>=n)&&p.pool.cargo>=need(c)}
function complete(s,id){
 const c=s.board.find(x=>x&&x.id===id),p=me(s);
 if(!canComplete(s,c))return false;
 Object.entries(c.req).forEach(([r,n])=>p.pool[r]-=n);
 p.pool.cargo-=need(c);p.profit+=c.profit;p.completed++;score(p,'contracts',c.profit);
 s.done.push({...c,req:{...c.req},captain:p.name,player:s.current,round:s.round});
 const idx=s.board.indexOf(c);s.cdisc.push(c);s.board[idx]=null;s.board[idx]=nextContract(s);
 log(s,p.name+' delivered '+c.name+' for +'+c.profit+'.');ev(s,{t:'deliver',name:c.name,profit:c.profit,id:c.id});
 checkTarget(s);return true;
}
function buy(s,k){
 const p=me(s),c=CARDS[k];
 if(!live(s)||!offered(s).includes(k)||s.market[k]<=0||p.buys<1||p.pool.cr<c.cost)return false;
 p.pool.cr-=c.cost;p.buys--;p.discard.push(k);s.market[k]--;
 log(s,p.name+' bought '+c.n+'.');ev(s,{t:'buy',k});return true;
}
function patrol(s){const p=me(s);if(!live(s)||p.patrolled||p.pool.combat<3||p.pool.fuel<1)return false;
 p.pool.combat-=3;p.pool.fuel--;p.patrolled=true;p.profit+=5;score(p,'patrols',5);if(s.threats&&!s.boss&&s.nextBoss){const was=s.nextBoss;s.nextBoss=Math.min(bossBase(s)+MAX_DELAY,s.nextBoss+PATROL_DELAY);p.delayed=(p.delayed||0)+(s.nextBoss-was);if(s.nextBoss>was)log(s,p.name+"'s patrol pushed the next pirate boss back to round "+s.nextBoss+'.')}log(s,p.name+' cleared a pirate patrol for +5.');ev(s,{t:'patrol'});checkTarget(s);return true}
/* ---- pirate threats ---- */
const lastRound=s=>s.winMode==='rounds'?s.maxRounds:Infinity;
// round the next boss arrives (null while one is active, threats are off, or it would land after the run)
function nextThreat(s){if(!s.threats||s.boss||!s.nextBoss)return null;return s.nextBoss<lastRound(s)?s.nextBoss:null}
function bossLeft(s,b){s.nextBoss=s.bossBase=Math.max(b.arrived+BOSS_EVERY,s.round+2)}
// the round the next boss was due before any patrols pushed it back
const bossBase=s=>s.bossBase===undefined?s.nextBoss:s.bossBase;
// how many more rounds patrols can still push the next boss back
function delayLeft(s){return nextThreat(s)?Math.max(0,bossBase(s)+MAX_DELAY-s.nextBoss):0}
// rounds and captain turns left before the boss raids (counting the current captain's turn)
function bossClock(s){const b=s.boss;if(!b)return null;const n=s.players.length;return {rounds:b.until-s.round+1,turns:(b.until-s.round)*n+(n-s.current)}}
function spawn(s){if(!s.threats||s.boss||!s.nextBoss||s.round<s.nextBoss||s.round>=lastRound(s))return false;
 const order=s.bossOrder||BOSS_KEYS,key=order[s.bossNo%order.length],b=BOSSES[key],n=s.players.length;
 const hp=Math.max(n,Math.round(STAGE_HP[Math.min(s.bossNo,STAGE_HP.length-1)]*b.hp*n));s.bossNo++;
 s.boss={key,name:b.name,trait:b.trait,hp,max:hp,merc:b.merc||MERC,raid:b.raid||RAID,bounty:b.bounty||1,regen:(b.regen||0)*n,
  arrived:s.round,until:s.round+(b.rounds||BOSS_ROUNDS)-1,dmg:s.players.map(()=>0),no:s.bossNo};
 log(s,b.name+' blockades the trade lanes! No contracts until it is defeated.');return true}
function hit(s,n){const p=me(s),b=s.boss,d=Math.min(n,b.hp);b.hp-=d;b.dmg[s.current]+=d;p.bossDmg=(p.bossDmg||0)+d;
 if(b.hp<=0){const bounty=b.bounty||1,reward=b.dmg.map((d,i)=>d*bounty+(i===s.current?FINAL_BLOW:0));s.players.forEach((t,i)=>{t.profit+=reward[i];score(t,'boss',reward[i])});
  s.bossDone.push({name:b.name,key:b.key,bounty:b.bounty||1,no:b.no,won:true,round:s.round,max:b.max,dmg:b.dmg.slice(),final:s.current,change:reward,profit:s.players.map(t=>t.profit),seen:bots(s)});
  ev(s,{t:'bossdown',boss:b.name});
  log(s,p.name+' landed the final blow on '+b.name+' (+'+FINAL_BLOW+'). Captains earn +'+(b.bounty||1)+' favor per damage dealt. Contracts are open again.');
  s.boss=null;bossLeft(s,b);s.players.forEach((t,i)=>{if(b.dmg[i]){s.current=i;checkTarget(s)}});s.current=s.players.indexOf(p)}
 return d}
const bots=s=>s.players.map((t,i)=>t.bot?i:-1).filter(i=>i>=0);
// boss results a human captain has not confirmed yet
function unseen(s,i){return (s.bossDone||[]).findIndex(r=>r.seen&&!r.seen.includes(i))}
function confirmBoss(s,k,i){const r=(s.bossDone||[])[k];if(!r||!r.seen||r.seen.includes(i))return false;r.seen.push(i);return true}
function attack(s){const p=me(s);if(!live(s)||!s.boss||p.pool.combat<1)return false;
 const c=p.pool.combat;p.pool.combat=0;const bn=s.boss.name,d=hit(s,c*(p.dbl?2:1));ev(s,{t:'hit',d,via:'combat',boss:bn,dbl:!!p.dbl});log(s,p.name+' hit the pirates for '+d+' damage.');return true}
const mercCost=s=>s.boss?(s.boss.merc||MERC):MERC;
function mercs(s){const p=me(s);if(!live(s)||!s.boss||p.pool.cr<mercCost(s))return false;
 p.pool.cr-=mercCost(s);const bn=s.boss.name;hit(s,1);ev(s,{t:'hit',d:1,via:'mercs',boss:bn});log(s,p.name+' hired mercenaries for 1 damage.');return true}
function raid(s){const b=s.boss,amt=b.raid||RAID,low=Math.min(...b.dmg),least=b.dmg.map(d=>d===low),lost=s.players.map((t,i)=>-Math.min(least[i]?amt*2:amt,t.profit));s.players.forEach((t,i)=>{t.profit+=lost[i];score(t,'raided',lost[i])});
 s.bossDone.push({name:b.name,key:b.key,raid:amt,least,no:b.no,won:false,round:s.round,max:b.max,hp:b.hp,dmg:b.dmg.slice(),change:lost,profit:s.players.map(t=>t.profit),seen:bots(s)});
 ev(s,{t:'raid',boss:b.name,amt});log(s,b.name+' raided every captain for '+amt+' favor ('+amt*2+' from the least helpful) and left the lanes.');s.boss=null;bossLeft(s,b)}
function cashIn(s){const p=me(s);if(!live(s)||p.pool.cr<CASH)return false;
 p.pool.cr-=CASH;p.profit++;score(p,'cash',1);ev(s,{t:'cash'});log(s,p.name+' cashed in '+CASH+' credits for +1 favor.');checkTarget(s);return true}
function scrap(s,i){const p=me(s);if(!live(s)||p.scrapped||p.pool.cr<1||!Number.isInteger(i)||i<0||i>=p.hand.length)return false;
 p.pool.cr--;const k=p.hand.splice(i,1)[0];s.trash.push(k);(p.scrappedCards=p.scrappedCards||[]).push(k);p.scrapped=true;log(s,p.name+' scrapped '+CARDS[k].n+'.');ev(s,{t:'scrap',k});return true}
function end(s){
 if(!live(s))return false;
 const p=me(s);clearUndo(s);
 p.discard.push(...p.hand,...p.played);p.hand=[];p.played=[];p.pool=fresh();
 p.buys=1;p.actions=s.actionLimit;p.patrolled=false;p.scrapped=false;p.dbl=false;p.turnPlayed=[];draw(s,p,5);
 s.current++;
 if(s.current>=s.players.length){
  s.current=0;
  if(s.winMode==='rounds'?s.round>=s.maxRounds:s.finalRound===s.round){s.over=true;s.phase='over';log(s,'The run is over. Highest favor wins.');return true}
  if(s.boss&&s.round>=s.boss.until)raid(s);
  else if(s.boss&&s.boss.regen&&s.boss.hp<s.boss.max){const r=Math.min(s.boss.regen,s.boss.max-s.boss.hp);s.boss.hp+=r;log(s,s.boss.name+' repaired '+r+' hull.')}
  s.round++;
  spawn(s);
 }
 s.phase='handoff';return true;
}
function migrate(s){if(!s.offer){s.offer=MARKET.slice();s.marketMode='full'}if(s.players.some(p=>!p.ship))assignShips(s.players);(s.bossDone||[]).forEach(r=>{if(!r.seen)r.seen=s.players.map((t,i)=>i)});if(!s.bossOrder)s.bossOrder=BOSS_KEYS.slice();if(s.threats&&s.nextBoss===undefined)s.nextBoss=s.boss?null:Math.max(s.round+1,BOSS_EVERY);if(s.boss&&!s.boss.key){s.boss.key='dread';s.boss.merc=MERC;s.boss.raid=RAID;s.boss.bounty=1;s.boss.regen=0}if(s.threats===undefined){s.threats=false;s.bossNo=0;s.boss=null;s.bossDone=[]}MARKET.forEach(k=>{if(!(k in s.market))s.market[k]=Math.max(10,4+2*s.players.length)});s.players.forEach(p=>{p.scrappedCards=p.scrappedCards||[]});return s}
const W={deal:7,house:8,quarter:6,pack:5,borer:4,barge:3.5,vault:4,gunship:3.5,probe:4,deck:4.5,broker:2,wing:4,buyout:2.5,charter:6,salvage:3.5,weapons:3.5};
function* playAllSteps(s){
 if(!live(s))return;
 const p=me(s);let si,ri;
 while((si=p.hand.indexOf('salvage'))>=0&&canPlay(s,si)){const t=['scrip','drum','sample'].map(k=>p.hand.indexOf(k)).find(x=>x>=0);play(s,si,t===undefined?-1:t);yield}
 while((ri=p.hand.findIndex(k=>CARDS[k].cat==='res'))>=0){play(s,ri);yield}
 let g=0;
 while(g++<150){
  const cand=p.hand.map((k,i)=>({k,i})).filter(x=>canPlay(s,x.i));
  if(!cand.length)break;
  const val=x=>{const c=CARDS[x.k];if(c.draw)return 10+c.draw;
   const pool={...p.pool};Object.entries(c.g).forEach(([r,n])=>pool[r]+=n);
   const opens=s.board.some(b=>Object.entries(b.req).every(([r,n])=>pool[r]>=n)&&pool.cargo>=need(b));
   return opens?9:x.k==='deck'?7:x.k==='broker'?6:x.k==='gunship'?5:3};
  cand.sort((a,b)=>val(b)-val(a));
  const foe=s.players.map((t,i)=>({i,pr:t.profit})).filter(t=>t.i!==s.current).sort((a,b)=>b.pr-a.pr)[0];
  play(s,cand[0].i,foe&&foe.i);yield;
  while((ri=p.hand.findIndex(k=>CARDS[k].cat==='res'))>=0){play(s,ri);yield}
 }
}
function playAll(s){if(!live(s))return false;for(const _ of playAllSteps(s));return true}
// one computer captain's turn, one move per step (botTurn runs it all at once)
function* botSteps(s){
 if(s.over||!me(s).bot)return;
 if(s.phase==='handoff'){begin(s);yield}
 const p=me(s);yield* playAllSteps(s);
 for(let n=0;n<10;n++){const ch=s.board.filter(c=>canComplete(s,c)).sort((a,b)=>b.profit-a.profit);if(!ch.length)break;complete(s,ch[0].id);yield}
 const owned=()=>{const a=[...p.deck,...p.discard,...p.hand,...p.played];return Object.fromEntries(MARKET.map(k=>[k,a.filter(t=>t===k).length]))};
 while(p.buys>0){
  const o=owned(),ch=offered(s).filter(k=>s.market[k]>0&&CARDS[k].cost<=p.pool.cr);
  if(!ch.length)break;
  const war=s.boss||(nextThreat(s)&&nextThreat(s)-s.round<=2),cb=k=>war&&CARDS[k].g.combat?2:1;
  const v=k=>W[k]*cb(k)/(o[k]+1)+rnd(s)*.25;
  ch.sort((a,b)=>v(b)-v(a));buy(s,ch[0]);yield;
 }
 if(s.boss){if(attack(s))yield;while(s.boss&&mercs(s))yield;}
 if(!s.boss&&patrol(s))yield;
 while(cashIn(s))yield;
 end(s);
}
function botTurn(s){if(s.over||!me(s).bot)return false;for(const _ of botSteps(s));return true}
const commit=f=>function(s,...a){const r=f(s,...a);if(r)clearUndo(s);return r};
return {canUndo,requestUndo,voteUndo,cancelUndo,undoLabel,undoVoters,
 begin:commit(begin),buy:commit(buy),complete:commit(complete),patrol:commit(patrol),cashIn:commit(cashIn),scrap:commit(scrap),attack:commit(attack),mercs:commit(mercs),
 RES,RLABEL,CARDS,MARKET,CORE,SPECIALISTS,offered,TEMPLATES,create,me,live,canPlay,play,playResources,playAll,canComplete,CASH,end,botTurn,botSteps,deckSize,need,migrate,delayLeft,SHIPS,SHIP_IDS,assignShips,MAX_DELAY,mercCost,BOSSES,BOSS_KEYS,bossClock,BOSS_EVERY,PATROL_DELAY,unseen,confirmBoss,nextThreat,MERC,RAID,FINAL_BLOW,BOSS_ROUNDS};
})();
if(typeof module!=='undefined')module.exports=Engine;

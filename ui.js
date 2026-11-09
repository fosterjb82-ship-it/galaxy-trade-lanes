const E=Engine,SP=Sprites,$=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let s=null,screen='setup',scrollPos=0,handX=0;
// online play: ME is this browser's seat (null = one shared device, the usual mode)
let ME=null;
const myTurn=()=>!!s&&s.phase==='action'&&!s.over&&(ME===null?!s.players[s.current].bot&&!(typeof playingBack==='function'&&playingBack()):s.current===ME);
const viewer=()=>ME===null?s.current:ME;
const cfg={humans:1,bots:2,threats:1,cpuSpeed:'normal',winMode:'rounds',rounds:16,actionLimit:2,target:80,boardSize:4,ships:['hauler','courier','corvette','explorer','miner','clipper'],names:['Captain 1','Captain 2','Captain 3','Captain 4','Captain 5','Captain 6']};
const BOTS=['Nova Syndicate','Orion Freight','Vesta Lines','Kestrel Haulage','Pallas Combine'];
const MUS='lanehaul-music-v1';
const SCALE=1.5,AW=Math.round(88*SCALE),AH=Math.round(52*SCALE);
const SAVE='lanehaul-run-v2',REC='lanehaul-records-v1';
function save(){try{localStorage.setItem(SAVE,JSON.stringify(s))}catch(e){}}
function records(){try{return JSON.parse(localStorage.getItem(REC)||'[]')}catch(e){return []}}
function record(){const a=records();
 s.players.forEach((p,i)=>{if(p.bot||a.some(r=>r.id===s.id+':'+i))return;
  a.push({id:s.id+':'+i,name:p.name,profit:p.profit,done:p.completed,round:s.round,mode:s.winMode,limit:s.actionLimit,rank:1+s.players.filter(t=>t.profit>p.profit).length})});
 try{localStorage.setItem(REC,JSON.stringify(a.sort((x,y)=>y.profit-x.profit).slice(0,30)))}catch(e){}}

const px=(url,w,h,cls)=>'<img class="px'+(cls?' '+cls:'')+'" src="'+url+'" width="'+w+'" height="'+h+'" alt="">';
const icon=(k,m=2)=>px(SP.iconURL(k),10*m,10*m,'ic');
const SHORT={fuel:'fuel',ore:'ore',tech:'tech',cr:'cr',combat:'cbt',cargo:'hold'};

function hide(){$('overlay').hidden=true;$('app').inert=false}
function modal(h,wide){$('dialog').className='dialog notch'+(wide?' wide':'');$('dialog').innerHTML=h;$('overlay').hidden=false;$('app').inert=true;$('dialog').focus({preventScroll:true})}
function notify(t){const x=document.createElement('div');x.className='toast';x.setAttribute('role','status');x.textContent=t;document.body.append(x);setTimeout(()=>x.remove(),2600)}

/* ---------- setup ---------- */
function collect(){document.querySelectorAll('[data-name]').forEach(el=>{cfg.names[Number(el.dataset.name)]=el.value})}
function field(id,title,opts){return '<div><label for="'+id+'">'+title+'</label><select id="'+id+'">'+opts.map(([v,l])=>'<option value="'+v+'"'+(String(cfg[id])===String(v)?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'}
function renderSetup(){
 screen='setup';hide();$('status').innerHTML='';const n=cfg.humans;
 $('stage').innerHTML='<section class="setup"><div><div class="eyebrow">A deck-building freight race for 2 to 6 captains</div><h1>Build the deck.<br><span>Win the manifest.</span></h1><p class="mute" style="max-width:520px">Buy cards, load your hold and race rival captains to the same public contracts. Profit is the score. Credits vanish when your turn ends.</p>'
 +'<div class="fields">'
 +field('humans','Human captains',[1,2,3,4,5,6].map(v=>[v,v===1?'1 (solo)':v+' (pass-and-play)']))
 +field('bots','Computer captains',Array.from({length:6-cfg.humans+1},(_,v)=>v).filter(v=>v+cfg.humans>=2).map(v=>[v,v===0?'None':v+' computer'+(v>1?'s':'')]))
 +field('actionLimit','Orders per turn',[[2,'Two orders (recommended)'],[0,'Unlimited']])
 +field('winMode','Victory',[['rounds','Highest profit after set rounds'],['profit','Race to a profit target']])
 +(cfg.winMode==='rounds'?field('rounds','Run length',[[10,'10 rounds'],[12,'12 rounds'],[16,'16 rounds (recommended)'],[20,'20 rounds']]):field('target','Profit target',[[50,'50 profit'],[80,'80 profit'],[120,'120 profit']]))
 +field('boardSize','Contract board',[[3,'3 contracts'],[4,'4 contracts'],[5,'5 contracts']])
 +field('threats','Pirate threats',[[1,'On: boss battles (recommended)'],[0,'Off']])
 +(cfg.bots?field('cpuSpeed','Computer turns',[['normal','Watch at normal speed'],['slow','Watch slowly'],['fast','Watch quickly'],['instant','Instant']]):'')
 +'</div><div class="capfields">'+Array.from({length:n},(_,i)=>'<div class="capf"><label for="nm'+i+'">Captain '+(i+1)+'</label><input id="nm'+i+'" data-name="'+i+'" maxlength="24" value="'+esc(cfg.names[i])+'">'+shipPicker(i,n)+'</div>').join('')+'</div>'
 +'<div class="btns" style="margin-top:4px"><button class="primary" data-a="start">Launch run</button><button data-a="tutorial">Tutorial</button><button data-a="rules">How to play</button></div></div>'
 +'<div class="heroart">'+px(SP.heroURL(),576,256)+'<div class="feat"><div><b>BUILD</b> Bought cards land in your discard pile and arrive in later hands.</div><div><b>LOAD</b> Cargo space is per turn, so play Hold Rigs and Barges before you deliver.</div><div><b>CLAIM</b> The board is shared. First captain to pay a contract takes the profit.</div></div></div></section>';
}
function start(){collect();scrollPos=0;handX=0;
 const players=Array.from({length:cfg.humans},(_,i)=>({name:(cfg.names[i]||'').trim()||'Captain '+(i+1),ship:cfg.ships[i]}));
 for(let i=0;i<cfg.bots;i++)players.push({name:BOTS[i],bot:true});
 stopPlayback();vicSeat=null;s=E.create({...cfg,threats:cfg.threats!==0,mode:cfg.humans>1?'local':'solo',players});s.cpuSpeed=cfg.cpuSpeed;seenBoss=0;screen='game';settle();
}
const SPEEDS={slow:1100,normal:620,fast:260,instant:0},SPEED_NAMES={slow:'Slow',normal:'Normal',fast:'Fast',instant:'Instant'};
let playTimer=null,playGen=null;
const cpuDelay=()=>{const v=SPEEDS[(s&&s.cpuSpeed)||'normal'];return v===undefined?620:v};
const playingBack=()=>playTimer!==null;
function stopPlayback(){if(playTimer)clearTimeout(playTimer);playTimer=null;playGen=null}
function finishSettle(){if(s.over)record();save();render();phase()}
function settle(){
 if(playingBack())return;
 if(!s.over&&E.me(s).bot&&cpuDelay()>0){save();hide();playTimer=setTimeout(botStep,300);return}
 let g=0;while(!s.over&&E.me(s).bot&&g++<s.players.length)E.botTurn(s);finishSettle()}
// one computer move per tick, so everyone can follow it
function botStep(){
 if(screen!=='game'||!s){stopPlayback();return}
 if(!playGen){if(s.over||!E.me(s).bot){stopPlayback();finishSettle();return}playGen=E.botSteps(s)}
 const r=playGen.next();render();
 if(r.done){playGen=null;save();playTimer=setTimeout(botStep,Math.max(200,cpuDelay()*.9))}else playTimer=setTimeout(botStep,cpuDelay())}
function skipPlayback(){if(!playingBack())return;clearTimeout(playTimer);playTimer=null;if(playGen){for(const _ of playGen);playGen=null}
 let g=0;while(!s.over&&E.me(s).bot&&g++<s.players.length)E.botTurn(s);finishSettle()}
function cycleSpeed(){const order=['slow','normal','fast','instant'],cur=(s&&s.cpuSpeed)||'normal';s.cpuSpeed=cfg.cpuSpeed=order[(order.indexOf(cur)+1)%order.length];if(s.cpuSpeed==='instant')skipPlayback();else render()}
function act(fn,snd){if(!s||screen!=='game')return;if(fn()===false){notify('Not enough resources, cargo, credits, orders or deals for that.');return}if(snd)Music.sfx(snd);settle()}

/* ---------- game view ---------- */
const tok=(r,n,met)=>'<span class="tok '+(met?'met':'miss')+'" style="--rc:var(--c-'+r+')" title="'+E.RLABEL[r]+'">'+icon(r,1.6)+n+'</span>';
function ctrCard(c){const p=E.me(s),ready=myTurn()&&E.canComplete(s,c),nd=E.need(c);
 return '<article class="pc ctr notch'+(ready?' ready':'')+'" data-cid="'+c.id+'"><div class="art">'+px(SP.sceneURL(c.dest,c.id),AW,AH)+'<span class="badge profit">'+icon('star',1.6)+'+'+c.profit+'</span>'+(ready?'<div class="go">READY TO DELIVER</div>':'')+(s.boss?'<div class="go blk">BLOCKADED</div>':'')+'</div>'
 +'<div class="pb"><h3>'+esc(c.name)+'</h3><div class="dest">To '+esc(c.dest)+' · '+(c.req.combat?'Armed':'Freight')+'</div>'
 +'<div class="reqs">'+Object.entries(c.req).map(([r,n])=>tok(r,n,p.pool[r]>=n)).join('')+(nd?tok('cargo',nd,p.pool.cargo>=nd):'')+'</div>'
 +'<button class="'+(ready?'primary':'')+'" data-a="complete" data-id="'+c.id+'"'+(ready?'':' disabled')+'>'+(s.boss?'Blockaded':'Deliver')+'</button></div></article>'}
function bossPanel(compact){const b=s.boss,p=E.me(s),on=myTurn();
 if(!b){const n=E.nextThreat(s);if(!n||s.over)return '';const k=n-s.round;
  return '<div class="threat'+(k<=1?' soon':'')+'">'+icon('combat',1.6)+'<span class="tcount"><b>'+k+'</b>round'+(k===1?'':'s')+'</span><span>'+(k<=1?'<b>Pirate boss next round!</b> ':'Next pirate boss in round '+n+'. ')+'It blocks all contracts. '+(E.delayLeft(s)?'A pirate patrol can push it back 1 round ('+E.delayLeft(s)+' more possible).':'Patrols cannot delay it any further.')+'</span></div>'}
 const clk=E.bossClock(s),left=clk.rounds,total=b.until-b.arrived+1,dmgN=p.pool.combat*(p.dbl?2:1),pct=Math.round(b.hp/b.max*100);
 const clock='<div class="bclock'+(left<=1?' last':'')+'" title="Raids at the end of round '+b.until+'"><span class="pips">'+Array.from({length:total},(_,i)=>'<i'+(i<left?' class="on"':'')+'></i>').join('')+'</span><b>'+left+'</b> round'+(left===1?'':'s')+' left · '+clk.turns+' captain turn'+(clk.turns===1?'':'s')+(left<=1?' · <em>last round!</em>':'')+'</div>';
 const btns='<div class="bbtns"><button class="primary" data-a="attack"'+(on&&p.pool.combat>0?'':' disabled')+'>Attack · '+dmgN+' damage'+(p.dbl&&p.pool.combat?' (×2)':'')+'</button><button data-a="mercs"'+(on&&p.pool.cr>=b.merc?'':' disabled')+'>Hire mercenaries · '+b.merc+' cr → 1</button></div>';
 const bar='<div class="hp"><i style="width:'+pct+'%"></i><span>'+b.hp+' / '+b.max+' hull</span></div>';
 if(compact)return '<section class="boss compact notch"><div class="bhead"><b>'+esc(b.name)+'</b></div>'+clock+bar+btns+'</section>';
 return '<section class="boss notch"><div class="bart">'+px(SP.bossURL(b.key||b.no),176,104)+'</div><div class="bbody"><div class="eyebrow">Pirate boss · blockading all contracts</div><h3>'+esc(b.name)+'</h3><div class="trait">'+esc(b.trait||'')+'</div>'+clock+bar
  +'<p class="mute">Team up: every captain spends combat or credits to damage it. Beaten: <b class="acc">+'+(b.bounty||1)+' profit per damage</b> you dealt, <b class="acc">+'+E.FINAL_BLOW+'</b> for the final blow. Not beaten by the end of round '+b.until+': it raids every captain for '+(b.raid||E.RAID)+' profit, and <b class="down">double ('+2*(b.raid||E.RAID)+')</b> from whoever dealt the least damage.</p>'
  +'<div class="bdmg">'+s.players.map((t,i)=>'<span'+(i===s.current?' class="cur"':'')+'>'+esc(t.name)+' <b>'+b.dmg[i]+'</b></span>').join('')+'</div>'+btns+'</div></section>'}
function cardEl(k,idx,market){const c=E.CARDS[k],p=E.me(s),on=myTurn();
 let h='<article class="pc '+c.cat+(k==='buyout'&&!market?' bo':'')+(market&&on&&p.buys>0&&s.market[k]>0&&p.pool.cr>=c.cost?' can':'')+' notch"'+(market?' data-mk="'+k+'"':' data-hand="'+idx+'"')+'><div class="art">'+px(SP.cardURL(k),AW,AH)
 +(market?'<span class="badge tl">'+icon('cr',1.6)+c.cost+'</span><span class="badge tr">×'+s.market[k]+'</span>':'')+'</div>'
 +'<div class="pb"><div class="kind">'+(c.cat==='res'?'Resource':'Order')+' · '+c.kind+'</div><h3>'+c.n+'</h3>'+(market?'<div class="fx">'+shortFx(k)+'</div>':'')+'<p>'+c.t+'</p>';
 if(market)h+='<button data-a="buy" data-key="'+k+'"'+(!on||p.buys<1||s.market[k]<1||p.pool.cr<c.cost?' disabled':'')+'>Buy · '+c.cost+' cr</button>';
 else{
  if(k==='salvage')h+='<select id="bt'+idx+'" aria-label="Card to scrap">'+p.hand.map((t,j)=>j!==idx?'<option value="'+j+'">Scrap '+E.CARDS[t].n+'</option>':'').join('')+'<option value="-1">Scrap nothing</option></select>';
  if(k==='buyout')h+='<select id="bt'+idx+'" aria-label="Buyout target">'+s.players.map((t,j)=>j!==s.current?'<option value="'+j+'">'+esc(t.name)+' · '+t.profit+'</option>':'').join('')+'</select>';
  h+='<button class="'+(c.cat==='act'?'primary':'')+'" data-a="play" data-id="'+idx+'"'+(on&&E.canPlay(s,idx)?'':' disabled')+'>'+(c.cat==='res'?'Play':'Give order')+'</button>'
  +'<button class="scr" data-a="scrap" data-id="'+idx+'"'+(!on||p.scrapped||p.pool.cr<1?' disabled':'')+'>Scrap · 1 cr</button>';
 }
 return h+'</div></article>';
}
const marketList=()=>[...E.MARKET].sort((a,b)=>E.CARDS[a].cost-E.CARDS[b].cost||(E.CARDS[a].cat==='res'?0:1)-(E.CARDS[b].cat==='res'?0:1)||E.CARDS[a].n.localeCompare(E.CARDS[b].n));
function moveTiles(p,on){const canP=on&&!p.patrolled&&p.pool.combat>=3&&p.pool.fuel>=1,n=Math.floor(p.pool.cr/E.CASH),canC=on&&n>0;
 const needP=p.patrolled?'Cleared this turn':canP?'Ready to launch':'Need '+Math.max(0,3-p.pool.combat)+' more combat'+(p.pool.fuel<1?' and 1 fuel':'');
 return '<section class="move patrol notch'+(canP?' ready':'')+(p.patrolled?' done':'')+'">'+px(SP.moveURL('patrol'),88,52)+'<div class="mv"><b>Pirate patrol</b><span class="mc">'+icon('combat',1.4)+'3 '+icon('fuel',1.4)+'1 → '+icon('star',1.4)+'+5</span><small>'+needP+' · once per turn'+(E.delayLeft(s)?' · delays the next boss 1 round':'')+'</small></div>'
  +'<button class="'+(canP?'primary':'')+'" data-a="patrol"'+(canP?'':' disabled')+'>'+(p.patrolled?'Patrol cleared':'Launch patrol')+'</button></section>'
  +'<section class="move cash notch'+(canC?' ready':'')+'">'+px(SP.moveURL('cash'),88,52)+'<div class="mv"><b>Cash in</b><span class="mc">'+icon('cr',1.4)+E.CASH+' → '+icon('star',1.4)+'+1</span><small>'+(canC?'You can cash in '+n+'× now':'Any time · as often as you like')+'</small></div>'
  +'<button class="'+(canC?'primary':'')+'" data-a="cash"'+(canC?'':' disabled')+'>Cash in '+E.CASH+' credits</button></section>'}
/* ---------- animations: cards dealt from your draw pile, contracts from the contract deck ---------- */
const calm=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
let animPrev=null;
function cdeckPile(){return '<span class="cdeck" title="Contract deck: '+s.cdeck.length+' left"><i></i><i></i><i></i><b>'+s.cdeck.length+'</b></span>'}
function animBefore(){const out={};document.querySelectorAll('.ctr[data-cid]').forEach(el=>{const r=rectZ(el);if(r.width)out[el.dataset.cid]={html:el.outerHTML,r}});return out}
const mid=el=>{if(!el)return null;const r=el.getBoundingClientRect(),z=zoomK();return r.width?{x:(r.left+r.width/2)/z,y:(r.top+r.height/2)/z}:null};
const rectZ=el=>{const r=el.getBoundingClientRect(),z=zoomK();return {left:r.left/z,top:r.top/z,width:r.width/z,height:r.height/z}};
function fly(el,from,delay,cls){const r=rectZ(el);if(!r.width||!from)return;const g=el.cloneNode(true);g.classList.add('flyer',cls);g.removeAttribute('data-hand');g.removeAttribute('data-cid');
 g.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;--dx:'+(from.x-r.left-r.width/2)+'px;--dy:'+(from.y-r.top-r.height/2)+'px;animation-delay:'+delay+'ms';
 el.style.visibility='hidden';document.body.append(g);setTimeout(()=>{el.style.visibility='';g.remove()},delay+720)}
function pop(el,text,cls,delay){if(calm())return;const r=rectZ(el);if(!r.width)return;const d=document.createElement('div');d.className='fxpop '+(cls||'');d.textContent=text;
 d.style.cssText='left:'+(r.left+r.width/2)+'px;top:'+(r.top)+'px;animation-delay:'+(delay||0)+'ms';document.body.append(d);setTimeout(()=>d.remove(),1500+(delay||0))}
function toss(el,to,delay){if(!to||calm())return;const r=rectZ(el),g=el.cloneNode(true);g.removeAttribute('data-mk');g.classList.remove('flash');g.classList.add('ghost','toss');
 g.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;--gx:'+(to.x-r.left-r.width/2)+'px;--gy:'+(to.y-r.top-r.height/2)+'px;animation-delay:'+delay+'ms';
 document.body.append(g);setTimeout(()=>g.remove(),1300+delay)}
function animAfter(snap){if(screen!=='game'||!s)return;
 const p=E.me(s),show=myTurn(),hand=show?p.hand.slice():null,board=s.board.map(c=>c&&c.id),key=s.id+':'+s.round+':'+s.current;
 const cur=E.me(s),tp=(cur.turnPlayed||[]).length,profits=s.players.map(x=>x.profit);
 const prev=animPrev;animPrev={id:s.id,key,hand,board,evn:s.evn||0,profits,tp};if(!prev||prev.id!==s.id)return;
 const evAll=(s.events||[]).filter(e=>e.n>(prev.evn||0)),burst=evAll.length>10||s.over,still=calm()||burst;
 // contracts that left the board, and the ones dealt in their place
 const gone=prev.board.filter(x=>!board.includes(x)),fresh=board.filter(x=>!prev.board.includes(x));
 const to=mid(document.querySelector('.plate .profit,.mprof')),deck=mid(document.querySelector('.cdeck'));
 gone.forEach((cid,i)=>{const o=snap[cid];if(!o||still)return;const g=document.createElement('div');g.className='ghostwrap';g.innerHTML=o.html;const c=g.firstChild;c.classList.add('ghost');
  c.style.cssText='left:'+o.r.left+'px;top:'+o.r.top+'px;width:'+o.r.width+'px;height:'+o.r.height+'px;--gx:'+(to?to.x-o.r.left-o.r.width/2:0)+'px;--gy:'+(to?to.y-o.r.top-o.r.height/2:-120)+'px;animation-delay:'+(i*120)+'ms';
  c.insertAdjacentHTML('beforeend','<div class="stamp">DELIVERED</div>');document.body.append(c);setTimeout(()=>c.remove(),1300+i*120)});
 if(!burst)fresh.forEach((cid,i)=>{const el=document.querySelector('.ctr[data-cid="'+cid+'"]');const d=(gone.length?420:0)+i*160;Music.sfx('deal',d/1000);if(el&&!still)fly(el,deck,d,'flip')});
 // ---------- 3: what the active captain just did ----------
 // a big batch (instant computer turns, end of a run) just updates the log: no queue of effects
 const evNew=burst?[]:evAll,gap=evNew.length>1?280:0;let last=0;
 evNew.forEach((e,i)=>{const d=i*gap;last=d;
  const li=document.querySelector('.feed li[data-ev="'+e.n+'"]');if(li&&!still){li.classList.add('new');li.style.animationDelay=d+'ms'}
  if(e.t==='buy'){const m=document.querySelector('.mgrid [data-mk="'+e.k+'"]');if(m&&!still){m.classList.add('flash');m.style.animationDelay=d+'ms';
    if(!myTurn())toss(m,mid(document.querySelector('.plate h2')),d)}}
  if(e.t==='hit'){const hp=document.querySelector('.boss .hp');if(hp){pop(hp,'−'+e.d+' '+(s.players[e.who]||{}).name,'down',d);const bx=hp.closest('.boss');if(bx&&!still){bx.classList.add('shake');bx.style.animationDelay=d+'ms'}}}
  if(e.t==='patrol'){const tile=document.querySelector('.move.patrol');if(tile&&!still){tile.classList.add('fired');tile.style.animationDelay=d+'ms'}}});
 // cards another captain lays on their table
 const watch=document.querySelector('.hband.watch');
 if(watch&&prev.key===key&&tp>(prev.tp||0)&&!still){const from=mid(watch.querySelector('.pc.back'))||mid(watch.querySelector('.whois'));
  for(let i=prev.tp||0;i<tp;i++){const el=watch.querySelector('[data-tp="'+i+'"]');if(el)fly(el,from,(i-(prev.tp||0))*(gap||0),'deal')}}
 // profit changes pop next to each captain
 if(!burst)s.players.forEach((x,i)=>{const dl=x.profit-((prev.profits||[])[i]??x.profit);if(!dl)return;const t=(dl>0?'+':'')+dl;
  const row=document.querySelector('.stand[data-seat="'+i+'"] strong');if(row)pop(row,t,dl>0?'up':'down',last);
  if(i===s.current){const pl=document.querySelector('.plate .profit b,.mprof b');if(pl)pop(pl,t,dl>0?'up':'down',last)}});
 // cards drawn into your hand
 if(!hand)return;let added=[];
 if(prev.key!==key||!prev.hand)added=hand.map((k,i)=>i);
 else{const left={};prev.hand.forEach(k=>left[k]=(left[k]||0)+1);hand.forEach((k,i)=>{if(left[k])left[k]--;else added.push(i)})}
 if(!added.length)return;
 const pile=mid(document.querySelector('.piles>div:first-child'))||mid(document.querySelector('.mtabs [data-t=hand]'))||{x:40,y:innerHeight-40};
 added.forEach((idx,i)=>{const el=document.querySelector('[data-hand="'+idx+'"]');Music.sfx('draw',i*.09);if(el&&!still)fly(el,pile,i*90,'deal')})}
function shortFx(k){const c=E.CARDS[k],o=[];if(k==='buyout')o.push('steal 2 profit');Object.entries(c.g).forEach(([r,n])=>o.push('+'+n+' '+SHORT[r]));
 if(c.draw)o.push('draw '+c.draw);if(c.buys)o.push('+'+c.buys+' deal');if(c.vp)o.push('+'+c.vp+' profit');if(c.junk)o.push('scrap 1');if(c.dbl)o.push('×2 boss dmg');return o.join(' · ')}
/* ---------- desktop: scale the 2560x1300 layout to any window (1080p, 2K, 4K) ---------- */
const DESK=!!document.querySelector('.top .sound');
const zoomK=()=>DESK?(parseFloat(document.body.style.zoom)||1):1;
function fitDesk(){if(!DESK)return;const W=innerWidth,H=innerHeight,k=Math.max(.6,Math.min(1.7,Math.min(W/2560,H/1300)));
 document.body.classList.add('desk');document.body.style.zoom=k;document.body.style.height=(H/k)+'px';document.body.style.overflow='hidden'}
if(DESK){addEventListener('resize',fitDesk);fitDesk()}
// market mini cards: full card text on hover
if(DESK){let pop=null;
 document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.mband.mini .pc[data-mk]');if(!el){if(pop&&!e.target.closest('.mpop')){pop.remove();pop=null}return}
  const k=el.dataset.mk,c=E.CARDS[k];if(pop&&pop.dataset.k===k)return;if(pop)pop.remove();
  pop=document.createElement('div');pop.className='mpop notch';pop.dataset.k=k;pop.innerHTML=px(SP.cardURL(k),264,156)+'<div class="kind">'+(c.cat==='res'?'Resource':'Order')+' · '+c.kind+'</div><b>'+c.n+'</b><p>'+c.t+'</p><small>'+icon('cr',1.6)+c.cost+' credits · '+s.market[k]+' left'+(c.cat==='act'?' · uses 1 order':' · free to play')+'</small>';
  document.body.append(pop);const z=zoomK(),r=el.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  pop.style.left=Math.max(8,Math.min(innerWidth/z-pw-8,(r.left+r.width/2)/z-pw/2))+'px';pop.style.top=Math.max(8,r.top/z-ph-10)+'px'});
 document.addEventListener('click',()=>{if(pop){pop.remove();pop=null}},true)}
const turnEvents=()=>(s.events||[]).filter(e=>e.n>(s.feedFrom||0)&&e.who===s.current&&e.r===s.round);
function feedLine(e){const c=e.k&&E.CARDS[e.k],nm=c?'<b>'+c.n+'</b>':'';
 switch(e.t){
  case 'play':return {i:'<img class="px" src="'+SP.cardURL(e.k)+'" width="36" height="21" alt="">',x:(c.cat==='act'?'Gave order ':'Played ')+nm+'<span class="gs">'+gains(e.k)+'</span>',cls:c.cat};
  case 'buyout':return {i:icon('combat',1.6),x:'Bought out <b>'+e.amt+'</b> profit from '+esc((s.players[e.v]||{}).name||'a rival'),cls:'act'};
  case 'salvage':return {i:icon('cargo',1.6),x:'Salvaged '+nm+' out of their deck',cls:'act'};
  case 'deliver':return {i:icon('star',1.6),x:'Delivered <b>'+esc(e.name)+'</b> <b class="acc">+'+e.profit+'</b>',cls:'big'};
  case 'buy':return {i:icon('cr',1.6),x:'Bought '+nm,cls:'buy'};
  case 'patrol':return {i:icon('combat',1.6),x:'Pirate patrol <b class="acc">+5</b>',cls:'big'};
  case 'cash':return {i:icon('cr',1.6),x:'Cashed in '+E.CASH+' credits <b class="acc">+1</b>',cls:''};
  case 'scrap':return {i:icon('cr',1.6),x:'Scrapped '+nm,cls:''};
  case 'hit':return {i:icon('combat',1.6),x:'Hit '+esc(e.boss)+' for <b class="down">'+e.d+'</b>'+(e.via==='mercs'?' with mercenaries':e.dbl?' (double)':''),cls:'hit'};
  case 'bossdown':return {i:icon('star',1.6),x:'<b class="acc">'+esc(e.boss)+' destroyed!</b>',cls:'big'};
  case 'raid':return {i:icon('combat',1.6),x:'<b class="down">'+esc(e.boss)+' raided everyone</b>',cls:'hit'};
 }return {i:'',x:'',cls:''}}
function feedPanel(){const all=(s.events||[]).slice().reverse(),now=e=>e.n>(s.feedFrom||0)&&e.who===s.current&&e.r===s.round;let last=null,rows='';
 all.forEach(e=>{const k=e.r+':'+e.who;if(k!==last){last=k;const who=s.players[e.who]||{name:'?'};rows+='<li class="sep'+(now(e)?' now':'')+'">'+ava(who,18)+'<span>Round '+e.r+' · '+esc(who.name)+'</span></li>'}
  const f=feedLine(e);rows+='<li class="'+f.cls+(now(e)?' now':'')+'" data-ev="'+e.n+'">'+f.i+'<span>'+f.x+'</span></li>'});
 return '<section class="panel feed notch"><div class="eyebrow"><span>Captain\'s log</span><span>'+(all.length?all.length+' moves':'')+'</span></div>'
  +(rows?'<ol id="feedlog">'+rows+'</ol>':'<p class="mute">Every move by every captain appears here.</p>')+'</section>'}
// ---------- 2: watching another captain's table ----------
function tableCard(k,i){const c=E.CARDS[k];return '<article class="pc '+c.cat+' notch tcard" data-tp="'+i+'"><div class="art">'+px(SP.cardURL(k),AW,AH)+'</div><div class="pb"><div class="kind">'+(c.cat==='res'?'Resource':'Order')+' · '+c.kind+'</div><h3>'+c.n+'</h3><p>'+c.t+'</p></div></article>'}
function watchBand(p){const tp=p.turnPlayed||[],backs=p.hand.length,cpu=playingBack();
 return '<section class="band hband watch"><div class="hmain"><div class="bhead2"><h2>'+esc(p.name).toUpperCase()+'\'S TABLE</h2><span class="eyebrow">'+tp.length+' played · '+backs+' in hand</span>'+poolStrip(p)+'</div>'
  +'<div class="hwrap"><div class="hgrid" style="--n:'+Math.max(5,tp.length+backs)+'">'+tp.map(tableCard).join('')+Array.from({length:backs},()=>'<div class="pc back notch"><i></i></div>').join('')+'</div></div></div>'
  +'<div class="hside3 watchside"><div class="whois">'+ava(p,96)+'<span class="eyebrow">Now playing</span><b>'+esc(p.name)+'</b><span class="mute">'+esc(shipName(p.ship))+'</span><span class="mute">'+(p.bot?'Computer captain':'Watch their moves in the feed on the left.')+'</span></div>'
  +(cpu?'<button data-a="cpuspeed">Speed: '+SPEED_NAMES[s.cpuSpeed||'normal']+'</button><button class="primary" data-a="cpuskip">Skip to my turn</button>':'')+'</div></section>'}
function poolStrip(p){return '<div class="pstrip" aria-label="Pool">'+E.RES.map(r=>'<span class="ps'+(p.pool[r]?'':' zero')+'" style="--rc:var(--c-'+r+')" title="'+E.RLABEL[r]+'">'+icon(r,2.6)+'<b>'+p.pool[r]+'</b><i>'+E.RLABEL[r]+'</i></span>').join('')+'</div>'}
/* ---------- victory screen: score breakdown and delivered contracts per captain ---------- */
// one fixed colour per profit source (validated categorical palette, dark surface); losses use the critical colour with an icon
const SRC=[['contracts','Contracts','#3987e5','star'],['patrols','Pirate patrols','#d95926','combat'],['boss','Boss rewards','#199e70','combat'],['cash','Cash-ins','#c98500','cr'],['charter','Trade Charters','#d55181','star'],['buyout','Buyouts','#008300','cr']];
let vicSeat=null,vicShown=null;
function scoreOf(t,i){const sc={...(t.score||{})};if(!t.score){sc.contracts=s.done.filter(d=>d.player===i).reduce((a,d)=>a+d.profit,0);const other=t.profit-sc.contracts;if(other)sc.other=other}return sc}
function victory(seat){
 const order=s.players.map((t,i)=>i).sort((a,b)=>s.players[b].profit-s.players[a].profit),hi=s.players[order[0]].profit,win=order.filter(i=>s.players[i].profit===hi);
 if(seat===null||!s.players[seat])seat=order[0];vicSeat=seat;
 const t=s.players[seat],sc=scoreOf(t,seat),pos=SRC.map(([k,l,c,ic])=>({k,l,c,ic,v:Math.max(0,sc[k]||0)})).concat(sc.other>0?[{k:'other',l:'Earlier (not itemised)',c:'#6b7894',ic:'star',v:sc.other}]:[]);
 const gain=pos.reduce((a,x)=>a+x.v,0),lossItems=[['raided','Raided by pirates'],['stolen','Bought out by rivals']].map(([k,l])=>({k,l,v:-(sc[k]||0)})).filter(x=>x.v>0),loss=lossItems.reduce((a,x)=>a+x.v,0);
 const scale=Math.max(gain,1),rank=order.indexOf(seat)+1,mine=s.done.filter(d=>d.player===seat);
 const counts={contracts:mine.length+' delivered',patrols:Math.round((sc.patrols||0)/5)+' × +5',cash:(sc.cash||0)+' × +1',charter:Math.round((sc.charter||0)/2)+' plays',buyout:'',boss:t.bossDmg?t.bossDmg+' damage dealt':''};
 const bar='<div class="vbar" role="img" aria-label="'+esc(t.name)+' profit by source">'+pos.filter(x=>x.v).map(x=>'<i style="flex:'+x.v+' 1 0;background:'+x.c+'" data-tip="'+x.l+': '+x.v+' ('+Math.round(x.v/scale*100)+'%)"></i>').join('')+(gain?'':'<span class="mute">No profit earned</span>')+'</div>'
  +(loss?'<div class="vloss"><span class="vlossbar" style="width:'+Math.max(2,Math.min(100,loss/scale*100))+'%" data-tip="Lost: '+loss+'"></span><span>⚠ Lost <b>'+loss+'</b> · '+lossItems.map(x=>x.l.toLowerCase()+' −'+x.v).join(' · ')+'</span></div>':'');
 const legend='<table class="vleg"><tbody>'+pos.map(x=>'<tr'+(x.v?'':' class="zero"')+'><td><i style="background:'+x.c+'"></i>'+icon(x.ic,1.6)+x.l+'</td><td class="mute">'+(counts[x.k]||'')+'</td><td><b>'+(x.v?'+'+x.v:'0')+'</b></td></tr>').join('')
  +lossItems.map(x=>'<tr class="neg"><td><i></i>⚠ '+x.l+'</td><td></td><td><b>−'+x.v+'</b></td></tr>').join('')+'<tr class="tot"><td>Final profit</td><td></td><td><b>'+t.profit+'</b></td></tr></tbody></table>';
 const cards=mine.length?mine.map((d,j)=>'<article class="pc ctr notch vcard" style="animation-delay:'+(j*70)+'ms"><div class="art">'+px(SP.sceneURL(d.dest,d.id),AW,AH)+'<span class="badge profit">'+icon('star',1.6)+'+'+d.profit+'</span><div class="go">ROUND '+d.round+'</div></div><div class="pb"><h3>'+esc(d.name)+'</h3><div class="dest">To '+esc(d.dest)+'</div></div></article>').join(''):'<p class="mute vnone">'+esc(t.name)+' did not deliver a contract this run.</p>';
 const tabs=order.map((i,r)=>'<button class="vtab'+(i===seat?' on':'')+'" data-a="vic" data-id="'+i+'"><em>#'+(r+1)+'</em>'+ava(s.players[i],30)+esc(s.players[i].name)+'<b>'+s.players[i].profit+'</b></button>').join('');
 modal('<div class="vic"><div class="vhead">'+ava(s.players[win[0]],144,'vship')+'<div><div class="eyebrow">Run complete · round '+s.round+(s.winMode==='profit'?' · race to '+s.target:'')+'</div><h2>'+win.map(i=>esc(s.players[i].name)).join(' & ')+(win.length>1?' share the win!':' wins!')+'</h2><p class="mute">Only profit counts. Click a captain to see how they earned it.</p></div><div class="vbig">'+icon('star',3.6)+'<b>'+hi+'</b><span class="eyebrow">winning profit</span></div></div>'
  +'<div class="vtabs">'+tabs+'</div>'
  +'<div class="vbody"><section class="vscore"><div class="vsh">'+ava(t,64)+'<div><h3>'+esc(t.name)+'</h3><span class="mute">'+esc(shipName(t.ship))+'</span></div></div><div class="vsh2"><span class="eyebrow">'+(rank===1?'Winner':'#'+rank)+' · '+t.profit+' profit · '+t.completed+' deliveries · '+E.deckSize(t)+' cards</span></div><h4>Score breakdown</h4>'+bar+legend+'</section>'
  +'<section class="vcons"><h4>Contracts delivered · '+mine.length+'</h4><div class="vgrid">'+cards+'</div></section></div>'
  +'<div class="btns"><button class="primary" data-a="setup">New run</button><button data-a="decks" data-id="'+seat+'">Captains\' decks</button><button data-a="review">Review board</button></div></div>',true);
 $('dialog').classList.add('vicdlg');
 if(vicShown!==s.id){vicShown=s.id;Music.sfx('deliver');Music.sfx('turn',.5)}}
/* ---------- captain ships ---------- */
const shipName=id=>(E.SHIPS.find(x=>x.id===id)||{name:''}).name;
function ava(p,size,cls){return p&&p.ship?'<img class="px ava'+(cls?' '+cls:'')+'" src="'+SP.shipURL(p.ship)+'" width="'+size+'" height="'+size+'" alt="'+esc(shipName(p.ship))+'" title="'+esc(shipName(p.ship))+'">':''}
function shipPicker(i,n){const taken=new Set(cfg.ships.slice(0,n).filter((x,j)=>j!==i)),mine=cfg.ships[i];
 return '<div class="shippick" role="radiogroup" aria-label="Ship for captain '+(i+1)+'">'+E.SHIPS.map(x=>'<button type="button" class="'+(x.id===mine?'on':'')+'" role="radio" aria-checked="'+(x.id===mine)+'" data-a="pickship" data-id="'+i+'" data-ship="'+x.id+'"'+(taken.has(x.id)?' disabled title="Taken by another captain"':' title="'+x.name+'"')+'><img class="px" src="'+SP.shipURL(x.id)+'" width="40" height="40" alt="'+x.name+'"></button>').join('')+'<span class="shipname">'+esc(shipName(mine))+'</span></div>'}
function standings(){return s.players.map((t,i)=>({t,i})).sort((a,b)=>b.t.profit-a.t.profit).map(({t,i},rank)=>'<div class="stand'+(i===s.current&&!s.over?' cur':'')+'" data-seat="'+i+'"><i>'+(rank+1)+'</i>'+ava(t,30)+'<div><span>'+esc(t.name)+'</span><small>'+(t.bot?'CPU · ':'')+t.completed+' deliv · '+E.deckSize(t)+' cards</small>'+(i===s.current&&!s.over?'<em class="playing">playing</em>':'')+'</div><strong>'+t.profit+'</strong></div>').join('')}
function gains(k){const c=E.CARDS[k],out=Object.entries(c.g).map(([r,n])=>'<span class="g" style="--rc:var(--c-'+r+')">'+icon(r,1.4)+'+'+n+'</span>');
 if(c.draw)out.push('<span class="g">+'+c.draw+' draw</span>');if(c.buys)out.push('<span class="g">+'+c.buys+' buy</span>');if(k==='buyout')out.push('<span class="g" style="--rc:var(--c-combat)">took profit</span>');if(c.vp)out.push('<span class="g" style="--rc:var(--amber)">'+icon('star',1.4)+'+'+c.vp+' profit</span>');return out.join('')}
function played(p,hidden){const list=hidden?[]:(p.turnPlayed||[]);
 return '<aside class="played"><div class="phead"><h2>PLAYED</h2><span class="eyebrow">'+list.length+' this turn</span></div>'
 +(list.length?'<ol>'+list.map(k=>'<li class="'+E.CARDS[k].cat+'"><img class="px" src="'+SP.cardURL(k)+'" width="44" height="26" alt=""><div><b>'+E.CARDS[k].n+'</b><div class="gs">'+gains(k)+'</div></div></li>').join('')+'</ol>'
 :'<p class="mute">'+(hidden?'Hidden until the captain begins.':'Cards you play this turn appear here. They go to your discard pile when the turn ends.')+'</p>')+'</aside>'}
function render(){
 if(screen!=='game'){renderSetup();return}
 const snap=animBefore();const fl=$('feedlog'),feedTop=fl?fl.scrollTop:0;
 const p=E.me(s),on=myTurn(),hidden=!on;
 $('status').innerHTML=(s.over?'Run complete':'Round <b>'+s.round+(s.winMode==='rounds'?' / '+s.maxRounds:'')+'</b> · <b>'+esc(p.name)+'</b>')+(s.finalRound&&!s.over?' · <b class="acc">final round</b>':'')+(s.winMode==='profit'?' · first to '+s.target:'');
 const watching=hidden&&!s.over&&s.phase==='action'&&(ME!==null||p.bot);
 const hasRes=p.hand.some(k=>E.CARDS[k]&&E.CARDS[k].cat==='res'),playable=!hidden&&p.hand.some((k,i)=>E.canPlay(s,i)),mode=watching?'play':playable?'play':'shop';
 const rail='<aside class="rail"><section class="panel plate notch"><div class="plateid">'+ava(p,64)+'<div><div class="eyebrow">'+(p.bot?'Computer captain':'Active captain')+'</div><h2>'+esc(p.name)+'</h2></div></div><div class="profit">'+icon('star',2.4)+'<b>'+p.profit+'</b><span class="eyebrow">Profit</span></div>'
  +'<div class="chips"><div class="chip"><span class="eyebrow">Deals</span><b>'+p.buys+'</b></div><div class="chip"><span class="eyebrow">Orders</span><b>'+(s.actionLimit?p.actions:'∞')+'</b></div></div></section>'
  +feedPanel()+moveTiles(p,on)
  +'<section class="panel notch"><div class="eyebrow">Standings</div>'+standings()+'</section>'
  +'<section class="panel notch"><div class="eyebrow">Your deck</div><div class="piles"><div><b>'+p.deck.length+'</b><span class="eyebrow">Draw</span></div><div><b>'+p.discard.length+'</b><span class="eyebrow">Discard</span></div><div><b>'+E.deckSize(p)+'</b><span class="eyebrow">Total</span></div></div><div class="links"><button data-a="deck">Deck</button><button data-a="done">Deliveries</button><button data-a="log">Log</button></div></section></aside>';
 const pool=poolStrip(p);
 const cband='<section class="band cband'+(s.boss?' boss-on':'')+'"><div class="bhead2"><h2>CONTRACT BOARD</h2>'+cdeckPile()+'<span class="eyebrow">First to pay claims it · refills at once · '+s.done.length+' delivered</span>'+(s.boss?'':bossPanel())+'</div>'
  +'<div class="cbody">'+(s.boss?bossPanel():'')+'<div class="cwrap"><div class="cgrid" style="--n:'+s.board.length+'">'+s.board.map(ctrCard).join('')+'</div></div></div></section>';
 const mband='<section class="band mband'+(mode==='play'?' mini':'')+'"><div class="bhead2"><h2>CARD MARKET</h2><span class="eyebrow">'+(mode==='play'?'Hover a card for its full text · ':'')+'Sorted by cost · bought cards go to your discard pile</span></div><div class="mgrid">'+marketList().map(k=>cardEl(k,0,true)).join('')+'</div></section>';
 const left=!hidden&&p.hand.length?'<span class="hleft"><span class="eyebrow">Left in hand · no orders left</span>'+p.hand.map((k,i)=>'<span class="hchip '+E.CARDS[k].cat+'">'+E.CARDS[k].n+(on&&!p.scrapped&&p.pool.cr>=1?'<button class="sm" data-a="scrap" data-id="'+i+'">Scrap · 1 cr</button>':'')+'</span>').join('')+'</span>':'';
 const msg=hidden?(ME!==null&&!s.over?esc(p.name)+' is taking their turn. Your hand appears when it is your turn.':s.over?'The run is over.':'Hand hidden until the captain begins.'):'Hand played out. Deliver, buy, or end your turn.';
 const hband=watching?'':'<section class="band hband'+(mode==='shop'?' slim':'')+'"><div class="hmain"><div class="bhead2"><h2>YOUR HAND</h2><span class="eyebrow">'+(hidden?'hidden':p.hand.length+' card'+(p.hand.length===1?'':'s'))+'</span>'+(mode==='shop'?(left||'<span class="hmsg">'+msg+'</span>'):'')+pool+'</div>'
  +(mode==='play'?'<div class="hwrap"><div class="hgrid" style="--n:'+p.hand.length+'">'+p.hand.map((k,i)=>cardEl(k,i,false)).join('')+'</div></div>':'')+'</div>'
  +'<div class="hside3"><button data-a="res"'+(on&&hasRes?'':' disabled')+'>Play resources</button><button class="primary endb" data-a="'+(s.over?'new':'endAsk')+'"'+(!s.over&&!on?' disabled':'')+'>'+(s.over?'New run':'End turn')+'</button>'+played(p,hidden)+'</div></section>';
 $('stage').innerHTML='<div class="desk-shell" data-mode="'+mode+'">'+rail+'<div class="bands">'+cband+mband+(watching?watchBand(p):hband)+'</div></div>';
 {const fl2=$('feedlog');if(fl2&&feedTop)fl2.scrollTop=feedTop}
 animAfter(snap);
}
function table(){return '<table class="t"><thead><tr><th>CAPTAIN</th><th>PROFIT</th><th>DELIVERIES</th></tr></thead><tbody>'+[...s.players].sort((a,b)=>b.profit-a.profit).map(p=>'<tr><td>'+esc(p.name)+'</td><td class="acc">'+p.profit+'</td><td>'+p.completed+'</td></tr>').join('')+'</tbody></table>'}
let seenBoss=0;
function bossNews(){seenBoss=(s.bossDone||[]).length}
function bossReport(){
 // who still has to confirm: the current human captain, or (once the run is over) any human captain
 const order=ME!==null?[ME]:s.over?s.players.map((t,i)=>i):[s.current];
 for(const i of order){if(s.players[i].bot)continue;const k=E.unseen(s,i);if(k<0)continue;
  const r=s.bossDone[k],multi=s.players.filter(t=>!t.bot).length>1;Music.sfx(r.won?'deliver':'boss');
  const rows=s.players.map((t,j)=>({t,j})).sort((a,b)=>r.change[b.j]-r.change[a.j]||r.dmg[b.j]-r.dmg[a.j]).map(({t,j})=>'<tr'+(j===i?' class="me"':'')+'><td>'+esc(t.name)+(r.won&&j===r.final?' <span class="tag">final blow</span>':'')+(!r.won&&r.least&&r.least[j]?' <span class="tag red">least damage ×2</span>':'')+'</td><td>'+r.dmg[j]+'</td><td class="'+(r.change[j]>0?'up':r.change[j]<0?'down':'')+'">'+(r.change[j]>0?'+':'')+r.change[j]+'</td><td>'+r.profit[j]+'</td></tr>').join('');
  const dealt=r.dmg.reduce((a,b)=>a+b,0);
  modal('<div class="eyebrow">Round '+r.round+' · pirate threat '+(r.won?'defeated':'report')+(multi?' · for '+esc(s.players[i].name):'')+'</div>'
   +'<div class="breport '+(r.won?'won':'lost')+'">'+px(SP.bossURL(r.key||r.no||1),176,104)+'<div><h2>'+esc(r.name)+(r.won?' destroyed.':' raided the lanes.')+'</h2><p class="mute">'
   +(r.won?esc(s.players[r.final].name)+' landed the final blow (+'+E.FINAL_BLOW+'). Every captain earns +'+(r.bounty||1)+' profit per damage dealt. Contracts are open again.'
     :'The captains dealt '+dealt+' of '+r.max+' damage. It raided every captain for up to '+(r.raid||E.RAID)+' profit, and double ('+2*(r.raid||E.RAID)+') from the captain'+((r.least||[]).filter(Boolean).length>1?'s':'')+' who dealt the least damage. Contracts are open again.')+'</p></div></div>'
   +'<table class="t"><thead><tr><th>CAPTAIN</th><th>DAMAGE</th><th>'+(r.won?'REWARD':'RAIDED')+'</th><th>PROFIT NOW</th></tr></thead><tbody>'+rows+'</tbody></table>'
   +'<div class="btns"><button class="primary" data-a="bossok" data-id="'+k+'" data-who="'+i+'">'+(multi?'Confirm · '+esc(s.players[i].name):'Confirm')+'</button></div>');
  return true}
 return false}
function phase(){
 if(screen!=='game')return;bossNews();if(bossReport())return;const p=E.me(s);
 if(s.over){victory(vicSeat);return}
 if(s.phase==='handoff'){if(!p.bot){const alarm=s.boss&&!s.boss.alerted;if(alarm)s.boss.alerted=true;Music.sfx(alarm?'boss':'turn')};modal('<div class="eyebrow">Round '+s.round+' · '+(s.finalRound?'Final round':'Next captain')+'</div><h2 class="upname">'+ava(p,56)+esc(p.name)+', you are up.</h2><p class="mute">'+(s.mode==='local'?'Pass the device to this captain. Their hand stays hidden until they begin.':'The board is shared. Build a hand that claims it first.')+'</p><p>5-card hand · '+E.deckSize(p)+' cards in deck · '+p.profit+' profit</p>'+(s.boss?'<div class="threat soon">'+icon('combat',1.6)+'<span><b>'+esc(s.boss.name)+'</b> is blockading the lanes: '+s.boss.hp+' / '+s.boss.max+' hull left, '+(s.boss.until-s.round+1)+' round(s) to beat it.</span></div>':'')+'<div class="btns"><button class="primary" data-a="begin">Begin turn</button></div>');return}
 hide();
}
function rules(){modal('<div class="eyebrow">How Galaxy Trade Lanes works</div><h2>Every purchase changes your next hand.</h2><div class="cols2">'
 +'<p><b class="acc">Deck.</b> Each captain starts with 4 Scrip, 3 Fuel Drums, 2 Ore Samples and 1 Hold Rig, and draws 5 cards per turn. Credits only come from played cards.</p>'
 +'<p><b class="acc">Playing cards.</b> Resource cards are unlimited. Order cards (anything that draws, adds cargo, combat or deals) use one order; the default is two orders per turn. Draw effects resolve at once.</p>'
 +'<p><b class="acc">Contracts.</b> The shared board holds 3 to 5 jobs. Pay the listed fuel, ore, tech, credits and combat, plus cargo space equal to ore + tech. Your base space is 1, so play Hold Rigs and Barges to carry more. Each delivery uses its space for the rest of the turn. A replacement appears immediately.</p>'
 +'<p><b class="acc">Deals.</b> One deal (purchase) per turn; Brokerage adds one. Bought cards go to your discard pile and have no immediate effect.</p>'
 +'<p><b class="acc">Combat.</b> Combat covers escort requirements. Or spend 3 combat and 1 fuel for a pirate patrol worth +5 profit, once per turn. There are no dice.</p>'
 +'<p><b class="acc">Buyout.</b> Costs 6. Take up to 2 profit from a rival, draw a card, and scrap the card.</p>'
 +'<p><b class="acc">Pirate threats.</b> Every '+E.BOSS_EVERY+' rounds a pirate boss blockades the lanes (each pirate patrol pushes the next one back '+E.PATROL_DELAY+' round, at most '+E.MAX_DELAY+' rounds per boss): no contracts can be delivered until it is beaten. Spend combat (1 damage each) or hire mercenaries (usually '+E.MERC+' credits per damage) on your turn. When it falls, every captain earns +1 profit per damage dealt (some bosses pay more) and the final blow earns +'+E.FINAL_BLOW+'. If it survives (usually '+E.BOSS_ROUNDS+' rounds) it raids every captain for '+E.RAID+' profit (double for whoever dealt the least damage) and leaves. Each boss is drawn at random and has its own ability.</p>'
 +'<p><b class="acc">Weapons Officer.</b> Costs 5. An order card: gain 2 combat and draw a card; combat you spend on a boss that turn deals double damage.</p>'
 +'<p><b class="acc">Salvage Crew.</b> Costs 5. An order card: scrap 1 other card from your hand for free (this does not use your once-per-turn scrap), then draw 2.</p>'
 +'<p><b class="acc">Trade Charter.</b> Costs 8. A resource card that gives 2 credits and 2 profit every time you play it.</p>'
 +'<p><b class="acc">Cashing in.</b> Any time on your turn, trade 4 credits for 1 profit, as often as you can afford. Leftover credits never have to go to waste.</p>'
 +'<p><b class="acc">Thinning.</b> Once per turn, pay 1 credit to scrap one unplayed card from your hand.</p>'
 +'<p><b class="acc">Ending.</b> Unused resources vanish, hand and played cards go to discard, you draw 5. Discard reshuffles only when the draw pile runs out.</p>'
 +'<p><b class="acc">Winning.</b> Highest profit after the set rounds, or the round in which someone reaches the target. Everyone gets equal turns and ties share the win.</p></div><div class="btns"><button class="primary" data-a="close">Back</button></div>',true)}
function showRecords(){const a=records();modal('<div class="eyebrow">This browser · best 30</div><h2>Captain records.</h2>'+(a.length?'<table class="t"><thead><tr><th>CAPTAIN</th><th>PROFIT</th><th>RANK</th><th>ROUND</th><th>MODE</th></tr></thead><tbody>'+a.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+r.profit+'</td><td>#'+r.rank+'</td><td>'+r.round+'</td><td>'+(r.mode==='profit'?'target':'rounds')+' / '+(r.limit===0?'unlimited orders':'2 orders')+'</td></tr>').join('')+'</tbody></table>':'<p class="mute">Finish a run to record a score.</p>')+'<div class="btns"><button class="primary" data-a="close">Back</button></div>')}
function viewDeck(){const p=s.players[viewer()],c={};[...p.hand,...p.deck,...p.discard,...p.played].forEach(k=>c[k]=(c[k]||0)+1);
 modal('<div class="eyebrow">'+esc(p.name)+' · deck inventory</div><h2>'+E.deckSize(p)+' cards.</h2><table class="t">'+Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,n])=>'<tr><td>'+E.CARDS[k].n+'</td><td class="mute">'+E.CARDS[k].t+'</td><td>×'+n+'</td></tr>').join('')+'</table><p class="mute" style="margin-top:10px">All piles combined. Draw order stays hidden.</p><div class="btns"><button class="primary" data-a="close">Back</button></div>')}
function viewDecks(i){
 const order=s.players.map((t,j)=>j).sort((a,b)=>s.players[b].profit-s.players[a].profit);
 if(i===null||!s.players[i])i=order[0];
 const p=s.players[i],c={};[...p.hand,...p.deck,...p.discard,...p.played].forEach(k=>c[k]=(c[k]||0)+1);
 const rows=Object.entries(c).sort((a,b)=>(E.CARDS[a[0]].cost===0)-(E.CARDS[b[0]].cost===0)||E.CARDS[b[0]].cost-E.CARDS[a[0]].cost||b[1]-a[1]);
 const bought=rows.filter(([k])=>E.CARDS[k].cost>0).reduce((a,r)=>a+r[1],0),rank=1+s.players.filter(t=>t.profit>p.profit).length;
 modal('<div class="eyebrow">'+(s.over?'Run complete':'Round '+s.round)+' · captains\' decks</div><h2>'+esc(p.name)+'</h2>'
  +'<div class="dtabs">'+order.map(j=>'<button class="sm'+(j===i?' on':'')+'" data-a="decks" data-id="'+j+'">'+esc(s.players[j].name)+' · '+s.players[j].profit+'</button>').join('')+'</div>'
  +'<p class="mute">#'+rank+' · '+p.profit+' profit · '+p.completed+' deliveries · '+E.deckSize(p)+' cards ('+bought+' bought)'+(p.bossDmg?' · '+p.bossDmg+' boss damage':'')+'</p>'
  +'<ul class="dlist">'+rows.map(([k,n])=>{const d=E.CARDS[k];return '<li class="'+d.cat+'"><img class="px" src="'+SP.cardURL(k)+'" width="66" height="39" alt=""><div><b>'+d.n+'</b><span class="mute">'+d.t+'</span></div><strong>×'+n+'</strong></li>'}).join('')+'</ul>'
  +scrapList(p)
  +'<div class="btns"><button class="primary" data-a="close">Back</button></div>',true)}
function scrapList(p){const sc=p.scrappedCards||[],c={};sc.forEach(k=>c[k]=(c[k]||0)+1);
 const by=sc.filter(k=>k!=='buyout').length,bo=sc.length-by;
 return '<h3 class="dsub">Scrapped · '+sc.length+'</h3>'+(sc.length?'<p class="mute">'+by+' scrapped from hand for 1 credit each'+(bo?' · '+bo+' Buyout'+(bo>1?'s':'')+' used up when played':'')+'</p><ul class="dlist">'
  +Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,n])=>'<li class="'+E.CARDS[k].cat+' gone"><img class="px" src="'+SP.cardURL(k)+'" width="66" height="39" alt=""><div><b>'+E.CARDS[k].n+'</b><span class="mute">'+(k==='buyout'?'Used up when played':'Removed from the deck')+'</span></div><strong>×'+n+'</strong></li>').join('')+'</ul>'
  :'<p class="mute">'+esc(p.name)+' never scrapped a card.</p>')}
function encyclopedia(sec){sec=sec||'cards';
 const card=k=>{const c=E.CARDS[k];return '<li class="'+c.cat+'"><img class="px" src="'+SP.cardURL(k)+'" width="88" height="52" alt=""><div><div class="kind">'+(c.cat==='res'?'Resource':'Order')+' · '+c.kind+'</div><b>'+c.n+'</b><span>'+c.t+'</span><small class="mute">'+(c.cat==='res'?'Free to play: does not use an order.':'Uses 1 order (2 per turn by default).')+'</small></div><strong>'+(c.cost?icon('cr',1.6)+c.cost:'Start')+'</strong></li>'};
 const req=t=>Object.entries(t.req).map(([r,n])=>'<span class="tok met" style="--rc:var(--c-'+r+')">'+icon(r,1.6)+n+'</span>').join('')+(E.need(t)?'<span class="tok met" style="--rc:var(--c-cargo)">'+icon('cargo',1.6)+E.need(t)+'</span>':'');
 const tabs=[['cards','Market cards'],['start','Starter cards'],['contracts','Contracts'],['threats','Pirate threats'],['moves','Other moves']];
 let h='';
 if(sec==='cards')h='<p class="mute">Every card you can buy. Bought cards go to your discard pile and show up in later hands.</p><ul class="enc">'+marketList().map(card).join('')+'</ul>';
 else if(sec==='start')h='<p class="mute">Every captain starts with these 10 cards: 4 Scrip, 3 Fuel Drums, 2 Ore Samples and 1 Hold Rig.</p><ul class="enc">'+['scrip','drum','sample','rig'].map(card).join('')+'</ul>';
 else if(sec==='contracts')h='<p class="mute">The 16 contract types (each appears 3 times in the contract deck). Pay the listed resources plus cargo space equal to ore + tech. Big contracts only appear after round 4 or 8.</p><ul class="enc">'+E.TEMPLATES.map((t,i)=>'<li><img class="px" src="'+SP.sceneURL(t.dest,i)+'" width="88" height="52" alt=""><div><div class="kind">To '+esc(t.dest)+' · '+(t.req.combat?'Armed':'Freight')+'</div><b>'+esc(t.name)+'</b><div class="reqs">'+req(t)+'</div></div><strong>'+icon('star',1.6)+'+'+t.profit+'</strong></li>').join('')+'</ul>';
 else if(sec==='threats')h='<p class="mute">With threats on, a boss arrives every '+E.BOSS_EVERY+' rounds, starting in round '+E.BOSS_EVERY+', drawn at random from the six below. Each pirate patrol pushes the next boss back '+E.PATROL_DELAY+' round, at most '+E.MAX_DELAY+' rounds per boss. While one is active no contracts can be delivered. Spend combat (1 damage each, double with a Weapons Officer) or hire mercenaries (usually '+E.MERC+' credits per damage). Beaten: +1 profit per damage dealt, +'+E.FINAL_BLOW+' for the final blow. Survives its deadline (usually '+E.BOSS_ROUNDS+' rounds): raids every captain for '+E.RAID+' profit, double for whoever dealt the least damage.</p><ul class="enc">'+E.BOSS_KEYS.map(k=>{const b=E.BOSSES[k];return '<li><img class="px" src="'+SP.bossURL(k)+'" width="88" height="52" alt=""><div><div class="kind">Pirate boss</div><b>'+b.name+'</b><span>'+b.trait+'</span></div></li>'}).join('')+'</ul>';
 else h='<ul class="enc moves">'
  +'<li><img class="px" src="'+SP.iconURL('combat')+'" width="40" height="40" alt=""><div><b>Pirate patrol</b><span>Spend 3 combat and 1 fuel for +5 profit. Once per turn.</span></div><strong>'+icon('star',1.6)+'+5</strong></li>'
  +'<li><img class="px" src="'+SP.iconURL('cr')+'" width="40" height="40" alt=""><div><b>Cash in</b><span>Trade '+E.CASH+' credits for 1 profit, as often as you can afford, any time on your turn.</span></div><strong>'+icon('star',1.6)+'+1</strong></li>'
  +'<li><img class="px" src="'+SP.iconURL('cr')+'" width="40" height="40" alt=""><div><b>Scrap a card</b><span>Pay 1 credit to remove one unplayed card in your hand from your deck for good. Once per turn. A smaller deck draws your best cards more often.</span></div><strong>'+icon('cr',1.6)+'1</strong></li>'
  +'<li><img class="px" src="'+SP.iconURL('cargo')+'" width="40" height="40" alt=""><div><b>Cargo space</b><span>You have 1 space each turn. Ore and tech need space to deliver. Hold Rig, Barge and Process Deck add more.</span></div><strong>'+icon('cargo',1.6)+'1</strong></li></ul>';
 modal('<div class="eyebrow">Galaxy Trade Lanes</div><h2>Encyclopedia</h2><div class="dtabs">'+tabs.map(([k,l])=>'<button class="sm'+(k===sec?' on':'')+'" data-a="enc" data-sec="'+k+'">'+l+'</button>').join('')+'</div>'+h+'<div class="btns"><button class="primary" data-a="close">Back</button></div>',true)}
function viewDone(){modal('<div class="eyebrow">All captains · this run</div><h2>Deliveries.</h2>'+(s.done.length?[...s.done].reverse().map(c=>'<div class="done"><div><div class="eyebrow">Round '+c.round+' · '+esc(c.captain)+'</div><b>'+esc(c.name)+'</b> <span class="mute">to '+esc(c.dest)+'</span></div><strong>+'+c.profit+'</strong></div>').join(''):'<p class="mute">No deliveries yet.</p>')+'<div class="btns"><button class="primary" data-a="close">Back</button></div>')}
function viewLog(){modal('<div class="eyebrow">Latest 50 events</div><h2>Run log.</h2><div class="log">'+s.log.map(t=>'<div>'+esc(t)+'</div>').join('')+'</div><div class="btns"><button class="primary" data-a="close">Back</button></div>')}
function closeDlg(){if(screen==='game'&&s&&(s.phase==='handoff'||s.over||document.querySelector('#dialog [data-a=bossok]'))){if(document.querySelector('#dialog [data-a=bossok]'))return;phase()}else hide()}

/* ---------- end-of-turn check ---------- */
function leftovers(){const p=E.me(s),out=[];
 s.board.filter(c=>E.canComplete(s,c)).forEach(c=>out.push('Deliver <b>'+esc(c.name)+'</b> for <b class="acc">+'+c.profit+'</b> profit'));
 const playable=p.hand.filter((k,i)=>E.canPlay(s,i)).length;
 if(playable)out.push('Play <b>'+playable+'</b> more card'+(playable>1?'s':'')+' from your hand');
 if(!p.patrolled&&p.pool.combat>=3&&p.pool.fuel>=1)out.push('Run a <b>pirate patrol</b> for <b class="acc">+5</b> profit');
 const can=p.buys>0?E.MARKET.filter(k=>s.market[k]>0&&p.pool.cr>=E.CARDS[k].cost):[];
 if(can.length){const best=can.reduce((a,k)=>E.CARDS[k].cost>E.CARDS[a].cost?k:a);out.push('Buy a card with your <b>'+p.pool.cr+'</b> credits (up to <b>'+E.CARDS[best].n+'</b>)')}
 if(s.boss&&p.pool.combat)out.push('Attack <b>'+esc(s.boss.name)+'</b> with your <b>'+p.pool.combat+'</b> combat');
 if(s.boss&&p.pool.cr>=E.mercCost(s))out.push('Hire mercenaries against the pirate boss (<b>'+E.mercCost(s)+'</b> credits per damage)');
 const n=Math.floor(p.pool.cr/E.CASH);
 if(n)out.push('Cash in <b>'+n*E.CASH+'</b> credits for <b class="acc">+'+n+'</b> profit');
 return out}
function endAsk(){if(!s||screen!=='game'||!E.live(s))return;s.warned=s.warned||{};const left=leftovers();
 if(left.length){modal('<div class="eyebrow">Before you end your turn</div><h2>You still have moves.</h2><ul class="left">'+left.map(x=>'<li>'+x+'</li>').join('')+'</ul><p class="mute">Unspent resources and credits expire when your turn ends.</p><div class="btns"><button data-a="close">Keep playing</button><button class="primary" data-a="end">End turn anyway</button></div>');return}
 if(s.warned[s.current]){act(()=>E.end(s));return}
 modal('<h2>End your turn?</h2><p>Unspent resources expire. Your hand and played cards go to discard, then you draw a new hand of 5. This reminder only appears on your first turn.</p><div class="btns"><button class="primary" data-a="end">End turn</button><button data-a="close">Cancel</button></div>')}

/* ---------- events ---------- */
document.addEventListener('change',e=>{const k=e.target.id;if(k in cfg&&k!=='names'&&screen==='setup'){collect();cfg[k]=k==='winMode'||k==='cpuSpeed'?e.target.value:Number(e.target.value);
 if(k==='humans'){cfg.bots=Math.min(cfg.bots,6-cfg.humans);if(cfg.humans+cfg.bots<2)cfg.bots=1}renderSetup()}});
function musicUI(){const b=$('mus');if(!b)return;b.textContent=Music.on?'Music on':'Music off';b.setAttribute('aria-pressed',String(Music.on));b.classList.toggle('lit',Music.on)}
function musicPref(v){try{localStorage.setItem(MUS,JSON.stringify(v))}catch(e){}}
let musicWanted=true;try{const m=JSON.parse(localStorage.getItem(MUS)||'null');if(m){musicWanted=m.on!==false;if(typeof m.vol==='number'){Music.setVol(m.vol);$('vol').value=m.vol}}}catch(e){}
document.addEventListener('pointerdown',function first(e){document.removeEventListener('pointerdown',first,true);if(e.target.closest&&e.target.closest('#mus,#vol'))return;if(musicWanted&&!Music.on){try{Music.start()}catch(x){}musicUI()}},true);
$('vol').addEventListener('input',e=>{Music.setVol(Number(e.target.value));musicPref({on:Music.on,vol:Music.vol})});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
 const a=b.dataset.a,id=Number(b.dataset.id);
 if(['tab','menu','rules','records','deck','done','log','enc','decks','close','review','new','endAsk'].includes(a))Music.sfx('tab');
 if(a==='music'){try{if(Music.on){Music.stop();musicWanted=false}else{Music.start();musicWanted=true}}catch(x){notify('This browser blocked audio.')}musicPref({on:musicWanted,vol:Music.vol});musicUI();return}
 else if(a==='start')start();
 else if(a==='begin')act(()=>E.begin(s));
 else if(a==='play'){const k=E.me(s).hand[id];act(()=>E.play(s,id,$('bt'+id)?Number($('bt'+id).value):undefined),k&&E.CARDS[k].cat==='act'?'action':'play')}
 else if(a==='res')act(()=>E.playResources(s),'play');
 else if(a==='buy')act(()=>E.buy(s,b.dataset.key),'buy');
 else if(a==='complete')act(()=>E.complete(s,id),'deliver');
 else if(a==='patrol')act(()=>E.patrol(s),'patrol');
 else if(a==='cash')act(()=>E.cashIn(s),'cash');
 else if(a==='bossok'){if(s&&E.confirmBoss(s,id,Number(b.dataset.who))){save();hide();phase()}}
 else if(a==='attack')act(()=>E.attack(s),'hit');
 else if(a==='mercs')act(()=>E.mercs(s),'hit');
 else if(a==='scrap')act(()=>E.scrap(s,id),'scrap');
 else if(a==='end'){s.warned=s.warned||{};s.warned[s.current]=true;act(()=>E.end(s))}
 else if(a==='endAsk')endAsk();
 else if(a==='rules')rules();
 else if(a==='records')showRecords();
 else if(a==='deck')viewDeck();
 else if(a==='enc')encyclopedia(b.dataset.sec);
 else if(a==='decks')viewDecks(Number.isInteger(id)?id:null);
 else if(a==='pickship'){collect();const i=id,k=b.dataset.ship;if(!cfg.ships.slice(0,cfg.humans).some((x,j)=>j!==i&&x===k)){cfg.ships[i]=k;renderSetup()}}
 else if(a==='vic'){Music.sfx('tab');victory(id)}
 else if(a==='done')viewDone();
 else if(a==='log')viewLog();
 else if(a==='review')hide();
 else if(a==='close')closeDlg();
 else if(a==='cpuskip'){skipPlayback()}
 else if(a==='cpuspeed'){cycleSpeed()}
 else if(a==='setup'){stopPlayback();s=null;try{localStorage.removeItem(SAVE)}catch(x){}renderSetup()}
 else if(a==='new'){if(s&&!s.over&&screen==='game')modal('<h2>Start a new run?</h2><p>The current run will be replaced. Saved records stay.</p><div class="btns"><button class="primary" data-a="setup">New run</button><button data-a="close">Cancel</button></div>');else renderSetup()}
});
document.addEventListener('keydown',e=>{
 if($('overlay').hidden)return;
 if(e.key==='Escape')closeDlg();
 if(e.key==='Tab'){const f=[...$('dialog').querySelectorAll('button:not(:disabled),select,input')];if(!f.length){e.preventDefault();return}
  const first=f[0],last=f[f.length-1],cur=document.activeElement;
  if(e.shiftKey&&(cur===first||cur===$('dialog'))){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&(cur===last||cur===$('dialog'))){e.preventDefault();first.focus()}}
});
(function boot(){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE))}catch(e){}
 musicUI();if(saved&&saved.v===1&&saved.players&&saved.board){s=E.migrate(saved);seenBoss=(s.bossDone||[]).length;screen='game';settle()}else renderSetup();
})();


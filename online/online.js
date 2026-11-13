/* Online play: loaded after ui.js in the online build (build-online.sh).
   The server runs the rules; this file sends this browser's moves and redraws from what the server sends back. */
(function(){
const TOKEN_KEY='gtl-online-token';
let token=null,serverId=null,version=0,last=null,lobbySeen=false,wasMyTurn=false,recorded={},polling=false;const warned={};
try{const t=JSON.parse(localStorage.getItem(TOKEN_KEY)||'null');if(t){token=t.token;serverId=t.server}}catch(e){}
const hostKey=new URLSearchParams(location.search).get('host')||'';

async function post(path,body){try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...body})});return await r.json()}catch(e){return {ok:false,error:'Lost contact with the table. Check your connection.'}}}

/* every rules call that changes the game is sent to the server instead of run here */
const send=(fn,args)=>post('/api/act',{fn,args}).then(r=>{if(!r.ok&&r.error)notify(r.error);return r.ok&&!r.error?true:(r.error?null:false)});
const ORIG_CONFIRM=Engine.confirmBoss;
Object.assign(Engine,{
 begin:()=>true,
 play:(g,i,t)=>send('play',[i,t]),playResources:()=>send('playResources',[]),buy:(g,k)=>send('buy',[k]),complete:(g,i)=>send('complete',[i]),
 patrol:()=>send('patrol',[]),cashIn:()=>send('cashIn',[]),scrap:(g,i)=>send('scrap',[i]),attack:()=>send('attack',[]),mercs:()=>send('mercs',[]),
 end:()=>send('end',[]),
 requestUndo:()=>send('requestUndo',[]),cancelUndo:()=>send('cancelUndo',[]),voteUndo:(g,seat,yes)=>send('voteUndo',[yes?1:0]),
 confirmBoss:(g,k,i)=>{ORIG_CONFIRM(g,k,i);send('confirmBoss',[k]);return true}
});
act=function(fn,snd){if(!myTurn())return;if(document.querySelector('#dialog [data-a=end]'))hide();Promise.resolve(fn()).then(ok=>{if(ok===false)notify('Not enough resources, cargo, credits, orders or deals for that.');else if(snd)Music.sfx(snd)})};
save=function(){};settle=function(){};

/* header: online roster and host controls */
function roster(p){const el=$('status');if(!el||!p)return;
 const names=p.players.map(x=>'<span class="who'+(x.online?' on':'')+(p.game&&!p.game.over&&p.game.current===x.seat?' cur':'')+'" title="'+(x.online?'Connected':'Not connected')+'">'+esc(x.name)+(x.host?' ★':'')+'</span>').join('');
 const g=p.game;let turn='';
 if(g&&!g.over){const cur=g.players[g.current];turn=g.current===p.you.seat?'<b class="acc">Your turn</b>':'Waiting for <b>'+esc(cur.name)+'</b>';turn='Round <b>'+g.round+(g.winMode==='rounds'?' / '+g.maxRounds:'')+'</b> · '+turn+(g.winMode==='profit'?' · first to '+g.target:'')}
 el.innerHTML=(turn?turn+' · ':'')+'<span class="roster">'+names+'</span>'+(p.you&&p.you.host&&g&&!g.over?' <button class="sm" data-a="olskip">Skip turn</button>':'')}

/* ---------- screens before a run ---------- */
function joinScreen(msg){screen='setup';hide();$('status').innerHTML='';
 $('stage').innerHTML='<section class="setup online"><div><div class="eyebrow">Online table · 2 to 6 captains</div><h1>Join the<br><span>trade lanes.</span></h1>'
 +'<p class="mute" style="max-width:520px">Everyone plays from their own browser. Enter the name the other captains will see.</p>'
 +(msg?'<p class="olerr">'+esc(msg)+'</p>':'')
 +'<div class="fields"><div><label for="olname">Captain name</label><input id="olname" maxlength="24" autocomplete="nickname" placeholder="Captain name"></div></div>'
 +'<div class="btns"><button class="primary" data-a="oljoin">Join table</button><button data-a="rules">How to play</button></div></div>'
 +'<div class="heroart">'+px(SP.heroURL(),576,256)+'</div></section>';
 setTimeout(()=>{const i=$('olname');if(i)i.focus()},50)}

const SETTINGS=[['actionLimit','Orders per turn',[[2,'Two orders (recommended)'],[0,'Unlimited']]],['winMode','Victory',[['rounds','Highest favor after set rounds'],['profit','Race to a favor target']]],
 ['rounds','Run length',[[10,'10 rounds'],[12,'12 rounds'],[16,'16 rounds (recommended)'],[20,'20 rounds']]],['target','Favor target',[[50,'50 favor'],[80,'80 favor'],[120,'120 favor']]],
 ['boardSize','Contract board',[[3,'3 contracts'],[4,'4 contracts'],[5,'5 contracts']]],['market','Card market',[['standard','Standard: 8 core + 4 random specialists'],['full','Full: all 16 cards']]],['threats','Pirate threats',[[true,'On: boss battles (recommended)'],[false,'Off']]]];
function lobbyScreen(p){screen='setup';const host=p.you.host,S=p.settings;
 const fields=SETTINGS.filter(([k])=>!(k==='rounds'&&S.winMode!=='rounds')&&!(k==='target'&&S.winMode!=='profit')).map(([k,label,opts])=>'<div><label for="ol_'+k+'">'+label+'</label>'+(host
  ?'<select id="ol_'+k+'" data-ol="'+k+'">'+opts.map(([v,l])=>'<option value="'+v+'"'+(String(S[k])===String(v)?' selected':'')+'>'+l+'</option>').join('')+'</select>'
  :'<div class="olval">'+(opts.find(([v])=>String(v)===String(S[k]))||['',''])[1]+'</div>')+'</div>').join('');
 const seats=p.players.map(x=>'<li class="'+(x.online?'on':'')+'"><i></i>'+ava(x,40)+'<b>'+esc(x.name)+'</b>'+(x.host?'<span class="tag">host</span>':'')+(x.seat===p.you.seat?'<span class="tag you">you</span>':'')
  +(host&&x.seat!==p.you.seat?'<button class="sm" data-a="olkick" data-id="'+x.seat+'">Remove</button><button class="sm" data-a="olhost" data-id="'+x.seat+'">Make host</button>':'')+'</li>').join('')
  +Array.from({length:6-p.players.length},()=>'<li class="empty"><i></i>Open seat</li>').join('');
 $('stage').innerHTML='<section class="setup online"><div><div class="eyebrow">Online table · lobby</div><h1>'+(p.players.length)+' of 6<br><span>captains aboard.</span></h1>'
 +'<p class="mute" style="max-width:520px">'+(host?'You are the host. Send the table link to your friends, pick the rules, then launch when everyone is here.':'Waiting for the host to launch the run.')+'</p>'
 +'<ol class="seats">'+seats+'</ol>'+myShip(p)
 +'<div class="fields">'+fields+'</div>'
 +'<div class="btns">'+(host?'<button class="primary" data-a="olstart"'+(p.players.length<2?' disabled':'')+'>'+(p.players.length<2?'Need 2 captains':'Launch run')+'</button>':'')+'<button data-a="olleave">Leave table</button><button data-a="rules">How to play</button></div></div>'
 +'<div class="heroart">'+px(SP.heroURL(),576,256)+'<div class="feat"><div><b>LINK</b> Share the address in your browser bar. Everyone who opens it can join until the run starts.</div><div><b>TURNS</b> Only the captain whose turn it is can act. Everyone else watches the board update.</div><div><b>RECONNECT</b> Closed the tab? Open the link again in the same browser to get your seat back.</div></div></div></section>'}

function myShip(p){const mine=p.players[p.you.seat]||{},taken=new Set(p.players.filter(x=>x.seat!==p.you.seat).map(x=>x.ship));
 return '<div class="olship"><label>Your ship</label><div class="shippick">'+E.SHIPS.map(x=>'<button type="button" class="'+(x.id===mine.ship?'on':'')+'" data-a="olship" data-ship="'+x.id+'"'+(taken.has(x.id)?' disabled title="Taken"':' title="'+x.name+'"')+'><img class="px" src="'+SP.shipURL(x.id)+'" width="40" height="40" alt="'+x.name+'"></button>').join('')+'<span class="shipname">'+esc(shipName(mine.ship))+'</span></div></div>'}
/* ---------- applying what the server sends ---------- */
function apply(p){last=p;
 if(p.server&&serverId&&p.server!==serverId){forget();return joinScreen('That table was closed. Join the new one.')}
 if(!p.you){forget();return joinScreen(lobbySeen?'You are no longer at this table.':'')}
 lobbySeen=true;
 if(!p.started||!p.game){ME=null;s=null;if(!$('overlay').hidden&&document.querySelector('#dialog [data-a=bossok]'))hide();lobbyScreen(p);roster(p);return}
 const g=p.game;s=g;ME=p.you.seat;s.warned=warned;
 const turnKey=g.round+':'+g.current,keepDialog=!$('overlay').hidden&&!document.querySelector('#dialog [data-a=bossok]')&&!document.querySelector('#dialog .undodlg')&&!g.undoReq&&screen==='game'&&!g.over&&E.unseen(g,ME)<0&&turnKey===apply.turnKey;apply.turnKey=turnKey;screen='game';
 const mine=myTurn();if(mine&&!wasMyTurn){Music.sfx('turn');notify('Your turn, '+p.you.name+'.')}wasMyTurn=mine;
 if(g.over&&!recorded[p.server+g.id]){recorded[p.server+g.id]=1;try{record()}catch(e){}}
 render();roster(p);
 if(!keepDialog)phase();
 if(p.notice&&p.notice!==apply.lastNotice){apply.lastNotice=p.notice;if(!/ended their turn/.test(p.notice))notify(p.notice)}}

async function poll(){if(polling)return;polling=true;
 while(token){let p=null;
  try{const r=await fetch('/api/wait?t='+encodeURIComponent(token)+'&v='+version,{cache:'no-store'});p=await r.json()}catch(e){roster(last);await new Promise(r=>setTimeout(r,3000));continue}
  if(p.version!==version){version=p.version;apply(p)}}
 polling=false}
function remember(){try{localStorage.setItem(TOKEN_KEY,JSON.stringify({token,server:serverId}))}catch(e){}}
function forget(){token=null;serverId=null;version=0;ME=null;s=null;try{localStorage.removeItem(TOKEN_KEY)}catch(e){}}

/* ---------- buttons ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a;
 // these local-game buttons mean something different at an online table
 if(['new','setup','start'].includes(a)){e.stopImmediatePropagation();
  if(last&&last.you&&last.you.host&&s&&s.over){const r=await post('/api/lobby',{op:'lobby'});if(!r.ok)notify(r.error)}
  else if(last&&last.you&&last.you.host)modal('<h2>Open the lobby?</h2><p>This ends the current run for everyone and returns the table to the lobby.</p><div class="btns"><button class="primary" data-a="ollobby">End run</button><button data-a="close">Cancel</button></div>');
  else notify('Only the host can start a new run.');return}
 if(a==='olship'){const r=await post('/api/lobby',{op:'ship',ship:b.dataset.ship});if(!r.ok)notify(r.error);return}
 if(a==='oljoin'){const name=($('olname')||{}).value||'';const r=await post('/api/join',{name,hostKey});if(!r.ok)return joinScreen(r.error);token=r.token;serverId=r.server;remember();version=0;poll();return}
 if(a==='olstart'||a==='olleave'||a==='olkick'||a==='olhost'||a==='olskip'||a==='ollobby'){
  const op={olstart:'start',olleave:'leave',olkick:'kick',olhost:'host',olskip:'skip',ollobby:'lobby'}[a];
  if(op==='skip'&&!b.dataset.sure){modal('<h2>Skip this turn?</h2><p>Use this when a captain has left or is stuck. Their turn ends with nothing played.</p><div class="btns"><button class="primary" data-a="olskip" data-sure="1">Skip turn</button><button data-a="close">Cancel</button></div>');return}
  if(op==='skip'||op==='lobby')hide();
  const r=await post('/api/lobby',{op,seat:Number(b.dataset.id)});if(!r.ok)notify(r.error||'That did not work.');
  if(op==='leave'&&r.ok){forget();joinScreen('')}return}
},true);
document.addEventListener('change',async e=>{const k=e.target.dataset&&e.target.dataset.ol;if(!k)return;e.stopImmediatePropagation();
 let v=e.target.value;v=k==='winMode'||k==='market'?v:k==='threats'?v==='true':Number(v);const r=await post('/api/lobby',{op:'settings',settings:{[k]:v}});if(!r.ok)notify(r.error)},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='olname'){e.preventDefault();const b=document.querySelector('[data-a=oljoin]');if(b)b.click()}});

/* ---------- start ---------- */
if(token)poll();else joinScreen('');
})();

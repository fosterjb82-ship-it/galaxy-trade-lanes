/* Phone build: replaces the desktop game screen with a tabbed layout.
   Loaded after ui.js in the same script, so it reuses its helpers and game state. */
let tab='hand',shownTab=null,turnKey=null,tabScroll={};

render=function(){
 if(screen!=='game'){renderSetup();return}
 const body=document.querySelector('.mbody');if(body&&shownTab)tabScroll[shownTab]=body.scrollTop;
 const p=E.me(s),on=s.phase==='action'&&!s.over,hidden=!on;
 const key=s.round+':'+s.current;if(key!==turnKey){turnKey=key;tab='hand';tabScroll={}}
 $('status').innerHTML=(s.over?'Run complete':'Round <b>'+s.round+(s.winMode==='rounds'?' / '+s.maxRounds:'')+'</b> · <b>'+esc(p.name)+'</b>')+(s.finalRound&&!s.over?' · <b class="acc">final round</b>':'')+(s.winMode==='profit'?' · first to '+s.target:'');

 const sum='<div class="msum"><div class="mrow"><div class="mprof">'+icon('star',2.2)+'<b>'+p.profit+'</b><span class="eyebrow">Profit</span></div>'
  +'<div class="mchip"><span class="eyebrow">Buys</span><b>'+p.buys+'</b></div><div class="mchip"><span class="eyebrow">Actions</span><b>'+(s.actionLimit?p.actions:'∞')+'</b></div></div>'
  +'<div class="mpool">'+E.RES.map(r=>'<span class="mp'+(p.pool[r]?'':' zero')+'" style="--rc:var(--c-'+r+')" title="'+E.RLABEL[r]+'">'+icon(r,1.8)+'<b>'+p.pool[r]+'</b><i>'+SHORT[r]+'</i></span>').join('')+'</div></div>';

 const ready=on?s.board.filter(c=>E.canComplete(s,c)).length:0;
 const afford=on&&p.buys>0?E.MARKET.filter(k=>s.market[k]>0&&p.pool.cr>=E.CARDS[k].cost).length:0;
 let h='';
 if(tab==='hand'){
  const hasRes=p.hand.some(k=>E.CARDS[k].cat==='res');
  h='<div class="mact"><button data-a="res"'+(on&&hasRes?'':' disabled')+'>Play resources</button><button class="primary" data-a="'+(s.over?'new':'endAsk')+'"'+(!s.over&&!on?' disabled':'')+'>'+(s.over?'New run':'End turn')+'</button></div>'
   +(hidden?'<div class="empty">Hand hidden until the captain begins.</div>':p.hand.length?'<div class="grid">'+p.hand.map((k,i)=>cardEl(k,i,false)).join('')+'</div>':'<div class="empty">Hand played out. Deliver, buy, or end your turn.</div>')
   +'<button class="mpatrol" data-a="patrol"'+(!on||p.patrolled||p.pool.combat<3||p.pool.fuel<1?' disabled':'')+'>'+(p.patrolled?'Patrol cleared':'Pirate patrol · 3 cbt + 1 fuel → +5')+'</button>'
   +played(p,hidden)
   +'<p class="eyebrow mnote">Draw pile '+p.deck.length+' · Discard '+p.discard.length+' · '+E.deckSize(p)+' cards total</p>';
 }else if(tab==='board'){
  h='<div class="sechead"><h2>CONTRACT BOARD</h2><span class="eyebrow">First to pay claims it · '+s.done.length+' delivered</span></div><div class="grid">'+s.board.map(ctrCard).join('')+'</div>';
 }else if(tab==='market'){
  h='<div class="sechead"><h2>CARD MARKET</h2><span class="eyebrow">Bought cards go to your discard pile</span></div><div class="grid">'+E.MARKET.map(k=>cardEl(k,0,true)).join('')+'</div>';
 }else{
  h='<section class="panel mpanel notch"><div class="eyebrow">Standings</div>'+standings()+'</section>'
   +'<section class="panel mpanel notch"><div class="eyebrow">Your deck</div><div class="piles"><div><b>'+p.deck.length+'</b><span class="eyebrow">Draw</span></div><div><b>'+p.discard.length+'</b><span class="eyebrow">Discard</span></div><div><b>'+E.deckSize(p)+'</b><span class="eyebrow">Total</span></div></div><div class="links"><button data-a="deck">Deck</button><button data-a="done">Deliveries</button><button data-a="log">Log</button></div></section>';
 }
 const T=[['hand','Hand',hidden?'':p.hand.length+(p.hand.length===1?' card':' cards')],['board','Contracts',ready?ready+' ready':''],['market','Market',afford?afford+' buyable':''],['crew','Captains','']];
 const tabs='<nav class="mtabs" role="tablist" aria-label="Game sections">'+T.map(([k,l,n])=>'<button role="tab" data-a="tab" data-t="'+k+'" aria-selected="'+(tab===k)+'"'+(tab===k?' class="on"':'')+'>'+l+'<em'+(k==='board'&&ready?' class="hot"':'')+'>'+n+'</em></button>').join('')+'</nav>';
 $('stage').innerHTML='<div class="mgame">'+sum+'<div class="mbody" role="tabpanel">'+h+'</div>'+tabs+'</div>';
 shownTab=tab;document.querySelector('.mbody').scrollTop=tabScroll[tab]||0;
};

function menu(){
 modal('<div class="eyebrow">Galaxy Trade Lanes · phone build</div><h2>Menu</h2><div class="mmenu">'
  +'<div class="mvol"><label for="vol2">Music volume</label><input id="vol2" type="range" min="0" max="1" step="0.05" value="'+Music.vol+'"></div>'
  +'<button data-a="rules">Rules</button><button data-a="records">Records</button>'
  +(screen==='game'?'<button data-a="new">New run</button>':'')
  +'<button class="primary" data-a="close">Back</button></div>');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
 if(b.dataset.a==='tab'){tab=b.dataset.t;render()}else if(b.dataset.a==='menu')menu()});
document.addEventListener('input',e=>{if(e.target.id==='vol2'){Music.setVol(Number(e.target.value));$('vol').value=e.target.value;musicPref({on:Music.on,vol:Music.vol})}});
if(screen==='game')render();

/* Phone build: replaces the desktop game screen with a tabbed layout.
   Loaded after ui.js in the same script, so it reuses its helpers and game state. */
let tab='hand',shownTab=null,turnKey=null,tabScroll={};

render=function(){
 if(screen!=='game'){renderSetup();return}
 const snap=animBefore();
 const body=document.querySelector('.mbody');if(body&&shownTab)tabScroll[shownTab]=body.scrollTop;
 const p=E.me(s),on=s.phase==='action'&&!s.over,hidden=!on;
 const key=s.round+':'+s.current;if(key!==turnKey){turnKey=key;tab='hand';tabScroll={}}
 $('status').innerHTML=(s.over?'Run complete':'Round <b>'+s.round+(s.winMode==='rounds'?' / '+s.maxRounds:'')+'</b> · <b>'+esc(p.name)+'</b>')+(s.finalRound&&!s.over?' · <b class="acc">final round</b>':'')+(s.winMode==='profit'?' · first to '+s.target:'');

 const sum='<div class="msum"><div class="mrow"><div class="mprof">'+ava(p,34)+icon('star',2.2)+'<b>'+p.profit+'</b></div>'
  +'<div class="mchip"><span class="eyebrow">Deals</span><b>'+p.buys+'</b></div><div class="mchip"><span class="eyebrow">Orders</span><b>'+(s.actionLimit?p.actions:'∞')+'</b></div>'
  +'<button class="primary mend" data-a="'+(s.over?'new':'endAsk')+'"'+(!s.over&&!on?' disabled':'')+'>'+(s.over?'New run':'End turn')+'</button></div>'
  +'<div class="mpool">'+E.RES.map(r=>'<span class="mp'+(p.pool[r]?'':' zero')+'" style="--rc:var(--c-'+r+')" title="'+E.RLABEL[r]+'">'+icon(r,1.8)+'<b>'+p.pool[r]+'</b><i>'+SHORT[r]+'</i></span>').join('')+'</div></div>';

 const ready=on?s.board.filter(c=>E.canComplete(s,c)).length:0;
 const afford=on&&p.buys>0?E.MARKET.filter(k=>s.market[k]>0&&p.pool.cr>=E.CARDS[k].cost).length:0;
 let h='';
 if(tab==='hand'){
  const hasRes=p.hand.some(k=>E.CARDS[k]&&E.CARDS[k].cat==='res');
  const canPatrol=on&&!p.patrolled&&p.pool.combat>=3&&p.pool.fuel>=1;
  h='<div class="mact"><button data-a="res"'+(on&&hasRes?'':' disabled')+'>Play all resources</button><button class="mpatrol'+(canPatrol?' primary':'')+'" data-a="patrol"'+(canPatrol?'':' disabled')+'>'+(p.patrolled?'Patrol cleared':'Pirate patrol +5')+'<small>3 combat + 1 fuel · once per turn'+(E.delayLeft(s)?' · delays boss 1 round':'')+'</small></button></div>'
   +(s.boss?bossPanel(true):'')
   +cashBtn(p,on)
   +(hidden?'<div class="empty">Hand hidden until the captain begins.</div>':p.hand.length?'<div class="grid">'+p.hand.map((k,i)=>cardEl(k,i,false)).join('')+'</div>':'<div class="empty">Hand played out. Deliver, buy, or end your turn.</div>')
   +played(p,hidden)
   +'<p class="eyebrow mnote">Draw pile '+p.deck.length+' · Discard '+p.discard.length+' · '+E.deckSize(p)+' cards total</p>';
 }else if(tab==='board'){
  h='<div class="sechead"><h2>CONTRACT BOARD</h2>'+cdeckPile()+'<span class="eyebrow">First to pay claims it · '+s.done.length+' delivered</span></div>'+bossPanel()+'<div class="grid">'+s.board.map(ctrCard).join('')+'</div>';
 }else if(tab==='market'){
  h='<div class="sechead"><h2>CARD MARKET</h2><span class="eyebrow">Bought cards go to your discard pile</span></div>'+cashBtn(p,on)+'<div class="grid">'+marketList().map(k=>cardEl(k,0,true)).join('')+'</div>';
 }else{
  h='<section class="panel mpanel notch"><div class="eyebrow">Standings</div>'+standings()+'</section>'
   +'<section class="panel mpanel notch"><div class="eyebrow">Your deck</div><div class="piles"><div><b>'+p.deck.length+'</b><span class="eyebrow">Draw</span></div><div><b>'+p.discard.length+'</b><span class="eyebrow">Discard</span></div><div><b>'+E.deckSize(p)+'</b><span class="eyebrow">Total</span></div></div><div class="links"><button data-a="deck">Deck</button><button data-a="done">Deliveries</button><button data-a="log">Log</button></div>'+(s.over?'<button class="primary" data-a="decks">View all captains\' decks</button>':'')+'</section>';
 }
 const T=[['hand','Hand',hidden?'':p.hand.length+(p.hand.length===1?' card':' cards')],['board','Contracts',s.boss?'boss · '+E.bossClock(s).rounds+' rd'+(E.bossClock(s).rounds>1?'s':''):E.nextThreat(s)?'boss in '+(E.nextThreat(s)-s.round):ready?ready+' ready':''],['market','Market',afford?afford+' buyable':''],['crew','Captains','']];
 const tabs='<nav class="mtabs" role="tablist" aria-label="Game sections">'+T.map(([k,l,n])=>'<button role="tab" data-a="tab" data-t="'+k+'" aria-selected="'+(tab===k)+'"'+(tab===k?' class="on"':'')+'>'+l+'<em'+(k==='board'&&s.boss?' class="hot red"':k==='board'&&ready?' class="hot"':'')+'>'+n+'</em></button>').join('')+'</nav>';
 $('stage').innerHTML='<div class="mgame">'+sum+'<div class="mbody" role="tabpanel">'+h+'</div>'+tabs+'</div>';
 shownTab=tab;document.querySelector('.mbody').scrollTop=tabScroll[tab]||0;
 animAfter(snap);
};

function cashBtn(p,on){const n=Math.floor(p.pool.cr/E.CASH),ok=on&&n>0;
 return '<button class="mcash'+(ok?' lit':'')+'" data-a="cash"'+(ok?'':' disabled')+'>Cash in '+E.CASH+' credits → +1 profit<small>'+(ok?'You can do this '+n+(n===1?' time':' times')+' now':'Any time, as often as you can afford')+'</small></button>'}
function menu(){
 modal('<div class="eyebrow">Galaxy Trade Lanes · phone build</div><h2>Menu</h2><div class="mmenu">'
  +'<button data-a="sound">Sound settings</button>'
  +'<button data-a="rules">Rules</button><button data-a="enc">Encyclopedia</button><button data-a="records">Records</button>'
  +(screen==='game'?'<button data-a="new">New run</button>':'')
  +'<button class="primary" data-a="close">Back</button></div>');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
 if(b.dataset.a==='tab'){tab=b.dataset.t;render()}else if(b.dataset.a==='menu')menu()});
if(screen==='game')render();

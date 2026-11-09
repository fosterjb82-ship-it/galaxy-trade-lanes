/* Guided tutorial: a short scripted game against one computer captain.
   Loaded after ui.js (and after mobile/mobile.js in the phone build). A coach box explains each step,
   a spotlight ring shows where to look, and action steps advance when the player has done the thing. */
const Tut=(function(){
let on=false,i=0,busy=false,coach=null,ring=null,seedId=null;
const PHONE=()=>!!document.querySelector('.mtabs');
const me=()=>s&&s.players[0];
const handSel=k=>{const p=me();const idx=p?p.hand.indexOf(k):-1;return idx>=0?'[data-hand="'+idx+'"]':null};
const give=(hand)=>{const p=me();p.hand=hand.slice()};

/* each step: title, text, target (desktop selector), phone {sel, tab}, enter(), done() (action steps) or next:true (info) */
const STEPS=[
 {t:'Welcome aboard, captain',x:'Every captain races to deliver <b>contracts</b> from this shared board. Each one pays <b class="acc">profit</b> (the ★ number). The captain with the most profit at the end of the run wins.',
  sel:'.cband',ph:{sel:'.mbody',tab:'board'},next:true},
 {t:'Your hand',x:'You draw 5 cards each turn. <b class="tg">Resource</b> cards are free to play. <b class="ag">Order</b> cards are stronger, but you can only give 2 orders per turn.',
  sel:'.hgrid',ph:{sel:'.mbody .grid',tab:'hand'},next:true},
 {t:'Play your resources',x:'Click <b>Play resources</b> to play every resource card in your hand at once.',
  sel:'[data-a=res]',ph:{sel:'[data-a=res]',tab:'hand'},done:()=>me().pool.fuel>=1&&me().pool.ore>=1},
 {t:'Your pool',x:'Played cards fill your <b>pool</b> for this turn: fuel, ore, tech, credits, combat and cargo space. Anything you do not spend <b>vanishes</b> when your turn ends.',
  sel:'.pstrip',ph:{sel:'.mpool',tab:'hand'},next:true},
 {t:'Make cargo space',x:'Ore and tech need <b>cargo space</b> to carry, and you start each turn with only 1. Give the <b>Hold Rig</b> order for +2 cargo.',
  sel:()=>handSel('rig'),ph:{sel:()=>handSel('rig'),tab:'hand'},done:()=>me().pool.cargo>=3},
 {t:'Deliver a contract',x:'<b>Seed Stock</b> needs 1 fuel, 1 ore and 1 cargo space, and you have all three, so it is glowing. Click <b>Deliver</b> for +8 profit. A new contract is dealt into its place.',
  sel:()=>'.ctr[data-cid="'+seedId+'"]',ph:{sel:()=>'.ctr[data-cid="'+seedId+'"]',tab:'board'},done:()=>s.done.length>=1},
 {t:'Buy a card',x:'You have 2 credits and 1 <b>deal</b> (purchase) this turn. Buy any card you can afford. It goes to your discard pile and shows up in a later hand, so your deck gets stronger over time.',
  sel:'.mband',ph:{sel:'.mbody .pc.can [data-a=buy]',tab:'market'},done:()=>me().buys===0},
 {t:'End your turn',x:'Nothing left to do. Click <b>End turn</b>. Your rival, Nova Syndicate, takes a turn, then you draw 5 new cards.',
  sel:'[data-a=endAsk]',ph:{sel:'.mend'},done:()=>s.round>=2},
 {t:'Your next turn',x:'Your new hand is ready. Click <b>Begin turn</b>.',
  sel:'#dialog [data-a=begin]',ph:{sel:'#dialog [data-a=begin]'},enter:()=>give(['gunship','drum','scrip','scrip','house']),done:()=>s.round>=2&&s.phase==='action'},
 {t:'Resources again',x:'Play your resources to fill the pool.',
  sel:'[data-a=res]',ph:{sel:'[data-a=res]',tab:'hand'},done:()=>me().pool.cr>=6},
 {t:'Arm up',x:'Give the <b>Gunship</b> order for +3 combat. Combat is used for armed contracts, pirate patrols and boss fights.',
  sel:()=>handSel('gunship'),ph:{sel:()=>handSel('gunship'),tab:'hand'},done:()=>me().pool.combat>=3},
 {t:'Pirate patrol',x:'Spend 3 combat and 1 fuel on a <b>pirate patrol</b> for +5 profit, once per turn. Each patrol can also push the next pirate boss back a round (up to 2 rounds per boss).',
  sel:'.move.patrol',ph:{sel:'.mpatrol',tab:'hand'},done:()=>me().patrolled},
 {t:'Cash in',x:'Leftover credits are wasted at the end of your turn. <b>Cash in</b> 4 credits for +1 profit whenever you have spare.',
  sel:'.move.cash',ph:{sel:'.mcash',tab:'hand'},done:()=>me().pool.cr<6},
 {t:'A pirate boss!',x:'Every few rounds a <b>pirate boss</b> blockades the lanes: nobody can deliver until it is beaten. All captains fight it together. Each one has its own trick, shown in yellow, and a countdown before it raids everyone.',
  sel:'.boss',ph:{sel:'.boss',tab:'board'},next:true,enter:()=>{const B=E.BOSSES.dread;s.threats=true;
   s.boss={key:'dread',name:B.name,trait:B.trait,hp:4,max:4,merc:2,raid:5,bounty:1,regen:0,arrived:s.round,until:s.round+2,dmg:s.players.map(()=>0),no:1};me().hand.push('weapons');Music.sfx('boss')}},
 {t:'Weapons Officer',x:'Give the <b>Weapons Officer</b> order: +2 combat, and every point of combat you spend on a boss this turn deals <b>double damage</b>.',
  sel:()=>handSel('weapons'),ph:{sel:()=>handSel('weapons'),tab:'hand'},done:()=>me().dbl},
 {t:'Attack!',x:'2 combat × 2 = 4 damage, exactly what this boss has left. Click <b>Attack</b>. No combat? You can also hire mercenaries with credits.',
  sel:'.cband [data-a=attack]',ph:{sel:'.boss [data-a=attack]',tab:'board'},done:()=>!s.boss},
 {t:'Victory report',x:'Beating a boss pays every captain +1 profit per damage they dealt, plus +5 for the final blow. Click <b>Confirm</b>.',
  sel:'#dialog [data-a=bossok]',ph:{sel:'#dialog [data-a=bossok]'},done:()=>E.unseen(s,0)<0},
 {t:'You are ready',x:'That is the whole loop: <b>play</b> cards, <b>deliver</b> contracts, <b>buy</b> better cards, fight pirates together, and finish with the most profit. The <b>Rules</b> and <b>Cards</b> buttons explain everything in detail.',
  sel:null,ph:{sel:null},finish:true}
];

function css(){if(document.getElementById('tut-css'))return;const st=document.createElement('style');st.id='tut-css';st.textContent=`
.tut-ring{position:fixed;z-index:65;pointer-events:none;border:3px solid var(--amber);box-shadow:0 0 0 9999px #03060cb0,0 0 22px #f5b93c88;transition:all .25s ease;animation:tutpulse 1.4s ease-in-out infinite}
@keyframes tutpulse{50%{border-color:#fff1a8;box-shadow:0 0 0 9999px #03060cb0,0 0 34px #f5b93ccc}}
@media (prefers-reduced-motion:reduce){.tut-ring{animation:none;transition:none}}
.tut-coach{position:fixed;z-index:70;width:420px;max-width:calc(100vw - 32px);background:var(--panel2);border:3px solid var(--amber);padding:16px 18px;box-shadow:6px 6px 0 #000a;display:flex;flex-direction:column;gap:8px}
.tut-coach .eyebrow{display:flex;justify-content:space-between}
.tut-coach h3{margin:0;font:700 26px var(--disp);color:var(--amber)}
.tut-coach p{margin:0;font-size:16px;line-height:1.45;color:var(--ink)}
.tut-coach .tg{color:var(--teal)}.tut-coach .ag{color:var(--amber)}
.tut-coach .tbtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.tut-coach .tbtns button{flex:1 1 auto;min-height:42px}
.tut-coach .hint{font:500 12px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--teal)}
.tut-coach.dock{left:12px!important;right:12px;width:auto;top:auto!important;bottom:calc(76px + env(safe-area-inset-bottom,0px))}
.tut-coach.dock.top{bottom:auto;top:calc(8px + env(safe-area-inset-top,0px))!important}
.tut-coach.center{left:50%!important;top:50%!important;transform:translate(-50%,-50%)}`;document.head.append(st)}

function target(){const st=STEPS[i];let sel=PHONE()?st.ph&&st.ph.sel:st.sel;if(typeof sel==='function')sel=sel();if(!sel)return null;
 const el=[...document.querySelectorAll(sel)].find(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed');return el||null}

function draw(){if(!on)return;css();const st=STEPS[i],z=typeof zoomK==='function'?zoomK():1;
 if(!coach){coach=document.createElement('div');coach.className='tut-coach notch';coach.setAttribute('role','dialog');coach.setAttribute('aria-label','Tutorial');document.body.append(coach)}
 if(!ring){ring=document.createElement('div');ring.className='tut-ring';document.body.append(ring)}
 coach.innerHTML='<div class="eyebrow"><span>Tutorial · step '+(i+1)+' of '+STEPS.length+'</span></div><h3>'+st.t+'</h3><p>'+st.x+'</p>'
  +(st.finish?'<div class="tbtns"><button class="primary" data-tut="keep">Keep playing this run</button><button data-tut="real">Start a real run</button></div>'
   :'<div class="tbtns">'+(st.next?'<button class="primary" data-tut="next">Next</button>':'<span class="hint">Do it to continue</span>')+'<button data-tut="quit">Exit tutorial</button></div>');
 const el=target();
 if(el&&PHONE()){const box=el.closest('.mbody');if(box){const r=el.getBoundingClientRect(),b=box.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)el.scrollIntoView({block:'center'})}}
 if(el){const r=el.getBoundingClientRect(),pad=6;ring.style.display='';
  Object.assign(ring.style,{left:(r.left/z-pad)+'px',top:(r.top/z-pad)+'px',width:(r.width/z+pad*2)+'px',height:(r.height/z+pad*2)+'px'})}
 else{ring.style.display='none'}
 coach.classList.toggle('dock',PHONE()&&!!el);coach.classList.toggle('center',!el);
 if(PHONE()&&el){const r=el.getBoundingClientRect();coach.classList.toggle('top',r.top+r.height/2>innerHeight/2)}
 if(el&&!PHONE()){const r=el.getBoundingClientRect(),W=innerWidth/z,H=innerHeight/z,cw=coach.offsetWidth,ch=coach.offsetHeight,R={l:r.left/z,t:r.top/z,w:r.width/z,h:r.height/z};
  let left,top;
  if(R.t+R.h+ch+24<H){top=R.t+R.h+16}else if(R.t-ch-24>0){top=R.t-ch-16}else{top=Math.max(12,Math.min(H-ch-12,R.t+R.h/2-ch/2));left=R.l+R.w+16<W-cw?R.l+R.w+16:R.l-cw-16}
  if(left===undefined)left=R.l+R.w/2-cw/2;
  coach.style.left=Math.max(12,Math.min(W-cw-12,left))+'px';coach.style.top=Math.max(12,Math.min(H-ch-12,top))+'px'}
 else if(!el){coach.style.left='';coach.style.top=''}}

function go(n){i=n;const st=STEPS[i];if(st.enter)st.enter();if(PHONE()&&st.ph&&st.ph.tab&&typeof tab!=='undefined'&&screen==='game'){tab=st.ph.tab}
 if(screen==='game'&&s&&(st.enter||(PHONE()&&st.ph&&st.ph.tab)))render();draw()}
function update(){if(!on||busy)return;busy=true;try{
 if(!s||screen!=='game'||!s.tutorial){stop();return}
 let g=0;while(STEPS[i].done&&STEPS[i].done()&&g++<5)go(i+1);draw()}finally{busy=false}}
function stop(){on=false;if(coach)coach.remove();if(ring)ring.remove();coach=ring=null;if(s&&s.tutorial)delete s.tutorial}

function start(){hide();
 s=E.create({seed:2026,threats:false,rounds:10,players:[{name:'You'},{name:'Nova Syndicate',bot:true}]});s.tutorial=true;s.warned={0:true};
 screen='game';E.begin(s);give(['drum','sample','scrip','scrip','rig']);seedId=(s.board.find(c=>c.name==='Seed Stock')||s.board[0]).id;
 on=true;i=0;if(typeof tab!=='undefined')tab='board';try{save()}catch(e){}render();go(0)}

document.addEventListener('click',e=>{const b=e.target.closest('[data-tut]');if(b){const a=b.dataset.tut;e.stopPropagation();
  if(a==='next'){Music.sfx('tab');go(i+1)}
  else if(a==='quit'){stop();s=null;try{localStorage.removeItem(SAVE)}catch(x){}renderSetup()}
  else if(a==='keep'){stop();s.threats=true;s.nextBoss=s.round+5;save();render();phase()}
  else if(a==='real'){stop();s=null;try{localStorage.removeItem(SAVE)}catch(x){}renderSetup()}
  return}
 const t=e.target.closest('[data-a=tutorial]');if(t&&!t.disabled){e.stopPropagation();start()}},true);
addEventListener('resize',()=>{if(on)draw()});

// redraw the coach after every screen update and dialog
const _render=render;render=function(){_render.apply(this,arguments);update()};
const _phase=phase;phase=function(){_phase.apply(this,arguments);update()};
return {start,stop,get on(){return on}};
})();

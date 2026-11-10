// Records the 30-second teaser in one continuous take from the real desktop game (2560x1440, captured at 1080p)
// and logs every sound cue (with its delay) so audio30.cjs can render a matching soundtrack.
// Usage: node tools/teaser/record30.cjs <out-dir> <path/to/index.html>
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const OUT=process.argv[2],GAME=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const CSS=`
#tz-cap{pointer-events:none;position:fixed;left:50%;bottom:54px;transform:translateX(-50%);z-index:99;padding:16px 36px;background:#070b14ee;border:3px solid var(--amber);
 font:700 52px/1.1 var(--disp);letter-spacing:.04em;color:var(--ink);text-align:center;white-space:nowrap;box-shadow:8px 8px 0 #000a;opacity:0;transition:opacity .25s, transform .25s}
#tz-cap.show{opacity:1;transform:translateX(-50%) translateY(-8px)} #tz-cap b{color:var(--amber)}
#tz-card{pointer-events:none;position:fixed;inset:0;z-index:100;background:radial-gradient(ellipse at 50% 40%,#16224a,#070b14 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;transition:opacity .45s}
#tz-card .hero{width:1100px;height:auto;image-rendering:pixelated;animation:tzfly 2.4s ease-out both}
#tz-card h1{margin:0;font:700 140px/0.9 var(--disp);letter-spacing:.1em;color:var(--amber);text-shadow:8px 8px 0 #000}
#tz-card h2{margin:0;font:600 42px var(--mono);letter-spacing:.34em;color:var(--ink)}
#tz-card p{margin:4px 0 0;font:600 38px var(--body);color:var(--mute)}
#tz-card .ships{display:flex;gap:18px}#tz-card .ships img{width:96px;height:96px;image-rendering:pixelated;animation:tzpop .5s cubic-bezier(.2,.8,.25,1.4) both}
#tz-card .cta{margin-top:8px;padding:14px 36px;background:var(--amber);color:#2a1604;font:700 44px var(--disp);letter-spacing:.08em;text-transform:uppercase}
@keyframes tzfly{from{transform:translateX(-160px) scale(.94);opacity:0}to{transform:none;opacity:1}}
@keyframes tzpop{from{transform:scale(.2) rotate(-30deg);opacity:0}to{transform:none;opacity:1}}
.toast{display:none!important}
.setup{zoom:1.45}`;

(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:2560,height:1440}});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('file://'+GAME);await sleep(700);
 await page.addStyleTag({content:CSS});
 await page.evaluate(()=>{const c=document.createElement('div');c.id='tz-cap';document.body.append(c);
  window.cap=h=>{const el=document.getElementById('tz-cap');el.classList.remove('show');if(!h)return;setTimeout(()=>{el.innerHTML=h;el.classList.add('show')},140)};
  window.card=h=>{let el=document.getElementById('tz-card');if(!h){if(el){el.style.opacity=0;setTimeout(()=>el.remove(),500)}return}if(!el){el=document.createElement('div');el.id='tz-card';document.body.append(el)}el.innerHTML=h};
  window.shipsRow=()=>'<div class="ships">'+E.SHIPS.map((x,i)=>'<img src="'+SP.shipURL(x.id)+'" style="animation-delay:'+(.6+i*.12)+'s">').join('')+'</div>';
  window.__cues=[];window.__t0=performance.now();const T=()=>(performance.now()-__t0)/1000;
  Music.sfx=(n,d)=>__cues.push([n,T()+(d||0)]);Music.victory=()=>__cues.push(['victory',T()]);
  cfg.bots=2;cfg.cpuSpeed='fast';cfg.names[0]='Captain Vega';renderSetup();
  card('<img class="hero" src="'+SP.heroURL()+'"><h1>GALAXY TRADE LANES</h1><h2>CARGO &amp; CREDITS</h2>'+shipsRow())});
 await sleep(400);
 const tap=sel=>page.evaluate(s=>{const e=[...document.querySelectorAll(s)].find(x=>!x.disabled&&x.offsetParent!==null);if(e){e.click();return true}return false},sel);

 // ---------- capture ----------
 const cdp=await page.context().newCDPSession(page),dir=path.join(OUT,'frames30');fs.mkdirSync(dir,{recursive:true});const frames=[];
 cdp.on('Page.screencastFrame',f=>{const i=frames.length;fs.writeFileSync(path.join(dir,String(i).padStart(5,'0')+'.jpg'),Buffer.from(f.data,'base64'));frames.push(f.metadata.timestamp);cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{})});
 await page.evaluate(()=>{window.__t0=performance.now();window.__cues=[]});const t0=Date.now()/1000;
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1920,maxHeight:1080,everyNthFrame:1});

 // 0-3 s title
 await sleep(3300);await page.evaluate(()=>card(''));await sleep(300);
 // 3-6 s choose a ship and launch
 await page.evaluate(()=>cap('Choose your <b>ship.</b>'));await sleep(800);
 await tap('[data-a=pickship][data-ship="cruiser"]');await sleep(900);
 await tap('[data-a=start]');await sleep(400);
 // rig the first hand while it is hidden: a big delivery and a Weapons Officer purchase
 await page.evaluate(()=>{const P=E.me(s);P.hand=['house','pack','vault','deck','scrip'];s.warned={0:true};
  const t=E.TEMPLATES.find(x=>x.name==='Survey Mission');s.board[1]={...t,req:{...t.req},id:901};render()});
 await sleep(500);
 // 6-11 s cards dealt, resources played, a card bought
 await tap('#dialog [data-a=begin]');await page.evaluate(()=>cap('Build your <b>deck.</b>'));await sleep(1300);
 await tap('[data-a=res]');await sleep(1500);
 await tap('[data-a=buy][data-key=weapons]');await sleep(900);
 // 11-14 s the big delivery
 await page.evaluate(()=>cap('Race rivals to <b>the contracts.</b>'));
 await tap('[data-hand="0"] [data-a=play]');await sleep(700);
 await tap('[data-a=complete][data-id="901"]');await sleep(1700);
 // 14-18 s watch a rival's turn
 await tap('[data-a=endAsk]');await sleep(150);await tap('#dialog [data-a=end]');await page.evaluate(()=>cap('Watch every <b>rival move.</b>'));await sleep(3900);
 // a viewer would press Skip to my turn here
 await page.evaluate(()=>skipPlayback());await sleep(300);
 // 18-23 s pirate boss
 await page.evaluate(()=>{const P=s.players[0];P.hand=['weapons','gunship','scrip','scrip','rig'];P.actions=2;const B=E.BOSSES.siren;
  s.boss={key:'siren',name:B.name,trait:B.trait,hp:10,max:14,merc:2,raid:5,bounty:2,regen:0,arrived:s.round,until:s.round+2,dmg:s.players.map((x,i)=>i?2:0),no:1,alerted:true};render()});
 await tap('#dialog [data-a=begin]');await page.evaluate(()=>{Music.sfx('boss');cap('Team up against <b>pirate bosses.</b>')});await sleep(1400);
 await tap('[data-hand="0"] [data-a=play]');await sleep(450);await tap('[data-hand="0"] [data-a=play]');await sleep(650);
 await tap('.cband [data-a=attack]');await sleep(1500);await tap('#dialog [data-a=bossok]');await sleep(200);
 // 23-27 s play out the run and open the victory screen
 // play the rest out with every captain using the computer's play style; rivals sit out one round in five.
 // try a few variations and keep one that Captain Vega wins (a close, believable finish)
 await page.evaluate(()=>{s.cpuSpeed='instant';const snap=JSON.stringify(s);
  const human=()=>{const p=E.me(s);p.bot=true;E.botTurn(s);p.bot=false};
  for(let off=0;off<10;off++){s=JSON.parse(snap);let g=0;
   while(!s.over&&g++<5000){if(s.phase==='handoff')E.begin(s);if(E.me(s).bot){if(s.round%5!==off%5)E.botTurn(s);else E.end(s)}else human();(s.bossDone||[]).forEach((r,k)=>E.confirmBoss(s,k,0))}
   const v=s.players[0].profit,best=Math.max(...s.players.slice(1).map(x=>x.profit));if(v>best)break}
  cap('');settle()});
 await sleep(500);await page.evaluate(()=>cap('Every win, <b>broken down.</b>'));await sleep(4300);
 // 27-30 s end card
 await page.evaluate(()=>{cap('');card('<img class="hero" src="'+SP.heroURL()+'" style="width:760px"><h1 style="font-size:120px">GALAXY TRADE LANES</h1><h2>CARGO &amp; CREDITS</h2>'+shipsRow()+'<div class="cta">Play online with up to 6 friends</div>')});
 await sleep(3900);

 const dur=Date.now()/1000-t0;await cdp.send('Page.stopScreencast');await sleep(200);
 const cues=await page.evaluate(()=>__cues),winner=await page.evaluate(()=>document.querySelector('.vhead h2')&&document.querySelector('.vhead h2').textContent);
 const list=frames.map((ts,i)=>"file '"+String(i).padStart(5,'0')+".jpg'\nduration "+Math.max(0.001,((frames[i+1]||t0+dur)-ts)).toFixed(4)).join('\n')+"\nfile '"+String(frames.length-1).padStart(5,'0')+".jpg'\n";
 fs.writeFileSync(path.join(dir,'list.txt'),list);const lead=Math.max(0,frames[0]-t0);
 fs.writeFileSync(path.join(OUT,'cues30.json'),JSON.stringify(cues.map(([n,t])=>[n,Math.max(0,t-lead)])));
 console.log('frames',frames.length,'dur',dur.toFixed(2),'winner:',winner,'cues',cues.length,cues.filter(c=>c[0]==='victory'||c[0]==='boss').map(c=>c[0]+'@'+c[1].toFixed(1)).join(' '),'errors',errs);
 await b.close()})();

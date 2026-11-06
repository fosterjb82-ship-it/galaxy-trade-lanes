// Records the teaser's video clips from the real game with CDP screencast frames and logs sound cues.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const OUT=process.argv[2],GAME=process.argv[3],LOBBY=process.argv[4];
const W=1600,H=900,DPR=1.2;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const OVERLAY_CSS=`
#tz-cap{pointer-events:none;position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:99;padding:14px 30px;background:#070b14ee;border:3px solid var(--amber);
 font:700 40px/1.1 var(--disp);letter-spacing:.04em;color:var(--ink);text-align:center;white-space:nowrap;box-shadow:6px 6px 0 #000a;opacity:0;transition:opacity .25s, transform .25s}
#tz-cap.show{opacity:1;transform:translateX(-50%) translateY(-6px)} #tz-cap b{color:var(--amber)}
#tz-card{pointer-events:none;position:fixed;inset:0;z-index:100;background:radial-gradient(ellipse at 50% 40%,#16224a,#070b14 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;transition:opacity .45s}
#tz-card img{width:900px;height:auto;image-rendering:pixelated;animation:tzfly 2.6s ease-out both}
#tz-card h1{margin:0;font:700 112px/0.9 var(--disp);letter-spacing:.1em;color:var(--amber);text-shadow:6px 6px 0 #000}
#tz-card h2{margin:0;font:600 34px var(--mono);letter-spacing:.34em;color:var(--ink)}
#tz-card p{margin:6px 0 0;font:600 30px var(--body);color:var(--mute)}
#tz-card .cta{margin-top:10px;padding:12px 30px;background:var(--amber);color:#2a1604;font:700 34px var(--disp);letter-spacing:.08em;text-transform:uppercase}
@keyframes tzfly{from{transform:translateX(-140px) scale(.94);opacity:0}to{transform:none;opacity:1}}
.toast{display:none!important}`;

async function setup(page){await page.addStyleTag({content:OVERLAY_CSS});
 await page.evaluate(()=>{const c=document.createElement('div');c.id='tz-cap';document.body.append(c);
  window.cap=(html)=>{const el=document.getElementById('tz-cap');if(!html){el.classList.remove('show');return}el.classList.remove('show');setTimeout(()=>{el.innerHTML=html;el.classList.add('show')},120)};
  window.card=(html)=>{let el=document.getElementById('tz-card');if(!html){if(el){el.style.opacity=0;setTimeout(()=>el.remove(),500)}return}if(!el){el=document.createElement('div');el.id='tz-card';document.body.append(el)}el.innerHTML=html};
  // log sound cues instead of playing them (the soundtrack is rendered separately)
  window.__cues=[];window.__t0=performance.now();Music.sfx=n=>__cues.push([n,(performance.now()-__t0)/1000]);});}

async function capture(page,name,run){
 const cdp=await page.context().newCDPSession(page),dir=path.join(OUT,name);fs.mkdirSync(dir,{recursive:true});const frames=[];
 cdp.on('Page.screencastFrame',async f=>{const i=frames.length;fs.writeFileSync(path.join(dir,String(i).padStart(5,'0')+'.jpg'),Buffer.from(f.data,'base64'));frames.push(f.metadata.timestamp);cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{})});
 await page.evaluate(()=>{window.__t0=performance.now();window.__cues=[]});
 const t0=Date.now()/1000;await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1920,maxHeight:1080,everyNthFrame:1});
 await run();const dur=Date.now()/1000-t0;await cdp.send('Page.stopScreencast');await sleep(200);
 const cues=await page.evaluate(()=>__cues);
 // ffmpeg concat list: each frame shown until the next one arrives
 const list=frames.map((ts,i)=>"file '"+String(i).padStart(5,'0')+".jpg'\nduration "+Math.max(0.001,((frames[i+1]||t0+dur)-ts)).toFixed(4)).join('\n')+"\nfile '"+String(frames.length-1).padStart(5,'0')+".jpg'\n";
 fs.writeFileSync(path.join(dir,'list.txt'),list);
 const lead=Math.max(0,frames[0]-t0);
 fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({dur,lead,cues,frames:frames.length}));
 console.log(name,'frames',frames.length,'dur',dur.toFixed(2),'cues',cues.map(c=>c[0]+'@'+c[1].toFixed(2)).join(' '));}

(async()=>{const b=await chromium.launch();
 /* ---------- clip A: title, gameplay, boss ---------- */
 let ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:DPR});let page=await ctx.newPage();
 await page.goto('file://'+GAME);await sleep(600);
 await page.fill('#nm0','You');await page.click('[data-a=start]');await sleep(200);
 await page.locator('[data-a=begin]:visible').first().click();await sleep(200);
 await setup(page);
 // a hand that buys a Weapons Officer and lands a big delivery
 await page.evaluate(()=>{const P=E.me(s);P.hand=['house','pack','vault','deck','scrip'];P.profit=12;s.players[1].profit=14;s.players[2].profit=9;s.round=4;
  const t=E.TEMPLATES.find(x=>x.name==='Survey Mission');s.board[1]={...t,req:{...t.req},id:901};
  document.getElementById('center').scrollTop=0;render();
  card('<img src="'+SP.heroURL()+'"><h1>GALAXY TRADE LANES</h1><h2>CARGO &amp; CREDITS</h2><p>Build the deck. Win the manifest.</p>')});
 await sleep(300);
 await capture(page,'a',async()=>{
  await sleep(2300);await page.evaluate(()=>card(''));await sleep(350);
  await page.evaluate(()=>cap('Buy cards. <b>Build your deck.</b>'));await sleep(700);
  await page.click('[data-a=res]');await sleep(800);
  await page.evaluate(()=>{const c=document.getElementById('center');c.scrollTo({top:c.scrollHeight,behavior:'smooth'})});await sleep(700);
  await page.click('[data-a=buy][data-key=weapons]');await sleep(700);
  await page.evaluate(()=>{const c=document.getElementById('center');c.scrollTo({top:0,behavior:'smooth'})});await sleep(400);
  await page.evaluate(()=>cap('Race rivals to <b>the same contracts.</b>'));
  await page.click('[data-a=play][data-id="0"]');await sleep(800);
  await page.click('[data-a=complete][data-id="901"]');await sleep(1200);
  await page.evaluate(()=>{const P=E.me(s);P.pool.combat=3;P.pool.fuel=1;render();cap('Hunt pirates <b>for profit.</b>')});await sleep(900);
  await page.click('[data-a=patrol]');await sleep(1000);
  // a pirate boss blockades the lanes
  await page.evaluate(()=>{const P=E.me(s),B=E.BOSSES.siren;s.boss={key:'siren',name:B.name,trait:B.trait,hp:11,max:14,merc:2,raid:5,bounty:2,regen:0,arrived:s.round,until:s.round+2,dmg:[0,3,0],no:1};
   P.hand=['weapons','gunship','scrip','scrip','rig'];P.actions=2;P.patrolled=true;P.pool={fuel:0,ore:0,tech:0,cr:2,combat:0,cargo:1};render();Music.sfx('boss');
   cap('Team up when <b>pirate bosses</b> blockade the lanes.')});await sleep(1300);
  await page.click('[data-a=play][data-id="0"]');await sleep(350);await page.click('[data-a=play][data-id="0"]');await sleep(450);
  await page.click('[data-a=attack]');await sleep(800);
  await page.click('[data-a=mercs]');await sleep(1300);
 });
 const recPage=page;

 /* ---------- clip B: online lobby filling up ---------- */
 const lctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:DPR});const lp=await lctx.newPage();
 await lp.goto(LOBBY);await sleep(500);await lp.fill('#olname','You');await lp.click('[data-a=oljoin]');await sleep(800);
 await lp.evaluate(()=>{Music.sfx=()=>{}});await setup(lp);
 const base=LOBBY.split('/?')[0],join=n=>fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});
 await join('Sam');
 await capture(lp,'b',async()=>{
  await lp.evaluate(()=>cap('Play online with <b>up to 6 friends.</b>'));
  for(const n of ['Alex','Riley','Morgan','Casey']){await sleep(480);await join(n)}
  await sleep(500);
 });

 /* ---------- clip C: end card ---------- */
 await capture(recPage,'c',async()=>{
  await recPage.evaluate(()=>{hide();cap('');card('<img src="'+SP.heroURL()+'" style="width:620px"><h1 style="font-size:96px">GALAXY TRADE LANES</h1><h2>CARGO &amp; CREDITS</h2><div class="cta">Game night · Join the crew</div>')});
  await sleep(2900);
 });
 await b.close();})();

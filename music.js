const Music=(function(){
'use strict';
let ctx=null,master=null,bus=null,verb=null,dly=null,timer=null,step=0,next=0,on=false,vol=.5,noise=null,padCut=null;
const BPM=76,E8=60/BPM/2,LOOP=128;
const CH=[
 {b:45,p:[57,60,64,67,71]},{b:41,p:[57,60,64,65,72]},{b:48,p:[55,59,62,64,67]},{b:43,p:[55,59,62,66,69]},
 {b:45,p:[57,60,64,67,71]},{b:41,p:[53,57,60,64,69]},{b:38,p:[53,57,60,62,65]},{b:40,p:[52,56,59,62,71]}
];
const ARP=[0,2,1,3,2,4,3,1,0,2,4,3,1,4,2,3];
const BASS=[1,0,0,1,0,0,1,0, 1,0,0,1,0,1,0,0];
const hz=m=>440*Math.pow(2,(m-69)/12);
function ir(sec){const n=ctx.sampleRate*sec,b=ctx.createBuffer(2,n,ctx.sampleRate);
 for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}return b}
function build(){
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();master.gain.value=0;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
 master.connect(comp);comp.connect(ctx.destination);
 bus=ctx.createGain();bus.connect(master);
 verb=ctx.createConvolver();verb.buffer=ir(3.4);const wet=ctx.createGain();wet.gain.value=.42;verb.connect(wet);wet.connect(master);
 dly=ctx.createDelay(2);dly.delayTime.value=E8*3;const fb=ctx.createGain();fb.gain.value=.38;const dlp=ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=2600;
 dly.connect(dlp);dlp.connect(fb);fb.connect(dly);dlp.connect(bus);dlp.connect(verb);
 padCut=ctx.createBiquadFilter();padCut.type='lowpass';padCut.frequency.value=900;padCut.Q.value=2;padCut.connect(bus);padCut.connect(verb);
 const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.05;lg.gain.value=500;lfo.connect(lg);lg.connect(padCut.frequency);lfo.start();
 const n=ctx.sampleRate,buf=ctx.createBuffer(1,n,n),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;noise=buf;
}
function env(g,t,a,peak,hold,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setValueAtTime(peak,t+a+hold);g.gain.exponentialRampToValueAtTime(.0001,t+a+hold+rel)}
function pad(notes,t,dur){notes.forEach((m,i)=>{[-7,7].forEach(det=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det+(i%2?3:-3);
 env(g,t,1.6,.022,dur-1.6,2.4);o.connect(g);g.connect(padCut);o.start(t);o.stop(t+dur+2.6)})})}
function arp(m,t,lvl){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='square';o.frequency.value=hz(m);f.type='lowpass';f.frequency.value=1800;
 env(g,t,.005,lvl,.02,.28);o.connect(f);f.connect(g);g.connect(bus);g.connect(dly);o.start(t);o.stop(t+.4)}
function bass(m,t){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='triangle';o2.type='sine';o.frequency.value=hz(m);o2.frequency.value=hz(m-12);
 f.type='lowpass';f.frequency.setValueAtTime(700,t);f.frequency.exponentialRampToValueAtTime(180,t+.35);env(g,t,.01,.16,.08,.45);[o,o2].forEach(x=>{x.connect(f);x.start(t);x.stop(t+.6)});f.connect(g);g.connect(bus)}
function kick(t){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);env(g,t,.003,.22,.02,.3);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.4)}
function hat(t,lvl){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=7500;env(g,t,.002,lvl,.005,.06);s.connect(f);f.connect(g);g.connect(bus);s.start(t,Math.random()*.5);s.stop(t+.1)}
function bell(m,t){const c=ctx.createOscillator(),mo=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain();c.type='sine';c.frequency.value=hz(m);mo.frequency.value=hz(m)*3.5;mg.gain.value=hz(m)*1.2;
 mo.connect(mg);mg.connect(c.frequency);env(g,t,.004,.05,.0,2.2);c.connect(g);g.connect(verb);g.connect(dly);[c,mo].forEach(x=>{x.start(t);x.stop(t+2.4)})}
function tick(){
 while(next<ctx.currentTime+.25){
  const s=step%LOOP,bar=Math.floor(s/16),ch=CH[bar%8],pos=s%16,t=next,loopN=Math.floor(step/LOOP),drums=loopN>0||s>=64;
  if(pos===0)pad(ch.p,t,E8*16+.2);
  if(pos%2===0||loopN>0)arp(ch.p[ARP[pos]]+12,t,pos%4===0?.05:.032);
  if(BASS[pos])bass(ch.b,t);
  if(drums){if(pos===0||pos===8)kick(t);if(pos%4===2)hat(t,.05);else if(pos%2===1&&loopN>0)hat(t,.018)}
  if(pos===6&&(bar%3===1)&&Math.random()<.7)bell(ch.p[4]+12,t);
  step++;next+=E8;
 }
}
function start(){if(!ctx)build();if(ctx.state!=='running')ctx.resume();
 if(on)return;on=true;step=0;next=ctx.currentTime+.12;
 master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);master.gain.linearRampToValueAtTime(vol*.9,ctx.currentTime+2.5);
 tick();timer=setInterval(tick,60)}
function stop(){if(!ctx||!on)return;on=false;clearInterval(timer);timer=null;
 const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(0,t+.8)}
function setVol(v){vol=v;if(ctx&&on){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(v*.9,ctx.currentTime,.1)}}
/* ---- sound effects: short tones, only while music is on ---- */
let fx=null;
function tone(f,t,dur,type,lvl,glide){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);
 env(g,t,.004,lvl,dur*.25,dur*.75);o.connect(g);g.connect(fx);o.start(t);o.stop(t+dur+.05)}
const SFX={
 turn:t=>{tone(hz(76),t,.5,'sine',.22);tone(hz(83),t+.14,.7,'sine',.2);tone(hz(88),t+.28,.9,'triangle',.12)},
 deliver:t=>{[72,76,79,84].forEach((m,i)=>tone(hz(m),t+i*.07,.22,'square',.07));tone(hz(96),t+.3,.5,'sine',.12);tone(hz(91),t+.3,.6,'triangle',.08)},
 play:t=>{tone(hz(67),t,.09,'triangle',.16,hz(72))},
 action:t=>{tone(hz(64),t,.07,'square',.06);tone(hz(71),t+.05,.12,'triangle',.14,hz(76))},
 buy:t=>{tone(hz(88),t,.08,'square',.06);tone(hz(93),t+.07,.35,'sine',.16)},
 cash:t=>{tone(hz(91),t,.06,'sine',.12);tone(hz(96),t+.05,.3,'sine',.12)},
 patrol:t=>{[0,.11,.22,.33].forEach((d,i)=>{tone(1900-i*120,t+d,.13,'square',.06,260);tone(2600-i*150,t+d,.08,'sawtooth',.03,600)});
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t2=t+.46;s.buffer=noise;f.type='lowpass';f.frequency.setValueAtTime(2400,t2);f.frequency.exponentialRampToValueAtTime(120,t2+.6);
  env(g,t2,.005,.35,.05,.6);s.connect(f);f.connect(g);g.connect(fx);s.start(t2);s.stop(t2+.8);tone(90,t2,.6,'sine',.25,38)},
 scrap:t=>{tone(300,t,.16,'triangle',.14,90)},
 tab:t=>{tone(hz(81),t,.045,'sine',.09)},
 draw:t=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='bandpass';f.frequency.setValueAtTime(5200,t);f.frequency.exponentialRampToValueAtTime(1800,t+.09);f.Q.value=1.4;
  env(g,t,.004,.22,.01,.08);s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*.5);s.stop(t+.14);tone(hz(91),t+.02,.05,'sine',.03)},
 deal:t=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='lowpass';f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(400,t+.12);
  env(g,t,.002,.32,.01,.12);s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*.5);s.stop(t+.18);tone(150,t,.12,'sine',.12,70);tone(hz(84),t+.05,.18,'triangle',.05)},
 boss:t=>{tone(hz(40),t,1.1,'sawtooth',.12,hz(38));tone(hz(47),t+.05,1.0,'sawtooth',.08,hz(45));tone(hz(52),t+.5,.9,'square',.05,hz(50))},
 hit:t=>{tone(180,t,.25,'sawtooth',.14,40);tone(900,t,.08,'square',.05,200)}
};
function sfx(name,delay){if(!on||!ctx||!SFX[name])return;if(!fx){fx=ctx.createGain();const c=ctx.createDynamicsCompressor();fx.connect(c);c.connect(ctx.destination);fx.connect(verb)}
 fx.gain.value=Math.min(1,.35+vol*.9);try{SFX[name](ctx.currentTime+.01+(delay||0))}catch(e){}}
/* ---- victory fanfare: about 12 s, played over a dipped soundtrack ---- */
function victory(){if(!on||!ctx)return;
 const t0=ctx.currentTime+.15,B=.5,out=ctx.createGain(),comp=ctx.createDynamicsCompressor();out.gain.value=Math.min(1,.45+vol*.8);out.connect(comp);comp.connect(ctx.destination);out.connect(verb);
 // dip the background music, then bring it back
 master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);master.gain.linearRampToValueAtTime(vol*.12,t0+.4);
 master.gain.setValueAtTime(vol*.12,t0+9.6);master.gain.linearRampToValueAtTime(vol*.9,t0+12.4);
 const brass=(m,at,dur,lvl)=>{const t=t0+at*B,d=dur*B,f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.Q.value=3;f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(3600,t+.07);f.frequency.exponentialRampToValueAtTime(1500,t+Math.max(.15,d));
  env(g,t,.025,lvl,Math.max(0,d-.12),.35);f.connect(g);g.connect(out);[-6,6].forEach(det=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+d+.5)})};
 const chord=(ms,at,dur,lvl)=>ms.forEach(m=>{const t=t0+at*B,d=dur*B,o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='square';o.frequency.value=hz(m);f.type='lowpass';f.frequency.value=1400;
  env(g,t,.06,lvl,Math.max(0,d-.2),.6);o.connect(f);f.connect(g);g.connect(out);o.start(t);o.stop(t+d+.7)});
 const low=(m,at,dur)=>{const t=t0+at*B,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=hz(m);env(g,t,.02,.22,dur*B-.1,.3);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur*B+.4)};
 const timp=(at,lvl)=>{const t=t0+at*B,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(98,t);o.frequency.exponentialRampToValueAtTime(52,t+.5);env(g,t,.004,lvl,.05,.7);o.connect(g);g.connect(out);o.start(t);o.stop(t+.9);
  const n=ctx.createBufferSource(),nf=ctx.createBiquadFilter(),ng=ctx.createGain();n.buffer=noise;nf.type='lowpass';nf.frequency.value=600;env(ng,t,.002,lvl*.6,.01,.25);n.connect(nf);nf.connect(ng);ng.connect(out);n.start(t,Math.random()*.5);n.stop(t+.35)};
 const bellAt=(m,at)=>{const t=t0+at*B,c=ctx.createOscillator(),mo=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain();c.frequency.value=hz(m);mo.frequency.value=hz(m)*3.5;mg.gain.value=hz(m)*1.1;
  mo.connect(mg);mg.connect(c.frequency);env(g,t,.004,.08,0,2.4);c.connect(g);g.connect(out);[c,mo].forEach(x=>{x.start(t);x.stop(t+2.6)})};
 // melody (beat = 0.5 s): call, answer, climb, and a held high C
 [[0,67,.33],[.33,67,.33],[.67,67,.33],[1,72,1],[2,76,.5],[2.5,74,.5],[3,72,.5],[3.5,76,.5],[4,79,1.5],
  [5.5,81,.5],[6,79,.5],[6.5,77,.5],[7,76,.5],[7.5,74,.5],[8,76,.5],[8.5,77,.5],[9,79,.5],[9.5,81,.5],[10,83,1],[11,84,8]].forEach(([at,m,d])=>{brass(m,at,d,.13);if(at>=4)brass(m-12,at,d,.05)});
 // harmony and bass
 chord([60,64,67],0,4,.035);chord([57,60,65],4,1.5,.035);chord([60,65,69],5.5,2.5,.035);chord([59,62,67,65],8,3,.04);chord([60,64,67,72,76],11,8,.045);
 [[0,36,4],[4,41,1.5],[5.5,41,2.5],[8,43,3],[11,36,8]].forEach(([at,m,d])=>low(m,at,d));
 [0,1,4,8,10,11,11.5].forEach((at,i)=>timp(at,i>4?.42:.3));
 [84,88,91,96,100].forEach((m,i)=>bellAt(m,11.2+i*.35));bellAt(96,14.5);bellAt(91,16)}
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(on)ctx.resume()});
return {start,stop,setVol,sfx,victory,get on(){return on},get vol(){return vol}};
})();

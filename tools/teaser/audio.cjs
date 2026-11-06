// Renders the game's own soundtrack plus timed sound effects offline (OfflineAudioContext) to a WAV file.
const {chromium}=require('playwright'),fs=require('fs');
const [musicSrc,cuesFile,out,dur]=process.argv.slice(2);
let src=fs.readFileSync(musicSrc,'utf8');
for(const [a,b] of [["ctx=new (window.AudioContext||window.webkitAudioContext)();","ctx=window.__offline;"],["if(ctx.state!=='running')ctx.resume();",""],
 ["while(next<ctx.currentTime+.25)","while(next<ctx.currentTime+(window.__ahead||.25))"],["linearRampToValueAtTime(vol*.9,ctx.currentTime+2.5)","linearRampToValueAtTime(vol*.9,ctx.currentTime+.8)"],
 ["SFX[name](ctx.currentTime+.01+(delay||0))","SFX[name]((window.__at||0)+.01+(delay||0))"]]){if(!src.includes(a))throw new Error('patch missing: '+a);src=src.replace(a,b)}
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const cues=JSON.parse(fs.readFileSync(cuesFile,'utf8'));
 const wav=await p.evaluate(async({src,cues,dur})=>{const SR=44100;window.__offline=new OfflineAudioContext(2,Math.ceil(SR*dur),SR);window.__ahead=dur;
  eval(src+';window.Music=Music;');Music.setVol(.62);Music.start();cues.forEach(([n,t])=>{window.__at=t;Music.sfx(n)});
  const buf=await __offline.startRendering();const L=buf.getChannelData(0),R=buf.getChannelData(1),n=L.length,ab=new ArrayBuffer(44+n*4),v=new DataView(ab);
  const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SR,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]))*32767,true);v.setInt16(46+i*4,Math.max(-1,Math.min(1,R[i]))*32767,true)}
  let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)},{src,cues,dur:Number(dur)});
 fs.writeFileSync(out,Buffer.from(wav,'base64'));await b.close();console.log('wrote',out)})();

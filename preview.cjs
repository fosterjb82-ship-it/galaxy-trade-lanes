const zlib=require('zlib'),fs=require('fs'),Sp=require('./sprites.js');
function crc(buf){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}let r=0xffffffff;for(const b of buf)r=t[(r^b)&255]^(r>>>8);return(r^0xffffffff)>>>0}
function chunk(type,data){const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])}
function png(w,h,rgba){const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(rgba.buffer,y*w*4,w*4).copy(raw,y*(w*4+1)+1)}
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
function sheet(items,cols,sc,gap,bw,bh,file){const rows=Math.ceil(items.length/cols),W=cols*(bw*sc+gap)+gap,H=rows*(bh*sc+gap)+gap,d=new Uint8ClampedArray(W*H*4);
 for(let i=0;i<W*H;i++){d[i*4]=30;d[i*4+1]=34;d[i*4+2]=44;d[i*4+3]=255}
 items.forEach((s,i)=>{const ox=gap+(i%cols)*(bw*sc+gap),oy=gap+Math.floor(i/cols)*(bh*sc+gap);for(let y=0;y<s.h*sc;y++)for(let x=0;x<s.w*sc;x++){const k=((Math.floor(y/sc))*s.w+Math.floor(x/sc))*4;if(s.d[k+3]){const q=((oy+y)*W+ox+x)*4;d[q]=s.d[k];d[q+1]=s.d[k+1];d[q+2]=s.d[k+2]}}});
 fs.writeFileSync(file,png(W,H,d))}
const keys=Object.keys(Sp.EMB);
sheet(keys.slice(0,9).map(Sp.cardArt),3,4,10,88,52,'out/cards1.png');
sheet(keys.slice(9).map(Sp.cardArt),3,4,10,88,52,'out/cards2.png');
sheet(Object.keys(Sp.SCENES).map(d=>Sp.scene(d,2)),3,4,10,88,52,'out/scenes.png');
sheet([Sp.hero()],1,5,10,144,64,'out/hero.png');
sheet(['fuel','ore','tech','cr','combat','cargo','star'].map(Sp.icon),7,10,10,10,10,'out/icons.png');
console.log('done');
sheet(['dread','maw','armada','wraith','hive','siren'].map(k=>Sp.boss(k)).concat([Sp.patrolArt(),Sp.cashArt()]),2,4,10,88,52,'out/bosses.png');

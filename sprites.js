const Sprites=(function(){
'use strict';
const PAL={
 steel:['#0b1220','#18243a','#2a3d5a','#42607f','#6a8dac','#9ebdd3','#dbeaf4'],
 amber:['#2a1204','#5a260a','#94410c','#d2701a','#f5a52d','#ffd05a','#fff1a8'],
 teal:['#04201d','#083d38','#0f6a5c','#19a184','#4cd6ae','#9bf0d2','#dcfff0'],
 rust:['#24100c','#4f2016','#85361f','#bf5a32','#e68a52','#f7bd88','#ffe3c0'],
 violet:['#150e2c','#2c1b58','#4d3190','#7653c9','#a384f0','#cfb9ff','#f0e6ff'],
 blue:['#08122a','#10285a','#1b4a96','#2f78cf','#5aa6f0','#a0d2ff','#e0f2ff'],
 green:['#0a1f10','#14401f','#23702f','#3ea044','#76cc5c','#b6ec88','#e8ffc8'],
 red:['#240808','#521414','#8c2020','#c63a30','#f0654f','#ff9f86','#ffd6c4'],
 skin:['#4a2a1c','#7d482c','#b06c40','#d9945f','#f2b98a','#ffdcb6','#fff0dc'],
 space:['#03050b','#060a16','#0a1124','#101a36']
};
const OUT='#04060c';
const hc={};
function rgb(c){if(hc[c])return hc[c];const n=parseInt(c.slice(1),16);return hc[c]=[(n>>16)&255,(n>>8)&255,n&255]}
class S{
 constructor(w,h){this.w=w;this.h=h;this.d=new Uint8ClampedArray(w*h*4)}
 set(x,y,c){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=this.w||y>=this.h)return;const o=(y*this.w+x)*4,k=rgb(c);this.d[o]=k[0];this.d[o+1]=k[1];this.d[o+2]=k[2];this.d[o+3]=255}
 has(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h&&this.d[(y*this.w+x)*4+3]>0}
 rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.set(x+i,y+j,c)}
 line(x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;for(;;){this.set(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
 ellipse(cx,cy,rx,ry,c){for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){const a=(x+.5-cx)/(rx+.25),b=(y+.5-cy)/(ry+.25);if(a*a+b*b<=1)this.set(x,y,c)}}
 circle(cx,cy,r,c){this.ellipse(cx,cy,r,r,c)}
 poly(p,c){let y0=Infinity,y1=-Infinity;p.forEach(q=>{y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});
  for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const yy=y+.5,xs=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=yy&&b[1]>yy)||(b[1]<=yy&&a[1]>yy))xs.push(a[0]+(yy-a[1])/(b[1]-a[1])*(b[0]-a[0]))}
   xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.round(xs[i]);x<Math.round(xs[i+1]);x++)this.set(x,y,c)}}
 blit(o,x=0,y=0){for(let j=0;j<o.h;j++)for(let i=0;i<o.w;i++){const k=(j*o.w+i)*4;if(o.d[k+3]){const X=i+x,Y=j+y;if(X<0||Y<0||X>=this.w||Y>=this.h)continue;const q=(Y*this.w+X)*4;this.d[q]=o.d[k];this.d[q+1]=o.d[k+1];this.d[q+2]=o.d[k+2];this.d[q+3]=255}}}
 outline(c){const m=this.d.slice(),W=this.w,H=this.h,a=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&m[(y*W+x)*4+3]>0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(a(x,y))continue;if(a(x-1,y)||a(x+1,y)||a(x,y-1)||a(x,y+1))this.set(x,y,c)}}
}
function h2(x,y,s){const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)}
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=h2(xi,yi,s),b=h2(xi+1,yi,s),c=h2(xi,yi+1,s),d=h2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s){return vn(x,y,s)*.5+vn(x*2,y*2,s+1)*.3+vn(x*4,y*4,s+2)*.2}
const B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const bay=(x,y)=>(B4[y&3][x&3]+.5)/16-.5;
const pick=(r,t,x,y)=>r[Math.max(0,Math.min(r.length-1,Math.round(t*(r.length-1)+bay(Math.floor(x),Math.floor(y))*.95)))];
const norm=v=>{const m=Math.hypot(...v);return v.map(q=>q/m)};

function stars(s,seed,n,ymax){for(let i=0;i<n;i++){const x=Math.floor(h2(i,1,seed)*s.w),y=Math.floor(h2(i,2,seed)*(ymax||s.h)),b=h2(i,3,seed);
 s.set(x,y,b>.85?PAL.steel[6]:b>.5?PAL.steel[5]:PAL.steel[3]);
 if(b>.94){[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,c])=>s.set(x+a,y+c,PAL.steel[4]))}}}
function nebula(s,seed,tint){for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const n=fbm(x/17+seed,y/13,seed),v=(n-.47)*2.5;
 s.set(x,y,v>.06?pick(tint.slice(0,4),Math.min(.95,v),x,y):pick(PAL.space,y/s.h*.95,x,y))}}
function planet(s,cx,cy,r,o){const L=norm(o.light||[-.55,-.5,.62]);
 for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){
  const nx=(x+.5-cx)/r,ny=(y+.5-cy)/r,d=nx*nx+ny*ny;if(d>1)continue;const nz=Math.sqrt(1-d);
  const l=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]),n=fbm(nx*2.6+o.seed*3.1,ny*2.6+o.seed,o.seed);
  let ramp=o.land,base=.12+.86*l;
  if(o.sea&&n<(o.seaLevel||.5))ramp=o.sea;
  if(o.bands){const b=Math.sin((ny+n*.4)*o.bands)*.5+.5;ramp=b>.5?o.land:(o.sea||o.land)}
  if(o.caps&&Math.abs(ny)>.84-n*.12){ramp=PAL.steel;base=.35+.65*l}
  if(o.cloud&&fbm(nx*3.4+o.seed*7,ny*4+3,o.seed+5)>o.cloud){ramp=PAL.steel;base=.4+.58*l}
  s.set(x,y,pick(ramp,base,x,y));
  if(o.atmo&&nz<.28&&l>.1)s.set(x,y,o.atmo);
  if(o.lights&&l<.1&&h2(x,y,o.seed)>.9&&n>(o.seaLevel||.5))s.set(x,y,h2(x,y,3)>.5?PAL.amber[5]:PAL.amber[4]);
 }}
function sph(s,cx,cy,r,ramp,lx=-.5,ly=-.6){const lz=Math.sqrt(Math.max(.05,1-lx*lx-ly*ly));
 for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){const nx=(x+.5-cx)/r,ny=(y+.5-cy)/r,d=nx*nx+ny*ny;if(d>1)continue;
  const l=Math.max(0,nx*lx+ny*ly+Math.sqrt(1-d)*lz);s.set(x,y,pick(ramp,.1+.88*l,x,y))}}
function box3d(s,x,y,w,h,r){s.rect(x,y,w,h,r[3]);s.rect(x,y,w,1,r[5]);s.rect(x,y,1,h,r[4]);s.rect(x+w-1,y,1,h,r[2]);s.rect(x,y+h-1,w,1,r[1]);s.rect(x+w-2,y+1,1,h-2,r[2])}
function cyl(s,x,y,w,h,r){const ry=Math.max(2,Math.round(w/5)),cx=x+(w-1)/2;
 for(let i=0;i<w;i++){const u=i/(w-1),t=Math.max(0,1-Math.abs(u-.3)/.85),k=(i-(w-1)/2)/(w/2),ex=Math.round(ry*Math.sqrt(Math.max(0,1-k*k)));
  for(let j=y+ry;j<y+h-ry+ex;j++)s.set(x+i,j,pick(r,.12+.78*t,x+i,j))}
 s.ellipse(cx+.5,y+ry,w/2,ry,r[5]);s.ellipse(cx+.5,y+ry,w/2-1.5,ry-1,r[4])}
function coin(s,cx,cy,rx){const ry=Math.max(2,Math.round(rx*.42));s.ellipse(cx,cy+1.5,rx,ry,PAL.amber[2]);s.ellipse(cx,cy,rx,ry,PAL.amber[5]);s.ellipse(cx,cy,rx-1.5,Math.max(1,ry-1),PAL.amber[4]);s.set(cx-rx*.4,cy-1,PAL.amber[6])}
function coins(s,cx,by,n,rx){for(let k=0;k<n;k++)coin(s,cx,by-k*2.5,rx)}
function glow(s,cx,cy,r,ramp){for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){const d=Math.hypot(x-cx,y-cy)/r;if(d<1&&!s.has(x,y)){const t=1-d;if(t>.45)s.set(x,y,pick(ramp,t,x,y))}}}

/* ---- backdrops ---- */
function cardBg(tint,seed){const s=new S(88,52);
 for(let y=0;y<52;y++)for(let x=0;x<88;x++){let c=pick(PAL.space,y/52*.9,x,y);const d=Math.hypot((x-44)/40,(y-26)/26);
  if(d<1){const g=(1-d)*.85;if(g>.2)c=pick(tint.slice(0,5),g*.8,x,y)}s.set(x,y,c)}
 stars(s,seed,16);for(let x=0;x<88;x++)s.set(x,51,PAL.space[0]);return s}

/* ---- destination scenes (88x52) ---- */
function rock(s,cx,cy,r,seed,ice){for(let y=Math.floor(cy-r-1);y<=cy+r+1;y++)for(let x=Math.floor(cx-r-1);x<=cx+r+1;x++){
 const a=(x+.5-cx)/r,b=(y+.5-cy)/r,ang=Math.atan2(b,a),rr=1+(vn(Math.cos(ang)*2+seed,Math.sin(ang)*2,seed)-.5)*.5;if(a*a+b*b>rr*rr)continue;
 const l=Math.max(0,a*-.55+b*-.5+.5),n=fbm(x/3,y/3,seed);let c=pick(PAL.steel,.1+.62*l+n*.18,x,y);
 if(ice&&n>.56)c=pick(PAL.blue,.45+.5*l,x,y);s.set(x,y,c)}}
const SCENES={
 Harrow(s,seed){nebula(s,seed,PAL.teal);stars(s,seed,22,34);
  planet(s,60,38,26,{land:PAL.green,sea:PAL.blue,seaLevel:.52,seed:seed+2,cloud:.6,atmo:PAL.blue[5],caps:true});
  const m=new S(88,52);sph(m,16,15,6,PAL.steel);m.outline(OUT);s.blit(m)},
 'Port Calder'(s,seed){nebula(s,seed+3,PAL.amber);stars(s,seed,22,34);
  planet(s,26,36,23,{land:PAL.rust,sea:PAL.amber,seaLevel:.42,seed:seed+5,atmo:PAL.amber[5]});
  const L=new S(88,52);L.ellipse(62,22,17,5,PAL.steel[2]);L.ellipse(62,22,14,3,PAL.space[1]);
  box3d(L,57,16,10,12,PAL.steel);L.rect(59,19,6,2,PAL.amber[5]);L.rect(59,23,6,2,PAL.teal[4]);
  L.rect(40,20,10,4,PAL.blue[3]);L.rect(40,20,10,1,PAL.blue[5]);L.rect(74,20,10,4,PAL.blue[3]);L.rect(74,20,10,1,PAL.blue[5]);L.line(50,22,57,22,PAL.steel[4]);L.line(67,22,74,22,PAL.steel[4]);
  L.rect(62,8,1,8,PAL.steel[4]);L.set(62,7,PAL.red[4]);L.outline(OUT);s.blit(L)},
 'Tern Belt'(s,seed){nebula(s,seed+7,PAL.blue);stars(s,seed,26);
  [[18,34,9,1],[44,18,12,2],[68,36,10,3],[70,10,5,4],[30,10,4,5],[52,44,4,6]].forEach(([x,y,r,k])=>{const L=new S(88,52);rock(L,x,y,r,seed+k,k%2===0);L.outline(OUT);s.blit(L)});
  for(let i=0;i<30;i++)s.set(h2(i,5,seed)*88,h2(i,6,seed)*52,PAL.steel[3])},
 'Lumen Gate'(s,seed){nebula(s,seed+11,PAL.violet);stars(s,seed,24);
  for(let y=0;y<52;y++)for(let x=0;x<88;x++){const d=Math.hypot(x-44,y-26);if(d<15)s.set(x,y,pick(PAL.violet.slice(3).concat(['#ffffff']),1-d/15,x,y))}
  const L=new S(88,52);for(let y=0;y<52;y++)for(let x=0;x<88;x++){const d=Math.hypot(x+.5-44,y+.5-26);if(d<=22&&d>=15){const l=Math.max(0,(x-44)*-.5+(y-26)*-.6)/22;L.set(x,y,pick(PAL.steel,.2+.6*l+(((x>>2)+(y>>2))&1?.08:0),x,y))}}
  for(let a=0;a<12;a++){const t=a/12*Math.PI*2;L.rect(44+Math.cos(t)*18.5-1,26+Math.sin(t)*18.5-1,3,3,a%2?PAL.violet[5]:PAL.amber[5])}
  L.outline(OUT);s.blit(L);
  const sh=new S(88,52);sh.poly([[26,40],[40,36],[44,38],[40,42],[26,43]],PAL.steel[5]);sh.rect(40,38,3,2,PAL.teal[5]);sh.rect(22,39,4,3,PAL.amber[5]);sh.outline(OUT);s.blit(sh)},
 Brindle(s,seed){nebula(s,seed+13,PAL.rust);stars(s,seed,22,32);
  planet(s,52,34,25,{land:PAL.rust,sea:PAL.red,seaLevel:.4,seed:seed+9,light:[.6,-.5,.45],lights:true,atmo:PAL.amber[4]});
  const L=new S(88,52);L.rect(6,8,2,36,PAL.steel[3]);L.rect(18,8,2,36,PAL.steel[3]);for(let y=10;y<44;y+=8){L.rect(6,y,14,2,PAL.steel[4]);L.line(7,y,19,y+8,PAL.steel[2])}
  box3d(L,2,24,10,8,PAL.amber);L.rect(4,26,3,2,PAL.amber[6]);L.rect(16,16,8,6,PAL.steel[2]);L.set(21,17,PAL.red[4]);L.outline(OUT);s.blit(L)}
};
function scene(dest,seed){const s=new S(88,52);(SCENES[dest]||SCENES.Harrow)(s,seed||1);return s}

/* ---- card emblems ---- */
function fighter(L,x,y){L.poly([[x,y+4],[x+8,y+1],[x+20,y+4],[x+8,y+7]],PAL.steel[4]);L.poly([[x+4,y+2],[x+1,y-5],[x+11,y+1]],PAL.steel[3]);L.poly([[x+4,y+6],[x+1,y+13],[x+11,y+7]],PAL.steel[3]);L.rect(x+13,y+3,4,2,PAL.amber[5]);L.rect(x-3,y+3,3,2,PAL.amber[5]);L.rect(x-6,y+3,3,2,PAL.amber[3]);L.set(x+9,y+4,PAL.steel[6])}
const EMB={
 scrip(L){coins(L,24,44,4,8);coins(L,44,44,7,9);coins(L,64,44,3,8);L.set(36,10,PAL.amber[6]);L.set(35,10,PAL.amber[5]);L.set(37,10,PAL.amber[5]);L.set(36,9,PAL.amber[5]);L.set(36,11,PAL.amber[5])},
 drum(L){cyl(L,10,22,16,26,PAL.teal);L.rect(10,32,16,2,PAL.teal[1]);cyl(L,34,6,24,40,PAL.rust);
  L.rect(34,15,24,3,PAL.rust[1]);L.rect(34,32,24,3,PAL.rust[1]);L.rect(34,16,24,1,PAL.amber[4]);L.rect(34,33,24,1,PAL.amber[4]);
  L.poly([[46,20],[50,25],[48,29],[45,29],[43,25]],PAL.amber[5]);L.poly([[46,23],[48,26],[47,29],[45,29]],PAL.amber[6]);
  cyl(L,64,28,14,20,PAL.amber)},
 sample(L){L.poly([[12,42],[18,24],[34,12],[54,18],[66,34],[60,45],[28,47]],PAL.rust[3]);
  L.poly([[18,24],[34,12],[40,28],[26,36]],PAL.rust[5]);L.poly([[40,28],[34,12],[54,18],[50,30]],PAL.rust[4]);L.poly([[50,30],[54,18],[66,34],[60,45],[48,42]],PAL.rust[2]);L.poly([[26,36],[40,28],[50,30],[48,42],[28,47],[12,42]],PAL.rust[3]);
  L.line(28,38,44,33,PAL.amber[5]);L.line(30,41,46,38,PAL.amber[4]);
  L.poly([[66,40],[70,24],[74,40]],PAL.teal[4]);L.poly([[70,40],[76,30],[80,42]],PAL.teal[3]);L.poly([[70,24],[72,32],[70,40]],PAL.teal[6]);
  L.rect(24,22,2,2,PAL.rust[6]);L.rect(44,17,2,2,PAL.rust[6])},
 rig(L){box3d(L,20,18,48,26,PAL.teal);for(let x=24;x<66;x+=6){L.rect(x,20,1,22,PAL.teal[2])}
  L.rect(12,8,64,5,PAL.steel[3]);L.rect(12,8,64,1,PAL.steel[5]);L.rect(12,8,6,34,PAL.steel[3]);L.rect(70,8,6,34,PAL.steel[3]);L.rect(12,8,2,34,PAL.steel[5]);L.rect(70,8,2,34,PAL.steel[5]);
  L.rect(12,42,8,3,PAL.amber[3]);L.rect(68,42,8,3,PAL.amber[3]);
  [[36,28],[44,28],[52,28]].forEach(([x,y])=>{L.poly([[x,y+4],[x+3,y],[x+6,y+4],[x+4,y+4],[x+3,y+2],[x+2,y+4]],PAL.amber[5])})},
 deal(L){box3d(L,14,6,34,40,PAL.steel);L.rect(15,7,32,38,PAL.steel[6]);for(let i=0;i<5;i++)L.rect(19,12+i*5,i%2?20:26,2,PAL.steel[3]);
  L.line(19,38,28,34,PAL.blue[3]);L.line(28,34,34,38,PAL.blue[3]);L.circle(40,38,4,PAL.red[3]);L.circle(40,38,2,PAL.red[5]);L.rect(37,41,2,5,PAL.red[3]);L.rect(41,41,2,5,PAL.red[3]);
  coins(L,66,44,5,9);coin(L,56,22,6);L.poly([[56,14],[60,9],[64,14]],PAL.amber[6])},
 house(L){sph(L,44,26,21,PAL.steel,-.5,-.55);L.circle(44,26,15,PAL.steel[2]);sph(L,44,26,13,PAL.steel,.4,.5);
  for(let a=0;a<8;a++){const t=a/8*Math.PI*2;L.rect(44+Math.cos(t)*17.5-1,26+Math.sin(t)*17.5-1,2,2,PAL.steel[6])}
  for(let a=0;a<3;a++){const t=a/3*Math.PI*2+.5;L.line(44,26,44+Math.cos(t)*11,26+Math.sin(t)*11,PAL.amber[5]);L.circle(44+Math.cos(t)*11,26+Math.sin(t)*11,2,PAL.amber[5])}
  sph(L,44,26,4,PAL.amber);coins(L,74,46,3,7)},
 pack(L){[[10,18],[34,18],[58,18]].forEach(([x,y],i)=>{cyl(L,x,y,20,30,i===1?PAL.teal:PAL.blue);L.rect(x+3,y+12,14,2,PAL.steel[6])});
  L.poly([[46,4],[30,28],[40,28],[34,46],[58,20],[47,20],[54,4]],PAL.amber[5]);L.poly([[46,4],[40,16],[50,16],[54,4]],PAL.amber[6]);L.line(36,34,42,28,PAL.amber[3])},
 borer(L){L.poly([[4,50],[10,42],[26,40],[44,44],[62,40],[78,42],[84,50]],PAL.steel[3]);L.poly([[26,40],[44,44],[40,50],[10,50],[10,42]],PAL.steel[2]);L.line(44,44,40,49,PAL.space[0]);
  box3d(L,28,2,32,10,PAL.amber);L.rect(32,4,24,2,PAL.amber[6]);L.rect(40,12,8,3,PAL.steel[4]);
  L.poly([[33,15],[55,15],[44,42]],PAL.steel[4]);for(let i=0;i<4;i++){const y=17+i*6,hw=10-i*2.6;L.line(44-hw,y,44+hw-2,y+3,PAL.steel[6]);L.line(44-hw,y+2,44+hw-2,y+5,PAL.steel[2])}
  [[34,38],[54,38],[38,41],[50,41],[28,36],[60,36],[31,32]].forEach(([x,y])=>L.set(x,y,PAL.amber[5]));L.set(44,43,PAL.amber[6])},
 vault(L){box3d(L,16,6,30,40,PAL.blue);for(let i=0;i<5;i++){L.rect(19,10+i*7,24,5,PAL.blue[0]);L.rect(21,12+i*7,3,1,PAL.teal[5]);L.rect(26,12+i*7,3,1,i%2?PAL.amber[5]:PAL.teal[4]);L.rect(37,12+i*7,4,1,PAL.blue[4])}
  const cx=62,cy=24,q=9;L.line(cx-q,cy,cx,cy-q/2-2,PAL.teal[5]);L.line(cx,cy-q/2-2,cx+q,cy,PAL.teal[5]);L.line(cx,cy+q/2+2,cx+q,cy,PAL.teal[5]);L.line(cx-q,cy,cx,cy+q/2+2,PAL.teal[5]);
  L.line(cx-q,cy,cx-q,cy+q,PAL.teal[4]);L.line(cx+q,cy,cx+q,cy+q,PAL.teal[4]);L.line(cx,cy+q/2+2,cx,cy+q+q/2+2,PAL.teal[4]);L.line(cx-q,cy+q,cx,cy+q+q/2+2,PAL.teal[4]);L.line(cx+q,cy+q,cx,cy+q+q/2+2,PAL.teal[4]);
  L.line(cx-q,cy,cx,cy+q/2+2,PAL.teal[6]);L.circle(cx,cy+4,2,PAL.teal[6]);L.line(46,26,53,26,PAL.teal[4]);L.line(46,30,52,34,PAL.teal[4])},
 quarter(L){L.poly([[14,50],[18,36],[32,31],[56,31],[70,36],[74,50]],PAL.teal[3]);L.poly([[32,31],[44,42],[56,31]],PAL.teal[1]);L.poly([[38,31],[44,40],[50,31]],PAL.steel[6]);
  L.rect(40,26,8,7,PAL.skin[3]);sph(L,44,19,9,PAL.skin,-.5,-.5);L.rect(34,18,2,5,PAL.skin[2]);L.rect(52,18,2,5,PAL.skin[2]);
  L.rect(35,8,18,6,PAL.teal[2]);L.rect(35,8,18,1,PAL.teal[4]);L.rect(33,13,22,2,PAL.teal[1]);L.rect(42,9,4,4,PAL.amber[5]);L.set(43,10,PAL.amber[6]);
  L.rect(40,19,2,2,PAL.space[0]);L.rect(46,19,2,2,PAL.space[0]);L.rect(42,24,4,1,PAL.skin[1]);
  L.line(54,19,57,26,PAL.steel[5]);L.rect(55,26,4,3,PAL.steel[4]);L.rect(16,42,6,3,PAL.amber[4]);L.rect(66,42,6,3,PAL.amber[4])},
 barge(L){L.poly([[6,40],[82,40],[76,48],[12,48]],PAL.steel[2]);L.rect(6,38,76,3,PAL.steel[4]);
  [[12,PAL.rust],[28,PAL.teal],[44,PAL.amber]].forEach(([x,r])=>box3d(L,x,27,15,11,r));[[20,PAL.blue],[36,PAL.red]].forEach(([x,r])=>box3d(L,x,16,15,11,r));
  for(let x=14;x<56;x+=3){L.rect(x,29,1,7,PAL.space[1]);}
  box3d(L,64,24,14,14,PAL.steel);L.rect(66,27,10,4,PAL.teal[5]);L.rect(70,16,2,8,PAL.steel[4]);L.set(71,15,PAL.red[4]);L.rect(8,44,60,1,PAL.steel[4])},
 gunship(L){L.poly([[22,6],[34,6],[46,24],[34,24]],PAL.steel[3]);L.poly([[22,46],[34,46],[46,28],[34,28]],PAL.steel[2]);
  L.poly([[8,26],[24,20],[58,20],[76,26],[58,32],[24,32]],PAL.steel[4]);L.poly([[24,20],[58,20],[76,26],[58,23],[24,23]],PAL.steel[6]);L.poly([[24,32],[58,32],[76,26],[58,29],[24,29]],PAL.steel[2]);
  L.poly([[50,22],[62,22],[68,26],[62,28],[50,28]],PAL.amber[4]);L.poly([[52,22],[60,22],[63,24],[52,24]],PAL.amber[6]);
  L.rect(30,12,16,2,PAL.steel[6]);L.rect(30,38,16,2,PAL.steel[4]);L.rect(0,24,8,4,PAL.amber[5]);L.rect(0,25,5,2,PAL.amber[6]);
  L.rect(54,15,18,2,PAL.steel[1]);L.rect(54,35,18,2,PAL.steel[1]);L.rect(72,15,16,1,PAL.red[5]);L.rect(72,35,16,1,PAL.red[5]);L.rect(74,14,10,3,PAL.red[3]);L.rect(74,34,10,3,PAL.red[3])},
 probe(L){L.rect(14,22,22,4,PAL.blue[3]);L.rect(52,22,22,4,PAL.blue[3]);for(let x=16;x<36;x+=5){L.rect(x,22,1,4,PAL.blue[5])}for(let x=54;x<74;x+=5){L.rect(x,22,1,4,PAL.blue[5])}L.rect(36,23,4,2,PAL.steel[3]);L.rect(48,23,4,2,PAL.steel[3]);
  sph(L,44,24,10,PAL.steel);L.circle(44,25,5,PAL.space[0]);L.circle(44,25,3,PAL.blue[2]);L.set(42,23,PAL.teal[6]);L.set(43,23,PAL.teal[5]);
  L.line(50,17,60,6,PAL.steel[5]);L.poly([[56,4],[66,4],[64,10],[58,10]],PAL.steel[4]);L.rect(60,2,2,3,PAL.red[4]);
  for(let r=18;r<=26;r+=4)for(let a=-50;a<=50;a+=9){const t=a*Math.PI/180;L.set(44+Math.cos(t)*r+8,25+Math.sin(t)*r,PAL.teal[r>20?3:5])}
  L.rect(40,35,8,6,PAL.steel[3]);L.rect(42,41,4,3,PAL.amber[5])},
 broker(L){box3d(L,8,4,72,36,PAL.steel);L.rect(11,7,66,28,PAL.blue[0]);for(let y=10;y<34;y+=6)L.rect(11,y,66,1,PAL.blue[1]);
  [[16,18,10,1],[23,14,12,0],[30,16,8,0],[37,10,12,0],[44,13,9,1],[51,8,12,0],[58,10,8,0],[65,6,10,0]].forEach(([x,y,h,r])=>{const c=r?PAL.red:PAL.green;L.rect(x+1,y-2,1,h+4,c[4]);L.rect(x-1,y,5,h,c[4]);L.rect(x-1,y,1,h,c[5])});
  L.line(14,32,28,22,PAL.amber[5]);L.line(28,22,40,24,PAL.amber[5]);L.line(40,24,54,14,PAL.amber[5]);L.line(54,14,72,9,PAL.amber[5]);
  L.rect(38,40,12,4,PAL.steel[3]);box3d(L,26,44,36,4,PAL.steel)},
 deck(L){L.rect(12,22,50,24,PAL.steel[3]);box3d(L,12,22,50,24,PAL.steel);for(let i=0;i<3;i++)L.poly([[14+i*16,22],[14+i*16,14],[28+i*16,22]],PAL.steel[3]);
  cyl(L,20,4,9,20,PAL.rust);cyl(L,44,6,9,18,PAL.rust);L.rect(20,5,9,2,PAL.rust[1]);L.rect(44,7,9,2,PAL.rust[1]);
  L.rect(30,32,16,10,PAL.space[0]);L.rect(31,33,14,8,PAL.amber[3]);L.rect(34,35,8,5,PAL.amber[5]);L.rect(36,36,4,3,PAL.amber[6]);
  L.rect(64,34,16,4,PAL.rust[3]);L.rect(64,34,16,1,PAL.rust[5]);cyl(L,66,14,12,22,PAL.steel);L.rect(72,24,2,10,PAL.rust[4]);
  [[22,0,3],[26,-2,2],[46,2,3]].forEach(([x,y,r])=>sph(L,x+4,y+3,r,PAL.steel,-.3,-.5));L.rect(16,26,3,2,PAL.teal[5]);L.rect(52,26,3,2,PAL.amber[5])},
 wing(L){fighter(L,50,22);fighter(L,26,8);fighter(L,26,36);L.rect(0,26,20,1,PAL.amber[4]);L.rect(8,12,12,1,PAL.amber[3]);L.rect(8,40,12,1,PAL.amber[3]);L.rect(72,26,12,2,PAL.red[4])},
 buyout(L){box3d(L,18,20,52,28,PAL.rust);L.rect(18,32,52,2,PAL.rust[1]);L.rect(19,21,50,1,PAL.rust[5]);
  L.rect(34,12,20,8,PAL.steel[4]);L.rect(37,15,14,5,PAL.rust[2]);L.rect(34,12,20,1,PAL.steel[6]);
  box3d(L,40,28,8,10,PAL.amber);L.rect(43,31,2,4,PAL.amber[1]);
  coin(L,78,12,6);coin(L,82,28,5);coin(L,76,42,6);
  [[70,14],[72,30],[68,42]].forEach(([x,y])=>L.poly([[x,y],[x-5,y-3],[x-5,y+3]],PAL.red[5]));L.line(70,14,58,16,PAL.red[4]);L.line(72,30,70,31,PAL.red[4])}
};
const TINT={scrip:PAL.amber,drum:PAL.amber,sample:PAL.rust,rig:PAL.teal,deal:PAL.amber,house:PAL.blue,pack:PAL.teal,borer:PAL.rust,vault:PAL.blue,quarter:PAL.teal,barge:PAL.teal,gunship:PAL.red,probe:PAL.violet,broker:PAL.blue,deck:PAL.amber,wing:PAL.red,buyout:PAL.red};
function cardArt(k){const s=cardBg(TINT[k]||PAL.teal,k.length*7+k.charCodeAt(0));const L=new S(88,52);EMB[k](L);L.outline(OUT);s.blit(L);return s}

/* ---- hero freighter (144x64) ---- */
function hero(){const s=new S(144,64);nebula(s,4,PAL.violet);stars(s,9,40);
 planet(s,118,66,36,{land:PAL.teal,sea:PAL.blue,seaLevel:.5,seed:3,cloud:.62,atmo:PAL.blue[5]});
 const L=new S(144,64),ox=12,oy=2;const R=(x,y,w,h,c)=>L.rect(x+ox,y+oy,w,h,c);
 // flames
 [[26,22],[26,34]].forEach(([y0,_],i)=>{const y=[24,34][i];L.poly([[ox-8,y+oy+2],[ox+2,y+oy-1],[ox+2,y+oy+5]],PAL.amber[4]);L.poly([[ox-3,y+oy+2],[ox+2,y+oy],[ox+2,y+oy+4]],PAL.amber[6])});
 box3d(L,ox+2,oy+20,16,24,PAL.steel);R(2,23,3,5,PAL.steel[1]);R(2,33,3,5,PAL.steel[1]);R(6,26,10,1,PAL.steel[2]);R(6,36,10,1,PAL.steel[2]);
 box3d(L,ox+18,oy+27,86,10,PAL.steel);for(let x=24;x<100;x+=8)R(x,30,1,4,PAL.steel[1]);
 const cs=[PAL.rust,PAL.teal,PAL.amber,PAL.blue,PAL.red,PAL.green];
 for(let i=0;i<6;i++){const x=22+i*14;[[x,13],[x,37]].forEach(([cx,cy],j)=>{const r=cs[(i*2+j*3+j)%6];R(cx,cy,13,13,r[3]);R(cx,cy,13,1,r[5]);R(cx+12,cy,1,13,r[2]);R(cx,cy+12,13,1,r[1]);for(let k=2;k<12;k+=3)R(cx+k,cy+2,1,10,r[2]);R(cx+1,cy+1,1,11,r[4])})}
 L.poly([[ox+104,oy+22],[ox+118,oy+28],[ox+126,oy+32],[ox+118,oy+38],[ox+104,oy+42]],PAL.steel[4]);L.poly([[ox+104,oy+22],[ox+118,oy+28],[ox+126,oy+32],[ox+104,oy+30]],PAL.steel[6]);
 L.poly([[ox+112,oy+28],[ox+122,oy+31],[ox+118,oy+34],[ox+112,oy+34]],PAL.amber[5]);L.rect(ox+114,oy+29,3,2,PAL.amber[6]);
 box3d(L,ox+98,oy+25,8,14,PAL.steel);R(90,6,1,7,PAL.steel[4]);L.set(ox+90,oy+5,PAL.red[4]);L.set(ox+124,oy+32,PAL.red[5]);
 L.rect(ox+40,oy+30,2,2,PAL.teal[5]);L.rect(ox+70,oy+30,2,2,PAL.amber[5]);
 L.outline(OUT);s.blit(L);return s}

/* ---- tiny icons (10x10) ---- */
const ICON_MAP={
 fuel:{c:{o:'#4a1c06',O:'#d2701a',Y:'#ffd05a',w:'#fff6c8'},m:['....oo....','...oOOo...','..oOYYOo..','.oOYYYYOo.','.oOYwYYOo.','oOYwYYYYOo','oOYYYYYYOo','oOOYYYYOOo','.oOOOOOOo.','..oooooo..']},
 ore:{c:{o:'#2a0f0a',R:'#bf5a32',r:'#e68a52',d:'#85361f',w:'#f7bd88'},m:['...oooo...','..orrwro..','.orrwRRRo.','orwRRRRRRo','oRRRRRddRo','oRRRRdddRo','oRRdddddRo','.odddddddo','..oddddo..','...oooo...']},
 tech:{c:{o:'#06122a',b:'#2f78cf',B:'#5aa6f0',w:'#d6f0ff',g:'#9ebdd3'},m:['..g.gg.g..','.oooooooo.','gobbbbbbog','.obwwbbbo.','gobwBBbbog','.obbBBbbo.','gobbbbbbog','.oooooooo.','..g.gg.g..','..........']},
 cr:{c:{o:'#3a2208',Y:'#f5b93c',w:'#fff0a8',d:'#c4801c'},m:['..oooooo..','.oYYYYYYo.','oYwwYYYYdo','oYwYddYYdo','oYYYdYYYdo','oYYYdYYYdo','oYYYddYYdo','oYYYYYYddo','.oddddddo.','..oooooo..']},
 combat:{c:{R:'#ff6f5c',d:'#b8362b'},m:['....RR....','..RRRRRR..','.RR.RR.RR.','.R..RR..R.','RRRRddRRRR','RRRRddRRRR','.R..RR..R.','.RR.RR.RR.','..RRRRRR..','....RR....']},
 cargo:{c:{o:'#0a1f10',w:'#b6ec88',g:'#3ea044',G:'#76cc5c',d:'#23702f'},m:['oooooooooo','owwwwwwwwo','ogGGggGGgo','ogGGggGGgo','oggggggggo','ogGGggGGgo','ogGGggGGgo','oddddddddo','oooooooooo','..........']},
 star:{c:{Y:'#ffd05a',d:'#d2701a'},m:['....YY....','....YY....','...YYYY...','YYYYYYYYYY','.YYYYYYYY.','..YYYYYY..','..YYYYYY..','.YYYYYYYY.','.YYYddYYY.','.YY....YY.']}
};
function icon(k){const m=ICON_MAP[k],s=new S(10,10);m.m.forEach((row,y)=>[...row].forEach((ch,x)=>{if(m.c[ch])s.set(x,y,m.c[ch])}));return s}

const cache={};
function toURL(s){const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const g=c.getContext('2d'),id=g.createImageData(s.w,s.h);id.data.set(s.d);g.putImageData(id,0,0);return c.toDataURL()}
function memo(key,fn){return cache[key]||(cache[key]=toURL(fn()))}
return {S,PAL,scene,cardArt,hero,icon,EMB,SCENES,
 sceneURL:(d,seed)=>memo('s:'+d+':'+(seed%4),()=>scene(d,(seed%4)+1)),
 cardURL:k=>memo('c:'+k,()=>cardArt(k)),heroURL:()=>memo('hero',hero),iconURL:k=>memo('i:'+k,()=>icon(k))};
})();
if(typeof module!=='undefined')module.exports=Sprites;

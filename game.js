/* ===================== BUNKER UNDEAD - game.js PART 1/2 ===================== */
"use strict";

/* ---- CONSTANTS ---- */
const AR=18, EYE=1.7, GRAV=18, FOV=70*Math.PI/180;
const BW=3.4; // window opening width

/* ---- MATH ---- */
const M4={
 ident:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
 mul(a,b){const o=new Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
 trans:(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1],
 scale:(x,y,z)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1],
 rotX(a){const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];},
 rotY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];},
 rotZ(a){const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];},
 persp(f,a,n,fa){const t=1/Math.tan(f/2),nf=1/(n-fa);return[t/a,0,0,0,0,t,0,0,0,0,(fa+n)*nf,-1,0,0,2*fa*n*nf,0];},
 nmat(m){const a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10];const A=e*i-f*h,B=f*g-d*i,C=d*h-e*g;let t=a*A+b*B+c*C;if(!t)return[1,0,0,0,1,0,0,0,1];t=1/t;
  return[A*t,B*t,C*t,(c*h-b*i)*t,(a*i-c*g)*t,(b*g-a*h)*t,(b*f-c*e)*t,(c*d-a*f)*t,(a*e-b*d)*t];}
};
function TRS(px,py,pz,rx,ry,rz,sx,sy,sz){let m=M4.trans(px,py,pz);if(ry)m=M4.mul(m,M4.rotY(ry));if(rx)m=M4.mul(m,M4.rotX(rx));if(rz)m=M4.mul(m,M4.rotZ(rz));return M4.mul(m,M4.scale(sx,sy,sz));}

/* ---- GL SETUP ---- */
const cv=document.getElementById('cv');
const gl=cv.getContext('webgl',{antialias:true,powerPreference:'high-performance'});
const VS=`attribute vec3 a_pos;attribute vec3 a_nrm;attribute vec2 a_uv;uniform mat4 u_proj,u_view,u_model;uniform mat3 u_nmat;varying vec3 vp,vn;varying vec2 vu;void main(){vec4 w=u_model*vec4(a_pos,1.);vp=w.xyz;vn=u_nmat*a_nrm;vu=a_uv;gl_Position=u_proj*u_view*w;}`;
const FS=`precision mediump float;varying vec3 vp,vn;varying vec2 vu;uniform sampler2D u_tex;uniform vec3 u_tint,u_cam,u_amb,u_dd,u_dc,u_fog;uniform vec2 u_uvs;uniform float u_fogD,u_emis;uniform int u_nl;uniform vec3 u_lp[8],u_lc[8];uniform float u_lr[8];
void main(){vec3 t=texture2D(u_tex,vu*u_uvs).rgb*u_tint;vec3 N=normalize(vn);vec3 c=u_amb*t+t*u_dc*max(dot(N,-normalize(u_dd)),0.);
for(int i=0;i<8;i++){if(i>=u_nl)break;vec3 L=u_lp[i]-vp;float d=length(L);float a=max(0.,1.-d/u_lr[i]);a*=a;c+=t*u_lc[i]*max(dot(N,normalize(L)),0.)*a;}
c+=t*u_emis;float fg=clamp(1.-exp(-u_fogD*length(u_cam-vp)),0.,1.);gl_FragColor=vec4(mix(c,u_fog,fg),1.);}`;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}
const PR=gl.createProgram();gl.attachShader(PR,sh(gl.VERTEX_SHADER,VS));gl.attachShader(PR,sh(gl.FRAGMENT_SHADER,FS));
gl.bindAttribLocation(PR,0,'a_pos');gl.bindAttribLocation(PR,1,'a_nrm');gl.bindAttribLocation(PR,2,'a_uv');gl.linkProgram(PR);gl.useProgram(PR);
const U={};'u_proj u_view u_model u_nmat u_tex u_tint u_uvs u_cam u_amb u_dd u_dc u_fog u_fogD u_emis u_nl u_lp u_lc u_lr'.split(' ').forEach(n=>U[n]=gl.getUniformLocation(PR,n));
gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);

/* ---- CUBE GEOMETRY ---- */
function bc(){const p=[],n=[],u=[],x=[];const F=[[0,0,1,-.5,-.5,.5,1,0,0,0,1,0],[0,0,-1,.5,-.5,-.5,-1,0,0,0,1,0],[1,0,0,.5,-.5,.5,0,0,-1,0,1,0],[-1,0,0,-.5,-.5,-.5,0,0,1,0,1,0],[0,1,0,-.5,.5,.5,1,0,0,0,0,-1],[0,-1,0,-.5,-.5,-.5,1,0,0,0,0,1]];
F.forEach(f=>{const b=p.length/3;for(let v=0;v<4;v++){const a=v&1,c=(v>>1)&1;p.push(f[3]+f[6]*a+f[9]*c,f[4]+f[7]*a+f[10]*c,f[5]+f[8]*a+f[11]*c);n.push(f[0],f[1],f[2]);u.push(a,c);}x.push(b,b+1,b+2,b+2,b+1,b+3);});return{p,n,u,x};}
const CB=bc();
function vbf(t,a){const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,a,gl.STATIC_DRAW);return b;}
vbf(gl.ARRAY_BUFFER,new Float32Array(CB.p));gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
vbf(gl.ARRAY_BUFFER,new Float32Array(CB.n));gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
vbf(gl.ARRAY_BUFFER,new Float32Array(CB.u));gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
vbf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(CB.x));const NIDX=CB.x.length;

/* ---- TEXTURES ---- */
function mt(sz,fn){const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');fn(x,sz);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;}
function gr(x,s,a,r,g,b){for(let i=0;i<s*s*.4;i++){const v=(Math.random()-.5)*a;x.fillStyle='rgba('+(r+v|0)+','+(g+v|0)+','+(b+v|0)+',.5)';x.fillRect(Math.random()*s,Math.random()*s,1,1);}}
const T={
 floor:mt(128,(x,s)=>{x.fillStyle='#2b2b2e';x.fillRect(0,0,s,s);x.strokeStyle='#191a1c';x.lineWidth=2;for(let i=0;i<=s;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,s);x.moveTo(0,i);x.lineTo(s,i);x.stroke();}gr(x,s,30,55,55,60);}),
 wall:mt(128,(x,s)=>{x.fillStyle='#3a352f';x.fillRect(0,0,s,s);for(let y=0;y<s;y+=21){const o=(y/21%2)*22;for(let xx=-22;xx<s;xx+=44){x.fillStyle='#332e28';x.fillRect(xx+o+1,y+1,42,19);x.strokeStyle='#211d18';x.strokeRect(xx+o+1,y+1,42,19);}}gr(x,s,24,60,54,46);}),
 crate:mt(128,(x,s)=>{for(let i=0;i<s;i+=18){x.fillStyle=i/18%2?'#5c3f20':'#74522b';x.fillRect(0,i,s,17);}x.strokeStyle='#3d2913';x.lineWidth=6;x.strokeRect(3,3,s-6,s-6);gr(x,s,24,110,80,40);}),
 metal:mt(128,(x,s)=>{x.fillStyle='#444a50';x.fillRect(0,0,s,s);x.strokeStyle='#33383d';x.lineWidth=3;for(let i=0;i<=s;i+=42)x.strokeRect(i,0,42,s);x.fillStyle='#5a626b';for(let i=10;i<s;i+=42)for(let j=10;j<s;j+=42){x.beginPath();x.arc(i,j,3,0,7);x.fill();}gr(x,s,20,70,76,82);}),
 board:mt(64,(x,s)=>{x.fillStyle='#8a5e2e';x.fillRect(0,0,s,s);x.strokeStyle='rgba(60,40,18,.6)';for(let i=0;i<s;i+=8){x.beginPath();x.moveTo(0,i);x.lineTo(s,i);x.stroke();}gr(x,s,30,138,94,46);}),
 zskin:mt(64,(x,s)=>{x.fillStyle='#5a6b48';x.fillRect(0,0,s,s);for(let i=0;i<60;i++){x.fillStyle='rgba('+(40+Math.random()*40|0)+','+(60+Math.random()*40|0)+',40,.5)';x.beginPath();x.arc(Math.random()*s,Math.random()*s,1+Math.random()*4,0,7);x.fill();}}),
 cloth:mt(64,(x,s)=>{x.fillStyle='#3a3530';x.fillRect(0,0,s,s);gr(x,s,30,58,53,48);}),
 white:mt(8,x=>{x.fillStyle='#fff';x.fillRect(0,0,8,8);})
};

/* ---- DRAW HELPERS ---- */
let curTex=null;
function bindTex(t){if(curTex!==t){gl.bindTexture(gl.TEXTURE_2D,t);curTex=t;}}
function box(m,tex,tint,uvs,emis){bindTex(tex);gl.uniformMatrix4fv(U.u_model,false,new Float32Array(m));gl.uniformMatrix3fv(U.u_nmat,false,new Float32Array(M4.nmat(m)));gl.uniform3fv(U.u_tint,tint||[1,1,1]);gl.uniform2fv(U.u_uvs,uvs||[1,1]);gl.uniform1f(U.u_emis,emis||0);gl.drawElements(gl.TRIANGLES,NIDX,gl.UNSIGNED_SHORT,0);}

/* ---- LIGHTS ---- */
const LAMPS=[[0,5.4,0],[-11,5.4,-11],[11,5.4,-11],[-11,5.4,11],[11,5.4,11]];
const _lp=new Float32Array(24),_lc=new Float32Array(24),_lr=new Float32Array(8);
function setLights(list){const n=Math.min(8,list.length);for(let i=0;i<n;i++){_lp[i*3]=list[i].p[0];_lp[i*3+1]=list[i].p[1];_lp[i*3+2]=list[i].p[2];_lc[i*3]=list[i].c[0];_lc[i*3+1]=list[i].c[1];_lc[i*3+2]=list[i].c[2];_lr[i]=list[i].r;}
 gl.uniform1i(U.u_nl,n);gl.uniform3fv(U.u_lp,_lp);gl.uniform3fv(U.u_lc,_lc);gl.uniform1fv(U.u_lr,_lr);}

/* ---- MAP BUILD ---- */
const MAP=[], COLLIDERS=[], WINDOWS=[];
function addBox(px,py,pz,sx,sy,sz,tex,tint,uvs){MAP.push({m:TRS(px,py,pz,0,0,0,sx,sy,sz),tex,tint:tint||[1,1,1],uvs:uvs||[1,1]});}
function wallSegX(z){ // build wall along X with gaps at window X positions
  const winXs=[-7,7], t=0.8, H=6;
  let cuts=winXs.map(w=>[w-BW/2,w+BW/2]).sort((a,b)=>a[0]-b[0]);
  let x=-AR;
  cuts.forEach(c=>{ if(c[0]>x) addBox((x+c[0])/2,H/2,z,c[0]-x,H,t,T.wall,[1,1],[(c[0]-x)/3,H/3]); x=c[1]; });
  if(x<AR) addBox((x+AR)/2,H/2,z,AR-x,H,t,T.wall,[1,1],[(AR-x)/3,H/3]);
  winXs.forEach(wx=>{ addBox(wx,0.65,z,BW,1.3,t,T.metal,[.4,.4,.45],[BW/2,.6]); addBox(wx,4.5,z,BW,3.0,t,T.metal,[.4,.4,.45],[BW/2,1.5]); });
}
function wallSegZ(x){
  const winZs=[0], t=0.8, H=6;
  let cuts=winZs.map(w=>[w-BW/2,w+BW/2]).sort((a,b)=>a[0]-b[0]);
  let z=-AR;
  cuts.forEach(c=>{ if(c[0]>z) addBox(x,H/2,(z+c[0])/2,t,H,c[0]-z,T.wall,[1,1],[(c[0]-z)/3,H/3]); z=c[1]; });
  if(z<AR) addBox(x,H/2,(z+AR)/2,t,H,AR-z,T.wall,[1,1],[(AR-z)/3,H/3]);
  winZs.forEach(wz=>{ addBox(x,0.65,wz,t,1.3,BW,T.metal,[.4,.4,.45],[.6,BW/2]); addBox(x,4.5,wz,t,3.0,BW,T.metal,[.4,.4,.45],[1.5,BW/2]); });
}
function addCrate(x,z,s){addBox(x,s/2,z,s,s,s,T.crate,[1,1],[1,1]);COLLIDERS.push({x,z,hx:s/2+0.4,hz:s/2+0.4});}
function addWindow(cx,cz,inx,inz){
  WINDOWS.push({x:cx,z:cz,inx,inz,axis:(inx!==0?'z':'x'),
    outer:[cx-inx*3,0,cz-inz*3], boards:5, repair:0,
    bd:[{y:1.35,t:.05},{y:1.7,t:-.06},{y:2.05,t:.04},{y:2.4,t:-.05},{y:2.75,t:.06}]});
}
function buildMap(){
  MAP.length=0;COLLIDERS.length=0;WINDOWS.length=0;
  addBox(0,-0.05,0,2*AR,0.1,2*AR,T.floor,[.6,.6,.66],[AR,AR]);     // floor
  addBox(0,6,0,2*AR,0.2,2*AR,T.metal,[.32,.32,.36],[AR/2,AR/2]);    // ceiling
  wallSegX(-AR); wallSegX(AR); wallSegZ(-AR); wallSegZ(AR);          // walls w/ window gaps
  // props
  addCrate(-6,-3,1.7); addCrate(-7.6,-4.2,1.4); addCrate(8,5,2.0);
  addCrate(6.5,8,1.6); addCrate(0,11,1.7); addCrate(-10,9,1.8);
  addCrate(11,-6,1.6); addCrate(-2,-9,1.5);
  // pillars
  [[-9,-9],[9,-9],[-9,9],[9,9]].forEach(p=>{addBox(p[0],3,p[1],1,6,1,T.metal,[.5,.5,.55],[.5,3]);COLLIDERS.push({x:p[0],z:p[1],hx:.9,hz:.9});});
  // debris cubes (small, no collider)
  for(let i=0;i<10;i++){const x=(Math.random()*2-1)*15,z=(Math.random()*2-1)*15;addBox(x,0.15,z,0.5+Math.random(),0.3,0.5+Math.random(),T.crate,[.7,.6,.5],[1,1]);}
  // lamp fixtures (visual)
  LAMPS.forEach(l=>addBox(l[0],5.85,l[2],0.7,0.15,0.7,T.metal,[.2,.2,.22],[1,1]));
  // windows: N,S walls at x=-7,7 ; E,W walls at z=0
  addWindow(-7,-AR,0,1); addWindow(7,-AR,0,1);
  addWindow(-7,AR,0,-1); addWindow(7,AR,0,-1);
  addWindow(-AR,0,1,0); addWindow(AR,0,-1,0);
}
buildMap();

/* ---- AUDIO (procedural) ---- */
let AC=null;
function initAudio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}}
function tone(f,d,type,v){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=v||0.12;o.connect(g);g.connect(AC.destination);const t=AC.currentTime;o.start(t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.stop(t+d);}
function noiseBurst(d,v){if(!AC)return;const n=Math.floor(AC.sampleRate*d),b=AC.createBuffer(1,n,AC.sampleRate),da=b.getChannelData(0);for(let i=0;i<n;i++)da[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource();s.buffer=b;const g=AC.createGain();g.gain.value=v||0.25;s.connect(g);g.connect(AC.destination);s.start();}
function sndShoot(){noiseBurst(0.12,0.35);tone(180,0.12,'square',0.2);}
function sndReload(){tone(300,0.06,'sine',0.18);setTimeout(()=>tone(220,0.08,'sine',0.18),140);}
function sndRepair(){tone(420,0.05,'sine',0.15);}
function sndHurt(){tone(120,0.18,'sawtooth',0.25);}
function sndDie(){noiseBurst(0.2,0.2);tone(90,0.25,'sawtooth',0.18);}
/* ===================== END PART 1/2 ===================== */
/* ===================== BUNKER UNDEAD - game.js PART 2/2 ===================== */

/* ---- STATE ---- */
const P={x:0,y:EYE,z:10,yaw:0,pitch:0,vy:0,hp:100,onGround:true};
const Wp={mag:8,cap:8,res:120,ft:0,reload:0,recoil:0,muzzle:0};
const G={state:'menu',round:0,toSpawn:0,spawnT:0,interT:0,points:0,kills:0,dmgFlash:0,running:false};
let zombies=[], particles=[];
const keys={};
let mouseDown=false;
let FWD=[0,0,-1];

/* ---- DOM ---- */
const D={hp:document.getElementById('hp'),hb:document.getElementById('hb'),am:document.getElementById('am'),
 pt:document.getElementById('pt'),rt:document.getElementById('rt'),zl:document.getElementById('zl'),
 hint:document.getElementById('hint'),an:document.getElementById('an'),anM:document.getElementById('anM'),
 anS:document.getElementById('anS'),dm:document.getElementById('dm'),start:document.getElementById('start'),
 over:document.getElementById('over'),fR:document.getElementById('fR'),fS:document.getElementById('fS'),fK:document.getElementById('fK')};

const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---- INPUT ---- */
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();});
addEventListener('keyup',e=>{keys[e.code]=false;});
cv.addEventListener('mousedown',e=>{if(e.button===0)mouseDown=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;});
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv){P.yaw-=e.movementX*0.0022;P.pitch-=e.movementY*0.0022;P.pitch=clamp(P.pitch,-1.45,1.45);}});
document.getElementById('startB').addEventListener('click',()=>{initAudio();cv.requestPointerLock();});
document.getElementById('restB').addEventListener('click',()=>{initAudio();cv.requestPointerLock();});
cv.addEventListener('click',()=>{if(G.state==='playing'||G.state==='inter')cv.requestPointerLock();});
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cv){ if(G.state==='menu'||G.state==='over') startGame(); }
});

/* ---- WEAPON ---- */
function reload(){ if(Wp.reload>0||Wp.mag>=Wp.cap||Wp.res<=0||G.state!=='playing')return; Wp.reload=1.3; sndReload(); }
function raySphere(o,d,c,r){const ox=o[0]-c[0],oy=o[1]-c[1],oz=o[2]-c[2];const b=ox*d[0]+oy*d[1]+oz*d[2];const cc=ox*ox+oy*oy+oz*oz-r*r;const h=b*b-cc;if(h<0)return -1;const t=-b-Math.sqrt(h);return t;}
function shoot(){
  if(G.state!=='playing'||Wp.reload>0||Wp.ft>0)return;
  if(Wp.mag<=0){reload();return;}
  Wp.mag--; Wp.ft=0.16; Wp.recoil=1; Wp.muzzle=0.06; sndShoot();
  const o=[P.x,P.y,P.z], d=FWD;
  let best=80, bz=null, head=false;
  for(const z of zombies){ if(z.dead||z.dying)continue;
    const th=raySphere(o,d,[z.x,z.y+1.62,z.z],0.33); if(th>0&&th<best){best=th;bz=z;head=true;}
    const tb=raySphere(o,d,[z.x,z.y+1.0,z.z],0.55); if(tb>0&&tb<best){best=tb;bz=z;head=false;}
  }
  const hit=[o[0]+d[0]*best,o[1]+d[1]*best,o[2]+d[2]*best];
  if(bz){ bz.hp-=head?100:34; G.points+=10;
    blood(hit,head?14:7);
    if(bz.hp<=0){ bz.dying=true; bz.dieT=0.7; bz.fall=0; G.points+=head?100:60; G.kills++; blood([bz.x,bz.y+1,bz.z],20); sndDie(); }
  }
}

/* ---- PARTICLES ---- */
function blood(p,n){ for(let i=0;i<n;i++){ particles.push({x:p[0],y:p[1],z:p[2],
  vx:(Math.random()*2-1)*3,vy:Math.random()*3+1,vz:(Math.random()*2-1)*3,
  life:0.5+Math.random()*0.4,col:[0.5+Math.random()*0.2,0.03,0.03],s:0.07+Math.random()*0.06,emis:0.1}); } }
function spark(p,n){ for(let i=0;i<n;i++){ particles.push({x:p[0],y:p[1],z:p[2],
  vx:(Math.random()*2-1)*2,vy:(Math.random()*2-1)*2,vz:(Math.random()*2-1)*2,
  life:0.12+Math.random()*0.1,col:[1,0.8,0.3],s:0.05,emis:1.0}); } }
function updateParticles(dt){ for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.vy-=14*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<0.05){p.y=0.05;p.vy*=-0.3;p.vx*=0.6;p.vz*=0.6;}} }

/* ---- ZOMBIES ---- */
const ZTINTS=[[.8,.95,.7],[.7,.85,.6],[.65,.8,.55],[.85,.9,.65]];
function spawnZombie(){
  const w=WINDOWS[Math.floor(Math.random()*WINDOWS.length)];
  const r=G.round;
  zombies.push({x:w.outer[0]+(Math.random()*2-1)*1.5, y:0, z:w.outer[2]+(Math.random()*2-1)*1.5,
    win:w, hp:40+r*15, state:'approach', anim:Math.random()*6.28,
    speed:clamp(1.2+r*0.12+Math.random()*0.5,1,3.8), dmg:7+r*1.2,
    atkT:0, tearT:1.2, face:0, dead:false, dying:false, fall:0, tint:ZTINTS[Math.floor(Math.random()*ZTINTS.length)]});
}
function moveTo(z,tx,tz,dt){const dx=tx-z.x,dz=tz-z.z,l=Math.hypot(dx,dz);if(l>0.01){z.x+=dx/l*z.speed*dt;z.z+=dz/l*z.speed*dt;z.face=Math.atan2(dx,dz);}return l;}
function updateZombies(dt){
  for(let i=zombies.length-1;i>=0;i--){const z=zombies[i];
    if(z.dying){ z.dieT-=dt; z.fall=clamp(1-z.dieT/0.7,0,1); if(z.dieT<=0)zombies.splice(i,1); continue; }
    z.anim+=dt*z.speed*3.2;
    if(z.state==='approach'){
      const l=moveTo(z,z.win.x,z.win.z,dt);
      if(l<1.6){
        if(z.win.boards>0){ z.tearT-=dt; if(z.tearT<=0){ z.win.boards--; z.tearT=1.3; tone&&tone(150,0.08,'sawtooth',0.18);} }
        else z.state='inside';
      }
    } else {
      moveTo(z,P.x,P.z,dt);
      z.x=clamp(z.x,-AR+0.5,AR-0.5); z.z=clamp(z.z,-AR+0.5,AR-0.5);
      const dd=Math.hypot(P.x-z.x,P.z-z.z);
      if(dd<1.5){ z.atkT-=dt; if(z.atkT<=0){ hurtPlayer(z.dmg); z.atkT=1.0; } }
    }
  }
  // light separation
  for(let i=0;i<zombies.length;i++){const a=zombies[i];if(a.dying)continue;
    for(let j=i+1;j<zombies.length;j++){const b=zombies[j];if(b.dying)continue;
      const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
      if(d>0.01&&d<0.9){const push=(0.9-d)*0.5;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;}
    }
  }
}
function drawZombie(z){
  const base=TRS(z.x, z.y-z.fall*0.5, z.z, z.fall*1.45, z.face, 0, 1,1,1);
  const sw=Math.sin(z.anim)*0.5, t=z.tint;
  box(M4.mul(base,TRS(0,1.05,0,0,0,0,0.55,0.8,0.32)),T.cloth,[0.45,0.42,0.38],[1,1],0);   // torso
  box(M4.mul(base,TRS(0,1.62,0,0,0,0,0.34,0.34,0.34)),T.zskin,t,[1,1],0);                  // head
  box(M4.mul(base,TRS(0.40,1.18,0.12,-1.25+sw,0,0,0.16,0.7,0.16)),T.zskin,[t[0]*.9,t[1]*.9,t[2]*.9],[1,1],0); // arm R
  box(M4.mul(base,TRS(-0.40,1.18,0.12,-1.25-sw,0,0,0.16,0.7,0.16)),T.zskin,[t[0]*.9,t[1]*.9,t[2]*.9],[1,1],0);// arm L
  box(M4.mul(base,TRS(0.18,0.45,0,sw,0,0,0.2,0.9,0.22)),T.cloth,[0.28,0.28,0.32],[1,1],0); // leg R
  box(M4.mul(base,TRS(-0.18,0.45,0,-sw,0,0,0.2,0.9,0.22)),T.cloth,[0.28,0.28,0.32],[1,1],0);// leg L
}

/* ---- WINDOWS / BOARDS ---- */
function drawWindows(){
  for(const w of WINDOWS){
    for(let i=0;i<w.boards;i++){const b=w.bd[i];
      if(w.axis==='x') box(TRS(w.x,b.y,w.z,0,0,b.t,BW,0.3,0.2),T.board,[1,1,1],[1.5,1],0);
      else box(TRS(w.x,b.y,w.z,b.t,0,0,0.2,0.3,BW),T.board,[1,1,1],[1,1.5],0);
    }
  }
}

/* ---- PLAYER ---- */
function hurtPlayer(d){ if(G.state!=='playing')return; P.hp-=d; G.dmgFlash=1; sndHurt(); if(P.hp<=0){P.hp=0;gameOver();} }
function movePlayer(dt){
  const fh=[FWD[0],0,FWD[2]]; let fl=Math.hypot(fh[0],fh[2])||1; fh[0]/=fl; fh[2]/=fl;
  const rh=[fh[2],0,-fh[0]]; // right = forward rotated -90 around Y
  let mx=0,mz=0;
  if(keys.KeyW){mx+=fh[0];mz+=fh[2];} if(keys.KeyS){mx-=fh[0];mz-=fh[2];}
  if(keys.KeyD){mx+=rh[0];mz+=rh[2];} if(keys.KeyA){mx-=rh[0];mz-=rh[2];}
  const ml=Math.hypot(mx,mz);
  const sp=(keys.ShiftLeft||keys.ShiftRight?7.5:4.5);
  if(ml>0.01){mx/=ml;mz/=ml;P.x+=mx*sp*dt;P.z+=mz*sp*dt;}
  // jump + gravity
  if(keys.Space&&P.onGround){P.vy=6.2;P.onGround=false;}
  P.vy-=GRAV*dt; P.y+=P.vy*dt;
  if(P.y<=EYE){P.y=EYE;P.vy=0;P.onGround=true;}
  // bounds
  P.x=clamp(P.x,-AR+0.6,AR-0.6); P.z=clamp(P.z,-AR+0.6,AR-0.6);
  // crate / pillar collision (circle vs AABB push-out)
  const pr=0.45;
  for(const c of COLLIDERS){
    const nx=clamp(P.x,c.x-c.hx,c.x+c.hx), nz=clamp(P.z,c.z-c.hz,c.z+c.hz);
    const dx=P.x-nx, dz=P.z-nz, d=Math.hypot(dx,dz);
    if(d<pr){ if(d<0.001){P.x+=pr;continue;} P.x=nx+dx/d*pr; P.z=nz+dz/d*pr; }
  }
}
function tryRepair(){
  let near=null,nd=3.5;
  for(const w of WINDOWS){ if(w.boards>=5)continue; const d=Math.hypot(P.x-w.x,P.z-w.z); if(d<nd){nd=d;near=w;} }
  if(near&&(keys.KeyF||keys.KeyE)){
    near.repair+=0.9*(1/60); // approximate; refined below in update with dt
    D.hint.textContent='Repairing… '+Math.floor(near.repair*100)+'%'; D.hint.style.opacity=1;
    if(near.repair>=1){ near.repair=0; near.boards++; G.points+=10; sndRepair(); }
  } else if(near){ D.hint.textContent='Hold F to repair barricade'; D.hint.style.opacity=1; }
  else D.hint.style.opacity=0;
}
/* ---- PART 2 (continued): replace the unfinished tryRepairDt with this full version ---- */
function tryRepairDtFull(dt){
  let near=null,nd=3.5;
  for(const w of WINDOWS){ if(w.boards>=5)continue; const d=Math.hypot(P.x-w.x,P.z-w.z); if(d<nd){nd=d;near=w;} }
  if(near&&(keys.KeyF||keys.KeyE)){
    near.repair+=1.1*dt;
    D.hint.textContent='Repairing… '+Math.floor(near.repair*100)+'%'; D.hint.style.opacity=1;
    if(near.repair>=1){ near.repair=0; near.boards++; G.points+=10; sndRepair(); }
  } else if(near){
    if(near.repair>0) near.repair=Math.max(0,near.repair-dt);
    D.hint.textContent='Hold F to repair barricade'; D.hint.style.opacity=1;
  } else { D.hint.style.opacity=0; }
}

/* ---- ROUND LOGIC ---- */
function livingCount(){ let n=0; for(const z of zombies) if(!z.dying) n++; return n; }
function startRound(n){
  G.round=n; G.toSpawn=6+n*2; G.spawnT=1.2; G.state='playing';
  announce('ROUND '+n, n===1?'THEY ARE COMING':'SURVIVE');
}
function announce(main,sub){
  D.anM.textContent=main; D.anS.textContent=sub||''; D.an.style.opacity=1;
  clearTimeout(announce._t); announce._t=setTimeout(()=>{D.an.style.opacity=0;},2000);
}
function gameOver(){
  G.state='over';
  if(document.pointerLockElement===cv) document.exitPointerLock();
  D.fR.textContent='Round '+G.round; D.fS.textContent=G.points; D.fK.textContent=G.kills;
  D.over.style.display='flex';
}
function startGame(){
  D.start.style.display='none'; D.over.style.display='none';
  P.x=0;P.y=EYE;P.z=10;P.yaw=0;P.pitch=0;P.vy=0;P.hp=100;P.onGround=true;
  Wp.mag=8;Wp.cap=8;Wp.res=120;Wp.ft=0;Wp.reload=0;Wp.recoil=0;Wp.muzzle=0;
  G.points=0;G.kills=0;G.dmgFlash=0;
  zombies.length=0; particles.length=0;
  for(const w of WINDOWS){ w.boards=5; w.repair=0; }
  startRound(1);
}

/* ---- UPDATE ---- */
function update(dt){
  movePlayer(dt);
  // weapon timers
  if(Wp.ft>0)Wp.ft-=dt;
  if(Wp.muzzle>0)Wp.muzzle-=dt;
  if(Wp.recoil>0)Wp.recoil=Math.max(0,Wp.recoil-dt*6);
  if(Wp.reload>0){ Wp.reload-=dt; if(Wp.reload<=0){ const need=Wp.cap-Wp.mag, take=Math.min(need,Wp.res); Wp.mag+=take; Wp.res-=take; } }
  if(mouseDown) shoot();
  tryRepairDtFull(dt);
  updateZombies(dt);
  updateParticles(dt);
  // spawning
  if(G.state==='playing'){
    if(G.toSpawn>0 && zombies.length<22){ G.spawnT-=dt; if(G.spawnT<=0){ spawnZombie(); G.toSpawn--; G.spawnT=Math.max(0.35,0.9-G.round*0.03); } }
    if(G.toSpawn===0 && livingCount()===0){ G.state='inter'; G.interT=4; announce('ROUND CLEAR','NEXT WAVE IN 4s'); }
  } else if(G.state==='inter'){
    G.interT-=dt; if(G.interT<=0) startRound(G.round+1);
  }
  if(G.dmgFlash>0)G.dmgFlash=Math.max(0,G.dmgFlash-dt*1.5);
}

/* ---- HUD ---- */
function updateHUD(){
  D.hp.textContent=Math.ceil(P.hp);
  D.hb.style.width=clamp(P.hp,0,100)+'%';
  D.am.innerHTML=Wp.mag+' <span class="r">/ '+Wp.res+'</span>'+(Wp.reload>0?' …':'');
  D.pt.textContent=G.points;
  D.rt.textContent='ROUND '+G.round;
  D.zl.textContent='Zombies: '+(G.toSpawn+livingCount());
  const lowhp=P.hp<35?(0.35*(1-P.hp/35)):0;
  D.dm.style.opacity=Math.max(lowhp,G.dmgFlash*0.65);
}

/* ---- RENDER ---- */
let _t0=performance.now()/1000;
function render(now){
  // camera matrices
  const cw=M4.mul(M4.mul(M4.trans(P.x,P.y,P.z),M4.rotY(P.yaw)),M4.rotX(P.pitch));
  FWD=[-cw[8],-cw[9],-cw[10]]; const fl=Math.hypot(FWD[0],FWD[1],FWD[2])||1; FWD=[FWD[0]/fl,FWD[1]/fl,FWD[2]/fl];
  const view=M4.mul(M4.mul(M4.rotX(-P.pitch),M4.rotY(-P.yaw)),M4.trans(-P.x,-P.y,-P.z));
  const proj=M4.persp(FOV, cv.width/cv.height, 0.05, 120);
  gl.uniformMatrix4fv(U.u_proj,false,new Float32Array(proj));
  gl.uniformMatrix4fv(U.u_view,false,new Float32Array(view));
  gl.uniform3fv(U.u_cam,[P.x,P.y,P.z]);
  gl.uniform3fv(U.u_amb,[0.13,0.13,0.17]);
  gl.uniform3fv(U.u_dd,[-0.3,-1,-0.25]);
  gl.uniform3fv(U.u_dc,[0.12,0.12,0.16]);
  gl.uniform3fv(U.u_fog,[0.04,0.045,0.06]);
  gl.uniform1f(U.u_fogD,0.035);

  // lights: flickering lamps + muzzle
  const tt=now;
  const lights=LAMPS.map((l,i)=>{const fk=0.6+0.4*Math.abs(Math.sin(tt*7+i*1.7))+ (Math.random()<0.04?-0.4:0);
    return {p:[l[0],l[1],l[2]],c:[1.0*fk,0.72*fk,0.42*fk],r:15};});
  if(Wp.muzzle>0){ lights.push({p:[P.x+FWD[0]*0.6,P.y+FWD[1]*0.6,P.z+FWD[2]*0.6],c:[1.4,1.1,0.6],r:9}); }
  setLights(lights);

  gl.clearColor(0.03,0.035,0.05,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  // world
  for(const o of MAP) box(o.m,o.tex,o.tint,o.uvs,0);
  drawWindows();
  for(const z of zombies) drawZombie(z);
  // particles
  for(const p of particles) box(TRS(p.x,p.y,p.z,0,0,0,p.s,p.s,p.s),T.white,p.col,[1,1],p.emis);

  // viewmodel (draw on top)
  gl.clear(gl.DEPTH_BUFFER_BIT);
  const dip=Wp.reload>0?Math.sin((1-Wp.reload/1.3)*Math.PI)*0.6:0;
  const gm=M4.mul(cw, TRS(0.26,-0.30,-0.5+Wp.recoil*0.07, dip-Wp.recoil*0.22,0,0, 1,1,1));
  box(M4.mul(gm,TRS(0,0,0.10,0,0,0,0.13,0.13,0.46)),T.metal,[0.32,0.34,0.38],[1,1],0.04);
  box(M4.mul(gm,TRS(0,0.03,-0.28,0,0,0,0.06,0.06,0.26)),T.metal,[0.25,0.26,0.3],[1,1],0.04);
  box(M4.mul(gm,TRS(0,0.09,0.04,0,0,0,0.10,0.06,0.4)),T.metal,[0.4,0.42,0.46],[1,1],0.05);
  box(M4.mul(gm,TRS(0,-0.13,0.18,0.32,0,0,0.10,0.24,0.13)),T.metal,[0.22,0.18,0.16],[1,1],0.02);
  if(Wp.muzzle>0){ box(M4.mul(gm,TRS(0,0.03,-0.46,0,0,Math.random()*6,0.18,0.18,0.10)),T.white,[1,0.85,0.4],[1,1],1.0);
    if(Math.random()<0.6) spark([P.x+FWD[0]*0.7,P.y+FWD[1]*0.7-0.1,P.z+FWD[2]*0.7],2); }
}

/* ---- LOOP ---- */
function loop(){
  const now=performance.now()/1000;
  let dt=now-_t0; _t0=now; if(dt>0.05)dt=0.05;
  const active=document.pointerLockElement===cv && (G.state==='playing'||G.state==='inter');
  if(active) update(dt);
  render(now);
  updateHUD();
  requestAnimationFrame(loop);
}

/* ---- RESIZE / INIT ---- */
function resize(){ cv.width=innerWidth*devicePixelRatio|0; cv.height=innerHeight*devicePixelRatio|0; gl.viewport(0,0,cv.width,cv.height); }
addEventListener('resize',resize); resize();
requestAnimationFrame(loop);
/* ===================== END PART 2/2 ===================== */



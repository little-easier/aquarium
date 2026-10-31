/* Little Easier Aquarium */
(() => {
'use strict';
const {TPL, strokeTemplate, silhouette, cutHoles, samplePath, STICKERS, drawSticker, STAMPS, drawStamp, starPath, heartPath} = window.AQ;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random()*(b - a);
const pick = arr => arr[(Math.random()*arr.length)|0];
const lerp = (a, b, t) => a + (b - a)*t;
const PI2 = Math.PI*2;
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const uid = () => Math.random().toString(36).slice(2, 9);

/* ================= State ================= */
const KEY = 'le-aquarium-v2', OLD_KEY = 'le-aquarium-v1';
const DEF_SETTINGS = {sound:true, sfx:true, music:true, water:true, vol:0.6, rewards:true, limit:0};
let settings = Object.assign({}, DEF_SETTINGS);
let pearls = 15, sceneId = 'reef';
let creatures = [], decor = [];
let saveTimer = 0, saveWarned = false;

const TYPES = {
  swim:{label:'Swims', spd:72}, float:{label:'Floats', spd:32}, pulse:{label:'Pulses', spd:34, noflip:1},
  wiggle:{label:'Wiggles', spd:54}, zoom:{label:'Zooms', spd:110},
  crawl:{label:'Crawls', spd:22, ground:1}, scuttle:{label:'Scuttles', spd:48, ground:1, noflip:1},
  drive:{label:'Drives', spd:64, ground:1}, bounce:{label:'Bounces', spd:58, ground:1},
};
const PERS = {friendly:{label:'Friendly', spd:.95}, shy:{label:'Shy', spd:.8}, playful:{label:'Playful', spd:1.25}, sleepy:{label:'Sleepy', spd:.6}, greedy:{label:'Greedy', spd:1.05}};
const NAMES = ['Bubbles','Pip','Squiggle','Noodle','Biscuit','Pickle','Ziggy','Marble','Coco','Splash','Wiggles','Pebble','Dot','Fizz','Sprout','Mango','Button','Toffee','Jelly Bean','Comet'];
const isGround = c => !!(TYPES[c.type] || TYPES.swim).ground;

/* ================= Geometry & camera ================= */
const glc = $('#water'), cv = $('#life'), ctx = cv.getContext('2d');
const roomCv = $('#room'), rctx = roomCv.getContext('2d');
const stage = $('#stage');
let W = 0, H = 0, DPR = 1, scaleS = 1, U = 60;
const cam = {x:0, y:0, z:1};
const sandN = xn => 0.17 + 0.015*Math.sin(xn*7) + 0.01*Math.sin(xn*17 + 1);
const sandY = x => H*(1 - sandN(x/W));
const groundY = x => { const s = sandY(x); return s + (H - s)*0.32; };
const itemY = it => { const x = it.x*W, s = sandY(x); return s + (H - s)*(0.04 + it.d*0.82); };
function clampCam(){
  cam.z = clamp(cam.z, 1, 3);
  const hw = W/(2*cam.z), hh = H/(2*cam.z);
  cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
  $('#zoomOut').hidden = cam.z < 1.03;
}
function toWorld(sx, sy){ return {x:(sx - W/2)/cam.z + cam.x, y:(sy - H/2)/cam.z + cam.y}; }
function stagePoint(e){ const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left)/r.width*W, y:(e.clientY - r.top)/r.height*H}; }

/* ================= Scenes ================= */
const SCENES = {
  reef:  {name:'Coral reef', deep:[.02,.17,.25], mid:[.05,.42,.50], top:[.40,.80,.80], sa:[.86,.77,.57], sb:[.58,.49,.34], fx:[.13,.32,0,0], parts:'specks', hue:0,   light:0,   sw:'linear-gradient(#5fc2c4,#0e5662)'},
  pond:  {name:'Pond',       deep:[.04,.12,.07], mid:[.16,.31,.18], top:[.50,.60,.36], sa:[.46,.39,.27], sb:[.24,.19,.12], fx:[.09,.16,0,0], parts:'pollen', hue:10,  light:-2,  sw:'linear-gradient(#93a96a,#24402a)'},
  deep:  {name:'Deep sea',   deep:[0,.015,.05],  mid:[.01,.06,.14], top:[.05,.19,.33], sa:[.32,.32,.38], sb:[.12,.12,.16], fx:[.03,.05,0,0], parts:'glow',   hue:-25, light:-8,  sw:'linear-gradient(#1d4a6b,#020a18)'},
  arctic:{name:'Arctic',     deep:[.12,.30,.45], mid:[.36,.63,.76], top:[.82,.94,.98], sa:[.93,.96,.99], sb:[.70,.79,.86], fx:[.15,.22,0,0], parts:'snow',   hue:-15, light:4,   sw:'linear-gradient(#d6f0f7,#3d7d9e)'},
  space: {name:'Space',      deep:[.02,.01,.07], mid:[.09,.05,.20], top:[.20,.11,.36], sa:[.58,.56,.63], sb:[.30,.28,.36], fx:[0,0,1,1],   parts:'stars',  hue:160, light:2,   sw:'linear-gradient(#3a2363,#0a0418)'},
};
const cur = JSON.parse(JSON.stringify(SCENES.reef));
const extrasW = {pond:0, arctic:0, space:0};
function lerpScene(dt){
  const t = SCENES[sceneId], k = Math.min(1, dt*1.6);
  for (const key of ['deep','mid','top','sa','sb','fx']) for (let i=0;i<cur[key].length;i++) cur[key][i] = lerp(cur[key][i], t[key][i], k);
  cur.hue = lerp(cur.hue, t.hue, k); cur.light = lerp(cur.light, t.light, k);
  for (const s in extrasW) extrasW[s] = lerp(extrasW[s], s === sceneId ? 1 : 0, k);
}

/* ================= WebGL water ================= */
let gl = null, uni = {};
const FS = `
precision highp float;
uniform vec2 R; uniform float T; uniform float N; uniform vec3 Cam;
uniform vec3 Cd; uniform vec3 Cm; uniform vec3 Ct; uniform vec3 Sa; uniform vec3 Sb; uniform vec4 Fx;
float sandY(float x){ return 0.17+0.015*sin(x*7.0)+0.01*sin(x*17.0+1.0); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y); }
float caustic(vec2 uv, float t){
  vec2 p = mod(uv*6.28318, 6.28318) - 250.0;
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for(int n=0;n<5;n++){
    float tt = t*(1.0 - (3.5/float(n+1)));
    i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten)));
  }
  c /= 5.0; c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.5);
}
void main(){
  vec2 s = gl_FragCoord.xy / R;
  vec2 uv = (s - 0.5)/Cam.z + vec2(Cam.x, 1.0 - Cam.y);
  float asp = R.x / R.y;
  vec2 q = vec2(uv.x*asp, uv.y);
  float t = T*0.5;
  vec3 col = mix(Cd, Cm, smoothstep(0.0, 0.62, uv.y));
  col = mix(col, Ct, smoothstep(0.58, 1.0, uv.y));
  float rx = uv.x + (1.0 - uv.y)*0.35;
  float rays = smoothstep(0.55,1.0,sin(rx*9.0 + t*0.35 + sin(rx*3.0 + t*0.2)))*0.55
             + smoothstep(0.70,1.0,sin(rx*17.0 - t*0.25))*0.30
             + smoothstep(0.80,1.0,sin(rx*5.0 + t*0.15))*0.35;
  rays *= smoothstep(0.12, 1.0, uv.y);
  col += vec3(0.62,0.92,0.86)*rays*Fx.x;
  float cw = caustic(q*1.1 + vec2(0.0, t*0.03), t*0.6);
  col += vec3(0.7,1.0,0.95)*cw*Fx.y*0.16*smoothstep(0.2,1.0,uv.y);
  if (Fx.z > 0.001){
    vec2 g = q*90.0; vec2 id = floor(g); float h = hash(id); vec2 f = fract(g) - 0.5;
    float st = step(0.982, h)*smoothstep(0.12, 0.0, length(f))*(0.55 + 0.45*sin(T*1.7 + h*60.0));
    vec2 g2 = q*30.0; vec2 id2 = floor(g2); float h2 = hash(id2 + 7.0); vec2 f2 = fract(g2) - 0.5;
    st += step(0.992, h2)*smoothstep(0.1, 0.0, length(f2))*1.2;
    col += vec3(0.92,0.92,1.0)*st*Fx.z;
    col += vec3(0.28,0.08,0.32)*noise(q*2.0 + T*0.01)*0.3*Fx.z;
  }
  float sy = sandY(uv.x);
  float d = clamp((sy - uv.y)/sy, 0.0, 1.0);
  vec3 sand = mix(Sa, Sb, d);
  sand *= 0.90 + 0.14*noise(q*vec2(230.0,280.0));
  sand *= 0.95 + 0.05*sin(q.x*55.0 + sin(q.y*38.0)*2.5);
  float cs = caustic(vec2(q.x*1.5, q.y*4.0), t*0.7);
  sand += vec3(1.0,0.96,0.82)*cs*Fx.y*(1.0 - d*0.5);
  if (Fx.w > 0.001){
    float cr = noise(q*vec2(9.0, 26.0));
    sand *= 1.0 - Fx.w*0.28*smoothstep(0.6, 0.66, cr)*(1.0 - smoothstep(0.7, 0.76, cr));
    sand *= 1.0 - Fx.w*0.10*smoothstep(0.7, 0.8, cr);
  }
  sand = mix(sand, Cm*0.95, 0.22 + 0.12*(1.0 - d));
  float edge = smoothstep(sy + 0.004, sy - 0.006, uv.y);
  col = mix(col, sand, edge);
  col *= 1.0 - 0.11*smoothstep(0.012, 0.0, abs(uv.y - sy));
  float sh = smoothstep(0.93, 1.0, uv.y);
  col += sh*0.16*(1.0 - Fx.z)*(0.55 + 0.45*sin(q.x*28.0 + t*3.0 + sin(q.x*6.0 - t)));
  vec2 v = uv - 0.5; col *= 1.0 - dot(v,v)*0.55;
  vec3 nightCol = col*vec3(0.22,0.33,0.62) + vec3(0.0,0.02,0.05);
  col = mix(col, nightCol, N);
  gl_FragColor = vec4(col, 1.0);
}`;
function initGL(){
  try { gl = glc.getContext('webgl', {antialias:false}) || glc.getContext('experimental-webgl'); } catch(e){ gl = null; }
  if (!gl) return;
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const a = sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'), b = sh(gl.FRAGMENT_SHADER, FS);
  if (!a || !b){ gl = null; return; }
  const prog = gl.createProgram(); gl.attachShader(prog, a); gl.attachShader(prog, b); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){ gl = null; return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['R','T','N','Cam','Cd','Cm','Ct','Sa','Sb','Fx']) uni[n] = gl.getUniformLocation(prog, n);
}
function renderWater(){
  gl.uniform2f(uni.R, glc.width, glc.height); gl.uniform1f(uni.T, clock); gl.uniform1f(uni.N, nightV);
  gl.uniform3f(uni.Cam, cam.x/W, cam.y/H, cam.z);
  gl.uniform3fv(uni.Cd, cur.deep); gl.uniform3fv(uni.Cm, cur.mid); gl.uniform3fv(uni.Ct, cur.top);
  gl.uniform3fv(uni.Sa, cur.sa); gl.uniform3fv(uni.Sb, cur.sb); gl.uniform4fv(uni.Fx, cur.fx);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
const rgb = (a, m) => `rgb(${(a[0]*255*(m||1))|0},${(a[1]*255*(m||1))|0},${(a[2]*255*(m||1))|0})`;
function fallbackWater(){
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(cur.top)); g.addColorStop(0.6, rgb(cur.mid)); g.addColorStop(1, rgb(cur.deep));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgb(cur.sa, 0.9); ctx.beginPath(); ctx.moveTo(0, H); for (let x=0;x<=W;x+=10) ctx.lineTo(x, sandY(x)); ctx.lineTo(W, H); ctx.fill();
}

/* ================= Decorations ================= */
const DECOR = {
  rock1:{name:'Big rock', cost:0, w:1.4, h:1.0},
  rock2:{name:'Rock', cost:0, w:1.0, h:0.8},
  rock3:{name:'Small rock', cost:0, w:0.7, h:0.5},
  cave:{name:'Cave', cost:4, w:1.7, h:1.5, hide:[0.04, -0.27]},
  wood:{name:'Driftwood', cost:2, w:2.4, h:1.1},
  castle:{name:'Castle', cost:6, w:1.1, h:1.6, hide:[0, -0.11]},
  chest:{name:'Treasure', cost:5, w:1.0, h:0.85},
  coral:{name:'Pink coral', cost:2, w:0.9, h:1.0},
  fan:{name:'Fan coral', cost:2, w:1.0, h:0.9},
  shell:{name:'Shell', cost:1, w:0.45, h:0.35},
  bubbler:{name:'Bubbler', cost:2, w:0.4, h:0.2},
  grass:{name:'Tall grass', cost:1, w:0.7, h:2.4, live:1},
  bush:{name:'Leafy plant', cost:1, w:0.9, h:1.0, live:1},
  kelp:{name:'Kelp', cost:2, w:0.6, h:3.0, live:1},
  drawnPlant:{name:'Your plant', cost:0, live:1, drawn:1},
  drawnDecor:{name:'Your decoration', cost:0, drawn:1},
};
const TRAY = ['rock1','rock2','rock3','grass','bush','kelp','coral','fan','shell','wood','bubbler','cave','chest','castle'];
function blob(g, cx, cy, rw, rh, r, n){
  const pts = [];
  for (let i=0;i<n;i++){ const a = i/n*PI2, k = 0.82 + r()*0.3; pts.push([cx + Math.cos(a)*rw*k, cy + Math.sin(a)*rh*k]); }
  const mid = (p, q) => [(p[0] + q[0])/2, (p[1] + q[1])/2];
  g.beginPath(); let m = mid(pts[n-1], pts[0]); g.moveTo(m[0], m[1]);
  for (let i=0;i<n;i++){ const p = pts[i], q = pts[(i + 1)%n], mm = mid(p, q); g.quadraticCurveTo(p[0], p[1], mm[0], mm[1]); }
  g.closePath();
}
function contactShadow(g, ww, hh){
  const s = g.createRadialGradient(0, 0, 2, 0, 0, ww*0.6);
  s.addColorStop(0, 'rgba(0,18,24,.35)'); s.addColorStop(1, 'rgba(0,18,24,0)');
  g.fillStyle = s; g.beginPath(); g.ellipse(0, 0, ww*0.62, Math.max(4, hh*0.12), 0, 0, PI2); g.fill();
}
function rockShape(g, ww, hh, r, tones, inner){
  contactShadow(g, ww, hh);
  g.save(); g.beginPath(); g.rect(-ww*2, -hh*2, ww*4, hh*2 + hh*0.05); g.clip();
  blob(g, 0, -hh*0.48, ww*0.5, hh*0.52, r, 13);
  const gr = g.createLinearGradient(0, -hh, 0, 0); gr.addColorStop(0, tones[0]); gr.addColorStop(1, tones[1]);
  g.fillStyle = gr; g.fill(); g.save(); g.clip();
  const hl = g.createRadialGradient(-ww*0.16, -hh*0.82, 2, -ww*0.16, -hh*0.82, ww*0.55);
  hl.addColorStop(0, 'rgba(225,255,245,.35)'); hl.addColorStop(1, 'rgba(225,255,245,0)');
  g.fillStyle = hl; g.fillRect(-ww, -hh*1.2, ww*2, hh*1.3);
  for (let i=0;i<60;i++){ g.fillStyle = r() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.10)'; g.beginPath(); g.arc((r() - .5)*ww, -r()*hh, 1 + r()*ww*0.02, 0, PI2); g.fill(); }
  g.fillStyle = 'rgba(80,150,90,.28)'; g.beginPath(); g.ellipse(-ww*0.05, -hh*0.9, ww*0.3, hh*0.1, -0.1, 0, PI2); g.fill();
  if (inner) inner();
  g.restore(); g.restore();
}
const DRAW = {
  rock1:(g, ww, hh, r) => rockShape(g, ww, hh, r, ['#8a9a8f', '#3b4d4c']),
  rock2:(g, ww, hh, r) => rockShape(g, ww, hh, r, ['#958f7e', '#4a4a40']),
  rock3:(g, ww, hh, r) => rockShape(g, ww, hh, r, ['#9aa3a6', '#4b5559']),
  cave:(g, ww, hh, r) => rockShape(g, ww, hh, r, ['#7d8d86', '#34474a'], () => {
    const mx = ww*0.04, my = -hh*0.27;
    const mg = g.createRadialGradient(mx, my, 2, mx, my, ww*0.26);
    mg.addColorStop(0, 'rgba(1,10,16,.96)'); mg.addColorStop(.75, 'rgba(2,14,20,.85)'); mg.addColorStop(1, 'rgba(2,14,20,0)');
    g.fillStyle = mg; g.beginPath(); g.ellipse(mx, my, ww*0.22, hh*0.23, 0, 0, PI2); g.fill();
  }),
  wood:(g, ww, hh, r) => {
    const x0 = -ww*0.48, y0 = -hh*0.06, x1 = ww*0.46, y1 = -hh*0.86, lw = Math.max(5, ww*0.075);
    g.lineCap = 'round'; g.lineJoin = 'round';
    contactShadow(g, ww*0.9, hh*0.5);
    const main = () => { g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + (x1 - x0)*0.35, y0 - hh*0.05, x0 + (x1 - x0)*0.6, y1 + hh*0.3, x1, y1); };
    const fx = x0 + (x1 - x0)*0.55, fy = y0 - (y0 - y1)*0.42;
    const fork = () => { g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + ww*0.04, fy - hh*0.3, fx - ww*0.03, fy - hh*0.6); };
    const tw = () => { g.beginPath(); g.moveTo(x0 + ww*0.2, y0 - hh*0.04); g.quadraticCurveTo(x0 + ww*0.14, y0 - hh*0.3, x0 + ww*0.02, y0 - hh*0.42); };
    [[1, '#4a3322'], [0.62, '#6e4d32']].forEach(([k, col]) => { g.strokeStyle = col; g.lineWidth = lw*k; main(); g.stroke(); g.lineWidth = lw*k*0.7; fork(); g.stroke(); g.lineWidth = lw*k*0.5; tw(); g.stroke(); });
    g.strokeStyle = 'rgba(255,230,200,.18)'; g.lineWidth = 2; g.save(); g.translate(0, -lw*0.22); main(); g.stroke(); g.restore();
    g.strokeStyle = 'rgba(30,18,10,.35)'; g.lineWidth = 1.2;
    for (let i=0;i<4;i++){ g.save(); g.translate(0, (i - 1.5)*lw*0.16); g.setLineDash([8 + r()*20, 6 + r()*14]); main(); g.stroke(); g.restore(); }
    g.setLineDash([]);
  },
  castle:(g, ww, hh) => {
    contactShadow(g, ww, hh*0.6);
    const stone = '#b7cddd', shade = '#86a1b5', dark = '#1b2e38';
    const block = (x, y, w, h) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, stone); gr.addColorStop(1, shade); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = gr; const n = 3, cw = w/(n*2 - 1); for (let i=0;i<n;i++) g.fillRect(x + i*2*cw, y - cw*0.9, cw, cw*0.9); };
    block(-ww*0.45, -hh*0.42, ww*0.9, hh*0.42);
    block(-ww*0.47, -hh*0.72, ww*0.26, hh*0.72); block(ww*0.21, -hh*0.72, ww*0.26, hh*0.72);
    block(-ww*0.17, -hh*0.92, ww*0.34, hh*0.92);
    g.strokeStyle = 'rgba(20,50,70,.18)'; g.lineWidth = 1.5;
    for (let y=-hh*0.1;y>-hh*0.9;y-=hh*0.1){ g.beginPath(); g.moveTo(-ww*0.47, y); g.lineTo(ww*0.47, y); g.stroke(); }
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(-ww*0.1, 0); g.lineTo(-ww*0.1, -hh*0.16); g.arc(0, -hh*0.16, ww*0.1, Math.PI, 0); g.lineTo(ww*0.1, 0); g.closePath(); g.fill();
    const win = (x, y) => { g.beginPath(); g.moveTo(x - ww*0.035, y); g.lineTo(x - ww*0.035, y - hh*0.06); g.arc(x, y - hh*0.06, ww*0.035, Math.PI, 0); g.lineTo(x + ww*0.035, y); g.closePath(); g.fill(); };
    win(-ww*0.34, -hh*0.48); win(ww*0.34, -hh*0.48); win(0, -hh*0.62);
    g.strokeStyle = '#5b6b75'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -hh*0.92 - ww*0.1); g.lineTo(0, -hh*1.08); g.stroke();
    g.fillStyle = '#ff7350'; g.beginPath(); g.moveTo(0, -hh*1.08); g.lineTo(ww*0.16, -hh*1.04); g.lineTo(0, -hh*1.0); g.closePath(); g.fill();
  },
  chest:(g, ww, hh) => {
    contactShadow(g, ww, hh);
    const box = g.createLinearGradient(0, -hh*0.6, 0, 0); box.addColorStop(0, '#9c6a3c'); box.addColorStop(1, '#5e3b1f');
    g.fillStyle = box; g.fillRect(-ww*0.42, -hh*0.58, ww*0.84, hh*0.58);
    const lid = g.createLinearGradient(0, -hh, 0, -hh*0.58); lid.addColorStop(0, '#b47c48'); lid.addColorStop(1, '#7d5130');
    g.fillStyle = lid; g.beginPath(); g.moveTo(-ww*0.44, -hh*0.58); g.quadraticCurveTo(-ww*0.44, -hh*0.98, 0, -hh*0.98); g.quadraticCurveTo(ww*0.44, -hh*0.98, ww*0.44, -hh*0.58); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,20,8,.35)'; g.lineWidth = 1.5; for (let y=-hh*0.45;y<0;y+=hh*0.14){ g.beginPath(); g.moveTo(-ww*0.42, y); g.lineTo(ww*0.42, y); g.stroke(); }
    g.fillStyle = '#e9b949';
    g.fillRect(-ww*0.3, -hh*0.95, ww*0.07, hh*0.95); g.fillRect(ww*0.23, -hh*0.95, ww*0.07, hh*0.95);
    g.fillRect(-ww*0.44, -hh*0.62, ww*0.88, hh*0.06);
    g.fillRect(-ww*0.07, -hh*0.66, ww*0.14, hh*0.17); g.fillStyle = '#3b2412'; g.beginPath(); g.arc(0, -hh*0.6, ww*0.022, 0, PI2); g.fill();
    g.fillStyle = '#ffd166'; for (const [x, y] of [[-0.46,-0.04],[-0.38,-0.02],[0.45,-0.03],[0.52,-0.02]]){ g.beginPath(); g.ellipse(x*ww, y*hh, ww*0.05, hh*0.025, 0, 0, PI2); g.fill(); }
  },
  coral:(g, ww, hh, r) => {
    g.lineCap = 'round'; g.strokeStyle = '#ff7fa8';
    const br = (x0, y0, a, len, w, d) => {
      const x1 = x0 + Math.cos(a)*len, y1 = y0 + Math.sin(a)*len;
      g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(a + 0.3)*len*0.5, y0 + Math.sin(a + 0.3)*len*0.5, x1, y1); g.stroke();
      if (d > 0){ br(x1, y1, a - 0.42 - r()*0.2, len*0.72, w*0.72, d - 1); br(x1, y1, a + 0.42 + r()*0.2, len*0.72, w*0.72, d - 1); }
      else { g.fillStyle = '#ffc2d4'; g.beginPath(); g.arc(x1, y1, w*0.7, 0, PI2); g.fill(); }
    };
    br(0, 0, -Math.PI/2, hh*0.36, ww*0.13, 3);
  },
  fan:(g, ww, hh, r) => {
    g.lineCap = 'round'; g.strokeStyle = '#ff9f5a'; g.lineWidth = Math.max(1.5, ww*0.03);
    const tips = [];
    for (let i=0;i<15;i++){ const a = -Math.PI/2 + (i/14 - 0.5)*2.1, len = hh*(0.7 + r()*0.25);
      const x1 = Math.cos(a)*len, y1 = Math.sin(a)*len;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.15)*len*0.5, Math.sin(a + 0.15)*len*0.5, x1, y1); g.stroke(); tips.push([x1, y1]); }
    g.strokeStyle = 'rgba(255,190,140,.55)'; g.lineWidth = 1;
    for (const k of [0.45, 0.65, 0.85]){ g.beginPath(); tips.forEach(([x, y], i) => { const px = x*k, py = y*k; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); }
  },
  shell:(g, ww, hh) => {
    contactShadow(g, ww, hh*0.5);
    const n = 9, R = ww*0.48;
    g.beginPath(); g.moveTo(-ww*0.12, 0);
    for (let i=0;i<=n;i++){ const a = Math.PI + i/n*Math.PI; const x = Math.cos(a)*R, y = -hh*0.1 + Math.sin(a)*hh*0.85; g.lineTo(x, y); }
    g.lineTo(ww*0.12, 0); g.closePath();
    g.fillStyle = '#ffd6c9'; g.fill(); g.strokeStyle = '#b9776a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#e8a798'; g.lineWidth = 1.5;
    for (let i=1;i<n;i++){ const a = Math.PI + i/n*Math.PI; g.beginPath(); g.moveTo(0, -hh*0.02); g.lineTo(Math.cos(a)*R*0.95, -hh*0.1 + Math.sin(a)*hh*0.8); g.stroke(); }
  },
  bubbler:(g, ww, hh) => {
    g.fillStyle = '#5b6a6a'; g.beginPath(); g.ellipse(0, -hh*0.4, ww*0.48, hh*0.45, 0, 0, PI2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.ellipse(-ww*0.12, -hh*0.6, ww*0.22, hh*0.12, 0, 0, PI2); g.fill();
    g.fillStyle = '#26302f'; g.beginPath(); g.ellipse(0, -hh*0.8, ww*0.08, hh*0.08, 0, 0, PI2); g.fill();
  },
};
const spriteCache = new Map();
function spriteFor(it){
  const def = DECOR[it.kind];
  const key = it.kind + '|' + it.seed + '|' + Math.round(U) + '|' + DPR;
  let sp = spriteCache.get(key); if (sp) return sp;
  if (spriteCache.size > 80) spriteCache.clear();
  const SP = DPR*1.5, px = U*SP, ww = def.w*px, hh = def.h*px;
  const cw = Math.ceil(Math.max(ww*1.35, hh*1.4)), ch = Math.ceil(hh*1.25);
  const c = mkCanvas(cw, ch), g = c.getContext('2d'); g.translate(cw/2, ch*0.94);
  DRAW[it.kind](g, ww, hh, rng(it.seed));
  sp = {c, SP, cw, ch}; spriteCache.set(key, sp); return sp;
}
function plantBlades(it){
  if (it._b) return it._b;
  const r = rng(it.seed), b = [];
  if (it.kind === 'grass') for (let i=0;i<9;i++) b.push({dx:(r() - .5)*0.5, len:2.4*(0.55 + r()*0.45), w:0.05 + r()*0.04, lean:(r() - .5)*0.25, curve:(r() - .5)*0.3, ph:r()*6, h:115 + r()*30, s:45 + r()*20, l:28 + r()*14});
  if (it.kind === 'bush') for (let i=0;i<12;i++) b.push({dx:(r() - .5)*0.7, len:1.0*(0.45 + r()*0.55), w:0.1 + r()*0.08, lean:(r() - .5)*1.1, curve:(r() - .5)*0.25, ph:r()*6, h:90 + r()*40, s:50 + r()*20, l:30 + r()*14});
  if (it.kind === 'kelp') for (let i=0;i<3;i++) b.push({dx:(r() - .5)*0.4, len:3.0*(0.7 + r()*0.3), ph:r()*6, h:75 + r()*20, s:45 + r()*15, l:30 + r()*10});
  it._b = b; return b;
}
function drawLive(g, it, X, Y, k, t){
  const u = U*k, amp = reduceMotion ? 0.03 : 0.1, fl = it.flip ? -1 : 1;
  const hue = cur.hue, L = cur.light;
  if (it.kind === 'grass' || it.kind === 'bush'){
    for (const b of plantBlades(it)){
      const bx = X + b.dx*u*fl, len = b.len*u, w = b.w*u;
      const sway = Math.sin(t*0.9 + b.ph + X*0.01)*len*amp + b.lean*len*0.5*fl;
      const tipX = bx + sway, tipY = Y - len, cx = bx + sway*0.35 + b.curve*u*fl, cy = Y - len*0.55;
      g.fillStyle = `hsl(${b.h + hue} ${b.s}% ${b.l + L}%)`;
      g.beginPath(); g.moveTo(bx - w, Y); g.quadraticCurveTo(cx - w*0.7, cy, tipX, tipY); g.quadraticCurveTo(cx + w*0.7, cy, bx + w, Y); g.closePath(); g.fill();
    }
  } else if (it.kind === 'kelp'){
    for (const b of plantBlades(it)){
      const n = 14, len = b.len*u; let px = X + b.dx*u*fl, py = Y;
      g.strokeStyle = `hsl(${b.h + hue - 10} ${b.s}% ${b.l + L - 6}%)`; g.lineWidth = Math.max(2, u*0.06); g.lineCap = 'round';
      const pts = [[px, py]];
      for (let i=1;i<=n;i++){ const v = i/n; pts.push([X + b.dx*u*fl + Math.sin(t*0.8 + b.ph + v*2.5)*u*0.28*v, Y - len*v]); }
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke();
      g.fillStyle = `hsl(${b.h + hue} ${b.s + 5}% ${b.l + L}%)`;
      for (let i=2;i<=n;i+=1){ const [x, y] = pts[i]; const side = i % 2 ? 1 : -1;
        g.save(); g.translate(x, y); g.rotate(side*0.9 + Math.sin(t + i)*0.1); g.beginPath(); g.ellipse(side*u*0.12, 0, u*0.16, u*0.06, 0, 0, PI2); g.fill(); g.restore(); }
    }
  } else if (it.kind === 'drawnPlant' && it.img){
    const [w, h] = drawnSize(it, k), N = 12, iw = it.img.width, ih = it.img.height, sh = ih/N;
    g.save(); g.translate(X, Y); if (it.flip) g.scale(-1, 1);
    for (let i=0;i<N;i++){ const v = 1 - (i + 0.5)/N; const off = Math.sin(t*0.9 + (it.seed % 10) + v*1.5)*h*0.06*v*v*(reduceMotion ? 0.3 : 1);
      const sy0 = i*sh, shc = Math.min(sh + 0.6, ih - sy0);
      g.drawImage(it.img, 0, sy0, iw, shc, -w/2 + off, -h + h*i/N, w, h/N + 0.8); }
    g.restore();
  }
}
function drawnSize(it, k){
  const img = it.img; if (!img) return [U*k, U*k];
  const ar = img.width/img.height;
  let h = (it.kind === 'drawnPlant' ? 1.6 : 1.1)*U*k, w = h*ar;
  const maxW = 2.2*U*k; if (w > maxW){ w = maxW; h = w/ar; }
  return [w, h];
}
function itemK(it){ return (0.8 + it.d*0.35)*it.s; }
function itemBox(it){
  const k = itemK(it), X = it.x*W, Y = itemY(it), def = DECOR[it.kind];
  let w, h; if (def.drawn) [w, h] = drawnSize(it, k); else { w = def.w*U*k; h = def.h*U*k; }
  return {x0:X - w/2, y0:Y - h, x1:X + w/2, y1:Y, X, Y, k};
}
function drawItem(g, it, t){
  const def = DECOR[it.kind]; if (!def) return;
  const b = itemBox(it);
  if (def.live){ drawLive(g, it, b.X, b.Y, b.k, t); }
  else if (def.drawn){
    if (!it.img) return; const w = b.x1 - b.x0, h = b.y1 - b.y0;
    g.save(); g.translate(b.X, b.Y); if (it.flip) g.scale(-1, 1);
    g.fillStyle = 'rgba(0,18,24,.22)'; g.beginPath(); g.ellipse(0, 0, w*0.45, Math.max(3, h*0.06), 0, 0, PI2); g.fill();
    g.drawImage(it.img, -w/2, -h, w, h); g.restore();
  } else {
    const sp = spriteFor(it), sw = sp.cw/sp.SP*b.k, sh = sp.ch/sp.SP*b.k;
    g.save(); g.translate(b.X, b.Y); if (it.flip) g.scale(-1, 1); g.drawImage(sp.c, -sw/2, -sh*0.94, sw, sh); g.restore();
  }
  if (decoMode && it === selItem){
    g.save(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2/cam.z; g.setLineDash([6/cam.z, 5/cam.z]);
    g.strokeRect(b.x0 - 6, b.y0 - 6, b.x1 - b.x0 + 12, b.y1 - b.y0 + 12); g.restore();
  }
}
let hideSpots = [];
function computeHides(){
  hideSpots = [];
  for (const it of decor){ const def = DECOR[it.kind]; if (!def || !def.hide) continue;
    const b = itemBox(it), w = def.w*U*b.k, h = def.h*U*b.k;
    hideSpots.push({x:b.X + def.hide[0]*w*(it.flip ? -1 : 1), y:b.Y + def.hide[1]*h}); }
}
function defaultDecor(){
  const L = [['cave',.2,.1,1],['rock2',.31,.28,1],['wood',.5,.12,1],['rock1',.76,.2,1],['grass',.05,.05,1],['grass',.12,.32,.9],['kelp',.86,.08,1],
    ['bush',.95,.4,1],['coral',.63,.36,1],['fan',.4,.22,.9],['shell',.45,.82,1],['bubbler',.9,.18,1],['bush',.33,.86,.9],['grass',.985,.9,.8],['rock3',.7,.9,1]];
  return L.map(([kind, x, d, s], i) => ({id:uid(), kind, x, d, s, flip:i % 3 === 1, seed:101 + i*37}));
}

/* ================= Creatures ================= */
let flakes = [], bubbles = [], rings = [], hearts = [], sparks = [], texts = [], pearlBits = [];
let nightV = 0, nightT = 0, clock = 0, lure = null;
const TRICKS = {swim:['spin','loop','flip'], wiggle:['spin','loop','flip'], zoom:['loop','spin','flip'], float:['spin','flip','loop'], pulse:['spin','flip','loop'],
  crawl:['jump','spin','flip'], scuttle:['jump','spin','flip'], drive:['jump','spin','flip'], bounce:['jump','spin','flip']};
const TRICK_NAMES = {spin:'a spin', loop:'a loop-the-loop', flip:'a flip', jump:'a big jump'};
const TRICK_AT = [4, 10, 20];
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x*x*(3 - 2*x);
function depthK(c){ return isGround(c) ? 1 : 0.8 + 0.25*c.z; }
function dims(c){
  const base = clamp(Math.min(W, H*1.3)*0.135, 54, 120)*c.growth*depthK(c);
  const ar = c.img.height/c.img.width;
  let dw = base, dh = base*ar; const maxH = base*0.95;
  if (dh > maxH){ dh = maxH; dw = dh/ar; }
  if (c.type === 'float' || c.type === 'pulse'){ dw *= .92; dh *= .92; }
  return [dw, dh];
}
function bounds(c, dw, dh){ return {x0:dw*0.5 + 6, x1:W - dw*0.5 - 6, y0:H*0.09 + dh*0.5, y1:Math.max(H*0.09 + dh*0.5 + 10, sandY(c.x) - dh*0.3)}; }
function emote(c, k){ c.emote = {k, t:0}; }
function pickTarget(c){
  const [dw, dh] = dims(c); c.timer = rand(3, 7); c.dash = false; c.toy = null;
  if (isGround(c)){
    c.tx = rand(dw, W - dw); c.ty = 0;
    if (c.pers === 'sleepy' && Math.random() < .4){ c.state = 'rest'; c.rest = rand(6, 12); c.tx = c.x; c.yawnT = 1.3; } else c.state = 'wander';
    return;
  }
  c.tz = Math.random();
  const b = bounds(c, dw, dh); let s = 'wander';
  if (c.pers === 'shy' && Math.random() < .6 && hideSpots.length){ const h = pick(hideSpots); c.tx = h.x + rand(-8, 8); c.ty = clamp(h.y + rand(-6, 6), b.y0, b.y1); s = 'hide'; c.timer = rand(6, 11); }
  else if (c.pers === 'sleepy' && Math.random() < .35){
    const napper = creatures.find(o => o !== c && o.resting && !isGround(o));
    c.tx = napper ? clamp(napper.x + rand(-40, 40), b.x0, b.x1) : rand(b.x0, b.x1); c.ty = b.y1; s = 'rest'; c.rest = rand(8, 14); c.timer = 30; c.yawnT = 1.3;
  }
  else if (c.pers === 'friendly' && Math.random() < .6){
    const others = creatures.filter(o => o !== c && !isGround(o) && !o.birth);
    const fr = others.filter(o => c.friends.includes(o.id));
    if (others.length){ c.buddy = pick(fr.length ? fr : others); s = 'follow'; c.timer = rand(8, 14); }
    else { c.tx = rand(b.x0, b.x1); c.ty = rand(b.y0, b.y1); }
  }
  else if (c.pers === 'playful' && Math.random() < .4 && bubbles.length){ s = 'play'; c.timer = rand(5, 9); }
  else if (c.type === 'float' || c.type === 'pulse'){ c.tx = rand(b.x0, b.x1); c.ty = rand(b.y0, b.y0 + (b.y1 - b.y0)*0.65); c.timer = rand(6, 10); }
  else { c.tx = rand(b.x0, b.x1); c.ty = rand(b.y0, b.y1); }
  if (c.pers === 'playful' && s === 'wander') c.dash = Math.random() < .5;
  c.state = s;
}
function sampleLids(c){
  c.lidCols = [];
  if (!c.eyes || !c.eyes.length) return;
  try {
    const w = c.img.width, h = c.img.height, cc = mkCanvas(w, h), g = cc.getContext('2d', {willReadFrequently:true}); g.drawImage(c.img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    for (const [u, v, r] of c.eyes){
      const cx = u*w, cy = v*h, R = r*w; let sr = 0, sg = 0, sb = 0, n = 0;
      for (let a=0;a<32;a++) for (const k of [1.35, 1.6, 1.9]){
        const x = Math.round(cx + Math.cos(a/32*PI2)*R*k), y = Math.round(cy + Math.sin(a/32*PI2)*R*k);
        if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = (y*w + x)*4;
        if (d[i+3] < 160) continue; if ((d[i] + d[i+1] + d[i+2])/3 < 55) continue;
        sr += d[i]; sg += d[i+1]; sb += d[i+2]; n++; }
      c.lidCols.push(n ? `rgb(${sr/n|0},${sg/n|0},${sb/n|0})` : '#f2f2f2');
    }
  } catch(e){ c.lidCols = c.eyes.map(() => '#f2f2f2'); }
}
function makeCreature(d, img){
  const c = Object.assign({meals:0, spots:{}, friends:[], joined:Date.now(), growth:1, eyes:[], joy:0.6, tricks:[]}, d);
  c.friends = (c.friends || []).slice(); c.spots = Object.assign({}, c.spots || {}); c.eyes = (c.eyes || []).map(e => e.slice()); c.tricks = (c.tricks || []).slice();
  if (!TYPES[c.type]) c.type = 'swim'; if (!PERS[c.pers]) c.pers = 'friendly';
  c.img = img; c.x = rand(W*0.2, W*0.8); c.y = rand(H*0.25, H*0.6); c.vx = 0; c.vy = 0;
  c.dir = Math.random() < .5 ? 1 : -1; c.face = c.dir; c.phase = Math.random()*10;
  c.hunger = Math.random()*0.5; c.happy = 0; c.chomp = 0; c.rest = 0; c.resting = false; c.hop = 0; c.spin = 0; c.dashT = 0; c.dashing = false;
  c.z = Math.random(); c.tz = c.z; c.blinkIn = rand(1, 5); c.blinkT = 0; c.petted = 0; c.heartT = 0; c.nameT = 0; c.yawnT = 0; c.shimmy = 0; c.gulp = 0; c.emote = null; c.trick = null; c.birth = null;
  c.tx = c.x; c.ty = c.y; c.timer = 0; c.state = 'wander';
  if (isGround(c)) c.y = groundY(c.x) - dims(c)[1]*0.5;
  sampleLids(c); pickTarget(c); return c;
}
function zoneOf(c, dh){
  for (const h of hideSpots) if (Math.hypot(h.x - c.x, h.y - c.y) < 90) return 'cave';
  for (const it of decor){ if (!DECOR[it.kind] || !DECOR[it.kind].live) continue; if (Math.abs(it.x*W - c.x) < 70 && c.y > sandY(c.x) - U*2) return 'plants'; }
  if (isGround(c) || c.y > sandY(c.x) - dh) return 'sand';
  if (c.y < H*0.3) return 'top';
  return 'middle';
}
const SPOT_NAMES = {cave:'In a hiding place', plants:'By the plants', sand:'On the sand', top:'Near the top', middle:'Out in the open'};
function doTrick(c, k){
  if (!c.tricks.length && !k) return false;
  k = k || pick(c.tricks);
  c.trick = {k, t:0, dur:k === 'loop' ? 1.3 : 0.95}; c.joy = Math.min(1, c.joy + 0.05); Snd.whoosh(); return true;
}
function learnTrick(c){
  const idx = TRICK_AT.indexOf(c.meals); if (idx < 0) return;
  const k = (TRICKS[c.type] || TRICKS.swim)[idx]; if (!k || c.tricks.includes(k)) return;
  c.tricks.push(k); emote(c, 'sparkle'); Snd.chime();
  setTimeout(() => doTrick(c, k), 500);
  toast(`${c.name} learned ${TRICK_NAMES[k]}! Tap ${c.name} to see it again.`);
}
function update(c, dt, t){
  if (c.birth) return;
  const ty = TYPES[c.type] || TYPES.swim, ground = !!ty.ground;
  const [dw, dh] = dims(c);
  c.z += (c.tz - c.z)*dt*0.08;
  c.hunger = Math.min(1, c.hunger + dt*0.012);
  c.joy = Math.max(0.35, c.joy - dt*0.0015);
  c.happy = Math.max(0, c.happy - dt*0.9); c.chomp = Math.max(0, c.chomp - dt*3);
  c.petted = Math.max(0, c.petted - dt); c.nameT = Math.max(0, c.nameT - dt); c.yawnT = Math.max(0, c.yawnT - dt);
  c.shimmy = Math.max(0, c.shimmy - dt); c.gulp = Math.max(0, c.gulp - dt);
  if (c.emote){ c.emote.t += dt; if (c.emote.t > 1.8) c.emote = null; }
  c.blinkIn -= dt; if (c.blinkIn <= 0){ c.blinkT = 0.18; c.blinkIn = rand(2.5, 6.5); } c.blinkT = Math.max(0, c.blinkT - dt);
  if (c.trick){ c.trick.t += dt; if (c.trick.t >= c.trick.dur) c.trick = null; }
  if (c.petted > 0){
    c.joy = Math.min(1, c.joy + dt*0.05); c.heartT -= dt;
    if (c.heartT <= 0){ c.heartT = 0.4; hearts.push({x:c.x + rand(-dw*0.3, dw*0.3), y:c.y - dh*0.4, vy:-30, life:1.4}); Snd.purr(); }
  }
  const p = PERS[c.pers] || PERS.friendly;
  let max = ty.spd*p.spd*scaleS*(1 - 0.45*nightV)*(restAll ? 0.25 : 1);
  let food = null;
  if (c.hunger > 0.12 && flakes.length && !restAll){
    let best = 1e9;
    for (const f of flakes){ if (f.eaten || (ground && !f.landed)) continue;
      const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < best && (c.pers === 'greedy' || d < W*0.65)){ best = d; food = f; } }
  }
  if (food && !c.sawFood){ c.sawFood = true; emote(c, '!'); } else if (!food) c.sawFood = false;
  c.resting = false;
  const lured = !food && lure && !restAll && c.pers !== 'shy' && c.petted <= 0;
  if (food){
    c.tx = food.x; c.ty = food.y; max *= c.pers === 'greedy' ? 1.9 : 1.5;
    if (c.state === 'rest' || c.state === 'hide') c.state = 'wander';
  } else if (lured){
    const a = c.phase*2 + t*0.6, rr2 = 30 + (c.phase % 3)*18;
    c.tx = lure.x + Math.cos(a)*rr2; c.ty = lure.y + Math.sin(a)*rr2*0.6; max *= 1.25;
    if (!c.lured){ c.lured = true; emote(c, '?'); }
    if (c.state === 'rest' || c.state === 'hide') c.state = 'wander';
  } else {
    if (c.lured){ c.lured = false; pickTarget(c); }
    if (c.state === 'follow' && c.buddy && creatures.includes(c.buddy)){ const [bw, bh] = dims(c.buddy); c.tx = c.buddy.x - c.buddy.dir*(bw*0.5 + dw*0.6); c.ty = c.buddy.y + bh*0.35; }
    if (c.state === 'play'){
      if (!c.toy || !bubbles.includes(c.toy)){ let best = 1e9; c.toy = null; for (const b of bubbles){ const d = Math.hypot(b.x - c.x, b.y - c.y); if (d < best && b.y > H*0.15){ best = d; c.toy = b; } } }
      if (c.toy){ c.tx = c.toy.x; c.ty = c.toy.y; max *= 1.3;
        if (Math.hypot(c.toy.x - c.x, c.toy.y - c.y) < dw*0.45){ popBubble(c.toy); c.toy = null; c.happy = 0.6; if (Math.random() < .3) emote(c, 'note'); } }
    }
    c.timer -= dt;
    const d = ground ? Math.abs(c.tx - c.x) : Math.hypot(c.tx - c.x, c.ty - c.y);
    if (restAll){ c.resting = true; }
    else if (c.state === 'rest' && d < 20){ c.resting = true; c.rest -= dt; if (c.rest <= 0){ pickTarget(c); c.shimmy = 0.5; } }
    else if (c.timer <= 0 || (d < 14 && c.state !== 'follow' && c.state !== 'hide' && c.state !== 'rest' && c.state !== 'play')) pickTarget(c);
    if (c.state === 'hide' && d < 24) max *= 0.15;
    if (!c.resting && !c.trick && c.petted <= 0){
      if (c.tricks.length && c.joy > 0.6 && Math.random() < dt/40) doTrick(c);
      else if (Math.random() < dt/45){ c.shimmy = 0.8; emote(c, 'note'); }
    }
  }
  if (c.petted > 0) max = 0;
  if (c.dash) max *= 1.6;
  if (c.type === 'zoom'){ c.dashT -= dt; if (c.dashT <= 0){ c.dashing = !c.dashing; c.dashT = c.dashing ? rand(0.6, 1.1) : rand(1.5, 3.5); } max *= c.dashing ? 2.4 : 0.5; }
  const dx = c.tx - c.x, dy = ground ? 0 : c.ty - c.y, dist = Math.hypot(dx, dy) || 1;
  const want = c.resting ? 0 : max*Math.min(1, dist/60);
  const acc = Math.min(1, dt*(c.petted > 0 ? 6 : c.type === 'float' ? 0.8 : ground ? 3 : c.type === 'zoom' ? 3.2 : 2.2));
  c.vx += (dx/dist*want - c.vx)*acc; c.vy += (dy/dist*want - c.vy)*acc;
  if (c.type === 'pulse'){ const th = Math.pow(Math.max(0, Math.sin(t*2.4 + c.phase)), 3); const m = 0.25 + 1.6*th; c.x += c.vx*dt*m; c.y += c.vy*dt*m + (c.petted > 0 ? 0 : 6*dt); c.thrust = th; }
  else { c.x += c.vx*dt; c.y += c.vy*dt; }
  if (ground){ c.x = clamp(c.x, dw*0.5, W - dw*0.5); c.y = groundY(c.x) - dh*0.5; c.vy = 0; }
  else { const b = bounds(c, dw, dh); c.x = clamp(c.x, b.x0, b.x1); c.y = clamp(c.y, b.y0, b.y1); }
  if (ty.noflip){ c.face = 1; if (Math.abs(c.vx) > 6) c.dir = c.vx > 0 ? 1 : -1; }
  else { if (Math.abs(c.vx) > 6) c.dir = c.vx > 0 ? 1 : -1; c.face += (c.dir - c.face)*Math.min(1, dt*5); }
  if (c.type === 'bounce'){ c.hop += dt*(2.6 + Math.abs(c.vx)*0.03); c.spin += c.vx*dt/(dw*0.5); }
  if (c.type === 'zoom' && c.dashing && Math.random() < dt*40) sparks.push({x:c.x - c.dir*dw*0.48, y:c.y + rand(-4, 4), vx:-c.dir*rand(30, 70), vy:rand(-15, 15), life:0.5, col:pick(['#ffd166','#ff7350','#ffef9f']), r:rand(2, 5)});
  if (food){
    let ate = false;
    if (ground) ate = Math.abs(food.x - c.x) < dw*0.3;
    else { const hx = c.x + (ty.noflip ? 0 : c.dir*dw*0.36); ate = Math.hypot(food.x - hx, food.y - c.y) < Math.max(16, dw*0.22) || Math.hypot(food.x - c.x, food.y - c.y) < dw*0.3; }
    if (ate){
      food.eaten = true; c.hunger = Math.max(0, c.hunger - 0.35); c.growth = Math.min(2, c.growth + 0.03); c.chomp = 1; c.gulp = 0.35; c.meals++;
      c.joy = Math.min(1, c.joy + 0.06);
      Snd.chomp(); if (Math.random() < .35) emote(c, 'yum');
      if (settings.rewards && c.meals % 3 === 0) pearlBits.push({x:c.x, y:c.y - dh*0.3, vy:-28, life:6, ph:Math.random()*6});
      learnTrick(c); saveSoon();
    }
  }
  if (!ground && !c.resting && Math.random() < dt*0.07) bubbles.push({x:c.x + c.dir*dw*0.42, y:c.y - dh*0.1, r:1.5 + Math.random()*2.5, vy:-30 - Math.random()*20, ph:Math.random()*6});
  const z = zoneOf(c, dh); c.spots[z] = (c.spots[z] || 0) + dt;
}
function drawLids(c, dw, dh, offAt, k, style){
  if (!c.eyes || !c.eyes.length || k <= 0) return;
  c.eyes.forEach(([u, v, r], i) => {
    const x = -dw/2 + u*dw, y = -dh/2 + v*dh + offAt(u), R = Math.max(2, r*dw*1.15);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, PI2); ctx.clip();
    ctx.fillStyle = (c.lidCols && c.lidCols[i]) || '#f2f2f2'; ctx.fillRect(x - R, y - R, R*2, R*2*k);
    ctx.restore();
    ctx.strokeStyle = '#1d2b30'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, R*0.24);
    ctx.beginPath();
    if (k > 0.7){
      if (style === 'happy'){ ctx.moveTo(x - R*0.7, y + R*0.2); ctx.quadraticCurveTo(x, y - R*0.75, x + R*0.7, y + R*0.2); }
      else { ctx.moveTo(x - R*0.75, y); ctx.quadraticCurveTo(x, y + R*0.6, x + R*0.75, y); }
    } else { const ly = y - R + R*2*k; ctx.moveTo(x - R*0.85, ly); ctx.lineTo(x + R*0.85, ly); }
    ctx.stroke();
  });
}
function drawCreature(c, t){
  if (c.birth) return;
  const [dw, dh] = dims(c), speed = Math.hypot(c.vx, c.vy);
  ctx.save(); ctx.translate(c.x, c.y);
  let ang = 0, bob = 0, sx = 1, sy = 1;
  switch (c.type){
    case 'swim': case 'wiggle': ang = clamp(Math.atan2(c.vy, Math.abs(c.vx) + 1), -0.5, 0.5)*0.7; bob = Math.sin(t*1.3 + c.phase)*2; break;
    case 'zoom': ang = clamp(Math.atan2(c.vy, Math.abs(c.vx) + 1), -0.9, 0.9); break;
    case 'float': ang = Math.sin(t*0.6 + c.phase)*0.18; bob = Math.sin(t*0.9 + c.phase)*6; sy = 1 + Math.sin(t*1.8 + c.phase)*0.03; break;
    case 'pulse': { const th = c.thrust || 0; sx = 1 + 0.1*th; sy = 1 - 0.12*th; ang = Math.sin(t*0.5 + c.phase)*0.08; break; }
    case 'crawl': ang = Math.sin(t*1.4 + c.phase)*0.06; break;
    case 'scuttle': { const k = Math.min(1, speed/15); ang = Math.sin(t*18 + c.phase)*0.06*k; bob = -Math.abs(Math.sin(t*18 + c.phase))*2*k; break; }
    case 'drive': { const k = Math.min(1, speed/20); bob = -Math.abs(Math.sin(t*9 + c.phase))*3*k; ang = Math.sin(t*7 + c.phase)*0.025*k; break; }
    case 'bounce': { const h = Math.abs(Math.sin(c.hop)); bob = -h*dh*0.7; const squash = Math.max(0, 0.18 - h)*1.2; sx = 1 + squash; sy = 1 - squash; break; }
  }
  sy *= 1 + 0.02*Math.sin(t*2.2 + c.phase);
  if (c.yawnT > 0){ const k = Math.sin((1 - c.yawnT/1.3)*Math.PI); sy *= 1 + 0.1*k; sx *= 1 - 0.04*k; ang -= 0.18*k; }
  if (c.gulp > 0){ const k = Math.sin(c.gulp/0.35*Math.PI); sx *= 1 + 0.1*k; sy *= 1 + 0.15*k; }
  if (c.shimmy > 0) ang += Math.sin(t*28)*0.13*Math.min(1, c.shimmy/0.4);
  if (c.petted > 0){ sx *= 1 + 0.035*Math.sin(t*14); sy *= 1 - 0.035*Math.sin(t*14); }
  if (c.resting && c.type !== 'drive' && c.type !== 'bounce') bob += Math.sin(t*0.8 + c.phase)*1.5;
  if (c.happy > 0) bob -= Math.sin(c.happy*Math.PI)*16;
  const fdir = TYPES[c.type].noflip ? 1 : c.dir;
  let trx = 0, tryy = 0, trr = 0;
  if (c.trick){
    const e = ease(c.trick.t/c.trick.dur);
    switch (c.trick.k){
      case 'spin': trr = PI2*e*fdir; break;
      case 'loop': { const R = Math.max(dw, dh)*0.7; trx = Math.sin(PI2*e)*R*fdir; tryy = -(1 - Math.cos(PI2*e))*R; trr = -PI2*e*fdir; break; }
      case 'flip': tryy = -Math.sin(Math.PI*e)*dh*0.9; trr = -PI2*e*fdir; break;
      case 'jump': tryy = -Math.sin(Math.PI*e)*dh*1.4; trr = Math.sin(PI2*e)*0.25*fdir; break;
    }
  }
  ctx.translate(trx, bob + tryy);
  if (c.type === 'bounce'){ ctx.translate(0, dh*0.5); ctx.scale(sx, sy); ctx.translate(0, -dh*0.5); ctx.rotate(c.spin + trr); }
  else ctx.rotate(ang*fdir + trr);
  let fx = c.face; if (Math.abs(fx) < 0.12) fx = 0.12*(fx < 0 ? -1 : 1);
  const ch = 1 + c.chomp*0.09;
  if (c.type !== 'bounce') ctx.scale(fx*ch*sx, sy/ch); else ctx.scale(fx, 1);
  const iw = c.img.width, ih = c.img.height;
  let offAt = () => 0;
  if (c.type === 'swim' || c.type === 'crawl' || c.type === 'wiggle'){
    const N = 16, sw = iw/N;
    let freq, amp, wave = 3.2;
    if (c.type === 'swim'){ freq = c.resting || c.petted > 0 ? 1.4 : 3 + Math.min(6, speed*0.06); amp = dh*(0.045 + Math.min(0.06, speed*0.0008)) + c.happy*dh*0.08; }
    else if (c.type === 'wiggle'){ freq = 4.5; amp = dh*0.14 + c.happy*dh*0.06; wave = 6; }
    else { freq = 2; amp = dh*0.03; }
    const wig = c.type === 'wiggle';
    offAt = u => Math.sin(t*freq + c.phase - u*wave)*amp*(wig ? 0.35 + 0.65*(1 - u) : Math.pow(1 - u, 1.5));
    for (let i=0;i<N;i++){
      const u = i/(N - 1), sx0 = i*sw, swc = Math.min(sw + 0.6, iw - sx0);
      ctx.drawImage(c.img, sx0, 0, swc, ih, -dw/2 + dw*i/N, -dh/2 + offAt(u), dw/N + 0.9, dh);
    }
  } else ctx.drawImage(c.img, -dw/2, -dh/2, dw, dh);
  let k = 0, style = 'blink';
  if (c.resting || restAll){ k = 1; style = 'sleep'; }
  else if (c.petted > 0){ k = 1; style = 'happy'; }
  else if (c.blinkT > 0){ k = Math.sin((1 - c.blinkT/0.18)*Math.PI); }
  else if (c.yawnT > 0.3 && c.yawnT < 1.0){ k = 0.8; }
  drawLids(c, dw, dh, offAt, k, style);
  ctx.restore();
}
function drawShadow(c){
  if (c.birth) return;
  const [dw, dh] = dims(c);
  const gy = isGround(c) ? groundY(c.x) + 2 : sandY(c.x) + (H - sandY(c.x))*(0.12 + 0.2*c.z);
  const gap = Math.max(0, gy - (c.y + dh*0.5)), k = clamp(1 - gap/(H*0.7), 0.15, 1);
  ctx.fillStyle = `rgba(0,22,28,${0.2*k})`;
  ctx.beginPath(); ctx.ellipse(c.x, gy, dw*0.42*(0.6 + 0.4*k), Math.max(3, dh*0.08), 0, 0, PI2); ctx.fill();
}
function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function nameTag(c, y){
  ctx.font = '900 15px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(c.name).width + 22;
  ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(ctx, c.x - w/2, y, w, 26, 13); ctx.fill();
  ctx.fillStyle = '#14313a'; ctx.fillText(c.name, c.x, y + 18);
}
function drawEmote(c, dw, dh){
  const e = c.emote; if (!e) return;
  const a = Math.min(1, (1.8 - e.t)*3), s = Math.min(1, e.t*7)*(1 + 0.12*Math.sin(e.t*12)*Math.max(0, 1 - e.t*2));
  const x = c.x + (TYPES[c.type].noflip ? 0 : c.dir)*dw*0.28, y = c.y - dh*0.5 - 24 - e.t*5;
  ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, -18, -16, 36, 30, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(-1, 22); ctx.lineTo(6, 13); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  switch (e.k){
    case 'heart': heartPath(ctx, 0, 3, 10); ctx.fillStyle = '#ff5c80'; ctx.fill(); break;
    case 'sparkle': starPath(ctx, 0, -1, 11, 4.5, 5); ctx.fillStyle = '#ffc93c'; ctx.fill(); break;
    case 'note': ctx.fillStyle = '#0e5662'; ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.fillText('♪', 0, 0); break;
    case '!': ctx.fillStyle = '#ff7350'; ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.fillText('!', 0, 0); break;
    case '?': ctx.fillStyle = '#0e5662'; ctx.font = '900 19px Nunito, system-ui, sans-serif'; ctx.fillText('?', 0, 0); break;
    case 'yum': ctx.fillStyle = '#e85a37'; ctx.font = '900 12px Nunito, system-ui, sans-serif'; ctx.fillText('yum', 0, 0); break;
  }
  ctx.restore();
}
function drawOverlays(c, t){
  if (c.birth) return;
  const [dw, dh] = dims(c);
  if (c.resting && (c.pers === 'sleepy' || restAll)){
    ctx.font = '900 15px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let i=0;i<3;i++){ const k = ((t*0.5 + i/3) % 1); ctx.fillStyle = `rgba(239,251,248,${(1 - k)*0.9})`; ctx.fillText('z', c.x + c.dir*dw*0.25 + k*14, c.y - dh*0.5 - 6 - k*28); }
  }
  if (c === selC){
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(dw, dh)*0.62 + Math.sin(t*3)*2, 0, PI2); ctx.stroke();
    nameTag(c, c.y - Math.max(dw, dh)*0.62 - 34);
  } else if (c.nameT > 0){ ctx.globalAlpha = Math.min(1, c.nameT*2); nameTag(c, c.y - dh*0.5 - 34); ctx.globalAlpha = 1; }
  drawEmote(c, dw, dh);
}
function drawBirth(c, dt){
  const b = c.birth, prev = b.t; b.t += dt; const t = b.t;
  const [dw, dh] = dims(c);
  const S = Math.min(W, H)*0.46/cam.z, ar = c.img.width/c.img.height;
  let iw = S, ih = S/ar; if (ih > S*0.8){ ih = S*0.8; iw = ih*ar; }
  const cx = cam.x, cy = cam.y - H*0.04/cam.z;
  const appear = ease(t/0.45), lift = ease((t - 1.75)/0.5), shrink = ease((t - 2.6)/0.55);
  const shakeK = t > 0.55 && t < 1.8 ? Math.min(1, (t - 0.55)/1.0) : 0;
  if (prev < 0.55 && t >= 0.55) Snd.shimmer();
  if (prev < 1.75 && t >= 1.75) Snd.whoosh();
  const pw = iw + S*0.16, ph = ih + S*0.16;
  ctx.save(); ctx.globalAlpha = appear*(1 - lift); ctx.translate(cx, cy + lift*lift*H*0.5/cam.z); ctx.rotate(-0.03 + lift*0.5);
  ctx.shadowColor = 'rgba(0,20,30,.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = '#fffdf8'; rr(ctx, -pw/2, -ph/2, pw, ph, 14); ctx.fill(); ctx.restore();
  const x = lerp(cx, b.fx, shrink), y = lerp(cy, b.fy, shrink) - Math.sin(lift*Math.PI)*S*0.06*(1 - shrink);
  const w = lerp(iw*(1 + 0.12*lift), dw, shrink), h = lerp(ih*(1 + 0.12*lift), dh, shrink);
  const rot = shakeK ? Math.sin(t*38)*0.05*shakeK + Math.sin(t*23)*0.02*shakeK : -0.03*(1 - lift);
  ctx.save(); ctx.globalAlpha = appear; ctx.translate(x, y); ctx.rotate(rot);
  if (lift > 0 && shrink < 1){ ctx.shadowColor = 'rgba(0,20,30,.3)'; ctx.shadowBlur = 24*lift*(1 - shrink); ctx.shadowOffsetY = 14*lift*(1 - shrink); }
  if (shrink > 0 && shrink < 1){ const sq = Math.sin(shrink*Math.PI)*0.15; ctx.scale(1 + sq, 1 - sq); }
  ctx.drawImage(c.img, -w/2, -h/2, w, h);
  ctx.shadowColor = 'transparent';
  const bt = t - 2.2; if (bt > 0 && bt < 0.32) drawLids(c, w, h, () => 0, Math.sin(bt/0.32*Math.PI), 'blink');
  ctx.restore();
  if (shakeK > 0 && Math.random() < dt*28) sparks.push({x:x + rand(-w/2, w/2), y:y + rand(-h/2, h/2), vx:rand(-30, 30), vy:rand(-50, -10), life:0.7, col:pick(['#fff5b8','#ffffff','#ffd166']), r:rand(1.5, 3.5)});
  if (t >= 3.15){
    c.birth = null; c.x = b.fx; c.y = b.fy; c.nameT = 3.5; c.happy = 0.9; emote(c, 'heart');
    rings.push({x:c.x, y:c.y, r:10, life:1}); Snd.chime(); Snd.splash();
    for (let i=0;i<16;i++) sparks.push({x:c.x, y:c.y, vx:rand(-90, 90), vy:rand(-90, 60), life:0.8, col:pick(['#fff5b8','#ffffff','#ffd166','#ff9ecf']), r:rand(2, 4)});
    for (let i=0;i<14;i++) bubbles.push({x:c.x + rand(-30, 30), y:c.y + rand(-10, 20), r:1.5 + Math.random()*4, vy:-30 - Math.random()*50, ph:Math.random()*6});
    pickTarget(c);
  }
}

/* ================= Particles ================= */
const FOODC = ['#e07a3f','#c8552d','#f2a65a','#9c5b2e','#e8c170'];
function dropFood(x, y){
  const n = 4 + ((Math.random()*3)|0);
  for (let i=0;i<n && flakes.length < 90;i++)
    flakes.push({x:x + rand(-20, 20), y:Math.max(H*0.06, y + rand(-10, 10)), vy:rand(4, 12), ph:Math.random()*6, rot:Math.random()*6, s:rand(2.5, 4.5), col:pick(FOODC), landed:false, life:14, land:rand(0, 8), eaten:false});
}
function popBubble(b){
  const i = bubbles.indexOf(b); if (i >= 0) bubbles.splice(i, 1);
  for (let k=0;k<5;k++) sparks.push({x:b.x, y:b.y, vx:rand(-40, 40), vy:rand(-40, 40), life:0.4, col:'#e8fffb', r:1.5});
  Snd.pop();
}
let particles = [];
function buildParticles(){
  particles = [];
  const n = Math.round(clamp(W*H/16000, 30, 90));
  for (let i=0;i<n;i++) particles.push({x:Math.random()*W, y:Math.random()*H, r:0.6 + Math.random()*1.6, ph:Math.random()*6, a:0.15 + Math.random()*0.35, k:Math.random()});
}
function drawParticles(dt, t){
  const kind = SCENES[sceneId].parts;
  for (const p of particles){
    if (kind === 'snow'){ p.y += (12 + p.k*14)*dt; p.x += Math.sin(t*0.7 + p.ph)*10*dt; if (p.y > sandY(p.x)){ p.y = -4; p.x = Math.random()*W; }
      ctx.fillStyle = `rgba(255,255,255,${0.5 + p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 0.8, 0, PI2); ctx.fill(); continue; }
    if (kind === 'stars'){ continue; }
    p.y -= (1 + p.k*3)*dt; p.x += (Math.sin(t*0.5 + p.ph)*3 + (kind === 'pollen' ? 4 : 0))*dt;
    if (p.y < 0){ p.y = H; p.x = Math.random()*W; } if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (kind === 'glow'){
      const a = (0.35 + 0.35*Math.sin(t*1.5 + p.ph))*p.a*2;
      const col = p.k < .5 ? '120,240,255' : '255,140,220';
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*5);
      gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r*5, 0, PI2); ctx.fill();
    } else {
      ctx.fillStyle = kind === 'pollen' ? `rgba(220,240,150,${p.a})` : `rgba(220,250,240,${p.a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, PI2); ctx.fill();
    }
  }
}
function drawExtrasBack(){
  if (extrasW.space > 0.01){
    ctx.globalAlpha = extrasW.space;
    const r = Math.min(W, H)*0.08, x = W*0.8, y = H*0.2;
    const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    g.addColorStop(0, '#ffcf8a'); g.addColorStop(0.6, '#e06d8c'); g.addColorStop(1, '#5a2a7a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,.7)'; ctx.lineWidth = Math.max(2, r*0.08);
    ctx.beginPath(); ctx.ellipse(x, y, r*1.7, r*0.35, -0.3, 0, PI2); ctx.stroke();
    ctx.fillStyle = '#cfd3e6'; ctx.beginPath(); ctx.arc(W*0.18, H*0.14, r*0.35, 0, PI2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawExtrasFront(t){
  if (extrasW.pond > 0.01){
    ctx.globalAlpha = extrasW.pond;
    const pads = [[.12,.28],[.3,.2],[.55,.3],[.7,.22],[.88,.26]];
    for (const [px, s] of pads){ const x = px*W + Math.sin(t*0.3 + px*9)*6, y = H*0.035, r = U*s*3;
      ctx.fillStyle = 'rgba(20,48,22,.72)'; ctx.beginPath(); ctx.ellipse(x, y, r, r*0.22, 0, 0.25, PI2 - 0.25); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      if (px > .5){ ctx.fillStyle = 'rgba(255,170,200,.75)'; ctx.beginPath(); ctx.ellipse(x + r*0.3, y - r*0.12, r*0.22, r*0.12, 0, 0, PI2); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }
  if (extrasW.arctic > 0.01){
    ctx.globalAlpha = extrasW.arctic*0.92;
    const g = ctx.createLinearGradient(0, 0, 0, H*0.12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bfe4f2');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    const r = rng(9); for (let x=W;x>=0;x-=W/24){ const y = H*(0.05 + r()*0.05); ctx.lineTo(x, y); if (r() < .35) ctx.lineTo(x - W/60, y + H*0.03*r() + 6); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
}
function drawEffects(dt){
  for (const s of sparks){ s.x += s.vx*dt; s.y += s.vy*dt; s.life -= dt; ctx.globalAlpha = Math.max(0, s.life*2); ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r || 2, 0, PI2); ctx.fill(); }
  sparks = sparks.filter(s => s.life > 0); ctx.globalAlpha = 1;
  for (const h of hearts){ h.y += h.vy*dt; h.life -= dt; const a = Math.min(1, h.life); ctx.globalAlpha = a; heartPath(ctx, h.x, h.y, 9); ctx.fillStyle = '#ff6b8b'; ctx.fill(); }
  hearts = hearts.filter(h => h.life > 0); ctx.globalAlpha = 1;
  for (const p of pearlBits){
    p.y += p.vy*dt; p.vy *= 0.97; p.life -= dt;
    const g = ctx.createRadialGradient(p.x - 3, p.y - 3, 1, p.x, p.y, 10); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#f4e9f2'); g.addColorStop(1, '#b89bb4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 9 + Math.sin(clock*4 + p.ph), 0, PI2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 14 + Math.sin(clock*3 + p.ph)*2, 0, PI2); ctx.stroke();
    if (p.life <= 0) collectPearl(p);
  }
  pearlBits = pearlBits.filter(p => !p.done);
  for (const tx of texts){ tx.y -= 30*dt; tx.life -= dt; ctx.globalAlpha = Math.min(1, tx.life*1.5); ctx.font = '900 18px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(tx.t, tx.x, tx.y); }
  texts = texts.filter(t => t.life > 0); ctx.globalAlpha = 1;
}
function collectPearl(p){
  if (p.done) return; p.done = true; pearls++; texts.push({x:p.x, y:p.y, t:'+1 pearl', life:1.4});
  Snd.chime(); updatePearls(true); saveSoon();
}
function updateFlakes(dt, t){
  for (const f of flakes){
    if (!f.landed){ f.vy = Math.min(f.vy + dt*18, 26); f.y += f.vy*dt; f.x += Math.sin(t*2 + f.ph)*10*dt; f.rot += dt*1.5;
      const g = groundY(f.x) - f.land; if (f.y >= g){ f.y = g; f.landed = true; } }
    else f.life -= dt;
  }
  flakes = flakes.filter(f => !f.eaten && f.life > 0);
}
function drawFlakes(){
  for (const f of flakes){ ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = f.landed ? Math.min(1, f.life/3) : 1;
    ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(-f.s, -f.s*0.4); ctx.lineTo(f.s*0.8, -f.s*0.7); ctx.lineTo(f.s, f.s*0.5); ctx.lineTo(-f.s*0.6, f.s*0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.globalAlpha = 1;
}
let heartT = 0;
function updateBubbles(dt, t){
  for (const it of decor){
    if (it.kind === 'bubbler'){ it._bt = (it._bt || 0) - dt; if (it._bt <= 0){ it._bt = 0.1 + Math.random()*0.18; const b = itemBox(it); bubbles.push({x:b.X + rand(-3, 3), y:b.y0, r:1.5 + Math.random()*4.5, vy:-40 - Math.random()*40, ph:Math.random()*6}); } }
    if (it.kind === 'chest'){ it._bt = (it._bt === undefined ? rand(3, 8) : it._bt) - dt; if (it._bt <= 0){ it._bt = rand(6, 11); const b = itemBox(it); for (let i=0;i<8;i++) bubbles.push({x:b.X + rand(-10, 10), y:b.y0 + rand(0, 10), r:2 + Math.random()*5, vy:-30 - Math.random()*50, ph:Math.random()*6}); } }
  }
  for (const b of bubbles){ b.y += b.vy*dt; b.vy -= dt*8; b.x += Math.sin(t*3 + b.ph)*14*dt; }
  bubbles = bubbles.filter(b => b.y > H*0.03);
  if (bubbles.length > 180) bubbles.splice(0, bubbles.length - 180);
  for (const r of rings){ r.r += dt*60; r.life -= dt; }
  rings = rings.filter(r => r.life > 0);
  heartT -= dt;
  if (heartT <= 0){
    heartT = 0.6;
    for (let i=0;i<creatures.length;i++) for (let j=i + 1;j<creatures.length;j++){
      const a = creatures[i], b = creatures[j]; if (a.birth || b.birth || isGround(a) !== isGround(b)) continue;
      const [aw] = dims(a), [bw] = dims(b);
      if (Math.hypot(a.x - b.x, a.y - b.y) > (aw + bw)*0.5) continue;
      const friendly = a.pers === 'friendly' || b.pers === 'friendly';
      if (Math.random() < (friendly ? 0.35 : 0.12)){
        hearts.push({x:(a.x + b.x)/2, y:(a.y + b.y)/2 - 10, vy:-24, life:1.6});
        if (!a.friends.includes(b.id)){ a.friends.push(b.id); b.friends.push(a.id); saveSoon(); }
        Snd.heart();
      }
    }
  }
}
function drawBubbles(){
  for (const b of bubbles){
    ctx.strokeStyle = 'rgba(230,255,252,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, PI2); ctx.stroke();
    ctx.fillStyle = 'rgba(230,255,252,.12)'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(b.x - b.r*0.35, b.y - b.r*0.35, b.r*0.25, 0, PI2); ctx.fill();
  }
  for (const r of rings){ ctx.strokeStyle = `rgba(230,255,252,${r.life*0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r*0.6, 0, 0, PI2); ctx.stroke(); }
}

/* ================= Sound ================= */
const Snd = {
  ctx:null, master:null, sfx:null, mus:null, wat:null,
  init(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch(e){ return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.connect(this.master);
    const dl = c.createDelay(1); dl.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.32; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.mus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(this.master);
    this.wat = c.createGain(); this.wat.connect(this.master);
    const len = c.sampleRate*3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0;
    for (let i=0;i<len;i++){ const w = Math.random()*2 - 1; b0 = (b0 + 0.02*w)/1.02; d[i] = b0*3.5; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const ng = c.createGain(); ng.gain.value = 0.5; src.connect(f); f.connect(ng); ng.connect(this.wat); src.start();
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 0.2; lfo.connect(lg); lg.connect(ng.gain); lfo.start();
    this.apply();
    const SCALES = {reef:[0,2,4,7,9], pond:[0,2,5,7,9], deep:[0,3,5,7,10], arctic:[0,2,4,7,11], space:[0,2,6,7,11]};
    setInterval(() => {
      if (!settings.sound || !settings.music || document.hidden || !this.ctx) return;
      const sc = SCALES[sceneId] || SCALES.reef, base = nightT ? 196 : 261.63;
      const deg = sc[(Math.random()*sc.length)|0] + (Math.random() < .3 ? 12 : 0), fq = base*Math.pow(2, deg/12), t = c.currentTime;
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = fq; o2.type = 'sine'; o2.frequency.value = fq*2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g); o2.connect(g); g.connect(this.mus); o.start(t); o2.start(t); o.stop(t + 3.1); o2.stop(t + 3.1);
    }, 1900);
    setInterval(() => { if (settings.sound && settings.water && !document.hidden && Math.random() < .5) this.tone(400 + Math.random()*500, 900 + Math.random()*600, 0.06, 'sine', 0.025, 0, this.wat); }, 800);
  },
  apply(){
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.sound ? settings.vol*0.9 : 0, t, 0.1);
    this.sfx.gain.setTargetAtTime(settings.sfx ? 0.8 : 0, t, 0.1);
    this.mus.gain.setTargetAtTime(settings.music ? 0.14 : 0, t, 0.2);
    this.wat.gain.setTargetAtTime(settings.water ? 0.2 : 0, t, 0.2);
  },
  tone(f0, f1, dur, type, vol, delay, dest){
    if (!this.ctx || !settings.sound) return;
    const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  plop(){ this.tone(520, 180, 0.18, 'sine', 0.22); },
  pop(){ this.tone(700 + Math.random()*500, 1400, 0.08, 'sine', 0.1); },
  chomp(){ this.tone(300, 160, 0.07, 'triangle', 0.16); this.tone(340, 180, 0.07, 'triangle', 0.12, 0.09); },
  chime(){ [880, 1175, 1568].forEach((f, i) => this.tone(f, 0, 0.5, 'sine', 0.1, i*0.08)); },
  heart(){ this.tone(1320, 1760, 0.25, 'sine', 0.05); },
  thud(){ this.tone(150, 70, 0.2, 'sine', 0.3); },
  tap(){ this.tone(900, 0, 0.05, 'sine', 0.05); },
  purr(){ this.tone(110, 135, 0.35, 'triangle', 0.08); this.tone(220, 200, 0.3, 'sine', 0.025, 0.05); },
  shimmer(){ [660, 880, 1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0, 0.7, 'sine', 0.06, i*0.13)); },
  giggle(){ [1200, 1500, 1320].forEach((f, i) => this.tone(f, f*1.15, 0.07, 'sine', 0.04, i*0.08)); },
  whoosh(){
    if (!this.ctx || !settings.sound) return;
    const c = this.ctx, len = c.sampleRate*0.6, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2 - 1)*Math.sin(i/len*Math.PI);
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(400, c.currentTime); f.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.5);
    const g = c.createGain(); g.gain.value = 0.22; s.connect(f); f.connect(g); g.connect(this.sfx); s.start();
  },
  splash(){
    if (!this.ctx || !settings.sound) return;
    const c = this.ctx, len = c.sampleRate*0.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 2);
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = 0.35; s.connect(f); f.connect(g); g.connect(this.sfx); s.start();
  },
};

/* ================= Room view ================= */
let roomOn = false;
function roomLayout(){
  const land = W > H;
  const s = land ? 0.62 : 0.68;
  const tw = W*s, th = H*s, tx = (W - tw)/2, ty = Math.max(H*0.13, 76);
  return {s, tx, ty, tw, th};
}
function applyRoom(){
  document.body.classList.toggle('roomview', roomOn);
  $('#btnRoom').setAttribute('aria-pressed', roomOn ? 'true' : 'false');
  if (roomOn){ const L = roomLayout(); stage.style.transform = `translate(${L.tx}px,${L.ty}px) scale(${L.s})`; cam.x = W/2; cam.y = H/2; cam.z = 1; clampCam(); }
  else if (decoMode) liftStage();
  else stage.style.transform = 'none';
  drawRoom();
}
let lastRoomNight = -1;
function drawRoom(){
  const L = roomLayout(), g = rctx, n = nightV;
  roomCv.width = Math.round(W*DPR); roomCv.height = Math.round(H*DPR);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const mix = (a, b) => { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], n))).join(',')})`; };
  const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, mix('cfe0d6', '28323d')); wall.addColorStop(1, mix('b9cec3', '1f2830'));
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.fillStyle = n > .5 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.18)';
  for (let x=12;x<W;x+=36) for (let y=12;y<H*0.8;y+=36){ g.beginPath(); g.arc(x + ((y/36)|0)%2*18, y, 2, 0, PI2); g.fill(); }
  const cabTop = L.ty + L.th + 10, cabH = Math.max(H*0.16, 70), floorY = cabTop + cabH;
  g.fillStyle = mix('a87c55', '3a2a1f'); g.fillRect(0, floorY, W, H - floorY);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let y=floorY + 18;y<H;y+=18){ g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = mix('e9efe9', '39434c'); g.fillRect(0, floorY - 10, W, 10);
  const cx0 = L.tx - L.tw*0.05, cw = L.tw*1.1;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(L.tx + L.tw/2, floorY + 4, cw*0.55, 10, 0, 0, PI2); g.fill();
  const cab = g.createLinearGradient(0, cabTop, 0, floorY); cab.addColorStop(0, mix('9b6a44', '3d2a1c')); cab.addColorStop(1, mix('7a5033', '2c1e14'));
  g.fillStyle = cab; g.fillRect(cx0, cabTop, cw, cabH);
  g.fillStyle = mix('b5845b', '4a3424'); g.fillRect(cx0 - 6, cabTop - 6, cw + 12, 10);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
  g.strokeRect(cx0 + 10, cabTop + 12, cw/2 - 15, cabH - 22); g.strokeRect(cx0 + cw/2 + 5, cabTop + 12, cw/2 - 15, cabH - 22);
  g.fillStyle = '#d9b46a'; [cx0 + cw/2 - 14, cx0 + cw/2 + 14].forEach(x => { g.beginPath(); g.arc(x, cabTop + cabH/2, 4, 0, PI2); g.fill(); });
  g.fillStyle = '#20292e'; g.fillRect(L.tx - 8, L.ty - 22, L.tw + 16, 18);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(L.tx - 8, L.ty - 22, L.tw + 16, 4);
  g.fillStyle = '#20292e'; g.fillRect(L.tx - 8, L.ty - 4, 8, L.th + 14); g.fillRect(L.tx + L.tw, L.ty - 4, 8, L.th + 14); g.fillRect(L.tx - 8, L.ty + L.th, L.tw + 16, 12);
  if (n > 0.02){ const gl2 = g.createRadialGradient(L.tx + L.tw/2, L.ty + L.th/2, 10, L.tx + L.tw/2, L.ty + L.th/2, Math.max(L.tw, L.th)); gl2.addColorStop(0, `rgba(90,180,200,${0.18*n})`); gl2.addColorStop(1, 'rgba(90,180,200,0)'); g.fillStyle = gl2; g.fillRect(0, 0, W, H); }
  const side = L.tx;
  if (side > 50){
    const sc = Math.min(1, side/140), lx = side*0.45, lampTop = floorY - Math.min(H*0.55, 340)*sc;
    g.strokeStyle = '#3b3f45'; g.lineWidth = 4*sc; g.beginPath(); g.moveTo(lx, floorY - 4); g.lineTo(lx, lampTop + 30*sc); g.stroke();
    g.fillStyle = '#3b3f45'; g.beginPath(); g.ellipse(lx, floorY - 3, 22*sc, 5*sc, 0, 0, PI2); g.fill();
    if (n > 0.02){ const lg = g.createRadialGradient(lx, lampTop + 30*sc, 5, lx, lampTop + 30*sc, 220*sc); lg.addColorStop(0, `rgba(255,214,140,${0.55*n})`); lg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); }
    g.fillStyle = mix('f2e3c6', 'ffd98f'); g.beginPath(); g.moveTo(lx - 34*sc, lampTop + 34*sc); g.lineTo(lx + 34*sc, lampTop + 34*sc); g.lineTo(lx + 22*sc, lampTop); g.lineTo(lx - 22*sc, lampTop); g.closePath(); g.fill();
    const px = W - side*0.5, pot = 40*sc;
    g.fillStyle = '#c9714f'; g.beginPath(); g.moveTo(px - pot*0.6, floorY - pot); g.lineTo(px + pot*0.6, floorY - pot); g.lineTo(px + pot*0.45, floorY); g.lineTo(px - pot*0.45, floorY); g.closePath(); g.fill();
    g.fillStyle = mix('4f8a4f', '22382a');
    for (let i=0;i<7;i++){ const a = -Math.PI/2 + (i - 3)*0.32; g.save(); g.translate(px, floorY - pot); g.rotate(a + Math.PI/2); g.beginPath(); g.ellipse(0, -pot*1.1, pot*0.25, pot*1.1, 0, 0, PI2); g.fill(); g.restore(); }
    if (side > 120){
      const fw = Math.min(side*0.55, 150), fx = W - side + (side - fw)/2 - 4, fy = L.ty + 10;
      g.fillStyle = '#7a5033'; g.fillRect(fx - 8, fy - 8, fw + 16, fw*0.8 + 16); g.fillStyle = '#fbfaf6'; g.fillRect(fx, fy, fw, fw*0.8);
      const last = creatures[creatures.length - 1];
      if (last && last.img){ const ar = last.img.width/last.img.height; let w = fw*0.8, h = w/ar; if (h > fw*0.6){ h = fw*0.6; w = h*ar; } g.drawImage(last.img, fx + (fw - w)/2, fy + (fw*0.8 - h)/2, w, h); }
      const wx = side*0.12, ww = Math.min(side*0.6, 170), wy = L.ty + 10, wh = ww*0.9;
      const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, mix('9fd3f0', '0c1430')); sky.addColorStop(1, mix('dff2fb', '1c2a55'));
      g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
      if (n > .4){ g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(wx + ww*0.7, wy + wh*0.3, ww*0.1, 0, PI2); g.fill(); }
      g.strokeStyle = mix('ffffff', '8a96a3'); g.lineWidth = 6; g.strokeRect(wx, wy, ww, wh); g.lineWidth = 3; g.beginPath(); g.moveTo(wx + ww/2, wy); g.lineTo(wx + ww/2, wy + wh); g.moveTo(wx, wy + wh/2); g.lineTo(wx + ww, wy + wh/2); g.stroke();
    }
  }
  lastRoomNight = n;
}

/* ================= Main loop ================= */
let last = performance.now(), restAll = false, captureReq = false;
let selC = null, decoMode = false, selItem = null;
function frame(now){
  const dt = Math.min(0.05, (now - last)/1000); last = now; clock += dt;
  nightV += (nightT - nightV)*Math.min(1, dt*1.5);
  lerpScene(dt);
  if (roomOn && Math.abs(nightV - lastRoomNight) > 0.02) drawRoom();
  if (gl) renderWater();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR*cam.z, 0, 0, DPR*cam.z, DPR*(W/2 - cam.x*cam.z), DPR*(H/2 - cam.y*cam.z));
  if (!gl) fallbackWater();
  drawExtrasBack();
  const sorted = decor.slice().sort((a, b) => a.d - b.d);
  for (const it of sorted) if (it.d < 0.55) drawItem(ctx, it, clock);
  drawParticles(dt, clock);
  updateFlakes(dt, clock);
  for (const c of creatures) update(c, dt, clock);
  for (const c of creatures) drawShadow(c);
  drawFlakes();
  const order = creatures.filter(c => !c.birth).sort((a, b) => (isGround(a) - isGround(b)) || (a.z - b.z));
  for (const c of order) drawCreature(c, clock);
  updateBubbles(dt, clock); drawBubbles();
  for (const it of sorted) if (it.d >= 0.55) drawItem(ctx, it, clock);
  drawExtrasFront(clock);
  if (nightV > 0.01){ ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(6,16,44,${0.5*nightV})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (lure){
    const pr = 34 + Math.sin(clock*5)*4, gr = ctx.createRadialGradient(lure.x, lure.y, 0, lure.x, lure.y, pr*1.6);
    gr.addColorStop(0, 'rgba(255,250,210,.55)'); gr.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lure.x, lure.y, pr*1.6, 0, PI2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lure.x, lure.y, pr*0.6, 0, PI2); ctx.stroke();
  }
  drawEffects(dt);
  for (const c of creatures) drawOverlays(c, clock);
  for (const c of creatures) if (c.birth) drawBirth(c, dt);
  if (captureReq){ captureReq = false; capture(); }
  if (selC && !$('#card').hidden && (clock*2|0) !== (frame._k || 0)){ frame._k = clock*2|0; fillCard(selC); }
  requestAnimationFrame(frame);
}

function resize(){
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  scaleS = clamp(Math.min(W, H)/700, 0.6, 1.4);
  U = clamp(Math.min(W, H*1.4)*0.12, 48, 140);
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  const gs = Math.min(window.devicePixelRatio || 1, 1.5);
  glc.width = Math.round(W*gs); glc.height = Math.round(H*gs);
  if (gl) gl.viewport(0, 0, glc.width, glc.height);
  cam.x = W/2; cam.y = H/2; clampCam();
  buildParticles(); computeHides();
  for (const c of creatures){ const [dw, dh] = dims(c); c.x = clamp(c.x, dw/2, W - dw/2); if (isGround(c)) c.y = groundY(c.x) - dh/2; pickTarget(c); }
  applyRoom();
}

/* ================= Tank input ================= */
const hint = $('#hint');
const HINTS = ['Tap the water to feed your fish', 'Hold your finger in the water and they will follow it', 'Stroke a friend with your finger to give it a cuddle'];
let hintStep = 0, hintTimer = 0;
function nextHint(step){
  if (step !== hintStep + 1) return;
  hintStep = step; clearTimeout(hintTimer);
  if (step >= HINTS.length){ hint.classList.add('gone'); return; }
  hint.classList.add('gone');
  hintTimer = setTimeout(() => { hint.textContent = HINTS[step]; hint.classList.remove('gone'); hintTimer = setTimeout(() => hint.classList.add('gone'), 6000); }, 900);
}
let fedOnce = false;
const pointers = new Map(); let gesture = null, holdTimer = 0;
function startLure(w){ lure = {x:w.x, y:w.y}; Snd.giggle(); nextHint(2); }
function endLure(){ lure = null; }
cv.addEventListener('pointerdown', e => {
  Snd.init();
  try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  const sp = stagePoint(e); pointers.set(e.pointerId, sp); clearTimeout(holdTimer);
  if (pointers.size === 2 && !roomOn){
    endLure();
    const [a, b] = [...pointers.values()];
    gesture = {type:'pinch', d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, z0:cam.z, mid:toWorld((a.x + b.x)/2, (a.y + b.y)/2)};
    return;
  }
  if (pointers.size > 1) return;
  const w = toWorld(sp.x, sp.y);
  if (decoMode){
    gesture = {type:'tap', sx:sp.x, sy:sp.y};
    const hit = hitItem(w);
    if (hit){ selItem = hit; gesture = {type:'drag', item:hit, ox:w.x - hit.x*W, oy:w.y - itemY(hit), sx:sp.x, sy:sp.y, moved:false}; updateDecoSel(); }
    return;
  }
  const c = hitCreature(w);
  if (c){ gesture = {type:'press', c, sx:sp.x, sy:sp.y, dist:0}; return; }
  gesture = {type:'tap', sx:sp.x, sy:sp.y};
  holdTimer = setTimeout(() => { if (gesture && gesture.type === 'tap' && pointers.size === 1){ gesture.type = 'lure'; startLure(w); } }, 380);
});
cv.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId), sp = stagePoint(e); pointers.set(e.pointerId, sp);
  if (!gesture) return;
  if (gesture.type === 'pinch' && pointers.size >= 2){
    const [a, b] = [...pointers.values()];
    cam.z = clamp(gesture.z0*Math.hypot(a.x - b.x, a.y - b.y)/gesture.d0, 1, 3);
    const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
    cam.x = gesture.mid.x - (mx - W/2)/cam.z; cam.y = gesture.mid.y - (my - H/2)/cam.z; clampCam(); return;
  }
  if (gesture.type === 'press' || gesture.type === 'pet'){
    gesture.dist += Math.hypot(sp.x - prev.x, sp.y - prev.y);
    if (gesture.dist > 24){
      if (gesture.type !== 'pet'){ gesture.type = 'pet'; emote(gesture.c, 'heart'); nextHint(3); }
      gesture.c.petted = 0.45;
    }
    return;
  }
  const movedFar = Math.hypot(sp.x - gesture.sx, sp.y - gesture.sy) > 10;
  if (gesture.type === 'drag'){
    gesture.moved = gesture.moved || movedFar;
    const w = toWorld(sp.x, sp.y), it = gesture.item;
    it.x = clamp((w.x - gesture.ox)/W, 0.02, 0.98);
    const s = sandY(it.x*W), yy = w.y - gesture.oy;
    it.d = clamp(((yy - s)/(H - s) - 0.04)/0.82, 0, 1); computeHides(); return;
  }
  if (gesture.type === 'tap' && movedFar){
    clearTimeout(holdTimer);
    if (decoMode) gesture.type = 'none';
    else if (cam.z > 1.03) gesture.type = 'pan';
    else { gesture.type = 'lure'; startLure(toWorld(sp.x, sp.y)); }
  }
  if (gesture.type === 'lure'){ const w = toWorld(sp.x, sp.y); lure = {x:w.x, y:w.y}; }
  if (gesture.type === 'pan'){ cam.x -= (sp.x - prev.x)/cam.z; cam.y -= (sp.y - prev.y)/cam.z; clampCam(); }
});
const endPointer = e => {
  if (!pointers.has(e.pointerId)) return;
  clearTimeout(holdTimer);
  const sp = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  if (!gesture) return;
  if (gesture.type === 'tap' && pointers.size === 0) handleTap(toWorld(sp.x, sp.y));
  if (gesture.type === 'press' && pointers.size === 0){ const c = gesture.c; c.happy = 1; openCard(c); Snd.tap(); }
  if (gesture.type === 'pet'){ gesture.c.petted = 0.7; gesture.c.shimmy = 0.6; saveSoon(); }
  if (gesture.type === 'lure') endLure();
  if (gesture.type === 'drag' && gesture.moved){ Snd.thud(); save(); }
  if (pointers.size === 0 || gesture.type === 'pinch') gesture = null;
};
cv.addEventListener('pointerup', endPointer); cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('wheel', e => {
  if (roomOn) return; e.preventDefault();
  const sp = stagePoint(e), w = toWorld(sp.x, sp.y);
  cam.z = clamp(cam.z*Math.exp(-e.deltaY*0.0015), 1, 3);
  cam.x = w.x - (sp.x - W/2)/cam.z; cam.y = w.y - (sp.y - H/2)/cam.z; clampCam();
}, {passive:false});
$('#zoomOut').addEventListener('click', () => { cam.z = 1; cam.x = W/2; cam.y = H/2; clampCam(); });
function hitItem(w){
  const list = decor.slice().sort((a, b) => b.d - a.d);
  for (const it of list){ const b = itemBox(it); const pad = 8; if (w.x > b.x0 - pad && w.x < b.x1 + pad && w.y > b.y0 - pad && w.y < b.y1 + pad) return it; }
  return null;
}
function hitCreature(w){
  const list = creatures.filter(c => !c.birth).sort((a, b) => b.z - a.z);
  for (const c of list){ const [dw, dh] = dims(c); if (Math.abs(w.x - c.x) < dw*0.5 + 10 && Math.abs(w.y - c.y) < dh*0.5 + 10) return c; }
  return null;
}
function handleTap(w){
  if (decoMode){ selItem = hitItem(w); updateDecoSel(); return; }
  for (const p of pearlBits){ if (Math.hypot(p.x - w.x, p.y - w.y) < 26){ collectPearl(p); return; } }
  if (selC){ closeCard(); return; }
  if (w.y > H*0.94) return;
  rings.push({x:w.x, y:w.y, r:6, life:1}); dropFood(w.x, w.y); Snd.plop();
  if (!fedOnce){ fedOnce = true; nextHint(1); }
  for (const o of creatures){ const d = Math.hypot(o.x - w.x, o.y - w.y);
    if (o.pers === 'shy' && d < 160 && !isGround(o) && !o.birth){ o.state = 'wander'; o.tx = clamp(o.x + (o.x - w.x)*2, 0, W); o.ty = clamp(o.y + (o.y - w.y), 0, H); o.dash = true; o.timer = 2.5; } }
}

/* ================= Profile card ================= */
const card = $('#card');
function sizeWord(g){ return g < 0.95 ? 'Little' : g < 1.2 ? 'Small' : g < 1.45 ? 'Medium' : g < 1.75 ? 'Big' : 'Huge'; }
function favSpot(c){ let best = null, v = 0; for (const k in c.spots){ if (c.spots[k] > v){ v = c.spots[k]; best = k; } } return best ? SPOT_NAMES[best] : 'Still exploring'; }
function feeling(c){
  if (c.resting || restAll) return 'Sleepy';
  if (c.petted > 0) return 'Loved';
  if (c.hunger > 0.75) return 'Peckish';
  if (c.joy > 0.8) return 'Very happy';
  if (c.joy > 0.55) return 'Happy';
  return 'Calm';
}
function fillCard(c){
  $('#pcName').textContent = c.name; $('#pcSub').textContent = `${PERS[c.pers].label} · ${TYPES[c.type].label}`;
  $('#pcJoined').textContent = new Date(c.joined).toLocaleDateString('en-GB', {day:'numeric', month:'short'});
  $('#pcSize').textContent = sizeWord(c.growth); $('#pcBar').style.width = Math.round(clamp((c.growth - 0.7)/1.3, 0.05, 1)*100) + '%';
  $('#pcMeals').textContent = c.meals; $('#pcSpot').textContent = favSpot(c);
  $('#pcFeel').textContent = feeling(c);
  const next = TRICK_AT.find(n => n > c.meals);
  $('#pcTricks').textContent = c.tricks.length ? c.tricks.map(k => TRICK_NAMES[k].replace(/^an? /, '')).join(', ') : next ? `Learns one after ${next} meals` : 'None yet';
  $('#pcTrick').disabled = !c.tricks.length;
  const names = c.friends.map(id => (creatures.find(o => o.id === id) || {}).name).filter(Boolean);
  const fr = $('#pcFriends'); fr.textContent = '';
  if (names.length){ fr.append('Friends: '); const b = document.createElement('b'); b.textContent = names.join(', '); fr.append(b); } else fr.textContent = 'Making friends…';
}
function openCard(c){ selC = c; $('#pcImg').src = c.src; fillCard(c); card.hidden = false; $('#dock').hidden = true; }
function closeCard(){ selC = null; card.hidden = true; if (!decoMode) $('#dock').hidden = false; }
$('#pcClose').addEventListener('click', closeCard);
$('#pcEdit').addEventListener('click', () => { const c = selC; closeCard(); openStudioEdit(c); });
$('#pcTrick').addEventListener('click', () => { if (selC && !selC.trick) doTrick(selC); });

/* ================= Decorate ================= */
const deco = $('#deco'), tray = $('#decoTray');
function trayPreview(kind){
  const c = mkCanvas(128, 128), g = c.getContext('2d'), def = DECOR[kind];
  const px = 100/Math.max(def.w*1.2, def.h*1.15), ww = def.w*px, hh = def.h*px;
  g.translate(64, 118);
  if (def.live){ const savedU = U; U = px; const fake = {kind, seed:7, s:1, d:0, flip:false}; drawLive(g, fake, 0, 0, 1, 0); U = savedU; }
  else DRAW[kind](g, ww, hh, rng(7));
  return c;
}
function buildTray(){
  tray.innerHTML = '';
  for (const kind of TRAY){
    const def = DECOR[kind], b = document.createElement('button'); b.className = 'titem'; b.dataset.kind = kind;
    const cnv = trayPreview(kind); b.appendChild(cnv);
    const nm = document.createElement('span'); nm.textContent = def.name; b.appendChild(nm);
    const cost = document.createElement('span'); cost.className = 'cost';
    if (settings.rewards && def.cost){ const i = document.createElement('i'); i.className = 'pearl'; cost.append(i, String(def.cost)); } else cost.textContent = 'Free';
    b.appendChild(cost);
    if (settings.rewards && def.cost > pearls) b.classList.add('locked');
    b.addEventListener('click', () => addDecor(kind));
    tray.appendChild(b);
  }
}
function addDecor(kind){
  const def = DECOR[kind], cost = settings.rewards ? def.cost : 0;
  if (cost > pearls){ toast(`You need ${cost} pearls. Feed your fish to find more.`); return; }
  pearls -= cost; updatePearls();
  const it = {id:uid(), kind, x:clamp(cam.x/W + rand(-0.08, 0.08), 0.08, 0.92), d:0.45, s:1, flip:false, seed:(Math.random()*1e6)|0, cost};
  decor.push(it); selItem = it; computeHides(); updateDecoSel(); buildTray(); Snd.thud(); save();
}
function updateDecoSel(){ $('#decoSel').hidden = !selItem; $('#decoMsg').textContent = selItem ? `${DECOR[selItem.kind].name}: drag it, or use the buttons.` : 'Tap something to add it. Drag things to move them.'; liftStage(); }
$('#decoSel').addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a || !selItem) return;
  const act = a.dataset.act;
  if (act === 'smaller') selItem.s = clamp(selItem.s/1.15, 0.5, 2.2);
  if (act === 'bigger') selItem.s = clamp(selItem.s*1.15, 0.5, 2.2);
  if (act === 'flip') selItem.flip = !selItem.flip;
  if (act === 'remove'){ if (settings.rewards && selItem.cost){ pearls += selItem.cost; updatePearls(); } decor = decor.filter(d => d !== selItem); selItem = null; buildTray(); }
  computeHides(); updateDecoSel(); save();
});
function liftStage(){
  if (!decoMode) return;
  const ph = deco.offsetHeight, lift = Math.max(0, ph - H*0.04);
  stage.style.transform = `translateY(${-lift}px)`;
}
function openDeco(){
  closeCard(); if (roomOn){ roomOn = false; applyRoom(); }
  cam.z = 1; cam.x = W/2; cam.y = H/2; clampCam();
  decoMode = true; selItem = null; buildTray(); updateDecoSel(); deco.hidden = false; $('#dock').hidden = true;
  liftStage();
}
function closeDeco(){ decoMode = false; selItem = null; deco.hidden = true; $('#dock').hidden = false; stage.style.transform = roomOn ? stage.style.transform : 'none'; save(); }
$('#btnDeco').addEventListener('click', openDeco);
$('#decoDone').addEventListener('click', closeDeco);

/* ================= Sheets ================= */
const sheet = $('#sheet'), sheetBack = $('#sheetBack'), sheetBody = $('#sheetBody');
function openSheet(title, build){ $('#sheetTitle').textContent = title; sheetBody.innerHTML = ''; build(sheetBody); sheet.hidden = false; sheetBack.hidden = false; }
function closeSheet(){ sheet.hidden = true; sheetBack.hidden = true; }
$('#sheetClose').addEventListener('click', closeSheet); sheetBack.addEventListener('click', closeSheet);
function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function svgIcon(path){ const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = path; return s; }

$('#btnScene').addEventListener('click', () => openSheet('Choose a scene', body => {
  const g = el('div', 'scenes');
  for (const id in SCENES){ const b = el('button', 'scene', SCENES[id].name); b.style.background = SCENES[id].sw; b.setAttribute('aria-pressed', id === sceneId ? 'true' : 'false');
    b.addEventListener('click', () => { sceneId = id; save(); g.querySelectorAll('.scene').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); Snd.tap(); });
    g.appendChild(b); }
  body.appendChild(g);
}));

$('#btnMore').addEventListener('click', () => openSheet('More', body => {
  const m = el('div', 'menu');
  const item = (label, icon, fn) => { const b = el('button', 'mitem'); b.appendChild(svgIcon(icon)); b.append(label); b.addEventListener('click', fn); m.appendChild(b); return b; };
  item('My tank', '<path d="M3 12c3-4 7-5 11-3l5-3v12l-5-3c-4 2-8 1-11-3z"/>', () => openList());
  item(nightT ? 'Lights on' : 'Lights off', '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>', () => { nightT = nightT ? 0 : 1; closeSheet(); });
  item('Take a picture', '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3.5"/>', () => { closeSheet(); captureReq = true; Snd.tap(); });
  const gb = item('Grown-ups: hold', '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>', () => {});
  gb.classList.add('hold'); holdButton(gb, 1300, openSettings);
  body.appendChild(m);
}));

function openList(){
  openSheet('Who lives here', body => {
    const grid = el('div', 'grid');
    if (!creatures.length) body.appendChild(el('p', 'note', 'Nobody lives here yet. Tap Draw to make your first friend.'));
    for (const c of creatures){
      const cd = el('div', 'card'), pic = el('div', 'pic'), im = el('img'); im.src = c.src; im.alt = c.name; pic.appendChild(im);
      const acts = el('div', 'acts'), ed = el('button', '', 'Change'), bye = el('button', 'bye', 'Say goodbye');
      ed.addEventListener('click', () => { closeSheet(); openStudioEdit(c); });
      let armed = false;
      bye.addEventListener('click', () => {
        if (!armed){ armed = true; bye.textContent = 'Tap again'; bye.classList.add('sure'); setTimeout(() => { armed = false; bye.textContent = 'Say goodbye'; bye.classList.remove('sure'); }, 2500); return; }
        creatures = creatures.filter(o => o !== c); creatures.forEach(o => { if (o.buddy === c) o.buddy = null; o.friends = o.friends.filter(id => id !== c.id); });
        if (selC === c) closeCard(); updateCount(); save(); openList();
      });
      acts.append(ed, bye);
      cd.append(pic, el('b', '', c.name), el('span', '', `${PERS[c.pers].label} · ${TYPES[c.type].label}`), acts);
      grid.appendChild(cd);
    }
    body.appendChild(grid);
  });
}
function updateCount(){}

function holdButton(btn, ms, onDone){
  let t0 = 0, raf = 0, active = false;
  const tick = () => { const p = Math.min(1, (performance.now() - t0)/ms); btn.style.setProperty('--p', p); if (p >= 1){ stop(); onDone(); } else raf = requestAnimationFrame(tick); };
  const stop = () => { active = false; cancelAnimationFrame(raf); btn.style.setProperty('--p', 0); };
  btn.addEventListener('pointerdown', () => { active = true; t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => { if (active) stop(); }));
}
function switchRow(label, sub, key){
  const r = el('div', 'setrow'), t = el('div'); t.append(label); if (sub) t.appendChild(el('small', '', sub));
  const s = el('button', 'switch'); s.setAttribute('aria-label', label); s.setAttribute('aria-pressed', settings[key] ? 'true' : 'false');
  s.addEventListener('click', () => { settings[key] = !settings[key]; s.setAttribute('aria-pressed', settings[key] ? 'true' : 'false'); Snd.apply(); updatePearls(); updateSoundBtn(); save(); });
  r.append(t, s); return r;
}
function openSettings(){
  openSheet('Grown-ups', body => {
    body.appendChild(switchRow('Sound', 'Everything you can hear', 'sound'));
    body.appendChild(switchRow('Sound effects', 'Plops, pops and chimes', 'sfx'));
    body.appendChild(switchRow('Music', 'Soft notes that drift by', 'music'));
    body.appendChild(switchRow('Water sounds', 'A gentle hum and bubbles', 'water'));
    const vr = el('label', 'setrow'), vt = el('div'); vt.append('Volume'); const vi = document.createElement('input'); vi.type = 'range'; vi.min = 0; vi.max = 100; vi.value = Math.round(settings.vol*100); vi.id = 'volRange'; vi.style.maxWidth = '180px';
    vi.addEventListener('input', () => { settings.vol = vi.value/100; Snd.apply(); saveSoon(); }); vr.append(vt, vi); body.appendChild(vr);
    body.appendChild(switchRow('Pearls and rewards', 'Turn off to make every decoration free', 'rewards'));
    const lr = el('div', 'setrow'), lt = el('div'); lt.append('Play time'); lt.appendChild(el('small', '', 'The lights go down when time is up'));
    const chips = el('div', 'chips');
    [[0, 'Off'], [10, '10 min'], [20, '20 min'], [30, '30 min']].forEach(([v, l]) => { const b = el('button', 'chip', l); b.setAttribute('aria-pressed', settings.limit === v ? 'true' : 'false');
      b.addEventListener('click', () => { settings.limit = v; sessionStart = Date.now(); chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); save(); }); chips.appendChild(b); });
    lr.append(lt, chips); lr.style.flexWrap = 'wrap'; body.appendChild(lr);
    const rr2 = el('div', 'setrow'), rt = el('div'); rt.append('Start a fresh tank'); rt.appendChild(el('small', '', 'Removes every drawing and decoration'));
    const rb = el('button', 'btn ghost small', 'Start fresh'); let armed = false;
    rb.addEventListener('click', () => { if (!armed){ armed = true; rb.textContent = 'Tap again'; setTimeout(() => { armed = false; rb.textContent = 'Start fresh'; }, 2500); return; } resetTank(); closeSheet(); });
    rr2.append(rt, rb); body.appendChild(rr2);
    body.appendChild(el('p', 'note', 'Everything stays on this device. No accounts, no ads.'));
  });
}

/* ================= Header & dock ================= */
function updatePearls(bump){
  $('#pearlN').textContent = pearls; $('#pearlChip').hidden = !settings.rewards;
  if (bump){ const c = $('#pearlChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}
function updateSoundBtn(){
  $('#btnSound').setAttribute('aria-pressed', settings.sound ? 'false' : 'true');
  $('#sndWaves').style.display = settings.sound ? '' : 'none'; $('#sndOff').style.display = settings.sound ? 'none' : '';
  $('#sndLabel').textContent = settings.sound ? 'Sound' : 'Muted';
}
$('#btnSound').addEventListener('click', () => { Snd.init(); settings.sound = !settings.sound; Snd.apply(); updateSoundBtn(); save(); });
$('#btnFeed').addEventListener('click', () => {
  Snd.init();
  const v0 = cam.x - W/(2*cam.z), v1 = cam.x + W/(2*cam.z), top = cam.y - H/(2*cam.z);
  for (let i=0;i<4;i++) dropFood(rand(v0 + 30, v1 - 30), top + H*0.1/cam.z + rand(0, 20));
  Snd.plop(); if (!fedOnce){ fedOnce = true; nextHint(1); }
});
$('#btnRoom').addEventListener('click', () => { roomOn = !roomOn; applyRoom(); Snd.tap(); });
document.addEventListener('pointerdown', () => Snd.init(), {once:true});

let toastT = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }

/* ================= Tank picture ================= */
function capture(){
  try {
    const out = mkCanvas(cv.width, cv.height*1.09), g = out.getContext('2d');
    g.fillStyle = '#14313a'; g.fillRect(0, 0, out.width, out.height);
    if (gl) g.drawImage(glc, 0, 0, cv.width, cv.height);
    g.drawImage(cv, 0, 0);
    const fs = Math.round(cv.height*0.035);
    g.fillStyle = '#effbf8'; g.font = `900 ${fs}px Nunito, system-ui, sans-serif`; g.textBaseline = 'middle';
    g.fillText('My aquarium', fs*0.8, cv.height + cv.height*0.045);
    g.font = `700 ${Math.round(fs*0.7)}px Nunito, system-ui, sans-serif`; g.textAlign = 'right';
    g.fillText('little easier · ' + new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'}), out.width - fs*0.8, cv.height + cv.height*0.045);
    $('#photoImg').src = out.toDataURL('image/jpeg', 0.9);
    $('#photoView').hidden = false; Snd.chime();
  } catch(e){ toast('The picture did not work this time. Try again.'); }
}
$('#photoClose').addEventListener('click', () => { $('#photoView').hidden = true; });

/* ================= Time limit ================= */
let sessionStart = Date.now(), nightShown = false, nightBefore = 0;
setInterval(() => {
  if (!settings.limit || nightShown) return;
  if (Date.now() - sessionStart > settings.limit*60000){ nightShown = true; nightBefore = nightT; nightT = 1; restAll = true; $('#nightView').hidden = false; }
}, 3000);
holdButton($('#nightHold'), 1500, () => { nightShown = false; restAll = false; nightT = nightBefore; sessionStart = Date.now(); $('#nightView').hidden = true; });

/* ================= Storage ================= */
function serC(c){ return {id:c.id, name:c.name, type:c.type, pers:c.pers, growth:+c.growth.toFixed(3), src:c.src, joined:c.joined, meals:c.meals, spots:Object.fromEntries(Object.entries(c.spots).map(([k, v]) => [k, Math.round(v)])), friends:c.friends, eyes:(c.eyes || []).map(e => e.map(v => +v.toFixed(4))), joy:+c.joy.toFixed(3), tricks:c.tricks}; }
function serD(d){ const o = {id:d.id, kind:d.kind, x:+d.x.toFixed(4), d:+d.d.toFixed(3), s:+d.s.toFixed(3), flip:!!d.flip, seed:d.seed, cost:d.cost || 0}; if (d.src) o.src = d.src; return o; }
function save(){
  try { localStorage.setItem(KEY, JSON.stringify({v:2, pearls, scene:sceneId, settings, creatures:creatures.map(serC), decor:decor.map(serD)})); }
  catch(e){ if (!saveWarned){ saveWarned = true; toast('Your tank is very full, so new things might not be kept. Say goodbye to a few friends to make room.'); } }
}
function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 1500); }
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function addCreature(d, opts){
  const img = await loadImg(d.src);
  const c = makeCreature(d, img);
  if (opts && opts.enter){
    const [dw, dh] = dims(c);
    const fx = clamp(cam.x, dw, W - dw);
    const fy = isGround(c) ? groundY(fx) - dh/2 : clamp(cam.y, H*0.25, sandY(fx) - dh);
    c.birth = {t:0, fx, fy}; c.x = fx; c.y = fy;
  }
  creatures.push(c); return c;
}
async function addDrawnItem(d){
  const it = Object.assign({}, d);
  try { it.img = await loadImg(d.src); } catch(e){ return null; }
  decor.push(it); return it;
}
function webp(c){ try { const u = c.toDataURL('image/webp', 0.86); if (u.startsWith('data:image/webp')) return u; } catch(e){} return c.toDataURL('image/png'); }

/* ================= Starters ================= */
const tileCache = new Map();
function crayonTile(color){
  if (tileCache.has(color)) return tileCache.get(color);
  const t = mkCanvas(64, 64), x = t.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 64, 64);
  const r = rng(parseInt(color.slice(1), 16) % 100000 + 3); x.globalCompositeOperation = 'destination-out';
  for (let i=0;i<300;i++){ x.globalAlpha = 0.25 + r()*0.6; x.fillRect(r()*64, r()*64, 1 + r()*2.4, 1 + r()*1.3); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; tileCache.set(color, t); return t;
}
const patCache = new WeakMap();
function crayonPat(g, color){ let m = patCache.get(g); if (!m){ m = new Map(); patCache.set(g, m); } if (!m.has(color)) m.set(color, g.createPattern(crayonTile(color), 'repeat')); return m.get(color); }
const TW = 900, TH = 600;
function tpl(id){ return TPL.find(t => t.id === id); }
function colourTemplate(t, colors, extra){
  const c = mkCanvas(TW, TH), g = c.getContext('2d');
  t.shapes.forEach(([, fn], i) => { g.fillStyle = '#fff'; g.beginPath(); fn(g); g.fill(); g.fillStyle = crayonPat(g, colors[i % colors.length]); g.beginPath(); fn(g); g.fill(); });
  cutHoles(g, t);
  if (extra) extra(g);
  const ln = mkCanvas(TW, TH), lg = ln.getContext('2d');
  lg.lineWidth = 7; lg.strokeStyle = '#1d2b30'; lg.lineJoin = 'round'; lg.lineCap = 'round'; strokeTemplate(lg, t);
  g.drawImage(ln, 0, 0);
  const cr = cropCanvas(c, 300);
  return {src:webp(cr), eyes:mapEyes(t.eyes || [], cr.crop)};
}
function mapEyes(list, crop){
  return list.map(([x, y, r]) => [(x - crop.x0)/crop.cw, (y - crop.y0)/crop.ch, r/crop.cw]).filter(([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1);
}
function starters(){
  const eye = (g, x, y, r) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill(); g.fillStyle = '#1d2b30'; g.beginPath(); g.arc(x + r*0.15, y + r*0.1, r*0.45, 0, PI2); g.fill(); };
  const now = Date.now();
  return [
    {id:'s1', name:'Sunny', type:'swim', pers:'friendly', growth:1.1, ...colourTemplate(tpl('fish'), ['#ffb703','#ffb703','#ff7350'], g => { g.save(); g.beginPath(); fishBodyClip(g); g.clip(); g.fillStyle = crayonPat(g, '#ffffff'); g.fillRect(395, 150, 48, 320); g.fillRect(620, 150, 46, 320); g.restore(); eye(g, 715, 262, 26); })},
    {id:'s2', name:'Sprinkles', type:'float', pers:'sleepy', growth:0.95, ...colourTemplate(tpl('donut'), ['#d99a55','#ff70a6','#ffffff'])},
    {id:'s3', name:'Twinkle', type:'crawl', pers:'shy', growth:0.85, ...colourTemplate(tpl('star'), ['#c77dff'], g => { eye(g, 420, 300, 18); eye(g, 482, 300, 18); })},
    {id:'s4', name:'Zoom', type:'drive', pers:'playful', growth:1, ...colourTemplate(tpl('car'), ['#e63946','#26292e'], g => { g.fillStyle = crayonPat(g, '#bde0fe'); g.beginPath(); window.AQ.P(g, [340,275, 380,195, 470,192, 470,275]); g.fill(); g.beginPath(); g.moveTo(500, 275); g.lineTo(500, 192); g.quadraticCurveTo(590, 195, 625, 275); g.closePath(); g.fill(); g.fillStyle = '#adb5bd'; g.beginPath(); g.arc(270, 410, 26, 0, PI2); g.arc(640, 410, 26, 0, PI2); g.fill(); g.fillStyle = '#ffe066'; g.beginPath(); g.ellipse(772, 340, 14, 18, 0, 0, PI2); g.fill(); })},
    {id:'s5', name:'Wobble', type:'pulse', pers:'playful', growth:0.95, ...colourTemplate(tpl('jelly'), ['#c9a7ff','#ff9ecf'], g => { eye(g, 410, 230, 16); eye(g, 490, 230, 16); })},
    {id:'s6', name:'Snappy', type:'scuttle', pers:'greedy', growth:0.95, ...colourTemplate(tpl('crab'), ['#e85d3a','#e85d3a','#f08a5d','#e85d3a','#ffffff','#ff7350'], g => {})},
  ].map((d, i) => Object.assign(d, {joined:now - i*1000}));
}
function fishBodyClip(g){ tpl('fish').shapes[2][1](g); }

async function resetTank(){
  creatures = []; decor = []; pearls = 15; closeCard();
  for (const d of starters()) await addCreature(d);
  for (const it of defaultDecor()) decor.push(it);
  computeHides(); save(); toast('A fresh tank, ready to fill.');
}

/* ================= Studio ================= */
const studio = $('#studio');
const SCR = ['scrMake','scrPick','scrPhoto','scrDraw','scrMeet'];
let scr = 'scrMake';
function show(id, title){ SCR.forEach(s => $('#' + s).hidden = s !== id); scr = id; $('#sTitle').textContent = title; studio.scrollTop = 0; }
const guide = $('#guide'), paint = $('#paint'), lines = $('#lines'), stick = $('#stick'), paper = $('#paper');
[guide, paint, lines, stick].forEach(c => { c.width = TW; c.height = TH; });
const gctx = guide.getContext('2d'), pctx = paint.getContext('2d', {willReadFrequently:true}), lctx = lines.getContext('2d', {willReadFrequently:true}), sctx = stick.getContext('2d');
let makeKind = 'creature', curTpl = null, mode = 'colour', alongStep = 0;
let tool = 'crayon', color = '#ff7350', brush = 22, stampKind = 'dots', mirror = false, rainbowHue = 0;
let stickers = [], selSticker = -1, pendingSticker = null, stkTab = 'Eyes';
let editing = null, pending = null, moveSel = 'swim', persSel = 'friendly';
const SWATCHES = ['#e63946','#ff7350','#ff9f1c','#ffb703','#ffe066','#c9e265','#8ac926','#2a9d8f','#4cc9f0','#3a86ff','#1d4ed8','#7b2cbf','#c77dff','#ff70a6','#ffc2d1','#8d5524','#c68b59','#adb5bd','#1d2b30','#ffffff'];
const TOOLS = [
  ['crayon','Crayon','<path d="M5 19l2-6 9-9 4 4-9 9z"/><path d="M5 19l2-.6"/>'],
  ['marker','Marker','<rect x="9" y="3" width="6" height="12" rx="2"/><path d="M10 15l-1 6h6l-1-6"/>'],
  ['glitter','Glitter','<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'],
  ['rainbow','Rainbow','<path d="M3 18a9 9 0 0 1 18 0"/><path d="M7 18a5 5 0 0 1 10 0"/>'],
  ['stamp','Patterns','<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="12" cy="13" r="2.5"/><circle cx="7" cy="19" r="2.5"/><circle cx="17" cy="19" r="2.5"/>'],
  ['fill','Fill','<path d="M4 12l7-7 7 7-7 7z"/><path d="M20 15c0 2-1 3-1.5 3S17 17 17 15c0-1 1.5-3 1.5-3S20 14 20 15z" fill="currentColor"/>'],
  ['stickers','Stickers','<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M8.5 14.5c2 2 5 2 7 0"/>'],
  ['eraser','Rubber','<path d="M8 20h12"/><path d="M4 15l9-9 6 6-7 7H8z"/>'],
];
// Tools
const toolsEl = $('#tools');
for (const [k, label, icon] of TOOLS){ const b = el('button', 'tool'); b.dataset.tool = k; b.setAttribute('aria-pressed', k === tool ? 'true' : 'false'); b.appendChild(svgIcon(icon)); b.append(label); toolsEl.appendChild(b); }
toolsEl.addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; setTool(b.dataset.tool); });
function setTool(t){
  tool = t; toolsEl.querySelectorAll('[data-tool]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tool === t ? 'true' : 'false'));
  $('#optStamps').hidden = t !== 'stamp'; $('#optStickers').hidden = t !== 'stickers';
  $('#swatches').hidden = t === 'stickers' || t === 'rainbow' || t === 'eraser';
  $('#sizes').hidden = t === 'stickers' || t === 'fill';
  if (t !== 'stickers'){ selSticker = -1; pendingSticker = null; renderStickers(); }
  updateStickerUI();
}
// Colours
const swEl = $('#swatches');
SWATCHES.forEach(c => { const b = el('button', 'sw'); b.style.background = c; b.dataset.color = c; b.setAttribute('aria-label', 'Colour ' + c); b.setAttribute('aria-pressed', c === color ? 'true' : 'false'); swEl.appendChild(b); });
swEl.addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (!b) return; color = b.dataset.color; swEl.querySelectorAll('.sw').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
$('#sizes').addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (!b) return; brush = +b.dataset.size; $('#sizes').querySelectorAll('.size').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
$('#mirror').addEventListener('click', e => { mirror = !mirror; e.currentTarget.setAttribute('aria-pressed', mirror ? 'true' : 'false'); drawGuide(); });
// Stamps
const stEl = $('#optStamps');
for (const k of STAMPS){ const b = el('button', 'stamp'); b.dataset.stamp = k; b.setAttribute('aria-pressed', k === stampKind ? 'true' : 'false');
  const c = mkCanvas(44, 44); drawStamp(c.getContext('2d'), k, 22, 22, 30, '#14313a'); b.appendChild(c); b.append(k[0].toUpperCase() + k.slice(1)); stEl.appendChild(b); }
stEl.addEventListener('click', e => { const b = e.target.closest('[data-stamp]'); if (!b) return; stampKind = b.dataset.stamp; stEl.querySelectorAll('.stamp').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
// Stickers
const tabsEl = $('#stkTabs'), gridEl = $('#stkGrid');
for (const cat in STICKERS){ const b = el('button', 'stk-tab', cat); b.dataset.cat = cat; b.setAttribute('aria-pressed', cat === stkTab ? 'true' : 'false'); tabsEl.appendChild(b); }
tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; stkTab = b.dataset.cat; tabsEl.querySelectorAll('.stk-tab').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); buildStickerGrid(); });
function buildStickerGrid(){
  gridEl.innerHTML = '';
  for (const k of STICKERS[stkTab]){ const b = el('button', 'stk'); b.dataset.stk = k; b.setAttribute('aria-label', k); b.setAttribute('aria-pressed', k === pendingSticker ? 'true' : 'false');
    const c = mkCanvas(92, 92), g = c.getContext('2d'); g.translate(46, k[0] === 'h' ? 60 : 46); g.scale(0.95, 0.95); drawSticker(g, k); b.appendChild(c); gridEl.appendChild(b); }
}
gridEl.addEventListener('click', e => { const b = e.target.closest('[data-stk]'); if (!b) return; pendingSticker = pendingSticker === b.dataset.stk ? null : b.dataset.stk; selSticker = -1; buildStickerGrid(); renderStickers(); updateStickerUI(); });
function updateStickerUI(){
  $('#stkSel').hidden = selSticker < 0;
  $('#stkNote').textContent = pendingSticker ? 'Now tap your drawing to put it there.' : selSticker >= 0 ? 'Drag it to move it, or use the buttons.' : 'Tap a sticker, then tap your drawing to put it there.';
}
$('#stkSel').addEventListener('click', e => {
  const a = e.target.closest('[data-sact]'); if (!a || selSticker < 0) return; const s = stickers[selSticker]; pushUndo();
  if (a.dataset.sact === 'smaller') s.s = clamp(s.s/1.18, 0.4, 4);
  if (a.dataset.sact === 'bigger') s.s = clamp(s.s*1.18, 0.4, 4);
  if (a.dataset.sact === 'turn') s.r += Math.PI/8;
  if (a.dataset.sact === 'remove'){ stickers.splice(selSticker, 1); selSticker = -1; }
  renderStickers(); updateStickerUI();
});
function renderStickers(){
  sctx.clearRect(0, 0, TW, TH);
  stickers.forEach((s, i) => { sctx.save(); sctx.translate(s.x, s.y); sctx.rotate(s.r); sctx.scale(s.s, s.s); drawSticker(sctx, s.k); sctx.restore();
    if (i === selSticker){ sctx.save(); sctx.strokeStyle = '#ff7350'; sctx.lineWidth = 3; sctx.setLineDash([8, 6]); sctx.beginPath(); sctx.arc(s.x, s.y, 46*s.s, 0, PI2); sctx.stroke(); sctx.restore(); } });
}
function drawStickersTo(g){ for (const s of stickers){ g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.scale(s.s, s.s); drawSticker(g, s.k); g.restore(); } }
// Templates grid
function buildTemplates(){
  const grid = $('#tgrid'); grid.innerHTML = '';
  const blank = el('button', 'tile blank'); blank.appendChild(mkCanvas(180, 120)); blank.append('Blank page');
  blank.addEventListener('click', () => startDraw('creature', null)); grid.appendChild(blank);
  for (const t of TPL){
    const b = el('button', 'tile'), c = mkCanvas(180, 120), g = c.getContext('2d');
    g.scale(0.2, 0.2); g.lineWidth = 9; g.strokeStyle = '#1d2b30'; g.lineJoin = 'round'; g.lineCap = 'round'; strokeTemplate(g, t);
    b.appendChild(c); b.append(t.name); b.addEventListener('click', () => startDraw('creature', t)); grid.appendChild(b);
  }
}
let templatesBuilt = false;
// Modes
$('#modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; setMode(b.dataset.mode); });
function setMode(m){
  if (m !== mode && mode !== 'blank'){ pushUndo(); pctx.clearRect(0, 0, TW, TH); }
  mode = m; alongStep = 0;
  $('#modes').querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mode === m ? 'true' : 'false'));
  $('#stepbar').hidden = m !== 'along';
  if (m === 'colour'){ setTool('fill'); } else if (tool === 'fill') setTool('crayon');
  drawGuide();
}
function alongSteps(){ return curTpl.shapes.length + (curTpl.lines ? 1 : 0); }
function updateStepbar(){
  if (mode !== 'along' || !curTpl) return;
  const n = alongSteps();
  if (alongStep >= n){ $('#alText').textContent = 'All done! Colour it in, then tap Next.'; $('#alNext').disabled = true; }
  else { const name = alongStep < curTpl.shapes.length ? curTpl.shapes[alongStep][0] : 'the face and details'; $('#alText').textContent = `Step ${alongStep + 1} of ${n}: draw ${name}`; $('#alNext').disabled = false; }
  $('#alPrev').disabled = alongStep === 0;
}
$('#alNext').addEventListener('click', () => { alongStep = Math.min(alongSteps(), alongStep + 1); drawGuide(); Snd.tap(); });
$('#alPrev').addEventListener('click', () => { alongStep = Math.max(0, alongStep - 1); drawGuide(); });
function dotsFor(fn){
  const pts = samplePath(fn); if (pts.length < 2) return [];
  const segs = []; let L = 0;
  for (let i=1;i<pts.length;i++){ if (pts[i].jump){ continue; } const d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); L += d; segs.push([L, pts[i]]); }
  const k = clamp(Math.round(L/110), 4, 16), out = [pts[0]];
  let j = 0; for (let i=1;i<k;i++){ const target = L*i/k; while (j < segs.length - 1 && segs[j][0] < target) j++; out.push(segs[j][1]); }
  return out;
}
function drawGuide(){
  gctx.clearRect(0, 0, TW, TH); lctx.clearRect(0, 0, TW, TH);
  const ink = (g, w) => { g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; };
  if (curTpl && makeKind === 'creature'){
    if (mode === 'colour'){ lctx.strokeStyle = '#1d2b30'; ink(lctx, 7); strokeTemplate(lctx, curTpl); }
    else if (mode === 'trace'){ gctx.save(); gctx.strokeStyle = 'rgba(20,49,58,.3)'; ink(gctx, 6); gctx.setLineDash([1, 14]); strokeTemplate(gctx, curTpl); gctx.restore(); }
    else if (mode === 'along'){
      gctx.save(); gctx.strokeStyle = 'rgba(20,49,58,.12)'; ink(gctx, 5);
      for (let i=0;i<Math.min(alongStep, curTpl.shapes.length);i++){ gctx.beginPath(); curTpl.shapes[i][1](gctx); gctx.stroke(); }
      if (alongStep > curTpl.shapes.length && curTpl.lines){ gctx.beginPath(); curTpl.lines(gctx); gctx.stroke(); }
      if (alongStep < alongSteps()){
        const fn = alongStep < curTpl.shapes.length ? curTpl.shapes[alongStep][1] : curTpl.lines;
        gctx.strokeStyle = 'rgba(14,86,98,.55)'; ink(gctx, 6); gctx.setLineDash([2, 13]); gctx.beginPath(); fn(gctx); gctx.stroke(); gctx.setLineDash([]);
        if (alongStep < curTpl.shapes.length){
          const dots = dotsFor(fn);
          gctx.font = '900 15px Nunito, system-ui, sans-serif'; gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
          dots.forEach((p, i) => { gctx.fillStyle = i === 0 ? '#2a9d8f' : 'rgba(20,49,58,.75)'; gctx.beginPath(); gctx.arc(p.x, p.y, i === 0 ? 14 : 11, 0, PI2); gctx.fill(); gctx.fillStyle = '#fff'; gctx.fillText(String(i + 1), p.x, p.y + 1); });
        }
      }
      gctx.restore(); updateStepbar();
    }
  }
  gctx.save(); gctx.fillStyle = 'rgba(20,49,58,.32)'; gctx.strokeStyle = 'rgba(20,49,58,.22)'; ink(gctx, 5); gctx.font = '800 26px Nunito, system-ui, sans-serif'; gctx.textBaseline = 'alphabetic';
  if (makeKind === 'creature'){
    gctx.beginPath(); gctx.moveTo(700, 46); gctx.lineTo(850, 46); gctx.moveTo(830, 30); gctx.lineTo(852, 46); gctx.lineTo(830, 62); gctx.stroke();
    gctx.textAlign = 'right'; gctx.fillText('front this way', 690, 55);
  } else {
    gctx.setLineDash([10, 12]); gctx.beginPath(); gctx.moveTo(40, 560); gctx.lineTo(860, 560); gctx.stroke(); gctx.setLineDash([]);
    gctx.textAlign = 'center'; gctx.fillText(makeKind === 'plant' ? 'Your plant grows up from this line' : 'Your decoration sits on this line', 450, 592);
  }
  if (mirror){ gctx.strokeStyle = 'rgba(255,115,80,.45)'; gctx.setLineDash([12, 10]); gctx.beginPath(); gctx.moveTo(20, TH/2); gctx.lineTo(TW - 20, TH/2); gctx.stroke(); }
  gctx.restore();
}
// Painting
const undoStack = [];
function pushUndo(){ try { undoStack.push({img:pctx.getImageData(0, 0, TW, TH), st:JSON.stringify(stickers)}); if (undoStack.length > 12) undoStack.shift(); } catch(e){} }
function undo(){ const d = undoStack.pop(); if (!d) return; pctx.putImageData(d.img, 0, 0); stickers = JSON.parse(d.st); selSticker = -1; renderStickers(); updateStickerUI(); }
function toPaper(e){ const r = paper.getBoundingClientRect(); return {x:(e.clientX - r.left)*TW/r.width, y:(e.clientY - r.top)*TH/r.height}; }
function both(a, b, fn){ fn(a, b); if (mirror) fn({x:a.x, y:TH - a.y}, {x:b.x, y:TH - b.y}); }
let stampDist = 0;
function seg(a, b){
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (tool === 'stamp'){
    stampDist += d; const gap = brush*1.5;
    if (stampDist >= gap || d === 0){ stampDist = 0; both(b, b, p => drawStamp(pctx, stampKind, p.x, p.y, brush*1.4, color)); }
    return;
  }
  if (tool === 'glitter'){
    both(a, b, (p, q) => { const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y)/3));
      for (let i=0;i<n;i++){ const t = i/n, x = p.x + (q.x - p.x)*t, y = p.y + (q.y - p.y)*t;
        for (let k=0;k<3;k++){ const rx = x + rand(-brush/2, brush/2), ry = y + rand(-brush/2, brush/2), s = rand(1.5, 4);
          pctx.fillStyle = Math.random() < .12 ? '#ffffff' : shade(color, rand(-40, 50)); pctx.fillRect(rx - s/2, ry - s/2, s, s); }
        if (Math.random() < .08){ pctx.fillStyle = '#fff'; starPath(pctx, x + rand(-brush/2, brush/2), y + rand(-brush/2, brush/2), 6, 1.5, 4); pctx.fill(); } } });
    return;
  }
  pctx.save(); pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.lineWidth = brush;
  if (tool === 'eraser'){ pctx.globalCompositeOperation = 'destination-out'; pctx.strokeStyle = '#000'; pctx.lineWidth = brush*1.5; }
  else if (tool === 'crayon') pctx.strokeStyle = crayonPat(pctx, color);
  else if (tool === 'rainbow'){ rainbowHue = (rainbowHue + d*0.5) % 360; pctx.strokeStyle = `hsl(${rainbowHue} 85% 58%)`; }
  else pctx.strokeStyle = color;
  both(a, b, (p, q) => { pctx.beginPath(); pctx.moveTo(p.x, p.y); pctx.lineTo(q.x + 0.01, q.y); pctx.stroke(); });
  pctx.restore();
}
function shade(hex, amt){ const n = parseInt(hex.slice(1), 16); const f = v => clamp(v + amt, 0, 255)|0; return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; }
const compC = mkCanvas(TW, TH), compX = compC.getContext('2d', {willReadFrequently:true});
function hexRGB(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function flood(px, py){
  px = px|0; py = py|0; if (px < 0 || py < 0 || px >= TW || py >= TH) return;
  compX.clearRect(0, 0, TW, TH); compX.drawImage(paint, 0, 0); compX.drawImage(lines, 0, 0);
  const cd = compX.getImageData(0, 0, TW, TH).data, ld = lctx.getImageData(0, 0, TW, TH).data;
  const i0 = (py*TW + px)*4, r0 = cd[i0], g0 = cd[i0+1], b0 = cd[i0+2], a0 = cd[i0+3];
  const match = i => { const a = cd[i+3]; if (a0 < 20) return a < 60; return Math.abs(cd[i] - r0) + Math.abs(cd[i+1] - g0) + Math.abs(cd[i+2] - b0) + Math.abs(a - a0) < 110; };
  const mask = new Uint8Array(TW*TH), stack = new Int32Array(TW*TH); let sp = 0;
  stack[sp++] = py*TW + px; mask[py*TW + px] = 1;
  while (sp){ const p = stack[--sp], x = p % TW, y = (p - x)/TW;
    if (x > 0 && !mask[p-1] && match((p-1)*4)){ mask[p-1] = 1; stack[sp++] = p - 1; }
    if (x < TW - 1 && !mask[p+1] && match((p+1)*4)){ mask[p+1] = 1; stack[sp++] = p + 1; }
    if (y > 0 && !mask[p-TW] && match((p-TW)*4)){ mask[p-TW] = 1; stack[sp++] = p - TW; }
    if (y < TH - 1 && !mask[p+TW] && match((p+TW)*4)){ mask[p+TW] = 1; stack[sp++] = p + TW; } }
  const out = pctx.getImageData(0, 0, TW, TH), od = out.data, [R, G, B] = hexRGB(color);
  const set = q => { const k = q*4; od[k] = R; od[k+1] = G; od[k+2] = B; od[k+3] = 255; };
  for (let p=0;p<mask.length;p++){ if (!mask[p]) continue; set(p);
    const x = p % TW, y = (p - x)/TW;
    for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++){ const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
      const q = ny*TW + nx; if (mask[q]) continue; const a = cd[q*4 + 3]; if (ld[q*4 + 3] > 0 || (a > 0 && a < 250)) set(q); } }
  pctx.putImageData(out, 0, 0);
}
let drawing = false, lastP = null, dragSt = null;
paper.addEventListener('pointerdown', e => {
  e.preventDefault(); const p = toPaper(e);
  try { paper.setPointerCapture(e.pointerId); } catch(_) {}
  if (tool === 'stickers'){
    if (pendingSticker){ pushUndo(); stickers.push({k:pendingSticker, x:p.x, y:p.y, s:1.3, r:0}); selSticker = stickers.length - 1; pendingSticker = null; buildStickerGrid(); renderStickers(); updateStickerUI(); Snd.tap(); return; }
    let hit = -1; for (let i=stickers.length - 1;i>=0;i--){ const s = stickers[i]; if (Math.hypot(p.x - s.x, p.y - s.y) < 46*s.s){ hit = i; break; } }
    selSticker = hit; if (hit >= 0){ pushUndo(); dragSt = {dx:p.x - stickers[hit].x, dy:p.y - stickers[hit].y}; }
    renderStickers(); updateStickerUI(); return;
  }
  pushUndo();
  if (tool === 'fill'){ flood(p.x, p.y); if (mirror) flood(p.x, TH - p.y); return; }
  drawing = true; lastP = p; stampDist = 0; seg(p, p);
});
paper.addEventListener('pointermove', e => {
  if (dragSt && selSticker >= 0){ const p = toPaper(e); stickers[selSticker].x = p.x - dragSt.dx; stickers[selSticker].y = p.y - dragSt.dy; renderStickers(); return; }
  if (!drawing) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])){ const p = toPaper(ev); seg(lastP, p); lastP = p; }
});
const endStroke = () => { drawing = false; dragSt = null; };
paper.addEventListener('pointerup', endStroke); paper.addEventListener('pointercancel', endStroke);
$('#bUndo').addEventListener('click', undo);
let clearArm = 0;
$('#bClear').addEventListener('click', e => {
  const b = e.currentTarget;
  if (Date.now() < clearArm){ pushUndo(); pctx.clearRect(0, 0, TW, TH); stickers = []; selSticker = -1; renderStickers(); updateStickerUI(); clearArm = 0; b.textContent = 'Clear'; return; }
  clearArm = Date.now() + 2500; b.textContent = 'Tap again to clear'; setTimeout(() => { if (Date.now() >= clearArm) b.textContent = 'Clear'; }, 2600);
});

function resetPaper(){ pctx.clearRect(0, 0, TW, TH); stickers = []; selSticker = -1; pendingSticker = null; undoStack.length = 0; renderStickers(); }
function startDraw(kind, t){
  makeKind = kind; curTpl = kind === 'creature' ? t : null;
  $('#modes').hidden = !curTpl; $('#stepbar').hidden = true;
  if (curTpl) setMode('colour'); else { mode = 'blank'; setTool('crayon'); drawGuide(); }
  const title = curTpl ? curTpl.name : kind === 'plant' ? 'Draw a plant' : kind === 'decor' ? 'Draw a decoration' : 'Draw anything';
  show('scrDraw', title); buildStickerGrid(); updateStickerUI();
}
function openStudio(){ editing = null; resetPaper(); studio.hidden = false; show('scrMake', 'What shall we make?'); }
function closeStudio(){ studio.hidden = true; }
$('#btnDraw').addEventListener('click', () => { Snd.init(); closeCard(); openStudio(); });
document.querySelectorAll('[data-make]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.make; resetPaper();
  if (k === 'creature'){ if (!templatesBuilt){ buildTemplates(); templatesBuilt = true; } show('scrPick', 'Pick a page'); }
  else if (k === 'photo'){ $('#fileIn').value = ''; $('#fileIn').click(); }
  else startDraw(k, null);
}));
$('#sBack').addEventListener('click', () => {
  if (scr === 'scrMake' || (scr === 'scrMeet' && editing)) return closeStudio();
  if (scr === 'scrPick' || scr === 'scrPhoto') return show('scrMake', 'What shall we make?');
  if (scr === 'scrDraw'){ if (makeKind === 'creature' && !fromPhoto) return show('scrPick', 'Pick a page'); fromPhoto = false; return show('scrMake', 'What shall we make?'); }
  if (scr === 'scrMeet') return show('scrDraw', $('#sTitle').dataset.drawTitle || 'Draw');
});

function fillEnclosed(c){
  const g = c.getContext('2d', {willReadFrequently:true}), id = g.getImageData(0, 0, TW, TH), d = id.data, N = TW*TH;
  const wall = new Uint8Array(N); for (let i=0;i<N;i++) wall[i] = d[i*4 + 3] > 40 ? 1 : 0;
  const tmp = new Uint8Array(N);
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){ let v = 0; for (let k=-2;k<=2 && !v;k++){ const xx = x + k; if (xx >= 0 && xx < TW && wall[y*TW + xx]) v = 1; } tmp[y*TW + x] = v; }
  const dil = new Uint8Array(N);
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){ let v = 0; for (let k=-2;k<=2 && !v;k++){ const yy = y + k; if (yy >= 0 && yy < TH && tmp[yy*TW + x]) v = 1; } dil[y*TW + x] = v; }
  const out = new Uint8Array(N), st = new Int32Array(N); let sp = 0;
  const seed = p => { if (!dil[p] && !out[p]){ out[p] = 1; st[sp++] = p; } };
  for (let x=0;x<TW;x++){ seed(x); seed((TH - 1)*TW + x); } for (let y=0;y<TH;y++){ seed(y*TW); seed(y*TW + TW - 1); }
  while (sp){ const p = st[--sp], x = p % TW, y = (p - x)/TW; if (x > 0) seed(p - 1); if (x < TW - 1) seed(p + 1); if (y > 0) seed(p - TW); if (y < TH - 1) seed(p + TW); }
  let any = false;
  for (let i=0;i<N;i++){ if (out[i]) continue; const k = i*4, a = d[k+3]/255; if (a >= 1) continue; any = true;
    d[k] = d[k]*a + 255*(1 - a); d[k+1] = d[k+1]*a + 255*(1 - a); d[k+2] = d[k+2]*a + 255*(1 - a); d[k+3] = 255; }
  if (any) g.putImageData(id, 0, 0);
}
function cropCanvas(src, maxDim){
  const w = src.width, h = src.height, d = src.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y=0;y<h;y++){ const row = y*w*4; for (let x=0;x<w;x++){ if (d[row + x*4 + 3] > 16){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } }
  if (x1 < 0) return null;
  const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = Math.min(1, maxDim/Math.max(cw, ch));
  const out = mkCanvas(Math.max(4, cw*s), Math.max(4, ch*s)); out.getContext('2d').drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
  out.crop = {x0, y0, cw, ch};
  return out;
}
function exportDrawing(){
  const out = mkCanvas(TW, TH), g = out.getContext('2d', {willReadFrequently:true});
  if (curTpl && mode === 'colour'){ silhouette(g, curTpl, '#ffffff'); g.drawImage(paint, 0, 0); g.drawImage(lines, 0, 0); cutHoles(g, curTpl); }
  else { g.drawImage(paint, 0, 0); fillEnclosed(out); }
  drawStickersTo(g);
  const cr = cropCanvas(out, 320);
  if (cr){
    const stk = stickers.filter(s => s.k[0] === 'e').map(s => [s.x, s.y, 28*s.s]);
    const tplE = curTpl && curTpl.eyes ? curTpl.eyes.filter(([x, y]) => !stk.some(([sx, sy, sr]) => Math.hypot(sx - x, sy - y) < sr + 10)) : [];
    pendingEyes = mapEyes(tplE.concat(stk), cr.crop);
  }
  return cr;
}
let pendingEyes = [];
const eyeWrap = $('#eyeWrap');
function renderEyeDots(){
  eyeWrap.querySelectorAll('.eyedot').forEach(d => d.remove());
  for (const [u, v] of pendingEyes){ const d = el('i', 'eyedot'); d.style.left = (u*100) + '%'; d.style.top = (v*100) + '%'; eyeWrap.appendChild(d); }
}
eyeWrap.addEventListener('click', e => {
  if ($('#eyeNote').hidden) return;
  const r = $('#pImg').getBoundingClientRect(); if (!r.width) return;
  const u = (e.clientX - r.left)/r.width, v = (e.clientY - r.top)/r.height, ar = r.height/r.width;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  const i = pendingEyes.findIndex(([a, b]) => Math.hypot(a - u, (b - v)*ar) < 0.07);
  if (i >= 0) pendingEyes.splice(i, 1);
  else { if (pendingEyes.length >= 3) pendingEyes.shift(); pendingEyes.push([u, v, 0.045]); }
  renderEyeDots(); Snd.tap();
});
$('#sNext').addEventListener('click', () => {
  if (!(curTpl && mode === 'colour')){
    const d = pctx.getImageData(0, 0, TW, TH).data; let any = stickers.length > 0;
    for (let i=3;i<d.length && !any;i+=16) if (d[i] > 16) any = true;
    if (!any){ toast('Draw something first'); return; }
  }
  const c = exportDrawing(); if (!c){ toast('Draw something first'); return; }
  pending = webp(c);
  $('#sTitle').dataset.drawTitle = $('#sTitle').textContent;
  openMeet();
});
function chips(elm, items, sel, onPick){
  elm.innerHTML = '';
  items.forEach(([k, label]) => { const b = el('button', 'chip', label); b.dataset.k = k; b.setAttribute('aria-pressed', k === sel ? 'true' : 'false'); elm.appendChild(b); });
  elm.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; elm.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); onPick(b.dataset.k); };
}
function openMeet(){
  const isC = makeKind === 'creature' || editing;
  $('#pImg').src = editing ? editing.src : pending;
  if (editing) pendingEyes = (editing.eyes || []).map(e => e.slice());
  $('#eyeNote').hidden = !isC; $('.preview').classList.toggle('still', !!isC); renderEyeDots();
  if (!isC){ eyeWrap.querySelectorAll('.eyedot').forEach(d => d.remove()); }
  $('#fNameWrap').hidden = !isC; $('#fMoveWrap').hidden = !isC; $('#fPersWrap').hidden = !isC;
  if (isC){
    $('#fName').value = editing ? editing.name : pick(NAMES);
    moveSel = editing ? editing.type : (curTpl ? curTpl.move : 'swim');
    persSel = editing ? editing.pers : pick(Object.keys(PERS));
    chips($('#chMove'), Object.entries(TYPES).map(([k, v]) => [k, v.label]), moveSel, k => moveSel = k);
    chips($('#chPers'), Object.entries(PERS).map(([k, v]) => [k, v.label]), persSel, k => persSel = k);
  }
  $('#sAdd').textContent = editing ? 'Save changes' : 'Add to tank';
  show('scrMeet', editing ? 'Change ' + editing.name : makeKind === 'creature' ? 'Meet your friend' : makeKind === 'plant' ? 'Your plant' : 'Your decoration');
}
function openStudioEdit(c){ editing = c; studio.hidden = false; openMeet(); }
$('#sAdd').addEventListener('click', async () => {
  if (editing){
    const c = editing, nm = ($('#fName').value || '').trim() || c.name;
    const typeChanged = c.type !== moveSel; c.name = nm; c.type = moveSel; c.pers = persSel;
    c.eyes = pendingEyes.map(e => e.slice()); sampleLids(c); c.blinkT = 0.18;
    c.tricks = c.tricks.filter(k => (TRICKS[c.type] || []).includes(k));
    if (typeChanged){ const [, dh] = dims(c); if (isGround(c)) c.y = groundY(c.x) - dh/2; pickTarget(c); }
    editing = null; closeStudio(); save(); toast('Saved'); return;
  }
  if (!pending) return;
  if (makeKind === 'creature'){
    if (creatures.length >= 30){ toast('The tank is full. Say goodbye to someone in My tank first.'); return; }
    const d = {id:uid(), name:($('#fName').value || '').trim() || pick(NAMES), type:moveSel, pers:persSel, growth:1, src:pending, joined:Date.now(), eyes:pendingEyes.map(e => e.slice())};
    closeStudio(); if (roomOn){ roomOn = false; applyRoom(); }
    await addCreature(d, {enter:true});
  } else {
    const it = await addDrawnItem({id:uid(), kind:makeKind === 'plant' ? 'drawnPlant' : 'drawnDecor', x:clamp(cam.x/W, 0.1, 0.9), d:0.5, s:1, flip:false, seed:(Math.random()*1e6)|0, src:pending, cost:0});
    closeStudio(); if (roomOn){ roomOn = false; applyRoom(); }
    if (it){ openDeco(); selItem = it; updateDecoSel(); computeHides(); toast('Drag it to where you want it'); }
  }
  resetPaper(); pending = null; fromPhoto = false; save();
});

/* ================= Photo cut-out ================= */
let photoImg = null, photoKind = 'creature', fromPhoto = false, cutResult = null, cutTimer = 0;
$('#fileIn').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => { photoImg = img; show('scrPhoto', 'Your photo'); runCutout(); };
  img.onerror = () => toast('That photo would not open. Try another one.');
  img.src = url;
});
chips($('#cutKind'), [['creature','A creature'],['plant','A plant'],['decor','A decoration']], photoKind, k => photoKind = k);
$('#cutStr').addEventListener('input', () => { clearTimeout(cutTimer); cutTimer = setTimeout(runCutout, 160); });
$('#cutInside').addEventListener('click', e => { const b = e.currentTarget; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); runCutout(); });
$('#cutSticker').addEventListener('click', e => { const b = e.currentTarget; stickerOn = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', stickerOn ? 'true' : 'false'); runCutout(); });
$('#cutAgain').addEventListener('click', () => { $('#fileIn').value = ''; $('#fileIn').click(); });
function runCutout(){
  if (!photoImg) return;
  const res = cutout(photoImg, $('#cutStr').value/100, $('#cutInside').getAttribute('aria-pressed') === 'true');
  cutResult = res;
  const cc = $('#cutCv');
  if (!res){ cc.width = 10; cc.height = 10; $('#cutNote').textContent = 'No drawing found. Try sliding Cut-out to the right, or take the photo closer.'; return; }
  cc.width = res.width; cc.height = res.height; cc.getContext('2d').drawImage(res, 0, 0);
  $('#cutNote').textContent = 'Slide to clean up the edges. Use a photo of a drawing on plain paper for the best result.';
}
function cutout(img, strength, keepInside){
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const sc = Math.min(1, 900/Math.max(iw, ih)), w = Math.max(8, Math.round(iw*sc)), h = Math.max(8, Math.round(ih*sc));
  const cnv = mkCanvas(w, h), x = cnv.getContext('2d', {willReadFrequently:true}); x.drawImage(img, 0, 0, w, h);
  const id = x.getImageData(0, 0, w, h), d = id.data, N = w*h;
  const G = 24, gw = Math.ceil(w/G), gh = Math.ceil(h/G), bg = new Float32Array(gw*gh*3), bl = new Float32Array(gw*gh);
  for (let gy=0;gy<gh;gy++) for (let gx=0;gx<gw;gx++){
    let best = [], x0 = gx*G, y0 = gy*G;
    for (let yy=y0;yy<Math.min(h, y0 + G);yy+=2) for (let xx=x0;xx<Math.min(w, x0 + G);xx+=2){ const k = (yy*w + xx)*4; best.push([d[k] + d[k+1] + d[k+2], d[k], d[k+1], d[k+2]]); }
    best.sort((a, b) => b[0] - a[0]); const n = Math.max(1, Math.round(best.length*0.25)); let r = 0, g = 0, b = 0;
    for (let i=0;i<n;i++){ r += best[i][1]; g += best[i][2]; b += best[i][3]; }
    const ci = gy*gw + gx; bg[ci*3] = r/n; bg[ci*3+1] = g/n; bg[ci*3+2] = b/n; bl[ci] = (r + g + b)/n/3;
  }
  const border = []; for (let gx=0;gx<gw;gx++){ border.push(bl[gx], bl[(gh - 1)*gw + gx]); } for (let gy=0;gy<gh;gy++){ border.push(bl[gy*gw], bl[gy*gw + gw - 1]); }
  border.sort((a, b) => a - b); const paperL = border[(border.length*0.6)|0] || 200;
  // cells covered by the drawing are not paper: rebuild them from neighbouring paper cells
  const GN = gw*gh; let valid = new Uint8Array(GN), nValid = 0;
  for (let i=0;i<GN;i++){ const r = bg[i*3], gg = bg[i*3+1], b = bg[i*3+2], sat = Math.max(r, gg, b) - Math.min(r, gg, b); valid[i] = bl[i] >= paperL*0.72 && sat < 40 ? 1 : 0; nValid += valid[i]; }
  if (!nValid){ for (let i=0;i<GN;i++){ bg[i*3] = bg[i*3+1] = bg[i*3+2] = paperL; valid[i] = 1; } }
  for (let iter=0;iter<400;iter++){
    const nv = valid.slice(); let left = 0;
    for (let gy=0;gy<gh;gy++) for (let gx=0;gx<gw;gx++){ const i = gy*gw + gx; if (valid[i]) continue; left++;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){ const X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue; const j = Y*gw + X; if (!valid[j]) continue; r += bg[j*3]; gg += bg[j*3+1]; b += bg[j*3+2]; n++; }
      if (n){ bg[i*3] = r/n; bg[i*3+1] = gg/n; bg[i*3+2] = b/n; nv[i] = 1; } }
    valid = nv; if (!left) break;
  }
  for (let pass=0;pass<2;pass++){ const cp = bg.slice(); for (let gy=0;gy<gh;gy++) for (let gx=0;gx<gw;gx++){ for (let ch=0;ch<3;ch++){ let s = 0, n = 0; for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){ const X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue; s += cp[(Y*gw + X)*3 + ch]; n++; } bg[(gy*gw + gx)*3 + ch] = s/n; } } }
  const ink = new Uint8Array(N), norm = new Uint8ClampedArray(N*4), thr = 95 - strength*75;
  for (let yy=0;yy<h;yy++){ const fy = clamp(yy/G - 0.5, 0, gh - 1), y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
    for (let xx=0;xx<w;xx++){ const fx = clamp(xx/G - 0.5, 0, gw - 1), x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
      const k = (yy*w + xx)*4; let L = 0, mx = 0, mn = 255;
      for (let ch=0;ch<3;ch++){
        const a = bg[(y0*gw + x0)*3 + ch]*(1 - tx) + bg[(y0*gw + x1)*3 + ch]*tx, b = bg[(y1*gw + x0)*3 + ch]*(1 - tx) + bg[(y1*gw + x1)*3 + ch]*tx;
        const B = Math.max(30, a*(1 - ty) + b*ty), v = Math.min(255, d[k + ch]/B*245);
        norm[k + ch] = v; L += v; if (v > mx) mx = v; if (v < mn) mn = v; }
      norm[k + 3] = 255; L /= 3;
      const score = Math.max(245 - L, (mx - mn)*0.9);
      ink[yy*w + xx] = score > thr ? 1 : 0; } }
  // 1. trim the table, paper edges and shadows: rows and columns at the photo's edges that are mostly "not paper"
  const trimmed = new Uint8Array(N);
  const rowInk = y => { let s = 0; for (let x=0;x<w;x++) s += ink[y*w + x]; return s/w; };
  const colInk = x => { let s = 0; for (let y=0;y<h;y++) s += ink[y*w + x]; return s/h; };
  const trimRows = (from, step) => { for (let y=from, n=0; n < h*0.15; y+=step, n++){ if (rowInk(y) < 0.3) break; for (let x=0;x<w;x++) trimmed[y*w + x] = 1; } };
  const trimCols = (from, step) => { for (let x=from, n=0; n < w*0.15; x+=step, n++){ if (colInk(x) < 0.3) break; for (let y=0;y<h;y++) trimmed[y*w + x] = 1; } };
  trimRows(0, 1); trimRows(h - 1, -1); trimCols(0, 1); trimCols(w - 1, -1);
  for (let i=0;i<N;i++) if (trimmed[i]) ink[i] = 0;
  // 2. find the pieces of drawing; drop specks, things touching the photo edge, and small strays far from the main drawing
  const lab = new Int32Array(N), st = new Int32Array(N), comps = [];
  for (let i=0;i<N;i++){ if (!ink[i] || lab[i]) continue; const id = comps.length + 1; let sp = 0, n = 0, edge = false; st[sp++] = i; lab[i] = id;
    const list = [];
    while (sp){ const p = st[--sp]; list.push(p); n++; const px = p % w, py = (p - px)/w; if (px < 3 || py < 3 || px > w - 4 || py > h - 4) edge = true;
      if (px > 0 && ink[p-1] && !lab[p-1]){ lab[p-1] = id; st[sp++] = p - 1; }
      if (px < w - 1 && ink[p+1] && !lab[p+1]){ lab[p+1] = id; st[sp++] = p + 1; }
      if (py > 0 && ink[p-w] && !lab[p-w]){ lab[p-w] = id; st[sp++] = p - w; }
      if (py < h - 1 && ink[p+w] && !lab[p+w]){ lab[p+w] = id; st[sp++] = p + w; } }
    comps.push({n, edge, list}); }
  const biggest = comps.reduce((m, c) => Math.max(m, c.n), 0);
  for (const c of comps){ if (c.n < Math.max(30, N*0.0006) || c.n < biggest*0.02 || (c.edge && c.n < N*0.3 && c.n !== biggest)) for (const p of c.list) ink[p] = 0; }
  // 3. keep the inside: anything the outside can't reach (through gaps narrower than a few pixels) belongs to the drawing
  let keep = ink;
  if (keepInside){
    const R = 3, tmp = new Uint8Array(N), dil = new Uint8Array(N);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){ let v = 0; for (let k=-R;k<=R && !v;k++){ const X = x + k; if (X >= 0 && X < w && ink[y*w + X]) v = 1; } tmp[y*w + x] = v; }
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){ let v = 0; for (let k=-R;k<=R && !v;k++){ const Y = y + k; if (Y >= 0 && Y < h && tmp[Y*w + x]) v = 1; } dil[y*w + x] = v; }
    const out = new Uint8Array(N); let sp = 0;
    const seed = p => { if (!dil[p] && !out[p]){ out[p] = 1; st[sp++] = p; } };
    for (let x=0;x<w;x++){ seed(x); seed((h - 1)*w + x); } for (let y=0;y<h;y++){ seed(y*w); seed(y*w + w - 1); }
    for (let i=0;i<N;i++) if (trimmed[i]) seed(i);
    while (sp){ const p = st[--sp], px = p % w, py = (p - px)/w; if (px > 0) seed(p - 1); if (px < w - 1) seed(p + 1); if (py > 0) seed(p - w); if (py < h - 1) seed(p + w); }
    // grow the outside back over the padding ring so the cut follows the real edge
    const grown = out.slice();
    for (let pass=0;pass<R;pass++){ const prev = grown.slice();
      for (let i=0;i<N;i++){ if (prev[i] || ink[i] || !dil[i]) continue; const px = i % w, py = (i - px)/w;
        if ((px > 0 && prev[i-1]) || (px < w - 1 && prev[i+1]) || (py > 0 && prev[i-w]) || (py < h - 1 && prev[i+w])) grown[i] = 1; } }
    keep = new Uint8Array(N); for (let i=0;i<N;i++) keep[i] = grown[i] ? 0 : 1;
  }
  // 4. soft edges, then crop
  const res = new ImageData(w, h); let any = false;
  for (let i=0;i<N;i++){ if (!keep[i]) continue; any = true; const k = i*4; res.data[k] = norm[k]; res.data[k+1] = norm[k+1]; res.data[k+2] = norm[k+2]; res.data[k+3] = 255; }
  if (!any) return null;
  for (let i=0;i<N;i++){ if (!keep[i]) continue; const px = i % w, py = (i - px)/w;
    const nb = (px > 0 ? keep[i-1] : 0) + (px < w - 1 ? keep[i+1] : 0) + (py > 0 ? keep[i-w] : 0) + (py < h - 1 ? keep[i+w] : 0);
    if (nb < 4) res.data[i*4 + 3] = nb <= 1 ? 110 : 190; }
  const full = mkCanvas(w, h); full.getContext('2d').putImageData(res, 0, 0);
  const cropped = cropCanvas(full, 800);
  return stickerOn ? stickerEdge(cropped) : cropped;
}
let stickerOn = true;
function stickerEdge(src){
  const R = Math.max(5, Math.round(Math.max(src.width, src.height)*0.014)), pad = R + 4;
  const out = mkCanvas(src.width + pad*2, src.height + pad*2), g = out.getContext('2d');
  const sil = mkCanvas(out.width, out.height), sg = sil.getContext('2d');
  for (let a=0;a<24;a++){ const t = a/24*PI2; sg.drawImage(src, pad + Math.cos(t)*R, pad + Math.sin(t)*R); }
  for (let r=R*0.5;r>0;r-=R*0.5) for (let a=0;a<12;a++){ const t = a/12*PI2; sg.drawImage(src, pad + Math.cos(t)*r, pad + Math.sin(t)*r); }
  sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#ffffff'; sg.fillRect(0, 0, sil.width, sil.height);
  g.shadowColor = 'rgba(0,30,40,.28)'; g.shadowBlur = R*0.8; g.shadowOffsetY = R*0.25; g.drawImage(sil, 0, 0);
  g.shadowColor = 'transparent'; g.drawImage(src, pad, pad);
  return out;
}
$('#cutUse').addEventListener('click', () => {
  if (!cutResult){ toast('No drawing found yet. Try sliding Cut-out.'); return; }
  fromPhoto = true; resetPaper(); startDraw(photoKind, null); fromPhoto = true;
  const c = cutResult, m = 30, groundLine = photoKind !== 'creature';
  const s = Math.min((TW - m*2)/c.width, ((groundLine ? 560 : TH - m) - m)/c.height);
  const w = c.width*s, h = c.height*s, x = (TW - w)/2, y = groundLine ? 560 - h : (TH - h)/2;
  pctx.drawImage(c, x, y, w, h);
  $('#sTitle').textContent = 'Add stickers or colours';
});

/* ================= Boot ================= */
async function boot(){
  initGL(); if (!gl) glc.style.display = 'none';
  resize();
  window.addEventListener('resize', resize);
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ data = null; }
  if (!data){ try { const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (Array.isArray(old) && old.length) data = {creatures:old.map(o => Object.assign({joined:Date.now(), meals:0}, o)), decor:null}; } catch(e){} }
  if (data){
    if (data.settings) settings = Object.assign({}, DEF_SETTINGS, data.settings);
    if (typeof data.pearls === 'number') pearls = data.pearls;
    if (data.scene && SCENES[data.scene]){ sceneId = data.scene; Object.assign(cur, JSON.parse(JSON.stringify(SCENES[sceneId]))); }
    for (const d of (data.creatures || [])){ try { await addCreature(d); } catch(e){} }
    try { const st = starters(); for (const c of creatures){ if (!c.eyes.length){ const m = st.find(x => x.id === c.id); if (m && m.eyes.length){ c.eyes = m.eyes; sampleLids(c); } } } } catch(e){}
    if (Array.isArray(data.decor)){ for (const d of data.decor){ if (!DECOR[d.kind]) continue; if (DECOR[d.kind].drawn) await addDrawnItem(d); else decor.push(Object.assign({}, d)); } }
    else decor = defaultDecor();
  } else {
    for (const d of starters()){ try { await addCreature(d); } catch(e){} }
    decor = defaultDecor();
  }
  computeHides(); updatePearls(); updateSoundBtn(); save();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
}
boot();
})();

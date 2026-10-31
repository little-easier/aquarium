/* Little Easier Aquarium: drawing templates, stickers and stamps.
   Templates are drawn on a 900 x 600 page with the front of the creature facing right. */
(function(){
const PI2 = Math.PI*2;

/* ---------- path helpers (each adds sub-paths; the caller begins, fills and strokes) ---------- */
const E = (c, x, y, rx, ry, r) => { r = r || 0; c.moveTo(x + rx*Math.cos(r), y + rx*Math.sin(r)); c.ellipse(x, y, rx, ry, r, 0, PI2); };
const P = (c, p) => { c.moveTo(p[0], p[1]); for (let i=2;i<p.length;i+=2) c.lineTo(p[i], p[i+1]); c.closePath(); };
const S = (c, p) => {
  const n = p.length/2;
  const mid = i => { const j = (i+1)%n; return [(p[2*i]+p[2*j])/2, (p[2*i+1]+p[2*j+1])/2]; };
  let m = mid(n-1); c.moveTo(m[0], m[1]);
  for (let i=0;i<n;i++){ const mm = mid(i); c.quadraticCurveTo(p[2*i], p[2*i+1], mm[0], mm[1]); }
  c.closePath();
};
function ribbon(c, pts, w0, w1){
  const n = pts.length/2, L = [], R = [];
  for (let i=0;i<n;i++){
    const x = pts[2*i], y = pts[2*i+1];
    const a = Math.max(0, i-1), b = Math.min(n-1, i+1);
    const dx = pts[2*b] - pts[2*a], dy = pts[2*b+1] - pts[2*a+1];
    const l = Math.hypot(dx, dy) || 1, nx = -dy/l, ny = dx/l;
    const w = w0 + (w1 - w0)*i/(n-1);
    L.push([x + nx*w, y + ny*w]); R.push([x - nx*w, y - ny*w]);
  }
  c.moveTo(L[0][0], L[0][1]);
  for (let i=1;i<n;i++) c.lineTo(L[i][0], L[i][1]);
  const t = pts.length, ex = pts[t-2], ey = pts[t-1];
  c.quadraticCurveTo(ex + (L[n-1][0]-R[n-1][0])*0 + (pts[t-2]-pts[t-4])*0.6, ey + (pts[t-1]-pts[t-3])*0.6, R[n-1][0], R[n-1][1]);
  for (let i=n-2;i>=0;i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath();
}
function wavePts(x0, y0, x1, y1, amp, waves, steps, ph){
  const out = [];
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
    const off = Math.sin(t*Math.PI*2*waves + (ph||0))*amp*Math.min(1, t*3);
    out.push(x0 + dx*t + (-dy/l)*off, y0 + dy*t + (dx/l)*off);
  }
  return out;
}

/* ---------- templates ---------- */
const TPL = [];
function T(id, name, move, shapes, lines, holes){ TPL.push({id, name, move, shapes, lines, holes: holes || null}); }

function fishBody(c){
  c.moveTo(800, 310);
  c.bezierCurveTo(772, 195, 610, 140, 475, 158);
  c.bezierCurveTo(365, 172, 295, 228, 252, 282);
  c.lineTo(112, 168); c.quadraticCurveTo(192, 318, 112, 468); c.lineTo(252, 342);
  c.bezierCurveTo(300, 402, 382, 452, 492, 456);
  c.bezierCurveTo(642, 460, 782, 420, 800, 310);
  c.closePath();
}
T('fish', 'Fish', 'swim', [
  ['the top fin', c => { c.moveTo(410, 195); c.quadraticCurveTo(455, 58, 610, 66); c.quadraticCurveTo(585, 120, 600, 192); c.closePath(); }],
  ['the bottom fins', c => { c.moveTo(360, 412); c.quadraticCurveTo(330, 520, 250, 525); c.quadraticCurveTo(300, 470, 310, 380); c.closePath();
                             c.moveTo(560, 432); c.quadraticCurveTo(560, 520, 500, 535); c.quadraticCurveTo(505, 480, 482, 438); c.closePath(); }],
  ['the body and tail', fishBody],
], c => {
  c.moveTo(657, 174); c.quadraticCurveTo(612, 305, 664, 446);
  c.moveTo(418, 168); c.quadraticCurveTo(378, 310, 429, 449);
  c.moveTo(585, 330); c.quadraticCurveTo(520, 296, 478, 345); c.quadraticCurveTo(532, 392, 585, 330); c.closePath();
  E(c, 715, 262, 26, 26); E(c, 715, 262, 8, 8);
  c.moveTo(768, 346); c.quadraticCurveTo(786, 352, 797, 333);
});

T('clown', 'Clownfish', 'swim', [
  ['the tail', c => S(c, [275,300, 160,185, 118,215, 168,300, 118,385, 160,415])],
  ['the top fin', c => S(c, [360,205, 420,118, 500,140, 565,105, 650,150, 665,215])],
  ['the bottom fin', c => S(c, [420,385, 445,470, 535,475, 565,385])],
  ['the body', c => E(c, 500, 300, 270, 150)],
], c => {
  c.moveTo(335, 186); c.quadraticCurveTo(318, 300, 335, 414);
  c.moveTo(470, 151); c.quadraticCurveTo(440, 300, 470, 449);
  c.moveTo(530, 151); c.quadraticCurveTo(500, 300, 530, 449);
  c.moveTo(640, 172); c.quadraticCurveTo(612, 300, 640, 428);
  c.moveTo(690, 193); c.quadraticCurveTo(668, 300, 690, 407);
  c.moveTo(585, 330); c.quadraticCurveTo(540, 305, 560, 360);
  E(c, 725, 265, 18, 18); E(c, 725, 265, 7, 7);
  c.moveTo(752, 330); c.quadraticCurveTo(765, 338, 778, 326);
});

const PUFF = []; for (let a=0.55;a<=2.6;a+=0.4){ PUFF.push(a, -a); }
T('puffer', 'Pufferfish', 'float', [
  ['the spikes', c => { for (const a of PUFF){ const b = 0.11;
      c.moveTo(480 + Math.cos(a-b)*175, 300 + Math.sin(a-b)*175); c.lineTo(480 + Math.cos(a)*245, 300 + Math.sin(a)*245); c.lineTo(480 + Math.cos(a+b)*175, 300 + Math.sin(a+b)*175); c.closePath(); } }],
  ['the tail', c => S(c, [305,300, 205,225, 168,250, 215,300, 168,350, 205,375])],
  ['the body', c => E(c, 480, 300, 190, 185)],
], c => {
  E(c, 590, 240, 36, 36); E(c, 598, 244, 15, 15);
  E(c, 648, 325, 11, 10);
  c.moveTo(470, 330); c.quadraticCurveTo(400, 360, 430, 410); c.quadraticCurveTo(470, 385, 470, 330); c.closePath();
  E(c, 400, 250, 9, 9); E(c, 450, 180, 8, 8); E(c, 380, 330, 8, 8); E(c, 540, 400, 9, 9); E(c, 520, 160, 7, 7);
});

T('shark', 'Shark', 'swim', [
  ['the tail', c => { c.moveTo(250, 300); c.quadraticCurveTo(180, 220, 120, 150); c.quadraticCurveTo(150, 250, 170, 300); c.quadraticCurveTo(150, 360, 125, 440); c.quadraticCurveTo(190, 370, 250, 318); c.closePath(); }],
  ['the top fin', c => { c.moveTo(430, 232); c.quadraticCurveTo(470, 150, 540, 85); c.quadraticCurveTo(545, 160, 592, 214); c.closePath(); }],
  ['the side fin', c => { c.moveTo(565, 360); c.quadraticCurveTo(525, 455, 455, 480); c.quadraticCurveTo(500, 420, 505, 365); c.closePath(); }],
  ['the body', c => { c.moveTo(830, 300); c.bezierCurveTo(780, 215, 560, 195, 380, 225); c.bezierCurveTo(300, 240, 240, 270, 215, 292); c.lineTo(215, 318); c.bezierCurveTo(260, 345, 350, 380, 480, 385); c.bezierCurveTo(650, 390, 800, 360, 830, 300); c.closePath(); }],
], c => {
  c.moveTo(216, 312); c.bezierCurveTo(420, 330, 650, 335, 826, 308);
  for (const gx of [640, 665, 690]){ c.moveTo(gx, 262); c.quadraticCurveTo(gx - 10, 290, gx, 318); }
  E(c, 752, 272, 11, 11); E(c, 754, 272, 4, 4);
  c.moveTo(745, 332); c.quadraticCurveTo(780, 342, 806, 322);
});

T('angel', 'Angelfish', 'swim', [
  ['the top fin', c => { c.moveTo(480, 232); c.quadraticCurveTo(430, 40, 260, 30); c.quadraticCurveTo(400, 110, 610, 210); c.closePath(); }],
  ['the bottom fin', c => { c.moveTo(480, 368); c.quadraticCurveTo(430, 560, 260, 570); c.quadraticCurveTo(400, 490, 610, 390); c.closePath(); }],
  ['the tail', c => S(c, [395,300, 250,225, 225,255, 262,300, 225,345, 250,375])],
  ['the body', c => S(c, [790,300, 650,180, 470,210, 350,300, 470,390, 650,420])],
], c => {
  c.moveTo(540, 199); c.quadraticCurveTo(520, 300, 540, 401);
  c.moveTo(660, 204); c.quadraticCurveTo(645, 300, 660, 396);
  c.moveTo(440, 240); c.quadraticCurveTo(425, 300, 440, 360);
  E(c, 720, 278, 16, 16); E(c, 722, 278, 6, 6);
  c.moveTo(770, 306); c.quadraticCurveTo(780, 312, 790, 302);
});

const TAIL = [[515,470,40],[478,515,33],[438,532,27],[404,515,22],[395,482,17],[414,460,12]];
T('seahorse', 'Seahorse', 'float', [
  ['the back fin', c => S(c, [478,300, 400,262, 382,305, 400,350, 474,360])],
  ['the snout', c => { c.moveTo(580, 128); c.lineTo(690, 158); c.quadraticCurveTo(708, 175, 690, 192); c.lineTo(578, 185); c.closePath(); }],
  ['the crown', c => { P(c, [495,140, 500,58, 522,115]); P(c, [530,112, 548,58, 552,118]); }],
  ['the curly tail', c => { for (const [x,y,r] of TAIL) E(c, x, y, r, r); }],
  ['the body', c => S(c, [520,92, 592,118, 604,180, 562,232, 604,305, 590,392, 525,450, 468,420, 450,330, 470,240, 468,160])],
], c => {
  for (const y of [270, 310, 350, 390]){ c.moveTo(490, y); c.quadraticCurveTo(530, y + 12, 572, y); }
  E(c, 560, 148, 14, 14); E(c, 563, 150, 6, 6);
});

T('jelly', 'Jellyfish', 'pulse', [
  ['the wiggly legs', c => { for (const x of [330, 390, 450, 510, 570]) ribbon(c, wavePts(x, 300, x, 570, 16, 1.6, 22, x), 13, 6); }],
  ['the dome', c => { c.moveTo(280, 320); c.bezierCurveTo(280, 50, 620, 50, 620, 320);
      for (let i=0;i<6;i++){ const x0 = 620 - i*(340/6), x1 = x0 - 340/6; c.quadraticCurveTo((x0 + x1)/2, 352, x1, 320); } c.closePath(); }],
], c => {
  E(c, 410, 230, 16, 16); E(c, 490, 230, 16, 16); E(c, 413, 233, 7, 7); E(c, 493, 233, 7, 7);
  c.moveTo(425, 268); c.quadraticCurveTo(450, 292, 475, 268);
  c.moveTo(330, 215); c.quadraticCurveTo(450, 150, 570, 215);
});

T('octopus', 'Octopus', 'pulse', [
  ['the legs', c => { [330, 380, 430, 470, 520, 570].forEach((sx, i) => {
      const spread = (sx - 450)/120*110, pts = [];
      for (let k=0;k<=20;k++){ const t = k/20; pts.push(sx + spread*t + Math.sin(t*Math.PI*2.2 + i)*16, 300 + t*240); }
      ribbon(c, pts, 22, 7); }); }],
  ['the head', c => E(c, 450, 215, 155, 145)],
], c => {
  E(c, 400, 215, 26, 26); E(c, 500, 215, 26, 26); E(c, 404, 219, 11, 11); E(c, 504, 219, 11, 11);
  c.moveTo(420, 282); c.quadraticCurveTo(450, 306, 480, 282);
  E(c, 380, 140, 12, 12); E(c, 520, 130, 10, 10); E(c, 455, 110, 8, 8);
});

T('turtle', 'Turtle', 'swim', [
  ['the flippers', c => { E(c, 615, 420, 85, 34, 0.55); E(c, 335, 410, 62, 28, -0.55); E(c, 600, 185, 78, 32, -0.55); E(c, 345, 195, 58, 26, 0.55); }],
  ['the tail', c => P(c, [250,290, 185,305, 250,322])],
  ['the head', c => E(c, 745, 300, 75, 58)],
  ['the shell', c => E(c, 460, 300, 232, 150)],
], c => {
  E(c, 460, 300, 200, 122);
  const hv = []; for (let k=0;k<6;k++){ const a = k*Math.PI/3 + Math.PI/6; hv.push([460 + Math.cos(a)*64, 300 + Math.sin(a)*52, a]); }
  c.moveTo(hv[0][0], hv[0][1]); for (let k=1;k<6;k++) c.lineTo(hv[k][0], hv[k][1]); c.closePath();
  for (const [x, y, a] of hv){ c.moveTo(x, y); c.lineTo(460 + Math.cos(a)*200, 300 + Math.sin(a)*122); }
  E(c, 770, 285, 10, 10); E(c, 772, 286, 4, 4);
  c.moveTo(780, 318); c.quadraticCurveTo(795, 326, 808, 312);
});

T('whale', 'Whale', 'swim', [
  ['the tail', c => { c.moveTo(250, 268); c.quadraticCurveTo(180, 200, 90, 150); c.quadraticCurveTo(130, 240, 170, 280); c.quadraticCurveTo(130, 330, 90, 420); c.quadraticCurveTo(180, 370, 250, 300); c.closePath(); }],
  ['the flipper', c => { c.moveTo(560, 370); c.quadraticCurveTo(520, 470, 440, 482); c.quadraticCurveTo(500, 420, 515, 368); c.closePath(); }],
  ['the body', c => { c.moveTo(800, 330); c.bezierCurveTo(800, 170, 600, 140, 420, 170); c.bezierCurveTo(300, 190, 230, 240, 205, 268); c.lineTo(205, 300); c.bezierCurveTo(260, 335, 330, 400, 480, 410); c.bezierCurveTo(650, 420, 800, 400, 800, 330); c.closePath(); }],
], c => {
  c.moveTo(799, 335); c.quadraticCurveTo(740, 352, 650, 338);
  c.moveTo(580, 400); c.quadraticCurveTo(690, 378, 790, 372);
  c.moveTo(620, 409); c.quadraticCurveTo(710, 394, 785, 390);
  E(c, 700, 305, 10, 10); E(c, 702, 306, 4, 4);
});

T('crab', 'Crab', 'scuttle', [
  ['the legs', c => { for (const s of [-1, 1]) for (let i=0;i<3;i++){ const bx = 450 + s*(100 + i*35), by = 345 + i*5; ribbon(c, [bx,by, bx + s*90,by + 25, bx + s*125,by + 100], 13, 8); } }],
  ['the arms', c => { ribbon(c, [340,290, 270,240, 240,200], 15, 12); ribbon(c, [560,290, 630,240, 660,200], 15, 12); }],
  ['the eye stalks', c => { ribbon(c, [420,240, 410,190, 405,150], 9, 8); ribbon(c, [480,240, 490,190, 495,150], 9, 8); }],
  ['the claws', c => { E(c, 215, 165, 62, 48, -0.5); E(c, 685, 165, 62, 48, 0.5); }],
  ['the eyes', c => { E(c, 402, 140, 26, 26); E(c, 498, 140, 26, 26); }],
  ['the body', c => E(c, 450, 330, 195, 110)],
], c => {
  E(c, 405, 143, 10, 10); E(c, 495, 143, 10, 10);
  c.moveTo(168, 128); c.lineTo(222, 168); c.lineTo(166, 186);
  c.moveTo(732, 128); c.lineTo(678, 168); c.lineTo(734, 186);
  c.moveTo(415, 345); c.quadraticCurveTo(450, 372, 485, 345);
  E(c, 360, 300, 10, 10); E(c, 540, 300, 10, 10); E(c, 450, 260, 8, 8);
});

T('star', 'Starfish', 'crawl', [
  ['the star', c => { const p = []; for (let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 100 : 245; p.push(450 + Math.cos(a)*r, 320 + Math.sin(a)*r*0.95); } S(c, p); }],
], c => {
  E(c, 420, 300, 18, 18); E(c, 482, 300, 18, 18); E(c, 423, 303, 7, 7); E(c, 485, 303, 7, 7);
  c.moveTo(428, 340); c.quadraticCurveTo(451, 362, 474, 340);
  for (const [x, y] of [[450,190],[600,270],[560,430],[340,430],[300,270],[450,240],[520,370],[380,370]]) E(c, x, y, 9, 9);
});

T('donut', 'Doughnut', 'float', [
  ['the doughnut', c => E(c, 450, 300, 230, 200)],
  ['the icing', c => { for (let i=0;i<=48;i++){ const a = i/48*PI2, r = 1 + Math.sin(i*1.9)*0.06; const x = 450 + Math.cos(a)*195*r, y = 300 + Math.sin(a)*168*r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }],
  ['the hole', c => E(c, 450, 300, 70, 55)],
], c => {
  for (const [x, y, a] of [[330,220,.4],[400,170,-.6],[510,165,.9],[580,230,-.3],[600,330,.6],[540,410,-.8],[430,430,.2],[330,380,-.5],[300,300,1.1],[470,210,.1]]){
    c.moveTo(x - Math.cos(a)*14, y - Math.sin(a)*14); c.lineTo(x + Math.cos(a)*14, y + Math.sin(a)*14);
  }
}, [2]);

T('car', 'Car', 'drive', [
  ['the car', c => { c.moveTo(120, 400); c.lineTo(120, 320); c.quadraticCurveTo(130, 290, 225, 280); c.lineTo(320, 182); c.quadraticCurveTo(350, 160, 500, 160); c.quadraticCurveTo(600, 165, 660, 275); c.quadraticCurveTo(785, 285, 795, 330); c.lineTo(795, 400); c.closePath(); }],
  ['the wheels', c => { E(c, 270, 410, 68, 68); E(c, 640, 410, 68, 68); }],
], c => {
  P(c, [340,275, 380,195, 470,192, 470,275]);
  c.moveTo(500, 275); c.lineTo(500, 192); c.quadraticCurveTo(590, 195, 625, 275); c.closePath();
  c.moveTo(485, 285); c.lineTo(485, 340);
  E(c, 772, 340, 14, 18); E(c, 270, 410, 26, 26); E(c, 640, 410, 26, 26);
  c.moveTo(150, 360); c.lineTo(195, 360);
});

T('ball', 'Football', 'bounce', [
  ['the ball', c => E(c, 450, 300, 215, 215)],
], c => {
  const pv = []; for (let k=0;k<5;k++){ const a = -Math.PI/2 + k*PI2/5; pv.push([450 + Math.cos(a)*62, 300 + Math.sin(a)*62, a]); }
  c.moveTo(pv[0][0], pv[0][1]); for (let k=1;k<5;k++) c.lineTo(pv[k][0], pv[k][1]); c.closePath();
  for (const [x, y, a] of pv){ const ox = 450 + Math.cos(a)*130, oy = 300 + Math.sin(a)*130;
    c.moveTo(x, y); c.lineTo(ox, oy);
    c.moveTo(ox, oy); c.lineTo(450 + Math.cos(a - 0.36)*215, 300 + Math.sin(a - 0.36)*215);
    c.moveTo(ox, oy); c.lineTo(450 + Math.cos(a + 0.36)*215, 300 + Math.sin(a + 0.36)*215); }
});

T('rocket', 'Rocket', 'zoom', [
  ['the fins', c => { P(c, [450,215, 345,105, 270,105, 345,215]); P(c, [450,385, 345,495, 270,495, 345,385]); }],
  ['the engine', c => P(c, [345,250, 275,232, 275,368, 345,350])],
  ['the rocket', c => { c.moveTo(825, 300); c.quadraticCurveTo(765, 205, 605, 200); c.lineTo(335, 200); c.lineTo(335, 400); c.lineTo(605, 400); c.quadraticCurveTo(765, 395, 825, 300); c.closePath(); }],
], c => {
  E(c, 620, 300, 46, 46); E(c, 620, 300, 32, 32);
  c.moveTo(470, 201); c.lineTo(470, 399); c.moveTo(500, 201); c.lineTo(500, 399);
  c.moveTo(740, 228); c.quadraticCurveTo(708, 300, 740, 372);
});

const EYES = {fish:[[715,262,26]], clown:[[725,265,18]], puffer:[[590,240,36]], shark:[[752,272,11]], angel:[[720,278,16]], seahorse:[[560,148,14]],
  jelly:[[410,230,16],[490,230,16]], octopus:[[400,215,26],[500,215,26]], turtle:[[770,285,10]], whale:[[700,305,10]], crab:[[402,140,26],[498,140,26]], star:[[420,300,18],[482,300,18]]};
TPL.forEach(t => { t.eyes = EYES[t.id] || []; });

/* render helpers */
function strokeTemplate(c, t){
  for (const [, fn] of t.shapes){
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); fn(c); c.fill(); c.restore();
    c.beginPath(); fn(c); c.stroke();
  }
  if (t.lines){ c.beginPath(); t.lines(c); c.stroke(); }
}
function silhouette(c, t, col){
  c.fillStyle = col;
  t.shapes.forEach(([, fn], i) => { if (t.holes && t.holes.includes(i)) return; c.beginPath(); fn(c); c.fill(); });
}
function cutHoles(c, t){
  if (!t.holes) return;
  c.save(); c.globalCompositeOperation = 'destination-out';
  for (const i of t.holes){ c.beginPath(); t.shapes[i][1](c); c.fill(); }
  c.restore();
}

/* sample a path into points so the draw-along mode can place numbered dots */
function samplePath(fn){
  const pts = []; let cx = 0, cy = 0, sx = 0, sy = 0, has = false;
  const push = (x, y, jump) => pts.push({x, y, jump: !!jump});
  const R = {
    beginPath(){}, fill(){}, stroke(){},
    moveTo(x, y){ cx = sx = x; cy = sy = y; has = true; push(x, y, true); },
    lineTo(x, y){ if (!has){ this.moveTo(x, y); return; } const n = Math.max(1, Math.ceil(Math.hypot(x - cx, y - cy)/6)); for (let i=1;i<=n;i++) push(cx + (x - cx)*i/n, cy + (y - cy)*i/n); cx = x; cy = y; },
    quadraticCurveTo(qx, qy, x, y){ for (let i=1;i<=24;i++){ const t = i/24, u = 1 - t; push(u*u*cx + 2*u*t*qx + t*t*x, u*u*cy + 2*u*t*qy + t*t*y); } cx = x; cy = y; },
    bezierCurveTo(ax, ay, bx, by, x, y){ for (let i=1;i<=32;i++){ const t = i/32, u = 1 - t; push(u*u*u*cx + 3*u*u*t*ax + 3*u*t*t*bx + t*t*t*x, u*u*u*cy + 3*u*u*t*ay + 3*u*t*t*by + t*t*t*y); } cx = x; cy = y; },
    closePath(){ this.lineTo(sx, sy); },
    ellipse(x, y, rx, ry, rot, a0, a1){ const cr = Math.cos(rot), sr = Math.sin(rot); for (let i=0;i<=48;i++){ const a = a0 + (a1 - a0)*i/48; const ex = Math.cos(a)*rx, ey = Math.sin(a)*ry; const px = x + ex*cr - ey*sr, py = y + ex*sr + ey*cr; if (i === 0){ if (!has) this.moveTo(px, py); else push(px, py); } else push(px, py); cx = px; cy = py; } },
    arc(x, y, r, a0, a1){ this.ellipse(x, y, r, r, 0, a0, a1); },
  };
  fn(R);
  return pts;
}

/* ---------- stickers (drawn around 0,0, roughly 60px across) ---------- */
const INK = '#1d2b30';
function circ(c, x, y, r, fill, stroke, lw){ c.beginPath(); c.arc(x, y, r, 0, PI2); if (fill){ c.fillStyle = fill; c.fill(); } if (stroke){ c.strokeStyle = stroke; c.lineWidth = lw || 4; c.stroke(); } }
function heartPath(c, x, y, s){ c.beginPath(); c.moveTo(x, y + s*0.35); c.bezierCurveTo(x - s*1.1, y - s*0.35, x - s*0.45, y - s*1.05, x, y - s*0.45); c.bezierCurveTo(x + s*0.45, y - s*1.05, x + s*1.1, y - s*0.35, x, y + s*0.35); c.closePath(); }
function starPath(c, x, y, r1, r2, n){ c.beginPath(); for (let i=0;i<n*2;i++){ const a = -Math.PI/2 + i*Math.PI/n, r = i % 2 ? r2 : r1; const px = x + Math.cos(a)*r, py = y + Math.sin(a)*r; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); }
const STICKERS = {
  Eyes: ['eRound','eGoogly','eCute','eStar','eHeart','eSleepy','eWink','eShy'],
  Mouths: ['mSmile','mBig','mTeeth','mTongue','mO','mFangs','mCat','mKiss'],
  Hats: ['hParty','hCrown','hCap','hTop','hBow','hFlower','hBeanie','hPirate'],
  Extras: ['glasses','sunnies','cheek','mustache','heart','star','sparkle','fin'],
};
function drawSticker(c, k){
  c.lineJoin = 'round'; c.lineCap = 'round';
  switch (k){
    case 'eRound': circ(c, 0, 0, 28, '#fff', INK, 4); circ(c, 5, 3, 12, INK); circ(c, 10, -3, 4, '#fff'); break;
    case 'eGoogly': circ(c, 0, 0, 32, '#fff', INK, 4); circ(c, -7, 13, 15, INK); circ(c, -3, 8, 4, '#fff'); break;
    case 'eCute': circ(c, 0, 0, 26, INK); circ(c, 8, -9, 8, '#fff'); circ(c, -8, 9, 4, '#fff'); break;
    case 'eStar': circ(c, 0, 0, 28, '#fff', INK, 4); starPath(c, 2, 2, 16, 7, 5); c.fillStyle = '#ffd60a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); break;
    case 'eHeart': heartPath(c, 0, 6, 30); c.fillStyle = '#ff4d6d'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); circ(c, -10, -8, 5, 'rgba(255,255,255,.8)'); break;
    case 'eSleepy': c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-24, -2); c.quadraticCurveTo(0, 18, 24, -2); c.stroke();
      c.lineWidth = 4; [-14, 0, 14].forEach(x => { c.beginPath(); c.moveTo(x, 8); c.lineTo(x*1.2, 18); c.stroke(); }); break;
    case 'eWink': c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-24, 6); c.quadraticCurveTo(0, -18, 24, 6); c.stroke(); break;
    case 'eShy': circ(c, 0, 0, 24, '#fff', INK, 4); circ(c, 0, 8, 10, INK); c.fillStyle = 'rgba(255,120,150,.55)'; c.beginPath(); c.ellipse(0, 34, 22, 9, 0, 0, PI2); c.fill(); break;
    case 'mSmile': c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(-30, -6); c.quadraticCurveTo(0, 30, 30, -6); c.stroke(); break;
    case 'mBig': c.save(); c.beginPath(); c.moveTo(-32, -10); c.quadraticCurveTo(0, 46, 32, -10); c.closePath(); c.fillStyle = '#5a1a24'; c.fill(); c.clip();
      c.fillStyle = '#ff7b93'; c.beginPath(); c.ellipse(0, 22, 18, 11, 0, 0, PI2); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-32, -10); c.quadraticCurveTo(0, 46, 32, -10); c.closePath(); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); break;
    case 'mTeeth': c.beginPath(); c.moveTo(-32, -8); c.quadraticCurveTo(0, 40, 32, -8); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(-28, 4); c.quadraticCurveTo(0, 12, 28, 4); c.stroke(); [-12, 0, 12].forEach(x => { c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 14); c.stroke(); }); break;
    case 'mTongue': c.fillStyle = '#ff7b93'; c.beginPath(); c.moveTo(-10, 4); c.lineTo(-10, 18); c.quadraticCurveTo(0, 32, 10, 18); c.lineTo(10, 4); c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.lineWidth = 7; c.beginPath(); c.moveTo(-30, -6); c.quadraticCurveTo(0, 22, 30, -6); c.stroke(); break;
    case 'mO': circ(c, 0, 0, 14, '#5a1a24', INK, 5); break;
    case 'mFangs': c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; [-12, 12].forEach(x => { c.beginPath(); c.moveTo(x - 6, 4); c.lineTo(x, 18); c.lineTo(x + 6, 4); c.closePath(); c.fill(); c.stroke(); });
      c.lineWidth = 7; c.beginPath(); c.moveTo(-30, -6); c.quadraticCurveTo(0, 20, 30, -6); c.stroke(); break;
    case 'mCat': c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-28, -4); c.quadraticCurveTo(-14, 16, 0, -2); c.quadraticCurveTo(14, 16, 28, -4); c.stroke(); break;
    case 'mKiss': heartPath(c, 0, 6, 18); c.fillStyle = '#ff4d6d'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); break;
    case 'hParty': c.save(); c.beginPath(); c.moveTo(-30, 22); c.lineTo(30, 22); c.lineTo(0, -58); c.closePath(); c.fillStyle = '#4cc9f0'; c.fill(); c.clip();
      c.strokeStyle = '#ffd166'; c.lineWidth = 9; for (let i=-3;i<4;i++){ c.beginPath(); c.moveTo(-40, 20 + i*20); c.lineTo(40, i*20 - 10); c.stroke(); } c.restore();
      c.beginPath(); c.moveTo(-30, 22); c.lineTo(30, 22); c.lineTo(0, -58); c.closePath(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); circ(c, 0, -60, 10, '#ff70a6', INK, 3); break;
    case 'hCrown': c.beginPath(); c.moveTo(-38, 20); c.lineTo(-38, -22); c.lineTo(-19, 0); c.lineTo(0, -32); c.lineTo(19, 0); c.lineTo(38, -22); c.lineTo(38, 20); c.closePath(); c.fillStyle = '#ffd166'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      circ(c, 0, 8, 6, '#e63946', INK, 2); circ(c, -22, 9, 5, '#3a86ff', INK, 2); circ(c, 22, 9, 5, '#8ac926', INK, 2); break;
    case 'hCap': c.beginPath(); c.moveTo(-34, 12); c.quadraticCurveTo(-34, -40, 0, -40); c.quadraticCurveTo(34, -40, 34, 12); c.closePath(); c.fillStyle = '#3a86ff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.beginPath(); c.ellipse(40, 10, 30, 8, 0, 0, PI2); c.fillStyle = '#2b6fd6'; c.fill(); c.stroke(); circ(c, 0, -40, 6, '#ffd166', INK, 2); break;
    case 'hTop': c.fillStyle = '#26292e'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(-26, -62, 52, 64); c.strokeRect(-26, -62, 52, 64); c.fillStyle = '#e63946'; c.fillRect(-26, -16, 52, 11);
      c.fillStyle = '#26292e'; c.beginPath(); c.ellipse(0, 4, 44, 9, 0, 0, PI2); c.fill(); c.stroke(); break;
    case 'hBow': c.fillStyle = '#ff70a6'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(-36, -22); c.lineTo(-36, 22); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(36, -22); c.lineTo(36, 22); c.closePath(); c.fill(); c.stroke(); circ(c, 0, 0, 9, '#ff4d8d', INK, 3); break;
    case 'hFlower': for (let i=0;i<5;i++){ const a = i*PI2/5; circ(c, Math.cos(a)*18, Math.sin(a)*18, 13, '#fff', INK, 3); } circ(c, 0, 0, 11, '#ffd166', INK, 3); break;
    case 'hBeanie': c.save(); c.beginPath(); c.moveTo(-34, 14); c.quadraticCurveTo(-34, -40, 0, -40); c.quadraticCurveTo(34, -40, 34, 14); c.closePath(); c.fillStyle = '#e63946'; c.fill(); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-40, -22, 80, 9); c.fillRect(-40, -4, 80, 9); c.restore(); c.beginPath(); c.moveTo(-34, 14); c.quadraticCurveTo(-34, -40, 0, -40); c.quadraticCurveTo(34, -40, 34, 14); c.closePath(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#ffd6dc'; c.fillRect(-38, 8, 76, 14); c.strokeRect(-38, 8, 76, 14); circ(c, 0, -44, 11, '#fff', INK, 3); break;
    case 'hPirate': c.beginPath(); c.moveTo(-44, 10); c.quadraticCurveTo(-30, -36, 0, -40); c.quadraticCurveTo(30, -36, 44, 10); c.quadraticCurveTo(0, -4, -44, 10); c.closePath(); c.fillStyle = '#26292e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#fff'; circ(c, 0, -16, 7, '#fff'); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-9, -4); c.lineTo(9, -10); c.moveTo(9, -4); c.lineTo(-9, -10); c.stroke(); break;
    case 'glasses': c.strokeStyle = INK; c.lineWidth = 5; circ(c, -20, 0, 16, 'rgba(255,255,255,.3)', INK, 5); circ(c, 20, 0, 16, 'rgba(255,255,255,.3)', INK, 5); c.beginPath(); c.moveTo(-4, -2); c.quadraticCurveTo(0, -6, 4, -2); c.stroke(); break;
    case 'sunnies': c.fillStyle = '#26292e'; c.strokeStyle = INK; c.lineWidth = 3; [-21, 21].forEach(x => { c.beginPath(); c.moveTo(x - 17, -10); c.lineTo(x + 17, -10); c.quadraticCurveTo(x + 17, 14, x, 14); c.quadraticCurveTo(x - 17, 14, x - 17, -10); c.closePath(); c.fill(); c.stroke(); });
      c.lineWidth = 4; c.beginPath(); c.moveTo(-4, -8); c.lineTo(4, -8); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-32, -6, 6, 4); c.fillRect(10, -6, 6, 4); break;
    case 'cheek': c.fillStyle = 'rgba(255,110,140,.6)'; c.beginPath(); c.ellipse(0, 0, 22, 13, 0, 0, PI2); c.fill(); break;
    case 'mustache': c.fillStyle = INK; c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(-10, -16, -30, -12, -36, 2); c.bezierCurveTo(-30, -2, -26, 6, -16, 6); c.bezierCurveTo(-8, 6, -2, 2, 0, -2);
      c.bezierCurveTo(2, 2, 8, 6, 16, 6); c.bezierCurveTo(26, 6, 30, -2, 36, 2); c.bezierCurveTo(30, -12, 10, -16, 0, -4); c.fill(); break;
    case 'heart': heartPath(c, 0, 8, 30); c.fillStyle = '#ff4d6d'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); break;
    case 'star': starPath(c, 0, 0, 30, 13, 5); c.fillStyle = '#ffd166'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); break;
    case 'sparkle': starPath(c, 0, 0, 30, 7, 4); c.fillStyle = '#fff5b8'; c.fill(); c.strokeStyle = '#e8b900'; c.lineWidth = 3; c.stroke(); break;
    case 'fin': c.beginPath(); c.moveTo(-26, 16); c.quadraticCurveTo(-10, -34, 30, -30); c.quadraticCurveTo(10, -6, 20, 18); c.closePath(); c.fillStyle = '#ffb703'; c.fill(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 10); c.lineTo(10, -20); c.moveTo(4, 14); c.lineTo(18, -16); c.stroke(); break;
  }
}

/* ---------- pattern stamps ---------- */
const STAMPS = ['dots','stars','hearts','scales','flowers','sparkles'];
function drawStamp(c, kind, x, y, size, color){
  c.save(); c.fillStyle = color; c.strokeStyle = color;
  switch (kind){
    case 'dots': c.beginPath(); c.arc(x, y, size*0.5, 0, PI2); c.fill(); break;
    case 'stars': starPath(c, x, y, size*0.65, size*0.28, 5); c.fill(); break;
    case 'hearts': heartPath(c, x, y + size*0.15, size*0.6); c.fill(); break;
    case 'scales': c.lineWidth = Math.max(3, size*0.16); c.lineCap = 'round'; c.beginPath(); c.arc(x, y, size*0.55, 0.15, Math.PI - 0.15); c.stroke(); break;
    case 'flowers': for (let i=0;i<5;i++){ const a = i*PI2/5; c.beginPath(); c.arc(x + Math.cos(a)*size*0.35, y + Math.sin(a)*size*0.35, size*0.25, 0, PI2); c.fill(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, size*0.18, 0, PI2); c.fill(); break;
    case 'sparkles': starPath(c, x, y, size*0.7, size*0.16, 4); c.fill(); break;
  }
  c.restore();
}

window.AQ = {TPL, E, P, S, ribbon, strokeTemplate, silhouette, cutHoles, samplePath, STICKERS, drawSticker, STAMPS, drawStamp, starPath, heartPath};
})();

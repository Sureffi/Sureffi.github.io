/* chrome.js — the sprites and the weathers. one file, every page loads it.
   sprites: a ware as a drawn object. three bands, ink rim, dithered to the palette, one pixel = 3.
   weather: a low-res canvas behind the page. each ware has its own. */
import * as THREE from 'three';

export const PAL = ['#04070b','#6e9299','#9cbcc2','#d9eef0','#6fe3d6','#9aa6ff','#2aa9a8','#1a2630'];
const ACC = 0x6fe3d6, ACC2 = 0x9aa6ff, RAIN = 0x2aa9a8;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── sprites ──────────────────────────────────────────────────────
// the object is lit in three bands and drawn at a third of its size. the post pass quantizes to the palette with a
// 4×4 bayer, draws a one-pixel rim off the silhouette, and — on a plate — a stippled reflection under the floor line,
// the boot (static resolving into the object) and the one scan a hover earns.
// every piece has one lit element (userData.lit — it flashes when the piece is chosen) and one slow idle motion.
const ramp = new THREE.DataTexture(new Uint8Array([40,40,40,255, 130,130,130,255, 255,255,255,255]), 3, 1);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const toon = c => new THREE.MeshToonMaterial({ color:c, gradientMap:ramp });
const flat = c => new THREE.MeshBasicMaterial({ color:c });
const lathe = (pts, c, seg=16) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y]) => new THREE.Vector2(r,y)), seg), toon(c));
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? toon(m) : m);
const at = (o, x=0, y=0, z=0) => { o.position.set(x, y, z); return o; };
const UP = new THREE.Vector3(0,1,0);
// a rounded rectangle, and an outline pushed out into a bevelled slab centred on z
function rrect(w, h, r){
  const s = new THREE.Shape(), x = -w/2, y = -h/2;
  s.moveTo(x+r, y); s.lineTo(x+w-r, y); s.quadraticCurveTo(x+w, y, x+w, y+r); s.lineTo(x+w, y+h-r); s.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  s.lineTo(x+r, y+h); s.quadraticCurveTo(x, y+h, x, y+h-r); s.lineTo(x, y+r); s.quadraticCurveTo(x, y, x+r, y); return s;
}
function slab(shape, d, c, bev=.03){
  const g = new THREE.ExtrudeGeometry(shape, { depth:d, bevelEnabled:bev > 0, bevelThickness:bev, bevelSize:bev, bevelSegments:1, curveSegments:4 });
  g.translate(0, 0, -d/2); return new THREE.Mesh(g, typeof c === 'number' ? toon(c) : c);
}
// the category objects move as a set: same sway, same tilt, same period
const sway = (g, yaw) => t => { g.rotation.y = yaw + Math.sin(t*.4)*.35; g.rotation.x = .22; };

export const PIECES = {
  // a capped ballpoint: cap with a clip, a periwinkle band, a long dark barrel, a grip, the lit nib. it turns on its axis.
  pen(){
    const g = new THREE.Group(), p = new THREE.Group(); g.add(p);
    const nib = lathe([[0,-1.64],[.05,-1.56],[.1,-1.36],[.12,-1.24]], 0, 12); nib.material = flat(ACC); p.add(nib);
    p.add(lathe([[.12,-1.24],[.135,-1.18],[.135,-.62],[.125,-.56]], 0x6e9299));                     // grip
    p.add(lathe([[.125,-.56],[.135,-.5],[.14,.42],[.14,.46]], 0x1a2630));                           // barrel
    const band = lathe([[.14,.46],[.155,.48],[.155,.56],[.14,.58]], 0); band.material = flat(ACC2); p.add(band);
    p.add(lathe([[.15,.58],[.16,.62],[.16,1.28],[.12,1.36],[.06,1.4],[0,1.41]], 0x9cbcc2));         // cap
    p.add(at(box(.07,.8,.06, 0xd9eef0), 0,.93,.21), at(box(.07,.07,.07, 0xd9eef0), 0,1.3,.18));   // clip
    p.scale.set(1.45,1.05,1.45); g.rotation.set(.18, 0, .98); g.userData.lit = [nib];
    g.userData.idle = t => { p.rotation.y = t*.35; };
    return g;
  },
  // a patch lead: two plugs and the cable between, hanging in a loose curve, a ferrite bead near the head.
  // the led on the near plug says it's live.
  cable(){
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-1.05,.35,0), new THREE.Vector3(-.9,-.3,.15), new THREE.Vector3(-.3,-.62,0), new THREE.Vector3(.35,-.42,-.15), new THREE.Vector3(.75,.05,0), new THREE.Vector3(.95,.5,0) ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .08, 6, false), toon(0x1a2630)));
    const bead = at(new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.3,10), toon(0x6e9299)), ...curve.getPoint(.8).toArray());
    bead.quaternion.setFromUnitVectors(UP, curve.getTangent(.8)); g.add(bead);
    let led;
    const plug = (t, big) => {
      const k = new THREE.Group(), dir = curve.getTangent(t); if (!t) dir.negate();
      k.add(lathe([[.075,0],[.1,.06],[.1,.1],[.115,.12],[.115,.16],[.13,.18],[.13,.22],[.15,.24],[.15,.3]], 0x6e9299, 10));  // strain relief
      k.add(at(box(.4,.52,.24, 0x9cbcc2), 0,.55), at(box(.42,.05,.26, 0x1a2630), 0,.8), at(box(.28,.26,.09, 0xd9eef0), 0,.95));
      for (const i of [-1,1]) k.add(at(box(.05,.14,.1, flat(ACC2)), i*.07,.98));
      if (big){ led = at(box(.12,.12,.02, flat(ACC)), .08,.47,.125); k.add(led); }
      k.scale.setScalar(big ? 1.3 : 1.1); k.position.copy(curve.getPoint(t)); k.quaternion.setFromUnitVectors(UP, dir); g.add(k);
    };
    plug(1, true); plug(0, false);
    g.rotation.x = .12; g.userData.lit = [led];
    g.userData.idle = t => { g.rotation.y = Math.sin(t*.35)*.55 - .15; led.material.color.set(t % 2.4 < 2.2 ? ACC : RAIN); };
    return g;
  },
  // the handheld: a rounded slab, the screen with a prompt on it, d-pad and stick left, four buttons and stick right,
  // two shoulders. the cursor is the lit thing.
  deck(){
    const g = new THREE.Group();
    g.scale.setScalar(1.06);
    g.add(slab(rrect(2.5,1.2,.24), .24, 0x6e9299, .04));                                               // shell: front at z .16
    g.add(at(slab(rrect(1.26,.96,.08), .02, 0x1a2630, 0), 0,.06,.17));                                // bezel
    g.add(at(box(1.08,.78,.01, flat(0x04070b)), 0,.06,.185));                                         // the glass
    const lines = [[.62,.3],[.44,.16],[.7,.02],[.3,-.12]];
    for (const [w,y] of lines) g.add(at(box(w,.05,.01, flat(RAIN)), -.46+w/2, y, .195));
    const cur = at(box(.08,.1,.01, flat(ACC)), -.4, -.26, .195); g.add(cur);
    g.add(at(box(.13,.05,.01, flat(RAIN)), -.46+.065, -.26, .195));                                   // the prompt
    const dpad = at(new THREE.Group(), -.9,.18,.17); dpad.add(box(.36,.12,.06, 0x1a2630), box(.12,.36,.06, 0x1a2630)); g.add(dpad);
    [[.9,.32],[1.04,.18],[.76,.18],[.9,.04]].forEach(([x,y],i) => { const b = at(new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.06,8), i===1 ? flat(ACC2) : toon(0x1a2630)), x,y,.17); b.rotation.x = Math.PI/2; g.add(b); });
    for (const x of [-.9,.9]){ const st = at(new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.06,10), toon(0x1a2630)), x,-.3,.17); st.rotation.x = Math.PI/2; g.add(st);
      g.add(at(box(.5,.1,.2, 0x9cbcc2), x,.62,-.02)); }                                               // stick, shoulder
    g.userData.lit = [cur];
    g.userData.idle = t => { g.rotation.y = Math.sin(t*.3)*.5; g.rotation.x = .25; cur.visible = (t*1.6 | 0) % 2 === 0; };
    return g;
  },
  // the attention rig: a pylon on three legs, a dish on a yoke sweeping the sky, the feed at its focus lit.
  mast(){
    const g = new THREE.Group();
    g.add(lathe([[.52,-1.3],[.52,-1.22],[.36,-1.18],[0,-1.18]], 0x1a2630, 12));                      // foot
    for (let i=0;i<3;i++){ const a = i/3*Math.PI*2 + .5, leg = box(.08,1.15,.08, 0x6e9299);
      leg.position.set(Math.sin(a)*.26, -.66, Math.cos(a)*.26); leg.rotation.set(Math.cos(a)*-.42, 0, Math.sin(a)*.42); g.add(leg); }
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.07,.12,1.3,6), toon(0x9cbcc2)), 0,-.5));     // pylon
    const head = at(new THREE.Group(), 0,.2); g.add(head);
    head.add(at(box(.36,.14,.22, 0x1a2630), 0,.02), at(box(.06,.36,.06, 0x6e9299), 0,.2));          // yoke
    const dish = at(new THREE.Group(), 0,.36); dish.rotation.x = Math.PI/2 - .85; head.add(dish);
    const bowl = lathe([[0,0],[.22,.03],[.44,.1],[.62,.2],[.72,.28]], 0x9cbcc2, 18); bowl.material.side = THREE.DoubleSide; dish.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.72,.035,4,24), toon(0xd9eef0)); rim.rotation.x = Math.PI/2; rim.position.y = .28; dish.add(rim);
    dish.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.62,5), toon(0xd9eef0)), 0,.31));
    const feed = at(box(.14,.14,.14, flat(ACC)), 0,.64); dish.add(feed);
    g.scale.setScalar(.95); g.userData.lit = [feed];
    g.userData.idle = t => { head.rotation.y = .95 + Math.sin(t*.45)*.55; g.rotation.x = .12; };             // seen three-quarter, sweeping
    return g;
  },
  // the menu: a pad with two sticks, a d-pad, four buttons; over it the mod menu — a banner, rows, the lit selection.
  pad(){
    const g = new THREE.Group(), o = new THREE.Shape();
    o.moveTo(0,.4); o.bezierCurveTo(.4,.42,.8,.52,.98,.32); o.bezierCurveTo(1.16,.1,1.16,-.5,1.0,-.7); o.bezierCurveTo(.88,-.84,.64,-.8,.55,-.6); o.bezierCurveTo(.46,-.42,.3,-.32,0,-.32);
    o.bezierCurveTo(-.3,-.32,-.46,-.42,-.55,-.6); o.bezierCurveTo(-.64,-.8,-.88,-.84,-1.0,-.7); o.bezierCurveTo(-1.16,-.5,-1.16,.1,-.98,.32); o.bezierCurveTo(-.8,.52,-.4,.42,0,.4);
    const pad = at(new THREE.Group(), 0,-.55); g.add(pad);
    pad.add(slab(o, .3, 0x1a2630, .06));                                                             // front at z .21
    const dpad = at(new THREE.Group(), -.62,.1,.22); dpad.add(box(.32,.1,.05, 0x9cbcc2), box(.1,.32,.05, 0x9cbcc2)); pad.add(dpad);
    [[.62,.23],[.75,.1],[.49,.1],[.62,-.03]].forEach(([x,y],i) => { const b = at(new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,8), i===1 ? flat(ACC2) : toon(0x9cbcc2)), x,y,.22); b.rotation.x = Math.PI/2; pad.add(b); });
    for (const x of [-.3,.3]){ const st = at(new THREE.Mesh(new THREE.CylinderGeometry(.12,.1,.1,10), toon(0x6e9299)), x,-.16,.24); st.rotation.x = Math.PI/2; pad.add(st); }
    const card = at(new THREE.Group(), 0,.78,-.1); card.rotation.x = -.08; g.add(card);
    card.add(box(1.06,1.02,.03, flat(0x04070b)), at(box(1.14,1.1,.02, 0x6e9299), 0,0,-.02));
    card.add(at(box(.98,.2,.01, flat(ACC2)), 0,.37,.02));                                           // the banner
    for (let i=0;i<5;i++) card.add(at(box(.72 - (i%2)*.16,.05,.01, flat(RAIN)), -.1 - (i%2)*.08, .17-i*.14, .02));
    const sel = at(box(.98,.12,.01, flat(ACC)), 0,.17,.025); card.add(sel);
    g.scale.setScalar(.86); g.userData.lit = [sel];
    g.userData.idle = t => { g.rotation.y = Math.sin(t*.3)*.45; g.rotation.x = .3; sel.position.y = .17 - ((t*1.2 | 0) % 5)*.14; };
    return g;
  },
  // the rooms, as a set: one light body, one mid part, one lit mark, the same size and the same sway.
  // a crate: the wares. a lid rail and a foot rail, the lit label between.
  crate(){
    const g = new THREE.Group(), k = new THREE.Group(); g.add(k);
    k.add(box(1.4,.84,.9, 0x9cbcc2), at(box(1.5,.2,1.0, 0x6e9299), 0,.46), at(box(1.5,.14,1.0, 0x6e9299), 0,-.45));
    const label = at(box(.62,.26,.02, flat(ACC)), 0,.0,.46); k.add(label);
    k.scale.setScalar(1.45); g.userData.lit = [label]; g.userData.idle = sway(g, .5);
    return g;
  },
  // a page: writing. a sheet with a turned corner, four lines, one lit.
  page(){
    const g = new THREE.Group(), k = new THREE.Group(), s = new THREE.Shape(), w = .6, h = .8, f = .32; g.add(k);
    s.moveTo(-w,-h); s.lineTo(w,-h); s.lineTo(w,h-f); s.lineTo(w-f,h); s.lineTo(-w,h); s.lineTo(-w,-h);
    k.add(slab(s, .05, 0x9cbcc2, 0));
    const fold = new THREE.Shape(); fold.moveTo(w-f,h); fold.lineTo(w-f,h-f); fold.lineTo(w,h-f); fold.lineTo(w-f,h);
    k.add(at(slab(fold, .02, 0x6e9299, 0), 0,0,.04));
    let lit;
    for (let i=0;i<4;i++){ const ln = at(box(i===3 ? .5 : .84,.1,.01, flat(i===1 ? ACC : 0x6e9299)), -w+.14+(i===3 ? .25 : .42), .3-i*.3, .035); k.add(ln); if (i===1) lit = ln; }
    k.scale.setScalar(1.45); g.userData.lit = [lit]; g.userData.idle = sway(g, -.2);
    return g;
  },
  // an envelope: contact. the flap closed on the front, a lit seal where it meets.
  env(){
    const g = new THREE.Group(), k = new THREE.Group(), w = .84, h = .56; g.add(k);
    k.add(slab(rrect(2*w, 2*h, .04), .08, 0x9cbcc2, 0));
    const flap = new THREE.Shape(); flap.moveTo(-w,h); flap.lineTo(w,h); flap.lineTo(0,-.1); flap.lineTo(-w,h);
    k.add(at(slab(flap, .02, 0x6e9299, 0), 0,0,.05));
    const seal = at(new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.04,10), flat(ACC)), 0,-.08,.08); seal.rotation.x = Math.PI/2; k.add(seal);
    k.scale.setScalar(1.45); g.userData.lit = [seal]; g.userData.idle = sway(g, -.2);
    return g;
  },
};
const SCALE = 3;
const DITHER = `precision highp float; varying vec2 v; uniform sampler2D tex; uniform vec2 res; uniform vec3 pal[${PAL.length}];
  uniform float floorY, boot, scan, time;
  const mat4 B = mat4(0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.)/16.;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  vec3 near(vec3 c){ float best = 9.; vec3 o = pal[0]; for (int i=1;i<${PAL.length};i++){ float e = distance(c, pal[i]); if (e < best){ best = e; o = pal[i]; } } return o; }
  vec4 at(vec2 q){ return texture2D(tex, q); }
  void main(){
    vec2 px = floor(v*res), d = 1./res; ivec2 p = ivec2(mod(px, 4.)); float b = B[p.x][p.y];
    vec4 o = vec4(0.); vec4 s = at(v);
    bool above = v.y >= floorY;
    if (above && s.a > .5){
      vec3 c = pow(s.rgb, vec3(1./2.2));
      if (scan > 0. && v.y > scan && v.y < scan + .075) c += .12;                        // the band the scan just crossed
      c += (b - .5) * .16; o = vec4(near(c), 1.);
      if (scan > 0. && abs(v.y - scan) < .5*d.y) o = vec4(pal[3], 1.);
    } else if (above){
      float n = at(v+vec2(d.x,0.)).a + at(v-vec2(d.x,0.)).a + at(v+vec2(0.,d.y)).a + at(v-vec2(0.,d.y)).a;
      if (n > .5) o = vec4(pal[6], 1.);                                                  // the rim
      else if (scan > 0. && abs(v.y - scan) < .5*d.y) o = vec4(pal[6], .3 * (1. - pow(abs(v.x - .5) * 2., 3.)));  // the scan across the empty bay
    } else if (floorY > 0.){
      float k = (floorY - v.y) / floorY;                                                 // 0 at the floor, 1 at the bottom
      vec4 r = at(vec2(v.x, floorY + (floorY - v.y) * 1.15));
      if (r.a > .5 && b > .28 + k*.9) o = vec4(near(pow(r.rgb, vec3(1./2.2)) * .5), 1.);  // stippled, falling off
      if (o.rgb == pal[0]) o = vec4(0.);
    }
    if (boot < 1. && o.a > 0.){                                                          // static resolving into the object
      float h = hash(px);
      if (h > boot){ float r = hash(px + floor(time*24.)); o = r < .35 ? vec4(0.) : vec4(r < .6 ? pal[6] : r < .8 ? pal[7] : r < .93 ? pal[1] : pal[5], 1.); }
    }
    gl_FragColor = o; }`;

// one renderer for every sprite on the page. each frame the visible ones are drawn at their render size into a sheet
// on one offscreen canvas (scene → its target → the dither pass into its cell), then each cell is copied 1:1 into the
// sprite's own 2d canvas; css scales that up by a whole number, pixelated.
// render size is the canvas's css width / 3. a canvas with data-lo drops to that size while its .item/.cat isn't .on
// (css shows it at half size then, so the pixel stays 3). becoming .on runs one scan down it and flashes its lit element.
const R = { gl:null, cv:null, W:512, H:0, list:[], run:false, clock:new THREE.Clock() };
// the two ways a sprite is seen: on the xmb (a thing in a list) and in a bay (on a plate, a floor under it). a flight
// is seen part-way between them. [camera x y z, looking at x y z]
const CAM = { item:[0,.45,6.6, 0,.15,0], plate:[0,.6,7, 0,-.05,0] };
let quad, ortho, postScene;
function shared(){
  if (R.gl) return R.gl;
  R.cv = document.createElement('canvas');
  R.gl = new THREE.WebGLRenderer({ canvas:R.cv, antialias:false, alpha:true, premultipliedAlpha:false, preserveDrawingBuffer:true });
  R.gl.setPixelRatio(1); R.gl.autoClear = false;
  postScene = new THREE.Scene(); quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2)); postScene.add(quad);
  ortho = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  return R.gl;
}
// point a camera from a blend of the two views: 0 is the xmb's, 1 the bay's
const V0 = new THREE.Vector3(), V1 = new THREE.Vector3();
function aim(camera, m){
  const a = CAM.item, b = CAM.plate, l = i => a[i] + (b[i] - a[i])*m;
  camera.position.set(l(0), l(1), l(2)); camera.lookAt(V0.set(l(3), l(4), l(5)));
}
// one sprite: its scene, its own render target and dither pass. hi is the render size: css width / 3.
function make(cv, onPlate, hi, lo){
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50); aim(camera, onPlate ? 1 : 0);
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-2,3,4); scene.add(sun);
  const back = new THREE.DirectionalLight(parseInt(cv.dataset.hue || '9aa6ff', 16), 1.1); back.position.set(3,-1,-3); scene.add(back);
  const piece = PIECES[cv.dataset.piece](); scene.add(piece);
  piece.userData.idle(0); const b = new THREE.Box3().setFromObject(piece, true); piece.userData.lift = Math.min(-.8 - b.min.y, 1.5 - b.max.y);  // on a plate: the same gap off the floor, clear of the top
  const rt = new THREE.WebGLRenderTarget(hi, hi, { minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter });
  const U = { tex:{ value:rt.texture }, res:{ value:new THREE.Vector2(hi,hi) }, pal:{ value:PAL.map(c=>new THREE.Color().setHex(parseInt(c.slice(1),16), THREE.LinearSRGBColorSpace)) },
    floorY:{ value: onPlate ? .25 : 0 }, boot:{ value:1 }, scan:{ value:-1 }, time:{ value:0 } };
  const post = new THREE.ShaderMaterial({ transparent:true, uniforms:U,
    vertexShader:`varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }`, fragmentShader:DITHER });
  const lit = (piece.userData.lit || []).map(m => [m.material.color, m.material.color.getHex()]);
  const s = { cv, ctx:cv.getContext('2d'), scene, camera, piece, rt, post, U, onPlate, hi, lo, lit, rw:0, on:null, chosen:0, hot:false };
  cv._sprite = s; R.list.push(s);
  if (!R.run){ R.run = true; requestAnimationFrame(frame); }
  return s;
}
export function mountSprites(){
  shared();
  return [...document.querySelectorAll('.sprite')].filter(cv => !cv._sprite).map(cv => {
    const hi = Math.max(8, Math.floor(cv.clientWidth/SCALE));
    return make(cv, !!cv.closest('.bay'), hi, +cv.dataset.lo || hi);
  });
}
function dispose(s){
  s.piece.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  s.rt.dispose(); s.post.dispose(); s.cv._sprite = null;
}
function visible(s, inApp){
  if (s.fly) return true;                                                                  // a flight is always on screen
  if (inApp && !s.cv.closest('.app')) return false;                                        // an app covers home
  const col = s.cv.closest('.col'); if (col && !col.parentElement.classList.contains('on')) return false;  // a column not shown
  const r = s.cv.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
}
function frame(){
  R.list = R.list.filter(s => s.cv.isConnected || dispose(s));
  if (!R.list.length){ R.run = false; return; }
  requestAnimationFrame(frame);
  const gl = R.gl, t = still ? 2 : R.clock.getElapsedTime(), now = performance.now(), inApp = document.documentElement.classList.contains('in-app');
  // lay out the sheet: the visible sprites, left to right in rows
  const due = []; let x = 0, y = 0, row = 0;
  for (const s of R.list){
    if (s.fly) place(s, now);
    else if (s.onPlate){ const w = Math.floor(s.cv.clientWidth/SCALE); if (w >= 8) s.hi = s.lo = w; }   // a bay's size can change with the viewport
    const holder = s.lo !== s.hi && s.cv.closest('.item,.cat'), on = !holder || holder.classList.contains('on');
    if (s.on === false && on && !still) s.chosen = now;
    s.on = on;
    const rw = on ? s.hi : s.lo;
    if (!visible(s, inApp) || (still && rw === s.rw)) continue;
    if (rw !== s.rw){ s.rw = rw; s.cv.width = s.cv.height = rw; s.rt.setSize(rw, rw); s.U.res.value.set(rw, rw); }
    if (x + rw > R.W){ x = 0; y += row; row = 0; }
    s.x = x; s.y = y; x += rw; row = Math.max(row, rw); due.push(s);
  }
  if (!due.length) return;
  const need = y + row; if (need > R.H){ R.H = Math.ceil(need/64)*64; gl.setSize(R.W, R.H, false); }
  gl.setRenderTarget(null); gl.setViewport(0, 0, R.W, R.H); gl.setClearColor(0, 0); gl.clear();
  for (const s of due){
    if (s.hot){ for (const [c, hex] of s.lit) c.setHex(hex); s.hot = false; }
    s.piece.userData.idle(t);
    if (s.onPlate) s.piece.position.y = (s.piece.userData.lift || 0) + Math.sin(t*.9)*.035;             // it floats; the reflection breathes with it
    if (s.fly){ aim(s.camera, s.fly.m); s.piece.position.y = s.fly.m * (s.piece.userData.lift + Math.sin(t*.9)*.035); }
    if (s.chosen){                                                                                       // chosen: one scan, top to bottom, 180ms
      const k = (now - s.chosen) / 180;
      if (k >= 1){ s.chosen = 0; s.U.scan.value = -1; }
      else { s.U.scan.value = (1-k)*(1-k); if (k < .34){ for (const [c] of s.lit) c.setHex(0xffffff); s.hot = true; } }
    }
    s.U.time.value = t;
    gl.setRenderTarget(s.rt); gl.setClearColor(0x04070b, 0); gl.clear(); gl.render(s.scene, s.camera);
    gl.setRenderTarget(null); gl.setViewport(s.x, R.H - s.y - s.rw, s.rw, s.rw); quad.material = s.post; gl.render(postScene, ortho);
  }
  for (const s of due){ s.ctx.clearRect(0, 0, s.rw, s.rw); s.ctx.drawImage(R.cv, s.x, s.y, s.rw, s.rw, 0, 0, s.rw, s.rw); }
  // a flight that reached its place hands over here, after both were drawn from the same clock: the same frame paints
  // the resting sprite shown and the flight gone
  for (const s of due) if (s.fly && s.fly.k >= 1) land(s);
}

// ── the flight ───────────────────────────────────────────────────
// one sprite carried between two resting places: a thing on the xmb and a ware's bay. while it moves, a fixed canvas
// is the sprite: the same piece on the same clock, so at either end it is exactly what rests there. every frame it's
// drawn at a whole render size (one pixel = 3 all the way), its view and lift blended from the xmb's to the bay's, its
// box measured off where it's going, so a target that moves is followed. the floor and its reflection belong to the
// bay; they come with the landing. it hides where it's from and where it's going; landing gives both back.
function spot(cv){
  const r = cv.getBoundingClientRect();
  return { x:r.left, y:r.top, cx:r.left + r.width/2, cy:r.top + r.height/2, rw:Math.max(8, Math.round(r.width/SCALE)), m:cv.closest('.bay') ? 1 : 0 };
}
const ease = k => 1 - Math.pow(1-k, 3);
function place(s, now){
  const f = s.fly; if (!f.to){ f.k = 0; return; }
  const b = spot(f.to), k = f.k = f.ms ? Math.min(1, (now - f.t0)/f.ms) : 1, e = ease(k), a = f.a;
  const rw = Math.round(a.rw + (b.rw - a.rw)*e), px = rw*SCALE;
  f.cx = a.cx + (b.cx - a.cx)*e; f.cy = a.cy + (b.cy - a.cy)*e; f.rw = rw; f.m = a.m + (b.m - a.m)*e;
  const x = k < 1 ? Math.round(f.cx - px/2) : b.x, y = k < 1 ? Math.round(f.cy - px/2) : b.y;       // whole pixels in the air, the exact box on landing
  const st = s.cv.style; st.left = x + 'px'; st.top = y + 'px'; st.width = st.height = px + 'px';
  s.hi = s.lo = rw;
}
function land(s){
  const f = s.fly; for (const c of f.held) c.style.visibility = '';
  s.cv.remove(); s.fly = null; const done = f.done; f.done = null; if (done) done();
}
// carry(from, host): a flight starting exactly where `from` rests, living in `host`. .to(target, ms, done) sends it —
// again mid-air, it turns from wherever it is. .end() lands it now: everything given back, done called.
export function carry(from, host){
  shared();
  const cv = document.createElement('canvas'); cv.className = 'flight';
  cv.dataset.piece = from.dataset.piece; cv.dataset.hue = from.dataset.hue;
  cv.style.cssText = 'position:fixed;margin:0;z-index:8;image-rendering:pixelated;pointer-events:none';
  const a = spot(from), s = make(cv, false, a.rw, a.rw);
  s.fly = { a, cx:a.cx, cy:a.cy, rw:a.rw, m:a.m, k:0, to:null, t0:0, ms:0, done:null, held:new Set([from]) };
  const px = a.rw*SCALE; Object.assign(cv.style, { left:a.x+'px', top:a.y+'px', width:px+'px', height:px+'px' });
  host.appendChild(cv); from.style.visibility = 'hidden';
  return {
    to(target, ms, done){
      const f = s.fly; if (!f) return;
      if (f.to) f.a = { cx:f.cx, cy:f.cy, rw:f.rw, m:f.m };
      f.to = target; f.held.add(target); target.style.visibility = 'hidden';
      f.t0 = performance.now(); f.ms = still ? 0 : ms; f.done = done;
    },
    end(){ if (s.fly) land(s); },
    get flying(){ return !!s.fly; },
  };
}


// the plate: boots once a session (the name decodes, the object resolves out of static), a hover earns one scan,
// and the object sits a few pixels off the weather, against the pointer.
const NOISE = '░▒▓█▚▞▙▟▛▜╬╪╫≡§Ø¤×#%&@';
export function decode(el, delay, per){
  const text = el.textContent; el.style.visibility = 'visible';
  const res = document.createElement('span'), hot = document.createElement('span'), raw = document.createElement('span');
  hot.className = 'hot'; raw.className = 'raw'; el.textContent = ''; el.append(res, hot, raw);
  const t0 = performance.now() + delay, ng = () => NOISE[(Math.random()*NOISE.length)|0];
  (function step(){
    const k = Math.max(0, Math.min(text.length, ((performance.now()-t0)/per)|0));
    if (k >= text.length){ el.textContent = text; return; }
    res.textContent = text.slice(0,k); let h = '', r = '';
    for (let i=k;i<Math.min(text.length,k+2);i++) h += text[i] === ' ' ? ' ' : ng();
    for (let i=k+2;i<text.length;i++) r += text[i] === ' ' ? ' ' : ng();
    hot.textContent = h; raw.textContent = r; requestAnimationFrame(step);
  })();
}
const tween = (ms, f, done) => { const t0 = performance.now(); (function step(){ const k = Math.min(1, (performance.now()-t0)/ms); f(k); if (k < 1) requestAnimationFrame(step); else if (done) done(); })(); };
// the drift is one loop for every bay on the page; it stops when the last one is gone
const drifting = new Set(); let tx = 0, ty = 0, dx = 0, dy = 0, drift = false, heard = false;
function driftOn(cv){
  drifting.add(cv); if (drift || still) return; drift = true;
  if (!heard){ heard = true; addEventListener('pointermove', e => { tx = (e.clientX/innerWidth - .5) * -6; ty = (e.clientY/innerHeight - .5) * -4; }, { passive:true }); }
  (function step(){ dx += (tx-dx)*.06; dy += (ty-dy)*.06; const tr = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`;
    for (const c of drifting) if (c.isConnected) c.style.transform = tr; else drifting.delete(c);
    if (drifting.size) requestAnimationFrame(step); else drift = false; })();
}
// mountPlate(root, { boot }): the plates under root not yet mounted. boot:false when the sprite arrived by flight — it's
// the same sprite, it doesn't resolve out of static again; whoever carried it draws the plate in.
export function mountPlate(scope = document, { boot = true } = {}){
  const plates = [...scope.querySelectorAll('.plate')].filter(p => !p._plate); if (!plates.length) return;
  const root = document.documentElement, booting = boot && root.classList.contains('cwboot');
  if (root.classList.contains('cwboot')){ try { sessionStorage.setItem('cw:plate', '1'); } catch(e){} root.classList.remove('cwboot'); }
  plates.forEach(plate => {
    plate._plate = true;
    const cv = plate.querySelector('.bay .sprite'), s = cv && cv._sprite; if (!s) return;
    // each plate boots the first time it comes into view
    let booted = !booting;
    const boot = () => { if (booted) return; booted = true;
      s.U.boot.value = 0;
      tween(620, k => { s.U.boot.value = 1 - Math.pow(1-k, 2); }, () => { s.U.boot.value = 1; });
      decode(plate.querySelector('h1'), 80, 60);
      for (const el of plate.querySelectorAll('.kind,.spec')){ el.style.opacity = 0; el.style.visibility = 'visible';
        setTimeout(() => tween(360, k => { el.style.opacity = Math.ceil(k*4)/4; }, () => el.style.opacity = ''), 420); } };
    if (!booted){ if ('IntersectionObserver' in window){ const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ boot(); io.disconnect(); } }, { threshold:.3 }); io.observe(plate); } else boot(); }
    if (still) return;
    let scanning = false;
    plate.addEventListener('pointerenter', () => {
      if (scanning || s.U.boot.value < 1) return; scanning = true;
      tween(560, k => { s.U.scan.value = 1 - k*(1 - .25); }, () => { s.U.scan.value = -1; setTimeout(() => scanning = false, 400); });
    });
    driftOn(cv);
  });
}

// ── weathers ─────────────────────────────────────────────────────
// each is (ctx, W, H, rnd) → { step(now, dt) } drawing into a cleared low-res 2d canvas.
export const WEATHER = {
  // the floor: spent packets, sparse, twinkling. the wall's ground, without the wall.
  dust(ctx, W, H){
    const N = 160, x = new Float32Array(N), y = new Float32Array(N), p = new Float32Array(N), a = new Float32Array(N);
    for (let i=0;i<N;i++){ x[i] = Math.random()*W; y[i] = Math.random()*H; p[i] = Math.random()*6.28; a[i] = .15 + Math.random()*.6; }
    return { step(now, dt){
      const t = now/1000;
      for (let i=0;i<N;i++){
        if (!still) x[i] += Math.sin(p[i])*.004*dt; if (x[i] < 0) x[i] += W; if (x[i] >= W) x[i] -= W;
        const v = a[i] * (.55 + .45*Math.sin(t*.9 + p[i]));
        ctx.fillStyle = v > .5 ? `rgba(111,227,214,${v})` : `rgba(42,169,168,${v})`;
        ctx.fillRect(x[i]|0, y[i]|0, 1, 1);
      } } };
  },
  // home: night, a city far off on the horizon, its lights in the wet floor, and lights going by. the passes come from
  // the sound when there is one, so what you hear cross is what you see cross; with no sound they come on their own.
  night(ctx, W, H){
    const y0 = Math.round(H * .66), N = 140;
    const lx = new Float32Array(N), ly = new Int16Array(N), la = new Float32Array(N), lp = new Float32Array(N), lw = new Uint8Array(N);
    for (let i=0;i<N;i++){ lx[i] = Math.random()*W; ly[i] = y0 - (Math.random()*Math.random()*7|0); la[i] = .25 + Math.random()*.7; lp[i] = Math.random()*6.28; lw[i] = Math.random() < .2 ? 2 : 1; }
    const passes = []; let driven = 0, own = 0;
    // one buffer, written straight, blitted once: the palette's two teals, the brighter one past .42
    const img = ctx.createImageData(W, H), px = img.data;
    function dot(x, y, v){
      if (x < 0 || x >= W || y < 0 || y >= H || v <= 0) return;
      const i = (y*W + x) * 4, a = Math.min(255, v*255) | 0, hi = v > .42;
      const r = hi ? 111 : 42, g = hi ? 227 : 169, bl = hi ? 214 : 168;
      if (a > px[i+3]){ px[i] = r; px[i+1] = g; px[i+2] = bl; px[i+3] = a; }
    }
    function reflect(x, w, v, now){                      // the floor gives it back, broken, every other row, swaying
      const depth = 6 + (v * 30) | 0;
      for (let d = 1; d < depth; d += 2){
        const sway = Math.sin(now/900 + d*.7 + x*.05) * (d*.12), rx = (x + sway) | 0, rv = v * (1 - d/depth) * .6;
        for (let k = 0; k < w; k++) dot(rx + k, y0 + d, rv);
      }
    }
    return {
      pass(dir = 1, len = 2){ passes.push({ x: dir > 0 ? -60 : W + 60, dir, y: y0 - 1 - (Math.random()*4|0), n: 24 + Math.random()*50|0, sp: (W + 120) / (len*1000), b: .45 + Math.random()*.5 }); driven = performance.now(); },
      step(now, dt){
        px.fill(0);
        const t = now/1000;
        for (let i=0;i<N;i++){
          const v = la[i] * (.7 + .3*Math.sin(t*1.7 + lp[i])) * (Math.sin(t*.13 + lp[i]*3) > -.92 ? 1 : .2), x = lx[i] | 0;
          for (let k = 0; k < lw[i]; k++) dot(x + k, ly[i], v);
          if (v > .3 && (i % 3)) reflect(lx[i], lw[i], v * .7, now);
        }
        for (let x = 0; x < W; x++) dot(x, y0, .14);                                        // the shore
        for (let d = 2; d < 14; d += 2) for (let x = (d/2)&1; x < W; x += 2) dot(x, y0 + d, .05 * (1 - d/14));   // haze on the water
        if (!driven || now - driven > 14000){ if (now > own){ this.pass(Math.random() < .5 ? 1 : -1, 1.5 + Math.random()*2); driven = 0; own = now + 2500 + Math.random()*7000; } }
        for (let k = passes.length-1; k >= 0; k--){
          const p = passes[k]; p.x += p.dir * p.sp * dt * 16.7;
          for (let j = 0; j < p.n; j++){ const f = 1 - j/p.n; dot((p.x - p.dir*j)|0, p.y, p.b * f * f); }   // the head bright, the tail thinning to nothing
          reflect(p.x - p.dir*4, 6, p.b * .8, now);
          if (p.x < -80 || p.x > W + 80) passes.splice(k, 1);
        }
        ctx.putImageData(img, 0, 0);
      } };
  },
  // the second room: a slow ribbon, the way the psp's never stopped. three bands, out of phase, dithered by the palette.
  wave(ctx, W, H){
    const bands = [[.55, .012, 1.0, '42,169,168', .22], [.62, .017, .7, '154,166,255', .14], [.5, .009, 1.3, '111,227,214', .10]];
    return { step(now){
      const t = now/1000;
      for (const [y0, k, sp, col, a] of bands){
        ctx.fillStyle = `rgba(${col},${a})`;
        for (let x=0;x<W;x++){
          const y = H*y0 + Math.sin(x*k + t*sp*.6)*H*.08 + Math.sin(x*k*2.3 - t*sp*.4)*H*.03;
          const h = 10 + Math.sin(x*k*.7 + t*.3)*6;
          ctx.fillRect(x, y|0, 1, h|0);
        }
      } } };
  },
  // the shop: the wall's rain, one room over.
  rain(ctx, W, H){
    const N = 70, x = new Float32Array(N), y = new Float32Array(N), v = new Float32Array(N), len = new Uint8Array(N), b = new Float32Array(N);
    const seed = (i, top) => { x[i] = (Math.random()*W)|0; y[i] = top ? -Math.random()*40 : Math.random()*H; v[i] = .25+Math.random()*.9; len[i] = 6+Math.random()*26; b[i] = .25+Math.random()*.75; };
    for (let i=0;i<N;i++) seed(i,false);
    return { step(now, dt){
      for (let i=0;i<N;i++){
        if (!still) y[i] += v[i]*dt;
        if (y[i]-len[i] > H) seed(i,true);
        const L = len[i];
        for (let k=0;k<L;k++){ const yy = (y[i]-k)|0; if (yy<0||yy>=H) continue;
          ctx.fillStyle = `rgba(42,169,168,${Math.min(1, b[i]*(1-k/L)*(k?1:1.6)*.5)})`; ctx.fillRect(x[i], yy, 1, 1); }
      } } };
  },
  // drawer: ink. graphs lay themselves down in the dark — a node, an edge to the next, a few more, then they fade.
  ink(ctx, W, H){
    const graphs = [];
    function spawn(){
      const n = 3 + (Math.random()*5)|0, nodes = [], edges = [];
      const cx = Math.random()*W, cy = Math.random()*H, spread = 18 + Math.random()*30;
      for (let i=0;i<n;i++) nodes.push({ x: cx + (Math.random()-.5)*spread*2, y: cy + (i/n - .5)*spread*2 + (Math.random()-.5)*8, w: 5 + (Math.random()*10)|0 });
      for (let i=1;i<n;i++) edges.push([ (Math.random()*i)|0, i ]);
      graphs.push({ nodes, edges, born: performance.now(), life: 9000 + Math.random()*8000, hue: Math.random() < .3 ? '111,227,214' : '154,166,255' });
    }
    for (let i=0;i<9;i++){ spawn(); graphs[i].born -= Math.random()*8000; }
    return { step(now){
      if (graphs.length < 14 && Math.random() < .03) spawn();
      for (let g = graphs.length-1; g>=0; g--){
        const G = graphs[g], age = now - G.born, t = age / G.life;
        if (t > 1){ graphs.splice(g,1); continue; }
        const draw = Math.min(1, age / 2600);                 // it draws in over 2.6s
        const fade = t < .8 ? 1 : 1 - (t-.8)/.2;
        const per = 1 / (G.nodes.length + G.edges.length);
        let k = 0;
        for (const [a,b] of G.edges){ k++; const p = Math.min(1, Math.max(0, (draw - k*per) / per));
          if (p <= 0) continue;
          const A = G.nodes[a], B = G.nodes[b];
          ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${G.hue},${.28*fade})`; ctx.beginPath(); ctx.moveTo(A.x|0, A.y|0); ctx.lineTo((A.x+(B.x-A.x)*p)|0, (A.y+(B.y-A.y)*p)|0); ctx.stroke(); }
        for (const n of G.nodes){ k++; const p = Math.min(1, Math.max(0, (draw - k*per) / per));
          if (p <= 0) continue;
          ctx.strokeStyle = `rgba(${G.hue},${.5*fade})`; ctx.strokeRect((n.x - n.w/2)+.5|0, (n.y-2)+.5|0, (n.w*p)|0, 4); }
      } } };
  },
  // cience: the attention rig's sky. a beam sweeps from a dish below the left edge, the way the mast's does; what it
  // crosses answers and fades, and the few that matter throw a spike up. one buffer, written straight, like night.
  sweep(ctx, W, H){
    const N = 240, px0 = W*.1, py0 = H*1.15;
    const x = new Int16Array(N), y = new Int16Array(N), ang = new Float32Array(N), e = new Float32Array(N), hot = new Uint8Array(N);
    for (let i=0;i<N;i++){ x[i] = Math.random()*W|0; y[i] = Math.random()*H*.92|0; ang[i] = Math.atan2(y[i] - py0, x[i] - px0); hot[i] = Math.random() < .1 ? 1 : 0; }
    const img = ctx.createImageData(W, H), px = img.data;
    function dot(X, Y, v, c){
      if (X < 0 || X >= W || Y < 0 || Y >= H || v <= 0) return;
      const i = (Y*W + X) * 4, a = Math.min(255, v*255) | 0;
      if (a <= px[i+3]) return;
      if (c) { px[i] = 154; px[i+1] = 166; px[i+2] = 255; } else if (v > .42){ px[i] = 111; px[i+1] = 227; px[i+2] = 214; } else { px[i] = 42; px[i+1] = 169; px[i+2] = 168; }
      px[i+3] = a;
    }
    const beam = t => -.93 + Math.sin(t*.45)*.75;
    let last = beam(performance.now()/1000);
    return { step(now, dt){
      px.fill(0);
      const th = beam(now/1000), lo = Math.min(last, th) - .004, hi = Math.max(last, th) + .004, fall = Math.pow(.975, dt);
      last = th;
      const cx = Math.cos(th), cy = Math.sin(th);                                          // the beam: every other step, faint
      for (let r = 8; r < W*1.4; r += 2) dot((px0 + cx*r)|0, (py0 + cy*r)|0, .07, 0);
      for (let i=0;i<N;i++){
        if (ang[i] > lo && ang[i] < hi) e[i] = 1; else e[i] *= fall;
        dot(x[i], y[i], .08 + e[i]*.8, 0);
        if (hot[i] && e[i] > .05){ const L = (e[i]*10)|0; for (let k=1;k<=L;k++) dot(x[i], y[i]-k, e[i]*(1 - k/(L+1))*.7, 1); }   // a spike, up
      }
      ctx.putImageData(img, 0, 0);
    } };
  },
  // agentSDK: the wire. lines of stream-json going by, left to right, the way the binary talks.
  wire(ctx, W, H){
    const ROWS = Math.max(6, (H/8)|0), rows = [];
    const words = ['{"type":"assistant"','"content":[','{"type":"text"','"tool_use"','"id":"toolu_01','"input":{','"result":','"session_id":"','"stop_reason":','"usage":{','"model":"claude','"role":"user"','"is_error":false','"parent_tool_use_id":null','}]}','"name":"Bash"','"permission":"allow"'];
    for (let r=0;r<ROWS;r++) rows.push({ y: 6 + r*8, x: Math.random()*W*2 - W, v: .15 + Math.random()*.5, text: '', bright: Math.random() < .12 });
    const fill = row => { let s = ''; while (s.length < 160) s += words[(Math.random()*words.length)|0] + ' '; row.text = s; };
    rows.forEach(fill);
    return { step(now, dt){
      ctx.font = '5px monospace';
      for (const r of rows){
        if (!still) r.x += r.v*dt;
        const w = r.text.length*3;
        if (r.x > W){ r.x = -w - Math.random()*W; fill(r); r.bright = Math.random() < .12; }
        ctx.fillStyle = r.bright ? 'rgba(111,227,214,.32)' : 'rgba(42,169,168,.14)';
        ctx.fillText(r.text, r.x|0, r.y);
        if (r.bright && Math.random() < .02){ ctx.fillStyle = 'rgba(154,166,255,.6)'; ctx.fillRect((r.x + Math.random()*w)|0, r.y-4, 2, 5); }
      } } };
  },
};
const RES = { rain:240, ink:360, wire:640, wave:320, dust:400, night:480, sweep:400 };
export function mountWeather(name, cv = document.getElementById('weather'), { alpha = false } = {}){
  if (!cv) return;
  const ctx = cv.getContext('2d', { alpha });
  const W = RES[name] || 240; let H = 135, sim = null;
  function size(){ H = Math.round(W * innerHeight / innerWidth); cv.width = W; cv.height = H; sim = WEATHER[name](ctx, W, H); if (still) paint(performance.now()); }
  function paint(now, dt = 1){ if (alpha) ctx.clearRect(0,0,W,H); else { ctx.fillStyle = '#04070b'; ctx.fillRect(0,0,W,H); } sim.step(now, dt); }
  addEventListener('resize', size); size();
  let last = performance.now();
  (function frame(now){
    const dt = Math.min(3, (now-last)/16.7); last = now;
    paint(now, dt);
    if (still) return;
    if (cv.isConnected) requestAnimationFrame(frame); else removeEventListener('resize', size);   // taken down: stop, and stop listening
  })(last);
  return { pass: (...a) => sim.pass && sim.pass(...a) };
}

/* console.js — home is the xmb, launched off the wall's floor. apps open fullscreen; esc is home. */
import { mountSprites, mountPlate, mountWeather, decode, carry } from './chrome.js';
import { S } from './sound.js';

// each ware has its own weather: drawer's graphs lay themselves down (ink); the sdk's wire is stream-json going by; the
// attention rig's dish sweeps a sky (sweep); the deck gets the handheld's ribbon (wave); the first chrome gets the
// wall's own rain — it was always like this.
const WORLD = [
  { id:'wares', piece:'crate', name:'wares', app:'wares', items:[
    { piece:'pen', hue:'9aa6ff', name:'drawer', sub:'cortex · render mod', kind:'cortex · render mod', one:'A ```dot fence in a Claude Code reply becomes a drawing. In place, while the reply is still streaming.', facts:{ 'when':'2026', 'stack':'go', 'runs on':'Claude Code', 'state':'v0.3.0 · MIT' }, at:'drawer', weather:'ink' },
    { piece:'cable', hue:'6fe3d6', name:'agentSDK.NET', sub:'nervous · neural link', kind:'nervous · neural link', one:'The Claude Agent SDK for .NET. Drives the claude binary over stream-json. No API key.', facts:{ 'when':'2026', 'stack':'c# · net10.0', 'runs on':'the claude binary', 'state':'1.0.0 · MIT' }, at:'agentsdk', weather:'wire' },
    { piece:'mast', hue:'6fe3d6', name:'CienceTerminal', sub:'sensory · attention rig', kind:'sensory · attention rig', one:'Real-time crypto attention terminal. Ran in production, 2025. Walked away over values. Would again.', facts:{ 'when':'2025', 'stack':'.NET 8 · React 19 · AWS', 'runs on':'AWS', 'state':'retired' }, at:'cience', weather:'sweep' },
    { piece:'deck', hue:'9aa6ff', name:'muOS cyberdeck', sub:'handheld · cyberdeck', kind:'handheld · cyberdeck', one:'A hacking terminal for the Anbernic RG35XX-H. 26 tool modules, five more behind the Konami code. Gamepad only.', facts:{ 'when':'2026', 'stack':'python · pygame', 'runs on':'RG35XX-H · muOS', 'state':'—' }, at:'deck', weather:'wave' },
    { piece:'pad', hue:'9aa6ff', name:'Motion & Curse', sub:'legacy · first chrome', kind:'legacy · first chrome', one:'Two GTA V mod menus in Lua. Motion at 14. Curse at 16. It was always like this.', facts:{ 'when':'2018–20', 'stack':'lua', 'runs on':'GTA V · FiveM', 'state':'archived' }, at:'motion', weather:'rain' } ]},
  { id:'writing', piece:'page', name:'writing', app:'writing', items:[
    { glyph:'¶', name:'On context economics', sub:'in agentic sessions', kind:'writing', one:'How to write an instruction file — in the pipe.', at:'context' } ]},
  { id:'contact', piece:'env', name:'contact', app:'contact', items:[
    { glyph:'x', name:'x.com/Sureffi', sub:'the feed', kind:'contact', one:'Where the posting happens.', href:'https://x.com/Sureffi' },
    { glyph:'⌥', name:'github', sub:'Sureffi', kind:'contact', one:'The repos.', href:'https://github.com/Sureffi' },
    { glyph:'@', name:'sureffi@proton.me', sub:'mail', kind:'contact', one:'It gets read.', href:'mailto:sureffi@proton.me' } ]},
];

const ANCHOR_X = .34, ITEM_H = 96;
const home = document.getElementById('home'), bar = document.getElementById('bar'), side = document.getElementById('side');
let ci = 0, ii = WORLD.map(() => 0), restT, app = null;
const night = mountWeather('night', home.querySelector('.weather'), { alpha:true });
S.onPass = (dir, len) => night && night.pass(dir, len);

WORLD.forEach((c, x) => {
  const el = document.createElement('div'); el.className = 'cat'; el.innerHTML = `<span class="g"><canvas class="sprite" data-piece="${c.piece}" data-hue="6fe3d6" data-lo="16"></canvas></span>${c.name}`;
  const col = document.createElement('div'); col.className = 'col';
  c.items.forEach((it, y) => {
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<span class="ic">${it.piece ? `<canvas class="sprite" data-piece="${it.piece}" data-hue="${it.hue}" data-lo="32"></canvas>` : it.glyph}</span><span class="t">${it.name}<small>${it.sub}</small></span>`;
    d.onclick = e => { e.stopPropagation(); if (!live()) return; if (ci===x && ii[x]===y) launch(); else { ci = x; ii[x] = y; render(); S.tick(); } };
    col.appendChild(d); it.el = d;
  });
  el.appendChild(col); el.onclick = () => { if (live() && ci !== x){ ci = x; render(); S.tick(); } };
  bar.appendChild(el); c.el = el; c.col = col;
});

// every piece of home has one resting place per (ci, ii); render only moves the targets and the transitions carry
// it there. a transition retargets from wherever it is, so a press mid-move lands without a jump.
function render(){
  const bx = (innerWidth*ANCHOR_X - WORLD[ci].el.offsetLeft)|0; bar.style.transform = `translateX(${bx}px)`;
  WORLD.forEach((c, x) => {
    c.el.classList.toggle('on', x===ci); c.el.classList.toggle('l', x < ci);      // columns wait off to the side they're on
    c.col.style.transform = `translateY(${(-ii[x]*ITEM_H)|0}px)`;
    c.items.forEach((it, y) => { it.el.classList.toggle('on', x===ci && y===ii[x]); it.el.classList.toggle('above', y < ii[x]); it.el.classList.toggle('below', y > ii[x]); });
  });
  side.classList.remove('on'); clearTimeout(restT); restT = setTimeout(showSide, 220);
  const it = WORLD[ci].items[ii[ci]]; if (side.parentNode !== it.el) it.el.appendChild(side);
  if (!app && state === 'home') history.replaceState(null, '', '#'+WORLD[ci].id+'/'+ii[ci]);
}
// a render that lands at once: first paint, resize
function snap(){ home.classList.add('snap'); render(); void home.offsetWidth; home.classList.remove('snap'); }
// one step; a step past the edge is nothing, not a re-render
function move(dx, dy){
  const x = Math.max(0, Math.min(WORLD.length-1, ci + dx)), y = Math.max(0, Math.min(WORLD[x].items.length-1, ii[x] + dy));
  if (x === ci && y === ii[x]) return;
  ci = x; ii[x] = y; render(); S.tick();
}
// the side plate: the chosen thing, inspected. its top edge sits on the top of the sprite's frame; it stands clear of
// the column's widest name, so it doesn't move while you walk a column. where it lives comes from the thing's own page.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const shown = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
function where(c, y, it){
  if (it.href) return it.href.startsWith('mailto:') ? null : shown(it.href);
  const t = document.getElementById('app-'+c.app).content;
  const a = c.app === 'wares' ? t.querySelector('#'+it.at+' .spec .wx a') : t.querySelectorAll('.row a')[y];
  return a ? shown(a.getAttribute('href')) : null;
}
function showSide(){
  const c = WORLD[ci], y = ii[ci], it = c.items[y], at = where(c, y, it);
  const facts = it.facts ? `<dl>${Object.entries(it.facts).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '';
  const live = at && at.toLowerCase() !== it.name.toLowerCase() ? `<p class="at">${at}</p>` : '<p class="at"></p>';
  side.innerHTML = `<i class="cm"></i><p class="kind">${it.kind}</p><h1>${it.name.toUpperCase()}</h1><p class="one">${it.one}</p>` +
    `<div class="band">${facts}<div class="foot">${live}<span class="key"><b>enter</b>${it.href ? 'go' : 'open'}</span></div></div>`;
  // clear of the column's widest name, 48px on; never past the viewport's right gutter
  const right = Math.max(...c.items.map(i => { const t = i.el.querySelector('.t'); return t.offsetLeft + t.offsetWidth; }));
  side.style.left = right + 48 + 'px';
  // measured from where the bar is going, not where its transition is; too narrow to say it cleanly, it isn't shown
  const room = innerWidth - ((innerWidth*ANCHOR_X)|0) + 52 - right - 48 - 48;
  side.style.width = Math.min(512, room) + 'px'; side.classList.toggle('tight', room < 352);
  if (!still) decode(side.querySelector('h1'), 40, Math.max(10, 180/it.name.length)|0);
  side.classList.add('on');
}
// ── apps ──
// an app is a bg that comes over home, a top bar, a texture, and a layer: one screen over its own weather. the app
// element itself is never faded, so a sprite in flight inside it stays solid while the black comes up around it.
const APPS = {
  // one ware per screen: the sprite in its bay on one side, the plate on the other, the long body under the fold
  wares: { title:'wares', build(at){
    const p = document.getElementById('app-wares').content.getElementById(at).cloneNode(true);
    const head = document.createElement('div'); head.className = 'head';
    head.append(p.querySelector('.cm'), p.querySelector('.text'), p.querySelector('.spec'));
    const bay = p.querySelector('.bay'); p.querySelector('.body').remove(); p.prepend(bay, head);
    if (p.querySelector('.more')) p.insertAdjacentHTML('beforeend', '<p class="fold"><b>↓</b> more</p>');
    return p; } },
  writing: { weather:'ink', title:'writing', build(){ return document.getElementById('app-writing').content.cloneNode(true); } },
  contact: { weather:'wire', title:'contact', build(){ return document.getElementById('app-contact').content.cloneNode(true); } },
};
let fl = null;                                                           // the sprite in the air, while one is
function layer(name, it){
  const L = document.createElement('div'); L.className = 'layer';
  L.innerHTML = '<canvas class="weather"></canvas><div class="screen"></div>';
  L.querySelector('.screen').appendChild(APPS[name].build(it.at));
  return L;
}
// a layer is up: its weather runs, its sprite mounts. a ware's weather is its own; other apps have one each.
function raise(name, it, L, boot){
  mountWeather(name === 'wares' ? it.weather : APPS[name].weather, L.querySelector('.weather'));
  mountSprites(); mountPlate(L, { boot });
}
function label(){
  if (app.name !== 'wares') return;
  const it = WORLD[ci].items[ii[ci]];
  app.el.querySelector('.crumb').textContent = ` / ${it.name}`;
  app.el.querySelector('.n').textContent = `${ii[ci]+1} / ${WORLD[ci].items.length}`;
}
const named = L => { const h = L.querySelector('.plate h1'); if (h && !still) decode(h, 40, Math.max(10, 180/h.textContent.length)|0); };
function launch(){
  const c = WORLD[ci], it = c.items[ii[ci]];
  if (it.href){ location.href = it.href; return; }
  openApp(c.app, it.el.querySelector('.sprite')); S.enter();
}
// from: the xmb sprite you entered on. with one, the sprite is carried from there into the bay and the plate draws in
// around it once it lands; without (a hash, reduced motion) the app is simply there.
function openApp(name, from){
  if (app) closeApp(true);
  const A = APPS[name]; if (!A) return;
  const it = WORLD[ci].items[ii[ci]], wares = name === 'wares';
  const el = document.createElement('div'); el.className = `app app-${name}${wares ? '' : ' app-plain'}`;
  const step = wares ? '<a class="prev">[ ← ]</a> <span class="n"></span> <a class="next">[ → ]</a> ' : '';
  el.innerHTML = `<div class="bg"></div><div class="top"><span><b>cyberware.sh</b> / ${A.title}<span class="crumb"></span></span><span>${step}<a class="esc">[ esc ]</a></span></div><div class="texture"></div>`;
  const L = layer(name, it); el.insertBefore(L, el.querySelector('.top'));
  el.querySelector('.esc').onclick = () => closeApp();
  if (wares){ el.querySelector('.prev').onclick = () => stepApp(-1); el.querySelector('.next').onclick = () => stepApp(1); }
  document.body.appendChild(el); app = { name, el, layer:L }; label();
  const bay = wares && L.querySelector('.bay .sprite'), fly = !!(bay && from && !still);
  raise(name, it, L, !fly);
  if (fly){
    el.classList.add('flying'); L.classList.add('fresh');
    fl = carry(from, el); fl.to(bay, 200, () => { fl = null; el.classList.remove('flying'); named(L); });
  }
  requestAnimationFrame(() => el.classList.add('on'));
  document.documentElement.classList.add('in-app'); S.hold(true); S.room(wares ? it.at : name);
  history.replaceState(null, '', '#'+WORLD[ci].id+'/'+ii[ci]+'/'+name);
}
// the next ware, in place, one move: the screen you were on leaves toward the side you came from, the next comes in
// from the side you're going, the weathers cross. a step mid-move takes the arriving screen from wherever it got to.
// the xmb underneath moves with it, so esc lands on the same thing.
const SLIDE = 64, OUT = { duration:150, easing:'cubic-bezier(0,0,.2,1)', fill:'forwards' }, IN = { duration:200, easing:'cubic-bezier(0,0,.2,1)' };
function stepApp(d){
  if (!app || app.name !== 'wares' || fl) return;
  const y = ii[ci] + d; if (y < 0 || y >= WORLD[ci].items.length) return;
  ii[ci] = y; render();
  const it = WORLD[ci].items[y], old = app.layer, L = layer('wares', it);
  app.el.insertBefore(L, app.el.querySelector('.top')); app.layer = L; label();
  raise('wares', it, L, false); slide(old, L, d); named(L);
  S.room(it.at); S.tick();
  history.replaceState(null, '', '#'+WORLD[ci].id+'/'+y+'/wares');
}
function slide(old, L, d){
  old.classList.add('gone');
  if (still){ old.remove(); return; }
  const scr = old.querySelector('.screen'), wx = old.querySelector('.weather');
  const at = e => { const cs = getComputedStyle(e); return { translate: cs.translate === 'none' ? '0px 0px' : cs.translate, opacity: cs.opacity }; };
  const s0 = at(scr), w0 = at(wx).opacity;
  for (const e of [scr, wx]) for (const a of e.getAnimations()) a.cancel();
  scr.animate([s0, { translate:`${-d*SLIDE}px 0px`, opacity:0 }], OUT);
  wx.animate([{ opacity:w0 }, { opacity:0 }], OUT).onfinish = () => old.remove();
  L.querySelector('.screen').animate([{ translate:`${d*SLIDE}px 0px`, opacity:0 }, { translate:'0px 0px', opacity:1 }], IN);
  L.querySelector('.weather').animate([{ opacity:0 }, { opacity:.7 }], IN);
}
// esc: the chrome drops, the sprite is carried back to its place on the xmb, home is there under it. silent is a cut
// (a hash took over): whatever was in the air lands at once.
function closeApp(silent){
  if (!app) return;
  const { el, name, layer:L } = app; app = null;
  document.documentElement.classList.remove('in-app'); S.hold(false); S.room(null);
  el.classList.remove('on');
  if (silent){ if (fl) fl.end(); setTimeout(() => el.remove(), 160); return; }
  el.classList.add('out');
  scrollTo(0, homeY()); state = 'home'; render(); S.back();
  const bay = name === 'wares' && L.querySelector('.bay .sprite'), slot = WORLD[ci].items[ii[ci]].el.querySelector('.sprite');
  if (still || !slot || !(fl || bay)){ if (fl) fl.end(); setTimeout(() => el.remove(), 160); return; }
  const f = fl || carry(bay, el); fl = f;
  f.to(slot, 200, () => { if (fl === f) fl = null; el.remove(); });
}

// ── the cut: title ⇄ home is one transition, not a scroll. the page is locked; the console drives it.
// scrollY is ours alone: the browser doesn't put it back on reload, and nothing else moves it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
document.documentElement.classList.add('console');
let state = 'title', moving = false, cut = 0;
const homeY = () => home.getBoundingClientRect().top + scrollY;
const live = () => state === 'home' && !moving && !app && !fl;
// the cut is one move: input during it is dropped, not queued. where it's going is measured every frame, so a resize
// mid-cut still lands on home's top.
function go(to){
  if (moving || state === to || app || fl) return;
  moving = true; const from = scrollY, t0 = performance.now(), D = still ? 0 : 420, id = ++cut;
  start.classList.remove('on');
  holdWall(to !== 'home');
  if (to === 'home'){ S.start(); S.press(); } else S.back();
  if (to === 'home'){ home.classList.remove('enter'); void home.offsetWidth; home.classList.add('enter'); }
  (function step(){
    if (id !== cut) return;                                               // an arrival took over
    const k = D ? Math.min(1, (performance.now() - t0)/D) : 1, e = 1 - Math.pow(1-k, 3);
    scrollTo(0, from + ((to === 'home' ? homeY() : 0) - from)*e);
    if (k < 1) requestAnimationFrame(step); else land(to);
  })();
}
function land(to){
  state = to; moving = false;
  if (to === 'home') render(); else { history.replaceState(null, '', location.pathname + location.search); showStart(); }
}
// home sits at its top, the title at 0, whatever the layout did meanwhile: fonts, a resize, the url bar
function align(){ if (!moving) scrollTo(0, state === 'home' ? homeY() : 0); }

// ── press start ──
const start = document.createElement('div'); start.id = 'start'; start.textContent = '▸ PRESS START'; document.body.appendChild(start);
// armed once the wall has finished its breach: the wall drops its boot class when the name has landed. until then
// a key is the wall's (it hurries the breach), not ours.
const root = document.documentElement;
let armed = false;
function showStart(){ start.classList.toggle('on', armed && state === 'title' && !moving && !app); }
// the hum starts with press start. the browser may hold it shut until the first key or click; sound.js opens it then.
function armStart(){ armed = true; setTimeout(() => { showStart(); S.cue('ready'); S.start(); }, 700); }
function watchBoot(){ new MutationObserver((_, mo) => { if (!root.classList.contains('boot')){ mo.disconnect(); armStart(); } }).observe(root, { attributes:true, attributeFilter:['class'] }); }
// the wall holds while the title stands, runs when you press. the wall's own breach sets hold when the name lands.
const wall = window.deck && deck.wall;
function holdWall(on){ if (wall) wall.state = on ? 'hold' : 'idle'; }
if (!root.classList.contains('boot')){ armStart(); if (state === 'title') holdWall(true); }
else watchBoot();
function pressStart(){ if (armed) go('home'); }
// the gate: the one thing on the black before the boot. its press opens audio; the wall starts the breach on the same press.
const coin = document.createElement('div'); coin.id = 'coin'; coin.textContent = '▸ PRESS ANY KEY'; document.body.appendChild(coin);
addEventListener('keydown', () => { if (root.classList.contains('gate')) S.open(); }, true);
addEventListener('pointerdown', () => { if (root.classList.contains('gate')) S.open(); }, true);
// the boot again: forget that it played, land on the title, reload
// the boot again, in place: the wall runs its breach over, press start is disarmed until the name lands again
function replay(){
  if (state !== 'title' || !wall || !wall.replay || root.classList.contains('gate')) return;
  armed = false; showStart(); S.quiet(); watchBoot(); wall.replay();
}
start.onclick = pressStart;

// ── input ──
const atHome = () => state === 'home';
const KEYS = new Set(['ArrowRight','l','ArrowLeft','h','ArrowDown','j','ArrowUp','k','Enter',' ','Escape']);
addEventListener('keydown', e => {
  const k = e.key;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'm'){ S.mute(); return; }
  if (k === 'r' && !app && !moving){ replay(); return; }
  if (app){
    if (k==='Escape'||k==='Backspace'){ closeApp(); e.preventDefault(); }
    else if (k==='ArrowRight'||k==='l'){ stepApp(1); e.preventDefault(); }
    else if (k==='ArrowLeft'||k==='h'){ stepApp(-1); e.preventDefault(); }
    else if (k==='j'||k==='ArrowDown'){ app.layer.querySelector('.screen').scrollBy(0, 120); e.preventDefault(); }
    else if (k==='k'||k==='ArrowUp'){ app.layer.querySelector('.screen').scrollBy(0, -120); e.preventDefault(); }
    return;
  }
  if (!KEYS.has(k)) return;
  e.preventDefault();
  if (moving || fl) return;                                              // a cut or a flight is one move
  if (!atHome()){ if (k==='ArrowDown'||k==='j'||k==='Enter'||k===' ') pressStart(); return; }
  if (k==='ArrowRight'||k==='l') move(1, 0);
  else if (k==='ArrowLeft'||k==='h') move(-1, 0);
  else if (k==='ArrowDown'||k==='j') move(0, 1);
  else if (k==='ArrowUp'||k==='k'){ if (ii[ci] === 0) go('title'); else move(0, -1); }
  else if (k==='Enter') launch();
  else if (k==='Escape') go('title');
});
// a wheel gesture is a stream of events; it ends when the stream goes quiet for 200ms. inside one, a step at most every
// 200ms, one move in flight. the gesture that cuts (or the tail of a flick) is spent: its inertia doesn't walk the column
// on arrival, and walking up a column never runs on into the title — leaving takes a fresh gesture.
let wheelAt = 0, wheelT = 0, spent = false;
addEventListener('wheel', e => { if (app) return; e.preventDefault();
  const now = performance.now(), fresh = now - wheelAt > 200; wheelAt = now; if (fresh) spent = false;
  if (moving || fl || spent || now - wheelT < 200 || (!e.deltaX && !e.deltaY)) return;
  if (state === 'title'){ if (e.deltaY > 0 && armed){ spent = true; go('home'); } return; }
  wheelT = now;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) move(Math.sign(e.deltaX), 0);
  else if (e.deltaY > 0) move(0, 1);
  else if (ii[ci] > 0) move(0, -1);
  else if (fresh){ spent = true; go('title'); }                      // top of a column, a fresh wheel up: back to the title
}, { passive:false });
let tx0, ty0;
addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive:true });
addEventListener('touchend', e => { if (app || moving || fl) return; const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (state === 'title'){ if (dy < 0) pressStart(); return; }
  if (Math.abs(dx) > Math.abs(dy)) move(-Math.sign(dx), 0);
  else if (dy < 0) move(0, 1);
  else if (ii[ci] > 0) move(0, -1); else go('title');
}, { passive:true });
addEventListener('resize', () => { snap(); align(); });
new ResizeObserver(align).observe(document.querySelector('.masthead'));
addEventListener('pageshow', e => { if (e.persisted) align(); });

// arrive where the hash says, at once; no hash of ours is the title. a load, a typed hash, back and forward all land here.
const HASH = /^#(\w+)\/(\d+)(?:\/(\w+))?$/;
function arrive(){
  const m = location.hash.match(HASH), x = m ? WORLD.findIndex(c => c.id === m[1]) : -1;
  if (x >= 0){ ci = x; ii[x] = Math.min(WORLD[x].items.length-1, +m[2]); }
  if (fl) fl.end();
  cut++; moving = false; state = x >= 0 ? 'home' : 'title';
  holdWall(state === 'title' && armed);
  snap(); align(); showStart();
  if (x >= 0 && m[3]) openApp(m[3]);
}
addEventListener('hashchange', () => { if (location.hash && !HASH.test(location.hash)) return; closeApp(true); arrive(); });
arrive(); mountSprites();

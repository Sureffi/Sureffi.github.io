/* sound.js — the console's voice. nothing loads: everything is made in the browser, a few oscillators and noise.
   the scene starts on the press (the first gesture; before it the browser keeps audio shut). ticks on moves, a click on
   enter, a lower tick on back. `m` mutes, and the mute is remembered. */
// storage can throw (blocked, some private modes): the mute is then only this visit's
const mem = { get(){ try { return localStorage.getItem('cw:mute'); } catch(e){ return null; } }, set(v){ try { localStorage.setItem('cw:mute', v); } catch(e){} } };
let ac = null, master, humG, noiseBuf, brownBuf, muted = mem.get() === '1';

function ctx(){
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  // a phone opens the context on the finger's lift, after the breach has begun: the room it missed comes in then
  ac.onstatechange = () => { if (ac.state === 'running' && breaching){ reverb(); roomTone(); } };
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .12;
  master = ac.createGain(); master.gain.value = muted ? 0 : .8;
  master.connect(comp); comp.connect(ac.destination);
  const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  const bb = ac.createBuffer(2, n, ac.sampleRate);                          // brown: the low, soft noise the room is made of
  for (let c = 0; c < 2; c++){ const d2 = bb.getChannelData(c); let v = 0; for (let i = 0; i < n; i++){ v = (v + .02 * (Math.random()*2-1)) / 1.02; d2[i] = v * 3.5; } }
  brownBuf = bb;
  return ac;
}
const t = () => ac.currentTime;
function osc(type, f, g, to){ const o = ac.createOscillator(), G = ac.createGain(); o.type = type; o.frequency.value = f; G.gain.value = g; o.connect(G); G.connect(to); o.start(); return o; }

/* the scene is a room with its silence full: a dark room tone that drifts, and now and then something far off —
   a rumble swelling and going, a thud, voices you can't make out. long quiet between. nothing pitched, nothing on a clock. */
let verb = null, sceneOn = false, sat = false;
/* a room changes how often each thing happens (× the home's rate). a ware not named here sounds like home. */
const ROOMS = {
  home:     { pass:1,   thud:1,   voice:1 },
  drawer:   { pass:.5,  thud:.4,  voice:.35 },  // a quiet desk
  agentsdk: { pass:.8,  thud:.6,  voice:2 },    // the binary talks
  cience:   { pass:1.8, thud:.8,  voice:1.2 },  // things keep going by
  deck:     { pass:.6,  thud:.5,  voice:.5 },
  motion:   { pass:1,   thud:1.8, voice:.8 },   // the city lands things
};
let room = ROOMS.home;
function reverb(){
  if (verb) return verb;
  const len = ac.sampleRate * 1.1, b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++){ const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 4); }
  verb = ac.createConvolver(); verb.buffer = b; const g = ac.createGain(); g.gain.value = .18; verb.connect(g); g.connect(master); return verb;
}
const rnd = (a, b) => a + Math.random() * (b - a);
let gen = 0;                                                            // a scene's timers die with it
const later = (ms, f) => { const g = gen; setTimeout(() => { if (sceneOn && g === gen) f(); }, ms); };

function hum(){
  if (humG) return;
  humG = ac.createGain(); humG.gain.value = 0;                            // the scene's handle: hold() and quiet() act on it
  sceneOn = true; reverb(); roomTone();
  later(rnd(1500, 4000), pass); later(rnd(6000, 14000), rumble); later(rnd(9000, 20000), thud); later(rnd(12000, 25000), voice);
}
/* a light going by, for the picture only: it crosses without a sound */
function pass(){ if (S.onPass) S.onPass(Math.random() < .5 ? 1 : -1, rnd(1.2, 3.2)); later(rnd(2500, 9000) / room.pass, pass); }

/* the room tone: brown noise in stereo, low, breathing slowly. it is the silence, so it stays quiet */
let tone = null;
function roomTone(){
  if (tone || !ac) return tone;
  const n = ac.createBufferSource(); n.buffer = brownBuf; n.loop = true;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = .5;
  const G = ac.createGain(); G.gain.value = 0;
  n.connect(hp); hp.connect(lp); lp.connect(G); G.connect(master); n.start();
  G.gain.setTargetAtTime(.05, t(), 1.5);
  tone = { lp, G };
  (function drift(){ if (!tone) return; G.gain.setTargetAtTime(rnd(.035, .06), t(), rnd(4, 9)); lp.frequency.setTargetAtTime(rnd(200, 340), t(), rnd(4, 9)); setTimeout(drift, rnd(7000, 15000)); })();
  return tone;
}
/* something big and far: low noise swelling for a few seconds and going, from one side */
function rumble(){
  const n = ac.createBufferSource(); n.buffer = brownBuf; n.loop = true; n.loopStart = Math.random();
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = rnd(90, 160);
  const G = ac.createGain(), pan = ac.createStereoPanner(); pan.pan.value = rnd(-.8, .8);
  n.connect(lp); lp.connect(G); G.connect(pan); pan.connect(master);
  const now = t(), up = rnd(1.5, 3.5), down = rnd(3, 6), g = rnd(.08, .18);
  G.gain.setValueAtTime(.0001, now); G.gain.exponentialRampToValueAtTime(g, now + up); G.gain.exponentialRampToValueAtTime(.0001, now + up + down);
  n.start(now); n.stop(now + up + down + .1);
  later(rnd(15000, 40000), rumble);
}

/* something landing far off: a thud, most of it tail */
function thud(){
  const now = t(), pan = ac.createStereoPanner(); pan.pan.value = rnd(-.8, .8);
  const o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine';
  const f = rnd(38, 60); o.frequency.setValueAtTime(f * 1.6, now); o.frequency.exponentialRampToValueAtTime(f, now + .12);
  const g = rnd(.08, .22); G.gain.setValueAtTime(g, now); G.gain.exponentialRampToValueAtTime(.001, now + rnd(.25, .6));
  o.connect(G); G.connect(pan); pan.connect(master); G.connect(verb); o.start(now); o.stop(now + .8);
  const n = ac.createBufferSource(); n.buffer = noiseBuf; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = rnd(150, 400);
  const nG = ac.createGain(); nG.gain.setValueAtTime(g * .8, now); nG.gain.exponentialRampToValueAtTime(.001, now + .18);
  n.connect(lp); lp.connect(nG); nG.connect(verb); n.start(now, Math.random()); n.stop(now + .3);
  if (Math.random() < .3) later(rnd(120, 400), thud); else later(rnd(14000, 40000) / room.thud, thud);   // sometimes two or three
}
/* voices you can't make out: two formants walking vowel to vowel at speech rate, syllables in a short run, muffled, wet */
function voice(){
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.loopStart = Math.random();
  const src = ac.createGain(); src.gain.value = 0; n.connect(src);
  const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 9; f2.Q.value = 12;
  const muff = ac.createBiquadFilter(); muff.type = 'lowpass'; muff.frequency.value = 1100;
  const pan = ac.createStereoPanner(); pan.pan.value = rnd(-.9, .9); const G = ac.createGain(); G.gain.value = rnd(.25, .5);
  src.connect(f1); src.connect(f2); f1.connect(muff); f2.connect(muff); muff.connect(G); G.connect(pan); pan.connect(master); G.connect(verb);
  const now = t(), syl = 3 + (Math.random() * 7 | 0); let at = now;
  for (let k = 0; k < syl; k++){
    const d = rnd(.11, .26);
    f1.frequency.setTargetAtTime(rnd(300, 800), at, .04); f2.frequency.setTargetAtTime(rnd(900, 2300), at, .04);
    src.gain.setTargetAtTime(rnd(.6, 1.6), at, .03); src.gain.setTargetAtTime(0, at + d * .7, .04);
    at += d + rnd(0, .08);
  }
  n.start(now, Math.random()); n.stop(at + .4);
  later(rnd(18000, 45000) / room.voice, voice);
}
/* a transient: a burst of noise through a band, and a body under it. no tail. */
function hit({ band, q = 3, len, g, body, bodyLen, bodyG }){
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loopStart = Math.random(); n.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = band; bp.Q.value = q;
  const G = ac.createGain(); n.connect(bp); bp.connect(G); G.connect(master);
  const now = t(); G.gain.setValueAtTime(g, now); G.gain.exponentialRampToValueAtTime(.001, now + len);
  n.start(now, Math.random()); n.stop(now + len + .01);
  if (body){
    const o = ac.createOscillator(), bG = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(body, now);
    o.frequency.exponentialRampToValueAtTime(body * .6, now + bodyLen);
    bG.gain.setValueAtTime(bodyG, now); bG.gain.exponentialRampToValueAtTime(.001, now + bodyLen);
    o.connect(bG); bG.connect(master); o.start(now); o.stop(now + bodyLen + .01);
  }
}

/* the boot score. the breach sends cues (wallcue events) at each stage. the room tone comes up with the breach and
   opens a little through the migration; the landing is one deep, soft impact with a dark tail. the interface ticks
   stay. one-shots only fire with the context running, so nothing queues up to fire at once when the browser opens it. */
let grains = 0, breaching = false;
const live = () => ac && ac.state === 'running';
function impact(){
  const now = t(), o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(52, now); o.frequency.exponentialRampToValueAtTime(40, now + .08);
  G.gain.setValueAtTime(.0001, now); G.gain.exponentialRampToValueAtTime(.6, now + .012); G.gain.exponentialRampToValueAtTime(.0001, now + 2.4);
  o.connect(G); G.connect(master); o.start(now); o.stop(now + 2.5);
  const n = ac.createBufferSource(); n.buffer = brownBuf; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  const nG = ac.createGain(); nG.gain.setValueAtTime(.0001, now); nG.gain.exponentialRampToValueAtTime(.5, now + .02); nG.gain.exponentialRampToValueAtTime(.0001, now + 3.5);
  n.connect(lp); lp.connect(nG); nG.connect(master); nG.connect(verb); n.start(now); n.stop(now + 3.6);
}
function grain(){ if (grains && live()) hit({ band: 1500 + Math.random()*3500, q: 6, len: .006, g: .03 + Math.random()*.04 }); if (grains) setTimeout(grain, 60 + Math.random()*160); }
const BOOT = {
  begin(){ roomTone(); },
  type(){ hit({ band: 4200, q: 6, len: .005, g: .12 }); },
  row(){ hit({ band: 1400, q: 4, len: .014, g: .22, body: 220, bodyLen: .03, bodyG: .08 }); },
  step(){ hit({ band: 2600, q: 5, len: .008, g: .16 }); },
  pick(){                                                                     // a code taken: a chirp up
    const now = t(), o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(2600, now + .04);
    G.gain.setValueAtTime(.14, now); G.gain.exponentialRampToValueAtTime(.001, now + .07);
    o.connect(G); G.connect(master); o.start(now); o.stop(now + .08);
    hit({ band: 3000, q: 4, len: .02, g: .18 });
  },
  breached(){                                                                 // two tones, the confirm
    const now = t();
    for (const [f, d] of [[440, 0], [660, .07]]){
      const o = ac.createOscillator(), G = ac.createGain(); o.type = 'triangle'; o.frequency.value = f;
      G.gain.setValueAtTime(.0001, now + d); G.gain.exponentialRampToValueAtTime(.12, now + d + .01); G.gain.exponentialRampToValueAtTime(.001, now + d + .22);
      o.connect(G); G.connect(master); o.start(now + d); o.stop(now + d + .25);
    }
  },
  migrate(){                                                                  // the room opens a little; a faint crackle
    if (tone){ tone.lp.frequency.setTargetAtTime(520, t(), 2); tone.G.gain.setTargetAtTime(.07, t(), 2); }
    grains = 1; grain();
  },
  melt(){ grains = 1; grain(); setTimeout(() => { grains = 0; }, 500); },
  land(){                                                                     // the name lands: one deep impact, the room settles back
    grains = 0; impact();
    if (tone){ tone.lp.frequency.setTargetAtTime(260, t() + .5, 3); tone.G.gain.setTargetAtTime(.05, t() + .5, 3); }
  },
  line(){ grains = 1; grain(); setTimeout(() => { grains = 0; }, 2000); },   // the line decodes under a lighter crackle
  ready(){ hit({ band: 2000, q: 5, len: .02, g: .16, body: 880, bodyLen: .04, bodyG: .08 }); },
};
addEventListener('wallcue', e => { if (e.detail === 'begin') breaching = true; else if (e.detail === 'land') breaching = false;
  if (!ac) ctx(); if (!live()) return; reverb(); const f = BOOT[e.detail]; if (f) f(); });

export const S = {
  open(){ ctx(); if (ac.state !== 'running') ac.resume().catch(() => {}); },                       // on the gate's press: the context, nothing playing
  start(){ ctx(); if (ac.state !== 'running') ac.resume().catch(() => {}); hum(); },
  press(){ if (!ac) return; hit({ band: 700, q: 2, len: .045, g: .6, body: 72, bodyLen: .11, bodyG: .5 }); },
  tick(){  if (!ac) return; hit({ band: 3200, q: 5, len: .012, g: .32, body: 1900, bodyLen: .008, bodyG: .08 }); },
  enter(){ if (!ac) return; hit({ band: 1200, q: 3, len: .035, g: .5, body: 110, bodyLen: .08, bodyG: .35 }); },
  back(){  if (!ac) return; hit({ band: 900, q: 4, len: .018, g: .3, body: 480, bodyLen: .02, bodyG: .1 }); },
  hold(on){ sat = on; },                                                    // inside an app
  room(name){ room = ROOMS[name] || ROOMS.home; },                           // the rates hold from each thing's next time
  mute(){ muted = !muted; mem.set(muted ? '1' : '0'); if (master) master.gain.setTargetAtTime(muted ? 0 : .8, t(), .05); return muted; },
  get muted(){ return muted; },
  get state(){ return ac ? ac.state : 'none'; },
  onPass: null,
  cue(n){ dispatchEvent(new CustomEvent('wallcue', { detail: n })); },
  quiet(){ sceneOn = false; gen++; if (tone){ const g = tone.G; g.gain.setTargetAtTime(0, t(), .2); setTimeout(() => { try { g.disconnect(); } catch(e){} }, 1200); tone = null; } if (humG){ humG.gain.setTargetAtTime(0, t(), .2); const g = humG; setTimeout(() => { try { g.disconnect(); } catch(e){} }, 1200); humG = null; } },   // the scene down: a replay starts it over                                                          // (dir, seconds): something crossed; the picture gets it too
};
// the browser opens audio on a key or a click, not a wheel: if the scene was asked for on a wheel, the next real gesture starts it.
// a touch counts on its lift, not its landing (touchend, pointerup, click); ios also leaves a context 'interrupted' after a
// call or the background, and the next touch brings it back.
const wake = () => { if (ac && ac.state !== 'running') ac.resume().catch(() => {}); };
for (const ev of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click']) addEventListener(ev, wake, { passive:true });

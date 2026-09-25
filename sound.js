/* sound.js — the console's voice. nothing loads: everything is made in the browser, a few oscillators and noise.
   the hum starts on the press (the first gesture; before it the browser keeps audio shut). ticks on moves, a click on
   enter, a lower tick on back. `m` mutes, and the mute is remembered. */
// storage can throw (blocked, some private modes): the mute is then only this visit's
const mem = { get(){ try { return localStorage.getItem('cw:mute'); } catch(e){ return null; } }, set(v){ try { localStorage.setItem('cw:mute', v); } catch(e){} } };
let ac = null, master, humG, noiseBuf, muted = mem.get() === '1';

function ctx(){
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  // a phone opens the context on the finger's lift, after the breach has begun: the drone it missed comes in then
  ac.onstatechange = () => { if (ac.state === 'running' && breaching && !drone){ reverb(); droneOn(); } };
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .12;
  master = ac.createGain(); master.gain.value = muted ? 0 : .8;
  master.connect(comp); comp.connect(ac.destination);
  const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return ac;
}
const t = () => ac.currentTime;
function osc(type, f, g, to){ const o = ac.createOscillator(), G = ac.createGain(); o.type = type; o.frequency.value = f; G.gain.value = g; o.connect(G); G.connect(to); o.start(); return o; }

/* the hum is a scene, not a tone. under it a bed that drifts: a low A, its octave leaning a few cents, a fifth that comes
   and goes on its own, a sawtooth under a filter that wanders rather than swings. over the bed, things happen: lights
   pass (a band of noise sweeping across the stereo field), something lands far off (a thud with a long tail), and
   voices you can't make out (formants moving at speech rate, muffled, wet). none of it on a clock. */
let verb = null, sceneOn = false, sat = false, bed = null;
/* a room leans the scene, it doesn't change it: where the filter wanders, how often the fifth is there, how much air,
   and how often each thing happens (× the home's rate). home is the default; a ware not named here sounds like home. */
const ROOMS = {
  home:     { lo:120, hi:260, fifth:.5, air:.022, airF:420, pass:1,   thud:1,   voice:1 },
  drawer:   { lo:170, hi:330, fifth:.8, air:.014, airF:380, pass:.5,  thud:.4,  voice:.35 },  // a quiet desk, the fifth held
  agentsdk: { lo:130, hi:240, fifth:.3, air:.034, airF:900, pass:.8,  thud:.6,  voice:2 },    // the wire hisses, the binary talks
  cience:   { lo:100, hi:190, fifth:.2, air:.02,  airF:520, pass:1.8, thud:.8,  voice:1.2 },  // low, and things keep going by
  deck:     { lo:150, hi:280, fifth:.95,air:.016, airF:360, pass:.6,  thud:.5,  voice:.5 },   // warm, the fifth nearly always on
  motion:   { lo:110, hi:220, fifth:.4, air:.038, airF:1300,pass:1,   thud:1.8, voice:.8 },   // rain on it; the city lands things
};
let room = ROOMS.home;
function reverb(){
  if (verb) return verb;
  const len = ac.sampleRate * 2.8, b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++){ const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6); }
  verb = ac.createConvolver(); verb.buffer = b; const g = ac.createGain(); g.gain.value = .5; verb.connect(g); g.connect(master); return verb;
}
const rnd = (a, b) => a + Math.random() * (b - a);
let gen = 0;                                                            // a scene's timers die with it
const later = (ms, f) => { const g = gen; setTimeout(() => { if (sceneOn && g === gen) f(); }, ms); };

function hum(){
  if (humG) return;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = .9;
  humG = ac.createGain(); humG.gain.value = 0; lp.connect(humG); humG.connect(master);
  osc('sine', 55, .5, lp);
  osc('sine', 110, .22, lp).detune.value = 7;
  osc('sawtooth', 55, .10, lp);
  const fifth = ac.createGain(); fifth.gain.value = 0; fifth.connect(lp);          // the fifth comes and goes
  osc('sine', 82.4, .18, fifth).detune.value = -5;
  const air = ac.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
  const alp = ac.createBiquadFilter(); alp.type = 'lowpass'; alp.frequency.value = 420;
  const aG = ac.createGain(); aG.gain.value = room.air; alp.frequency.value = room.airF; air.connect(alp); alp.connect(aG); aG.connect(humG); air.start();
  humG.gain.setTargetAtTime(.10, t(), .45);
  sceneOn = true; reverb(); bed = { lp, fifth, aG, alp };
  (function swell(){ if (!sat) humG.gain.setTargetAtTime(rnd(.07, .12), t(), rnd(4, 9)); later(rnd(8000, 20000), swell); })();
  (function wander(){ lp.frequency.setTargetAtTime(rnd(room.lo, room.hi), t(), rnd(2, 6)); later(rnd(3000, 9000), wander); })();
  (function breathe(){ fifth.gain.setTargetAtTime(Math.random() < room.fifth ? rnd(.4, 1) : 0, t(), rnd(3, 8)); later(rnd(6000, 16000), breathe); })();
  later(rnd(1500, 4000), pass); later(rnd(3000, 7000), thud); later(rnd(5000, 12000), voice); later(rnd(9000, 20000), shimmer);
}

/* a light going by: noise in a moving band, sweeping the field, doppler on the way past */
function pass(){
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.loopStart = Math.random();
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = rnd(4, 9);
  const pan = ac.createStereoPanner(), G = ac.createGain(); n.connect(bp); bp.connect(G); G.connect(pan); pan.connect(master); G.connect(verb);
  const now = t(), len = rnd(1.2, 3.2), dir = Math.random() < .5 ? 1 : -1, f0 = rnd(500, 1800);
  pan.pan.setValueAtTime(-dir, now); pan.pan.linearRampToValueAtTime(dir, now + len);
  bp.frequency.setValueAtTime(f0 * 1.25, now); bp.frequency.exponentialRampToValueAtTime(f0 * .7, now + len);
  G.gain.setValueAtTime(.0001, now); G.gain.exponentialRampToValueAtTime(rnd(.05, .14), now + len * .45); G.gain.exponentialRampToValueAtTime(.0001, now + len);
  n.start(now, Math.random()); n.stop(now + len + .05);
  if (S.onPass) S.onPass(dir, len);
  later(rnd(2500, 9000) / room.pass, pass);
}
/* something landing far off: a thud, most of it tail */
function thud(){
  const now = t(), pan = ac.createStereoPanner(); pan.pan.value = rnd(-.8, .8);
  const o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine';
  const f = rnd(38, 60); o.frequency.setValueAtTime(f * 1.6, now); o.frequency.exponentialRampToValueAtTime(f, now + .12);
  const g = rnd(.15, .5); G.gain.setValueAtTime(g, now); G.gain.exponentialRampToValueAtTime(.001, now + rnd(.25, .6));
  o.connect(G); G.connect(pan); pan.connect(master); G.connect(verb); o.start(now); o.stop(now + .8);
  const n = ac.createBufferSource(); n.buffer = noiseBuf; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = rnd(150, 400);
  const nG = ac.createGain(); nG.gain.setValueAtTime(g * .8, now); nG.gain.exponentialRampToValueAtTime(.001, now + .18);
  n.connect(lp); lp.connect(nG); nG.connect(verb); n.start(now, Math.random()); n.stop(now + .3);
  if (Math.random() < .3) later(rnd(120, 400), thud); else later(rnd(4000, 14000) / room.thud, thud);   // sometimes two or three
}
/* voices you can't make out: two formants walking vowel to vowel at speech rate, syllables in a short run, muffled, wet */
function voice(){
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.loopStart = Math.random();
  const src = ac.createGain(); src.gain.value = 0; n.connect(src);
  const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 9; f2.Q.value = 12;
  const muff = ac.createBiquadFilter(); muff.type = 'lowpass'; muff.frequency.value = 1100;
  const pan = ac.createStereoPanner(); pan.pan.value = rnd(-.9, .9); const G = ac.createGain(); G.gain.value = rnd(.05, .11);
  src.connect(f1); src.connect(f2); f1.connect(muff); f2.connect(muff); muff.connect(G); G.connect(pan); pan.connect(master); G.connect(verb);
  const now = t(), syl = 3 + (Math.random() * 7 | 0); let at = now;
  for (let k = 0; k < syl; k++){
    const d = rnd(.11, .26);
    f1.frequency.setTargetAtTime(rnd(300, 800), at, .04); f2.frequency.setTargetAtTime(rnd(900, 2300), at, .04);
    src.gain.setTargetAtTime(rnd(.6, 1.6), at, .03); src.gain.setTargetAtTime(0, at + d * .7, .04);
    at += d + rnd(0, .08);
  }
  n.start(now, Math.random()); n.stop(at + .4);
  later(rnd(6000, 18000) / room.voice, voice);
}
/* a tone in the ear, coming from nowhere, gone again */
function shimmer(){
  const now = t(), o = ac.createOscillator(), G = ac.createGain(), pan = ac.createStereoPanner(); pan.pan.value = rnd(-.6, .6);
  o.type = 'sine'; o.frequency.value = [1760, 2637, 3520, 1975][Math.random() * 4 | 0]; o.detune.value = rnd(-30, 30);
  const len = rnd(1.5, 4);
  G.gain.setValueAtTime(.0001, now); G.gain.exponentialRampToValueAtTime(rnd(.008, .02), now + len * .5); G.gain.exponentialRampToValueAtTime(.0001, now + len);
  o.connect(G); G.connect(pan); pan.connect(master); o.start(now); o.stop(now + len + .05);
  later(rnd(12000, 30000), shimmer);
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

/* the boot score. the breach sends cues (wallcue events) at each stage; each cue is a sound, and the stages between
   are a drone that rises through the migration and cuts on the landing. one-shots only fire with the context running:
   while the browser holds it shut, nothing queues up to fire all at once when it opens. */
let drone = null, grains = 0, breaching = false;
const live = () => ac && ac.state === 'running';
function droneOn(){
  if (drone || !ac) return;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 90; lp.Q.value = 1.2;
  const G = ac.createGain(); G.gain.value = 0; lp.connect(G); G.connect(master); G.connect(verb);
  osc('sawtooth', 41.2, .5, lp); osc('sine', 41.2, .4, lp).detune.value = 4;
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const nl = ac.createBiquadFilter(); nl.type = 'lowpass'; nl.frequency.value = 260; const nG = ac.createGain(); nG.gain.value = .5;
  n.connect(nl); nl.connect(nG); nG.connect(lp); n.start();
  G.gain.setTargetAtTime(.08, t(), 1.2);
  drone = { lp, G, stop(ms){ G.gain.setTargetAtTime(0, t(), ms/3000); setTimeout(() => { try { G.disconnect(); } catch(e){} }, ms + 200); drone = null; } };
}
function grain(){ if (grains && live()) hit({ band: 1500 + Math.random()*3500, q: 6, len: .006, g: .05 + Math.random()*.06 }); if (grains) setTimeout(grain, 30 + Math.random()*90); }
const BOOT = {
  begin(){ droneOn(); },
  type(){ hit({ band: 4200, q: 6, len: .005, g: .12 }); },
  row(){ hit({ band: 1400, q: 4, len: .014, g: .22, body: 220, bodyLen: .03, bodyG: .08 }); },
  step(){ hit({ band: 2600, q: 5, len: .008, g: .16 }); },
  pick(){                                                                     // a code taken: a chirp up
    const now = t(), o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(2600, now + .04);
    G.gain.setValueAtTime(.14, now); G.gain.exponentialRampToValueAtTime(.001, now + .07);
    o.connect(G); G.connect(master); G.connect(verb); o.start(now); o.stop(now + .08);
    hit({ band: 3000, q: 4, len: .02, g: .18 });
  },
  breached(){                                                                 // two tones, the confirm
    const now = t();
    for (const [f, d] of [[440, 0], [660, .07]]){
      const o = ac.createOscillator(), G = ac.createGain(); o.type = 'triangle'; o.frequency.value = f;
      G.gain.setValueAtTime(.0001, now + d); G.gain.exponentialRampToValueAtTime(.12, now + d + .01); G.gain.exponentialRampToValueAtTime(.001, now + d + .22);
      o.connect(G); G.connect(master); G.connect(verb); o.start(now + d); o.stop(now + d + .25);
    }
  },
  migrate(){                                                                  // the eat and the flight: the drone opens, crackle
    if (drone){ drone.lp.frequency.setTargetAtTime(900, t(), 1.4); drone.G.gain.setTargetAtTime(.16, t(), 1.2); }
    grains = 1; grain();
  },
  melt(){ grains = 1; grain(); setTimeout(() => { grains = 0; }, 500); },
  land(){                                                                     // the name lands: the hit, and a bloom that hangs
    grains = 0; if (drone) drone.stop(300);
    hit({ band: 200, q: 1.5, len: .05, g: .7, body: 48, bodyLen: 1.1, bodyG: .7 });
    const now = t();
    for (const f of [220, 330, 440]){
      const o = ac.createOscillator(), G = ac.createGain(); o.type = 'sine'; o.frequency.value = f; o.detune.value = rnd(-6, 6);
      G.gain.setValueAtTime(.0001, now); G.gain.exponentialRampToValueAtTime(.05, now + .3); G.gain.exponentialRampToValueAtTime(.0001, now + 3);
      o.connect(G); G.connect(master); G.connect(verb); o.start(now); o.stop(now + 3.1);
    }
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
  hold(on){ sat = on; if (humG) humG.gain.setTargetAtTime(on ? .035 : .10, t(), .3); },   // inside an app the hum sits back
  // the room you're in: the bed leans toward it over a second or two; the rates hold from each thing's next time
  room(name){
    room = ROOMS[name] || ROOMS.home; if (!bed) return;
    const now = t();
    bed.lp.frequency.setTargetAtTime((room.lo + room.hi)/2, now, .8);
    bed.fifth.gain.setTargetAtTime(Math.random() < room.fifth ? rnd(.5, 1) : 0, now, 1.2);
    bed.aG.gain.setTargetAtTime(room.air, now, .8); bed.alp.frequency.setTargetAtTime(room.airF, now, .8);
  },
  mute(){ muted = !muted; mem.set(muted ? '1' : '0'); if (master) master.gain.setTargetAtTime(muted ? 0 : .8, t(), .05); return muted; },
  get muted(){ return muted; },
  get state(){ return ac ? ac.state : 'none'; },
  onPass: null,
  cue(n){ dispatchEvent(new CustomEvent('wallcue', { detail: n })); },
  quiet(){ sceneOn = false; gen++; if (humG){ humG.gain.setTargetAtTime(0, t(), .2); const g = humG; setTimeout(() => { try { g.disconnect(); } catch(e){} }, 1200); humG = null; } },   // the scene down: a replay starts it over                                                          // (dir, seconds): something crossed; the picture gets it too
};
// the browser opens audio on a key or a click, not a wheel: if the hum was asked for on a wheel, the next real gesture starts it.
// a touch counts on its lift, not its landing (touchend, pointerup, click); ios also leaves a context 'interrupted' after a
// call or the background, and the next touch brings it back.
const wake = () => { if (ac && ac.state !== 'running') ac.resume().catch(() => {}); };
for (const ev of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click']) addEventListener(ev, wake, { passive:true });

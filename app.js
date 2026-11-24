/* Mandarin de Taïwan — 50 mots. Application statique, sans serveur, fonctionne hors-ligne. */
(function () {
'use strict';

/* =====================  Utilitaires & état  ===================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'mandarin50.v1';
const DEFAULTS = {
  learned: {}, checks: {}, custom: {}, welcomed: false, tab: 'learn',
  set: { script: 'both', zhVoice: '', frVoice: '', rate: 0.85, pause: 4, mode: 'discover', order: 'seq',
         cat: 'all', example: false, skip: false, wake: true }
};
let S;
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return { ...DEFAULTS, ...raw, set: { ...DEFAULTS.set, ...(raw.set || {}) } };
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
S = loadState();

const WORDS = window.WORDS, CATS = window.CATS;
const byId = id => WORDS.find(w => w.id === id);
const fmtRate = r => String(r).replace('.', ',');

/* =====================  Affichage des lectures  ===================== */
function readHTML(w, mode) {
  mode = mode || S.set.script;
  const inner = w.syl.map(s =>
    `<span class="syl t${s.t}">` +
    (mode !== 'zhuyin' ? `<b>${esc(s.py)}</b>` : '') +
    (mode !== 'pinyin' ? `<span class="zy">${esc(s.zy)}</span>` : '') +
    `</span>`).join('');
  return `<span class="${mode === 'both' ? 'read-both' : ''}">${inner}</span>`;
}
const plainPy = w => w.syl.map(s => s.py).join(' ');
const sizeClass = w => (w.zh.length >= 5 ? 'xlong' : w.zh.length >= 3 ? 'long' : '');

/* =====================  Voix (synthèse vocale du téléphone)  ===================== */
const TTS = {
  voices: [], token: 0, _cur: null,
  supported: 'speechSynthesis' in window,
  load() {
    if (!this.supported) return;
    this.voices = speechSynthesis.getVoices() || [];
    fillVoiceSelects();
    updateVoiceWarn();
  },
  norm: v => (v.lang || '').replace('_', '-').toLowerCase(),
  score(v) { return (/premium|enhanced|natural|neural|mei-?jia|google/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0); },
  list(kind) {
    const re = kind === 'zh' ? /^zh/ : /^fr/;
    return this.voices.filter(v => re.test(this.norm(v)));
  },
  pick(kind) {
    const want = kind === 'zh' ? S.set.zhVoice : S.set.frVoice;
    if (want) { const v = this.voices.find(v => v.name === want); if (v) return v; }
    const l = this.list(kind).sort((a, b) => this.score(b) - this.score(a));
    if (kind === 'zh')
      return l.find(v => this.norm(v) === 'zh-tw') || l.find(v => /zh-hant|zh-hk/.test(this.norm(v))) || l[0] || null;
    return l.find(v => this.norm(v) === 'fr-fr') || l[0] || null;
  },
  speak(text, kind, rate) {
    return new Promise(resolve => {
      if (!this.supported || !String(text).trim()) { resolve(false); return; }
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pick(kind);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = kind === 'zh' ? 'zh-TW' : 'fr-FR';
      u.rate = rate || 0.9; u.pitch = 1;
      let done = false, t;
      const fin = ok => { if (done) return; done = true; clearTimeout(t); resolve(ok); };
      u.onend = () => fin(true);
      u.onerror = () => fin(false);
      t = setTimeout(() => fin(false), 5000 + text.length * 500);
      this._cur = u;                       // garde une référence (évite un bug de ramasse-miettes)
      setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { fin(false); } }, 40);
    });
  },
  begin() {                               // annule tout et renvoie un jeton pour la nouvelle lecture
    this.token++;
    try { speechSynthesis.cancel(); } catch (e) {}
    return this.token;
  },
  stop() { this.begin(); },
  async seq(parts, my, onPart) {
    for (let i = 0; i < parts.length; i++) {
      if (my !== this.token) return false;
      const p = parts[i];
      if (onPart) onPart(p, i);
      await this.speak(p.t, p.k, p.r);
      if (my !== this.token) return false;
      if (p.gap) await sleep(p.gap);
    }
    return my === this.token;
  }
};
if (TTS.supported) {
  TTS.load();
  speechSynthesis.onvoiceschanged = () => TTS.load();
  setTimeout(() => TTS.load(), 600);
}

/* texte français contenant des caractères chinois → morceaux fr / zh */
function cleanFr(t) {
  return t.replace(/\([^)]*[āáǎàēéěèīíǐìōóǒòūúǔùǖ][^)]*\)/g, ' ')
          .replace(/[«»]/g, ' ').replace(/NT\$/g, 'dollars taïwanais')
          .replace(/\//g, ' ou ').replace(/\s+/g, ' ').trim();
}
function mixedParts(text, rate, gap) {
  const zhRate = Math.min(rate, 0.85), frRate = Math.min(1, rate + 0.1);
  const out = [];
  text.split(/([一-鿿]+)/).forEach(seg => {
    if (!seg) return;
    if (/[一-鿿]/.test(seg)) out.push({ t: seg, k: 'zh', r: zhRate, gap: 250 });
    else { const c = cleanFr(seg); if (/[A-Za-zÀ-ÿ0-9]/.test(c)) out.push({ t: c, k: 'fr', r: frRate, gap: 150 }); }
  });
  if (out.length && gap) out[out.length - 1].gap = gap;
  return out;
}

/* =====================  Réglages : voix  ===================== */
function fillVoiceSelects() {
  const fill = (el, kind, cur) => {
    if (!el) return;
    const l = TTS.list(kind);
    el.innerHTML = `<option value="">Automatique${l.length ? '' : ' (aucune voix détectée)'}</option>` +
      l.map(v => `<option value="${esc(v.name)}"${v.name === cur ? ' selected' : ''}>${esc(v.name)} — ${esc(v.lang)}</option>`).join('');
  };
  fill($('#set-voice-zh'), 'zh', S.set.zhVoice);
  fill($('#set-voice-fr'), 'fr', S.set.frVoice);
  const zh = TTS.pick('zh');
  $('#set-voice-info').textContent = !TTS.supported ? 'La synthèse vocale n’est pas disponible sur cet appareil.'
    : zh ? `Voix chinoise utilisée : ${zh.name} (${zh.lang}).` : 'Aucune voix chinoise trouvée sur cet appareil.';
}
function updateVoiceWarn() {
  const w = $('#car-voice-warn');
  const zh = TTS.pick('zh');
  if (!TTS.supported) { w.hidden = false; w.textContent = 'Ce navigateur ne sait pas lire à voix haute. Essaie avec Safari (iPhone) ou Chrome (Android).'; }
  else if (TTS.voices.length && !zh) {
    w.hidden = false;
    w.textContent = 'Aucune voix chinoise n’est installée sur ce téléphone. iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › Chinois (Taïwan). Android : Réglages › Synthèse vocale › installer le chinois (Taïwan).';
  } else if (zh && !/^zh[-_]tw/i.test(zh.lang)) {
    w.hidden = false;
    w.textContent = `La voix chinoise utilisée est « ${zh.lang} » (pas Taïwan). Pour l’accent de Taïwan, installe la voix « Chinois (Taïwan) » dans les réglages du téléphone.`;
  } else w.hidden = true;
}

/* =====================  Onglets  ===================== */
function showTab(name) {
  S.tab = name; save();
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo({ top: 0 });
  if (name === 'draw') drawEnter();
}
$$('.tab-btn').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

/* =====================  Apprendre : liste  ===================== */
let learnCat = 'all';
function updateProgress() {
  const n = WORDS.filter(w => S.learned[w.id]).length;
  $('#progress-line').textContent = `${n} / ${WORDS.length} mots appris`;
  $('#progress-bar').style.width = (n / WORDS.length * 100) + '%';
}
function renderChips() {
  const el = $('#cat-chips');
  const cats = ['all'].concat(CATS);
  el.innerHTML = cats.map(c => `<button class="chip${c === learnCat ? ' on' : ''}" data-c="${esc(c)}">${c === 'all' ? 'Tous' : esc(c)}</button>`).join('');
}
function wordCard(w) {
  return `<li><button class="word-card${S.learned[w.id] ? ' done' : ''}" data-id="${w.id}">
    <span class="wc-zh zh${w.zh.length > 3 ? ' long' : ''}" lang="zh-Hant-TW">${esc(w.zh)}</span>
    <span class="wc-mid"><div class="wc-read">${readHTML(w)}</div><div class="wc-fr">${esc(w.fr)}</div></span>
    <span class="wc-done" aria-label="appris">✓</span></button></li>`;
}
function renderList() {
  const el = $('#word-list');
  let html = '';
  if (learnCat === 'all') {
    CATS.forEach(c => {
      html += `<li class="cat-head">${esc(c)}</li>` + WORDS.filter(w => w.cat === c).map(wordCard).join('');
    });
  } else html = WORDS.filter(w => w.cat === learnCat).map(wordCard).join('');
  el.innerHTML = html;
  updateProgress();
}
$('#cat-chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  learnCat = b.dataset.c; renderChips(); renderList();
});
$('#word-list').addEventListener('click', e => {
  const b = e.target.closest('.word-card'); if (b) openSheet(+b.dataset.id);
});

/* ---- message d'accueil ---- */
(function welcome() {
  const c = window.CONFIG || {};
  if (S.welcomed) return;
  $('#welcome-title').textContent = c.prenom ? `Pour ${c.prenom} 🎁` : 'Bienvenue !';
  $('#welcome-msg').textContent = c.message || 'Les 50 mots qui te sortiront d’affaire à Taïwan. Écoute-les, répète-les, dessine-les, et coche ta checklist de départ.';
  $('#welcome').hidden = false;
  $('#welcome-close').addEventListener('click', () => { $('#welcome').hidden = true; S.welcomed = true; save(); });
})();

/* =====================  Fiche d'un mot  ===================== */
let curId = null, explaining = false;
function openSheet(id) {
  curId = id;
  const w = byId(id);
  TTS.stop(); explaining = false;
  if (Car.running) Car.stop();
  $('#sheet-cat').textContent = w.cat;
  $('#sheet-num').textContent = `${w.id} / ${WORDS.length}`;
  $('#sheet-body').innerHTML = `
    <div class="hero">
      <div class="hero-zh ${sizeClass(w)}" lang="zh-Hant-TW">${esc(w.zh)}</div>
      <div class="hero-read">${readHTML(w, 'both')}</div>
      <div class="hero-fr">${esc(w.fr)}</div>
    </div>
    <div class="act-row">
      <button class="btn blue" id="sh-play"><svg viewBox="0 0 24 24"><use href="#i-sound"/></svg> Écouter</button>
      <button class="btn" id="sh-slow">🐢 Lentement</button>
      <button class="btn primary wide" id="sh-explain">🎧 Explication vocale</button>
    </div>
    <div class="speaking-note" id="sh-note"></div>
    <div class="card"><h3>Ce que ça veut dire</h3><p>${esc(w.note)}</p></div>
    <div class="card"><h3>Pour bien le prononcer</h3><p>${esc(w.pron)}</p></div>
    <div class="card"><h3>Exemple</h3>
      <div class="ex-zh" lang="zh-Hant-TW">${esc(w.ex.zh)}</div>
      <div class="ex-py">${esc(w.ex.py)}</div>
      <div class="ex-fr">${esc(w.ex.fr)}</div>
      <button class="btn" id="sh-ex" style="margin-top:10px;width:100%"><svg viewBox="0 0 24 24"><use href="#i-sound"/></svg> Écouter la phrase</button>
    </div>
    <div class="act-row">
      <button class="btn" id="sh-draw"><svg viewBox="0 0 24 24"><use href="#i-pen"/></svg> Le dessiner</button>
      <button class="btn${S.learned[w.id] ? ' ok' : ''}" id="sh-learned">${S.learned[w.id] ? '✓ Appris' : 'Marquer appris'}</button>
    </div>
    <div class="act-row">
      <button class="btn" id="sh-prev">← Précédent</button>
      <button class="btn" id="sh-next">Suivant →</button>
    </div>`;
  const sheet = $('#sheet'); sheet.hidden = false; sheet.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  TTS.stop(); explaining = false;
  $('#sheet').hidden = true; document.body.style.overflow = '';
  renderList();
}
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-body').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const w = byId(curId), id = b.id;
  const note = $('#sh-note');
  const marks = () => $$('#sheet-body .btn').forEach(x => x.classList.remove('playing'));
  if (id === 'sh-play' || id === 'sh-slow') {
    const my = TTS.begin(); marks(); b.classList.add('playing');
    note.textContent = '';
    await TTS.seq([{ t: w.zh, k: 'zh', r: id === 'sh-slow' ? 0.55 : 0.85 }], my);
    if (my === TTS.token) b.classList.remove('playing');
  } else if (id === 'sh-ex') {
    const my = TTS.begin(); marks(); b.classList.add('playing');
    await TTS.seq([{ t: w.ex.zh, k: 'zh', r: 0.8, gap: 500 }, { t: cleanFr(w.ex.fr), k: 'fr', r: 1 }], my);
    if (my === TTS.token) b.classList.remove('playing');
  } else if (id === 'sh-explain') {
    if (explaining) { TTS.stop(); explaining = false; b.textContent = '🎧 Explication vocale'; note.textContent = ''; return; }
    const my = TTS.begin(); marks(); explaining = true; b.textContent = '⏹ Arrêter';
    note.textContent = 'Lecture en cours…';
    const r = S.set.rate;
    let parts = [{ t: w.zh, k: 'zh', r: 0.6, gap: 700 }];
    parts.push({ t: 'Ça veut dire : ' + cleanFr(w.fr) + '.', k: 'fr', r: 1, gap: 400 });
    parts = parts.concat(mixedParts(w.note, r + 0.1, 500));
    parts = parts.concat(mixedParts('Pour le prononcer : ' + w.pron, r + 0.1, 600));
    parts.push({ t: 'Exemple :', k: 'fr', r: 1, gap: 250 });
    parts.push({ t: w.ex.zh, k: 'zh', r: 0.75, gap: 500 });
    parts.push({ t: cleanFr(w.ex.fr), k: 'fr', r: 1, gap: 500 });
    parts.push({ t: w.zh, k: 'zh', r: 0.7 });
    const ok = await TTS.seq(parts, my);
    if (my === TTS.token) { explaining = false; b.textContent = '🎧 Explication vocale'; note.textContent = ok ? '' : ''; }
  } else if (id === 'sh-learned') {
    S.learned[w.id] = !S.learned[w.id]; if (!S.learned[w.id]) delete S.learned[w.id]; save();
    b.classList.toggle('ok', !!S.learned[w.id]); b.textContent = S.learned[w.id] ? '✓ Appris' : 'Marquer appris';
    updateProgress();
  } else if (id === 'sh-draw') {
    closeSheet(); D.wordId = w.id; D.idx = 0; showTab('draw');
  } else if (id === 'sh-prev') openSheet(w.id === 1 ? WORDS.length : w.id - 1);
  else if (id === 'sh-next') openSheet(w.id === WORDS.length ? 1 : w.id + 1);
});

/* =====================  Mode voiture  ===================== */
const Car = {
  running: false, list: null, i: 0, loopId: 0, wake: null, wl: null,
  options() { return S.set; },
  build() {
    const o = S.set;
    let l = WORDS.filter(w => o.cat === 'all' || w.cat === o.cat);
    if (o.skip) { const f = l.filter(w => !S.learned[w.id]); if (f.length) l = f; }
    if (o.order === 'rand') for (let k = l.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [l[k], l[j]] = [l[j], l[k]]; }
    this.list = l; this.i = 0;
  },
  async start() {
    if (!this.list || !this.list.length) this.build();
    this.running = true; uiCar(); this.lock(); this.session();
    this.loop();
  },
  stop() {
    this.running = false; this.loopId++; TTS.stop(); if (this.wake) this.wake();
    this.unlock(); uiCar(true);
  },
  toggle() { this.running ? this.stop() : this.start(); },
  go(delta) {
    if (!this.list || !this.list.length) this.build();
    this.i = (this.i + delta + this.list.length) % this.list.length;
    if (this.running) { this.loopId++; TTS.stop(); if (this.wake) this.wake(); this.loop(); }
    else { showCar(this.list[this.i], 'ready'); }
  },
  async lock() {
    try { if (S.set.wake && 'wakeLock' in navigator && !this.wl) this.wl = await navigator.wakeLock.request('screen'); } catch (e) { this.wl = null; }
  },
  unlock() { try { this.wl && this.wl.release(); } catch (e) {} this.wl = null; },
  session() {
    if (!('mediaSession' in navigator)) return;
    try {
      const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
      h('play', () => Car.start()); h('pause', () => Car.stop());
      h('nexttrack', () => Car.go(1)); h('previoustrack', () => Car.go(-1));
    } catch (e) {}
  },
  pauseWait(sec, label, id) {          // attente avec compte à rebours, interrompable
    return new Promise(res => {
      let left = sec;
      const step = $('#car-step');
      const tick = () => { if (id !== Car.loopId) return finish(); step.textContent = `${label} ${left}…`; if (left-- <= 0) return finish(); t = setTimeout(tick, 1000); };
      let t; const finish = () => { clearTimeout(t); Car.wake = null; res(); };
      Car.wake = finish; tick();
    });
  },
  async loop() {
    const id = ++this.loopId;
    const alive = () => this.running && id === this.loopId;
    while (alive()) {
      const w = this.list[this.i];
      await this.playWord(w, id);
      if (!alive()) return;
      this.i = (this.i + 1) % this.list.length;
    }
  },
  async playWord(w, id) {
    const o = S.set, my = TTS.begin();
    const alive = () => this.running && id === this.loopId && my === TTS.token;
    const say = async (t, k, r, label) => { if (!alive()) return; $('#car-step').textContent = label || ''; await TTS.speak(t, k, r); };
    const zhR = Math.min(o.rate, 1), frR = Math.min(1.05, o.rate + 0.15);
    try {
      if ('mediaSession' in navigator && window.MediaMetadata)
        navigator.mediaSession.metadata = new MediaMetadata({ title: w.zh + '  ' + plainPy(w), artist: w.fr, album: 'Mandarin de Taïwan' });
    } catch (e) {}
    if (o.mode === 'discover') {
      showCar(w, 'full');
      await say(w.zh, 'zh', zhR, '🔊 Écoute');         if (!alive()) return; await sleep(450);
      await say(cleanFr(w.fr), 'fr', frR, '🔊 Sens');  if (!alive()) return; await sleep(450);
      await say(w.zh, 'zh', zhR, '🔊 Écoute encore');  if (!alive()) return;
      await this.pauseWait(o.pause, '🗣️ À toi de répéter', id); if (!alive()) return;
      if (o.example) {
        await say(w.ex.zh, 'zh', Math.min(zhR, 0.8), '🔊 Exemple'); if (!alive()) return; await sleep(400);
        await say(cleanFr(w.ex.fr), 'fr', frR, '🔊 Traduction');    if (!alive()) return;
        await this.pauseWait(Math.max(2, Math.round(o.pause / 2)), '🗣️ Répète la phrase', id); if (!alive()) return;
      }
    } else {
      showCar(w, 'question');
      await say('Comment dit-on : ' + cleanFr(w.fr) + ' ?', 'fr', frR, '❓ Question'); if (!alive()) return;
      await this.pauseWait(o.pause, '🤔 Réfléchis', id); if (!alive()) return;
      showCar(w, 'full');
      await say(w.zh, 'zh', zhR, '✅ Réponse');           if (!alive()) return; await sleep(900);
      await say(w.zh, 'zh', zhR, '🗣️ Répète');            if (!alive()) return;
      await this.pauseWait(Math.max(2, Math.round(o.pause / 2)), '🗣️ À toi', id); if (!alive()) return;
    }
    if (alive()) await sleep(500);
  }
};
function showCar(w, phase) {
  const z = $('#car-zh');
  z.textContent = phase === 'question' ? '？' : w.zh;
  z.className = 'car-zh ' + (phase === 'question' ? '' : sizeClass(w));
  $('#car-py').textContent = phase === 'question' ? '' : plainPy(w);
  $('#car-fr').textContent = w.fr;
  const n = Car.list ? Car.list.length : WORDS.length;
  $('#car-count').textContent = `Mot ${Car.i + 1} / ${n}`;
  if (phase === 'ready') $('#car-step').textContent = '';
}
function uiCar(stopped) {
  $('#car-play').innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-${Car.running ? 'pause' : 'play'}"/></svg>`;
  if (stopped) $('#car-step').textContent = 'En pause';
}
$('#car-play').addEventListener('click', () => Car.toggle());
$('#car-next').addEventListener('click', () => Car.go(1));
$('#car-prev').addEventListener('click', () => Car.go(-1));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Car.running) Car.lock(); });

function setSeg(sel, key, after) {
  const el = $(sel);
  $$('button', el).forEach(b => b.classList.toggle('on', b.dataset.v === S.set[key]));
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    S.set[key] = b.dataset.v; save();
    $$('button', el).forEach(x => x.classList.toggle('on', x === b));
    if (after) after();
  });
}
function carChanged() { const was = Car.running; if (was) Car.stop(); Car.list = null; Car.i = 0; refreshModeHint(); if (!was) showCar(buildPreview(), 'ready'); }
function buildPreview() { Car.build(); return Car.list[0]; }
function refreshModeHint() {
  $('#car-mode-hint').textContent = S.set.mode === 'discover'
    ? 'Je dis le mot, je donne le sens, puis je te laisse un temps pour répéter.'
    : 'Je te donne le sens en français, tu cherches le mot en chinois, puis je donne la réponse.';
}
(function initCarOptions() {
  const sel = $('#car-cat');
  sel.innerHTML = '<option value="all">Tous les mots (50)</option>' +
    CATS.map(c => `<option value="${esc(c)}">${esc(c)} (${WORDS.filter(w => w.cat === c).length})</option>`).join('');
  sel.value = S.set.cat;
  sel.addEventListener('change', () => { S.set.cat = sel.value; save(); carChanged(); });
  setSeg('#car-mode', 'mode', carChanged);
  setSeg('#car-order', 'order', carChanged);
  const pause = $('#car-pause'), rate = $('#car-rate');
  pause.value = S.set.pause; rate.value = S.set.rate;
  $('#car-pause-val').textContent = S.set.pause; $('#car-rate-val').textContent = fmtRate(S.set.rate);
  pause.addEventListener('input', () => { S.set.pause = +pause.value; $('#car-pause-val').textContent = pause.value; save(); });
  rate.addEventListener('input', () => { S.set.rate = +rate.value; $('#car-rate-val').textContent = fmtRate(rate.value); save(); });
  [['#car-example', 'example'], ['#car-skip', 'skip'], ['#car-wake', 'wake']].forEach(([s, k]) => {
    const el = $(s); el.checked = !!S.set[k];
    el.addEventListener('change', () => { S.set[k] = el.checked; save(); if (k === 'skip') { Car.list = null; } if (k === 'wake') { el.checked ? Car.running && Car.lock() : Car.unlock(); } });
  });
  refreshModeHint();
  Car.build(); showCar(Car.list[0], 'ready');
  $('#car-count').textContent = 'Prêt';
})();

/* =====================  Dessiner  ===================== */
const D = { wordId: 1, idx: 0, writer: null, quizzing: false, size: 0 };
const CHARINFO = {};
WORDS.forEach(w => [...w.zh].forEach((c, i) => { if (!CHARINFO[c]) CHARINFO[c] = { syl: w.syl[i], word: w }; }));

function drawChips() {
  $('#draw-words').innerHTML = WORDS.map(w =>
    `<button class="chip zh${w.id === D.wordId ? ' on' : ''}" data-id="${w.id}" lang="zh-Hant-TW">${esc(w.zh)}</button>`).join('');
  const on = $('#draw-words .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function drawMsg(t, cls) { const m = $('#draw-msg'); m.textContent = t; m.className = 'draw-msg' + (cls ? ' ' + cls : ''); }
function drawEnter() { drawChips(); drawLoad(); }
function drawLoad(mode) {
  if (typeof HanziWriter === 'undefined') { drawMsg('Le module de tracé n’a pas pu se charger.', 'bad'); return; }
  const w = byId(D.wordId), chars = [...w.zh], ch = chars[D.idx] || chars[0];
  const info = CHARINFO[ch];
  $('#draw-py').innerHTML = info ? `<span class="syl t${info.syl.t}"><b>${esc(info.syl.py)}</b> <span class="zy">${esc(info.syl.zy)}</span></span>` : '';
  $('#draw-fr').textContent = `${w.zh} · ${w.fr}`;
  $('#char-tabs').innerHTML = chars.length > 1
    ? chars.map((c, i) => `<button class="char-tab${i === D.idx ? ' on' : ''}" data-i="${i}" lang="zh-Hant-TW">${esc(c)}</button>`).join('') : '';
  const stage = $('#stage');
  stage.innerHTML = '';
  D.quizzing = false;
  const size = Math.round(stage.clientWidth) || 300; D.size = size;
  D.writer = HanziWriter.create(stage, ch, {
    width: size, height: size, padding: Math.round(size * 0.06),
    showOutline: true, showCharacter: true,
    strokeColor: '#26231F', outlineColor: '#DDD0B8', highlightColor: '#B23A2E', drawingColor: '#1F3C6B',
    drawingWidth: Math.max(7, Math.round(size / 30)), strokeAnimationSpeed: 1.1, delayBetweenStrokes: 280,
    charDataLoader: (c, ok, ko) => { window.CHARDATA[c] ? ok(window.CHARDATA[c]) : ko(); }
  });
  drawMsg(mode === 'keep' ? $('#draw-msg').textContent : 'Regarde l’ordre des traits (« Voir les traits »), puis essaie à ton tour.');
}
function drawQuiz(blind) {
  const wr = D.writer; if (!wr) return;
  try { wr.cancelQuiz(); } catch (e) {}
  blind ? wr.hideOutline() : wr.showOutline();
  D.quizzing = true;
  const w = byId(D.wordId), nChars = [...w.zh].length;
  drawMsg('Trace le premier trait avec ton doigt.');
  wr.quiz({
    leniency: 1.4, showHintAfterMisses: 2, highlightOnComplete: true, quizStartStrokeNum: 0,
    onCorrectStroke: d => drawMsg(d.strokesRemaining ? `Bien ! Encore ${d.strokesRemaining} trait${d.strokesRemaining > 1 ? 's' : ''}.` : 'Dernier trait validé !', 'good'),
    onMistake: d => drawMsg(d.mistakesOnStroke >= 2 ? 'Regarde l’indice et réessaie ce trait.' : 'Pas tout à fait — réessaie ce trait.', 'bad'),
    onComplete: d => {
      D.quizzing = false;
      const next = D.idx + 1 < nChars ? ' Passe au caractère suivant ci-dessus.' : '';
      drawMsg((d.totalMistakes === 0 ? 'Bravo, sans aucune erreur !' : `Terminé ! ${d.totalMistakes} erreur${d.totalMistakes > 1 ? 's' : ''}, tu progresses.`) + next, 'good');
    }
  });
}
$('#draw-words').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  D.wordId = +b.dataset.id; D.idx = 0; drawChips(); drawLoad();
});
$('#char-tabs').addEventListener('click', e => {
  const b = e.target.closest('.char-tab'); if (!b) return;
  D.idx = +b.dataset.i; drawLoad();
});
$('#draw-anim').addEventListener('click', () => {
  const wr = D.writer; if (!wr) return;
  try { wr.cancelQuiz(); } catch (e) {}
  D.quizzing = false; wr.showOutline(); drawMsg('Regarde bien l’ordre et le sens de chaque trait…');
  wr.animateCharacter({ onComplete: () => drawMsg('À toi ! Appuie sur « À moi de tracer ».') });
});
$('#draw-quiz').addEventListener('click', () => drawQuiz(false));
$('#draw-blind').addEventListener('click', () => drawQuiz(true));
$('#draw-reset').addEventListener('click', () => { drawLoad(); });
$('#draw-speak').addEventListener('click', async () => {
  const w = byId(D.wordId), my = TTS.begin();
  await TTS.seq([{ t: w.zh, k: 'zh', r: 0.6, gap: 500 }, { t: w.zh, k: 'zh', r: 0.85 }], my);
});
let rz; window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { if ($('#tab-draw').classList.contains('active') && Math.abs($('#stage').clientWidth - D.size) > 12) drawLoad(); }, 250);
});

/* =====================  Checklist  ===================== */
const CHECK = [
  { id: 'docs', title: '📄 Papiers & démarches', items: [
    ['pass', 'Passeport valide (vérifier la durée de validité exigée à l’entrée)'],
    ['visa', 'Visa ou autorisation d’entrée (selon la durée et le motif du séjour)'],
    ['arrival', 'Formulaire d’arrivée en ligne, si exigé (à vérifier sur le site officiel)'],
    ['assur', 'Assurance santé / voyage / rapatriement'],
    ['copies', 'Copies numériques des documents importants (passeport, assurance, billets)'],
    ['permis', 'Permis de conduire : vérifier s’il est valable à Taïwan (traduction ou permis international)']
  ] },
  { id: 'trip', title: '✈️ Voyage & logement', items: [
    ['avion', 'Billets d’avion'],
    ['nuit1', 'Première(s) nuit(s) réservée(s)'],
    ['appart', 'Recherche d’appartement (annonces, visites, contrat)'],
    ['bail', 'Contrat de location lu et compris, dépôt de garantie noté'],
    ['transfert', 'Trajet aéroport → logement prévu (métro, bus ou taxi)']
  ] },
  { id: 'money', title: '💳 Argent & téléphone', items: [
    ['cb', 'Carte bancaire sans frais à l’étranger, banque prévenue'],
    ['cash', 'Un peu de liquide en dollars taïwanais (NT$)'],
    ['sim', 'Carte SIM / eSIM taïwanaise ou forfait international'],
    ['line', 'Application LINE installée (la messagerie la plus utilisée)'],
    ['easy', 'Carte EasyCard (悠遊卡) pour métro, bus et supérettes']
  ] },
  { id: 'bag', title: '🧳 Santé & valise', items: [
    ['sante', 'Médicaments personnels et ordonnances, trousse de base'],
    ['prise', 'Adaptateur de prise (type A/B, 110 V) : vérifier que les chargeurs acceptent 110 V'],
    ['habits', 'Vêtements légers + un imperméable (climat chaud, humide et pluvieux)']
  ] },
  { id: 'there', title: '📍 Une fois sur place', items: [
    ['apps', 'Google Maps et Google Traduction (télécharger le chinois hors-ligne)'],
    ['quartier', 'Repérer le supermarché, la pharmacie et la supérette les plus proches'],
    ['urg', 'Numéros d’urgence en tête : 110 (police), 119 (pompiers / ambulance)'],
    ['arc', 'Séjour long : démarches de titre de séjour (carte de résident) à vérifier sur place'],
    ['mots', 'Apprendre les 50 mots de cette application 🙂']
  ] }
];
function checkTotals() {
  let tot = 0, done = 0;
  CHECK.forEach(g => {
    g.items.forEach(([id]) => { tot++; if (S.checks[id]) done++; });
    (S.custom[g.id] || []).forEach(it => { tot++; if (S.checks[it.id]) done++; });
  });
  return { tot, done };
}
function renderCheck() {
  const el = $('#check-lists');
  el.innerHTML = CHECK.map(g => {
    const cust = S.custom[g.id] || [];
    const all = g.items.map(([id, t]) => ({ id, t, c: false })).concat(cust.map(i => ({ id: i.id, t: i.text, c: true })));
    const done = all.filter(i => S.checks[i.id]).length;
    return `<div class="cl-group" data-g="${g.id}">
      <div class="cl-title"><span>${g.title}</span><small>${done}/${all.length}</small></div>
      <ul class="cl-list">
        ${all.map(i => `<li class="cl-item${S.checks[i.id] ? ' done' : ''}">
            <input type="checkbox" id="c-${i.id}" data-id="${i.id}"${S.checks[i.id] ? ' checked' : ''}>
            <label for="c-${i.id}">${esc(i.t)}</label>
            ${i.c ? `<button class="cl-del" data-del="${i.id}" aria-label="Supprimer">✕</button>` : ''}</li>`).join('')}
        <li class="cl-add"><input type="text" maxlength="120" placeholder="Ajouter une ligne…" data-add="${g.id}"><button data-addbtn="${g.id}">Ajouter</button></li>
      </ul></div>`;
  }).join('');
  const { tot, done } = checkTotals();
  $('#check-bar').style.width = (tot ? done / tot * 100 : 0) + '%';
  $('#check-count').textContent = `${done} sur ${tot} étapes faites`;
}
$('#check-lists').addEventListener('change', e => {
  const c = e.target.closest('input[type=checkbox]'); if (!c) return;
  if (c.checked) S.checks[c.dataset.id] = true; else delete S.checks[c.dataset.id];
  save(); renderCheck();
});
function addCustom(g) {
  const inp = $(`input[data-add="${g}"]`); const t = inp.value.trim(); if (!t) return;
  (S.custom[g] = S.custom[g] || []).push({ id: 'x' + Date.now().toString(36), text: t });
  save(); renderCheck();
  const again = $(`input[data-add="${g}"]`); if (again) again.focus();
}
$('#check-lists').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) { const id = del.dataset.del; Object.keys(S.custom).forEach(g => S.custom[g] = S.custom[g].filter(i => i.id !== id)); delete S.checks[id]; save(); renderCheck(); return; }
  const add = e.target.closest('[data-addbtn]'); if (add) addCustom(add.dataset.addbtn);
});
$('#check-lists').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.add) { e.preventDefault(); addCustom(e.target.dataset.add); } });

/* =====================  Réglages  ===================== */
$('#btn-settings').addEventListener('click', () => { fillVoiceSelects(); $('#settings').hidden = false; document.body.style.overflow = 'hidden'; });
$('#settings-close').addEventListener('click', () => { $('#settings').hidden = true; document.body.style.overflow = ''; TTS.stop(); });
setSeg('#set-script', 'script', () => { renderList(); });
$('#set-voice-zh').addEventListener('change', e => { S.set.zhVoice = e.target.value; save(); fillVoiceSelects(); updateVoiceWarn(); });
$('#set-voice-fr').addEventListener('change', e => { S.set.frVoice = e.target.value; save(); fillVoiceSelects(); });
$('#set-test').addEventListener('click', async () => {
  const my = TTS.begin();
  await TTS.seq([{ t: '你好，歡迎來到台灣！', k: 'zh', r: 0.8, gap: 400 }, { t: 'Bonjour, ceci est un test de la voix française.', k: 'fr', r: 1 }], my);
});
$('#set-reset').addEventListener('click', () => {
  if (!confirm('Remettre à zéro les mots appris et la checklist ?')) return;
  S.learned = {}; S.checks = {}; S.custom = {}; save(); renderList(); renderCheck(); updateProgress();
});

/* =====================  Démarrage  ===================== */
renderChips(); renderList(); renderCheck(); updateProgress();
showTab(S.tab && $('#tab-' + S.tab) ? S.tab : 'learn');
updateVoiceWarn(); fillVoiceSelects();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();

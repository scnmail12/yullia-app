/* 한국어 스튜디오 — single-page PWA, no build step. Data lives in localStorage. */
(function () {
  'use strict';

  const BOOKS = window.COURSE_BOOKS || [];
  const UNITS = BOOKS.flatMap(b => b.units.map(u => Object.assign({ book: b.id }, u)));
  const unitById = id => UNITS.find(u => u.id === id);

  /* ---------- storage ---------- */
  const KEY = 'korean-studio-v1';
  const defaults = () => ({ words: [], students: [], lessons: [], done: {}, scores: {}, current: UNITS[0] ? UNITS[0].id : null, name: '' });
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
    } catch (e) { return defaults(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Не вдалося зберегти дані'); }
    if (window.KSAuth) window.KSAuth.push(S); // sync to the account (Supabase)
  }
  const ME = window.KS_USER || { role: 'teacher', name: '' };
  const isTeacher = ME.role === 'teacher';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const view = $('#view');
  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1800);
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  const unitLabel = u => u.no === 0 ? '한글' : u.no + '과';
  const fullLabel = u => u.no === 0 ? esc(u.title) : u.no + '과 ' + esc(u.title);
  /* answer comparison: same rules as practice.js */
  const norm = s => String(s || '').normalize('NFC').replace(/[\s.?!,~·…'"’‘“”«»()[\]{}​-‍﻿]/g, '').toLowerCase();

  /* Korean text-to-speech.
     Works around: Safari dropping speech when speak() follows cancel() in the same tick,
     voices loading late (iOS returns [] at first), Chrome garbage-collecting utterances,
     and devices with no Korean voice installed (we explain how to add one). */
  const TTS = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let koVoice = null, voicesLoaded = false, liveUtterance = null;
  function pickVoice() {
    if (!TTS) return;
    const vs = TTS.getVoices();
    if (vs.length) voicesLoaded = true;
    const ko = vs.filter(v => /^ko([-_]|$)/i.test(v.lang || ''));
    koVoice = ko.find(v => /yuna|유나|heami|sora|google/i.test(v.name) && v.localService) || ko.find(v => v.localService) || ko[0] || null;
  }
  if (TTS) { pickVoice(); if (TTS.addEventListener) TTS.addEventListener('voiceschanged', pickVoice); else TTS.onvoiceschanged = pickVoice; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function voiceHelp() {
    const how = ios ? 'iPhone/iPad: Параметри → Універсальний доступ → Усний контент → Голоси → Корейська (завантаж). Також вимкни беззвучний режим.'
      : /android/i.test(navigator.userAgent) ? 'Android: Налаштування → Система → Мова → Синтез мовлення → Google → встанови корейську.'
      : 'Windows: Параметри → Час і мова → Мовлення → Додати голоси → Корейська.';
    toast('Немає корейського голосу на пристрої. ' + how, 9000);
  }
  function speak(text, rate) {
    if (!TTS) { toast('Озвучення недоступне в цьому браузері', 3000); return; }
    pickVoice();
    if (voicesLoaded && !koVoice) { voiceHelp(); return; }
    const go = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = rate || 0.85;
      if (koVoice) u.voice = koVoice;
      let started = false;
      u.onstart = () => { started = true; };
      u.onerror = e => { if (!/interrupted|canceled/.test(e.error || '')) toast('Не вдалося відтворити звук (' + (e.error || '?') + ')', 3000); };
      liveUtterance = u;               // keep a reference so it is not garbage-collected mid-speech
      TTS.resume();                    // Chrome sometimes stays "paused"
      TTS.speak(u);
      setTimeout(() => { if (!started && liveUtterance === u && !TTS.speaking) (koVoice ? toast(ios ? 'Звуку немає? Вимкни беззвучний режим і збільш гучність.' : 'Звуку немає? Перевір гучність.', 4000) : voiceHelp()); }, 2500);
    };
    if (TTS.speaking || TTS.pending) { TTS.cancel(); setTimeout(go, 150); } else go();
  }
  window.KS = { speak, toast: (m, ms) => toast(m, ms) };
  const sayBtn = text => `<button class="icon-btn" data-say="${esc(text)}" aria-label="Прослухати" title="Прослухати">🔊</button>`;

  /* ---------- icons ---------- */
  const I = {
    home: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    book: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    gram: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    words: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/></svg>',
    studio: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>',
    gear: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  const NAV = [
    ['home', '나의 공간', 'Головна', I.home, 'Головна'],
    ['course', '코스', 'Курс 1A–1B', I.book, 'Курс'],
    ['grammar', '문법 노트', 'Граматика', I.gram, 'Граматика'],
    ['words', '단어장', 'Мій словник', I.words, 'Словник'],
    ['studio', '스튜디오', 'Учні та уроки', I.studio, 'Учні'],
    ['settings', '설정', 'Налаштування', I.gear, 'Ще']
  ].filter(n => n[0] !== 'studio' || isTeacher);
  $('#nav').innerHTML = NAV.map(([r, ko, uk, ic]) => `<a href="#/${r}" data-r="${r}">${ic}<span><span class="ko">${ko}</span><span class="sub">${uk}</span></span></a>`).join('');
  $('#tabbar').style.gridTemplateColumns = `repeat(${Math.min(NAV.length, 5)}, 1fr)`;
  $('#tabbar').innerHTML = NAV.slice(0, 5).map(([r, ko, uk, ic, short]) => `<a href="#/${r}" data-r="${r}">${ic}<span>${short}</span></a>`).join('');

  /* ---------- router ---------- */
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const [r, arg] = parts;
    const navKey = { unit: 'course', student: 'studio' }[r] || r;
    $$('#nav a, #tabbar a').forEach(a => a.classList.toggle('active', a.dataset.r === navKey));
    view.onclick = null;
    const pages = { home: Home, course: Course, unit: Unit, grammar: Grammar, words: Words, settings: Settings };
    if (isTeacher) Object.assign(pages, { studio: Studio, student: Student });
    const fn = pages[r] || Home;
    view.innerHTML = fn(arg ? decodeURIComponent(arg) : undefined);
    if (fn.after) fn.after(arg);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- Home ---------- */
  function Home() {
    const cur = unitById(S.current) || UNITS[0];
    const doneCount = Object.keys(S.done).filter(k => S.done[k]).length;
    const learned = S.words.filter(w => w.learned).length;
    const nm = S.name || ME.name;
    const hello = nm ? `안녕하세요, ${esc(nm)}!` : '안녕하세요!';
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let hideInstall = false; try { hideInstall = localStorage.getItem('ks-install-hide') === '1'; } catch (e) {}
    const install = standalone || hideInstall ? '' : `
      <div class="card install"><div class="ico-big">📲</div><div class="grow" style="flex:1">
        <h3 style="margin:0 0 4px">Встанови як додаток</h3>
        <p class="small" style="margin:0 0 8px">${ios
          ? 'У Safari натисни «Поділитися» <b>⎙</b> → «На початковий екран». Студія відкриватиметься з іконки, як звичайний додаток.'
          : 'Chrome: меню ⋮ → «Встановити додаток» / «Додати на головний екран».'}</p>
        <button class="btn ghost sm" data-act="hide-install" style="padding:0">Більше не показувати</button></div></div>`;
    const recent = S.lessons.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    return `
      <section class="hero" data-glyph="한">
        <div class="eyebrow">My Korean space</div>
        <div class="big-ko ko">${hello}</div>
        <p class="lead">Твоя корейська, твій темп.</p>
        ${cur ? `<a class="hero-card" href="#/unit/${cur.id}">
          <div class="eyebrow">서울대 한국어 ${cur.book.toUpperCase()} · поточна тема</div>
          <div class="title ko">${cur.no ? unitLabel(cur) + ' ' : ''}${esc(cur.title)}</div>
          <div class="muted">${esc(cur.titleUk)}</div>
          <div class="row" style="margin-top:10px">${(cur.grammar || []).slice(0, 4).map(g => `<span class="chip ko">${esc(g.p)}</span>`).join('')}</div>
        </a>` : ''}
      </section>
      ${install}
      <div class="grid">
        <a class="tile" href="#/course"><div class="num">${doneCount}/${UNITS.length}</div><div class="label">Пройдено розділів</div><div class="muted small">Курс 1A + 1B</div></a>
        <a class="tile" href="#/words"><div class="num">${S.words.length}</div><div class="label">Слів у словнику</div><div class="muted small">${learned} вивчено</div></a>
        <a class="tile" href="#/grammar"><div class="num">${UNITS.reduce((n, u) => n + (u.grammar || []).length, 0)}</div><div class="label">Граматик у зошиті</div><div class="muted small">з поясненнями українською</div></a>
        ${isTeacher ? `<a class="tile" href="#/studio"><div class="num">${S.students.length}</div><div class="label">Учнів</div><div class="muted small">${S.lessons.length} записів уроків</div></a>` : ''}
      </div>
      ${isTeacher ? `<div class="section">
        <div class="spread"><h2>Останні уроки</h2><a href="#/studio" class="btn ghost">Усі →</a></div>
        <div class="card">${recent.length ? `<div class="list">${recent.map(lessonRow).join('')}</div>` : '<div class="empty">Тут з’являться записи занять. Додай учня в розділі «Учні та уроки».</div>'}</div>
      </div>` : ''}
      <div class="section" style="text-align:center"><a class="btn secondary" href="#/settings">${I.gear} Налаштування та акаунт</a></div>`;
  }
  Home.after = function () {
    view.onclick = e => {
      const t = e.target.closest('[data-act="hide-install"]'); if (!t) return;
      try { localStorage.setItem('ks-install-hide', '1'); } catch (err) {}
      t.closest('.install').remove();
    };
  };

  /* ---------- Course ---------- */
  let courseBook = BOOKS[0] ? BOOKS[0].id : '1a';
  function Course(book) {
    if (book) courseBook = book;
    const b = BOOKS.find(x => x.id === courseBook) || BOOKS[0];
    if (!b) return '<div class="empty">Курс ще не завантажено.</div>';
    return `
      <div class="eyebrow">서울대 한국어</div>
      <h1>Курс першого рівня</h1>
      <p class="lead">Послідовність тем і граматики — за 교재 구성표 підручника. Пояснення та вправи — авторські.</p>
      <div class="tabs">${BOOKS.map(x => `<button data-book="${x.id}" class="${x.id === b.id ? 'active' : ''}">${esc(x.title)}</button>`).join('')}</div>
      <p class="muted">${esc(b.subtitle)}</p>
      <div class="unit-list">${b.units.map(u => `
        <a class="unit-item ${S.done[u.id] ? 'done' : ''}" href="#/unit/${u.id}">
          <div class="unit-num ko">${u.no === 0 ? '한' : String(u.no).padStart(2, '0')}</div>
          <div class="grow">
            <div class="t ko">${esc(u.title)}</div>
            <div class="s">${esc(u.titleUk)}${u.grammar ? ' · 문법 ' + u.grammar.length : ''}</div>
          </div>
          ${S.done[u.id] ? '<span class="seal ko" title="Завершено">완</span>' : (S.current === u.id ? '<span class="chip">зараз</span>' : '')}
        </a>`).join('')}
      </div>`;
  }

  /* ---------- Unit ---------- */
  function Unit(id) {
    const u = unitById(id);
    if (!u) return '<div class="empty">Розділ не знайдено. <a href="#/course">До курсу</a></div>';
    const idx = UNITS.indexOf(u);
    const prev = UNITS[idx - 1], next = UNITS[idx + 1];
    const inDict = ko => S.words.some(w => w.ko === ko);
    return `
      <a class="back" href="#/course/${u.book}">← ${u.book.toUpperCase()}</a>
      <section class="hero unit-hero" data-glyph="${esc(u.title.charAt(0))}">
        <div class="issue"><strong>${u.no === 0 ? '00' : String(u.no).padStart(2, '0')}</strong>/ ${UNITS.length - 1} · 서울대 한국어 ${u.book.toUpperCase()}</div>
        <h1 class="ko">${esc(u.title)}</h1>
        <p class="lead" style="margin:0">${esc(u.titleUk)}</p>
      </section>
      <div class="row" style="margin-bottom:20px">
        <button class="btn ${S.done[u.id] ? 'secondary' : ''}" data-act="toggle-done">${S.done[u.id] ? '✓ Розділ пройдено' : 'Позначити як пройдений'}</button>
        ${S.current !== u.id ? '<button class="btn secondary" data-act="set-current">Зробити поточним</button>' : '<span class="chip">Поточний розділ</span>'}
      </div>

      <div class="card">
        <h2>Паспорт розділу</h2>
        <div class="timeline">
          ${u.task ? `<div class="t">과제</div><div><span class="ko">${esc(u.task.ko)}</span><br><span class="muted small">${esc(u.task.uk)}</span></div>` : ''}
          ${u.vocabTopics ? `<div class="t">어휘</div><div>${u.vocabTopics.map(v => `<span class="ko">${esc(v[0])}</span> <span class="muted small">(${esc(v[1])})</span>`).join(', ')}</div>` : ''}
          ${u.grammar ? `<div class="t">문법</div><div class="ko">${u.grammar.map(g => esc(g.p)).join(' · ')}</div>` : ''}
          ${u.pron ? `<div class="t">발음</div><div><span class="ko">${esc(u.pron.ko)}</span> <span class="muted small">— ${esc(u.pron.uk)}</span></div>` : ''}
          ${u.culture ? `<div class="t">문화</div><div><span class="ko">${esc(u.culture.ko)}</span> <span class="muted small">— ${esc(u.culture.uk)}</span></div>` : ''}
        </div>
        ${u.goals ? `<h3 style="margin-top:16px">Після розділу учень уміє</h3><ul class="plain">${u.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
      </div>

      ${u.vocab && u.vocab.length ? `
      <div class="section"><div class="spread"><h2>어휘 · Лексика</h2><button class="btn sm secondary" data-act="add-all">+ Усі в словник</button></div>
        <div class="card"><table class="vocab">${u.vocab.map((v, i) => `
          <tr><td class="k ko">${esc(v[0])}</td><td>${esc(v[1])}</td>
          <td class="a">${sayBtn(v[0])}</td>
          <td class="a"><button class="icon-btn ${inDict(v[0]) ? 'on' : ''}" data-add="${i}" title="До мого словника">${inDict(v[0]) ? '✓' : '+'}</button></td></tr>`).join('')}
        </table></div></div>` : ''}

      ${u.grammar ? `<div class="section"><h2>문법 · Граматика</h2>${u.grammar.map(gramCard).join('')}</div>` : ''}

      ${u.extra ? `<div class="section"><h2>${esc(u.extra.title)}</h2><div class="card">${u.extra.html}</div></div>` : ''}

      ${u.exercises && u.exercises.length ? `
      <div class="section"><div class="spread"><h2>빠른 확인 · Швидкий тест</h2>${S.scores[u.id] != null ? `<span class="muted small">Останній результат: <span class="score">${S.scores[u.id]}%</span></span>` : ''}</div>
        <div class="card paper" id="ex"><div>${u.exercises.map(exItem).join('')}</div>
          <div class="row" style="margin-top:16px"><button class="btn" data-act="check">Перевірити</button><button class="btn secondary" data-act="reset-ex">Заново</button><span id="ex-score" class="score"></span></div>
        </div></div>` : ''}

      <div class="section" id="weekly"></div>
      <div class="section" id="practice"></div>

      ${lessonPlan(u)}

      ${u.homework ? `<div class="section"><h2>숙제 · Домашнє завдання</h2><div class="card"><ol class="plan">${u.homework.map(h => `<li>${esc(h)}</li>`).join('')}</ol></div></div>` : ''}

      <div class="spread section">
        ${prev ? `<a class="btn secondary" href="#/unit/${prev.id}">← <span class="ko">${unitLabel(prev)}</span></a>` : '<span></span>'}
        ${next ? `<a class="btn secondary" href="#/unit/${next.id}"><span class="ko">${unitLabel(next)}</span> →</a>` : ''}
      </div>`;
  }
  Unit.after = function (id) {
    const u = unitById(decodeURIComponent(id || ''));
    if (!u) return;
    mountPractice(u);
    view.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.say) return speak(t.dataset.say);
      if (t.dataset.add != null) {
        const v = u.vocab[+t.dataset.add];
        if (S.words.some(w => w.ko === v[0])) { toast('Вже є у словнику'); return; }
        S.words.unshift({ id: uid(), ko: v[0], uk: v[1], example: '', unitId: u.id, learned: false, at: Date.now() });
        save(); t.classList.add('on'); t.textContent = '✓'; toast('Додано до словника');
        return;
      }
      if (t.classList.contains('opt')) {
        $$('.opt', t.parentNode).forEach(o => o.classList.remove('sel', 'right', 'wrong'));
        t.classList.add('sel'); return;
      }
      const act = t.dataset.act;
      if (act === 'toggle-done') { S.done[u.id] = !S.done[u.id]; save(); route(); }
      if (act === 'set-current') { S.current = u.id; save(); route(); toast('Поточний розділ змінено'); }
      if (act === 'add-all') {
        let n = 0;
        u.vocab.forEach(v => { if (!S.words.some(w => w.ko === v[0])) { S.words.push({ id: uid(), ko: v[0], uk: v[1], example: '', unitId: u.id, learned: false, at: Date.now() }); n++; } });
        save(); route(); toast(n ? `Додано слів: ${n}` : 'Усі слова вже у словнику');
      }
      if (act === 'check') checkEx(u);
      if (act === 'reset-ex') { route(); }
    };
  };

  /* 연습실: textbook/TOPIK-style practice (practice.js + data/practice-*.js) */
  let practiceFilter = 'all';
  const pStore = {
    get: k => (S.pres || {})[k],
    set: (k, v) => { S.pres = S.pres || {}; S.pres[k] = v; save(); }
  };
  const dStore = {
    get: k => (S.drafts || {})[k],
    set: (k, v) => { S.drafts = S.drafts || {}; S.drafts[k] = v; save(); }
  };
  function mountPractice(u, filter) {
    if (filter) practiceFilter = filter;
    mountSet('#practice', (window.PRACTICE || {})[u.id], u.id, {}, f => mountPractice(u, f));
    /* weekly set (data/weekly.js, replaced every week by a scheduled job) */
    const W = window.WEEKLY;
    if (W && W.items && W.items[u.id]) {
      const fmt = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }); } catch (e) { return d; } };
      mountSet('#weekly', W.items[u.id], u.id + '@' + W.week, {
        noFilter: true, title: '이번 주 문제 · Завдання тижня',
        note: `Нові завдання щотижня${W.date ? ' · оновлено ' + fmt(W.date) : ''}.`
      }, () => mountPractice(u));
    } else { const w = $('#weekly', view); if (w) w.remove(); }
  }
  function mountSet(sel, items, key, opts, redraw) {
    const old = $(sel, view);
    if (!old) return;
    if (!window.Practice || !items || !items.length) { old.remove(); return; }
    const box = old.cloneNode(false); // fresh node drops old listeners
    old.replaceWith(box);
    box.innerHTML = window.Practice.render(items, key, pStore, practiceFilter, opts);
    window.Practice.bind(box, items, key, pStore, f => { const y = window.scrollY; redraw(f); window.scrollTo(0, y); }, dStore);
  }

  function gramCard(g) {
    return `<div class="card gram">
      <div class="pattern ko">${esc(g.p)}</div>
      <p>${esc(g.m)}</p>
      ${g.f && g.f.length ? `<div class="forms">${g.f.map(f => `<div class="form-box"><div class="cond">${esc(f[0])}</div><div class="end ko">${esc(f[1])}</div>${f[2] ? `<div class="small ko">${esc(f[2])}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${g.ex && g.ex.length ? `<ul class="examples">${g.ex.map(e => `<li><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="ko" style="flex:1">${esc(e[0])}</span>${sayBtn(e[0])}</span><span class="tr">${esc(e[1])}</span></li>`).join('')}</ul>` : ''}
      ${g.tip ? `<div class="tip">💡 ${esc(g.tip)}</div>` : ''}
    </div>`;
  }

  function exItem(x, i) {
    return `<div class="ex-q" data-i="${i}">
      <div class="ex-prompt ko">${i + 1}. ${esc(x.q)}</div>
      ${x.hint ? `<div class="muted small" style="margin:-4px 0 8px">${esc(x.hint)}</div>` : ''}
      ${x.o ? `<div class="opts">${x.o.map(o => `<button class="opt ko" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
            : `<input type="text" class="ex-input ko" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Відповідь корейською">`}
      <div class="ex-fb"></div>
    </div>`;
  }
  function checkEx(u) {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // commit IME
    let right = 0;
    u.exercises.forEach((x, i) => {
      const box = $(`.ex-q[data-i="${i}"]`, view);
      const fb = $('.ex-fb', box);
      const answers = [x.a].concat(x.alt || []);
      let ok = false;
      if (x.o) {
        const sel = $('.opt.sel', box);
        ok = !!sel && sel.dataset.v === x.a;
        $$('.opt', box).forEach(o => { o.classList.remove('right', 'wrong'); if (o.dataset.v === x.a) o.classList.add('right'); else if (o === sel) o.classList.add('wrong'); });
      } else {
        const inp = $('input', box);
        ok = answers.some(a => norm(a) === norm(inp.value));
        inp.classList.toggle('right', ok); inp.classList.toggle('wrong', !ok);
      }
      fb.className = 'ex-fb ' + (ok ? 'right' : 'wrong');
      fb.innerHTML = ok ? 'Правильно!' : `Правильна відповідь: <b class="ko">${esc(x.a)}</b>${x.why ? ' — ' + esc(x.why) : ''}`;
      if (ok) right++;
    });
    const pct = Math.round(right / u.exercises.length * 100);
    S.scores[u.id] = pct; save();
    $('#ex-score').textContent = `${right} / ${u.exercises.length}`;
  }

  /* Lesson plan: 3 × 60-minute sessions built from the unit's grammar */
  function lessonPlan(u) {
    if (u.lessons) {
      return `<div class="section"><h2>수업 계획 · План занять</h2><div class="card">${u.lessons.map((l, i) => `
        <details class="lesson" ${i === 0 ? 'open' : ''}><summary>Заняття ${i + 1} — ${esc(l.t)}</summary><div><ul class="plain">${l.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></details>`).join('')}</div></div>`;
    }
    if (!u.grammar || !u.grammar.length) return '';
    const g = u.grammar.map(x => x.p);
    const half = Math.ceil(g.length / 2);
    const g1 = g.slice(0, half).join(', '), g2 = g.slice(half).join(', ');
    const voc = (u.vocabTopics || []).map(v => v[0]).join(', ');
    const L = [
      { t: 'Лексика та перша граматика', rows: [['0–5', 'Повторення попереднього розділу'], ['5–20', `Лексика: ${voc}`], ['20–40', `Граматика: ${g1}`], ['40–55', 'Тренування в коротких реченнях і мінідіалогах'], ['55–60', 'Підсумок, домашнє завдання']] },
      { t: 'Друга граматика та застосування', rows: [['0–10', 'Повторення лексики та першої граматики'], ['10–30', `Граматика: ${g2 || g1}`], ['30–40', 'Порівняння з уже вивченим, вправи з розділу'], ['40–55', 'Читання та аудіювання з підручника'], ['55–60', 'Мініперевірка']] },
      { t: 'Закріплення та завдання', rows: [['0–10', `Вимова: ${u.pron ? u.pron.ko : '—'}`], ['10–20', 'Робота над помилками з домашнього завдання'], ['20–45', `Комунікативне завдання: ${u.task ? u.task.ko : '—'}`], ['45–55', `Культура: ${u.culture ? u.culture.ko : '—'}`], ['55–60', 'Підсумкова перевірка розділу']] }
    ];
    return `<div class="section"><h2>수업 계획 · План занять</h2><p class="muted small">3 заняття по 60 хв — орієнтир для індивідуальних онлайн-уроків.</p><div class="card">${L.map((l, i) => `
      <details class="lesson" ${i === 0 ? 'open' : ''}><summary>Заняття ${i + 1} — ${esc(l.t)}</summary><div><div class="timeline">${l.rows.map(r => `<div class="t">${r[0]} хв</div><div class="ko">${esc(r[1])}</div>`).join('')}</div></div></details>`).join('')}</div></div>`;
  }

  /* ---------- Grammar notebook ---------- */
  let gramQuery = '';
  function Grammar() {
    return `
      <div class="eyebrow">문법 노트</div>
      <h1>Граматичний зошит</h1>
      <p class="lead">Усі граматики 1A–1B з поясненнями та прикладами.</p>
      <div class="field"><input type="search" id="gq" placeholder="Пошук: 이에요, минулий час, -고…" value="${esc(gramQuery)}"></div>
      <div id="gram-list">${gramList()}</div>`;
  }
  function gramList() {
    const q = gramQuery.trim().toLowerCase();
    const out = [];
    UNITS.forEach(u => (u.grammar || []).forEach(g => {
      const hay = (g.p + ' ' + g.m + ' ' + (g.ex || []).map(e => e.join(' ')).join(' ')).toLowerCase();
      if (!q || hay.includes(q)) out.push({ u, g });
    }));
    if (!out.length) return '<div class="empty">Нічого не знайдено</div>';
    let last = null, html = '';
    out.forEach(({ u, g }) => {
      if (u !== last) { html += `<h3 class="ko" style="margin-top:24px"><a href="#/unit/${u.id}">${u.book.toUpperCase()} · ${fullLabel(u)}</a></h3>`; last = u; }
      html += gramCard(g);
    });
    return html;
  }
  Grammar.after = function () {
    $('#gq').addEventListener('input', e => { gramQuery = e.target.value; $('#gram-list').innerHTML = gramList(); });
    view.onclick = e => { const t = e.target.closest('[data-say]'); if (t) speak(t.dataset.say); };
  };

  /* ---------- Words ---------- */
  let wordFilter = 'all', wordQuery = '';
  function Words() {
    return `
      <div class="eyebrow">단어장</div>
      <h1>Мій словник</h1>
      <p class="lead">Слова з уроків і власні знахідки — з дорам, пісень, розмов.</p>
      <form class="card" id="wf">
        <div class="form-grid">
          <div class="field"><label for="w-ko">Корейською</label><input type="text" id="w-ko" class="ko" required placeholder="예: 반갑다"></div>
          <div class="field"><label for="w-uk">Переклад</label><input type="text" id="w-uk" required placeholder="радий, приємно"></div>
        </div>
        <div class="field"><label for="w-ex">Приклад (необов’язково)</label><input type="text" id="w-ex" class="ko" placeholder="만나서 반갑습니다."></div>
        <button class="btn" type="submit">+ Додати слово</button>
      </form>
      <div class="row" style="margin:20px 0 12px">
        <div class="tabs" style="margin:0">${[['all', 'Усі'], ['new', 'Вчу'], ['learned', 'Вивчені']].map(([k, l]) => `<button data-wf="${k}" class="${wordFilter === k ? 'active' : ''}">${l}</button>`).join('')}</div>
        <input type="search" id="wq" placeholder="Пошук" value="${esc(wordQuery)}" style="flex:1;min-width:160px">
      </div>
      <div class="card"><div class="list" id="wl">${wordList()}</div></div>`;
  }
  function wordList() {
    const q = wordQuery.trim().toLowerCase();
    const list = S.words.filter(w =>
      (wordFilter === 'all' || (wordFilter === 'learned') === !!w.learned) &&
      (!q || (w.ko + ' ' + w.uk + ' ' + (w.example || '')).toLowerCase().includes(q)));
    if (!list.length) return `<div class="empty">${S.words.length ? 'Нічого не знайдено' : 'Словник порожній. Додай слово вище або натисни «+» біля слів у розділах курсу.'}</div>`;
    return list.map(w => {
      const u = unitById(w.unitId);
      return `<div class="list-item">
        <div class="grow">
          <div class="word-ko ko">${esc(w.ko)}</div>
          <div>${esc(w.uk)}</div>
          ${w.example ? `<div class="word-ex ko">${esc(w.example)}</div>` : ''}
          ${u ? `<a class="small" href="#/unit/${u.id}">${u.book.toUpperCase()} · ${unitLabel(u)}</a>` : '<span class="muted small">моє слово</span>'}
        </div>
        ${sayBtn(w.ko)}
        <button class="icon-btn ${w.learned ? 'on' : ''}" data-learn="${w.id}" title="Вивчено">✓</button>
        <button class="icon-btn" data-del="${w.id}" title="Видалити">×</button>
      </div>`;
    }).join('');
  }
  Words.after = function () {
    $('#wf').addEventListener('submit', e => {
      e.preventDefault();
      const ko = $('#w-ko').value.trim(), uk = $('#w-uk').value.trim();
      if (!ko || !uk) return;
      S.words.unshift({ id: uid(), ko, uk, example: $('#w-ex').value.trim(), unitId: null, learned: false, at: Date.now() });
      save(); e.target.reset(); $('#wl').innerHTML = wordList(); toast('Слово додано'); $('#w-ko').focus();
    });
    $('#wq').addEventListener('input', e => { wordQuery = e.target.value; $('#wl').innerHTML = wordList(); });
    view.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.say) return speak(t.dataset.say);
      if (t.dataset.wf) { wordFilter = t.dataset.wf; route(); }
      if (t.dataset.learn) { const w = S.words.find(x => x.id === t.dataset.learn); w.learned = !w.learned; save(); $('#wl').innerHTML = wordList(); }
      if (t.dataset.del) { if (confirm('Видалити це слово?')) { S.words = S.words.filter(x => x.id !== t.dataset.del); save(); $('#wl').innerHTML = wordList(); } }
    };
  };

  /* ---------- Studio (teacher) ---------- */
  const unitOptions = sel => BOOKS.map(b => `<optgroup label="${esc(b.title)}">${b.units.map(u => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${fullLabel(u)}</option>`).join('')}</optgroup>`).join('');
  function lessonRow(l) {
    const st = S.students.find(s => s.id === l.studentId);
    const u = unitById(l.unitId);
    return `<div class="list-item">
      <div class="grow">
        <div class="lesson-date">${fmtDate(l.date)}${st ? ' · ' + esc(st.name) : ''}</div>
        <div class="ko" style="font-weight:700">${u ? fullLabel(u) : ''}${l.topic ? ' — ' + esc(l.topic) : ''}</div>
        ${l.notes ? `<div class="small">${esc(l.notes)}</div>` : ''}
        ${l.homework ? `<div class="small muted">숙제: ${esc(l.homework)}</div>` : ''}
      </div>
      ${l.homework ? `<span class="chip ${l.hwDone ? 'ok' : 'todo'}">${l.hwDone ? 'ДЗ ✓' : 'ДЗ'}</span>` : ''}
    </div>`;
  }
  function Studio() {
    return `
      <div class="eyebrow">Teacher Studio</div>
      <h1>Учні та уроки</h1>
      <p class="lead">Доступ до додатка, картки учнів, журнал занять і домашні завдання.</p>
      ${window.KSAuth ? `<div class="section" style="margin-top:0"><div class="spread"><h2>Доступ · Хто може користуватися</h2></div><div class="card" id="access"><div class="empty">Завантаження…</div></div></div>` : ''}
      <form class="card" id="sf">
        <h3>Новий учень</h3>
        <div class="form-grid">
          <div class="field"><label for="s-name">Ім’я</label><input type="text" id="s-name" required placeholder="Марія"></div>
          <div class="field"><label for="s-unit">Поточний розділ</label><select id="s-unit">${unitOptions(UNITS[1] && UNITS[1].id)}</select></div>
        </div>
        <button class="btn" type="submit">+ Додати учня</button>
      </form>
      <div class="section"><h2>Мої учні</h2>
        <div class="card">${S.students.length ? `<div class="list">${S.students.map(s => {
          const u = unitById(s.unitId);
          const n = S.lessons.filter(l => l.studentId === s.id).length;
          return `<a class="list-item" href="#/student/${s.id}" style="color:inherit">
            <div class="avatar">${esc(s.name.slice(0, 1).toUpperCase())}</div>
            <div class="grow"><div style="font-weight:700">${esc(s.name)}</div>
              <div class="muted small ko">${u ? u.book.toUpperCase() + ' · ' + fullLabel(u) : ''} · уроків: ${n}</div></div>
            <span class="muted">›</span></a>`;
        }).join('')}</div>` : '<div class="empty">Поки немає учнів</div>'}</div>
      </div>
      <p class="muted small">Журнал синхронізується з твоїм акаунтом.</p>`;
  }
  const STATUS = { pending: ['Очікує', 'todo'], approved: ['Має доступ', 'ok'], blocked: ['Заблоковано', ''] };
  async function drawAccess() {
    const box = $('#access'); if (!box) return;
    try {
      const list = await window.KSAuth.listProfiles();
      const order = { pending: 0, approved: 1, blocked: 2 };
      list.sort((a, b) => order[a.status] - order[b.status]);
      const pend = list.filter(p => p.status === 'pending').length;
      box.innerHTML = `${pend ? `<div class="note" style="margin-bottom:8px">Нових запитів: <b>${pend}</b></div>` : ''}<div class="list">${list.map(p => `
        <div class="list-item">
          <div class="avatar">${esc((p.name || p.email || '?').slice(0, 1).toUpperCase())}</div>
          <div class="grow"><div style="font-weight:700">${esc(p.name || '—')}${p.role === 'teacher' ? ' <span class="chip">вчитель</span>' : ''}</div>
            <div class="muted small">${esc(p.email)} · ${fmtDate(String(p.created_at).slice(0, 10))}</div></div>
          ${p.id === ME.id ? '' : `<div class="row" style="gap:6px;justify-content:flex-end">
            <span class="chip ${STATUS[p.status][1]}">${STATUS[p.status][0]}</span>
            ${p.status !== 'approved' ? `<button class="btn sm" data-acc="approved" data-id="${p.id}">Схвалити</button>` : ''}
            ${p.status !== 'blocked' ? `<button class="btn sm danger" data-acc="blocked" data-id="${p.id}">${p.status === 'pending' ? 'Відхилити' : 'Заблокувати'}</button>` : ''}
          </div>`}
        </div>`).join('')}</div>
        <p class="muted small" style="margin:12px 0 0">Надішли учням посилання на додаток: вони реєструються, а ти схвалюєш їх тут.</p>`;
    } catch (e) { box.innerHTML = '<div class="empty">Не вдалося завантажити список. Перевір інтернет.</div>'; }
  }
  Studio.after = function () {
    if (window.KSAuth) {
      drawAccess();
      $('#access').addEventListener('click', async e => {
        const b = e.target.closest('[data-acc]'); if (!b) return;
        if (b.dataset.acc === 'blocked' && !confirm('Закрити доступ цьому користувачу?')) return;
        b.disabled = true;
        try { await window.KSAuth.setStatus(b.dataset.id, b.dataset.acc); toast(b.dataset.acc === 'approved' ? 'Доступ надано' : 'Доступ закрито'); }
        catch (err) { toast('Помилка: ' + err.message); }
        drawAccess();
      });
    }
    $('#sf').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#s-name').value.trim(); if (!name) return;
      S.students.push({ id: uid(), name, unitId: $('#s-unit').value, notes: '', at: Date.now() });
      save(); route(); toast('Учня додано');
    });
  };

  function Student(id) {
    const s = S.students.find(x => x.id === id);
    if (!s) return '<div class="empty">Учня не знайдено. <a href="#/studio">Назад</a></div>';
    const lessons = S.lessons.filter(l => l.studentId === id).sort((a, b) => b.date.localeCompare(a.date));
    const u = unitById(s.unitId);
    return `
      <a class="back" href="#/studio">← Учні</a>
      <div class="row" style="margin-bottom:16px"><div class="avatar" style="width:56px;height:56px;font-size:1.3rem">${esc(s.name.slice(0, 1).toUpperCase())}</div>
        <div><h1 style="margin:0">${esc(s.name)}</h1>${u ? `<a class="ko" href="#/unit/${u.id}">${u.book.toUpperCase()} · ${fullLabel(u)}</a>` : ''}</div></div>
      <div class="card">
        <div class="field"><label for="st-unit">Поточний розділ</label><select id="st-unit">${unitOptions(s.unitId)}</select></div>
        <div class="field"><label for="st-notes">Нотатки викладача</label><textarea id="st-notes" placeholder="Сильні сторони, типові помилки, цілі…">${esc(s.notes)}</textarea></div>
        <div class="row"><button class="btn secondary" data-act="save-st">Зберегти</button><button class="btn danger sm" data-act="del-st">Видалити учня</button></div>
      </div>
      <form class="card section" id="lf">
        <h3>Запис уроку</h3>
        <div class="form-grid">
          <div class="field"><label for="l-date">Дата</label><input type="date" id="l-date" value="${today()}" required></div>
          <div class="field"><label for="l-unit">Розділ</label><select id="l-unit">${unitOptions(s.unitId)}</select></div>
        </div>
        <div class="field"><label for="l-topic">Що проходили</label><input type="text" id="l-topic" class="ko" placeholder="N은/는, N이에요/예요"></div>
        <div class="field"><label for="l-notes">Нотатки</label><textarea id="l-notes" placeholder="Як пройшло заняття, що повторити"></textarea></div>
        <div class="field"><label for="l-hw">Домашнє завдання</label><input type="text" id="l-hw" placeholder="Написати 6 речень з 이에요/예요"></div>
        <button class="btn" type="submit">+ Зберегти урок</button>
      </form>
      <div class="section"><h2>Історія уроків</h2>
        <div class="card">${lessons.length ? lessons.map(l => `<div class="list-item"><div class="grow">${lessonRow(l).replace(/^<div class="list-item">|<\/div>$/g, '')}</div>
          <div class="row" style="flex-direction:column;gap:6px">${l.homework ? `<button class="btn sm ${l.hwDone ? 'secondary' : ''}" data-hw="${l.id}">${l.hwDone ? 'ДЗ ✓' : 'ДЗ виконано'}</button>` : ''}<button class="icon-btn" data-dl="${l.id}" title="Видалити">×</button></div></div>`).join('') : '<div class="empty">Ще немає записів</div>'}</div>
      </div>`;
  }
  Student.after = function (id) {
    const s = S.students.find(x => x.id === decodeURIComponent(id || '')); if (!s) return;
    $('#lf').addEventListener('submit', e => {
      e.preventDefault();
      S.lessons.push({ id: uid(), studentId: s.id, date: $('#l-date').value, unitId: $('#l-unit').value, topic: $('#l-topic').value.trim(), notes: $('#l-notes').value.trim(), homework: $('#l-hw').value.trim(), hwDone: false });
      s.unitId = $('#l-unit').value;
      save(); route(); toast('Урок збережено');
    });
    view.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.act === 'save-st') { s.unitId = $('#st-unit').value; s.notes = $('#st-notes').value; save(); route(); toast('Збережено'); }
      if (t.dataset.act === 'del-st' && confirm(`Видалити учня ${s.name} та всі його уроки?`)) {
        S.students = S.students.filter(x => x.id !== s.id); S.lessons = S.lessons.filter(l => l.studentId !== s.id); save(); location.hash = '#/studio';
      }
      if (t.dataset.hw) { const l = S.lessons.find(x => x.id === t.dataset.hw); l.hwDone = !l.hwDone; save(); route(); }
      if (t.dataset.dl && confirm('Видалити цей запис уроку?')) { S.lessons = S.lessons.filter(x => x.id !== t.dataset.dl); save(); route(); }
    };
  };

  /* ---------- Settings ---------- */
  function Settings() {
    return `
      <div class="eyebrow">설정</div>
      <h1>Налаштування</h1>
      ${window.KSAuth ? `<div class="card"><h3>Акаунт</h3>
        <p style="margin:0 0 12px">${esc(ME.name || '')} <span class="muted">· ${esc(ME.email || '')}</span>${isTeacher ? ' <span class="chip">вчитель</span>' : ''}</p>
        <p class="muted small">Словник, результати та нотатки зберігаються в акаунті — вони однакові на телефоні, iPad і комп’ютері.</p>
        <button class="btn secondary" data-act="logout">Вийти</button></div>` : ''}
      <div class="card">
        <div class="field"><label for="nm">Як до тебе звертатися</label><input type="text" id="nm" value="${esc(S.name)}" placeholder="율리아"></div>
        <button class="btn secondary" data-act="name">Зберегти</button>
      </div>
      <div class="card">
        <h3>Тема оформлення</h3>
        <div class="tabs" style="margin:0">${[['', 'Як у системі'], ['light', 'Світла'], ['dark', 'Темна']].map(([k, l]) => `<button data-theme-set="${k}" class="${(document.documentElement.dataset.theme || '') === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="card">
        <h3>Резервна копія</h3>
        <p class="muted small">Файл із твоїми даними (словник, ${isTeacher ? 'учні, уроки, ' : ''}прогрес) — на всяк випадок.</p>
        <div class="row"><button class="btn" data-act="export">Зберегти копію (.json)</button>
          <label class="btn secondary" style="cursor:pointer">Відновити з файлу<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
      </div>
      <div class="card">
        <h3>Встановити як додаток</h3>
        <p class="small"><b>iPhone / iPad:</b> відкрий сайт у Safari → «Поділитися» → «На початковий екран».</p>
        <p class="small"><b>Android:</b> Chrome → меню ⋮ → «Додати на головний екран».</p>
        <p class="small" style="margin:0"><b>Комп’ютер:</b> Chrome / Edge → значок встановлення в адресному рядку.</p>
      </div>
      <div class="card"><h3>Скинути все</h3><p class="muted small">Видаляє всі твої дані (словник, результати${isTeacher ? ', учнів і уроки' : ''}) — і в акаунті теж.</p><button class="btn danger" data-act="reset">Скинути дані</button></div>`;
  }
  Settings.after = function () {
    view.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.themeSet != null) {
        const th = t.dataset.themeSet;
        if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme;
        try { th ? localStorage.setItem('korean-studio-theme', th) : localStorage.removeItem('korean-studio-theme'); } catch (e) {}
        route(); return;
      }
      const act = t.dataset.act;
      if (act === 'logout' && confirm('Вийти з акаунта на цьому пристрої?')) return window.KSAuth.logout();
      if (act === 'name') { S.name = $('#nm').value.trim(); save(); toast('Збережено'); }
      if (act === 'export') {
        const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `korean-studio-${today()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      if (act === 'reset' && confirm('Точно видалити всі дані? Це не можна скасувати.')) { S = defaults(); save(); toast('Дані скинуто'); route(); }
    };
    $('#imp').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d || !Array.isArray(d.words)) throw new Error();
          if (!confirm('Замінити поточні дані даними з файлу?')) return;
          S = Object.assign(defaults(), d); save(); toast('Дані відновлено'); route();
        } catch (err) { toast('Файл не схожий на копію 한국어 스튜디오'); }
      };
      r.readAsText(f);
    });
  };

  /* course tab switch (delegated, works on Course view) */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]');
    if (b) { courseBook = b.dataset.book; route(); }
  });

  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  route();
})();

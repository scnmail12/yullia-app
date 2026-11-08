/* 연습실 — textbook- and TOPIK-style practice items.
   Types: match, tf, dlg, ord, ls, rd, ox, wr (see data/PRACTICE_SCHEMA.md). */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFC').replace(/[\s.?!,~·…'"’‘“”«»()[\]{}​-‍﻿]/g, '').toLowerCase();
  const okText = (val, a, alt) => [a].concat(alt || []).some(x => norm(x) === norm(val));
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const say = (t, slow) => window.KS && window.KS.speak(t, slow ? 0.6 : 0.85);
  const field = (attrs) => `<input type="text" class="ex-input p-in ko" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" ${attrs || ''}>`;

  const TYPE = {
    match: ['짝 맞추기', 'Знайди пари'], tf: ['보기와 같이', 'Зроби за зразком'], dlg: ['대화 완성', 'Доповни діалог'],
    ord: ['문장 만들기', 'Склади речення'], ls: ['듣기', 'Аудіювання'], rd: ['읽기', 'Читання'],
    ox: ['O / X', 'Правда чи ні'], wr: ['쓰기', 'Письмо']
  };
  const FILTERS = [['all', 'Усі'], ['wb', 'Робочий зошит'], ['topik', 'TOPIK'], ['skills', 'Читання й аудіювання']];
  const inFilter = (it, f) => f === 'all' || (f === 'wb' && /^WB/.test(it.src || '')) || (f === 'topik' && /TOPIK/.test(it.src || '')) || (f === 'skills' && /(듣기|읽기)/.test(it.src || ''));

  /* ---------- render ---------- */
  function body(it, i) {
    switch (it.t) {
      case 'match': {
        const right = shuffle(it.p.map((p, k) => [p[1], k]));
        return `<div class="match"><div class="mcol">${it.p.map((p, k) => `<button class="mbtn ko" data-side="l" data-k="${k}">${esc(p[0])}</button>`).join('')}</div>
          <div class="mcol">${right.map(([txt, k]) => `<button class="mbtn" data-side="r" data-k="${k}">${esc(txt)}</button>`).join('')}</div></div>`;
      }
      case 'tf':
        return `<div class="bogi"><span class="bogi-tag ko">보기</span><span class="ko">${esc(it.ex[0])}</span><span class="arrow">→</span><b class="ko">${esc(it.ex[1])}</b></div>
          ${it.it.map((x, k) => `<div class="tf-row" data-k="${k}"><div class="ko cue">${k + 1}) ${esc(x.c)}</div>${field()}<div class="ex-fb"></div></div>`).join('')}`;
      case 'dlg':
        return `<div class="dlg">${it.ln.map((l, k) => {
          let x = esc(l.x);
          if (l.a != null || l.o) {
            const ctl = l.o ? `<select class="p-sel ko" data-k="${k}"><option value="">—</option>${l.o.map(o => `<option>${esc(o)}</option>`).join('')}</select>` : field(`data-k="${k}" style="width:auto;min-width:110px;display:inline-block"`);
            x = x.replace('___', ctl);
          }
          return `<div class="dl ${l.s === 'A' ? 'a' : 'b'}"><span class="sp">${esc(l.s)}</span><div class="ko bubble">${x}${l.a == null && !l.o ? ` <button class="say-mini" data-say="${esc(l.x)}" aria-label="Прослухати">🔊</button>` : ''}</div></div>`;
        }).join('')}</div><div class="ex-fb"></div>`;
      case 'ord': {
        const tiles = shuffle(it.tk.concat(it.dx || []));
        return `<div class="ord-ans" aria-label="Твоє речення"><span class="muted small ph">Натискай слова по черзі…</span></div>
          <div class="ord-pool">${tiles.map((t, k) => `<button class="tile-w ko" data-w="${esc(t)}" data-k="${k}">${esc(t)}</button>`).join('')}</div><div class="ex-fb"></div>`;
      }
      case 'ls':
        return `<div class="row" style="margin-bottom:12px"><button class="btn sm p-play">🔊 Слухати</button><button class="btn sm secondary p-slow">🐢 Повільно</button><button class="btn ghost sm p-show">Показати текст</button></div>
          <div class="ls-text ko muted" hidden>${esc(it.say)}</div>
          ${it.m === 'dict' ? field('placeholder="Запиши, що почув(-ла)"') : `<div class="opts col">${it.o.map((o, k) => `<button class="popt ko" data-k="${k}">${k + 1}. ${esc(o)}</button>`).join('')}</div>`}<div class="ex-fb"></div>`;
      case 'rd':
        return `<div class="passage ko">${esc(it.txt)}</div>
          ${it.gl ? `<div class="gloss small">${Object.keys(it.gl).map(k => `<span><b class="ko">${esc(k)}</b> — ${esc(it.gl[k])}</span>`).join('')}</div>` : ''}
          ${it.qs.map((q, k) => `<div class="rq" data-k="${k}"><div class="ex-prompt ko">${k + 1}. ${esc(q.q)}</div><div class="opts col">${q.o.map((o, j) => `<button class="popt ko" data-j="${j}">${'①②③④'[j] || j + 1} ${esc(o)}</button>`).join('')}</div><div class="ex-fb"></div></div>`).join('')}`;
      case 'ox':
        return `${it.txt ? `<div class="passage ko">${esc(it.txt)}</div>` : ''}${it.say ? `<div class="row" style="margin-bottom:12px"><button class="btn sm p-play">🔊 Слухати</button><button class="btn sm secondary p-slow">🐢 Повільно</button></div>` : ''}
          ${it.s.map((s, k) => `<div class="ox-row" data-k="${k}"><span class="ko grow">${esc(s[0])}</span><button class="oxb" data-v="1">O</button><button class="oxb" data-v="0">X</button></div>`).join('')}<div class="ex-fb"></div>`;
      case 'wr':
        return `${it.use ? `<div class="row" style="margin-bottom:10px">${it.use.map(u => `<span class="chip ko">${esc(u)}</span>`).join('')}</div>` : ''}
          <textarea class="ko p-wr" placeholder="Пиши тут корейською…"></textarea>
          ${it.chk ? `<div class="chk">${it.chk.map(c => `<label><input type="checkbox"> ${esc(c)}</label>`).join('')}</div>` : ''}
          <div class="model" hidden><div class="eyebrow">모범 답안 · Зразок</div><div class="ko">${esc(it.model)}</div></div>`;
    }
    return '';
  }

  function render(items, unitId, store, filter, opts) {
    if (!items || !items.length) return '';
    opts = opts || {};
    filter = opts.noFilter ? 'all' : (filter || 'all');
    const res = store.get(unitId) || {};
    const graded = items.filter(x => x.t !== 'wr');
    const done = graded.filter(x => res[items.indexOf(x)] != null).length;
    return `<div class="spread"><h2>${opts.title || '연습실 · Практика'}</h2><span class="muted small">Виконано: <b>${done}/${graded.length}</b></span></div>
      <p class="muted small">${opts.note || 'Формати як у робочому зошиті 서울대 한국어 і в TOPIK I. Завдання авторські.'}</p>
      ${opts.noFilter ? '' : `<div class="tabs p-filter">${FILTERS.map(([k, l]) => `<button data-pf="${k}" class="${k === filter ? 'active' : ''}">${l}</button>`).join('')}</div>`}
      ${items.map((it, i) => !inFilter(it, filter) ? '' : `
        <div class="card pitem" data-i="${i}" data-t="${it.t}">
          <div class="spread p-head"><span class="eyebrow" style="margin:0">${String(i + 1).padStart(2, '0')} · ${TYPE[it.t] ? TYPE[it.t][0] + ' · ' + TYPE[it.t][1] : it.t}</span>
            <span class="row" style="gap:6px">${res[i] != null ? `<span class="chip ${res[i] >= 100 ? 'ok' : 'todo'}">${res[i]}%</span>` : ''}${it.src ? `<span class="chip ko">${esc(it.src)}</span>` : ''}</span></div>
          <div class="ex-prompt ko">${esc(it.q)}</div>
          ${it.uk ? `<div class="muted small" style="margin:-4px 0 12px">${esc(it.uk)}</div>` : ''}
          <div class="p-body">${body(it, i)}</div>
          <div class="row p-foot">
            ${it.t === 'wr' ? '<button class="btn sm" data-p="model">Показати зразок</button><button class="btn sm secondary" data-p="copy">Скопіювати для вчителя</button>'
              : it.t === 'match' ? '<button class="btn sm secondary" data-p="reset">Заново</button>'
              : '<button class="btn sm" data-p="check">Перевірити</button><button class="btn sm secondary" data-p="reset">Заново</button>'}
            <span class="score p-score"></span>
          </div>
        </div>`).join('')}`;
  }

  /* ---------- behaviour ---------- */
  function fb(el, ok, right) {
    if (!el) return;
    el.className = 'ex-fb ' + (ok ? 'right' : 'wrong');
    el.innerHTML = ok ? 'Правильно!' : (right != null ? `Правильно: <b class="ko">${esc(right)}</b>` : 'Є помилки — спробуй ще.');
  }

  function bind(root, items, unitId, store, rerender, draftStore) {
    if (!root) return;
    root.addEventListener('click', e => {
      e.stopPropagation();
      const pf = e.target.closest('[data-pf]');
      if (pf) return rerender(pf.dataset.pf);
      const card = e.target.closest('.pitem'); if (!card) { const s0 = e.target.closest('[data-say]'); if (s0) say(s0.dataset.say); return; }
      const i = +card.dataset.i, it = items[i];
      const t = e.target.closest('button'); if (!t) return;
      const score = pct => { const r = store.get(unitId) || {}; r[i] = pct; store.set(unitId, r); card.querySelector('.p-score').textContent = pct + '%'; };

      if (t.dataset.say) return say(t.dataset.say);
      if (t.classList.contains('p-play')) return say(it.say);
      if (t.classList.contains('p-slow')) return say(it.say, true);
      if (t.classList.contains('p-show')) { const x = card.querySelector('.ls-text'); x.hidden = !x.hidden; return; }
      if (t.dataset.p === 'reset') return rerender(null);

      /* match */
      if (t.classList.contains('mbtn')) {
        if (t.disabled) return;
        const side = t.dataset.side;
        card.querySelectorAll(`.mbtn[data-side="${side}"]`).forEach(b => b.classList.remove('sel'));
        t.classList.add('sel');
        const l = card.querySelector('.mbtn.sel[data-side="l"]'), r = card.querySelector('.mbtn.sel[data-side="r"]');
        if (l && r) {
          card._tries = (card._tries || 0) + 1;
          if (l.dataset.k === r.dataset.k) {
            [l, r].forEach(b => { b.classList.remove('sel'); b.classList.add('right'); b.disabled = true; });
          } else {
            card._miss = (card._miss || 0) + 1;
            [l, r].forEach(b => { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong', 'sel'), 450); });
          }
          if (card.querySelectorAll('.mbtn.right').length === it.p.length * 2) {
            const pct = Math.max(0, Math.round((it.p.length - (card._miss || 0)) / it.p.length * 100));
            score(pct);
          }
        }
        return;
      }
      /* ord tiles */
      if (t.classList.contains('tile-w')) {
        const ans = card.querySelector('.ord-ans'), pool = card.querySelector('.ord-pool');
        const ph = ans.querySelector('.ph'); if (ph) ph.remove();
        (t.parentNode === pool ? ans : pool).appendChild(t);
        return;
      }
      /* choice buttons (ls pick, rd) */
      if (t.classList.contains('popt')) {
        t.parentNode.querySelectorAll('.popt').forEach(o => o.classList.remove('sel', 'right', 'wrong'));
        t.classList.add('sel'); return;
      }
      if (t.classList.contains('oxb')) {
        t.parentNode.querySelectorAll('.oxb').forEach(o => o.classList.remove('sel', 'right', 'wrong'));
        t.classList.add('sel'); return;
      }
      /* writing */
      if (t.dataset.p === 'model') { const m = card.querySelector('.model'); m.hidden = !m.hidden; t.textContent = m.hidden ? 'Показати зразок' : 'Сховати зразок'; return; }
      if (t.dataset.p === 'copy') {
        const txt = `${it.q}\n\n${card.querySelector('.p-wr').value}`;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => window.KS.toast('Скопійовано — встав у чат з учителем'), () => window.KS.toast('Не вдалося скопіювати'));
        return;
      }
      if (t.dataset.p !== 'check') return;
      /* commit any unfinished Korean IME syllable before reading the inputs */
      if (document.activeElement && card.contains(document.activeElement) && document.activeElement.blur) document.activeElement.blur();

      /* ---- check ---- */
      let right = 0, total = 0;
      if (it.t === 'tf') {
        card.querySelectorAll('.tf-row').forEach(row => {
          const x = it.it[+row.dataset.k], inp = row.querySelector('input'), ok = okText(inp.value, x.a, x.alt);
          inp.classList.toggle('right', ok); inp.classList.toggle('wrong', !ok); fb(row.querySelector('.ex-fb'), ok, x.a);
          total++; if (ok) right++;
        });
      } else if (it.t === 'dlg') {
        const wrong = [];
        it.ln.forEach((l, k) => {
          if (l.a == null && !l.o) return;
          const el = card.querySelector(`[data-k="${k}"]`);
          const ok = okText(el.value, l.a, l.alt);
          el.classList.toggle('right', ok); el.classList.toggle('wrong', !ok);
          total++; if (ok) right++; else wrong.push(l.a);
        });
        fb(card.querySelector('.p-body > .ex-fb'), !wrong.length, wrong.length ? wrong.join(' · ') : null);
      } else if (it.t === 'ord') {
        const val = Array.from(card.querySelectorAll('.ord-ans .tile-w')).map(b => b.dataset.w).join(' ');
        const ok = it.a.some(a => norm(a) === norm(val));
        total = 1; right = ok ? 1 : 0;
        card.querySelector('.ord-ans').classList.toggle('right', ok); card.querySelector('.ord-ans').classList.toggle('wrong', !ok);
        fb(card.querySelector('.p-body > .ex-fb'), ok, it.a[0]);
      } else if (it.t === 'ls') {
        total = 1;
        if (it.m === 'dict') {
          const inp = card.querySelector('input'), ok = okText(inp.value, it.a, it.alt);
          inp.classList.toggle('right', ok); inp.classList.toggle('wrong', !ok); right = ok ? 1 : 0;
          fb(card.querySelector('.p-body > .ex-fb'), ok, it.a);
        } else {
          const sel = card.querySelector('.popt.sel'), ok = !!sel && +sel.dataset.k === it.a; right = ok ? 1 : 0;
          card.querySelectorAll('.popt').forEach(o => { if (+o.dataset.k === it.a) o.classList.add('right'); else if (o === sel) o.classList.add('wrong'); });
          fb(card.querySelector('.p-body > .ex-fb'), ok, null);
          card.querySelector('.ls-text').hidden = false;
        }
      } else if (it.t === 'rd') {
        card.querySelectorAll('.rq').forEach(rq => {
          const q = it.qs[+rq.dataset.k], sel = rq.querySelector('.popt.sel'), ok = !!sel && +sel.dataset.j === q.a;
          rq.querySelectorAll('.popt').forEach(o => { if (+o.dataset.j === q.a) o.classList.add('right'); else if (o === sel) o.classList.add('wrong'); });
          fb(rq.querySelector('.ex-fb'), ok, null); total++; if (ok) right++;
        });
      } else if (it.t === 'ox') {
        card.querySelectorAll('.ox-row').forEach(row => {
          const want = it.s[+row.dataset.k][1] ? '1' : '0', sel = row.querySelector('.oxb.sel'), ok = !!sel && sel.dataset.v === want;
          row.querySelectorAll('.oxb').forEach(o => { if (o.dataset.v === want) o.classList.add('right'); else if (o === sel) o.classList.add('wrong'); });
          total++; if (ok) right++;
        });
        fb(card.querySelector('.p-body > .ex-fb'), right === total, null);
      }
      score(Math.round(right / Math.max(total, 1) * 100));
    });

    /* writing drafts */
    root.querySelectorAll('.pitem[data-t="wr"]').forEach(card => {
      const key = unitId + ':' + card.dataset.i, ta = card.querySelector('.p-wr');
      ta.value = draftStore.get(key) || '';
      ta.addEventListener('input', () => draftStore.set(key, ta.value));
    });
    /* dictation/choice selects need no handler; Enter in inputs triggers check */
    root.addEventListener('keydown', e => {
      /* Enter while the IME is still composing (e.g. last 한글 syllable) must not grade yet */
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && e.target.matches('.p-in')) {
        e.preventDefault();
        const b = e.target.closest('.pitem').querySelector('[data-p="check"]');
        if (b) setTimeout(() => b.click(), 0);
      }
    });
  }

  window.Practice = { render, bind };
})();

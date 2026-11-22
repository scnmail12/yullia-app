/* 연습실 — textbook- and TOPIK-style practice items.
   Types: match, tf, dlg, ord, ls, rd, ox, sw, wr (see data/PRACTICE_SCHEMA.md). */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFC').replace(/[\s.?!,~·…'"’‘“”«»()[\]{}​-‍﻿]/g, '').toLowerCase();
  const okText = (val, a, alt) => [a].concat(alt || []).some(x => norm(x) === norm(val));
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const say = (t, slow) => window.KS && window.KS.speak(t, slow ? 0.6 : 0.85);
  const script = say => Array.isArray(say) ? say.map(l => (l[0] === '남' ? '남자' : '여자') + ': ' + l[1]).join('\n') : say;
  const choices = (q, k) => `<div class="rq" data-k="${k}"><div class="ex-prompt ko">${k + 1}. ${esc(q.q)}</div><div class="opts col">${q.o.map((o, j) => `<button class="popt ko" data-j="${j}">${'①②③④'[j] || j + 1} ${esc(o)}</button>`).join('')}</div><div class="ex-fb"></div></div>`;
  const field = (attrs) => `<input type="text" class="ex-input p-in ko" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" ${attrs || ''}>`;

  /* ---------- 쓰기 (sw): grade a typed sentence and say what is wrong ----------
     The answer is compared with the closest accepted answer (spaces/punctuation ignored for grading),
     then aligned word by word to name wrong particles, endings, tense, style, spelling, missing words. */
  const SW = (function () {
    const H0 = 0xAC00, HN = 11172;
    const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
    const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const code = ch => { const c = ch.charCodeAt(0) - H0; return c >= 0 && c < HN ? c : -1; };
    const jamo = s => Array.from(s).map(ch => { const c = code(ch); return c < 0 ? ch : CHO[c / 588 | 0] + JUNG[(c % 588) / 28 | 0] + JONG[c % 28]; }).join('');
    const batchim = ch => { const c = code(ch || ''); return c < 0 ? '' : JONG[c % 28]; };
    const clean = s => String(s || '').normalize('NFC').replace(/[​-‍﻿]/g, '')
      .replace(/[.?!,~·…'"’‘“”«»()[\]{}:;\-]/g, ' ').replace(/\s+/g, ' ').trim();
    const tight = s => clean(s).replace(/ /g, '');
    const lev = (a, b) => {
      a = Array.from(a); b = Array.from(b);
      let prev = b.map((_, j) => j + 1); prev.unshift(0);
      for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[b.length];
    };
    const prefix = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };
    /* "(저는) 커피(를) 마셔요" → every variant */
    const expand = s => {
      const m = /\(([^()]*)\)/.exec(s);
      if (!m) return [s.replace(/\s+/g, ' ').trim()];
      const pre = s.slice(0, m.index), post = s.slice(m.index + m[0].length);
      /* "안드리 (씨)는" without 씨 → "안드리는" (the particle joins the word before) */
      return expand(pre + m[1] + post).concat(expand((/\s$/.test(pre) && /^[^\s.?!,]/.test(post) ? pre.replace(/\s+$/, '') : pre) + post));
    };
    const accepted = x => Array.from(new Set([x.a].concat(x.alt || []).reduce((r, s) => r.concat(expand(s)), [])));

    const PART = ['에서는', '에서도', '에게서', '한테서', '으로는', '이었어요', '였어요', '이에요', '예요', '입니다', '이라고', '라고',
      '으로', '에서', '에게', '한테', '께서', '부터', '까지', '처럼', '보다', '하고', '이랑', '이나', '에는', '에도', '은', '는', '이', '가',
      '을', '를', '에', '도', '의', '와', '과', '로', '만', '께', '랑', '나'];
    const PSET = new Set(PART);
    const ALLO = [['은', '는'], ['이', '가'], ['을', '를'], ['과', '와'], ['으로', '로'], ['이랑', '랑'], ['이나', '나'],
      ['이에요', '예요'], ['이었어요', '였어요'], ['이라고', '라고'], ['으로는', '로는']];
    const GLOSS = { '은': 'тема', '는': 'тема', '이': 'підмет', '가': 'підмет', '을': 'прямий додаток: кого? що?', '를': 'прямий додаток: кого? що?',
      '에': 'час, де щось є, або куди', '에서': 'де відбувається дія або звідки', '에게': 'кому', '한테': 'кому', '께': 'кому (шанобливо)',
      '께서': 'підмет (шанобливо)', '도': '«теж»', '의': '«чий»', '와': '«і, з»', '과': '«і, з»', '하고': '«і, з»', '랑': '«і, з»', '이랑': '«і, з»',
      '으로': 'засіб або напрямок', '로': 'засіб або напрямок', '부터': '«від, з»', '까지': '«до»', '만': '«тільки»', '보다': '«ніж»', '처럼': '«як»' };
    const COP = new Set(['이에요', '예요', '이었어요', '였어요', '입니다', '이라고', '라고']);
    const g = p => GLOSS[p] ? ` (${GLOSS[p]})` : '';
    const q = s => `«${esc(s)}»`;

    function particleNote(stem, a, b) {
      const pair = ALLO.find(p => p.includes(a) && p.includes(b)), bt = batchim(stem.slice(-1));
      if (a && b && pair) {
        if (pair[0] === '으로' || pair[0] === '으로는') return bt === 'ㄹ'
          ? `${q(stem)} закінчується на ㄹ → ${q(b)} (після ㄹ — без 으).`
          : `${q(stem)} закінчується на ${bt ? 'приголосний' : 'голосний'} → ${q(b)}, а не ${q(a)}.`;
        return `${q(stem)} закінчується на ${bt ? `приголосний (받침 ${bt})` : 'голосний'} → ${q(b)}, а не ${q(a)}.`;
      }
      if (COP.has(a) || COP.has(b)) return `Після ${q(stem)} потрібно ${q(b || stem)}${a ? `, а не ${q(a)}` : ''}.`;
      if (!a) return `Після ${q(stem)} бракує ${q(b)}${g(b)}.`;
      if (!b) return `Після ${q(stem)} ${q(a)} тут не потрібна.`;
      return `Частка після ${q(stem)}: потрібна ${q(b)}${g(b)}, а не ${q(a)}${g(a)}.`;
    }
    function wordNote(s, t) {
      for (let k = prefix(s, t); k >= 1; k--) {
        const a = s.slice(k), b = t.slice(k);
        if (a !== b && (!a || PSET.has(a)) && (!b || PSET.has(b))) return particleNote(t.slice(0, k), a, b);
      }
      const sj = jamo(s), tj = jamo(t);
      if (prefix(sj, tj) >= 2) {
        if (sj.length === tj.length) {
          const d = Array.from(sj).map((c, i) => [c, tj[i]]).filter(([x, y]) => x !== y);
          if (d.length === 1 && /^(ㅏㅓ|ㅓㅏ|ㅘㅝ|ㅝㅘ)$/.test(d[0].join('')))
            return `Голосна: ${q(t)}, а не ${q(s)}. Після ㅏ, ㅗ — -아요 / -았-, після інших голосних — -어요 / -었-.`;
        }
        if (lev(sj, tj) === 1) return `Написання: ${q(t)}, а не ${q(s)}.`;
        if (/(요|다|까|고|서|면|지|게|는|은|ㄹ)$/.test(t) || /[요다까]$/.test(s)) return `Форма слова: ${q(t)}, а не ${q(s)}.`;
      }
      if (lev(sj, tj) <= 2) return `Написання: ${q(t)}, а не ${q(s)}.`;
      return `Тут потрібно ${q(t)}, а не ${q(s)}.`;
    }
    /* sentence-level grammar: speech style, tense, future, negation */
    function gramNotes(S, T) {
      const n = [], sl = S[S.length - 1] || '', tl = T[T.length - 1] || '', st = S.join(''), tt = T.join('');
      if (/요$/.test(tl) && /(니다|니까)$/.test(sl)) n.push('Стиль: тут потрібна форма на -요 (-아요/어요), а не -(스)ㅂ니다.');
      else if (/(니다|니까)$/.test(tl) && /요$/.test(sl)) n.push('Стиль: тут потрібна офіційна форма -(스)ㅂ니다.');
      const sj = jamo(sl), tj = jamo(tl), k = prefix(sj, tj);
      if (k >= 2) {
        const ps = /ㅆ/.test(sj.slice(k)), pt = /ㅆ/.test(tj.slice(k));
        if (pt && !ps && !/ㅅ/.test(sj.slice(k))) n.push('Час: потрібен минулий час (-았/었/했-).');
        if (ps && !pt) n.push('Час: тут не минулий час.');
      }
      const fut = W => W.some((w, i) => batchim(w.slice(-1)) === 'ㄹ' && /^(거|겁)/.test(W[i + 1] || ''));
      if (fut(T) && !fut(S) && !/ㄹㄱㅓ/.test(jamo(st))) n.push('Час: потрібен майбутній час -(으)ㄹ 거예요.');
      const neg = (W, w) => W.includes(w) || (w === '안' ? /지않/ : /지못/).test(W.join(''));
      const sNo = !/안|못|않/.test(st);
      if (neg(T, '못') && !neg(S, '못')) n.push(neg(S, '안') ? '«못» — «не можу, не вийшло», а «안» — просто «не». Тут потрібно 못.' : sNo ? 'Бракує заперечення: 못 перед дієсловом (не можу).' : '');
      else if (neg(T, '안') && !neg(S, '안')) n.push(neg(S, '못') ? '«안» — просто «не», а «못» — «не можу». Тут потрібно 안.' : sNo ? 'Бракує заперечення: 안 перед дієсловом (або -지 않아요).' : '');
      else if (!/안|못|않/.test(tt) && !sNo && (neg(S, '안') || neg(S, '못'))) n.push('Тут речення без заперечення.');
      return n.filter(Boolean);
    }
    /* word alignment: equal / substitute / missing / extra, plus joined or split words (spacing) */
    function align(S, T) {
      const n = S.length, m = T.length, D = [], B = [];
      for (let i = 0; i <= n; i++) { D[i] = []; B[i] = []; }
      for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
        if (!i && !j) { D[0][0] = 0; continue; }
        let best = Infinity, op = null;
        const tryOp = (c, o) => { if (c < best) { best = c; op = o; } };
        if (i && j) {
          const s = S[i - 1], t = T[j - 1];
          tryOp(D[i - 1][j - 1] + (s === t ? 0 : 0.3 + lev(jamo(s), jamo(t)) / Math.max(jamo(s).length, jamo(t).length)), s === t ? 'eq' : 'sub');
        }
        if (i) tryOp(D[i - 1][j] + 1, 'ins');
        if (j) tryOp(D[i][j - 1] + 1, 'del');
        if (i > 1 && j && S[i - 2] + S[i - 1] === T[j - 1]) tryOp(D[i - 2][j - 1] + 0.05, 'join');
        if (i && j > 1 && S[i - 1] === T[j - 2] + T[j - 1]) tryOp(D[i - 1][j - 2] + 0.05, 'split');
        D[i][j] = best; B[i][j] = op;
      }
      const ops = [];
      for (let i = n, j = m; i || j;) {
        const op = B[i][j];
        if (op === 'eq' || op === 'sub') { ops.unshift({ op, s: S[i - 1], t: T[j - 1] }); i--; j--; }
        else if (op === 'ins') { ops.unshift({ op, s: S[i - 1] }); i--; }
        else if (op === 'del') { ops.unshift({ op, t: T[j - 1] }); j--; }
        else if (op === 'join') { ops.unshift({ op, s: S[i - 2] + ' ' + S[i - 1], t: T[j - 1] }); i -= 2; j--; }
        else { ops.unshift({ op, s: S[i - 1], t: T[j - 2] + ' ' + T[j - 1] }); i--; j -= 2; }
      }
      return ops;
    }

    function check(val, x) {
      const v = clean(val), acc = accepted(x);
      if (!v) return { ok: false, empty: true, notes: ['Напиши речення корейською.'] };
      if (!/[가-힣]/.test(v)) return { ok: false, notes: ['Пиши корейськими літерами (한글).'], target: x.a };
      const vt = tight(v);
      const hit = acc.find(a => tight(a) === vt);
      if (hit) return { ok: true, spacing: acc.some(a => clean(a) === v) ? null : clean(hit) };
      const target = acc.map(a => [a, lev(jamo(vt), jamo(tight(a)))]).sort((p, r) => p[1] - r[1])[0][0];
      const S = v.split(' '), notes = [], bag = W => W.slice().sort().join(' ');
      /* same words, other order: fine if the predicate stays last (Korean word order is free), else wrong */
      const perm = acc.map(a => clean(a).split(' ')).filter(T => T.length === S.length && bag(T) === bag(S));
      const okPerm = perm.find(T => T[T.length - 1] === S[S.length - 1]);
      if (okPerm) return { ok: true, order: okPerm.join(' ') };
      const errs = (x.err || []).filter(e => vt.includes(tight(e[0])));
      errs.forEach(e => notes.push(esc(e[1])));
      if (perm.length) return { ok: false, order: true, notes: notes.concat(['Порядок слів: у корейському реченні присудок (дієслово) стоїть у кінці.']), target: perm[0].join(' ') };
      const T = clean(target).split(' ');
      const ops = align(S, T);
      gramNotes(S, T).forEach(n => notes.push(n));
      ops.forEach(o => {
        if (o.op === 'sub') { if (!errs.some(e => tight(e[0]).includes(o.s) || o.s.includes(tight(e[0])))) notes.push(wordNote(o.s, o.t)); }
        else if (o.op === 'del') notes.push(`Пропущено ${q(o.t)}.`);
        else if (o.op === 'ins') notes.push(`Зайве слово ${q(o.s)}.`);
        else if (o.op === 'join') notes.push(`Пробіл: ${q(o.t)} пишеться разом.`);
        else if (o.op === 'split') notes.push(`Пробіл: ${q(o.t)} — окремо.`);
      });
      return { ok: false, notes: Array.from(new Set(notes)).slice(0, 5), target, ops };
    }
    function html(r) {
      if (r.empty) return r.notes[0];
      if (r.ok) return 'Правильно!' + (r.spacing ? `<div class="sw-sp muted small">Пробіли: <span class="ko">${esc(r.spacing)}</span></div>` : '')
        + (r.order ? `<div class="sw-sp muted small">Так теж можна. Звичайніший порядок: <span class="ko">${esc(r.order)}</span></div>` : '');
      const yours = r.ops ? r.ops.map(o => o.op === 'eq' || o.op === 'join' || o.op === 'split' ? esc(o.s)
        : o.op === 'del' ? '<mark class="gap">＿</mark>' : `<mark class="bad">${esc(o.s)}</mark>`).join(' ') : '';
      const right = r.ops ? r.ops.filter(o => o.op !== 'ins').map(o => o.op === 'sub' || o.op === 'del' ? `<mark class="fix">${esc(o.t)}</mark>` : esc(o.t)).join(' ') : esc(r.target);
      return `${yours ? `<div class="sw-line"><span class="sw-tag">Ти:</span> <span class="ko">${yours}</span></div>` : ''}
        <div class="sw-line"><span class="sw-tag">Правильно:</span> <span class="ko">${right}</span></div>
        ${r.notes.length ? `<ul class="sw-notes">${r.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}`;
    }
    /* ---- free writing (wr): mechanical checks only (the teacher still reads the text) ---- */
    const jung = ch => { const c = code(ch || ''); return c < 0 ? '' : JUNG[(c % 588) / 28 | 0]; };
    const isH = ch => code(ch || '') >= 0;
    const NOUN_HADA = new Set(('공부 운동 일 요리 청소 빨래 숙제 쇼핑 전화 이야기 얘기 산책 여행 수영 노래 등산 운전 연습 준비 출발 도착 시작 결혼 졸업 입학 '
      + '수업 식사 세수 샤워 데이트 게임 설거지 약속 예약 주문 구경 생각 걱정 대답 질문 연락 통화 이사 취직 출근 퇴근 아르바이트 알바 인사 소개 '
      + '선물 사용 이용 계획 정리 방문 초대 참석 신청 확인 공부를 숙제를 운동을 일을 요리를 청소를').split(' '));
    const ALONE = new Set(['은', '는', '을', '를', '에', '에서', '에게', '한테', '부터', '까지', '의', '으로', '께서', '이랑']);
    const VERB_START = /^(가|갔|와|왔|오|먹|마셔|마시|마셨|봐|봤|보|해요|했|돼|되|읽|자요|잤|사요|샀|만나|만났|좋|들|써|쓰|앉|일어|알|놀|받|팔|줘|주|입|씻|배우|배웠|기다|다녀|바빠|바빴|비싸|싸|커요|컸|작|많|적|멀|추워|추웠|더워|더웠|맛있|재미있|예뻐|아파|아팠)/;
    const WL = new Set(['가을', '마을', '지은', '나은', '이은', '나을', '지을', '부을', '이을', '경로', '통로', '진로', '항로']);
    const SET_PHRASE = /(감사합니다|반갑습니다|고맙습니다|뵙겠습니다|안녕하십니까|죄송합니다|부탁합니다|부탁드립니다|축하합니다)$/;
    function lint(text, task) {
      const raw = String(text || '').normalize('NFC').replace(/[​-‍﻿]/g, '');
      if (!raw.trim()) return { empty: true, out: [], notes: [] };
      const out = [], notes = [];
      const add = (sent, frag, fix, why) => { if (!out.some(o => o.frag === frag && o.why === why)) out.push({ sent, frag, fix, why }); };
      const sents = raw.replace(/([.?!])\s*/g, '$1\n').split(/\n+/).map(s => s.replace(/^[^:：]{1,12}[:：]\s*/, '').trim()).filter(s => /[가-힣]/.test(s));
      if (/[A-Za-z]{2,}/.test(raw)) notes.push('Є латинські літери — пиши корейською (한글).');
      let yo = 0, nida = 0;
      sents.forEach(sent => {
        const W = clean(sent).split(' ').filter(Boolean);
        W.forEach((w, i) => {
          const last = w.slice(-1), prev = w.slice(-2, -1), stem = w.slice(0, -1), bt = batchim(prev), next = W[i + 1] || '';
          if (w.length >= 2 && isH(prev) && !WL.has(w)) {
            if (last === '를' && bt) add(sent, w, stem + '을', 'Після приголосного (받침) — 을, не 를.');
            if (last === '을' && !bt) add(sent, w, stem + '를', 'Після голосного — 를, не 을.');
            if (last === '은' && !bt) add(sent, w, stem + '는', 'Після голосного — 는, не 은.');
            if (last === '와' && bt) add(sent, w, stem + '과', 'Після приголосного — 과 (або 하고), не 와.');
            if (/[^으]로$/.test(w) && bt && bt !== 'ㄹ' && !/(으로)$/.test(w)) add(sent, w, stem + '으로', 'Після приголосного (крім ㄹ) — 으로.');
            if (/으로$/.test(w) && w.length >= 3) { const b2 = batchim(w.slice(-3, -2)); if (isH(w.slice(-3, -2)) && (!b2 || b2 === 'ㄹ')) add(sent, w, w.slice(0, -2) + '로', b2 ? 'Після ㄹ — 로, без 으.' : 'Після голосного — 로, без 으.'); }
          }
          if (/^저(는|도)?이예요$/.test(w)) add(sent, w, w.replace(/이예요$/, '예요'), 'Пишеться 예요 / 이에요, не 이예요.');
          else if (/아니예요$/.test(w)) add(sent, w, w.replace(/아니예요$/, '아니에요'), '아니다 → 아니에요.');
          else if (/예요$/.test(w) && w.length >= 3 && batchim(w.slice(-3, -2))) add(sent, w, w.replace(/예요$/, '이에요'), 'Після приголосного — 이에요, не 예요.');
          if (w === '저가') add(sent, w, '제가', '저 + 가 → 제가.');
          if (w === '너가') add(sent, w, '네가', '너 + 가 → 네가.');
          /* vowel harmony at the end of a verb: 먹아요 / 좋어요 */
          const m = w.match(/([가-힣])(아요|어요|아서|어서|아도|어도|아야|어야|았어요|었어요|았다|었다|았습니다|었습니다|았어|었어)$/);
          if (m && m.index + 1 === w.length - m[2].length) {
            const V = jung(m[1]), B = batchim(m[1]), A = /^아|^았/.test(m[2]);
            if (A && !/[ㅏㅗㅑ]/.test(V) && m[1] !== '하') add(sent, w, w.slice(0, -m[2].length) + m[2].replace(/^아/, '어').replace(/^았/, '었'), 'Після голосних, крім ㅏ/ㅗ, — -어요 / -었-.');
            if (!A && /[ㅏㅗㅑ]/.test(V) && B && B !== 'ㅆ') add(sent, w, w.slice(0, -m[2].length) + m[2].replace(/^어/, '아').replace(/^었/, '았'), 'Після ㅏ, ㅗ — -아요 / -았-.');
          }
          if (/하[아어]요$/.test(w)) add(sent, w, w.replace(/하[아어]요$/, '해요'), '하다 → 해요.');
          /* 안/못 + noun-하다 verb: 공부 안 해요 */
          if ((w === '안' || w === '못') && /^[가-힣]+(해요|했어요|합니다|했습니다|할|하고|해서|해|했다|하세요|하지|할게요|할 거예요)$/.test(next)) {
            const k = next.search(/(해요|했어요|합니다|했습니다|할|하고|해서|해|했다|하세요|하지|할게요)$/), noun = next.slice(0, k);
            if (NOUN_HADA.has(noun)) add(sent, w + ' ' + next, `${noun} ${w} ${next.slice(k)}`, `У дієсловах на 하다 «${w}» стоїть перед 하다.`);
          }
          /* spacing */
          if (i && ALONE.has(w) && /[가-힣]$/.test(W[i - 1])) add(sent, W[i - 1] + ' ' + w, W[i - 1] + w, 'Частку пишуть разом зі словом.');
          if (/^안[가-힣]+요$/.test(w) && VERB_START.test(w.slice(1))) add(sent, w, '안 ' + w.slice(1), '«안» (не) пишеться окремо.');
          if (/^못[가-힣]+요$/.test(w) && !/^(하|해|했|생|난)/.test(w.slice(1)) && VERB_START.test(w.slice(1))) add(sent, w, '못 ' + w.slice(1), '«못» пишеться окремо.');
          if (w === '않' && next) add(sent, w + ' ' + next, '안 ' + next, '«не» перед дієсловом — 안. 않 буває лише в -지 않다.');
          if (/^안아요$/.test(w) && /지$/.test(W[i - 1] || '')) add(sent, W[i - 1] + ' ' + w, W[i - 1] + ' 않아요', '-지 않아요 пишеться з 않.');
        });
        /* typical misspellings */
        [[/되요/, '돼요', '되 + 어요 = 돼요.'], [/됬/, '됐', '되 + 었 = 됐.'], [/([가-힣])께요/, null, 'Пишеться -(으)ㄹ게요, не -ㄹ께요.'], [/몇일/, '며칠', 'Правильно: 며칠.'],
         [/([가-힣])니다/, null, '-ㅂ니다 / -습니다 пишеться з ㅂ.'], [/읍니다/, '습니다', 'Зараз пишуть -습니다 (не -읍니다).'], [/웬지/, '왠지', 'Правильно: 왠지.'], [/금새/, '금세', 'Правильно: 금세.'], [/어떻해/, '어떡해', 'Правильно: 어떡해 (що робити?) або 어떻게 (як?).'],
         [/안녕하새요/, '안녕하세요', 'Правильно: 안녕하세요.']].forEach(([re, fix, why]) => {
          const mm = sent.match(re); if (!mm) return;
          if (why.startsWith('Пишеться -(으)ㄹ게요')) { if (batchim(mm[1]) !== 'ㄹ') return; add(sent, mm[0], mm[1] + '게요', why); return; }
          if (why.startsWith('-ㅂ니다')) { if (batchim(mm[1]) !== 'ㅁ') return; const c = code(mm[1]); add(sent, mm[0], String.fromCharCode(H0 + c - 16 + 17) + '니다', why); return; }
          add(sent, mm[0], fix, why);
        });
        const lw = W[W.length - 1] || '';
        if (!SET_PHRASE.test(lw)) { if (/요$/.test(lw)) yo++; else if (/(니다|니까)$/.test(lw)) nida++; }
      });
      if (yo && nida && !/[:：]/.test(raw)) notes.push('Змішано стилі: є речення на -요 і на -(스)ㅂ니다. У тексті зазвичай тримаються одного стилю.');
      const need = /(\d+)\s*[–-]\s*\d+\s*(речен|реплік)/.exec(task || '') || /(\d+)\s*(речен|реплік)/.exec(task || '');
      if (need && sents.length < +need[1]) notes.push(`Речень: ${sents.length}, а потрібно щонайменше ${need[1]}.`);
      return { out, notes, count: sents.length };
    }
    function lintHtml(r) {
      if (r.empty) return '<div class="muted small">Спершу напиши текст.</div>';
      const mark = (sent, frag) => { const s = esc(sent), f = esc(frag), k = s.indexOf(f); return k < 0 ? s : s.slice(0, k) + `<mark class="bad">${f}</mark>` + s.slice(k + f.length); };
      const head = r.out.length ? `<b>Можливі помилки: ${r.out.length}</b>` : '<b>✓ Типових помилок не знайдено.</b>';
      return `<div class="sw-fb wr-fb">${head}
        ${r.out.length ? `<ul class="sw-notes">${r.out.map(o => `<li><span class="ko">${mark(o.sent, o.frag)}</span><br>${o.fix ? `<span class="ko">${esc(o.frag)}</span> → <mark class="fix ko">${esc(o.fix)}</mark> · ` : ''}${esc(o.why)}</li>`).join('')}</ul>` : ''}
        ${r.notes.length ? `<ul class="sw-notes">${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <div class="muted small" style="margin-top:6px">Автоматично перевіряються частки, закінчення, пробіли й написання. Зміст і природність тексту перевірить учитель.</div></div>`;
    }
    return { check, html, accepted, tight, expand, lint, lintHtml };
  })();

  const TYPE = {
    sw: ['문장 쓰기', 'Напиши речення'],
    match: ['짝 맞추기', 'Знайди пари'], tf: ['보기와 같이', 'Зроби за зразком'], dlg: ['대화 완성', 'Доповни діалог'],
    ord: ['문장 만들기', 'Склади речення'], ls: ['듣기', 'Аудіювання'], rd: ['읽기', 'Читання'],
    ox: ['O / X', 'Правда чи ні'], wr: ['쓰기', 'Письмо']
  };
  const FILTERS = [['all', 'Усі'], ['wr', '쓰기 · Письмо'], ['wb', 'Робочий зошит'], ['topik', 'TOPIK'], ['skills', 'Читання й аудіювання']];
  const inFilter = (it, f) => f === 'all' || (f === 'wr' && (it.t === 'sw' || it.t === 'wr')) || (f === 'wb' && /^WB/.test(it.src || '')) || (f === 'topik' && /TOPIK/.test(it.src || '')) || (f === 'skills' && /(듣기|읽기)/.test(it.src || ''));

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
          <div class="ls-text ko muted" hidden>${esc(script(it.say))}</div>
          ${it.m === 'qs' ? it.qs.map(choices).join('')
            : it.m === 'dict' ? field('placeholder="Запиши, що почув(-ла)"') + '<div class="ex-fb"></div>'
            : `<div class="opts col">${it.o.map((o, k) => `<button class="popt ko" data-k="${k}">${'①②③④'[k] || k + 1} ${esc(o)}</button>`).join('')}</div><div class="ex-fb"></div>`}`;
      case 'rd':
        return `<div class="passage ko${it.box ? ' notice' : ''}">${esc(it.txt)}</div>
          ${it.gl ? `<div class="gloss small">${Object.keys(it.gl).map(k => `<span><b class="ko">${esc(k)}</b> — ${esc(it.gl[k])}</span>`).join('')}</div>` : ''}
          ${it.qs.map(choices).join('')}`;
      case 'ox':
        return `${it.txt ? `<div class="passage ko">${esc(it.txt)}</div>` : ''}${it.say ? `<div class="row" style="margin-bottom:12px"><button class="btn sm p-play">🔊 Слухати</button><button class="btn sm secondary p-slow">🐢 Повільно</button></div>` : ''}
          ${it.s.map((s, k) => `<div class="ox-row" data-k="${k}"><span class="ko grow">${esc(s[0])}</span><button class="oxb" data-v="1">O</button><button class="oxb" data-v="0">X</button></div>`).join('')}<div class="ex-fb"></div>`;
      case 'sw':
        return it.it.map((x, k) => `<div class="tf-row sw-row" data-k="${k}">
          ${x.ko ? `<div class="ko cue">${k + 1}) ${esc(x.ko)}</div>${x.uk ? `<div class="muted small sw-uk">${esc(x.uk)}</div>` : ''}` : `<div class="cue">${k + 1}) ${esc(x.uk)}</div>`}
          ${x.c ? `<button class="btn ghost sm sw-hbtn" data-p="hint">💡 Підказка</button><div class="sw-hint ko small" hidden>${esc(x.c)}</div>` : ''}
          <textarea class="ex-input p-in ko sw-in" rows="2" lang="ko" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Пиши корейською…"></textarea>
          <div class="ex-fb"></div></div>`).join('');
      case 'wr':
        return `${it.use ? `<div class="row" style="margin-bottom:10px">${it.use.map(u => `<span class="chip ko">${esc(u)}</span>`).join('')}</div>` : ''}
          <textarea class="ko p-wr" lang="ko" spellcheck="false" placeholder="Пиши тут корейською…"></textarea>
          <div class="wr-out"></div>
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
            <span class="row" style="gap:6px">${it.n ? `<span class="chip qn">№ ${esc(it.n)}</span>` : ''}${res[i] != null ? `<span class="chip ${res[i] >= 100 ? 'ok' : 'todo'}">${res[i]}%</span>` : ''}${it.src ? `<span class="chip ko">${esc(it.src)}</span>` : ''}</span></div>
          <div class="ex-prompt ko">${esc(it.q)}</div>
          ${it.uk ? `<div class="muted small" style="margin:-4px 0 12px">${esc(it.uk)}</div>` : ''}
          <div class="p-body">${body(it, i)}</div>
          <div class="row p-foot">
            ${it.t === 'wr' ? '<button class="btn sm" data-p="lint">Перевірити текст</button><button class="btn sm secondary" data-p="model">Показати зразок</button><button class="btn sm secondary" data-p="copy">Скопіювати для вчителя</button>'
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

  function bind(root, items, unitId, store, rerender, draftStore, onScore) {
    if (!root) return;
    root.addEventListener('click', e => {
      e.stopPropagation();
      const pf = e.target.closest('[data-pf]');
      if (pf) return rerender(pf.dataset.pf);
      const card = e.target.closest('.pitem'); if (!card) { const s0 = e.target.closest('[data-say]'); if (s0) say(s0.dataset.say); return; }
      const i = +card.dataset.i, it = items[i];
      const t = e.target.closest('button'); if (!t) return;
      const score = pct => { const r = store.get(unitId) || {}; r[i] = pct; store.set(unitId, r); card.querySelector('.p-score').textContent = pct + '%'; if (onScore) onScore(i, pct); };

      if (t.dataset.say) return say(t.dataset.say);
      if (t.classList.contains('p-play')) return say(it.say);
      if (t.classList.contains('p-slow')) return say(it.say, true);
      if (t.classList.contains('p-show')) { const x = card.querySelector('.ls-text'); x.hidden = !x.hidden; return; }
      if (t.dataset.p === 'reset') return rerender(null);
      if (t.dataset.p === 'hint') { const h = t.nextElementSibling; h.hidden = !h.hidden; return; }

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
      if (t.dataset.p === 'lint') {
        const out = card.querySelector('.wr-out'); out.innerHTML = SW.lintHtml(SW.lint(card.querySelector('.p-wr').value, it.uk));
        return;
      }
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
      } else if (it.t === 'ls' && it.m !== 'qs') {
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
      } else if (it.t === 'rd' || (it.t === 'ls' && it.m === 'qs')) {
        card.querySelectorAll('.rq').forEach(rq => {
          const q = it.qs[+rq.dataset.k], sel = rq.querySelector('.popt.sel'), ok = !!sel && +sel.dataset.j === q.a;
          rq.querySelectorAll('.popt').forEach(o => { if (+o.dataset.j === q.a) o.classList.add('right'); else if (o === sel) o.classList.add('wrong'); });
          fb(rq.querySelector('.ex-fb'), ok, null); total++; if (ok) right++;
        });
        if (it.t === 'ls') card.querySelector('.ls-text').hidden = false;
      } else if (it.t === 'sw') {
        card.querySelectorAll('.sw-row').forEach(row => {
          const x = it.it[+row.dataset.k], inp = row.querySelector('.sw-in'), r = SW.check(inp.value, x), f = row.querySelector('.ex-fb');
          inp.classList.toggle('right', r.ok); inp.classList.toggle('wrong', !r.ok);
          f.className = 'ex-fb sw-fb ' + (r.ok ? 'right' : 'wrong'); f.innerHTML = SW.html(r);
          total++; if (r.ok) right++;
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

  window.Practice = { render, bind, sw: SW };
})();

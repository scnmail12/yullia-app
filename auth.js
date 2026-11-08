/* Access gate: sign in → teacher approval → load course content and personal data from Supabase,
   then start the app (practice.js + app.js). Works offline after the first successful login. */
(function () {
  'use strict';
  const C = window.KS_CONFIG || {};
  const STATE_KEY = 'korean-studio-v1', STATE_TS = 'ks-state-ts', CACHE_KEY = 'ks-content-cache', PROFILE_KEY = 'ks-profile';
  const gate = document.getElementById('gate');
  const app = document.querySelector('.app'), tabbar = document.getElementById('tabbar');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
  };
  let sb = null, user = null, profile = null;

  function show(inner) {
    app.hidden = true; tabbar.hidden = true; gate.hidden = false;
    gate.innerHTML = `<div class="gate-card">
      <div class="brand" style="justify-content:center;margin-bottom:24px"><span class="brand-mark">한</span><span class="brand-text">한국어 스튜디오<small>Korean Studio</small></span></div>
      ${inner}</div>`;
  }
  const msg = (text, kind) => `<div class="gate-msg ${kind || ''}">${esc(text)}</div>`;
  const loading = text => show(`<div class="gate-center"><div class="spinner"></div><p class="muted">${esc(text || 'Завантаження…')}</p></div>`);

  /* ---------- screens ---------- */
  function loginScreen(mode, note) {
    mode = mode || 'in';
    show(`
      <div class="tabs" style="margin:0 auto 20px">${[['in', 'Вхід'], ['up', 'Реєстрація']].map(([k, l]) => `<button data-mode="${k}" class="${k === mode ? 'active' : ''}">${l}</button>`).join('')}</div>
      <form id="auth-form" autocomplete="on">
        ${mode === 'up' ? `<div class="field"><label for="a-name">Ім’я</label><input type="text" id="a-name" required autocomplete="name" placeholder="Марія"></div>` : ''}
        <div class="field"><label for="a-email">Email</label><input type="email" id="a-email" required autocomplete="email" inputmode="email" autocapitalize="off" placeholder="name@example.com"></div>
        <div class="field"><label for="a-pass">Пароль</label><input type="password" id="a-pass" required minlength="6" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" placeholder="щонайменше 6 символів"></div>
        <div id="a-msg">${note || ''}</div>
        <button class="btn" type="submit" style="width:100%">${mode === 'up' ? 'Надіслати запит на доступ' : 'Увійти'}</button>
      </form>
      <p class="muted small" style="text-align:center;margin-top:16px">${mode === 'up'
        ? 'Після реєстрації вчитель має підтвердити доступ.'
        : 'Немає акаунта? Обери «Реєстрація» — вчитель підтвердить доступ.'}</p>`);
    gate.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => loginScreen(b.dataset.mode));
    gate.querySelector('#auth-form').onsubmit = async e => {
      e.preventDefault();
      const email = gate.querySelector('#a-email').value.trim(), password = gate.querySelector('#a-pass').value;
      const out = gate.querySelector('#a-msg'), btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; out.innerHTML = '';
      try {
        if (mode === 'up') {
          const name = gate.querySelector('#a-name').value.trim();
          const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
          if (error) throw error;
          if (!data.session) { out.innerHTML = msg('Перевір пошту й підтвердь email, потім увійди.', 'ok'); btn.disabled = false; return; }
          return afterLogin(data.session.user);
        }
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterLogin(data.user);
      } catch (err) {
        btn.disabled = false;
        out.innerHTML = msg(humanError(err), 'err');
      }
    };
  }
  function humanError(err) {
    const m = (err && err.message) || String(err);
    if (/invalid login/i.test(m)) return 'Неправильний email або пароль.';
    if (/already registered|already exists/i.test(m)) return 'Цей email уже зареєстровано — обери «Вхід».';
    if (/password/i.test(m) && /6/.test(m)) return 'Пароль має містити щонайменше 6 символів.';
    if (/rate limit|too many/i.test(m)) return 'Забагато спроб. Спробуй трохи пізніше.';
    if (/fetch|network/i.test(m)) return 'Немає з’єднання з інтернетом.';
    return m;
  }
  function waitScreen(p) {
    const blocked = p.status === 'blocked';
    show(`<div class="gate-center">
      <div class="gate-icon">${blocked ? '🔒' : '⏳'}</div>
      <h2>${blocked ? 'Доступ закрито' : 'Чекаємо підтвердження'}</h2>
      <p class="muted">${blocked ? 'Зверніться до вчителя, якщо це помилка.' : `Запит від <b>${esc(p.email)}</b> надіслано. Щойно вчитель підтвердить доступ, натисни «Перевірити».`}</p>
      <div class="row" style="justify-content:center">${blocked ? '' : '<button class="btn" id="g-retry">Перевірити</button>'}<button class="btn secondary" id="g-out">Вийти</button></div></div>`);
    const r = gate.querySelector('#g-retry'); if (r) r.onclick = () => afterLogin(user);
    gate.querySelector('#g-out').onclick = logout;
  }

  /* ---------- data ---------- */
  async function fetchProfile() {
    const { data, error } = await sb.from('profiles').select('id,email,name,role,status').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (data) ls.set(PROFILE_KEY, JSON.stringify(data));
    return data;
  }
  async function loadContent() {
    let rows = null;
    try {
      const { data, error } = await sb.from('content').select('id,data,updated_at');
      if (error) throw error;
      rows = data;
      ls.set(CACHE_KEY, JSON.stringify(rows));
    } catch (e) {
      rows = JSON.parse(ls.get(CACHE_KEY) || 'null');
      if (!rows) throw e;
    }
    const books = rows.filter(r => r.id.startsWith('book:')).sort((a, b) => a.id.localeCompare(b.id)).map(r => r.data);
    window.COURSE_BOOKS = books;
    window.PRACTICE = Object.assign({}, ...rows.filter(r => r.id.startsWith('practice:')).sort((a, b) => a.id.localeCompare(b.id)).map(r => r.data));
    const w = rows.find(r => r.id === 'weekly');
    window.WEEKLY = w ? w.data : { week: null, items: {} };
    return books.length;
  }
  async function loadState() {
    try {
      const { data, error } = await sb.from('user_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const localTs = +(ls.get(STATE_TS) || 0);
      if (data && Date.parse(data.updated_at) >= localTs) { ls.set(STATE_KEY, JSON.stringify(data.data)); ls.set(STATE_TS, String(Date.parse(data.updated_at))); }
      else if (ls.get(STATE_KEY)) pushNow(JSON.parse(ls.get(STATE_KEY)));
    } catch (e) { /* offline: keep local copy */ }
  }
  let pushTimer = null, pending = null;
  function push(state) {
    ls.set(STATE_TS, String(Date.now()));
    pending = state; clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushNow(pending), 1200);
  }
  async function pushNow(state) {
    if (!sb || !user || !state) return;
    const { error } = await sb.from('user_state').upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });
    if (!error) pending = null;
  }
  window.addEventListener('online', () => { if (pending) pushNow(pending); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending) pushNow(pending); });

  /* ---------- flow ---------- */
  async function afterLogin(u) {
    user = u; loading('Перевіряємо доступ…');
    try { profile = await fetchProfile(); }
    catch (e) { profile = JSON.parse(ls.get(PROFILE_KEY) || 'null'); if (!profile || profile.id !== u.id) return show(msg('Немає з’єднання з інтернетом. Спробуй пізніше.', 'err') + '<button class="btn" onclick="location.reload()" style="width:100%">Оновити</button>'); }
    if (!profile) return show(msg('Профіль не знайдено. Зверніться до вчителя.', 'err') + '<button class="btn secondary" id="g-out" style="width:100%">Вийти</button>'), (gate.querySelector('#g-out').onclick = logout);
    if (profile.status !== 'approved') return waitScreen(profile);
    loading('Завантажуємо курс…');
    try {
      const n = await loadContent();
      if (!n) return show(msg('Курс ще не завантажено на сервер.', 'err'));
    } catch (e) { return show(msg('Не вдалося завантажити курс. Перевір інтернет.', 'err') + '<button class="btn" onclick="location.reload()" style="width:100%">Оновити</button>'); }
    await loadState();
    start();
  }
  function start() {
    window.KS_USER = { id: user.id, email: profile.email, name: profile.name, role: profile.role };
    gate.hidden = true; gate.innerHTML = ''; app.hidden = false; tabbar.hidden = false;
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.body.appendChild(s); });
    load('practice.js').then(() => load('app.js'));
  }
  async function logout() {
    try { if (pending) await pushNow(pending); await sb.auth.signOut(); } catch (e) {}
    [STATE_KEY, STATE_TS, CACHE_KEY, PROFILE_KEY].forEach(ls.del);
    location.hash = ''; location.reload();
  }

  /* teacher tools */
  async function listProfiles() {
    const { data, error } = await sb.from('profiles').select('id,email,name,role,status,created_at').order('created_at', { ascending: false });
    if (error) throw error; return data;
  }
  async function setStatus(id, status) {
    const { error } = await sb.from('profiles').update({ status }).eq('id', id);
    if (error) throw error;
  }

  window.KSAuth = { push, logout, listProfiles, setStatus };

  /* ---------- boot ---------- */
  (async function boot() {
    if (!window.supabase || !C.supabaseUrl || !C.supabaseKey) {
      return show(msg('Додаток ще не налаштовано (config.js) або немає інтернету.', 'err') + '<button class="btn" onclick="location.reload()" style="width:100%">Оновити</button>');
    }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ks-auth' } });
    loading();
    const { data } = await sb.auth.getSession();
    if (data && data.session) afterLogin(data.session.user); else loginScreen();
  })();
})();

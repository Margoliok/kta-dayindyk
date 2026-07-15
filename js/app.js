/* КТА платформа — SPA роутер және көріністер */
(function () {
  'use strict';

  const DATA = window.DATA || {};
  const TESTS = window.TESTS || {};
  const app = document.getElementById('app');
  const LS_KEY = 'kta_progress_v1';

  /* ---------- прогресс (localStorage) ---------- */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function recordScore(key, pct) {
    const p = loadProgress();
    if (!p[key] || p[key] < pct) { p[key] = pct; saveProgress(p); }
  }
  function getScore(key) { const p = loadProgress(); return p[key] != null ? p[key] : null; }

  /* ---------- утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
  function subjectList() { return Object.keys(DATA).map(function (k) { return DATA[k]; }); }
  function testsFor(sid) { return TESTS[sid] || []; }
  function testsForTopic(sid, tid) {
    return testsFor(sid).filter(function (q) { return q.topic === tid; });
  }
  function questionCount(sid) { return testsFor(sid).length; }
  function topicCount(sid) { return (DATA[sid] && DATA[sid].topics.length) || 0; }
  // Емтихан сұрақтарының саны: спецификация бойынша (әр тақырыптан N) немесе әдепкі 30
  function examSize(sid) {
    const s = DATA[sid];
    if (s && s.examPerTopic) return s.examPerTopic * s.topics.length;
    return Math.min(30, questionCount(sid));
  }
  // Спецификация форматында сұрақ жиынын құру (әр тақырыптан N кездейсоқ)
  function buildSpecExam(sid) {
    const s = DATA[sid];
    let picked = [];
    s.topics.forEach(function (t) {
      const qs = testsForTopic(sid, t.id);
      picked = picked.concat(window.quizShuffle(qs).slice(0, s.examPerTopic));
    });
    return window.quizShuffle(picked);
  }

  /* ---------- навигация ---------- */
  function setActiveNav() {
    const h = location.hash || '#/';
    document.querySelectorAll('.topnav a').forEach(function (a) {
      const nav = a.getAttribute('data-nav');
      let on = (nav === 'home' && (h === '#/' || h === '' || h.indexOf('#/subject') === 0 || h.indexOf('#/topic') === 0));
      if (nav === 'kta') on = h.indexOf('#/kta') === 0;
      if (nav === 'search') on = h.indexOf('#/search') === 0;
      a.classList.toggle('active', !!on);
    });
  }

  /* ================= КӨРІНІСТЕР ================= */

  function viewHome() {
    const subs = subjectList();
    let totalTopics = 0, totalQ = 0;
    subs.forEach(function (s) { totalTopics += s.topics.length; totalQ += questionCount(s.id); });

    let html = '';
    html += '<section class="hero">';
    html += '<h1>КТА-ға дайындық платформасы</h1>';
    html += '<p>Магистратураға түсу емтиханының екі бейінді пәні бойынша конспектілер, глоссарий және тест тапсырмалары. Барлық материал офлайн жұмыс істейді, нәтижелеріңіз браузерде сақталады.</p>';
    html += '<div class="hero-stats">';
    html += '<div class="hero-stat"><b>' + subs.length + '</b><span>пән</span></div>';
    html += '<div class="hero-stat"><b>' + totalTopics + '</b><span>тақырып</span></div>';
    html += '<div class="hero-stat"><b>' + totalQ + '</b><span>тест сұрағы</span></div>';
    html += '</div></section>';

    html += '<div class="section-title">Пәндер</div>';
    html += '<div class="grid cols-2">';
    subs.forEach(function (s, i) {
      const done = topicProgressPct(s.id);
      html += '<a class="card subject-card ' + (i === 1 ? 's2' : '') + '" href="#/subject/' + s.id + '">';
      html += '<span class="accent"></span>';
      html += '<h3>' + esc(s.title) + '</h3>';
      html += '<p class="muted">' + esc(s.subtitle || '') + '</p>';
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
      html += '<span class="pill gray">' + s.topics.length + ' тақырып</span>';
      html += '<span class="pill">' + questionCount(s.id) + ' тест</span>';
      html += '</div>';
      html += '<div class="progress"><i style="width:' + done + '%"></i></div>';
      html += '<div class="muted" style="font-size:13px;margin-top:6px">Меңгеру: ' + done + '%</div>';
      html += '</a>';
    });
    html += '</div>';

    html += '<div class="section-title">Емтихан режимі</div>';
    html += '<a class="card" href="#/kta" style="display:flex;align-items:center;gap:18px">';
    html += '<div style="font-size:34px">🎯</div>';
    html += '<div style="flex:1"><h3 style="margin:0">КТА сынама емтихан</h3>';
    html += '<p class="muted">Екі пәннен аралас кездейсоқ сұрақтар, таймермен. Нақты емтихан жағдайын имитациялайды.</p></div>';
    html += '<span class="btn">Бастау →</span></a>';

    app.innerHTML = html;
  }

  function topicProgressPct(sid) {
    const s = DATA[sid]; if (!s) return 0;
    let sum = 0, n = 0;
    s.topics.forEach(function (t) {
      const sc = getScore('t:' + sid + ':' + t.id);
      if (sc != null) { sum += sc; }
      n++;
    });
    return n ? Math.round(sum / n) : 0;
  }

  function viewSubject(sid) {
    const s = DATA[sid];
    if (!s) return notFound();
    let html = '';
    html += crumb([['#/', 'Басты бет'], [null, s.title]]);
    html += '<div class="konspekt" style="padding:24px 28px">';
    html += '<h1 style="margin-bottom:4px">' + esc(s.title) + '</h1>';
    html += '<p class="lead">' + esc(s.subtitle || '') + '</p>';
    if (s.sources) html += '<p class="muted" style="font-size:13px">Дереккөздер: ' + s.sources.map(esc).join(' · ') + '</p>';
    html += '<div class="btn-row">';
    if (questionCount(sid) > 0) {
      const es = examSize(sid);
      const label = s.examPerTopic ? ('КТА форматы: емтихан (' + es + ' сұрақ)') : ('Пән бойынша емтихан (' + es + ' сұрақ)');
      html += '<a class="btn" href="#/exam/' + sid + '">' + label + '</a>';
    }
    html += '</div></div>';

    html += '<div class="section-title">Тақырыптар</div>';
    s.topics.forEach(function (t, i) {
      const sc = getScore('t:' + sid + ':' + t.id);
      const qn = testsForTopic(sid, t.id).length;
      html += '<a class="topic-row" href="#/topic/' + sid + '/' + t.id + '">';
      html += '<div class="topic-num">' + (i + 1) + '</div>';
      html += '<div class="topic-main"><h4>' + esc(t.title) + '</h4>';
      html += '<div class="src">' + esc(t.source || '') + '</div></div>';
      html += '<div class="topic-meta">';
      if (qn > 0) html += '<span class="badge">' + qn + ' тест</span>';
      if (sc != null) html += '<span class="badge done">' + sc + '%</span>';
      html += '</div></a>';
    });
    app.innerHTML = html;
  }

  function viewTopic(sid, tid) {
    const s = DATA[sid];
    if (!s) return notFound();
    const idx = s.topics.findIndex(function (t) { return t.id === tid; });
    const t = s.topics[idx];
    if (!t) return notFound();
    const qn = testsForTopic(sid, tid).length;

    let html = '';
    html += crumb([['#/', 'Басты бет'], ['#/subject/' + sid, s.title], [null, t.title]]);
    html += '<article class="konspekt">';
    html += '<h1>' + esc(t.title) + '</h1>';
    if (t.source) html += '<p class="muted" style="font-size:13px;margin-top:0">📘 ' + esc(t.source) + '</p>';
    html += t.konspekt || '<p class="muted">Конспект дайындалуда.</p>';

    if (t.terms && t.terms.length) {
      html += '<h2>Глоссарий</h2><div class="terms">';
      t.terms.forEach(function (tr) {
        html += '<div class="term"><b>' + esc(tr.t) + '</b><span>' + esc(tr.d) + '</span></div>';
      });
      html += '</div>';
    }
    html += '</article>';

    html += '<div class="btn-row">';
    if (qn > 0) html += '<a class="btn" href="#/test/' + sid + '/' + tid + '">Тақырып тесті (' + qn + ' сұрақ) →</a>';
    if (idx > 0) html += '<a class="btn gray" href="#/topic/' + sid + '/' + s.topics[idx - 1].id + '">← Алдыңғы тақырып</a>';
    if (idx < s.topics.length - 1) html += '<a class="btn gray" href="#/topic/' + sid + '/' + s.topics[idx + 1].id + '">Келесі тақырып →</a>';
    html += '</div>';
    app.innerHTML = html;
  }

  function viewTest(sid, tid) {
    const s = DATA[sid];
    if (!s) return notFound();
    const t = s.topics.find(function (x) { return x.id === tid; });
    const qs = testsForTopic(sid, tid);
    if (!qs.length) { app.innerHTML = crumb([['#/', 'Басты бет'], ['#/subject/' + sid, s.title]]) + '<div class="empty">Бұл тақырыпқа тест әзірге жоқ.</div>'; return; }
    const q = new Quiz(app, {
      title: (t ? t.title : '') + ' — тест',
      subtitle: 'Жаттығу режимі · жауап бірден тексеріледі',
      questions: qs,
      mode: 'practice',
      onExit: function () { location.hash = '#/topic/' + sid + '/' + tid; },
      onFinish: function (r) { recordScore('t:' + sid + ':' + tid, r.pct); }
    });
    q.start();
  }

  function viewExam(sid) {
    const s = DATA[sid];
    if (!s) return notFound();
    let pool = testsFor(sid);
    if (!pool.length) { app.innerHTML = '<div class="empty">Тест жоқ.</div>'; return; }
    const picked = s.examPerTopic ? buildSpecExam(sid) : window.quizShuffle(pool).slice(0, Math.min(30, pool.length));
    const n = picked.length;
    const q = new Quiz(app, {
      title: s.title + ' — емтихан',
      subtitle: (s.examPerTopic ? ('КТА форматы · әр тақырыптан ' + s.examPerTopic + ' · ') : '') + n + ' сұрақ · таймер ' + n + ' мин',
      questions: picked,
      mode: 'exam',
      timeLimit: n * 60,
      onExit: function () { location.hash = '#/subject/' + sid; },
      onFinish: function (r) { recordScore('exam:' + sid, r.pct); }
    });
    q.start();
  }

  function viewKTA() {
    const subs = subjectList();
    let pool = [];
    subs.forEach(function (s) { pool = pool.concat(testsFor(s.id)); });
    if (!pool.length) { app.innerHTML = '<div class="empty">Тест базасы бос.</div>'; return; }

    // старт-экран
    let html = '';
    html += crumb([['#/', 'Басты бет'], [null, 'КТА сынама емтихан']]);
    html += '<div class="result-card" style="text-align:left">';
    html += '<h1 style="margin-top:0">🎯 КТА сынама емтихан</h1>';
    html += '<p class="muted">Екі бейінді пәннен аралас кездейсоқ тест. Нақты емтихан форматын имитациялайды: таймер, жауаптар соңында ғана тексеріледі, қателер талданады.</p>';
    html += '<div class="stat-tiles">';
    const n = Math.min(50, pool.length);
    html += '<div class="tile"><b>' + n + '</b><span>сұрақ</span></div>';
    html += '<div class="tile"><b>' + n + '</b><span>минут</span></div>';
    html += '<div class="tile"><b>' + subs.length + '</b><span>пән</span></div>';
    const best = getScore('kta');
    html += '<div class="tile"><b>' + (best != null ? best + '%' : '—') + '</b><span>үздік нәтиже</span></div>';
    html += '</div>';
    html += '<div class="btn-row"><button class="btn" id="ktaStart">Емтиханды бастау →</button>';
    html += '<a class="btn gray" href="#/">Бас тарту</a></div>';
    html += '</div>';
    app.innerHTML = html;

    document.getElementById('ktaStart').addEventListener('click', function () {
      const picked = window.quizShuffle(pool).slice(0, n);
      const q = new Quiz(app, {
        title: 'КТА сынама емтихан',
        subtitle: 'Аралас пәндер · таймер',
        questions: picked,
        mode: 'kta',
        timeLimit: n * 60,
        onExit: function () { location.hash = '#/'; },
        onFinish: function (r) { recordScore('kta', r.pct); }
      });
      q.start();
    });
  }

  function viewSearch(qstr) {
    const q = (qstr || '').trim().toLowerCase();
    let html = crumb([['#/', 'Басты бет'], [null, 'Іздеу']]);
    html += '<input class="search-box" id="searchInput" placeholder="Тақырып, ұғым немесе термин іздеңіз…" value="' + esc(qstr || '') + '">';
    html += '<div id="searchResults" style="margin-top:18px"></div>';
    app.innerHTML = html;
    const input = document.getElementById('searchInput');
    input.focus();
    // курсорды мәтіннің соңына қою
    input.value = input.value;
    input.addEventListener('input', function () {
      const v = input.value.trim();
      // URL-ді хэшті ауыстырусыз жаңартамыз: hashchange іске қосылмайды,
      // сондықтан бет қайта салынбайды әрі іздеу өрісінің фокусы жоғалмайды.
      try { history.replaceState(null, '', '#/search/' + encodeURIComponent(v)); } catch (e) {}
      renderSearchResults(v);
    });
    renderSearchResults((qstr || '').trim());
  }

  function renderSearchResults(qstr) {
    const box = document.getElementById('searchResults');
    if (!box) return;
    const q = qstr.trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = '<div class="empty">Кемінде 2 әріп енгізіңіз.</div>'; return; }
    const res = [];
    subjectList().forEach(function (s) {
      s.topics.forEach(function (t) {
        const plain = (t.title + ' ' + stripHtml(t.konspekt || '') + ' ' + (t.terms || []).map(function (x) { return x.t + ' ' + x.d; }).join(' ')).toLowerCase();
        if (plain.indexOf(q) >= 0) {
          res.push({ s: s, t: t, snippet: makeSnippet(stripHtml(t.konspekt || ''), q) });
        }
      });
    });
    if (!res.length) { box.innerHTML = '<div class="empty">Ештеңе табылмады.</div>'; return; }
    let html = '<div class="muted" style="margin-bottom:10px">' + res.length + ' нәтиже табылды</div>';
    res.forEach(function (r) {
      html += '<a class="topic-row" href="#/topic/' + r.s.id + '/' + r.t.id + '">';
      html += '<div class="topic-num">📄</div>';
      html += '<div class="topic-main"><h4>' + hl(r.t.title, q) + '</h4>';
      html += '<div class="src">' + esc(r.s.title) + '</div>';
      if (r.snippet) html += '<div class="src" style="margin-top:4px">' + hl(r.snippet, q) + '</div>';
      html += '</div></a>';
    });
    box.innerHTML = html;
  }

  function makeSnippet(text, q) {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return '';
    const start = Math.max(0, i - 40);
    return (start > 0 ? '…' : '') + text.substr(start, 120) + '…';
  }
  function hl(text, q) {
    const e = esc(text);
    if (!q) return e;
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return e.replace(re, '<mark>$1</mark>');
  }
  function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }

  function crumb(items) {
    let html = '<div class="crumb">';
    items.forEach(function (it, i) {
      if (i > 0) html += '<span>›</span>';
      if (it[0]) html += '<a href="' + it[0] + '">' + esc(it[1]) + '</a>';
      else html += '<span>' + esc(it[1]) + '</span>';
    });
    return html + '</div>';
  }

  function notFound() { app.innerHTML = '<div class="empty">Бет табылмады. <a href="#/">Басты бетке</a></div>'; }

  /* ---------- роутер ---------- */
  function route() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const parts = h.split('/').filter(Boolean); // ['subject','pedagogika']
    setActiveNav();
    if (parts.length === 0) return viewHome();
    switch (parts[0]) {
      case 'subject': return viewSubject(parts[1]);
      case 'topic': return viewTopic(parts[1], parts[2]);
      case 'test': return viewTest(parts[1], parts[2]);
      case 'exam': return viewExam(parts[1]);
      case 'kta': return viewKTA();
      case 'search': return viewSearch(parts[1] ? decodeURIComponent(parts[1]) : '');
      default: return viewHome();
    }
  }

  /* ---------- тема (light/dark) ---------- */
  function initTheme() {
    const saved = localStorage.getItem('kta_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon();
    document.getElementById('themeToggle').addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const isDark = cur === 'dark' || (!cur && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('kta_theme', next);
      updateThemeIcon();
    });
  }
  function updateThemeIcon() {
    const cur = document.documentElement.getAttribute('data-theme');
    const isDark = cur === 'dark' || (!cur && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
  }

  window.addEventListener('hashchange', route);
  initTheme();
  route();
})();

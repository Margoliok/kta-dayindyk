/* Тест қозғалтқышы (quiz engine) — офлайн.
   Қолдау: бір дұрыс жауап (answer:index) және бірнеше дұрыс жауап (answers:[i,...]),
   түсіндірме (explain), дереккөз/бет (source). */
(function (global) {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function eqSet(a, b) {
    if (a.length !== b.length) return false;
    const s = new Set(a);
    return b.every(function (x) { return s.has(x); });
  }

  // opts: {title, subtitle, questions, mode:'practice'|'exam'|'kta', timeLimit, onExit, onFinish}
  function Quiz(container, opts) {
    this.el = container;
    this.o = opts;
    this.mode = opts.mode || 'practice';
    this.items = shuffle(opts.questions).map(function (q) {
      const multi = Array.isArray(q.answers);
      const correctIdx = multi ? q.answers.slice() : [q.answer];
      const order = shuffle(q.options.map(function (_, i) { return i; }));
      return {
        q: q.q,
        options: order.map(function (i) { return q.options[i]; }),
        correct: correctIdx.map(function (ci) { return order.indexOf(ci); }).filter(function (x) { return x >= 0; }),
        multi: multi,
        explain: q.explain || '',
        source: q.source || '',
        page: q.page || ''
      };
    });
    this.idx = 0;
    this.picks = this.items.map(function () { return []; }); // әр сұрақ үшін таңдалған индекстер
    this.submitted = this.items.map(function () { return false; }); // practice режимінде тексерілді ме
    this.finished = false;
    this.timeLeft = opts.timeLimit || 0;
    this.timer = null;
  }

  Quiz.prototype.start = function () {
    if ((this.mode === 'kta' || this.mode === 'exam') && this.o.timeLimit) this.startTimer();
    this.render();
  };
  Quiz.prototype.startTimer = function () {
    const self = this;
    this.timer = setInterval(function () {
      self.timeLeft--;
      const t = document.getElementById('quizTimer');
      if (t) { t.textContent = self.fmtTime(self.timeLeft); t.classList.toggle('low', self.timeLeft <= 60); }
      if (self.timeLeft <= 0) self.finish();
    }, 1000);
  };
  Quiz.prototype.fmtTime = function (s) { const m = Math.floor(s / 60), ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; };
  Quiz.prototype.stopTimer = function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } };

  Quiz.prototype.isCorrect = function (i) {
    return eqSet(this.picks[i], this.items[i].correct);
  };

  Quiz.prototype.render = function () {
    if (this.finished) return this.renderResult();
    const it = this.items[this.idx];
    const pick = this.picks[this.idx];
    const reveal = this.mode === 'practice' && this.submitted[this.idx];
    const self = this;

    let html = '';
    html += '<div class="quiz-head"><div><h2>' + esc(this.o.title) + '</h2>';
    if (this.o.subtitle) html += '<div class="quiz-progress">' + esc(this.o.subtitle) + '</div>';
    html += '</div><div style="display:flex;gap:12px;align-items:center">';
    html += '<span class="quiz-progress">' + (this.idx + 1) + ' / ' + this.items.length + '</span>';
    if (this.o.timeLimit) html += '<span id="quizTimer" class="timer">' + this.fmtTime(this.timeLeft) + '</span>';
    html += '</div></div>';

    html += '<div class="question">';
    html += '<div class="q-index">' + (this.idx + 1) + '-сұрақ' + (it.multi ? ' · <span style="color:var(--amber)">бірнеше дұрыс жауап</span>' : '') + '</div>';
    html += '<div class="q-text">' + esc(it.q) + '</div>';
    html += '<div class="options">';
    it.options.forEach(function (opt, i) {
      let cls = 'option';
      const selected = pick.indexOf(i) >= 0;
      if (reveal) {
        cls += ' disabled';
        if (it.correct.indexOf(i) >= 0) cls += ' correct';
        else if (selected) cls += ' wrong';
      } else if (selected) cls += ' selected';
      const mark = it.multi ? (selected ? '☑' : '☐') : LETTERS[i];
      html += '<div class="' + cls + '" data-opt="' + i + '"><span class="key">' + mark + '</span><span>' + esc(opt) + '</span></div>';
    });
    html += '</div>';

    if (reveal) {
      const ok = this.isCorrect(this.idx);
      html += '<div class="explain" style="border-left-color:' + (ok ? 'var(--green)' : 'var(--red)') + '">';
      html += '<b>' + (ok ? '✓ Дұрыс!' : '✗ Қате.') + '</b> ';
      html += 'Дұрыс жауап: ' + it.correct.slice().sort(function (a, b) { return a - b; }).map(function (c) { return LETTERS[c]; }).join(', ');
      if (it.explain) html += '<div style="margin-top:6px">' + esc(it.explain) + '</div>';
      if (it.source || it.page) html += '<div class="src">📘 ' + esc([it.source, it.page].filter(Boolean).join(', ')) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // навигация
    html += '<div class="btn-row">';
    if (this.idx > 0) html += '<button class="btn gray" data-act="prev">← Алдыңғы</button>';
    if (this.mode === 'practice' && it.multi && !this.submitted[this.idx]) {
      html += '<button class="btn" data-act="check"' + (pick.length ? '' : ' disabled') + '>Тексеру</button>';
    }
    if (this.idx < this.items.length - 1) html += '<button class="btn" data-act="next">Келесі →</button>';
    else html += '<button class="btn" data-act="finish">Аяқтау ✓</button>';
    html += '<button class="btn ghost" data-act="exit" style="margin-inline-start:auto">Шығу</button>';
    html += '</div>';

    this.el.innerHTML = html;
    this.el.querySelectorAll('.option:not(.disabled)').forEach(function (o) {
      o.addEventListener('click', function () { self.pick(parseInt(o.getAttribute('data-opt'), 10)); });
    });
    this.el.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        const a = b.getAttribute('data-act');
        if (a === 'next') self.go(1); else if (a === 'prev') self.go(-1);
        else if (a === 'finish') self.finish(); else if (a === 'exit') self.exit();
        else if (a === 'check') self.submit();
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  Quiz.prototype.pick = function (i) {
    const it = this.items[this.idx];
    const pk = this.picks[this.idx];
    if (it.multi) {
      const at = pk.indexOf(i);
      if (at >= 0) pk.splice(at, 1); else pk.push(i);
      // Толық қайта салмай, тек көрнекілікті жаңартамыз (фокус/скролл сақталады)
      const opts = this.el.querySelectorAll('.option');
      opts.forEach(function (o, k) {
        const sel = pk.indexOf(k) >= 0;
        o.classList.toggle('selected', sel);
        o.querySelector('.key').textContent = sel ? '☑' : '☐';
      });
      const cb = this.el.querySelector('[data-act="check"]');
      if (cb) cb.disabled = !pk.length;
    } else {
      this.picks[this.idx] = [i];
      if (this.mode === 'practice') { this.submitted[this.idx] = true; this.render(); }
      else {
        const opts = this.el.querySelectorAll('.option');
        opts.forEach(function (o, k) { o.classList.toggle('selected', k === i); });
      }
    }
  };

  Quiz.prototype.submit = function () {
    if (!this.picks[this.idx].length) return;
    this.submitted[this.idx] = true;
    this.render();
  };

  Quiz.prototype.go = function (d) {
    const n = this.idx + d;
    if (n < 0 || n >= this.items.length) return;
    this.idx = n; this.render();
  };

  Quiz.prototype.finish = function () {
    if (this.finished) return;
    if (this.mode !== 'practice') {
      const un = this.picks.filter(function (p) { return !p.length; }).length;
      if (un > 0 && this.timeLeft > 0 && !confirm(un + ' сұраққа жауап берілмеді. Бәрібір аяқтайсыз ба?')) return;
    }
    this.finished = true; this.stopTimer(); this.renderResult();
  };
  Quiz.prototype.exit = function () { this.stopTimer(); if (this.o.onExit) this.o.onExit(); };

  Quiz.prototype.renderResult = function () {
    const self = this;
    let correct = 0;
    this.items.forEach(function (it, i) { if (self.isCorrect(i)) correct++; });
    const total = this.items.length;
    const pct = Math.round((correct / total) * 100);
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
    const msg = pct >= 90 ? 'Тамаша! Тақырыпты жақсы меңгергенсіз.' : pct >= 70 ? 'Жақсы нәтиже! Аздап қайталау керек.' :
      pct >= 50 ? 'Орташа. Қателерді қарап шығыңыз.' : 'Тақырыпты қайта оқыған жөн.';
    if (this.o.onFinish) this.o.onFinish({ correct: correct, total: total, pct: pct });

    let html = '<div class="result-card">';
    html += '<div class="score-ring" style="background:conic-gradient(' + color + ' ' + pct + '%, var(--bg-soft) 0);">';
    html += '<div style="width:118px;height:118px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center">';
    html += '<b style="color:' + color + '">' + pct + '%</b><span>' + correct + ' / ' + total + '</span></div></div>';
    html += '<div class="result-msg">' + msg + '</div>';
    html += '<div class="btn-row" style="justify-content:center">';
    html += '<button class="btn" data-act="review">Қателерді қарау</button>';
    html += '<button class="btn ghost" data-act="retry">Қайта тапсыру</button>';
    html += '<button class="btn gray" data-act="exit">Шығу</button></div></div>';

    html += '<div id="reviewBlock" style="display:none"><div class="section-title">Жауаптарды талдау</div>';
    this.items.forEach(function (it, i) {
      const ok = self.isCorrect(i);
      html += '<div class="question"><div class="q-index">' + (i + 1) + '-сұрақ · ' +
        (ok ? '<span style="color:var(--green)">дұрыс</span>' : '<span style="color:var(--red)">қате</span>') +
        (it.multi ? ' · бірнеше жауап' : '') + '</div>';
      html += '<div class="q-text">' + esc(it.q) + '</div><div class="options">';
      it.options.forEach(function (opt, k) {
        let cls = 'option disabled';
        const sel = self.picks[i].indexOf(k) >= 0;
        if (it.correct.indexOf(k) >= 0) cls += ' correct'; else if (sel) cls += ' wrong';
        html += '<div class="' + cls + '"><span class="key">' + LETTERS[k] + '</span><span>' + esc(opt) + '</span></div>';
      });
      html += '</div>';
      html += '<div class="explain">Дұрыс жауап: ' + it.correct.slice().sort(function (a, b) { return a - b; }).map(function (c) { return LETTERS[c]; }).join(', ');
      if (it.explain) html += '<div style="margin-top:6px">' + esc(it.explain) + '</div>';
      if (it.source || it.page) html += '<div class="src">📘 ' + esc([it.source, it.page].filter(Boolean).join(', ')) + '</div>';
      html += '</div></div>';
    });
    html += '</div>';

    this.el.innerHTML = html;
    this.el.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        const a = b.getAttribute('data-act');
        if (a === 'review') {
          const rb = document.getElementById('reviewBlock');
          rb.style.display = rb.style.display === 'none' ? 'block' : 'none';
          if (rb.style.display === 'block') rb.scrollIntoView({ behavior: 'smooth' });
        } else if (a === 'retry') { new Quiz(self.el, self.o).start(); }
        else if (a === 'exit') self.exit();
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  global.Quiz = Quiz;
  global.quizShuffle = shuffle;
})(window);

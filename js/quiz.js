/* Тест қозғалтқышы (quiz engine) — офлайн, тәуелсіз */
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

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // opts: {title, subtitle, questions:[{q,options,answer,explain,source}], mode:'practice'|'exam'|'kta',
  //        timeLimit(sec), onExit(), onFinish(result), backHref}
  function Quiz(container, opts) {
    this.el = container;
    this.o = opts;
    this.mode = opts.mode || 'practice';
    // Әр сұрақ үшін нұсқаларды араластырамыз, бірақ дұрыс жауаптың жаңа индексін сақтаймыз
    this.items = shuffle(opts.questions).map(function (q) {
      const order = shuffle(q.options.map(function (_, i) { return i; }));
      return {
        q: q.q,
        options: order.map(function (i) { return q.options[i]; }),
        answer: order.indexOf(q.answer),
        explain: q.explain || '',
        source: q.source || ''
      };
    });
    this.idx = 0;
    this.picks = new Array(this.items.length).fill(null);
    this.finished = false;
    this.timeLeft = opts.timeLimit || 0;
    this.timer = null;
  }

  Quiz.prototype.start = function () {
    if ((this.mode === 'kta' || this.mode === 'exam') && this.o.timeLimit) {
      this.startTimer();
    }
    this.render();
  };

  Quiz.prototype.startTimer = function () {
    const self = this;
    this.timer = setInterval(function () {
      self.timeLeft--;
      const t = document.getElementById('quizTimer');
      if (t) {
        t.textContent = self.fmtTime(self.timeLeft);
        t.classList.toggle('low', self.timeLeft <= 60);
      }
      if (self.timeLeft <= 0) { self.finish(); }
    }, 1000);
  };

  Quiz.prototype.fmtTime = function (s) {
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  };

  Quiz.prototype.stopTimer = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  };

  Quiz.prototype.render = function () {
    if (this.finished) return this.renderResult();
    const it = this.items[this.idx];
    const picked = this.picks[this.idx];
    const showFeedback = this.mode === 'practice' && picked !== null;
    const self = this;

    let html = '';
    html += '<div class="quiz-head">';
    html += '<div><h2>' + esc(this.o.title) + '</h2>';
    if (this.o.subtitle) html += '<div class="quiz-progress">' + esc(this.o.subtitle) + '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:12px;align-items:center">';
    html += '<span class="quiz-progress">' + (this.idx + 1) + ' / ' + this.items.length + '</span>';
    if (this.o.timeLimit) html += '<span id="quizTimer" class="timer">' + this.fmtTime(this.timeLeft) + '</span>';
    html += '</div></div>';

    html += '<div class="question">';
    html += '<div class="q-index">' + (this.idx + 1) + '-сұрақ</div>';
    html += '<div class="q-text">' + esc(it.q) + '</div>';
    html += '<div class="options">';
    it.options.forEach(function (opt, i) {
      let cls = 'option';
      if (showFeedback) {
        cls += ' disabled';
        if (i === it.answer) cls += ' correct';
        else if (i === picked) cls += ' wrong';
      } else if (i === picked) {
        cls += ' selected';
      }
      html += '<div class="' + cls + '" data-opt="' + i + '">' +
        '<span class="key">' + LETTERS[i] + '</span><span>' + esc(opt) + '</span></div>';
    });
    html += '</div>';

    if (showFeedback && (it.explain || it.source)) {
      html += '<div class="explain">';
      html += (it.explain ? esc(it.explain) : (picked === it.answer ? 'Дұрыс!' : 'Дұрыс жауап: ' + LETTERS[it.answer]));
      if (it.source) html += '<div class="src">Дереккөз: ' + esc(it.source) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // навигация
    html += '<div class="btn-row">';
    if (this.idx > 0) html += '<button class="btn gray" data-act="prev">← Алдыңғы</button>';
    if (this.idx < this.items.length - 1) {
      html += '<button class="btn" data-act="next">Келесі →</button>';
    } else {
      html += '<button class="btn" data-act="finish">Аяқтау ✓</button>';
    }
    html += '<button class="btn ghost" data-act="exit" style="margin-inline-start:auto">Шығу</button>';
    html += '</div>';

    this.el.innerHTML = html;

    // события
    this.el.querySelectorAll('.option:not(.disabled)').forEach(function (o) {
      o.addEventListener('click', function () {
        self.pick(parseInt(o.getAttribute('data-opt'), 10));
      });
    });
    this.el.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        const a = b.getAttribute('data-act');
        if (a === 'next') self.go(1);
        else if (a === 'prev') self.go(-1);
        else if (a === 'finish') self.finish();
        else if (a === 'exit') self.exit();
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  Quiz.prototype.pick = function (i) {
    this.picks[this.idx] = i;
    if (this.mode === 'practice') {
      this.render(); // көрсету feedback
    } else {
      // белгілеу ғана
      const opts = this.el.querySelectorAll('.option');
      opts.forEach(function (o, k) { o.classList.toggle('selected', k === i); });
    }
  };

  Quiz.prototype.go = function (d) {
    const n = this.idx + d;
    if (n < 0 || n >= this.items.length) return;
    this.idx = n;
    this.render();
  };

  Quiz.prototype.finish = function () {
    if (this.finished) return;
    // экзамен режимінде жауап берілмегендерін тексеру
    if (this.mode !== 'practice') {
      const unanswered = this.picks.filter(function (p) { return p === null; }).length;
      if (unanswered > 0 && this.timeLeft > 0) {
        if (!confirm(unanswered + ' сұраққа жауап берілмеді. Бәрібір аяқтайсыз ба?')) return;
      }
    }
    this.finished = true;
    this.stopTimer();
    this.renderResult();
  };

  Quiz.prototype.exit = function () {
    this.stopTimer();
    if (this.o.onExit) this.o.onExit();
  };

  Quiz.prototype.renderResult = function () {
    const self = this;
    let correct = 0;
    this.items.forEach(function (it, i) { if (self.picks[i] === it.answer) correct++; });
    const total = this.items.length;
    const pct = Math.round((correct / total) * 100);
    let color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
    let msg = pct >= 90 ? 'Тамаша! Тақырыпты жақсы меңгергенсіз.' :
      pct >= 70 ? 'Жақсы нәтиже! Аздап қайталау керек.' :
        pct >= 50 ? 'Орташа. Қателерді қарап шығыңыз.' :
          'Тақырыпты қайта оқыған жөн.';

    if (this.o.onFinish) this.o.onFinish({ correct: correct, total: total, pct: pct });

    let html = '';
    html += '<div class="result-card">';
    html += '<div class="score-ring" style="background:conic-gradient(' + color + ' ' + pct + '%, var(--bg-soft) 0);">';
    html += '<div style="width:118px;height:118px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center">';
    html += '<b style="color:' + color + '">' + pct + '%</b><span>' + correct + ' / ' + total + '</span></div></div>';
    html += '<div class="result-msg">' + msg + '</div>';
    html += '<div class="btn-row" style="justify-content:center">';
    html += '<button class="btn" data-act="review">Қателерді қарау</button>';
    html += '<button class="btn ghost" data-act="retry">Қайта тапсыру</button>';
    html += '<button class="btn gray" data-act="exit">Шығу</button>';
    html += '</div></div>';

    // қате талдау
    html += '<div id="reviewBlock" style="display:none">';
    html += '<div class="section-title">Жауаптарды талдау</div>';
    this.items.forEach(function (it, i) {
      const pk = self.picks[i];
      const ok = pk === it.answer;
      html += '<div class="question">';
      html += '<div class="q-index">' + (i + 1) + '-сұрақ · ' + (ok ? '<span style="color:var(--green)">дұрыс</span>' : '<span style="color:var(--red)">қате</span>') + '</div>';
      html += '<div class="q-text">' + esc(it.q) + '</div>';
      html += '<div class="options">';
      it.options.forEach(function (opt, k) {
        let cls = 'option disabled';
        if (k === it.answer) cls += ' correct';
        else if (k === pk) cls += ' wrong';
        html += '<div class="' + cls + '"><span class="key">' + LETTERS[k] + '</span><span>' + esc(opt) + '</span></div>';
      });
      html += '</div>';
      if (it.explain || it.source) {
        html += '<div class="explain">' + (it.explain ? esc(it.explain) : 'Дұрыс жауап: ' + LETTERS[it.answer]);
        if (it.source) html += '<div class="src">Дереккөз: ' + esc(it.source) + '</div>';
        html += '</div>';
      }
      html += '</div>';
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
        } else if (a === 'retry') {
          const q = new Quiz(self.el, self.o);
          q.start();
        } else if (a === 'exit') {
          self.exit();
        }
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  global.Quiz = Quiz;
  global.quizShuffle = shuffle;
})(window);

'use strict';

/* ================= Helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('study:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('study:' + key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ================= Content loading ================= */
const cache = new Map();
function load(path, type = 'text') {
  if (!cache.has(path)) {
    const p = fetch(path).then(r => {
      if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
      return type === 'json' ? r.json() : r.text();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path);
}

const getManifest = () => load('content/subjects.json', 'json');
const getSubject = async id => (await getManifest()).subjects.find(s => s.id === id);
const getCards = s => load(`content/${s.id}/cards.json`, 'json').catch(() => ({ flashcards: [], quiz: [] }));
const allTopics = s => s.chapters.flatMap(c => c.topics.map(t => ({ ...t, chapter: c })));
const topicFile = (s, t) => `content/${s.id}/${t.file}`;
const qid = q => q.id || hash(JSON.stringify(q.q));

/* ================= Text formatting ================= */
// Bilingual term syntax used in notes and cards: {{English|中文}}
const TERM_RE = /\{\{([^|}\n]+)\|([^}\n]+)\}\}/g;
const termHTML = (en, zh) => `<span class="term">${en.trim()}<span class="zh"> ${zh.trim()}</span></span>`;

// Inline formatting for card/quiz strings: terms, **bold**, `code`. Math is left for KaTeX.
function fmt(str) {
  return esc(str)
    .replace(TERM_RE, (_, en, zh) => termHTML(en, zh))
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// A field is either a plain string or {en, zh}.
function bi(x) {
  if (x == null) return '';
  if (typeof x === 'string') return fmt(x);
  return fmt(x.en ?? '') + (x.zh ? `<span class="zh zh-line">${fmt(x.zh)}</span>` : '');
}
function biTitle(x) {
  if (typeof x === 'string') return esc(x);
  return esc(x.en) + (x.zh ? `<span class="zh"> ${esc(x.zh)}</span>` : '');
}
const plain = x => (typeof x === 'string' ? x : [x.en, x.zh].filter(Boolean).join(' '));

function renderMarkdown(src) {
  const math = [];
  // Protect math outside fenced code so Markdown doesn't mangle _ and * inside it.
  const text = src.split(/(^```[\s\S]*?^```)/m).map((part, i) => {
    if (i % 2 === 1) return part;
    return part
      .replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, m => `@@MATH${math.push(m) - 1}@@`)
      .replace(TERM_RE, (_, en, zh) => termHTML(esc(en), esc(zh)));
  }).join('');
  if (!window.marked) return `<pre>${esc(src)}</pre>`;
  return marked.parse(text).replace(/@@MATH(\d+)@@/g, (_, i) => esc(math[+i]));
}

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

let mermaidLoading;
function loadMermaid() {
  mermaidLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'vendor/mermaid.min.js';
    s.onload = resolve;
    s.onerror = () => { mermaidLoading = null; reject(new Error('mermaid failed to load')); };
    document.head.appendChild(s);
  });
  return mermaidLoading;
}

// Upgrade rendered HTML: tables, code highlighting, maths, diagrams.
async function enhance(el) {
  $$('table', el).forEach(t => {
    if (t.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap);
    wrap.appendChild(t);
  });
  const diagrams = $$('code.language-mermaid', el).map(code => {
    const d = document.createElement('div');
    d.className = 'mermaid';
    d.textContent = code.textContent;
    code.parentElement.replaceWith(d);
    return d;
  });
  $$('a[href^="http"]', el).forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  if (window.hljs) $$('pre code', el).forEach(c => hljs.highlightElement(c));
  if (window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }
  if (diagrams.length) {
    try {
      await loadMermaid();
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark() ? 'dark' : 'default',
        fontFamily: getComputedStyle(document.body).fontFamily,
        securityLevel: 'strict',
      });
      await mermaid.run({ nodes: diagrams });
    } catch (e) {
      console.warn(e);
    }
  }
}

/* ================= Progress ================= */
const doneKey = (s, t) => `${s.id}/${t.id}`;
const getDone = () => store.get('done', {});
function setDone(s, t, value) {
  const d = getDone();
  if (value) d[doneKey(s, t)] = true; else delete d[doneKey(s, t)];
  store.set('done', d);
}
const getMistakes = s => new Set(store.get('mistakes:' + s.id, []));
const saveMistakes = (s, set) => store.set('mistakes:' + s.id, [...set]);

/* ================= Views ================= */
let keyHandler = null;
document.addEventListener('keydown', e => {
  if (!keyHandler || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('input, textarea, select')) return;
  keyHandler(e);
});

const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items
  .map(([label, href]) => (href ? `<a href="${href}">${label}</a>` : `<span>${label}</span>`))
  .join('<span aria-hidden="true">/</span>')}</nav>`;

function setTitle(...parts) {
  document.title = [...parts, 'CP Learning Hub'].filter(Boolean).join(' · ');
}

async function viewHome() {
  const m = await getManifest();
  const done = getDone();
  setTitle();
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">CP Learning Hub</p>
      <h1>What are we solving today?</h1>
      <p class="lede">Algorithm notes, solved Luogu problems with full C++ code, flashcards, quizzes that remember your mistakes, and a cheat sheet.</p>
    </section>
    <div class="subject-grid">
      ${m.subjects.map(s => {
        const topics = allTopics(s);
        const d = topics.filter(t => done[doneKey(s, t)]).length;
        const pct = topics.length ? Math.round((d / topics.length) * 100) : 0;
        const mistakes = getMistakes(s).size;
        return `
        <article class="subject-card" data-subject="${esc(s.id)}">
          <a class="subject-link" href="#/s/${s.id}">
            <span class="badge">${esc(s.short)}</span>
            <h2>${biTitle(s.name)}</h2>
          </a>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Topics done"><div style="width:${pct}%"></div></div>
          <p class="muted">${d} of ${topics.length} topics done</p>
          <nav class="quick" aria-label="${esc(plain(s.name))} tools">
            <a href="#/s/${s.id}">Notes</a>
            <a href="#/s/${s.id}/cards">Flashcards</a>
            <a href="#/s/${s.id}/quiz">Quiz</a>
            <a href="#/s/${s.id}/formulas">${esc(s.formulaLabel || 'Formula sheet')}</a>
          </nav>
          ${mistakes ? `<a class="pill warn" href="#/s/${s.id}/quiz?mode=mistakes">Review ${mistakes} mistake${mistakes > 1 ? 's' : ''}</a>` : ''}
        </article>`;
      }).join('')}
    </div>`;
}

async function viewSubject(s) {
  const [cards, done] = [await getCards(s), getDone()];
  const mistakes = getMistakes(s).size;
  setTitle(plain(s.name));
  app.innerHTML = `
    ${crumbs([['Home', '#/'], [biTitle(s.name)]])}
    <div class="subject-head">
      <span class="badge">${esc(s.short)}</span>
      <h1>${biTitle(s.name)}</h1>
    </div>
    ${s.description ? `<p class="lede">${bi(s.description)}</p>` : ''}
    <div class="btn-row" style="margin-top:16px">
      <a class="btn primary" href="#/s/${s.id}/cards">Flashcards (${cards.flashcards.length})</a>
      <a class="btn" href="#/s/${s.id}/quiz">Quiz (${cards.quiz.length})</a>
      <a class="btn" href="#/s/${s.id}/formulas">${esc(s.formulaLabel || 'Formula sheet')}</a>
      ${mistakes ? `<a class="btn" href="#/s/${s.id}/quiz?mode=mistakes">Review mistakes (${mistakes})</a>` : ''}
    </div>
    ${s.chapters.map(c => `
      <section class="chapter">
        <h2>Chapter ${esc(c.id)} · ${biTitle(c.title)}</h2>
        <ol class="topic-list">
          ${c.topics.map(t => `
            <li><a href="#/s/${s.id}/n/${encodeURIComponent(t.id)}">
              <span class="num">${esc(t.id)}</span>
              <span class="t">${biTitle(t.title)}</span>
              ${done[doneKey(s, t)] ? '<span class="check" aria-label="done">✓</span>' : ''}
            </a></li>`).join('')}
        </ol>
      </section>`).join('')}`;
}

async function viewNote(s, id) {
  const topics = allTopics(s);
  const idx = topics.findIndex(t => t.id === id);
  if (idx < 0) return notFound();
  const t = topics[idx];
  const md = await load(topicFile(s, t));
  const prev = topics[idx - 1];
  const next = topics[idx + 1];
  const isDone = !!getDone()[doneKey(s, t)];
  setTitle(`${t.id} ${plain(t.title)}`, plain(s.name));

  app.innerHTML = `
    <div class="narrow">
      ${crumbs([['Home', '#/'], [biTitle(s.name), `#/s/${s.id}`], [esc(t.id)]])}
      <article class="prose">${renderMarkdown(md)}</article>
      <div class="note-actions">
        <button class="btn" id="done-btn" type="button" aria-pressed="${isDone}">${isDone ? '✓ Done' : 'Mark as done'}</button>
        <a class="btn" href="#/s/${s.id}/cards?topic=${encodeURIComponent(t.id)}">Flashcards for ${esc(t.id)}</a>
        <a class="btn" href="#/s/${s.id}/quiz?topic=${encodeURIComponent(t.id)}">Quiz on ${esc(t.id)}</a>
      </div>
      <nav class="pager" aria-label="Topic navigation">
        ${prev ? `<a class="prev" href="#/s/${s.id}/n/${encodeURIComponent(prev.id)}"><small>← Previous</small>${esc(prev.id)} ${biTitle(prev.title)}</a>` : ''}
        ${next ? `<a class="next" href="#/s/${s.id}/n/${encodeURIComponent(next.id)}"><small>Next →</small>${esc(next.id)} ${biTitle(next.title)}</a>` : ''}
      </nav>
    </div>`;

  $('#done-btn').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    setDone(s, t, on);
    e.currentTarget.setAttribute('aria-pressed', on);
    e.currentTarget.textContent = on ? '✓ Done' : 'Mark as done';
  });
  await enhance($('.prose', app));
}

function topicSelect(s, current, base) {
  return `<select aria-label="Filter by topic" onchange="location.hash='${base}'+(this.value?'?topic='+encodeURIComponent(this.value):'')">
    <option value="">All topics</option>
    ${allTopics(s).map(t => `<option value="${esc(t.id)}" ${t.id === current ? 'selected' : ''}>${esc(t.id)} ${esc(plain(t.title))}</option>`).join('')}
  </select>`;
}

async function viewCards(s, topic) {
  const data = await getCards(s);
  const deck = data.flashcards.filter(c => !topic || c.topic === topic);
  setTitle('Flashcards', plain(s.name));

  app.innerHTML = `
    <div class="narrow">
      ${crumbs([['Home', '#/'], [biTitle(s.name), `#/s/${s.id}`], ['Flashcards']])}
      <div class="toolbar">
        <h1 style="margin:0;flex:1">Flashcards</h1>
        ${topicSelect(s, topic, `#/s/${s.id}/cards`)}
      </div>
      <div id="deck"></div>
    </div>`;
  const el = $('#deck');
  if (!deck.length) {
    el.innerHTML = `<p class="empty">No flashcards for this topic yet. Add some in <code>content/${esc(s.id)}/cards.json</code>.</p>`;
    return;
  }

  let queue, flipped, learned;
  const reset = () => { queue = shuffle(deck.map((_, i) => i)); flipped = false; learned = 0; };
  reset();

  const render = () => {
    if (!queue.length) {
      keyHandler = null;
      el.innerHTML = `
        <div class="quiz-card" style="text-align:center">
          <p class="score-big">${deck.length}/${deck.length}</p>
          <p>All cards learned. Nice work!</p>
          <div class="btn-row" style="justify-content:center">
            <button class="btn primary" id="restart" type="button">Go again</button>
            <a class="btn" href="#/s/${s.id}/quiz${topic ? '?topic=' + encodeURIComponent(topic) : ''}">Take the quiz</a>
          </div>
        </div>`;
      $('#restart').onclick = () => { reset(); render(); };
      return;
    }
    const card = deck[queue[0]];
    el.innerHTML = `
      <div class="flashcard" id="card" role="button" tabindex="0" aria-label="${flipped ? 'Answer shown' : 'Show answer'}">
        ${flipped
          ? `<div class="front-small">${bi(card.front)}</div><hr><div class="label">Answer</div><div class="answer">${bi(card.back)}</div>`
          : `<div class="label">Question${card.topic ? ' · ' + esc(card.topic) : ''}</div><div>${bi(card.front)}</div>`}
      </div>
      <div class="card-controls">
        ${flipped
          ? `<button class="btn again" id="again" type="button">Again <kbd>1</kbd></button>
             <button class="btn got" id="got" type="button">Got it <kbd>2</kbd></button>`
          : `<button class="btn primary" id="flip" type="button">Show answer <kbd>Space</kbd></button>`}
      </div>
      <p class="stat">${learned} learned · ${queue.length} left</p>`;
    enhance(el);
    const flip = () => { if (!flipped) { flipped = true; render(); } };
    const again = () => { queue.push(queue.shift()); flipped = false; render(); };
    const got = () => { queue.shift(); learned++; flipped = false; render(); };
    $('#card').onclick = flip;
    if (flipped) { $('#again').onclick = again; $('#got').onclick = got; $('#got').focus(); }
    else $('#flip').onclick = flip;
    keyHandler = e => {
      if ((e.key === ' ' || e.key === 'Enter') && !flipped) { e.preventDefault(); flip(); }
      else if (e.key === '1' && flipped) again();
      else if (e.key === '2' && flipped) got();
    };
  };
  render();
}

async function viewQuiz(s, topic, mode) {
  const data = await getCards(s);
  const mistakes = getMistakes(s);
  const reviewing = mode === 'mistakes';
  const pool = data.quiz.filter(q => (!topic || q.topic === topic) && (!reviewing || mistakes.has(qid(q))));
  const questions = shuffle(pool).map(q => ({ q, order: shuffle(q.options.map((_, i) => i)) }));
  setTitle(reviewing ? 'Review mistakes' : 'Quiz', plain(s.name));

  app.innerHTML = `
    <div class="narrow">
      ${crumbs([['Home', '#/'], [biTitle(s.name), `#/s/${s.id}`], [reviewing ? 'Review mistakes' : 'Quiz']])}
      <div class="toolbar">
        <h1 style="margin:0;flex:1">${reviewing ? 'Review mistakes' : 'Quiz'}</h1>
        ${reviewing ? `<a class="btn" href="#/s/${s.id}/quiz">All questions</a>` : topicSelect(s, topic, `#/s/${s.id}/quiz`)}
      </div>
      <div id="quiz"></div>
    </div>`;
  const el = $('#quiz');
  if (!questions.length) {
    el.innerHTML = `<p class="empty">${reviewing ? 'No mistakes to review — well done!' : `No questions for this topic yet. Add some in <code>content/${esc(s.id)}/cards.json</code>.`}</p>`;
    return;
  }

  let i = 0, score = 0;
  const LETTERS = 'ABCDEFGH';

  const finish = () => {
    keyHandler = null;
    const left = getMistakes(s).size;
    const pct = Math.round((score / questions.length) * 100);
    el.innerHTML = `
      <div class="quiz-card" style="text-align:center">
        <p class="score-big">${score}/${questions.length}</p>
        <p>${pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort — review the ones you missed.' : 'Keep going — go over the notes and try again.'}</p>
        <div class="btn-row" style="justify-content:center">
          <button class="btn primary" id="retry" type="button">Try again</button>
          ${left ? `<a class="btn" href="#/s/${s.id}/quiz?mode=mistakes">Review mistakes (${left})</a>` : ''}
          <a class="btn" href="#/s/${s.id}">Back to notes</a>
        </div>
      </div>`;
    $('#retry').onclick = () => viewQuiz(s, topic, mode);
  };

  const render = () => {
    const { q, order } = questions[i];
    let answered = false;
    el.innerHTML = `
      <div class="quiz-card">
        <p class="muted" style="margin:0">Question ${i + 1} of ${questions.length} · Score ${score}${q.topic ? ' · Topic ' + esc(q.topic) : ''}</p>
        <div class="question">${bi(q.q)}</div>
        <div class="options">
          ${order.map((oi, k) => `<button class="option" type="button" data-oi="${oi}"><span class="key">${LETTERS[k]}</span><span>${bi(q.options[oi])}</span></button>`).join('')}
        </div>
        <div id="feedback"></div>
      </div>`;
    enhance(el);

    const answer = oi => {
      if (answered) return;
      answered = true;
      const correct = oi === q.answer;
      $$('.option', el).forEach(b => {
        const bo = +b.dataset.oi;
        b.disabled = true;
        if (bo === q.answer) b.classList.add('correct');
        else if (bo === oi) b.classList.add('wrong');
      });
      const m = getMistakes(s);
      if (correct) { score++; if (reviewing) m.delete(qid(q)); }
      else m.add(qid(q));
      saveMistakes(s, m);
      const last = i === questions.length - 1;
      const fb = $('#feedback');
      fb.innerHTML = `
        <div class="feedback ${correct ? 'good' : 'bad'}" role="status">
          <strong>${correct ? 'Correct!' : 'Not quite.'}</strong>
          ${q.explain ? bi(q.explain) : ''}
        </div>
        <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="next" type="button">${last ? 'See results' : 'Next question'} <kbd>Enter</kbd></button></div>`;
      enhance(fb);
      $('#next').onclick = () => { if (last) finish(); else { i++; render(); } };
      $('#next').focus();
    };

    $$('.option', el).forEach(b => (b.onclick = () => answer(+b.dataset.oi)));
    keyHandler = e => {
      const k = e.key.toUpperCase();
      const n = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : '123456789'.indexOf(e.key);
      if (!answered && n >= 0 && n < order.length) answer(order[n]);
    };
  };
  render();
}

async function viewFormulas(s) {
  const md = await load(`content/${s.id}/formulas.md`);
  const label = s.formulaLabel || 'Formula sheet';
  setTitle(label, plain(s.name));
  app.innerHTML = `
    <div class="narrow">
      ${crumbs([['Home', '#/'], [biTitle(s.name), `#/s/${s.id}`], [esc(label)]])}
      <div class="btn-row no-print" style="justify-content:flex-end;margin-bottom:12px">
        <button class="btn" type="button" onclick="print()">Print / save as PDF</button>
      </div>
      <article class="prose">${renderMarkdown(md)}</article>
    </div>`;
  await enhance($('.prose', app));
}

function snippet(text, query) {
  const lower = text.toLowerCase();
  const at = lower.indexOf(query.toLowerCase());
  if (at < 0) return esc(text.slice(0, 140));
  const start = Math.max(0, at - 60);
  const end = Math.min(text.length, at + query.length + 80);
  const before = text.slice(start, at);
  const hit = text.slice(at, at + query.length);
  const after = text.slice(at + query.length, end);
  return `${start > 0 ? '…' : ''}${esc(before)}<mark>${esc(hit)}</mark>${esc(after)}${end < text.length ? '…' : ''}`;
}

const mdToPlain = md => md
  .replace(/```[a-z]*\n?/g, ' ')
  .replace(TERM_RE, '$1 $2')
  .replace(/[#>*_|`$\\]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function viewSearch(query) {
  setTitle('Search');
  $('#search-input').value = query;
  app.innerHTML = `
    <div class="narrow">
      ${crumbs([['Home', '#/'], ['Search']])}
      <h1>Search${query ? `: “${esc(query)}”` : ''}</h1>
      <div id="results"><p class="loading">Searching…</p></div>
    </div>`;
  const out = $('#results');
  if (!query.trim()) { out.innerHTML = '<p class="empty">Type something in the search box above.</p>'; return; }

  const q = query.trim().toLowerCase();
  const m = await getManifest();
  const hits = [];
  await Promise.all(m.subjects.map(async s => {
    const topics = allTopics(s);
    const texts = await Promise.all(topics.map(t => load(topicFile(s, t)).catch(() => '')));
    topics.forEach((t, k) => {
      const text = mdToPlain(texts[k]);
      const titleText = `${t.id} ${plain(t.title)}`;
      if (titleText.toLowerCase().includes(q) || text.toLowerCase().includes(q)) {
        hits.push({ s, href: `#/s/${s.id}/n/${encodeURIComponent(t.id)}`, where: `${plain(s.name)} · Notes`, title: `${esc(t.id)} ${biTitle(t.title)}`, snip: snippet(text, query.trim()) });
      }
    });
    const cards = await getCards(s);
    cards.flashcards.forEach(c => {
      const text = `${plain(c.front)} — ${plain(c.back)}`.replace(TERM_RE, '$1 $2');
      if (text.toLowerCase().includes(q)) {
        hits.push({ s, href: `#/s/${s.id}/cards${c.topic ? '?topic=' + encodeURIComponent(c.topic) : ''}`, where: `${plain(s.name)} · Flashcard`, title: esc(plain(c.front).replace(TERM_RE, '$1')), snip: snippet(text, query.trim()) });
      }
    });
  }));

  out.innerHTML = hits.length
    ? `<p class="muted">${hits.length} result${hits.length > 1 ? 's' : ''}</p>
       <ul class="results">${hits.map(h => `
         <li data-subject="${esc(h.s.id)}"><a href="${h.href}">
           <div class="where">${esc(h.where)}</div>
           <div>${h.title}</div>
           <div class="snip">${h.snip}</div>
         </a></li>`).join('')}</ul>`
    : '<p class="empty">No matches. Try a different word — English or 中文.</p>';
}

function notFound() {
  setTitle('Not found');
  app.innerHTML = `<p class="empty">Page not found. <a href="#/">Go home</a></p>`;
}

/* ================= Router ================= */
async function route() {
  keyHandler = null;
  const hash = location.hash.slice(1) || '/';
  const [path, qs] = hash.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  delete app.dataset.subject;
  app.innerHTML = '<p class="loading">Loading…</p>';

  try {
    if (!parts.length) await viewHome();
    else if (parts[0] === 's' && parts[1]) {
      const s = await getSubject(parts[1]);
      if (!s) return notFound();
      app.dataset.subject = s.id;
      const [, , view, id] = parts;
      if (!view) await viewSubject(s);
      else if (view === 'n' && id) await viewNote(s, id);
      else if (view === 'cards') await viewCards(s, params.get('topic'));
      else if (view === 'quiz') await viewQuiz(s, params.get('topic'), params.get('mode'));
      else if (view === 'formulas') await viewFormulas(s);
      else notFound();
    } else if (parts[0] === 'search') await viewSearch(parts.slice(1).join('/'));
    else notFound();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="error"><strong>Something went wrong.</strong><br>${esc(e.message)}${
      location.protocol === 'file:' ? '<br><br>Open this site through a web server (e.g. <code>python3 -m http.server</code>) or GitHub Pages — browsers block loading notes from <code>file://</code>.' : ''}</div>`;
  }
  window.scrollTo(0, 0);
}

/* ================= Header controls ================= */
$('#search-form').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#search-input').value.trim();
  location.hash = '#/search/' + encodeURIComponent(q);
});

$('#theme-toggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
  if ($('.mermaid', app)) route(); // re-draw diagrams in the new theme
});

window.addEventListener('hashchange', route);
route();

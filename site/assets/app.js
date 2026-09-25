'use strict';

/* ================= Helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

const store = {
  set(key, value) {
    try { localStorage.setItem('study:' + key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

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

const getProjects = async () => (await load('content/projects.json', 'json')).projects;

/* ================= Markdown ================= */
function renderMarkdown(src) {
  const math = [];
  // Protect math outside fenced code so Markdown doesn't mangle _ and * inside it.
  const text = src.split(/(^```[\s\S]*?^```)/m).map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, m => `@@MATH${math.push(m) - 1}@@`);
  }).join('');
  if (!window.marked) return `<pre>${esc(src)}</pre>`;
  return marked.parse(text).replace(/@@MATH(\d+)@@/g, (_, i) => esc(math[+i]));
}

// Upgrade rendered HTML: tables, links, code highlighting, maths.
function enhance(el) {
  $$('table', el).forEach(t => {
    if (t.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap);
    wrap.appendChild(t);
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
}

/* ================= Views ================= */
function setTitle(...parts) {
  document.title = [...parts, 'CP Learning Hub'].filter(Boolean).join(' · ');
}

const demoLinks = p => p.demos.map(d => `
  <a class="demo" href="${esc(d.url)}" target="_blank" rel="noopener">
    <span class="demo-name">${esc(d.name)} <span aria-hidden="true">↗</span></span>
    <span class="demo-desc">${esc(d.desc)}</span>
  </a>`).join('');

async function viewHome() {
  const projects = await getProjects();
  setTitle();
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">CP Learning Hub</p>
      <h1>Solved problems & interactive demos</h1>
      <p class="lede">${projects.length} competitive programming projects. Each one has the full C++ solution, tested on the problem's sample, and a step-by-step demo you can play with.</p>
    </section>
    <div class="project-grid">
      ${projects.map(p => `
        <article class="project-card">
          <a class="project-link" href="#/p/${esc(p.id)}">
            <span class="pid">${esc(p.code)}</span>
            <h2>${esc(p.title)}</h2>
          </a>
          <p class="summary">${esc(p.summary)}</p>
          <ul class="tags" aria-label="Topics">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <div class="card-actions">
            <a class="btn primary" href="#/p/${esc(p.id)}">View code</a>
            ${p.demos.map(d => `<a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.name)} ↗</a>`).join('')}
          </div>
        </article>`).join('')}
    </div>
    <p class="note">Demo links open Claude artifacts. They are private until their owner shares them.</p>`;
}

async function viewProject(id) {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx < 0) return notFound();
  const p = projects[idx];
  const md = await load(`content/projects/${p.file}`);
  const prev = projects[idx - 1];
  const next = projects[idx + 1];
  setTitle(`${p.code} ${p.title}`);

  app.innerHTML = `
    <div class="narrow">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All projects</a><span aria-hidden="true">/</span><span>${esc(p.code)}</span></nav>
      <section class="demos-box" aria-label="Interactive demos">
        <h2>Interactive demo${p.demos.length > 1 ? 's' : ''}</h2>
        <div class="demo-list">${demoLinks(p)}</div>
      </section>
      <article class="prose">${renderMarkdown(md)}</article>
      <nav class="pager" aria-label="Project navigation">
        ${prev ? `<a class="prev" href="#/p/${esc(prev.id)}"><small>← Previous</small>${esc(prev.code)} ${esc(prev.title)}</a>` : ''}
        ${next ? `<a class="next" href="#/p/${esc(next.id)}"><small>Next →</small>${esc(next.code)} ${esc(next.title)}</a>` : ''}
      </nav>
    </div>`;
  enhance($('.prose', app));
}

function notFound() {
  setTitle('Not found');
  app.innerHTML = `<p class="empty">Page not found. <a href="#/">See all projects</a></p>`;
}

/* ================= Router ================= */
async function route() {
  const parts = location.hash.slice(1).split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  app.innerHTML = '<p class="loading">Loading…</p>';
  try {
    if (!parts.length) await viewHome();
    else if (parts[0] === 'p' && parts[1]) await viewProject(parts[1]);
    else notFound();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="error"><strong>This page could not load.</strong><br>${esc(e.message)}${
      location.protocol === 'file:' ? '<br><br>Open this site through a web server (e.g. <code>python3 -m http.server</code>) or GitHub Pages — browsers block loading files from <code>file://</code>.' : ''}</div>`;
  }
  window.scrollTo(0, 0);
}

/* ================= Header controls ================= */
$('#theme-toggle').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});

window.addEventListener('hashchange', route);
route();

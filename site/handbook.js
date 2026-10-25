(() => {
  'use strict';
  const form = document.querySelector('.handbook-search');
  const input = document.getElementById('handbook-search');
  const results = document.getElementById('handbook-results');
  const locale = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  const make = (name, value, className) => {
    const element = document.createElement(name);
    if (value !== undefined) element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  const contents = document.getElementById('handbook-directory');
  if (contents) contents.open = !matchMedia('(max-width: 760px)').matches;
  document.querySelectorAll('[data-handbook-print]').forEach(button => button.addEventListener('click', () => window.print()));

  // Progressive enhancement: the original code stays readable without scripts.
  document.querySelectorAll('.handbook-content pre').forEach(pre => {
    const source = pre.querySelector('code') || pre;
    const actions = make('div', undefined, 'handbook-code-actions');
    const button = make('button', locale === 'en' ? 'Copy text' : '复制内容');
    const status = make('span', '', 'handbook-copy-status');
    button.type = 'button';
    button.dataset.handbookCopy = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    let copying = false;
    button.addEventListener('click', async () => {
      if (copying) return;
      copying = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = '';
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(source.textContent);
        status.textContent = locale === 'en' ? 'Copied. Ready to paste.' : '已复制，可以粘贴使用。';
      } catch {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(source);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        status.textContent = locale === 'en'
          ? 'Copy unavailable. Select the text and copy it manually.'
          : '暂时无法复制。请选中文字后手动复制。';
      } finally {
        copying = false;
        button.setAttribute('aria-busy', 'false');
      }
    });
    actions.append(button, status);
    pre.before(actions);
  });

  if (!form || !input || !results) return;
  input.value = (new URL(location.href).searchParams.get('q') || '').slice(0, 160);
  let index, pending, sequence = 0, composing = false, timer;
  function saveRoute() {
    const route = new URL(location.href);
    const query = input.value.trim();
    if (query) route.searchParams.set('q', query); else route.searchParams.delete('q');
    history.replaceState(null, '', route.pathname + route.search + route.hash);
    const language = document.querySelector('[data-handbook-language]');
    if (language) {
      const target = new URL(language.getAttribute('href'), location.href);
      if (query) target.searchParams.set('q', query); else target.searchParams.delete('q');
      target.hash = route.hash;
      language.href = target.pathname + target.search + target.hash;
    }
  }
  function validTarget(value) {
    return typeof value === 'string' && /^\.\/handbook-[a-z0-9-]+(?:\.en)?\.html#[a-z0-9-]+$/.test(value);
  }
  async function load() {
    if (index) return index;
    if (!pending) pending = (async () => {
      const response = await fetch(form.dataset.index, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.schema !== 'awesome.bot.handbook-search/1' || data.locale !== locale || !Array.isArray(data.entries)
        || data.entries.some(e => !validTarget(e.url) || ['id', 'title', 'chapter', 'summary', 'text'].some(k => typeof e[k] !== 'string'))) {
        throw new Error('Invalid index');
      }
      index = data.entries.map(e => ({ ...e, haystack: [e.title, e.chapter, e.summary, e.text].join('\n').toLocaleLowerCase() }));
      return index;
    })().finally(() => { pending = null; });
    return pending;
  }
  function excerpt(entry, terms) {
    const text = entry.text.replace(/\s+/g, ' ').trim();
    const positions = terms.map(term => text.toLocaleLowerCase().indexOf(term)).filter(position => position >= 0);
    if (!positions.length) return entry.summary;
    const start = Math.max(0, Math.min(...positions) - 48);
    const end = Math.min(text.length, start + 180);
    return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }
  async function search() {
    clearTimeout(timer);
    const request = ++sequence;
    input.value = input.value.slice(0, 160);
    saveRoute();
    const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    results.hidden = !terms.length;
    if (!terms.length) {
      results.replaceChildren();
      results.setAttribute('aria-busy', 'false');
      return;
    }
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren(make('p', results.dataset.loading));
    try {
      const entries = await load();
      if (request !== sequence) return;
      const matches = entries.filter(e => terms.every(term => e.haystack.includes(term)))
        .sort((a, b) => Number(terms.some(t => b.title.toLocaleLowerCase().includes(t))) - Number(terms.some(t => a.title.toLocaleLowerCase().includes(t))));
      results.replaceChildren();
      if (!matches.length) results.append(make('p', results.dataset.empty));
      else {
        results.append(make('p', locale === 'en' ? `${matches.length} matching ${matches.length === 1 ? 'section' : 'sections'}` : `找到 ${matches.length} 个相关小节`));
        const list = make('ol');
        for (const entry of matches) {
          const item = make('li');
          const link = make('a', entry.chapter + ' · ' + entry.title);
          link.href = entry.url;
          item.append(link, make('p', excerpt(entry, terms)));
          list.append(item);
        }
        results.append(list);
      }
    } catch {
      if (request !== sequence) return;
      const retry = make('button', results.dataset.retry);
      retry.type = 'button';
      retry.addEventListener('click', search);
      results.replaceChildren(make('p', results.dataset.failed), retry);
    } finally {
      if (request === sequence) results.setAttribute('aria-busy', 'false');
    }
  }
  function schedule() {
    clearTimeout(timer);
    ++sequence;
    if (!composing) {
      results.setAttribute('aria-busy', 'true');
      timer = setTimeout(search, 120);
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); if (!composing) search(); });
  input.addEventListener('input', event => { if (!event.isComposing) schedule(); });
  input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); ++sequence; });
  input.addEventListener('compositionend', () => { composing = false; schedule(); });
  window.addEventListener('popstate', () => { input.value = (new URL(location.href).searchParams.get('q') || '').slice(0, 160); search(); });
  window.addEventListener('hashchange', saveRoute);
  saveRoute();
  if (input.value.trim()) search();
})();

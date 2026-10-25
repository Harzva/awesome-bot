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
  const routeElement = document.getElementById('handbook-path-data');
  const routeData = routeElement ? JSON.parse(routeElement.textContent) : null;
  const pathContext = document.querySelector('.handbook-path-context');
  const pager = document.querySelector('.handbook-pager');
  const fullBookPager = pager ? Array.from(pager.childNodes, node => node.cloneNode(true)) : [];
  const originalLinks = new WeakMap();
  let completion;
  const selectedPath = () => routeData?.paths.find(path => path.id === new URL(location.href).searchParams.get('path'));
  function routeLink(value, path = selectedPath()) {
    const target = new URL(value, location.href);
    if (path) target.searchParams.set('path', path.id);
    return target.pathname + target.search + target.hash;
  }
  function syncHandbookLinks() {
    const path = selectedPath();
    document.querySelectorAll('a[href]').forEach(link => {
      if (!originalLinks.has(link)) originalLinks.set(link, link.getAttribute('href'));
      const original = originalLinks.get(link);
      // Same-page anchors already retain the current query, including path and q.
      if (original.startsWith('#') || link.hasAttribute('data-handbook-path-exit') || link.hasAttribute('data-handbook-path-choice')) return;
      const target = new URL(original, location.href);
      if (target.origin !== location.origin || !/\/handbook(?:-[a-z0-9-]+)?(?:\.en)?\.html$/.test(target.pathname)) return;
      const explicitPath = routeData?.paths.find(item => item.id === target.searchParams.get('path'));
      if (!explicitPath) {
        target.searchParams.delete('path');
        if (path) target.searchParams.set('path', path.id);
      }
      if (link.hasAttribute('data-handbook-language')) {
        const current = new URL(location.href);
        const query = current.searchParams.get('q');
        if (query) target.searchParams.set('q', query); else target.searchParams.delete('q');
        target.hash = current.hash;
      }
      link.href = target.pathname + target.search + target.hash;
    });
  }
  function pathAnchor(title, href) {
    const link = make('a', title);
    link.href = href;
    return link;
  }
  function renderPath() {
    const path = selectedPath();
    document.querySelectorAll('[data-handbook-completion-link]').forEach(link => { link.hidden = false; });
    if (completion) { completion.remove(); completion = null; }
    if (pager) { pager.hidden = false; pager.replaceChildren(...fullBookPager.map(node => node.cloneNode(true))); }
    if (pathContext) {
      pathContext.hidden = !path;
      pathContext.replaceChildren();
      if (path) {
        const position = path.chapters.indexOf(routeData.chapter);
        const w = routeData.words;
        const readingPosition = position >= 0
          ? (locale === 'en' ? `Chapter ${position + 1}/${path.chapters.length}` : `第 ${position + 1}/${path.chapters.length} 章`)
          : w.supplementary;
        pathContext.append(document.createTextNode(`${path.title} · ${readingPosition} · `), pathAnchor(w.pathDirectory, routeLink(`${routeData.home}#path-${path.id}`, path)), document.createTextNode(' · '));
        const exit = new URL(location.href);
        exit.searchParams.delete('path');
        const exitLink = pathAnchor(w.exitPath, exit.pathname + exit.search + exit.hash);
        exitLink.dataset.handbookPathExit = '';
        pathContext.append(exitLink);
        if (pager) {
          pager.replaceChildren();
          pager.hidden = position < 0;
          if (position >= 0) {
            for (const [offset, relation, title] of [[-1, 'prev', w.previous], [1, 'next', w.next]]) {
              const chapter = routeData.chapters.find(item => item.id === path.chapters[position + offset]);
              if (chapter) {
                const link = pathAnchor(`${title}: ${chapter.title}`, routeLink(chapter.url, path));
                link.rel = relation;
                pager.append(link);
              }
            }
            if (position === path.chapters.length - 1) {
              completion = make('section', undefined, 'handbook-path-completion');
              completion.id = 'handbook-path-completion';
              completion.append(make('h2', w.completion), make('p', w.completionIntro));
              const checks = make('ul');
              path.completionChecks.forEach(check => {
                const item = make('li');
                item.append(pathAnchor(check.title, check.url));
                checks.append(item);
              });
              const practices = make('ul');
              path.practiceLinks.forEach(practice => { const item = make('li'); item.append(pathAnchor(practice.title, practice.url)); practices.append(item); });
              completion.append(checks, make('h3', w.practice), practices, pathAnchor(w.pathDirectory, routeLink(`${routeData.home}#path-${path.id}`, path)));
              pager.before(completion);
            }
          }
        }
      }
    }
    syncHandbookLinks();
    if (completion && location.hash === '#handbook-path-completion') completion.scrollIntoView();
  }
  renderPath();
  const contents = document.getElementById('handbook-directory');
  if (contents) contents.open = !matchMedia('(max-width: 760px)').matches;
  document.querySelectorAll('[data-handbook-print]').forEach(button => button.addEventListener('click', () => window.print()));

  // Progressive enhancement: the original code stays readable without scripts.
  document.querySelectorAll('.handbook-content pre').forEach(pre => {
    const source = pre.querySelector('code') || pre;
    const actions = make('div', undefined, 'handbook-code-actions');
    const button = make('button', pre.dataset.copyLabel || (locale === 'en' ? 'Copy text' : '复制内容'));
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
    syncHandbookLinks();
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
          originalLinks.set(link, entry.url);
          link.href = routeLink(entry.url);
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
  window.addEventListener('popstate', () => { renderPath(); input.value = (new URL(location.href).searchParams.get('q') || '').slice(0, 160); search(); });
  window.addEventListener('hashchange', saveRoute);
  saveRoute();
  if (input.value.trim()) search();
})();

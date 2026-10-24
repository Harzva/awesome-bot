(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(['search', 'source', 'platform', 'count', 'list', 'empty', 'error', 'retry', 'prev', 'next', 'page', 'language', 'sources', 'form'].map(k => [k, $('shared-' + k)]));
  const zh = {};
  document.querySelectorAll('[data-copy]').forEach(el => { zh[el.dataset.copy] = el.textContent; });
  document.querySelectorAll('[data-copy-placeholder]').forEach(el => { zh[el.dataset.copyPlaceholder] = el.placeholder; });
  document.querySelectorAll('[data-copy-aria-label]').forEach(el => { zh[el.dataset.copyAriaLabel] = el.getAttribute('aria-label'); });
  const en = { docTitle: 'Awesome Bot · Shared Bots', skipMain: 'Skip to directory', homeLabel: 'Awesome Bot home', navigationLabel: 'Main navigation', navMarket: 'Bot marketplace', navResources: 'Projects & references', navHandbook: 'Handbook', languageLabel: 'Switch interface language', languageSwitch: '中文', pageTitle: 'Shared Bots', intro: 'Discover specific Bots across public marketplaces and their original source entries.', boundary: 'These are source links, not installable OpenBot templates. Compatibility and current link availability have not been individually tested. Original names and categories are retained.', searchRegionLabel: 'Search shared Bots', searchLabel: 'Search', searchPlaceholder: 'Search Bot name, author or source', sourceLabel: 'Source market', sourceFilterLabel: 'Filter by source market', sourceAll: 'All sources', platformLabel: 'Platform', platformFilterLabel: 'Filter by platform', platformAll: 'All platforms', platformXai: 'x.ai', platformTemplates: 'Templates', platformGitHub: 'GitHub', searchSubmit: 'Search', countLoading: 'Loading shared Bots…', listLoading: 'Reading the directory…', emptyTitle: 'No matching Bots', emptyBody: 'Try another name, author or source, or change the filters.', errorTitle: 'The directory could not load', errorBody: 'Retry, or read the original JSON index.', retry: 'Retry', paginationLabel: 'Directory pages', previousPage: 'Previous', pageInitial: 'Loading pages…', nextPage: 'Next', sourcesTitle: 'Sources and authors', sourcesBody: 'Names, authors and source records are indexed from the fixed repositories below. Unknown authors are not invented.', sourcesNote: 'Listing a Bot does not certify OpenBot compatibility or a working link. Read its source before use.', noScript: 'Enable JavaScript to search and paginate, or read the JSON index.', jsonIndex: 'JSON index', footerText: 'Shared Bot source directory.' };
  const state = { data: null, rows: [], lang: 'zh', page: 1, error: false, loading: true };
  function readRoute() {
    const params = new URLSearchParams(location.search);
    state.lang = params.get('lang') === 'en' ? 'en' : 'zh';
    ui.search.value = (params.get('q') || '').slice(0, 240);
    ui.source.value = [...ui.source.options].some(o => o.value === params.get('source')) ? params.get('source') : 'all';
    ui.platform.value = ['xai', 'templates', 'github'].includes(params.get('platform')) ? params.get('platform') : 'all';
    const page = Number(params.get('page')); state.page = Number.isInteger(page) && page > 0 ? page : 1;
  }
  function writeRoute() {
    const params = new URLSearchParams();
    if (state.lang === 'en') params.set('lang', 'en');
    if (ui.search.value.trim()) params.set('q', ui.search.value.trim());
    if (ui.source.value !== 'all') params.set('source', ui.source.value);
    if (ui.platform.value !== 'all') params.set('platform', ui.platform.value);
    if (state.page > 1) params.set('page', String(state.page));
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
  }
  function copy() {
    const words = state.lang === 'en' ? en : zh;
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-copy]').forEach(el => { if (words[el.dataset.copy] !== undefined) el.textContent = words[el.dataset.copy]; });
    document.querySelectorAll('[data-copy-placeholder]').forEach(el => { el.placeholder = words[el.dataset.copyPlaceholder]; });
    document.querySelectorAll('[data-copy-aria-label]').forEach(el => { el.setAttribute('aria-label', words[el.dataset.copyAriaLabel]); });
    document.querySelectorAll('a[data-copy="navMarket"], a.brand').forEach(el => el.href = state.lang === 'en' ? './?lang=en' : './');
    document.querySelector('[data-copy="navResources"]').href = state.lang === 'en' ? './resources.en.html' : './resources.html';
    document.querySelector('[data-copy="navHandbook"]').href = state.lang === 'en' ? './handbook.en.html' : './handbook.html';
  }
  function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
  function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.search && ['x.ai', 'templatesgrokbot.com', 'github.com', 'raw.githubusercontent.com'].includes(u.hostname); } catch { return false; }
  }
  function link(url, text) { const a = node('a', text); if (safeUrl(url)) a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function sourcesList() {
    ui.sources.querySelector('.shared-source-records')?.remove();
    if (!state.data) return;
    const list = node('ul', undefined, 'shared-source-records');
    for (const s of state.data.sources) { const li = node('li'); li.append(link(s.url, s.repository), document.createTextNode(` · ${s.revision.slice(0, 12)} · ${s.license}`)); list.append(li); }
    const li = node('li'); li.append(link('https://github.com/Harzva/awesome-bot/blob/main/docs/market-aggregation.md', state.lang === 'en' ? 'Coverage, adapters and limitations' : '覆盖范围、适配方式与限制')); list.append(li);ui.sources.append(list);
  }
  function render() {
    ui.list.setAttribute('aria-busy', String(state.loading));
    ui.error.hidden = !state.error;
    ui.empty.hidden = true;
    ui.retry.disabled = state.loading;
    if (!state.data) { ui.prev.disabled = true; ui.next.disabled = true; if (state.error) {ui.list.replaceChildren();ui.count.textContent = state.lang === 'en' ? 'Directory unavailable' : '目录暂不可用';} return; }
    const terms = ui.search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rows = state.rows.filter(r => terms.every(t => r.search.includes(t)) && (ui.source.value === 'all' || r.item.sources.includes(ui.source.value)) && (ui.platform.value === 'all' || r.platform === ui.platform.value));
    const pages = Math.max(1, Math.ceil(rows.length / 50));state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * 50;const shown = rows.slice(start, start + 50);
    ui.count.textContent = state.lang === 'en' ? `${rows.length.toLocaleString()} / ${state.rows.length.toLocaleString()} source entries · ${shown.length ? start + 1 : 0}–${start + shown.length}` : `${rows.length.toLocaleString()} / ${state.rows.length.toLocaleString()} 条 Bot 来源 · 当前 ${shown.length ? start + 1 : 0}–${start + shown.length}`;
    ui.page.textContent = state.lang === 'en' ? `Page ${state.page} of ${pages}` : `第 ${state.page} / ${pages} 页`;
    ui.prev.disabled = state.page <= 1;ui.next.disabled = state.page >= pages;ui.empty.hidden = rows.length > 0;
    const fragment = document.createDocumentFragment();
    for (const { item } of shown) {
      const row = node('article', undefined, 'shared-row');row.dataset.url = item.url;
      const h = node('h2');h.append(link(item.url, item.name));row.append(h);
      const author = item.author || (state.lang === 'en' ? 'Author not provided' : '作者未注明');
      const kind = item.linkKind === 'source-file' ? (state.lang === 'en' ? 'Source entry · not adapted' : '来源条目 · 未适配') : (state.lang === 'en' ? 'Original-site Bot' : '原站 Bot');
      row.append(node('p', `${author} · ${item.category || '—'} · ${kind}`, 'shared-meta'));
      const details = node('details');details.append(node('summary', state.lang === 'en' ? `Sources (${item.sources.length})` : `来源（${item.sources.length}）`));
      for (const record of item.sourceRecords) { const source = state.data.sources.find(s => s.id === record.sourceId);const p = node('p');p.append(link(source.url, source.repository), document.createTextNode(` · ${record.recordId}`));details.append(p); }
      row.append(details);fragment.append(row);
    }
    ui.list.replaceChildren(fragment);writeRoute();
  }
  async function load() {
    state.loading = true;state.error = false;render();
    try {
      const response = await fetch('./shared-bots.json', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.schema !== 'awesome.bot.shared-bots/1' || data.installable !== false || !Array.isArray(data.entries) || !Array.isArray(data.sources)) throw new Error('Invalid index');
      const ids = new Set(data.sources.map(s => s.id));
      if (data.sources.some(s => typeof s.repository !== 'string' || typeof s.revision !== 'string' || !safeUrl(s.url)) || data.entries.some(e => typeof e.name !== 'string' || typeof e.author !== 'string' || typeof e.category !== 'string' || !safeUrl(e.url) || !Array.isArray(e.sources) || !e.sources.length || e.sources.some(id => !ids.has(id)) || !Array.isArray(e.sourceRecords) || e.sourceRecords.some(r => !e.sources.includes(r.sourceId) || typeof r.recordId !== 'string'))) throw new Error('Invalid source link');
      state.data = data;state.rows = data.entries.map(item => ({ item, search: [item.name, item.author, item.category, ...item.sources, ...item.sources.map(id => data.sources.find(s => s.id === id).repository)].join('\n').toLowerCase(), platform: item.url.startsWith('https://x.ai/') ? 'xai' : item.url.startsWith('https://templatesgrokbot.com/') ? 'templates' : 'github' }));
      ui.source.querySelectorAll('option:not([value="all"])').forEach(option => option.remove());
      for (const source of data.sources) { const option = node('option', source.repository); option.value = source.id;ui.source.append(option); }
      const requestedSource = new URLSearchParams(location.search).get('source');
      if (data.sources.some(s => s.id === requestedSource)) ui.source.value = requestedSource;
      copy();sourcesList();
    } catch { state.error = true; }
    state.loading = false;render();
  }
  const change = () => { state.page = 1;render(); };
  ui.search.addEventListener('input', change);ui.source.addEventListener('change', change);ui.platform.addEventListener('change', change);
  ui.form.addEventListener('submit', e => { e.preventDefault();change(); });
  ui.prev.addEventListener('click', () => {state.page--;render();ui.count.scrollIntoView({block:'start'});});
  ui.next.addEventListener('click', () => {state.page++;render();ui.count.scrollIntoView({block:'start'});});
  ui.language.addEventListener('click', () => {state.lang = state.lang === 'en' ? 'zh' : 'en';copy();sourcesList();render();});
  ui.retry.addEventListener('click', load);
  window.addEventListener('popstate', () => {readRoute();copy();sourcesList();render();});
  readRoute();copy();load();
})();

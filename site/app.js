(function () {
  'use strict';

  const root = typeof window === 'undefined' ? globalThis : window;
  const doc = root.document;
  const STORAGE_KEY = 'awesome-bot:favorites:v1';

  const copy = {
    zh: {
      navCatalog: '目录', navSubmit: '投稿', kicker: '一份可审阅的 Bot 目录', languageToggle: '切换界面语言',
      filterLabel: '目录筛选', botTypeLabel: 'Bot 类型', categoryFilter: '按分类筛选', sortControlLabel: '排序方式',
      title: '找到一个，把事情推进下去。',
      lede: '按角色和任务查找中文 Bot。看清职责、步骤和权限需求，再下载可复现的配置。',
      botsLabel: '个 Bot 可查', updatedLabel: '目录更新时间：', searchLabel: '搜索 Bot',
      searchPlaceholder: '搜索名称、职责、标签或来源', searchHint: '支持中文名称、摘要、标签、来源名称和条目 ID',
      allLabel: '全部', rolesLabel: '角色', workflowsLabel: '任务', categoryLabel: '分类',
      sortLabel: '排序', favoritesLabel: '只看收藏', categoriesTitle: '按工作场景',
      resultsKicker: '目录结果', resultsTitle: '全部条目', emptyTitle: '没有匹配的 Bot',
      emptyBody: '换一个关键词，或清除筛选后再试。', clearFilters: '清除筛选',
      downloadsKicker: '批量下载', downloadsTitle: '带走一组配置',
      downloadsBody: '下载只是配置文件，不会在本页面安装或启动 Bot。',
      downloadRoles: '角色', downloadWorkflows: '任务', downloadAll: '全部',
      bulkLimit: '超过单包上限，请逐项下载',
      sourceKicker: '来源与编辑', sourceTitle: '保留来路',
      sourceBody: '每个条目会标出来源、版本和许可证；缺少来源的社区条目会明确显示。',
      openRepo: '查看仓库', indexKicker: '机器可读',
      indexBody: '复制目录索引地址，交给脚本或团队内部工具使用。', copyIndex: '复制索引 URL',
      footerText: '开源目录，欢迎审阅与投稿。', allCategories: '全部分类', nameSort: '名称',
      originalNameSort: '来源名称', role: '角色', workflow: '任务', community: '社区条目',
      sourcePrefix: '来源：', sourceAuthor: '来源作者：', templateAuthor: '模板作者：', skills: '项技能', notTested: '真实任务未测试', viewDetails: '查看职责',
      save: '收藏', saved: '已收藏', loading: '正在加载目录…', loaded: '显示 {shown} / {total} 个条目',
      filtered: '筛选后显示 {shown} / {total} 个条目', loadError: '目录文件尚未生成，请先运行 npm run build:site。',
      noCatalogue: '目录暂不可用', noCatalogueBody: '构建目录后刷新此页面。',
      detailClose: '关闭详情', detailActions: '操作', download: '下载配置', manifest: '查看原始清单',
      original: '来源页面', edit: '编辑条目', mission: '职责', style: '工作方式', inputs: '输入',
      outputs: '输出', workflowSteps: '工作步骤', requirements: '使用前需要', skillsTitle: '技能',
      guidance: '使用提示', welcome: '欢迎语', quickPrompts: '快捷提示', examples: '任务示例',
      permissions: '权限需求', permissionNote: '以下是配置请求，不代表当前环境已授予。',
      tools: '工具', screen: '屏幕', container: '容器', requested: '需要', notRequested: '不需要',
      verification: '验收状态', format: '格式检查', realTask: '真实任务', passed: '已通过',
      notTestedValue: '尚未测试', noDetails: '暂未提供', copySuccess: '已复制索引 URL', copyFailed: '复制失败，请手动复制。'
    },
    en: {
      navCatalog: 'Directory', navSubmit: 'Submit', kicker: 'A reviewable Bot directory', languageToggle: 'Switch interface language',
      filterLabel: 'Directory filters', botTypeLabel: 'Bot type', categoryFilter: 'Filter by category', sortControlLabel: 'Sort order',
      title: 'Find one that moves work forward.',
      lede: 'Search Chinese Bots by role or task. Review the mission, steps and requested permissions before downloading a reproducible configuration.',
      botsLabel: 'Bots to explore', updatedLabel: 'Updated: ', searchLabel: 'Search Bots',
      searchPlaceholder: 'Search names, missions, tags or sources', searchHint: 'Matches Chinese names, summaries, tags, source names and entry IDs',
      allLabel: 'All', rolesLabel: 'Roles', workflowsLabel: 'Tasks', categoryLabel: 'Category',
      sortLabel: 'Sort', favoritesLabel: 'Saved only', categoriesTitle: 'Browse by work area',
      resultsKicker: 'Directory results', resultsTitle: 'All entries', emptyTitle: 'No matching Bots',
      emptyBody: 'Try another search term or clear the filters.', clearFilters: 'Clear filters',
      downloadsKicker: 'Bulk downloads', downloadsTitle: 'Take a set with you',
      downloadsBody: 'Downloads are configuration files. This page does not install or start Bots.',
      downloadRoles: 'Roles', downloadWorkflows: 'Tasks', downloadAll: 'All',
      bulkLimit: 'Over the single-bundle limit; download entries individually',
      sourceKicker: 'Source and editing', sourceTitle: 'Keep the trail',
      sourceBody: 'Each entry records its source, version and license. Community entries without a source say so clearly.',
      openRepo: 'Open repository', indexKicker: 'Machine readable',
      indexBody: 'Copy the directory index for scripts or an internal team tool.', copyIndex: 'Copy index URL',
      footerText: 'Open directory for review and contributions.', allCategories: 'All categories', nameSort: 'Name',
      originalNameSort: 'Source name', role: 'Role', workflow: 'Task', community: 'Community entry',
      sourcePrefix: 'Source: ', sourceAuthor: 'Source author: ', templateAuthor: 'Template author: ', skills: 'skills', notTested: 'Real task not tested', viewDetails: 'View details',
      save: 'Save', saved: 'Saved', loading: 'Loading directory…', loaded: 'Showing {shown} / {total} entries',
      filtered: 'Showing {shown} / {total} after filtering', loadError: 'The catalogue is not built yet. Run npm run build:site first.',
      noCatalogue: 'Catalogue unavailable', noCatalogueBody: 'Build the catalogue, then refresh this page.',
      detailClose: 'Close details', detailActions: 'Actions', download: 'Download config', manifest: 'View raw manifest',
      original: 'Source page', edit: 'Edit entry', mission: 'Mission', style: 'Working style', inputs: 'Inputs',
      outputs: 'Outputs', workflowSteps: 'Workflow steps', requirements: 'Needed before use', skillsTitle: 'Skills',
      guidance: 'Guidance', welcome: 'Welcome', quickPrompts: 'Quick prompts', examples: 'Task examples',
      permissions: 'Requested permissions', permissionNote: 'These are configuration requests, not grants in the current environment.',
      tools: 'Tools', screen: 'Screen', container: 'Container', requested: 'Requested', notRequested: 'Not requested',
      verification: 'Verification', format: 'Format', realTask: 'Real task', passed: 'Passed',
      notTestedValue: 'Not tested', noDetails: 'Not provided', copySuccess: 'Index URL copied', copyFailed: 'Copy failed. Copy it manually.'
    }
  };

  const state = {
    catalogue: null,
    entries: [],
    query: '',
    collection: 'all',
    category: 'all',
    sort: 'name',
    favoritesOnly: false,
    favorites: new Set(),
    language: 'zh',
    previousFocus: null,
    error: false
  };

  function valueText(value, fallback) {
    if (typeof value === 'string' || typeof value === 'number') {
      const output = String(value).trim();
      return output || (fallback || '');
    }
    return fallback || '';
  }

  function arrayText(value) {
    if (!Array.isArray(value)) return valueText(value) ? [valueText(value)] : [];
    return value.map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (!item || typeof item !== 'object') return '';
      if (typeof item.title === 'string' && typeof item.prompt === 'string') return `${item.title}：${item.prompt}`;
      return valueText(item.name || item.label || item.text || item.prompt);
    }).filter(Boolean);
  }

  function collectionOf(entry) {
    const collection = valueText(entry && entry.collection).toLowerCase();
    if (collection === 'bot-role' || collection === 'role' || collection === 'roles') return 'roles';
    if (collection === 'task-workflow' || collection === 'workflow' || collection === 'workflows' || collection === 'task') return 'workflows';
    return collection || 'roles';
  }

  function normalizeEntry(raw, index) {
    const entry = raw && typeof raw === 'object' ? raw : {};
    const guidance = entry.guidance && typeof entry.guidance === 'object' ? entry.guidance : {};
    const permissions = entry.permissions && typeof entry.permissions === 'object' ? entry.permissions : {};
    const sourceName = valueText(entry.sourceName || entry.source || entry.originalName);
    const sourceAuthor = valueText(entry.sourceAuthor);
    return {
      ...entry,
      id: valueText(entry.id, `entry-${index + 1}`),
      name: valueText(entry.name, '未命名 Bot'),
      sourceName,
      sourceAuthor,
      author: valueText(entry.author),
      collection: collectionOf(entry),
      category: valueText(entry.category, 'general'),
      summary: valueText(entry.summary, '暂无摘要。'),
      mission: valueText(entry.mission),
      style: valueText(entry.style),
      inputs: arrayText(entry.inputs),
      outputs: arrayText(entry.outputs),
      workflow: arrayText(entry.workflow),
      requirements: arrayText(entry.requirements || entry.boundaries),
      skills: Array.isArray(entry.skills) ? entry.skills.map((skill) => ({
        name: valueText(skill && skill.name), desc: valueText(skill && (skill.desc || skill.description))
      })).filter((skill) => skill.name || skill.desc) : [],
      persona: valueText(entry.persona),
      guidance: {
        welcome: valueText(guidance.welcome),
        quickPrompts: arrayText(guidance.quickPrompts),
        taskExamples: arrayText(guidance.taskExamples)
      },
      permissions: {
        tools: Boolean(permissions.tools),
        screen: Boolean(permissions.screen),
        container: Boolean(permissions.container)
      },
      capabilities: arrayText(entry.capabilities),
      tags: arrayText(entry.tags),
      updatedAt: valueText(entry.updatedAt),
      verification: entry.verification && typeof entry.verification === 'object' ? entry.verification : {}
    };
  }

  function normalizeCategories(data, entries) {
    const seen = new Set();
    const categories = [];
    const raw = Array.isArray(data && data.categories) ? data.categories : [];
    raw.forEach((category) => {
      const id = valueText(category && (category.id || category.value));
      const name = valueText(category && (category.name || category.label), id);
      if (id && !seen.has(id)) {
        seen.add(id);
        categories.push({ id, name });
      }
    });
    entries.forEach((entry) => {
      if (entry.category && !seen.has(entry.category)) {
        seen.add(entry.category);
        categories.push({ id: entry.category, name: entry.category });
      }
    });
    return categories;
  }

  function normalizeCatalogue(data) {
    const source = data && typeof data === 'object' ? data : {};
    const entries = Array.isArray(source.entries) ? source.entries.map(normalizeEntry) : [];
    const counts = {
      roles: entries.filter((entry) => collectionOf(entry) === 'roles').length,
      workflows: entries.filter((entry) => collectionOf(entry) === 'workflows').length,
      total: entries.length
    };
    return {
      ...source,
      entries,
      categories: normalizeCategories(source, entries),
      counts: { ...counts, ...(source.counts && typeof source.counts === 'object' ? source.counts : {}) }
    };
  }

  function entryHaystack(entry) {
    const fields = [
      entry.id, entry.name, entry.summary, entry.mission, entry.style, entry.sourceName,
      entry.sourceAuthor, entry.category, ...(entry.tags || []), ...(entry.capabilities || [])
    ];
    return fields.map((field) => valueText(field).toLocaleLowerCase()).join('\n');
  }

  function searchEntries(entries, query) {
    const terms = valueText(query).toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return Array.isArray(entries) ? entries.slice() : [];
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      const haystack = entryHaystack(entry);
      return terms.every((term) => haystack.includes(term));
    });
  }

  function sortEntries(entries, mode) {
    const sorted = Array.isArray(entries) ? entries.slice() : [];
    const key = mode === 'original-name' ? 'sourceName' : 'name';
    return sorted.sort((left, right) => {
      const leftKey = valueText(left && left[key], valueText(left && left.name)).toLocaleLowerCase();
      const rightKey = valueText(right && right[key], valueText(right && right.name)).toLocaleLowerCase();
      const result = leftKey.localeCompare(rightKey, ['zh-Hans', 'en'], { numeric: true, sensitivity: 'base' });
      if (result !== 0) return result;
      return valueText(left && left.id).localeCompare(valueText(right && right.id), 'en', { numeric: true });
    });
  }

  function filterEntries(entries, options) {
    const settings = options && typeof options === 'object' ? options : {};
    let filtered = searchEntries(entries, settings.query);
    if (settings.collection && settings.collection !== 'all') {
      filtered = filtered.filter((entry) => collectionOf(entry) === settings.collection);
    }
    if (settings.category && settings.category !== 'all') {
      filtered = filtered.filter((entry) => valueText(entry.category) === settings.category);
    }
    if (settings.favoritesOnly) {
      const favorites = settings.favorites instanceof Set ? settings.favorites : new Set(settings.favorites || []);
      filtered = filtered.filter((entry) => favorites.has(entry.id));
    }
    return sortEntries(filtered, settings.sort);
  }

  const api = { normalizeEntry, normalizeCatalogue, collectionOf, searchEntries, filterEntries, sortEntries };
  root.AwesomeBotCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!doc) return;

  function currentCopy() {
    return copy[state.language] || copy.zh;
  }

  function label(key) {
    return currentCopy()[key] || copy.zh[key] || key;
  }

  function formatLabel(key, values) {
    return label(key).replace(/\{(\w+)\}/g, (_, name) => valueText(values && values[name], ''));
  }

  function make(tag, className, content) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined && content !== null) node.textContent = String(content);
    return node;
  }

  function setText(node, value) {
    if (node) node.textContent = valueText(value);
  }

  function safeHref(value) {
    const href = valueText(value);
    if (!href || /[\u0000-\u001f]/.test(href) || href.startsWith('//')) return null;
    if (/^https:\/\//i.test(href)) return href;
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) return null;
    if (href.startsWith('/')) return null;
    if (href.startsWith('#') || href.startsWith('./') || href.startsWith('../') || /^[A-Za-z0-9][A-Za-z0-9._~/?#@!$&'()*+,;=%-]*$/.test(href)) return href;
    return null;
  }

  function linkFor(parent, url, text, options) {
    const href = safeHref(url);
    if (!href) return null;
    const link = make('a', options && options.className ? options.className : '', text);
    link.href = href;
    if (/^https:\/\//i.test(href)) {
      link.target = '_blank';
      link.rel = 'noreferrer';
    } else if (options && options.download) {
      link.setAttribute('download', '');
    }
    if (parent) parent.append(link);
    return link;
  }

  function setLanguageCopy() {
    doc.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
    doc.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (node.id === 'page-title') {
        node.replaceChildren();
        if (state.language === 'zh') {
          node.append('找到一个，', doc.createElement('br'));
          const emphasis = make('em', '', '把事情推进下去。');
          node.append(emphasis);
        } else {
          node.textContent = label(key);
        }
      } else {
        setText(node, label(key));
      }
    });
    doc.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder = label(node.getAttribute('data-i18n-placeholder'));
    });
    doc.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', label(node.getAttribute('data-i18n-aria-label')));
    });
    const categorySelect = doc.getElementById('category-select');
    const sortSelect = doc.getElementById('sort-select');
    if (categorySelect && categorySelect.options[0]) categorySelect.options[0].textContent = label('allCategories');
    if (sortSelect && sortSelect.options.length >= 2) {
      sortSelect.options[0].textContent = label('nameSort');
      sortSelect.options[1].textContent = label('originalNameSort');
    }
    updateHeader();
  }

  function categoryName(id) {
    const item = (state.catalogue && state.catalogue.categories || []).find((category) => category.id === id);
    return valueText(item && item.name, id || label('allCategories'));
  }

  function collectionLabel(collection) {
    return collection === 'workflows' ? label('workflow') : label('role');
  }

  function readFavorites() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) state.favorites = new Set(parsed.filter((item) => typeof item === 'string'));
    } catch (_) {
      state.favorites = new Set();
    }
  }

  function saveFavorites() {
    try {
      if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.favorites)));
    } catch (_) {
      // Storage can be unavailable in private browsing; the in-memory state still works.
    }
  }

  function counts() {
    const computed = {
      roles: state.entries.filter((entry) => collectionOf(entry) === 'roles').length,
      workflows: state.entries.filter((entry) => collectionOf(entry) === 'workflows').length,
      total: state.entries.length
    };
    return computed;
  }

  function updateHeader() {
    const actual = counts();
    setText(doc.getElementById('inventory-count'), actual.total ? actual.total.toLocaleString() : '—');
    setText(doc.querySelector('[data-count-for="all"]'), actual.total ? actual.total.toLocaleString() : '—');
    setText(doc.querySelector('[data-count-for="roles"]'), actual.roles ? actual.roles.toLocaleString() : '—');
    setText(doc.querySelector('[data-count-for="workflows"]'), actual.workflows ? actual.workflows.toLocaleString() : '—');
    setText(doc.getElementById('results-total'), actual.total ? actual.total.toLocaleString() : '—');
    const updated = valueText(state.catalogue && state.catalogue.updatedAt);
    let formatted = '—';
    if (updated) {
      const date = new Date(updated);
      formatted = Number.isNaN(date.valueOf()) ? updated : new Intl.DateTimeFormat(state.language === 'zh' ? 'zh-CN' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    }
    setText(doc.querySelector('.masthead-note .muted'), `${label('updatedLabel')}${formatted}`);
    const downloads = state.catalogue && state.catalogue.downloads || {};
    const downloadCounts = { roles: actual.roles, workflows: actual.workflows, all: actual.total };
    ['roles', 'workflows', 'all'].forEach((key) => {
      const link = doc.querySelector(`[data-download="${key}"]`);
      if (link) {
        const count = link.querySelector('[data-download-count]');
        const arrow = link.querySelector('.download-arrow');
        const limit = link.querySelector('[data-download-limit]');
        setText(count, downloadCounts[key] ? downloadCounts[key].toLocaleString() : '—');
        const configured = Object.prototype.hasOwnProperty.call(downloads, key);
        const href = safeHref(downloads[key]);
        if (href) {
          link.href = href;
          link.hidden = false;
          link.classList.remove('is-disabled');
          link.removeAttribute('aria-disabled');
          link.setAttribute('download', '');
          if (arrow) arrow.hidden = false;
          if (limit) limit.hidden = true;
        } else if (configured && downloads[key] === null) {
          link.removeAttribute('href');
          link.removeAttribute('download');
          link.hidden = false;
          link.classList.add('is-disabled');
          link.setAttribute('aria-disabled', 'true');
          if (arrow) arrow.hidden = true;
          if (limit) {
            limit.hidden = false;
            setText(limit, label('bulkLimit'));
          }
        } else {
          link.hidden = true;
          link.classList.remove('is-disabled');
          link.removeAttribute('aria-disabled');
          link.removeAttribute('href');
          if (arrow) arrow.hidden = false;
          if (limit) limit.hidden = true;
        }
      }
    });
  }

  function renderCategories() {
    const list = doc.getElementById('category-list');
    const select = doc.getElementById('category-select');
    if (!list || !select) return;
    list.replaceChildren();
    while (select.options.length > 1) select.remove(1);
    const categories = [{ id: 'all', name: label('allCategories') }, ...(state.catalogue && state.catalogue.categories || [])];
    categories.forEach((category) => {
      if (category.id !== 'all') {
        const option = new Option(valueText(category.name, category.id), category.id);
        select.add(option);
      }
      const button = make('button', `category-chip${state.category === category.id ? ' is-active' : ''}`, category.name);
      button.type = 'button';
      button.setAttribute('aria-pressed', state.category === category.id ? 'true' : 'false');
      button.dataset.category = category.id;
      button.addEventListener('click', () => {
        state.category = category.id;
        select.value = state.category;
        renderCategories();
        renderResults();
      });
      list.append(button);
    });
    select.value = state.category;
  }

  function renderCollections() {
    doc.querySelectorAll('.collection-tab').forEach((button) => {
      const active = button.dataset.collection === state.collection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const favoriteButton = doc.getElementById('favorites-toggle');
    if (favoriteButton) favoriteButton.setAttribute('aria-pressed', state.favoritesOnly ? 'true' : 'false');
  }

  function renderResults() {
    const results = doc.getElementById('results');
    const empty = doc.getElementById('empty-state');
    const status = doc.getElementById('results-status');
    const searchCount = doc.getElementById('search-count');
    if (!results || !empty || !status) return;
    const filtered = filterEntries(state.entries, {
      query: state.query, collection: state.collection, category: state.category,
      favoritesOnly: state.favoritesOnly, favorites: state.favorites, sort: state.sort
    });
    results.replaceChildren();
    results.setAttribute('aria-busy', 'false');
    setText(searchCount, filtered.length ? filtered.length.toLocaleString() : '0');
    if (state.error) {
      empty.hidden = false;
      setText(empty.querySelector('h3'), label('noCatalogue'));
      setText(empty.querySelector('p'), label('noCatalogueBody'));
      const clear = empty.querySelector('#clear-filters');
      if (clear) clear.hidden = true;
      setText(status, label('loadError'));
      return;
    }
    const clear = empty.querySelector('#clear-filters');
    if (clear) clear.hidden = false;
    empty.hidden = filtered.length !== 0 || state.entries.length === 0;
    setText(empty.querySelector('h3'), label('emptyTitle'));
    setText(empty.querySelector('p'), label('emptyBody'));
    const statusText = state.query || state.collection !== 'all' || state.category !== 'all' || state.favoritesOnly
      ? formatLabel('filtered', { shown: filtered.length, total: state.entries.length })
      : (state.entries.length ? formatLabel('loaded', { shown: filtered.length, total: state.entries.length }) : label('loading'));
    setText(status, statusText);
    filtered.forEach((entry) => results.append(renderResult(entry)));
  }

  function renderResult(entry) {
    const article = make('article', 'result-row');
    article.dataset.entryId = entry.id;
    const main = make('div', 'result-main');
    const kicker = make('div', 'entry-kicker');
    kicker.append(make('span', 'kind-tag', collectionLabel(collectionOf(entry))));
    const sourceLabel = entry.sourceName ? `${label('sourcePrefix')}${entry.sourceName}` : label('community');
    kicker.append(make('span', 'source-label', sourceLabel));
    const title = make('h3');
    const titleButton = make('button', 'entry-title', entry.name);
    titleButton.type = 'button';
    titleButton.setAttribute('aria-haspopup', 'dialog');
    titleButton.addEventListener('click', () => openDetail(entry));
    title.append(titleButton);
    const summary = make('p', 'entry-summary', entry.summary);
    const meta = make('div', 'entry-meta');
    meta.append(make('span', '', categoryName(entry.category)));
    if (entry.skills.length) meta.append(make('span', '', `${entry.skills.length} ${label('skills')}`));
    meta.append(make('span', '', label('notTested')));
    main.append(kicker, title, summary, meta);

    const actions = make('div', 'result-actions');
    const favorite = make('button', 'favorite-button', state.favorites.has(entry.id) ? label('saved') : label('save'));
    favorite.type = 'button';
    favorite.setAttribute('aria-pressed', state.favorites.has(entry.id) ? 'true' : 'false');
    favorite.addEventListener('click', () => {
      if (state.favorites.has(entry.id)) state.favorites.delete(entry.id); else state.favorites.add(entry.id);
      saveFavorites();
      renderResults();
    });
    const details = make('button', 'detail-button', label('viewDetails'));
    details.type = 'button';
    details.setAttribute('aria-haspopup', 'dialog');
    details.addEventListener('click', () => openDetail(entry));
    actions.append(favorite, details);
    article.append(main, actions);
    return article;
  }

  function appendListSection(parent, heading, values) {
    if (!Array.isArray(values) || !values.length) return;
    const section = make('section', 'detail-section');
    section.append(make('h3', '', heading));
    const list = make('ul', 'detail-list');
    values.forEach((item) => list.append(make('li', '', item)));
    section.append(list);
    parent.append(section);
  }

  function appendTextSection(parent, heading, value) {
    if (!valueText(value)) return;
    const section = make('section', 'detail-section');
    section.append(make('h3', '', heading), make('p', '', value));
    parent.append(section);
  }

  function appendGridSection(parent, first, second) {
    if (!first && !second) return;
    const section = make('section', 'detail-section');
    const grid = make('div', 'detail-grid');
    [[first, label('inputs')], [second, label('outputs')]].forEach(([values, heading]) => {
      const block = make('div');
      block.append(make('h3', '', heading));
      const list = make('ul', 'detail-list');
      if (Array.isArray(values) && values.length) values.forEach((item) => list.append(make('li', '', item)));
      else list.append(make('li', '', label('noDetails')));
      block.append(list);
      grid.append(block);
    });
    section.append(grid);
    parent.append(section);
  }

  function appendGuidance(parent, guidance) {
    const hasGuidance = guidance && (guidance.welcome || guidance.quickPrompts.length || guidance.taskExamples.length);
    if (!hasGuidance) return;
    const section = make('section', 'detail-section');
    section.append(make('h3', '', label('guidance')));
    const grid = make('div', 'detail-grid');
    if (guidance.welcome) {
      const block = make('div');
      block.append(make('h3', '', label('welcome')), make('p', '', guidance.welcome));
      grid.append(block);
    }
    if (guidance.quickPrompts.length) {
      const block = make('div');
      block.append(make('h3', '', label('quickPrompts')));
      const list = make('ul', 'detail-list');
      guidance.quickPrompts.forEach((item) => list.append(make('li', '', item)));
      block.append(list);
      grid.append(block);
    }
    if (guidance.taskExamples.length) {
      const block = make('div');
      block.append(make('h3', '', label('examples')));
      const list = make('ul', 'detail-list');
      guidance.taskExamples.forEach((item) => list.append(make('li', '', item)));
      block.append(list);
      grid.append(block);
    }
    section.append(grid);
    parent.append(section);
  }

  function appendPermissions(parent, permissions) {
    const section = make('section', 'detail-section');
    section.append(make('h3', '', label('permissions')), make('p', '', label('permissionNote')));
    const grid = make('div', 'permission-grid');
    [['tools', label('tools')], ['screen', label('screen')], ['container', label('container')]].forEach(([key, heading]) => {
      const card = make('div', 'permission');
      const requested = Boolean(permissions && permissions[key]);
      card.append(make('strong', '', heading), make('span', '', requested ? label('requested') : label('notRequested')));
      grid.append(card);
    });
    section.append(grid);
    parent.append(section);
  }

  function appendVerification(parent, entry) {
    const section = make('section', 'detail-section');
    section.append(make('h3', '', label('verification')));
    const line = make('div', 'verification-line');
    const formatValue = valueText(entry.verification && entry.verification.format, '');
    const taskValue = valueText(entry.verification && entry.verification.realTask, 'not-tested');
    const formatText = formatValue === 'passed' ? label('passed') : (formatValue || label('noDetails'));
    const taskText = taskValue === 'not-tested' ? label('notTestedValue') : taskValue;
    [[label('format'), formatText], [label('realTask'), taskText]].forEach(([heading, value]) => {
      const item = make('span');
      item.append(make('strong', '', `${heading}：`), doc.createTextNode(value));
      line.append(item);
    });
    section.append(line);
    parent.append(section);
  }

  function appendAction(parent, url, text, primary, download) {
    const href = safeHref(url);
    if (!href) return;
    const link = linkFor(null, href, text, { className: `detail-action${primary ? '' : ' secondary'}`, download });
    if (link) {
      if (/^https:\/\//i.test(href)) {
        link.target = '_blank';
        link.rel = 'noreferrer';
      }
      parent.append(link);
    }
  }

  function openDetail(entry) {
    const dialog = doc.getElementById('detail-dialog');
    const content = doc.getElementById('detail-content');
    if (!dialog || !content) return;
    state.previousFocus = doc.activeElement;
    const shell = make('div', 'detail-shell');
    const header = make('header', 'detail-header');
    const title = make('h2', '', entry.name);
    title.id = 'detail-title';
    const close = make('button', 'detail-close');
    close.type = 'button';
    close.setAttribute('aria-label', label('detailClose'));
    close.addEventListener('click', () => dialog.close());
    header.append(title, close, make('p', 'detail-summary', entry.summary));
    const source = make('p', 'detail-source');
    if (entry.sourceName) source.append(doc.createTextNode(`${label('sourcePrefix')}${entry.sourceName}`));
    else source.append(doc.createTextNode(label('community')));
    if (entry.sourceAuthor) {
      source.append(doc.createTextNode(` · ${label('sourceAuthor')}${entry.sourceAuthor}`));
    }
    if (entry.author) {
      source.append(doc.createTextNode(` · ${label('templateAuthor')}${entry.author}`));
    }
    header.append(source);
    shell.append(header);

    const actions = make('div', 'detail-actions');
    appendAction(actions, entry.downloadUrl, label('download'), true, true);
    appendAction(actions, entry.manifestUrl, label('manifest'), false, false);
    appendAction(actions, entry.originalUrl, label('original'), false, false);
    appendAction(actions, entry.editUrl, label('edit'), false, false);
    if (actions.childNodes.length) shell.append(actions);

    appendTextSection(shell, label('mission'), entry.mission);
    appendTextSection(shell, label('style'), entry.style);
    appendGridSection(shell, entry.inputs, entry.outputs);
    appendListSection(shell, label('workflowSteps'), entry.workflow);
    appendListSection(shell, label('requirements'), entry.requirements);
    if (entry.skills.length) {
      const section = make('section', 'detail-section');
      section.append(make('h3', '', label('skillsTitle')));
      const list = make('ul', 'skill-list');
      entry.skills.forEach((skill) => {
        const item = make('li');
        if (skill.name) item.append(make('strong', '', skill.name));
        if (skill.desc) item.append(make('span', '', skill.desc));
        list.append(item);
      });
      section.append(list);
      shell.append(section);
    }
    appendGuidance(shell, entry.guidance);
    appendPermissions(shell, entry.permissions);
    appendVerification(shell, entry);
    content.replaceChildren(shell);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    close.focus();
  }

  function resetFilters() {
    state.query = '';
    state.collection = 'all';
    state.category = 'all';
    state.sort = 'name';
    state.favoritesOnly = false;
    const input = doc.getElementById('search-input');
    const select = doc.getElementById('sort-select');
    if (input) input.value = '';
    if (select) select.value = 'name';
    renderCollections();
    renderCategories();
    renderResults();
  }

  async function copyIndex() {
    const status = doc.getElementById('copy-status');
    const raw = state.catalogue && state.catalogue.registryUrl || 'registry/index.json';
    const href = safeHref(raw) || 'registry/index.json';
    const absolute = new URL(href, root.location && root.location.href || 'https://harzva.github.io/awesome-bot/').href;
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        await root.navigator.clipboard.writeText(absolute);
      } else {
        const textarea = make('textarea');
        textarea.value = absolute;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        doc.body.append(textarea);
        textarea.select();
        doc.execCommand('copy');
        textarea.remove();
      }
      setText(status, label('copySuccess'));
    } catch (_) {
      setText(status, label('copyFailed'));
    }
  }

  function bindEvents() {
    const input = doc.getElementById('search-input');
    input && input.addEventListener('input', (event) => {
      state.query = event.target.value;
      renderResults();
    });
    doc.querySelectorAll('.collection-tab').forEach((button) => button.addEventListener('click', () => {
      state.collection = button.dataset.collection || 'all';
      renderCollections();
      renderResults();
    }));
    const categorySelect = doc.getElementById('category-select');
    categorySelect && categorySelect.addEventListener('change', (event) => {
      state.category = event.target.value;
      renderCategories();
      renderResults();
    });
    const sortSelect = doc.getElementById('sort-select');
    sortSelect && sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      renderResults();
    });
    const favoriteToggle = doc.getElementById('favorites-toggle');
    favoriteToggle && favoriteToggle.addEventListener('click', () => {
      state.favoritesOnly = !state.favoritesOnly;
      renderCollections();
      renderResults();
    });
    const clear = doc.getElementById('clear-filters');
    clear && clear.addEventListener('click', resetFilters);
    const language = doc.getElementById('language-toggle');
    language && language.addEventListener('click', () => {
      state.language = state.language === 'zh' ? 'en' : 'zh';
      language.textContent = state.language === 'zh' ? 'EN' : '中';
      setLanguageCopy();
      renderCollections();
      renderCategories();
      renderResults();
    });
    const copyButton = doc.getElementById('copy-index');
    copyButton && copyButton.addEventListener('click', copyIndex);
    const dialog = doc.getElementById('detail-dialog');
    dialog && dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog && dialog.addEventListener('close', () => {
      const previous = state.previousFocus;
      state.previousFocus = null;
      if (previous && typeof previous.focus === 'function') previous.focus();
    });
  }

  async function loadCatalogue() {
    try {
      const response = await root.fetch('./catalogue.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`catalogue ${response.status}`);
      state.catalogue = normalizeCatalogue(await response.json());
      state.entries = state.catalogue.entries;
      state.error = false;
      renderCategories();
      updateHeader();
      renderResults();
    } catch (_) {
      state.catalogue = null;
      state.entries = [];
      state.error = true;
      updateHeader();
      renderResults();
    }
  }

  function init() {
    readFavorites();
    setLanguageCopy();
    bindEvents();
    renderCollections();
    renderCategories();
    renderResults();
    loadCatalogue();
  }

  init();
}());

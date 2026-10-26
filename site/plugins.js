(function () {
  'use strict';

  const doc = document;
  const params = new URLSearchParams(window.location.search);
  const labels = {
    zh: {
      navBots: 'Bot 市场', navResources: '开源与参考', navPlugins: '插件', navHandbook: '使用手册',
      navigationLabel: '主导航', homeLabel: 'Awesome Bot 首页', languageToggle: '切换界面语言', title: '插件市场',
      lede: '查看插件能力、来源和接入要求。下载不会在此页面自动安装或运行。',
      inventoryLabel: '市场说明', pluginsLabel: '个插件可查', updatedLabel: '目录更新时间：',
      searchLabel: '搜索插件', searchPlaceholder: '搜索名称、能力、系统或来源',
      searchHint: '可按名称、简介、版本、许可证、平台、能力和来源搜索',
      resultsTitle: '全部插件', loading: '正在读取目录…', shareSearch: '复制搜索链接',
      clearSearch: '清除搜索', loaded: '显示 {shown} / {total} 个插件', filtered: '筛选后显示 {shown} / {total} 个插件',
      errorTitle: '目录暂不可用', errorBody: '请检查网络后重试。', retry: '重新加载',
      emptyTitle: '没有匹配的插件', emptyBody: '换一个关键词，或清除搜索后再试。', emptyCatalogue: '目录中还没有插件条目。',
      typeDsh: 'DSH 插件', typeDesktop: 'OpenBot 桌面插件', unknownFormat: '插件',
      version: '版本', license: '许可证', systems: '系统', capabilities: '能力', packageName: '包名',
      details: '安装与来源', closeDetails: '收起安装与来源', upstream: '上游仓库',
      revision: 'Git 提交', copyRevision: '复制提交', sha256: 'SHA-256',
      download: '下载插件文件', docs: '查看文档', dshIndex: 'DSH 索引', copyDshIndex: '复制 DSH 索引 URL',
      installSpec: 'DSH 安装规格', copyInstallSpec: '复制安装规格',
      installSteps: '接入步骤', dshStepOne: '将 DSH 索引 URL 添加到 DSH 插件市场。',
      dshStepTwo: '在索引中选择此包和版本，并审阅固定的 Git 提交与安装规格。',
      dshStepThree: '在 DSH 中确认安装。此页面只提供目录信息，不会执行安装。',
      desktopStepOne: '在 OpenBot 桌面插件管理器中安装并启用此桌面插件。',
      desktopStepTwo: '按固定版本文档审阅权限与限制；此页面的下载链接不会安装或启用插件。',
      requirements: '运行要求与权限', permissions: '权限需求', limitations: '限制与注意事项',
      evidence: '来源证据', openbotPath: 'OpenBot 接入', statusManualDsh: 'DSH 手动接入',
      statusReady: 'DSH 接入路径已提供', statusDesktop: 'OpenBot 桌面宿主',
      statusGitAdapter: '需要 Git 适配器', unknownOpenbotStatus: '接入信息',
      missingDsh: '目录未提供 DSH 安装规格。', copySuccess: '已复制', copyFailed: '复制失败，请手动选择文本。',
      noScript: '需要启用 JavaScript 才能搜索和查看目录。', footerText: '开源目录，欢迎审阅与投稿。'
    },
    en: {
      navBots: 'Bot marketplace', navResources: 'Projects & references', navPlugins: 'Plugins', navHandbook: 'Handbook',
      navigationLabel: 'Main navigation', homeLabel: 'Awesome Bot home', languageToggle: 'Switch interface language', title: 'Plugin marketplace',
      lede: 'Review plugin capabilities, source and integration requirements. Downloads do not install or run here.',
      inventoryLabel: 'Marketplace summary', pluginsLabel: 'plugins to explore', updatedLabel: 'Updated: ',
      searchLabel: 'Search plugins', searchPlaceholder: 'Search names, capabilities, systems or sources',
      searchHint: 'Search names, summaries, versions, licenses, platforms, capabilities and sources',
      resultsTitle: 'All plugins', loading: 'Loading directory…', shareSearch: 'Copy search link',
      clearSearch: 'Clear search', loaded: 'Showing {shown} / {total} plugins', filtered: 'Showing {shown} / {total} matching plugins',
      errorTitle: 'Directory unavailable', errorBody: 'Check your connection and retry.', retry: 'Reload directory',
      emptyTitle: 'No matching plugins', emptyBody: 'Try another search term or clear the search.', emptyCatalogue: 'There are no plugin entries in this directory yet.',
      typeDsh: 'DSH plugin', typeDesktop: 'OpenBot desktop plugin', unknownFormat: 'Plugin',
      version: 'Version', license: 'License', systems: 'Systems', capabilities: 'Capabilities', packageName: 'Package name',
      details: 'Installation and source', closeDetails: 'Hide installation and source', upstream: 'Upstream repository',
      revision: 'Git commit', copyRevision: 'Copy commit', sha256: 'SHA-256',
      download: 'Download plugin file', docs: 'Open documentation', dshIndex: 'DSH index', copyDshIndex: 'Copy DSH index URL',
      installSpec: 'DSH install specification', copyInstallSpec: 'Copy install specification',
      installSteps: 'Integration steps', dshStepOne: 'Add the DSH index URL to the DSH plugin market.',
      dshStepTwo: 'Select this package and version from the index, then review its pinned Git commit and install specification.',
      dshStepThree: 'Confirm installation in DSH. This page only provides catalogue information and does not run the install.',
      desktopStepOne: 'Install and enable this desktop plugin through the OpenBot desktop plugin manager.',
      desktopStepTwo: 'Review permissions and limitations in the version-pinned documentation; this page’s download link does not install or enable the plugin.',
      requirements: 'Requirements and permissions', permissions: 'Permission requirements', limitations: 'Limitations and notes',
      evidence: 'Source evidence', openbotPath: 'OpenBot integration', statusManualDsh: 'Manual DSH integration',
      statusReady: 'DSH integration path provided', statusDesktop: 'OpenBot desktop host',
      statusGitAdapter: 'Git adapter required', unknownOpenbotStatus: 'Integration details',
      missingDsh: 'The catalogue does not provide a DSH install specification.', copySuccess: 'Copied', copyFailed: 'Copy failed. Select and copy the text manually.',
      noScript: 'Enable JavaScript to search and browse this directory.', footerText: 'Open directory for review and contributions.'
    }
  };

  const state = {
    language: params.get('lang') === 'en' ? 'en' : 'zh',
    query: cleanQuery(params.get('q')),
    catalogue: null,
    entries: [],
    loading: true,
    error: false
  };

  const elements = {
    search: doc.getElementById('plugin-search'),
    count: doc.getElementById('plugin-count'),
    updated: doc.getElementById('updated-at'),
    searchCount: doc.getElementById('search-count'),
    resultsTotal: doc.getElementById('results-total'),
    resultsStatus: doc.getElementById('results-status'),
    list: doc.getElementById('plugin-list'),
    error: doc.getElementById('load-error'),
    empty: doc.getElementById('empty-state'),
    emptyBody: doc.getElementById('empty-body'),
    clearSearch: doc.getElementById('clear-search'),
    actionStatus: doc.getElementById('action-status'),
    languageToggle: doc.getElementById('language-toggle')
  };

  function label(key) {
    return labels[state.language][key] || labels.zh[key] || key;
  }

  function cleanQuery(value) {
    if (typeof value !== 'string') return '';
    return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()).slice(0, 240).join('');
  }

  function stringValue(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    return '';
  }

  function localized(value) {
    if (typeof value === 'string' || typeof value === 'number') return stringValue(value);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const selected = stringValue(value[state.language]);
    return selected || stringValue(value[state.language === 'en' ? 'zh' : 'en']);
  }

  function localizedValues(value) {
    if (Array.isArray(value)) return value.map(localized).filter(Boolean);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const selected = value[state.language];
      if (Array.isArray(selected)) return selected.map(stringValue).filter(Boolean);
      const alternate = value[state.language === 'en' ? 'zh' : 'en'];
      if (Array.isArray(alternate)) return alternate.map(stringValue).filter(Boolean);
      const text = localized(value);
      return [text || serialized(value)].filter(Boolean);
    }
    return [stringValue(value)].filter(Boolean);
  }

  function allLocaleValues(value) {
    if (typeof value === 'string' || typeof value === 'number') return [String(value)];
    if (Array.isArray(value)) return value.flatMap(allLocaleValues);
    if (value && typeof value === 'object') return Object.values(value).flatMap(allLocaleValues);
    return [];
  }

  function node(tag, className, text) {
    const item = doc.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined && text !== null) item.textContent = String(text);
    return item;
  }

  function setText(target, value) {
    if (target) target.textContent = value === undefined || value === null ? '' : String(value);
  }

  function format(key, values) {
    return label(key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }

  function safeHttps(value) {
    const text = stringValue(value);
    if (!text || /[\u0000-\u001f\u007f]/.test(text)) return null;
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function safeIndexURL(value) {
    const text = stringValue(value);
    if (!text || /[\u0000-\u001f\u007f]/.test(text) || text.startsWith('//') || text.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(text)) {
      return safeHttps(text);
    }
    if (text.split('/').includes('..')) return null;
    try {
      const base = new URL('./', window.location.href);
      const url = new URL(text, base);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function addExternalLink(parent, url, text, className) {
    const href = safeHttps(url);
    if (!href) return null;
    const link = node('a', className || 'plugin-action', text);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    parent.append(link);
    return link;
  }

  function validCommit(value) {
    const revision = stringValue(value);
    return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(revision) ? revision : '';
  }

  function serialized(value) {
    if (typeof value === 'string') return value.trim();
    if (value === undefined || value === null) return '';
    try { return JSON.stringify(value, null, 2); } catch (_) { return ''; }
  }

  function formatStatus(status) {
    const keys = {
      'manual-dsh': 'statusManualDsh',
      ready: 'statusReady',
      'desktop-host': 'statusDesktop',
      'git-adapter-required': 'statusGitAdapter'
    };
    return label(keys[status] || 'unknownOpenbotStatus');
  }

  function applyLanguage() {
    doc.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
    doc.querySelectorAll('[data-i18n]').forEach((item) => setText(item, label(item.getAttribute('data-i18n'))));
    doc.querySelectorAll('[data-i18n-placeholder]').forEach((item) => { item.placeholder = label(item.getAttribute('data-i18n-placeholder')); });
    doc.querySelectorAll('[data-i18n-aria-label]').forEach((item) => { item.setAttribute('aria-label', label(item.getAttribute('data-i18n-aria-label'))); });
    if (elements.languageToggle) elements.languageToggle.textContent = state.language === 'en' ? '中' : 'EN';
    const links = [
      [doc.getElementById('bot-market-link'), './'],
      [doc.getElementById('resources-link'), state.language === 'en' ? './resources.en.html' : './resources.html'],
      [doc.getElementById('plugins-current-link'), './plugins.html'],
      [doc.getElementById('handbook-link'), state.language === 'en' ? './handbook.en.html' : './handbook.html'],
      [doc.querySelector('.brand'), './']
    ];
    for (const [link, base] of links) {
      if (!link) continue;
      const url = new URL(base, window.location.href);
      if (state.language === 'en') url.searchParams.set('lang', 'en');
      link.href = url.href;
    }
    doc.title = label('title') + ' · Awesome Bot';
    if (elements.search) elements.search.value = state.query;
    writeURL(true);
    renderResults();
  }

  function writeURL(replace) {
    const url = new URL(window.location.href);
    url.search = '';
    if (state.query) url.searchParams.set('q', state.query);
    if (state.language === 'en') url.searchParams.set('lang', 'en');
    if (url.href === window.location.href) return;
    try {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', url.href);
    } catch (_) {}
  }

  function searchable(entry) {
    const parts = [
      entry.id, entry.version, entry.packageName, entry.repository, entry.revision,
      entry.license, entry.format, entry.platforms, entry.capabilities,
      entry.requirements, entry.permissions, entry.limitations, entry.evidence,
      entry.name, entry.summary, entry.openbot, entry.dsh
    ];
    return parts.flatMap(allLocaleValues).join(' ').toLocaleLowerCase();
  }

  function addDetailField(parent, title, value) {
    const text = localized(value) || (value && typeof value === 'object' ? serialized(value) : '');
    if (!text) return null;
    const field = node('section', 'plugin-detail-field');
    field.append(node('h4', '', title));
    field.append(node('p', '', text));
    parent.append(field);
    return field;
  }

  function addDetailList(parent, title, value) {
    const items = localizedValues(value);
    if (!items.length) return null;
    const field = node('section', 'plugin-detail-field');
    field.append(node('h4', '', title));
    const list = node('ul', 'plugin-detail-list');
    for (const item of items) list.append(node('li', '', item));
    field.append(list);
    parent.append(field);
    return field;
  }

  async function copyText(value) {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setText(elements.actionStatus, label('copySuccess'));
    } catch (_) {
      setText(elements.actionStatus, label('copyFailed'));
    }
    window.setTimeout(() => setText(elements.actionStatus, ''), 3500);
  }

  function copyButton(text, value) {
    if (!value) return null;
    const button = node('button', 'plugin-action', text);
    button.type = 'button';
    button.addEventListener('click', () => copyText(value));
    return button;
  }

  function metadataItem(parent, title, text) {
    if (!text) return;
    const item = node('div', 'plugin-meta-item');
    item.append(node('dt', '', title), node('dd', '', text));
    parent.append(item);
  }

  function buildPlugin(entry) {
    const article = node('article', 'plugin-entry');
    const heading = node('div', 'plugin-entry-head');
    const main = node('div', 'plugin-entry-main');
    const kind = entry.format === 'dsh-bundle' ? label('typeDsh')
      : entry.format === 'openbot-desktop' ? label('typeDesktop') : label('unknownFormat');
    main.append(node('p', 'plugin-kind', kind));
    main.append(node('h3', 'plugin-name', localized(entry.name) || stringValue(entry.id) || label('unknownFormat')));
    const summary = localized(entry.summary);
    if (summary) main.append(node('p', 'plugin-summary', summary));

    const metadata = node('dl', 'plugin-meta');
    metadataItem(metadata, label('version'), stringValue(entry.version));
    metadataItem(metadata, label('license'), stringValue(entry.license));
    metadataItem(metadata, label('systems'), localizedValues(entry.platforms).join(' · '));
    heading.append(main, metadata);
    article.append(heading);

    const capabilities = localizedValues(entry.capabilities);
    if (capabilities.length) {
      const line = node('p', 'plugin-capabilities');
      line.append(node('strong', '', label('capabilities') + ': '));
      line.append(doc.createTextNode(capabilities.join(' · ')));
      article.append(line);
    }

    const openbot = entry.openbot && typeof entry.openbot === 'object' ? entry.openbot : null;
    if (openbot) {
      const note = localized(openbot.note);
      if (openbot.status || note) {
        const path = node('p', 'plugin-path-note');
        path.append(node('strong', '', label('openbotPath') + ': '));
        const parts = [];
        if (openbot.status) parts.push(formatStatus(openbot.status));
        if (note) parts.push(note);
        path.append(doc.createTextNode(parts.join(' — ')));
        article.append(path);
      }
    }

    const details = node('details', 'plugin-details');
    const summaryNode = node('summary', '', label('details'));
    summaryNode.addEventListener('click', () => {
      window.setTimeout(() => { summaryNode.textContent = details.open ? label('closeDetails') : label('details'); }, 0);
    });
    details.append(summaryNode);
    const detailBody = node('div', 'plugin-detail-body');
    const detailGrid = node('div', 'plugin-detail-grid');

    const upstream = safeHttps(entry.repository);
    const repositoryField = node('section', 'plugin-detail-field');
    repositoryField.append(node('h4', '', label('upstream')));
    if (upstream) {
      const repositoryLink = node('a', 'plugin-source-link', entry.repository);
      repositoryLink.href = upstream;
      repositoryLink.target = '_blank';
      repositoryLink.rel = 'noreferrer';
      repositoryField.append(repositoryLink);
    }
    const revision = validCommit(entry.revision);
    if (revision) {
      const revisionText = node('code', 'plugin-revision', revision);
      repositoryField.append(revisionText);
      repositoryField.append(copyButton(label('copyRevision'), revision));
    } else if (stringValue(entry.revision)) {
      repositoryField.append(node('p', 'plugin-detail-text', stringValue(entry.revision)));
    }
    detailGrid.append(repositoryField);

    const packageName = stringValue(entry.packageName);
    if (packageName) {
      const packageField = node('section', 'plugin-detail-field');
      packageField.append(node('h4', '', label('packageName')), node('code', 'plugin-revision', packageName));
      detailGrid.append(packageField);
    }

    const digest = stringValue(entry.sha256);
    if (/^[0-9a-f]{64}$/i.test(digest)) {
      const hashField = node('section', 'plugin-detail-field');
      hashField.append(node('h4', '', label('sha256')));
      hashField.append(node('code', 'plugin-revision', digest));
      detailGrid.append(hashField);
    }

    addDetailList(detailGrid, label('requirements'), entry.requirements);
    addDetailList(detailGrid, label('permissions'), entry.permissions || (entry.dsh && entry.dsh.permissions));
    addDetailList(detailGrid, label('limitations'), entry.limitations);
    addDetailField(detailGrid, label('evidence'), entry.evidence);

    const docsUrl = safeHttps(entry.docsUrl);
    if (docsUrl) {
      const docsField = node('section', 'plugin-detail-field');
      docsField.append(node('h4', '', label('docs')));
      const docsLink = node('a', 'plugin-source-link', entry.docsUrl);
      docsLink.href = docsUrl;
      docsLink.target = '_blank';
      docsLink.rel = 'noreferrer';
      docsField.append(docsLink);
      detailGrid.append(docsField);
    }

    detailBody.append(detailGrid);
    const installSteps = node('section', 'plugin-install-guide');
    const steps = entry.format === 'dsh-bundle'
      ? ['dshStepOne', 'dshStepTwo', 'dshStepThree']
      : entry.format === 'openbot-desktop' ? ['desktopStepOne', 'desktopStepTwo'] : [];
    if (steps.length) {
      installSteps.append(node('h4', '', label('installSteps')));
      const list = node('ol', 'plugin-detail-list');
      for (const key of steps) list.append(node('li', '', label(key)));
      installSteps.append(list);
      detailBody.append(installSteps);
    }
    const actions = node('div', 'plugin-actions');
    const download = safeHttps(entry.downloadUrl);
    if (download) addExternalLink(actions, download, label('download'));

    if (entry.format === 'dsh-bundle') {
      const dsh = entry.dsh && typeof entry.dsh === 'object' ? entry.dsh : null;
      const indexURL = safeIndexURL((dsh && dsh.indexUrl) || (state.catalogue && state.catalogue.indexUrl));
      if (indexURL) actions.append(copyButton(label('copyDshIndex'), indexURL));
      const installSpec = dsh ? serialized(dsh.installSpec) : '';
      if (installSpec) {
        const specField = node('section', 'plugin-install-spec');
        specField.append(node('h4', '', label('installSpec')));
        specField.append(node('pre', '', installSpec));
        const specCopy = copyButton(label('copyInstallSpec'), installSpec);
        if (specCopy) specField.append(specCopy);
        detailBody.append(specField);
      } else {
        detailBody.append(node('p', 'plugin-detail-text', label('missingDsh')));
      }
    }

    if (actions.childNodes.length) detailBody.append(actions);
    details.append(detailBody);
    article.append(details);
    return article;
  }

  function renderResults() {
    if (!elements.list) return;
    elements.list.replaceChildren();
    elements.error.hidden = !state.error;
    if (state.error || state.loading) {
      elements.empty.hidden = true;
      elements.resultsStatus.textContent = state.error ? label('errorBody') : label('loading');
      elements.resultsTotal.textContent = '—';
      elements.searchCount.textContent = '—';
      return;
    }

    const query = state.query.toLocaleLowerCase();
    const matches = state.entries.filter(entry => !query || searchable(entry).includes(query));
    elements.count.textContent = String(state.entries.length);
    elements.resultsTotal.textContent = String(matches.length);
    elements.searchCount.textContent = String(matches.length);
    elements.resultsStatus.textContent = state.query
      ? format('filtered', { shown: matches.length, total: state.entries.length })
      : format('loaded', { shown: matches.length, total: state.entries.length });
    elements.clearSearch.hidden = !state.query;

    elements.empty.hidden = matches.length > 0;
    if (matches.length === 0) {
      elements.emptyBody.textContent = state.entries.length ? label('emptyBody') : label('emptyCatalogue');
    }
    for (const entry of matches) elements.list.append(buildPlugin(entry));
  }

  function setLoading() {
    state.loading = true;
    state.error = false;
    elements.error.hidden = true;
    renderResults();
  }

  async function loadCatalogue() {
    setLoading();
    try {
      const response = await fetch('./plugins/catalogue.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('catalogue request failed');
      const catalogue = await response.json();
      if (!catalogue || catalogue.schema !== 'awesome.bot.plugins/1' || !Array.isArray(catalogue.entries)) {
        throw new Error('catalogue format is not supported');
      }
      state.catalogue = catalogue;
      state.entries = catalogue.entries.filter(entry => entry && typeof entry === 'object' && !Array.isArray(entry));
      state.loading = false;
      state.error = false;
      setText(elements.updated, stringValue(catalogue.updatedAt) || '—');
      const updated = stringValue(catalogue.updatedAt);
      if (updated && !Number.isNaN(Date.parse(updated))) elements.updated.dateTime = new Date(updated).toISOString();
      renderResults();
    } catch (_) {
      state.loading = false;
      state.error = true;
      state.entries = [];
      renderResults();
    }
  }

  async function copySearch() {
    const url = new URL('./plugins.html', window.location.href);
    if (state.query) url.searchParams.set('q', state.query);
    if (state.language === 'en') url.searchParams.set('lang', 'en');
    await copyText(url.href);
  }

  function clearSearch() {
    state.query = '';
    if (elements.search) elements.search.value = '';
    writeURL(true);
    setText(elements.actionStatus, '');
    renderResults();
    elements.search && elements.search.focus();
  }

  doc.addEventListener('DOMContentLoaded', function () {
    if (elements.search) {
      elements.search.value = state.query;
      elements.search.addEventListener('input', () => {
        state.query = cleanQuery(elements.search.value);
        writeURL(true);
        renderResults();
      });
    }
    if (elements.languageToggle) {
      elements.languageToggle.addEventListener('click', () => {
        state.language = state.language === 'zh' ? 'en' : 'zh';
        applyLanguage();
      });
    }
    const share = doc.getElementById('copy-search');
    if (share) share.addEventListener('click', copySearch);
    for (const id of ['clear-search', 'clear-empty-search']) {
      const button = doc.getElementById(id);
      if (button) button.addEventListener('click', clearSearch);
    }
    const retry = doc.getElementById('retry-catalogue');
    if (retry) retry.addEventListener('click', loadCatalogue);
    applyLanguage();
    loadCatalogue();
  });
}());

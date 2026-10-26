(function () {
  'use strict';

  const root = typeof window === 'undefined' ? globalThis : window;
  const doc = root.document;
  const STORAGE_KEY = 'awesome-bot:favorites:v1';

  const copy = {
    zh: {
      navCatalog: 'Bot 市场', navResources: '开源与参考', navPlugins: '插件市场', navHandbook: '使用手册', handbookStart: '从使用手册开始：上手、团队协作与开发接入', sharedBots: '原站 Bot', sourceInstructions: '原始角色指令（英文）', adaptedNote: '第三方来源适配；保留英文原始步骤，回复语言由用户指定。宿主连接、权限与预约需要另行设置。', licenseLabel: '许可证', navSubmit: '投稿', kicker: 'Awesome Bot', languageToggle: '切换语言与 Bot 内容',
      filterLabel: '目录筛选', botTypeLabel: 'Bot 类型', categoryFilter: '按分类筛选', sortControlLabel: '排序方式',
      title: 'Bot 市场',
      lede: '探索角色与任务，找到适合你的 Bot。',
      botsLabel: '个 Bot 可查', updatedLabel: '目录更新时间：', searchLabel: '搜索 Bot',
      searchPlaceholder: '搜索名称、职责、标签或来源', searchHint: '支持中文名称、摘要、标签、来源名称和条目 ID',
      allLabel: '全部', rolesLabel: '角色', workflowsLabel: '任务', categoryLabel: '分类',
      sortLabel: '排序', favoritesLabel: '只看收藏', categoriesTitle: '按领域浏览',
      resultsKicker: '市场结果', resultsTitle: '全部 Bot', emptyTitle: '没有匹配的 Bot',
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
      filtered: '筛选后显示 {shown} / {total} 个条目', loadError: '目录加载失败，可以重试或先在 GitHub 浏览。',
      noCatalogue: '目录暂不可用', noCatalogueBody: '请检查网络后重试，当前筛选会为你保留。',
      detailClose: '关闭详情', detailActions: '操作', download: '下载配置', manifest: '查看原始清单',
      original: '来源页面', edit: '编辑条目', mission: '职责', style: '工作方式', inputs: '输入',
      outputs: '输出', workflowSteps: '工作步骤', requirements: '使用前需要', skillsTitle: '技能',
      guidance: '使用提示', welcome: '欢迎语', quickPrompts: '快捷提示', examples: '任务示例',
      permissions: '权限需求', permissionNote: '以下是配置请求，不代表当前环境已授予。',
      tools: '工具', screen: '屏幕', container: '容器', requested: '需要', notRequested: '不需要',
      verification: '验收状态', format: '格式检查', realTask: '真实任务', passed: '已通过',
      copyResults: '分享当前筛选', copyDetail: '复制 Bot 链接', shareSuccess: '链接已复制', retryCatalogue: '重新加载', retrying: '正在重试…', browseGitHub: '在 GitHub 浏览', missingDetail: '链接中的 Bot 已不在目录中，可继续搜索。',
      scenarioLabel: '场景', scenarioFilter: '选择任务场景', allScenarios: '选择任务场景', downloadScenario: '下载此场景', copyFirstTask: '复制首个任务', copyStep: '复制这一步', taskCopied: '任务提示词已复制，请补充自己的材料后发送。', importGuide: '导入与首次使用', scenarioGuide: '准备材料与使用步骤', startWith: '先从这个 Bot 开始：', scenarioNote: '按步骤在对应 Bot 中开始，审阅产物后再交接。下载不会自动执行任务。', missingScenario: '链接中的场景已不在目录中，可继续浏览全部 Bot。', feedbackBot: '反馈这个 Bot', botsUnit: '个 Bot',
      agentTitle: '交给 Agent 读取', agentBody: '复制加载指令，粘贴给能读取链接的 Agent。它可按需读取角色、步骤和配置；复制不会安装或启动 Bot。', copyAgent: '复制给 Agent', agentCopied: '加载指令已复制，粘贴到能读取链接的 Agent 中。', agentMarkdown: 'Markdown 说明', agentIndex: 'Agent 索引', asideLabel: '市场工具', pageTitle: 'Awesome Bot — Bot 市场', homeLabel: 'Awesome Bot 首页', navigationLabel: '主导航', inventoryLabel: '市场说明',
      scenarioPractice: '用虚构材料练习', notTestedValue: '尚未测试', noDetails: '暂未提供', copySuccess: '已复制索引 URL', copyFailed: '复制失败，请手动复制。'
    },
    en: {
      navCatalog: 'Marketplace', navResources: 'Projects & references', navPlugins: 'Plugin marketplace', navHandbook: 'Handbook', handbookStart: 'Start with the handbook: first task, teamwork and integration', sharedBots: 'Shared Bots', sourceInstructions: 'Original role instructions (English)', adaptedNote: 'Attributed source adaptation. Original English steps retained; the user chooses the response language. Host connections, permissions and routines require separate setup.', licenseLabel: 'License', navSubmit: 'Submit', kicker: 'Awesome Bot', languageToggle: 'Switch language and Bot content',
      filterLabel: 'Directory filters', botTypeLabel: 'Bot type', categoryFilter: 'Filter by category', sortControlLabel: 'Sort order',
      title: 'Bot marketplace',
      lede: 'Explore roles and tasks. Find a Bot for your work.',
      botsLabel: 'Bots to explore', updatedLabel: 'Updated: ', searchLabel: 'Search Bots',
      searchPlaceholder: 'Search names, missions, tags or sources', searchHint: 'Matches names, summaries, tags, source names and entry IDs',
      allLabel: 'All', rolesLabel: 'Roles', workflowsLabel: 'Tasks', categoryLabel: 'Category',
      sortLabel: 'Sort', favoritesLabel: 'Saved only', categoriesTitle: 'Browse by work area',
      resultsKicker: 'Marketplace results', resultsTitle: 'All Bots', emptyTitle: 'No matching Bots',
      emptyBody: 'Try another search term or clear the filters.', clearFilters: 'Clear filters',
      downloadsKicker: 'Bulk downloads', downloadsTitle: 'Take a set with you',
      downloadsBody: 'Downloads are configuration files. This page does not install or start Bots.',
      downloadRoles: 'Roles', downloadWorkflows: 'Tasks', downloadAll: 'All',
      bulkLimit: 'Over the single-bundle limit; download entries individually',
      sourceKicker: 'Source and editing', sourceTitle: 'Keep the trail',
      sourceBody: 'Each entry records its source, version and license. Community entries without a source say so clearly.',
      openRepo: 'Open repository', indexKicker: 'Machine readable',
      indexBody: 'Copy the canonical source index for scripts or an internal tool. Its source manifests are Chinese.', copyIndex: 'Copy source index URL',
      footerText: 'Open directory for review and contributions.', allCategories: 'All categories', nameSort: 'Name',
      originalNameSort: 'Source name', role: 'Role', workflow: 'Task', community: 'Community entry',
      sourcePrefix: 'Source: ', sourceAuthor: 'Source author: ', templateAuthor: 'Template author: ', skills: 'skills', notTested: 'Real task not tested', viewDetails: 'View details',
      save: 'Save', saved: 'Saved', loading: 'Loading directory…', loaded: 'Showing {shown} / {total} entries',
      filtered: 'Showing {shown} / {total} after filtering', loadError: 'The directory could not load. Retry or browse on GitHub.',
      noCatalogue: 'Catalogue unavailable', noCatalogueBody: 'Check your connection and retry. Your filters will be kept.',
      detailClose: 'Close details', detailActions: 'Actions', download: 'Download config', manifest: 'Source manifest (Chinese)',
      original: 'Source page', edit: 'Edit entry', mission: 'Mission', style: 'Working style', inputs: 'Inputs',
      outputs: 'Outputs', workflowSteps: 'Workflow steps', requirements: 'Needed before use', skillsTitle: 'Skills',
      guidance: 'Guidance', welcome: 'Welcome', quickPrompts: 'Quick prompts', examples: 'Task examples',
      permissions: 'Requested permissions', permissionNote: 'These are configuration requests, not grants in the current environment.',
      tools: 'Tools', screen: 'Screen', container: 'Container', requested: 'Requested', notRequested: 'Not requested',
      verification: 'Verification', format: 'Format', realTask: 'Real task', passed: 'Passed',
      copyResults: 'Share this search', copyDetail: 'Copy Bot link', shareSuccess: 'Link copied', retryCatalogue: 'Retry loading', retrying: 'Retrying…', browseGitHub: 'Browse on GitHub', missingDetail: 'The linked Bot is no longer in the directory. You can keep searching.',
      scenarioLabel: 'Goal', scenarioFilter: 'Choose a task scenario', allScenarios: 'Choose a goal', downloadScenario: 'Download this scenario', copyFirstTask: 'Copy first task', copyStep: 'Copy this step', taskCopied: 'Task prompt copied. Add your own materials before sending.', importGuide: 'Import and get started', scenarioGuide: 'Materials and steps', startWith: 'Start with this Bot: ', scenarioNote: 'Start each step in its Bot, review the output, then hand it over. Downloading does not run the tasks.', missingScenario: 'The linked scenario is no longer in the directory. You can browse all Bots.', feedbackBot: 'Report a Bot issue', botsUnit: 'Bots',
      agentTitle: 'Read with your Agent', agentBody: 'Copy the loading prompt into an Agent that can read links. It can fetch role context, steps and configuration on demand. Copying does not install or start a Bot.', copyAgent: 'Copy for Agent', agentCopied: 'Loading prompt copied. Paste it into an Agent that can read links.', agentMarkdown: 'Markdown context', agentIndex: 'Agent index', asideLabel: 'Marketplace tools', pageTitle: 'Awesome Bot — Bot marketplace', homeLabel: 'Awesome Bot home', navigationLabel: 'Main navigation', inventoryLabel: 'Marketplace summary',
      scenarioPractice: 'Try the practice', notTestedValue: 'Not tested', noDetails: 'Not provided', copySuccess: 'Index URL copied', copyFailed: 'Copy failed. Copy it manually.'
    }
  };

  const state = {
    catalogue: null,
    baseCatalogue: null,
    entries: [],
    query: '',
    collection: 'all',
    category: 'all',
    scenario: 'all',
    scenarioRenderKey: '',
    sort: 'name',
    favoritesOnly: false,
    favorites: new Set(),
    language: 'zh',
    previousFocus: null,
    error: false, loading: true, detailId: '', routeNotice: '', loadAttempt: 0
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
      if (typeof item.title === 'string' && typeof item.prompt === 'string') return `${item.title}: ${item.prompt}`;
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
      starterPrompt: valueText(entry.starterPrompt, arrayText(guidance.taskExamples)[0] || ''),
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

  function normalizeScenario(raw, entries) {
    if (!raw || raw.schema !== 'awesome.bot.scenario/1' || typeof raw.id !== 'string'
      || raw.id === 'all' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.id) || !valueText(raw.title)
      || !valueText(raw.summary) || !Array.isArray(raw.steps) || raw.steps.length < 1 || raw.steps.length > 3
      || ![`exports/scenario-${raw.id}.fleet.json`, `exports/en/scenario-${raw.id}.fleet.json`].includes(raw.downloadUrl)
      || !arrayText(raw.inputs).length || !arrayText(raw.outputs).length) return null;
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const ids = new Set();
    const steps = [];
    for (const step of raw.steps) {
      if (!step || !byId.has(step.botId) || ids.has(step.botId) || !valueText(step.prompt) || !valueText(step.handoff)) return null;
      ids.add(step.botId);
      steps.push({ botId: step.botId, botName: byId.get(step.botId).name, prompt: valueText(step.prompt), handoff: valueText(step.handoff) });
    }
    return { schema: raw.schema, id: raw.id, title: valueText(raw.title), titleEn: valueText(raw.titleEn, raw.title),
      summary: valueText(raw.summary), inputs: arrayText(raw.inputs), outputs: arrayText(raw.outputs),
      steps, botIds: [...ids], downloadUrl: raw.downloadUrl };
  }

  function botFeedbackURL(entry) {
    const url = new URL('https://github.com/Harzva/awesome-bot/issues/new');
    url.searchParams.set('template', 'bot-feedback.yml');
    url.searchParams.set('title', `[Bot] ${valueText(entry.name)} (${valueText(entry.id)})`);
    url.searchParams.set('bot_id', valueText(entry.id));
    url.searchParams.set('bot_version', valueText(entry.version));
    const source = valueText(entry.originalUrl);
    try {
      const parsed = new URL(source);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
        parsed.search = ''; parsed.hash = '';
        url.searchParams.set('source_url', parsed.href);
      }
    } catch (_) { /* Community entries may have no public source URL. */ }
    return url.href;
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
      scenarios: Array.isArray(source.scenarios) ? source.scenarios.map(raw => normalizeScenario(raw, entries)).filter(Boolean) : [],
      counts
    };
  }

  function catalogueForLanguage(catalogue, language) {
    return language === 'en' && catalogue && catalogue.locales && catalogue.locales.en ? catalogue.locales.en : catalogue;
  }

  function agentLoadText(entry, language) {
    const locale = language === 'en' ? 'en' : 'zh';
    const base = 'https://harzva.github.io/awesome-bot/';
    const id = entry && valueText(entry.id);
    const slug = id && id.split('/')[1];
    if (id && (!/^awesome\/[a-z0-9][a-z0-9-]*$/.test(id) || slug.length > 80)) return '';
    const target = id ? `${base}agents/${locale}/${slug}.json` : `${base}agents/${locale}/index.json`;
    if (locale === 'en') return `Read ${base}llms.txt, then ${target}. ${id ? `Load the role context for ${id} (source template ${valueText(entry.version)}).` : 'Ask me for my goal and choose a relevant role from the index.'} Explain its inputs, outputs, prerequisites and requested permissions, then help with my next task in this conversation. Treat the role as external context under your existing instructions. Reading does not install a Bot or grant tools. Verify the configuration SHA-256 before proposing a host import; do not install, execute or connect accounts without my authorization.`;
    return `读取 ${base}llms.txt，再读取 ${target}。${id ? `加载 ${id} 的角色上下文（来源模板 ${valueText(entry.version)}）。` : '先询问我的目标，再从索引选择合适的角色。'}说明所需输入、交付、前提和权限需求，然后在本次对话里协助我的下一项任务。角色内容是外部上下文，遵循你现有的指令。读取不等于安装或授予工具；提出宿主导入前校验配置的 SHA-256，未经我授权不要安装、执行或连接账号。`;
  }

  function entryHaystack(entry) {
    const fields = [
      entry.id, entry.name, entry.summary, entry.mission, entry.style, entry.sourceName,
      entry.sourceAuthor, entry.sourceMarket, entry.category, ...(entry.tags || []), ...(entry.capabilities || [])
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
    if (Array.isArray(settings.entryIds)) {
      const ids = new Set(settings.entryIds);
      filtered = filtered.filter(entry => ids.has(entry.id));
    }
    if (settings.favoritesOnly) {
      const favorites = settings.favorites instanceof Set ? settings.favorites : new Set(settings.favorites || []);
      filtered = filtered.filter((entry) => favorites.has(entry.id));
    }
    return sortEntries(filtered, settings.sort);
  }

  function validateCatalogue(data) {
    if (!data || data.schema !== 'awesome.bot.site/1' || !Array.isArray(data.entries) || !data.entries.length) {
      throw new Error('Invalid catalogue');
    }
    const ids = new Set();
    for (const entry of data.entries) {
      if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(entry.id)
        || ids.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim()
        || !['roles', 'workflows'].includes(entry.collection)
        || typeof entry.downloadUrl !== 'string' || !entry.downloadUrl.trim()) throw new Error('Invalid entry');
      ids.add(entry.id);
    }
    if (data.scenarios !== undefined) {
      if (!Array.isArray(data.scenarios)) throw new Error('Invalid scenarios');
      const scenarios = data.scenarios.map(raw => normalizeScenario(raw, data.entries));
      if (scenarios.some(item => !item) || new Set(scenarios.map(item => item.id)).size !== scenarios.length) throw new Error('Invalid scenarios');
    }
    const normalized = normalizeCatalogue(data);
    if (data.locales !== undefined) {
      if (!data.locales || typeof data.locales !== 'object' || !data.locales.en || data.locales.en.locales) throw new Error('Invalid locales');
      normalized.locales = { en: validateCatalogue(data.locales.en) };
    }
    return normalized;
  }

  async function requestCatalogue(fetcher, options) {
    const settings = options || {};
    const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = root.setTimeout(() => {
        reject(new Error('Catalogue request timed out'));
        if (controller) controller.abort();
      }, settings.timeoutMs || 12000);
    });
    const request = Promise.resolve().then(async () => {
      const response = await fetcher('./catalogue.json', { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
      if (!response || !response.ok) throw new Error('Catalogue request failed');
      return validateCatalogue(await response.json());
    });
    try { return await Promise.race([request, timeout]); }
    finally { root.clearTimeout(timer); }
  }

  const api = { normalizeEntry, normalizeCatalogue, collectionOf, searchEntries, filterEntries, sortEntries, validateCatalogue, requestCatalogue, normalizeScenario, botFeedbackURL, catalogueForLanguage, agentLoadText };
  root.AwesomeBotCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!doc) return;

  const navigation = root.AwesomeBotNavigation;
  const navigator = navigation && navigation.createNavigator({ location: root.location, history: root.history });

  function currentView() {
    const { query, collection, category, scenario, sort, language, favoritesOnly, detailId } = state;
    return { query, collection, category, scenario, sort, language, favoritesOnly, detailId };
  }

  function syncView(replace) {
    state.routeNotice = '';
    const notice = doc.getElementById('route-status');
    if (notice) notice.hidden = true;
    const status = doc.getElementById('share-status');
    if (status) status.textContent = '';
    if (navigator) navigator.write(currentView(), { replace: Boolean(replace) });
  }

  function applyRoute(force) {
    if (!navigator) return;
    const view = navigator.read();
    state.routeNotice = '';
    let canonicalize = false;
    if (state.catalogue && view.category !== 'all' && !state.catalogue.categories.some((item) => item.id === view.category)) {
      view.category = 'all'; canonicalize = true;
    }
    if (state.catalogue && view.scenario !== 'all' && !state.catalogue.scenarios.some(item => item.id === view.scenario)) {
      view.scenario = 'all'; state.routeNotice = 'missingScenario'; canonicalize = true;
    }
    const changed = ['query', 'collection', 'category', 'scenario', 'sort', 'language', 'favoritesOnly'].some((key) => state[key] !== view[key]);
    const desiredId = view.detailId;
    for (const key of ['query', 'collection', 'category', 'scenario', 'sort', 'language', 'favoritesOnly']) state[key] = view[key];
    activateLanguage();
    if (changed || force) {
      const input = doc.getElementById('search-input');
      const sort = doc.getElementById('sort-select');
      if (input) input.value = state.query;
      if (sort) sort.value = state.sort;
      setLanguageCopy(); renderCollections(); renderCategories(); renderResults();
    }
    const dialog = doc.getElementById('detail-dialog');
    if (state.catalogue) {
      const entry = state.entries.find((item) => item.id === desiredId);
      if (entry) {
        if (state.detailId !== desiredId || !dialog.open || changed) openDetail(entry, true);
      } else {
        state.detailId = '';
        if (dialog && dialog.open) dialog.close();
        if (desiredId) { state.routeNotice = 'missingDetail'; canonicalize = true; }
      }
    } else state.detailId = desiredId;
    const notice = doc.getElementById('route-status');
    if (notice) { notice.hidden = !state.routeNotice; setText(notice, state.routeNotice ? label(state.routeNotice) : ''); }
    if (canonicalize) navigator.write(currentView(), { replace: true });
  }

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
      setText(node, label(key));
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
    const shared = doc.getElementById('shared-bots-link');
    if (shared) shared.href = state.language === 'en' ? './shared-bots.html?lang=en' : './shared-bots.html';
    ['handbook-link', 'handbook-start-link'].forEach(id => { const link = doc.getElementById(id); if (link) link.href = state.language === 'en' ? './handbook.en.html' : './handbook.html'; });
    const resources = doc.getElementById('resources-link');
    if (resources) resources.href = state.language === 'en' ? './resources.en.html' : './resources.html';
    const plugins = doc.getElementById('plugins-link');
    if (plugins) plugins.href = state.language === 'en' ? './plugins.html?lang=en' : './plugins.html';
    const language = doc.getElementById('language-toggle');
    if (language) language.textContent = state.language === 'zh' ? 'EN' : '中';
    const home = doc.querySelector('.brand');
    if (home) home.href = state.language === 'en' ? './?lang=en' : './';
    if (!state.detailId) doc.title = label('pageTitle');
    doc.querySelectorAll('[data-import-guide]').forEach(link => { link.href = `./handbook-start${state.language === 'en' ? '.en' : ''}.html`; });
    const fallback = doc.getElementById('browse-github');
    if (fallback) fallback.href = `https://github.com/Harzva/awesome-bot/blob/main/CATALOGUE${state.language === 'en' ? '.en' : ''}.md`;
    for (const id of ['agent-copy-status', 'copy-status', 'share-status']) setText(doc.getElementById(id), '');
    updateHeader();
  }

  function activateLanguage() {
    if (!state.baseCatalogue) return;
    state.catalogue = catalogueForLanguage(state.baseCatalogue, state.language);
    state.entries = state.catalogue.entries;
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
        syncView(false);
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

  function selectedScenario() {
    return (state.catalogue && state.catalogue.scenarios || []).find(item => item.id === state.scenario);
  }

  function renderScenarios() {
    const scenarios = state.catalogue && state.catalogue.scenarios || [];
    const select = doc.getElementById('scenario-select');
    if (select) {
      select.replaceChildren(new Option(label('allScenarios'), 'all'));
      scenarios.forEach(item => select.add(new Option(state.language === 'en' ? item.titleEn : item.title, item.id)));
      select.value = scenarios.some(item => item.id === state.scenario) ? state.scenario : 'all';
      select.disabled = state.loading || state.error || !scenarios.length;
    }
    const scenario = selectedScenario();
    const panel = doc.getElementById('scenario-panel');
    if (!panel) return;
    panel.hidden = !scenario || state.error;
    if (!scenario || state.error) { state.scenarioRenderKey = ''; return; }
    const download = doc.getElementById('scenario-download');
    if (download) {
      download.href = scenario.downloadUrl;
      download.setAttribute('download', '');
      setText(download, `${label('downloadScenario')} · ${scenario.botIds.length} ${label('botsUnit')}`);
    }
    const practice = doc.getElementById('scenario-practice');
    const practiceContainer = doc.getElementById('scenario-practice-container');
    if (practice && practiceContainer) {
      const available = practice.dataset.handbookPractices.split(',').includes(scenario.id);
      practiceContainer.hidden = !available;
      if (available) {
        practice.href = `./handbook-scenarios${state.language === 'en' ? '.en' : ''}.html#practice-${encodeURIComponent(scenario.id)}`;
        setText(practice, label('scenarioPractice'));
      }
    }
    const key = `${scenario.id}:${state.language}`;
    if (state.scenarioRenderKey === key) return;
    state.scenarioRenderKey = key;
    setText(doc.getElementById('scenario-title'), state.language === 'en' ? scenario.titleEn : scenario.title);
    setText(doc.getElementById('scenario-summary'), scenario.summary);
    const start = doc.getElementById('scenario-start');
    const first = state.entries.find(entry => entry.id === scenario.steps[0].botId);
    if (start && first) {
      const button = make('button', 'text-button', first.name);
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      button.addEventListener('click', () => openDetail(first));
      start.replaceChildren(doc.createTextNode(label('startWith')), button);
    }
    const status = doc.getElementById('scenario-copy-status');
    setText(status, '');
    const content = doc.getElementById('scenario-guide-content');
    if (content) {
      content.replaceChildren();
      const materials = make('div', 'scenario-materials');
      [[label('inputs'), scenario.inputs], [label('outputs'), scenario.outputs]].forEach(([title, items]) => {
        const section = make('section');
        section.append(make('h4', '', title));
        const list = make('ul', 'detail-list');
        items.forEach(item => list.append(make('li', '', item)));
        section.append(list); materials.append(section);
      });
      const steps = make('ol', 'scenario-steps');
      scenario.steps.forEach(step => {
        const li = make('li');
        const button = make('button', 'text-button', label('copyStep'));
        button.type = 'button';
        button.addEventListener('click', () => copyText(step.prompt, status, 'taskCopied'));
        li.append(make('strong', '', step.botName), make('pre', 'prompt-text', step.prompt), make('p', '', step.handoff), button);
        steps.append(li);
      });
      content.append(materials, make('h4', '', label('workflowSteps')), steps, make('p', 'scenario-note', label('scenarioNote')));
    }
  }

  function renderResults() {
    renderScenarios();
    const scenario = selectedScenario();
    const results = doc.getElementById('results');
    const empty = doc.getElementById('empty-state');
    const status = doc.getElementById('results-status');
    const searchCount = doc.getElementById('search-count');
    if (!results || !empty || !status) return;
    const filtered = filterEntries(state.entries, {
      query: state.query, collection: state.collection, category: state.category,
      favoritesOnly: state.favoritesOnly, favorites: state.favorites, sort: state.sort, entryIds: scenario && scenario.botIds
    });
    results.replaceChildren();
    results.setAttribute('aria-busy', state.loading ? 'true' : 'false');
    setText(searchCount, filtered.length ? filtered.length.toLocaleString() : '0');
    const retry = doc.getElementById('retry-catalogue');
    const browse = doc.getElementById('browse-github');
    if (retry) { retry.hidden = !state.error; retry.disabled = state.loading; setText(retry, label(state.loading ? 'retrying' : 'retryCatalogue')); }
    if (browse) browse.hidden = !state.error;
    const share = doc.getElementById('copy-results');
    if (share) share.disabled = !navigation;
    if (state.error) {
      empty.hidden = false;
      setText(empty.querySelector('h3'), label('noCatalogue'));
      setText(empty.querySelector('p'), label('noCatalogueBody'));
      const clear = empty.querySelector('#clear-filters');
      if (clear) clear.hidden = true;
      setText(status, label(state.loading ? 'loading' : 'loadError'));
      return;
    }
    const clear = empty.querySelector('#clear-filters');
    if (clear) clear.hidden = false;
    empty.hidden = filtered.length !== 0 || state.entries.length === 0;
    setText(empty.querySelector('h3'), label('emptyTitle'));
    setText(empty.querySelector('p'), label('emptyBody'));
    const statusText = state.loading ? label('loading') : (state.query || state.collection !== 'all' || state.category !== 'all' || state.scenario !== 'all' || state.favoritesOnly
      ? formatLabel('filtered', { shown: filtered.length, total: state.entries.length })
      : (state.entries.length ? formatLabel('loaded', { shown: filtered.length, total: state.entries.length }) : label('loading')));
    setText(status, statusText);
    filtered.forEach((entry) => results.append(renderResult(entry)));
  }

  function renderResult(entry) {
    const article = make('article', 'result-row');
    article.dataset.entryId = entry.id;
    const main = make('div', 'result-main');
    const kicker = make('div', 'entry-kicker');
    kicker.append(make('span', 'kind-tag', collectionLabel(collectionOf(entry))));
    const sourceLabel = entry.sourceAuthor ? `${label('sourceAuthor')}${entry.sourceAuthor}`
      : (entry.sourceName ? `${label('sourcePrefix')}${entry.sourceName}` : label('community'));
    kicker.append(make('span', 'source-label', sourceLabel));
    const title = make('h3');
    const titleButton = make('button', 'entry-title', entry.name);
    titleButton.type = 'button';
    titleButton.setAttribute('aria-haspopup', 'dialog');
    titleButton.dataset.detailId = entry.id;
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
      if (!state.favoritesOnly) {
        setText(favorite, state.favorites.has(entry.id) ? label('saved') : label('save'));
        favorite.setAttribute('aria-pressed', String(state.favorites.has(entry.id)));
        return;
      }
      const rows = Array.from(article.parentElement.children);
      const position = rows.indexOf(article);
      const hadFocus = article.contains(doc.activeElement);
      renderResults();
      if (hadFocus) {
        const remaining = doc.querySelectorAll('#results .favorite-button');
        const target = remaining[Math.min(position, remaining.length - 1)] || doc.getElementById('results-title');
        if (target) { if (!remaining.length) target.tabIndex = -1; target.focus(); }
      }
    });
    const details = make('button', 'detail-button', label('viewDetails'));
    details.type = 'button';
    details.setAttribute('aria-haspopup', 'dialog');
    details.dataset.detailId = entry.id;
    details.addEventListener('click', () => openDetail(entry));
    actions.append(favorite, details);
    linkFor(actions, entry.downloadUrl, label('download'), { className: 'card-download', download: true });
    const avatar = entryAvatar(entry, false);
    if (avatar) article.append(avatar);
    article.append(main, actions);
    return article;
  }

  function entryAvatar(entry, detail) {
    if (entry.iconUrl !== `avatars/${entry.id.split('/')[1]}.svg`) return null;
    const image = make('img', detail ? 'detail-avatar' : 'entry-avatar');
    // The stable role URL may now render updated App artwork. Keep old browser
    // caches from showing a previous site's geometric mark after publication.
    image.src = `${entry.iconUrl}?v=${encodeURIComponent(state.catalogue?.contentRevision || '0')}`;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.width = image.height = detail ? 64 : 40;
    image.decoding = 'async';
    if (!detail) image.loading = 'lazy';
    return image;
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

  function openDetail(entry, fromRoute) {
    const dialog = doc.getElementById('detail-dialog');
    const content = doc.getElementById('detail-content');
    if (!dialog || !content) return;
    if (!dialog.open) state.previousFocus = doc.activeElement;
    if (!fromRoute && navigator) navigator.open(currentView(), entry.id);
    state.detailId = entry.id;
    doc.title = `${entry.name} · Awesome Bot`;
    const shell = make('div', 'detail-shell');
    const header = make('header', 'detail-header');
    const avatar = entryAvatar(entry, true);
    if (avatar) header.append(avatar);
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
    if (entry.sourceMarket) source.append(doc.createTextNode(` · ${entry.sourceMarket}`));
    header.append(source);
    if (entry.provenance) {
      header.append(make('p', 'detail-source', label('adaptedNote')));
      const attribution = make('p', 'detail-source');
      attribution.append(doc.createTextNode(`${label('licenseLabel')}: ${entry.license} · `));
      linkFor(attribution, entry.provenance.licenseUrl, entry.license, {});
      attribution.append(doc.createTextNode(` · ${entry.provenance.revision.slice(0, 12)}`));
      header.append(attribution);
    }
    shell.append(header);

    const actions = make('div', 'detail-actions');
    const copyStatus = make('p', 'copy-status');
    copyStatus.id = 'detail-copy-status';
    copyStatus.setAttribute('role', 'status');
    appendAction(actions, entry.downloadUrl, label('download'), true, true);
    const agent = make('button', 'detail-action secondary', label('copyAgent'));
    agent.type = 'button';
    agent.addEventListener('click', () => copyText(agentLoadText(entry, state.language), copyStatus, 'agentCopied'));
    actions.append(agent);
    if (entry.starterPrompt) {
      const task = make('button', 'detail-action secondary', label('copyFirstTask'));
      task.type = 'button';
      task.addEventListener('click', () => copyText(entry.starterPrompt, copyStatus, 'taskCopied'));
      actions.append(task);
    }
    const resources = make('div', 'detail-resource-links');
    appendAction(resources, `agents/${state.language}/${entry.id.split('/')[1]}.md`, label('agentMarkdown'), false, false);
    appendAction(resources, `./handbook-start${state.language === 'en' ? '.en' : ''}.html`, label('importGuide'), false, false);
    appendAction(resources, entry.manifestUrl, label('manifest'), false, false);
    appendAction(resources, entry.originalUrl, label('original'), false, false);
    appendAction(resources, entry.editUrl, label('edit'), false, false);
    const share = make('button', 'detail-action secondary', label('copyDetail'));
    share.type = 'button';
    share.disabled = !navigation;
    share.addEventListener('click', () => copyShare(copyStatus, true));
    resources.append(share);
    shell.append(actions, resources, copyStatus);

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
    if (entry.sourcePrompt) {
      const original = make('details', 'detail-section');
      original.append(make('summary', '', label('sourceInstructions')), make('pre', 'prompt-text', entry.sourcePrompt));
      shell.append(original);
    }
    appendGuidance(shell, entry.guidance);
    appendPermissions(shell, entry.permissions);
    appendVerification(shell, entry);
    const feedback = make('section', 'detail-section');
    linkFor(feedback, botFeedbackURL(entry), label('feedbackBot'), { className: 'text-link' });
    shell.append(feedback);
    content.replaceChildren(shell);
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    }
    close.focus();
  }

  function resetFilters() {
    state.query = '';
    state.collection = 'all';
    state.category = 'all';
    state.scenario = 'all';
    state.sort = 'name';
    state.favoritesOnly = false;
    syncView(false);
    const input = doc.getElementById('search-input');
    const select = doc.getElementById('sort-select');
    if (input) input.value = '';
    if (select) select.value = 'name';
    renderCollections();
    renderCategories();
    renderResults();
  }

  async function copyText(value, status, success) {
    const previous = doc.activeElement;
    let textarea;
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        await root.navigator.clipboard.writeText(value);
      } else {
        textarea = make('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        // Keep the fallback inside the active modal so it is not inert.
        const dialog = doc.getElementById('detail-dialog');
        (dialog && dialog.open ? dialog : doc.body).append(textarea);
        textarea.select();
        if (!doc.execCommand('copy')) throw new Error('Copy denied');
      }
      setText(status, label(success));
    } catch (_) {
      setText(status, `${label('copyFailed')} ${value}`);
    } finally {
      if (textarea) textarea.remove();
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    }
  }

  function copyIndex() {
    const raw = state.catalogue && state.catalogue.registryUrl || 'registry/index.json';
    const href = safeHref(raw) || 'registry/index.json';
    const absolute = new URL(href, root.location && root.location.href || 'https://harzva.github.io/awesome-bot/').href;
    return copyText(absolute, doc.getElementById('copy-status'), 'copySuccess');
  }

  function copyShare(status, includeDetail) {
    if (!navigation) return;
    const url = navigation.shareURL({ ...currentView(), detailId: includeDetail ? state.detailId : '' }, root.location.href);
    return copyText(url, status, 'shareSuccess');
  }

  function bindEvents() {
    const input = doc.getElementById('search-input');
    input && input.addEventListener('input', (event) => {
      state.query = Array.from(event.target.value).slice(0, 240).join('');
      syncView(true);
      renderResults();
    });
    doc.querySelectorAll('.collection-tab').forEach((button) => button.addEventListener('click', () => {
      state.collection = button.dataset.collection || 'all';
      syncView(false);
      renderCollections();
      renderResults();
    }));
    const categorySelect = doc.getElementById('category-select');
    categorySelect && categorySelect.addEventListener('change', (event) => {
      state.category = event.target.value;
      syncView(false);
      renderCategories();
      renderResults();
    });
    const scenarioSelect = doc.getElementById('scenario-select');
    scenarioSelect && scenarioSelect.addEventListener('change', event => {
      state.scenario = event.target.value;
      syncView(false);
      renderResults();
    });
    const copyScenario = doc.getElementById('copy-scenario');
    copyScenario && copyScenario.addEventListener('click', () => {
      const scenario = selectedScenario();
      if (scenario) copyText(scenario.steps[0].prompt, doc.getElementById('scenario-copy-status'), 'taskCopied');
    });
    const sortSelect = doc.getElementById('sort-select');
    sortSelect && sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      syncView(false);
      renderResults();
    });
    const favoriteToggle = doc.getElementById('favorites-toggle');
    favoriteToggle && favoriteToggle.addEventListener('click', () => {
      state.favoritesOnly = !state.favoritesOnly;
      syncView(false);
      renderCollections();
      renderResults();
    });
    const clear = doc.getElementById('clear-filters');
    clear && clear.addEventListener('click', resetFilters);
    const language = doc.getElementById('language-toggle');
    language && language.addEventListener('click', () => {
      state.language = state.language === 'zh' ? 'en' : 'zh';
      activateLanguage();
      syncView(true);
      setLanguageCopy();
      renderCollections();
      renderCategories();
      renderResults();
    });
    const copyButton = doc.getElementById('copy-index');
    copyButton && copyButton.addEventListener('click', copyIndex);
    const copyAgent = doc.getElementById('copy-agent');
    copyAgent && copyAgent.addEventListener('click', () => copyText(agentLoadText(null, state.language), doc.getElementById('agent-copy-status'), 'agentCopied'));
    const copyResults = doc.getElementById('copy-results');
    copyResults && copyResults.addEventListener('click', () => copyShare(doc.getElementById('share-status'), false));
    const retry = doc.getElementById('retry-catalogue');
    retry && retry.addEventListener('click', loadCatalogue);
    root.addEventListener('popstate', () => applyRoute(false));
    const dialog = doc.getElementById('detail-dialog');
    dialog && dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog && dialog.addEventListener('close', () => {
      if (dialog.open) return;
      const detailId = state.detailId;
      state.detailId = '';
      doc.title = label('pageTitle');
      const previous = state.previousFocus;
      state.previousFocus = null;
      if (previous && previous.isConnected && typeof previous.focus === 'function' && previous !== doc.body) previous.focus();
      else { const search = doc.getElementById('search-input'); if (search) search.focus({ preventScroll: true }); }
      if (detailId && navigator) navigator.close({ ...currentView(), detailId });
    });
  }

  async function loadCatalogue() {
    const attempt = ++state.loadAttempt;
    state.loading = true;
    renderResults();
    try {
      const catalogue = await requestCatalogue(root.fetch.bind(root));
      if (attempt !== state.loadAttempt) return;
      state.baseCatalogue = catalogue;
      state.catalogue = catalogue;
      state.entries = catalogue.entries;
      state.error = false;
      state.loading = false;
      applyRoute(true);
      updateHeader();
      renderResults();
    } catch (_) {
      if (attempt !== state.loadAttempt) return;
      state.baseCatalogue = null;
      state.catalogue = null;
      state.entries = [];
      state.error = true;
      state.loading = false;
      updateHeader();
      renderResults();
    }
  }

  function init() {
    readFavorites();
    if (navigator) Object.assign(state, navigator.read());
    const search = doc.getElementById('search-input');
    const sort = doc.getElementById('sort-select');
    if (search) search.value = state.query;
    if (sort) sort.value = state.sort;
    setLanguageCopy();
    bindEvents();
    renderCollections();
    renderCategories();
    renderResults();
    loadCatalogue();
  }

  init();
}());

(function () {
  'use strict';

  const root = typeof window === 'undefined' ? globalThis : window;
  const DEFAULT_URL = 'https://harzva.github.io/awesome-bot/';
  const HISTORY_KEY = 'awesomeBotNavigation';
  const DEFAULT_VIEW = {
    query: '', collection: 'all', category: 'all', sort: 'name',
    language: 'zh', favoritesOnly: false, detailId: ''
  };

  function allowedURL(value, relative) {
    try {
      const text = typeof value === 'string' ? value : value && value.href;
      if (typeof text !== 'string' || !text) return null;
      const url = relative ? new URL(text, DEFAULT_URL) : new URL(text);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function cleanQuery(value) {
    if (typeof value !== 'string') return '';
    // Bound decoded input, without splitting an emoji's surrogate pair.
    return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()).slice(0, 240).join('');
  }

  function cleanCategory(value) {
    return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value) ? value : 'all';
  }

  function cleanDetailId(value) {
    return typeof value === 'string' && value.length <= 160
      && /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(value) ? value : '';
  }

  function cleanView(value) {
    const view = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      query: cleanQuery(view.query),
      collection: ['roles', 'workflows'].includes(view.collection) ? view.collection : 'all',
      category: cleanCategory(view.category),
      sort: view.sort === 'original-name' ? 'original-name' : 'name',
      language: view.language === 'en' ? 'en' : 'zh',
      favoritesOnly: view.favoritesOnly === true,
      detailId: cleanDetailId(view.detailId)
    };
  }

  function readView(value) {
    const url = allowedURL(value, true);
    if (!url) return { ...DEFAULT_VIEW };
    // URLSearchParams.get always chooses the first value, including an empty one.
    const params = url.searchParams;
    return cleanView({
      query: params.get('q'), collection: params.get('collection'), category: params.get('category'),
      sort: params.get('sort'), language: params.get('lang'), favoritesOnly: params.get('saved') === '1',
      detailId: params.get('bot')
    });
  }

  function viewURL(value, baseURL) {
    const url = allowedURL(baseURL, false) || new URL(DEFAULT_URL);
    const view = cleanView(value);
    // A URL is derived only from declared view fields. Unknown query values and
    // fragments may contain unrelated/private data and never ride along.
    url.search = '';
    url.hash = '';
    if (view.query) url.searchParams.set('q', view.query);
    if (view.collection !== 'all') url.searchParams.set('collection', view.collection);
    if (view.category !== 'all') url.searchParams.set('category', view.category);
    if (view.sort !== 'name') url.searchParams.set('sort', view.sort);
    if (view.language !== 'zh') url.searchParams.set('lang', view.language);
    if (view.favoritesOnly) url.searchParams.set('saved', '1');
    if (view.detailId) url.searchParams.set('bot', view.detailId);
    return url.href;
  }

  function shareURL(value, baseURL) {
    return viewURL({ ...cleanView(value), favoritesOnly: false }, baseURL);
  }

  function createNavigator(options) {
    const settings = options || {};
    const location = settings.location || root.location;
    const history = settings.history || root.history;
    // This distinguishes this page lifetime's own modal entries. It is not an
    // identity, permission, or authentication token.
    const session = typeof settings.sessionId === 'string' && settings.sessionId
      ? settings.sessionId : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    let pendingBack = null;

    function currentURL() {
      try { return allowedURL(location && location.href, false); } catch (_) { return null; }
    }

    function historyState() {
      try {
        const value = history && history.state;
        return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
      } catch (_) { return {}; }
    }

    function read() {
      const current = currentURL();
      if (pendingBack && (!current || current.href !== pendingBack)) pendingBack = null;
      return readView(current ? current.href : DEFAULT_URL);
    }

    function ownDetail(current, snapshot) {
      const marker = snapshot[HISTORY_KEY];
      if (!current || !readView(current.href).detailId || !marker || typeof marker !== 'object'
        || marker.session !== session || marker.detail !== current.href) return null;
      const parent = allowedURL(marker.parent, false);
      if (!parent || parent.origin !== current.origin || parent.pathname !== current.pathname
        || parent.searchParams.has('bot')) return null;
      return marker;
    }

    function commit(value, replace, marker) {
      const current = currentURL();
      if (!current || !history) return false;
      const target = viewURL(value, current.href);
      if (target === current.href) return false;
      const method = replace ? 'replaceState' : 'pushState';
      if (typeof history[method] !== 'function') return false;
      const snapshot = historyState();
      delete snapshot[HISTORY_KEY];
      if (marker) snapshot[HISTORY_KEY] = { ...marker, detail: target };
      try {
        history[method](snapshot, '', target);
        pendingBack = null;
        return true;
      } catch (_) { return false; }
    }

    function write(value, options) {
      return commit(value, Boolean(options && options.replace), null);
    }

    function open(value, id) {
      const current = currentURL();
      const detailId = cleanDetailId(id);
      if (!current || !detailId) return false;
      const target = { ...cleanView(value), detailId };
      if (readView(current.href).detailId) {
        // Switching an already-open detail must not stack a detail as its own
        // parent. Carry a valid original parent, or stay a direct-entry visit.
        return commit(target, true, ownDetail(current, historyState()));
      }
      return commit(target, false, { session, parent: current.href });
    }

    function close(value) {
      const current = currentURL();
      if (!current || !readView(current.href).detailId) return 'none';
      if (pendingBack === current.href) return 'none';
      if (ownDetail(current, historyState()) && history && typeof history.back === 'function') {
        try {
          pendingBack = current.href;
          history.back();
          return 'back';
        } catch (_) { pendingBack = null; }
      }
      // Direct links and reloads have no known in-page parent. Closing must not
      // navigate back to an external site or another page in the browser.
      return commit({ ...cleanView(value), detailId: '' }, true, null) ? 'replace' : 'none';
    }

    return { read, write, open, close };
  }

  const api = { readView, viewURL, shareURL, createNavigator };
  root.AwesomeBotNavigation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}());

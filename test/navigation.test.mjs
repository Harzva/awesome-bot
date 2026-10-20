import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import '../site/navigation.js';

const { readView, viewURL, shareURL, createNavigator } = globalThis.AwesomeBotNavigation;
const base = 'https://harzva.github.io/awesome-bot/';
const defaults = { query: '', collection: 'all', category: 'all', scenario: 'all', sort: 'name', language: 'zh', favoritesOnly: false, detailId: '' };

function browser(href = base, initialState = { scrollOwner: 'directory' }) {
  const location = { href };
  const entries = [{ href, state: initialState }];
  let position = 0;
  const calls = [];
  const history = {
    get state() { return entries[position].state; },
    pushState(state, _, target) {
      calls.push('push');
      entries.splice(position + 1);
      entries.push({ href: target, state });
      position += 1;
      location.href = target;
    },
    replaceState(state, _, target) {
      calls.push('replace');
      entries[position] = { href: target, state };
      location.href = target;
    },
    back() {
      calls.push('back');
      if (position > 0) position -= 1;
      location.href = entries[position].href;
    }
  };
  return { location, history, calls, entries };
}

test('view links round-trip Chinese queries, filters, language and details without treating text as markup', () => {
  const view = { query: '网站 & 产品 + <script> 🚀 #设计', collection: 'workflows', category: 'engineering', scenario: 'research-brief', sort: 'original-name', language: 'en', favoritesOnly: true, detailId: 'awesome/chief-of-staff' };
  const url = viewURL(view, base);
  assert.deepEqual(readView(url), view);
  assert.equal(new URL(url).pathname, '/awesome-bot/');
  assert.equal(new URL(url).searchParams.get('bot'), 'awesome/chief-of-staff');
  assert.equal(new URL(url).hash, '');
  assert.equal(viewURL(defaults, base), base);
  assert.deepEqual(readView(base), defaults);
  assert.equal(viewURL({ ...view, query: '  网站\n运营  ' }, base), viewURL({ ...view, query: '网站 运营' }, base));
});

test('untrusted URL values are bounded and duplicate parameters consistently use their first value', () => {
  const url = new URL(base);
  url.searchParams.set('q', '🚀'.repeat(300));
  url.searchParams.append('q', 'ignored');
  url.searchParams.set('collection', 'unexpected');
  url.searchParams.set('category', '../secret');
  url.searchParams.set('sort', 'random');
  url.searchParams.set('lang', 'xx');
  url.searchParams.set('saved', 'true');
  url.searchParams.set('bot', 'javascript:alert(1)');
  assert.deepEqual(readView(url.href), { ...defaults, query: '🚀'.repeat(240) });
  assert.equal(readView(`${base}?q=&q=hidden&collection=roles&collection=workflows`).query, '');
  assert.equal(readView(`${base}?collection=roles&collection=workflows`).collection, 'roles');
  assert.deepEqual(readView('javascript:alert(1)?q=hidden'), defaults);
  assert.equal(viewURL({ query: 'safe' }, 'data:text/html,<script>bad</script>'), `${base}?q=safe`);
  assert.equal(viewURL({}, 'https://person:password@example.com/private'), base);
  assert.equal(readView(`${base}?bot=awesome%2F..`).detailId, '');
});

test('sharing includes the chosen view but never local saved-only state, unknown fields or fragments', () => {
  const start = `${base}?q=网站&saved=1&token=private-value&utm_source=mail#private-fragment`;
  const view = { ...readView(start), favoriteIds: ['awesome/private-favorite'], accessToken: 'do-not-copy' };
  const local = viewURL(view, start);
  const shared = shareURL(view, start);
  assert.equal(new URL(local).searchParams.get('saved'), '1');
  assert.equal(new URL(shared).searchParams.get('q'), '网站');
  assert.equal(new URL(shared).searchParams.has('saved'), false);
  assert.equal(new URL(shared).searchParams.has('token'), false);
  assert.equal(new URL(shared).searchParams.has('utm_source'), false);
  assert.equal(new URL(shared).hash, '');
  assert.ok(!shared.includes('private') && !shared.includes('do-not-copy'));
});

test('committed filters push history, typing replaces it, and equivalent views do not create extra entries', () => {
  const b = browser();
  const nav = createNavigator({ ...b, sessionId: 'current-page' });
  assert.equal(nav.write({ ...defaults, collection: 'roles' }), true);
  assert.equal(nav.write({ ...defaults, collection: 'roles', query: '调研' }, { replace: true }), true);
  assert.equal(nav.write({ ...defaults, collection: 'roles', query: '调研' }, { replace: true }), false);
  assert.deepEqual(b.calls, ['push', 'replace']);
  assert.equal(b.history.state.scrollOwner, 'directory');
  assert.equal(nav.read().query, '调研');
  b.history.back();
  assert.deepEqual(nav.read(), defaults);
  assert.equal(b.location.href, base);
});

test('a detail opened from this page closes back to the exact preceding view', () => {
  const b = browser(`${base}?q=调研&category=engineering`);
  const before = b.location.href;
  const nav = createNavigator({ ...b, sessionId: 'current-page' });
  assert.equal(nav.open(nav.read(), 'awesome/chief-of-staff'), true);
  assert.equal(nav.read().detailId, 'awesome/chief-of-staff');
  assert.equal(b.history.state.scrollOwner, 'directory');
  assert.equal(nav.close(nav.read()), 'back');
  assert.equal(b.location.href, before);
  assert.equal(nav.close(nav.read()), 'none');
  assert.deepEqual(b.calls, ['push', 'back']);
});

test('closing a direct detail link or a reloaded page replaces the URL instead of leaving the market', () => {
  const direct = browser(`${base}?collection=roles&bot=awesome%2Fchief-of-staff`);
  const nav = createNavigator({ ...direct, sessionId: 'direct-visit' });
  assert.equal(nav.close(nav.read()), 'replace');
  assert.equal(direct.location.href, `${base}?collection=roles`);
  assert.deepEqual(direct.calls, ['replace']);

  const reloaded = browser();
  const first = createNavigator({ ...reloaded, sessionId: 'before-reload' });
  first.open(first.read(), 'awesome/chief-of-staff');
  const after = createNavigator({ ...reloaded, sessionId: 'after-reload' });
  assert.equal(after.close(after.read()), 'replace');
  assert.equal(reloaded.location.href, base);
  assert.deepEqual(reloaded.calls, ['push', 'replace']);
});

test('history markers cannot send a close action to another origin, path, or nested detail', () => {
  for (const parent of ['https://example.com/', 'https://harzva.github.io/another-project/', `${base}?bot=awesome/another`, `${base}?bot=`]) {
    const href = `${base}?bot=awesome%2Fchief-of-staff`;
    const b = browser(href, { anotherFeature: true, awesomeBotNavigation: { session: 'current-page', parent, detail: href } });
    const nav = createNavigator({ ...b, sessionId: 'current-page' });
    assert.equal(nav.close(nav.read()), 'replace');
    assert.equal(b.location.href, base);
    assert.equal(b.history.state.anotherFeature, true);
    assert.equal('awesomeBotNavigation' in b.history.state, false);
    assert.ok(!b.calls.includes('back'));
  }
});

test('switching details keeps one list parent and an asynchronous close cannot request back twice', () => {
  const b = browser(`${base}?q=网站`);
  const nav = createNavigator({ ...b, sessionId: 'current-page' });
  nav.open(nav.read(), 'awesome/chief-of-staff');
  nav.open(nav.read(), 'awesome/another-helper');
  assert.deepEqual(b.calls, ['push', 'replace']);
  assert.equal(nav.close(nav.read()), 'back');
  assert.equal(new URL(b.location.href).searchParams.get('q'), '网站');

  const delayed = browser();
  const wait = createNavigator({ ...delayed, sessionId: 'current-page' });
  wait.open(wait.read(), 'awesome/chief-of-staff');
  delayed.history.back = () => delayed.calls.push('back');
  assert.equal(wait.close(wait.read()), 'back');
  assert.equal(wait.close(wait.read()), 'none');
  assert.deepEqual(delayed.calls, ['push', 'back']);
});

test('unavailable or refusing history does not navigate by assigning location or throw', () => {
  const location = { href: `${base}?bot=awesome%2Fchief-of-staff` };
  const denied = { get state() { throw new Error('unavailable'); }, pushState() { throw new Error('denied'); }, replaceState() { throw new Error('denied'); }, back() { throw new Error('denied'); } };
  const nav = createNavigator({ location, history: denied, sessionId: 'current-page' });
  assert.equal(nav.write({ query: '网站' }), false);
  assert.equal(nav.open(nav.read(), 'awesome/another'), false);
  assert.equal(nav.close(nav.read()), 'none');
  assert.equal(location.href, `${base}?bot=awesome%2Fchief-of-staff`);
  const invalid = { href: 'javascript:alert(1)' };
  const missing = createNavigator({ location: invalid, history: {}, sessionId: 'current-page' });
  assert.deepEqual(missing.read(), defaults);
  assert.equal(missing.write({ query: 'test' }), false);
  assert.equal(invalid.href, 'javascript:alert(1)');
});

test('the standalone script exposes the same API to a browser global and CommonJS consumers', async () => {
  const window = {};
  const module = { exports: {} };
  vm.runInNewContext(await readFile(new URL('../site/navigation.js', import.meta.url), 'utf8'), { window, module, URL });
  assert.equal(window.AwesomeBotNavigation, module.exports);
  assert.equal(typeof window.AwesomeBotNavigation.createNavigator, 'function');
  assert.equal(window.AwesomeBotNavigation.viewURL({ query: 'test' }, 'http://127.0.0.1:18766/awesome-bot/'), 'http://127.0.0.1:18766/awesome-bot/?q=test');
});


test('scenario links survive sharing, detail history and reload while invalid IDs normalize', () => {
  const b = browser(`${base}?scenario=research-brief&saved=1`);
  const nav = createNavigator({ ...b, sessionId: 'scenario' });
  assert.equal(nav.read().scenario, 'research-brief');
  nav.open(nav.read(), 'awesome/grok-researchy');
  const share = shareURL(nav.read(), b.location.href);
  assert.equal(readView(share).scenario, 'research-brief');
  assert.equal(readView(share).favoritesOnly, false);
  assert.equal(nav.close(nav.read()), 'back');
  assert.equal(nav.read().scenario, 'research-brief');
  assert.equal(readView(`${base}?scenario=../private`).scenario, 'all');
  assert.equal(readView(`${base}?scenario=research-brief&scenario=ignored`).scenario, 'research-brief');
});

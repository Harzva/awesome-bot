import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = { module: { exports: {} }, setTimeout, clearTimeout, AbortController, URL };
vm.runInNewContext(await readFile(new URL('../site/app.js', import.meta.url), 'utf8'), context);
const { requestCatalogue, validateCatalogue, filterEntries, botFeedbackURL } = context.module.exports;
const entry = { id: 'awesome/test', name: '测试 Bot', collection: 'roles', downloadUrl: 'exports/test.fleet.json' };
const catalogue = () => ({ schema: 'awesome.bot.site/1', entries: [{ ...entry }], counts: { total: 999 } });

test('a fetched catalogue uses entry counts and rejects malformed or duplicate entries', async () => {
  const value = await requestCatalogue(async () => ({ ok: true, json: async () => catalogue() }));
  assert.equal(value.counts.total, 1);
  assert.equal(value.entries[0].name, '测试 Bot');
  for (const bad of [{}, { ...catalogue(), entries: [] }, { ...catalogue(), entries: [entry, entry] }, { ...catalogue(), entries: [{ ...entry, id: '<script>' }] }]) {
    assert.throws(() => validateCatalogue(bad), /Invalid/);
  }
});

test('HTTP and JSON failures reject and a later request can recover', async () => {
  let calls = 0;
  const fetcher = async () => ++calls === 1
    ? { ok: false, status: 503 }
    : { ok: true, json: async () => catalogue() };
  await assert.rejects(requestCatalogue(fetcher), /request failed/);
  assert.equal((await requestCatalogue(fetcher)).entries.length, 1);
  await assert.rejects(requestCatalogue(async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })), /Invalid JSON/);
});

test('a stalled request, including stalled JSON, times out and aborts its signal', async () => {
  let signal;
  await assert.rejects(requestCatalogue(async (_, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  }, { timeoutMs: 20 }), /timed out/);
  assert.equal(signal.aborted, true);
});


const scenario = () => ({ schema: 'awesome.bot.scenario/1', id: 'weekly-report', title: '整理周报', titleEn: 'Prepare a weekly report', summary: '根据已有材料准备周报。', inputs: ['完成的工作与证据'], outputs: ['周报草稿'], steps: [{ botId: entry.id, prompt: '请根据我提供的材料整理周报，缺少证据的结论标为待核实。', handoff: '由用户审阅。' }], downloadUrl: 'exports/scenario-weekly-report.fleet.json' });

test('scenario references determine membership and combine with ordinary filters', () => {
  const second = { ...entry, id: 'awesome/other', name: '其他 Bot', collection: 'workflows' };
  const value = validateCatalogue({ ...catalogue(), entries: [entry, second], scenarios: [{ ...scenario(), botIds: [second.id] }] });
  assert.equal(value.scenarios[0].botIds.join(','), entry.id);
  assert.equal(value.scenarios[0].steps[0].botName, entry.name);
  assert.equal(filterEntries(value.entries, { entryIds: value.scenarios[0].botIds }).length, 1);
  assert.equal(filterEntries(value.entries, { entryIds: value.scenarios[0].botIds, collection: 'workflows' }).length, 0);
  assert.equal(filterEntries(value.entries, { entryIds: [] }).length, 0);
});

test('malformed scenario downloads and dangling or repeated Bot references reject the catalogue', () => {
  for (const bad of [
    { ...scenario(), steps: [{ ...scenario().steps[0], botId: 'awesome/missing' }] },
    { ...scenario(), steps: [...scenario().steps, ...scenario().steps] },
    { ...scenario(), steps: [{ ...scenario().steps[0], prompt: '' }] },
    { ...scenario(), downloadUrl: 'https://example.com/unrelated.json' }
  ]) assert.throws(() => validateCatalogue({ ...catalogue(), scenarios: [bad] }), /Invalid scenarios/);
  assert.throws(() => validateCatalogue({ ...catalogue(), scenarios: [scenario(), scenario()] }), /Invalid scenarios/);
});

test('Bot feedback pre-fills only public identity fields with safe URL encoding', () => {
  const source = { ...entry, name: '测试 & 标题 #一', version: '1.0.0', originalUrl: 'https://example.com/bot?private=omit#local', query: 'private search', favorites: ['private saved'], memory: 'private context' };
  const value = new URL(botFeedbackURL(source));
  assert.equal(value.origin, 'https://github.com');
  assert.equal(value.pathname, '/Harzva/awesome-bot/issues/new');
  assert.equal(value.searchParams.get('template'), 'bot-feedback.yml');
  assert.equal(value.searchParams.get('bot_id'), entry.id);
  assert.equal(value.searchParams.get('bot_version'), '1.0.0');
  assert.equal(value.searchParams.get('source_url'), 'https://example.com/bot');
  assert.equal(value.searchParams.get('title'), `[Bot] ${source.name} (${entry.id})`);
  assert.ok(!value.href.includes('private'));
  assert.equal(new URL(botFeedbackURL({ ...source, originalUrl: 'https://person:password@example.com/' })).searchParams.has('source_url'), false);
});

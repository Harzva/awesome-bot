import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = { module: { exports: {} }, setTimeout, clearTimeout, AbortController };
vm.runInNewContext(await readFile(new URL('../site/app.js', import.meta.url), 'utf8'), context);
const { requestCatalogue, validateCatalogue } = context.module.exports;
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readSharedBots, validSharedUrl, validateSharedBots } from '../scripts/shared-bots.mjs';

test('shared Bot discovery preserves all attributions without exposing installer or prompt fields', async () => {
  const data = await readSharedBots();
  assert.ok(data.entries.length >= 16788);
  assert.equal(new Set(data.entries.map(e => e.url)).size, data.entries.length);
  assert.ok(data.entries.some(e => e.sources.length > 1));
  assert.ok(data.entries.some(e => e.linkKind === 'source-file'));
  const invalid = structuredClone(data); invalid.entries[0].prompt = 'not a licensed imported role';
  assert.throws(() => validateSharedBots(invalid), /metadata only/);
  delete invalid.entries[0].prompt; invalid.entries.push(invalid.entries[0]);
  assert.throws(() => validateSharedBots(invalid), /duplicate/);
  const wrongSource = structuredClone(data);
  const sourceEntry = wrongSource.entries.find(e => e.linkKind === 'source-file');
  const unrelated = data.sources.find(s => !sourceEntry.sources.includes(s.id));
  sourceEntry.sources = [unrelated.id];
  sourceEntry.sourceRecords = [{ sourceId: unrelated.id, recordId: 'unrelated' }];
  assert.throws(() => validateSharedBots(wrongSource), /Invalid or duplicate/);
});

test('shared Bot URLs retain case-sensitive identity and reject credential, tracking and script links', async () => {
  const data = await readSharedBots();
  assert.ok(validSharedUrl('https://x.ai/bot/AbC_123', 'share'));
  for (const url of ['javascript:alert(1)', 'https://x.ai.evil.example/bot/AbC', 'https://user:pass@x.ai/bot/AbC', 'https://x.ai/bot/AbC?q=x', 'https://x.ai/bot/AbC/other', 'http://x.ai/bot/AbC']) assert.equal(validSharedUrl(url, 'share'), false, url);
  assert.equal(validSharedUrl('https://github.com/elie222/botdirectory.ai/blob/main/bots/chef.md', 'source-file', data.sources), false);
  const rootSource = structuredClone(data);
  const source = rootSource.sources[0];
  source.url = `https://github.com/${source.repository}/tree/${source.revision}`;
  assert.equal(validateSharedBots(rootSource), rootSource);
  source.url = `https://github.com/${source.repository}/tree/main`;
  assert.throws(() => validateSharedBots(rootSource), /Unpinned shared source URL/);
});

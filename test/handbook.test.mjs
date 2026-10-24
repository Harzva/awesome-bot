import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { root } from '../scripts/engine.mjs';
import { validateHandbook, validHandbookUrl, writeHandbook } from '../scripts/handbook.mjs';
const load = async () => JSON.parse(await readFile(resolve(root, 'data/handbook.json'), 'utf8'));
const scenario = locale => ({ id: 'trial', title: locale === 'zh' ? '测试场景' : 'Trial scenario', summary: 'Summary', inputs: ['Input'], outputs: ['Output'], steps: [{ botId: 'awesome/trial', botName: 'Trial Bot', prompt: 'Prompt <unsafe> ``` fence', handoff: 'Next action' }], downloadUrl: `exports/${locale === 'en' ? 'en/' : ''}scenario-trial.fleet.json` });
const catalogues = Object.fromEntries(['zh', 'en'].map(locale => [locale, { counts: { roles: 2, workflows: 1 }, entries: [{ implementation: 'third-party-adaptation' }, {}, {}], scenarios: [scenario(locale)] }]));
async function build(source) { const output = await mkdtemp(join(tmpdir(), 'awesome-handbook-')); try { const result = await writeHandbook({ output, version: 'test-1', catalogues, shared: { entries: [{}, {}] }, source }); return { output, result }; } catch (error) { await rm(output, { recursive: true, force: true }); throw error; } }
test('handbook validates bilingual coverage, unique anchors, paths and known blocks', async () => {
  const data = await load(); assert.equal(validateHandbook(data), data);
  for (const mutate of [d => { d.chapters[0].title.en = '中文'; }, d => { d.chapters[0].sections[0].blocks.push({ type: 'execute' }); }, d => { d.paths[0].chapters.push('missing'); }, d => { d.chapters[0].sections.push(d.chapters[0].sections[0]); }, d => { d.intro.en = '{{unknown}}'; }]) { const bad = structuredClone(data); mutate(bad); assert.throws(() => validateHandbook(bad), /Invalid handbook/); }
});
test('handbook URLs reject credentials, executable schemes and path escape', () => {
  for (const url of ['javascript:alert(1)', '../escape', './%2e%2e/escape', './a/../b', './a\\b', 'https://user:pass@example.com/', '//example.com', './a/%2f../x']) assert.equal(validHandbookUrl(url), false, url);
  for (const url of ['./handbook.html#first', './?scenario=test', 'https://example.com/docs']) assert.equal(validHandbookUrl(url), true, url);
});
test('static handbook escapes HTML and reuses localized scenario prompts and downloads', async () => {
  const data = await load(); data.chapters[0].sections[0].blocks.unshift({ type: 'paragraph', text: { zh: '<img src=x onerror=alert(1)>', en: '<img src=x onerror=alert(1)>' } });
  const { output } = await build(data);
  try {
    const start = await readFile(join(output, 'handbook-start.html'), 'utf8'); assert.match(start, /&lt;img src=x onerror=alert\(1\)&gt;/); assert.doesNotMatch(start, /<img src=x/);
    for (const locale of ['zh', 'en']) { const suffix = locale === 'en' ? '.en' : ''; const html = await readFile(join(output, `handbook-scenarios${suffix}.html`), 'utf8'); assert.match(html, /Prompt &lt;unsafe&gt; ``` fence/); assert.ok(html.includes(`./${catalogues[locale].scenarios[0].downloadUrl}`)); assert.ok(html.includes('bot=awesome%2Ftrial')); const markdown = await readFile(join(output, `handbook-scenarios${suffix}.md`), 'utf8'); assert.ok(markdown.includes('````text\nPrompt <unsafe> ``` fence\n````')); }
  } finally { await rm(output, { recursive: true, force: true }); }
});
test('handbook output and indexes are complete and deterministic, with portable full Markdown', async () => {
  const { output, result } = await build(await load());
  try {
    assert.equal(result.pages.length, 22); assert.equal((await readdir(output)).length, 47);
    assert.deepEqual(result.counts, { templates: 3, roles: 2, workflows: 1, adapted: 1, shared: 2, scenarios: 1 });
    const publicData = JSON.parse(await readFile(join(output, 'handbook.json'), 'utf8'));
    assert.deepEqual(publicData.scenarios, { zh: catalogues.zh.scenarios, en: catalogues.en.scenarios });
    assert.equal(publicData.contentRevision, 'test-1');
    const before = await Promise.all((await readdir(output)).sort().map(async file => [file, await readFile(join(output, file), 'utf8')]));
    for (const locale of ['zh', 'en']) { const index = JSON.parse(await readFile(join(output, `handbook-search.${locale}.json`))); assert.equal(index.schema, 'awesome.bot.handbook-search/1'); assert.equal(index.contentRevision, 'test-1'); assert.ok(index.entries.length >= 10); for (const entry of index.entries) { const [file, anchor] = entry.url.slice(2).split('#'); const html = await readFile(join(output, file), 'utf8'); assert.ok(html.includes(`id="${anchor}"`)); } }
    const complete = await readFile(join(output, 'handbook.en.md'), 'utf8'); assert.doesNotMatch(complete, /\]\(\.\//); assert.match(complete, /https:\/\/harzva.github.io\/awesome-bot\//);
    await writeHandbook({ output, version: 'test-1', catalogues, shared: { entries: [{}, {}] }, source: await load() });
    for (const [file, bytes] of before) assert.equal(await readFile(join(output, file), 'utf8'), bytes, file);
  } finally { await rm(output, { recursive: true, force: true }); }
});

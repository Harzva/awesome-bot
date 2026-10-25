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
async function build(source, localizedCatalogues = catalogues) { const output = await mkdtemp(join(tmpdir(), 'awesome-handbook-')); try { const result = await writeHandbook({ output, version: 'test-1', catalogues: localizedCatalogues, shared: { entries: [{}, {}] }, source }); return { output, result }; } catch (error) { await rm(output, { recursive: true, force: true }); throw error; } }
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
    assert.deepEqual(result.practiceScenarioIds, []);
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

test('chapter and complete Markdown keep code verbatim while rendering portable links and heading levels', async () => {
  const data = await load();
  const code = '# heading\n## subheading\n[example](./path)\n``` nested fence\n  keep spaces  ';
  const prompt = '# scenario prompt\n[local example](./prompt-path)\n```` longer nested fence';
  data.chapters[0].sections[0].blocks.push(
    { type: 'code', language: 'text', text: { zh: code, en: code } },
    { type: 'links', items: [{ label: { zh: '本地链接', en: 'Local link' }, url: { zh: './handbook.html#intro', en: './handbook.en.html#intro' } }] }
  );
  const localizedCatalogues = structuredClone(catalogues);
  for (const locale of ['zh', 'en']) localizedCatalogues[locale].scenarios[0].steps[0].prompt = prompt;
  const { output } = await build(data, localizedCatalogues);
  // Inspect document syntax independently of fenced examples, including variable-length fences.
  const outsideCode = markdown => markdown.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1$/gm, '');
  try {
    for (const locale of ['zh', 'en']) {
      const suffix = locale === 'en' ? '.en' : '';
      const complete = await readFile(join(output, `handbook${suffix}.md`), 'utf8');
      const chapter = await readFile(join(output, `handbook-start${suffix}.md`), 'utf8');
      const scenarios = await readFile(join(output, `handbook-scenarios${suffix}.md`), 'utf8');
      for (const document of [complete, chapter]) {
        assert.ok(document.includes(`\`\`\`\`text\n${code}\n\`\`\`\``), 'code bytes survive headings and relative-link examples');
        assert.ok(document.includes(`](https://harzva.github.io/awesome-bot/handbook${suffix}.html#intro)`));
      }
      for (const document of [complete, scenarios]) {
        assert.ok(document.includes(`\`\`\`\`\`text\n${prompt}\n\`\`\`\`\``), 'scenario prompt bytes survive');
        assert.ok(document.includes(`](https://harzva.github.io/awesome-bot/${localizedCatalogues[locale].scenarios[0].downloadUrl})`));
        assert.ok(document.includes(`](https://harzva.github.io/awesome-bot/?${locale === 'en' ? 'lang=en&' : ''}scenario=trial&bot=awesome%2Ftrial)`));
      }
      for (const name of (await readdir(output)).filter(name => name.endsWith(`${suffix}.md`) && (locale === 'en' || !name.endsWith('.en.md')))) {
        const document = outsideCode(await readFile(join(output, name), 'utf8'));
        assert.doesNotMatch(document, /\]\(\.\//, name);
        assert.equal((document.match(/^# /gm) || []).length, 1, name);
      }
      const headings = outsideCode(complete).split('\n').filter(line => /^#+ /.test(line));
      assert.ok(headings.includes(`## ${data.chapters[0].title[locale]}`));
      assert.ok(headings.includes(`### ${data.chapters[0].sections[0].title[locale]}`));
      assert.ok(headings.includes(`#### ${localizedCatalogues[locale].scenarios[0].title}`));
      assert.ok(headings.includes(`##### ${locale === 'en' ? 'Inputs' : '准备材料'}`));
      assert.ok(outsideCode(scenarios).includes(`### ${localizedCatalogues[locale].scenarios[0].title}`));
      const html = await readFile(join(output, `handbook-start${suffix}.html`), 'utf8');
      assert.match(html, /<input id="handbook-search" name="q" type="search" maxlength="160">/);
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('optional code captions require paired, strictly bilingual labels', async () => {
  const data = await load();
  const block = { type: 'code', language: 'text', text: { zh: 'source', en: 'source' } };
  data.chapters[0].sections[0].blocks.push(block);
  assert.equal(validateHandbook(data), data);
  block.label = { zh: '材料', en: 'Materials' };
  assert.throws(() => validateHandbook(data), /must appear together/);
  block.copyLabel = { zh: '复制材料', en: 'Copy materials' };
  assert.equal(validateHandbook(data), data);
  for (const field of ['label', 'copyLabel']) {
    for (const invalid of [null, 'text', { zh: '标题' }, { zh: '标题', en: '' }, { zh: '标题', en: '中文' }, { zh: '标题', en: 'Title', extra: 'x' }]) {
      const bad = structuredClone(data);
      bad.chapters[0].sections[0].blocks.at(-1)[field] = invalid;
      assert.throws(() => validateHandbook(bad), /Invalid handbook/);
    }
  }
  delete block.label;
  assert.throws(() => validateHandbook(data), /must appear together/);
});

test('code captions escape HTML, preserve code bytes, follow Markdown hierarchy and enter search', async () => {
  const data = await load();
  const text = '  <raw>\n# heading\n```\n[local](./raw)\n  ';
  const label = { zh: '材料 <示例> & "标题"', en: 'Materials <example> & "title"' };
  data.chapters[0].sections[0].blocks.push({ type: 'code', language: 'text', text: { zh: text, en: text }, label, copyLabel: { zh: '复制 "材料"', en: 'Copy "materials"' } });
  const { output } = await build(data);
  try {
    for (const locale of ['zh', 'en']) {
      const suffix = locale === 'en' ? '.en' : '';
      const html = await readFile(join(output, `handbook-start${suffix}.html`), 'utf8');
      assert.ok(html.includes(locale === 'en' ? '<h3>Materials &lt;example&gt; &amp; &quot;title&quot;</h3><pre data-copy-label="Copy &quot;materials&quot;">' : '<h3>材料 &lt;示例&gt; &amp; &quot;标题&quot;</h3><pre data-copy-label="复制 &quot;材料&quot;">'));
      assert.doesNotMatch(html, /<raw>|<example>|<示例>/);
      for (const [filename, level] of [[`handbook-start${suffix}.md`, 3], [`handbook${suffix}.md`, 4]]) {
        const markdown = await readFile(join(output, filename), 'utf8');
        assert.ok(markdown.includes(`${'#'.repeat(level)} ${label[locale].replace(/[<>]/g, '\\$&')}\n\n`));
        assert.ok(markdown.includes(`\`\`\`\`text\n${text}\n\`\`\`\``));
      }
      const index = JSON.parse(await readFile(join(output, `handbook-search.${locale}.json`), 'utf8'));
      assert.ok(index.entries.find(entry => entry.id === `start#${data.chapters[0].sections[0].id}`).text.includes(label[locale]));
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('scenario search points to individual full cards and practice links require matching scenario chapter sections', async () => {
  const data = await load();
  const chapter = data.chapters.find(chapter => chapter.id === 'scenarios');
  const cards = chapter.sections.find(section => section.blocks.some(block => block.type === 'scenarios'));
  const note = { zh: '索引保留文案', en: 'Retained index note' };
  cards.blocks.unshift({ type: 'paragraph', text: note });
  chapter.sections.push({ id: 'practice-trial', title: { zh: '练习', en: 'Practice' }, blocks: [{ type: 'paragraph', text: { zh: '虚构材料', en: 'Fictional material' } }] });
  // A matching section in another chapter must not produce a dangling practice link.
  data.chapters[0].sections.push({ id: 'practice-unmatched', title: { zh: '另章', en: 'Elsewhere' }, blocks: [{ type: 'paragraph', text: note }] });
  const localized = structuredClone(catalogues);
  for (const locale of ['zh', 'en']) localized[locale].scenarios.push({ ...scenario(locale), id: 'unmatched', title: 'Unmatched scenario', summary: 'Unique missing practice summary' });
  const { output, result } = await build(data, localized);
  try {
    assert.deepEqual(result.practiceScenarioIds, ['trial']);
    for (const locale of ['zh', 'en']) {
      const suffix = locale === 'en' ? '.en' : '';
      const html = await readFile(join(output, `handbook-scenarios${suffix}.html`), 'utf8');
      assert.ok(html.includes(`href="./handbook-scenarios${suffix}.html#practice-trial">${locale === 'en' ? 'Try the practice' : '用虚构材料练习'}</a>`));
      assert.doesNotMatch(html, /href="[^"\n]*#practice-unmatched"/);
      for (const filename of [`handbook-scenarios${suffix}.md`, `handbook${suffix}.md`]) {
        const markdown = await readFile(join(output, filename), 'utf8');
        assert.ok(markdown.includes(`](https://harzva.github.io/awesome-bot/handbook-scenarios${suffix}.html#practice-trial)`));
        assert.doesNotMatch(markdown, /\]\([^\n)]*#practice-unmatched\)/);
      }
      const index = JSON.parse(await readFile(join(output, `handbook-search.${locale}.json`), 'utf8'));
      for (const s of localized[locale].scenarios) {
        const hits = index.entries.filter(entry => entry.url.endsWith(`#scenario-${s.id}`));
        assert.equal(hits.length, 1);
        assert.equal(hits[0].title, s.title);
        for (const text of [s.title, s.summary, ...s.inputs, ...s.outputs, ...s.steps.flatMap(step => [step.botName, step.prompt, step.handoff])]) assert.ok(hits[0].text.includes(text));
      }
      const sectionEntry = index.entries.find(entry => entry.id === `scenarios#${cards.id}`);
      assert.equal(sectionEntry.text, note[locale]);
      assert.equal(sectionEntry.title, cards.title[locale]);
      for (const s of localized[locale].scenarios) assert.ok(!sectionEntry.text.includes(s.summary));
      assert.ok(index.entries.some(entry => entry.id === 'scenarios#practice-trial'));
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

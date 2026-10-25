import test from 'node:test';
import { runInNewContext } from 'node:vm';
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

test('reader paths require strict bilingual practice/check references within their own reading order', async () => {
  const data = await load();
  for (const field of ['practiceLinks', 'completionChecks']) {
    const textField = field === 'practiceLinks' ? 'label' : 'text';
    for (const mutate of [
      path => { delete path[field]; },
      path => { path[field] = []; },
      path => { path[field][0].extra = 'unknown'; },
      path => { delete path[field][0].section; },
      path => { path[field][0].chapter = 'missing'; },
      path => { path[field][0].section = 'missing'; },
      path => { path[field][0][textField].en = '中文'; },
      path => { path[field][0][textField] = { en: 'English only' }; },
      path => { path.chapters = path.chapters.filter(id => id !== path[field][0].chapter); }
    ]) {
      const invalid = structuredClone(data);
      mutate(invalid.paths[0]);
      assert.throws(() => validateHandbook(invalid), /Invalid handbook/, field);
    }
  }
  const unknown = structuredClone(data); unknown.paths[0].progress = true;
  assert.throws(() => validateHandbook(unknown), /unknown path field/);
});

test('reader path HTML, route metadata and portable Markdown preserve order, locales and safe text', async () => {
  const data = await load();
  const dangerous = '</script><img src=x onerror=alert(1)> & "text"';
  data.paths[0].title = { zh: dangerous, en: dangerous };
  data.paths[0].practiceLinks[0].label = { zh: dangerous, en: dangerous };
  data.paths[0].completionChecks[0].text = { zh: dangerous, en: dangerous };
  const { output, result } = await build(data);
  try {
    assert.equal(result.pages.length, 22);
    assert.equal((await readdir(output)).length, 47);
    for (const locale of ['zh', 'en']) {
      const suffix = locale === 'en' ? '.en' : '';
      const home = await readFile(join(output, `handbook${suffix}.html`), 'utf8');
      const metadataText = home.match(/<script type="application\/json" id="handbook-path-data">([\s\S]*?)<\/script>/)[1];
      assert.ok(!metadataText.includes('<'));
      const route = JSON.parse(metadataText);
      assert.equal(route.paths[0].title, dangerous);
      assert.equal(route.paths[0].completionChecks[0].title, dangerous);
      assert.doesNotMatch(home, /<img src=x/);
      assert.match(home, /&lt;\/script&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
      assert.doesNotMatch(home, /<input[^>]*type="checkbox"/);
      const markdown = await readFile(join(output, `handbook${suffix}.md`), 'utf8');
      const pathIntro = markdown.slice(0, markdown.indexOf(`## ${data.chapters[0].title[locale]}`));
      for (const path of data.paths) {
        assert.ok(home.includes(`id="path-${path.id}"`));
        assert.deepEqual(route.paths.find(item => item.id === path.id).chapters, path.chapters);
        const pathHTML = home.match(new RegExp(`<section id="path-${path.id}">([\\s\\S]*?)</section>`))[1];
        let position = -1;
        for (const id of path.chapters) {
          const url = `./handbook-${id}${suffix}.html?path=${path.id}`;
          const next = pathHTML.indexOf(`href="${url}"`);
          assert.ok(next > position, 'path chapters appear in declared order');
          position = next;
          assert.ok(pathIntro.includes(`](https://harzva.github.io/awesome-bot/${url.slice(2)})`));
        }
        assert.ok(pathHTML.includes(`handbook-${path.chapters.at(-1)}${suffix}.html?path=${path.id}#handbook-path-completion`));
        for (const item of [...path.practiceLinks, ...path.completionChecks]) {
          assert.ok(pathIntro.includes(`](https://harzva.github.io/awesome-bot/handbook-${item.chapter}${suffix}.html?path=${path.id}#${item.section})`));
        }
      }
      assert.doesNotMatch(pathIntro, /^- \[ \] /m);
      const chapter = await readFile(join(output, `handbook-start${suffix}.html`), 'utf8');
      assert.ok(chapter.indexOf('class="lede handbook-lede"') < chapter.indexOf('class="handbook-path-context"'));
      assert.ok(chapter.indexOf('class="handbook-path-context"') < chapter.indexOf('class="handbook-search"'));
      assert.ok(chapter.includes('<noscript>'));
      assert.ok(chapter.includes('rel="next" href="./handbook-concepts'));
      for (const item of data.chapters) {
        const html = await readFile(join(output, `handbook-${item.id}${suffix}.html`), 'utf8');
        for (const section of item.sections) assert.ok(html.includes(`id="${section.id}"`));
      }
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

// Minimal DOM adapter exercises the shipped script's navigation contract without a browser dependency.
async function pathRuntime(metadata, initialURL, searchEntries = []) {
  class Element {
    constructor(tag) { this.tagName = tag; this.dataset = {}; this.attributes = {}; this.childNodes = []; this.listeners = {}; this.hidden = false; this._text = ''; }
    set textContent(value) { this._text = value; this.childNodes = []; }
    get textContent() { return this._text + this.childNodes.map(node => node.textContent).join(''); }
    set href(value) { this.attributes.href = value; }
    get href() { return this.attributes.href; }
    append(...nodes) { for (const node of nodes) { this.childNodes.push(node); node.parent = this; } }
    replaceChildren(...nodes) { this._text = ''; this.childNodes = []; this.append(...nodes); }
    getAttribute(name) { return this.attributes[name] ?? (name.startsWith('data-') ? this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null : null); }
    setAttribute(name, value) { this.attributes[name] = value; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    cloneNode(deep) { const node = new Element(this.tagName); Object.assign(node, { attributes: { ...this.attributes }, dataset: { ...this.dataset }, className: this.className, _text: this._text }); if (deep) this.childNodes.forEach(child => node.append(child.cloneNode(true))); return node; }
    before(node) { const position = this.parent.childNodes.indexOf(this); this.parent.childNodes.splice(position, 0, node); node.parent = this.parent; }
    remove() { this.parent.childNodes = this.parent.childNodes.filter(node => node !== this); }
    scrollIntoView() { this.scrolled = true; }
    querySelectorAll(selector) {
      const matches = node => selector === 'a[href]' ? node.tagName === 'a' && node.hasAttribute('href') : selector.startsWith('.') ? node.className === selector.slice(1) : selector.startsWith('#') ? node.id === selector.slice(1) : selector.startsWith('[') ? node.hasAttribute(selector.slice(1, -1)) : node.tagName === selector;
      return this.childNodes.flatMap(node => [ ...(matches(node) ? [node] : []), ...node.querySelectorAll(selector) ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const root = new Element('article');
  const add = (tag, attributes = {}) => { const element = new Element(tag); Object.assign(element, attributes); root.append(element); return element; };
  const route = add('script', { id: 'handbook-path-data', textContent: JSON.stringify(metadata) });
  const context = add('p', { className: 'handbook-path-context', hidden: true });
  const pager = add('nav', { className: 'handbook-pager' });
  const ordinary = new Element('a'); ordinary.href = './handbook-reference.html'; ordinary.textContent = 'Full book next'; pager.append(ordinary);
  const sidebar = add('a'); sidebar.href = metadata.chapters[0].url;
  const language = add('a', { dataset: { handbookLanguage: '' } }); language.href = './handbook-start.en.html';
  const direct = add('a'); direct.href = '#unchanged';
  const external = add('a'); external.href = 'https://example.com/handbook-start.html';
  const market = add('a'); market.href = './?scenario=trial';
  const download = add('a'); download.href = './handbook.md';
  const explicitTeam = add('a'); explicitTeam.href = './handbook-team.html?path=team#handoff';
  const explicitDeveloper = add('a'); explicitDeveloper.href = './handbook-agents.html?path=developer#local-lab';
  const unknownPath = add('a'); unknownPath.href = './handbook-team.html?path=untrusted#handoff';
  const choice = add('a', { dataset: { handbookPathChoice: '' } }); choice.href = './handbook-team.html?path=team#handoff';
  const form = add('form', { className: 'handbook-search', dataset: { index: './index.json' } });
  const input = add('input', { id: 'handbook-search', value: '' });
  const results = add('section', { id: 'handbook-results', dataset: { loading: 'Loading', empty: 'Empty' } });
  const location = new URL(initialURL);
  const windowEvents = {};
  const document = { documentElement: { lang: metadata.home.includes('.en.') ? 'en' : 'zh-CN' }, createElement: tag => new Element(tag), createTextNode: value => Object.assign(new Element('#text'), { textContent: value }), querySelector: selector => root.querySelector(selector), querySelectorAll: selector => root.querySelectorAll(selector), getElementById: id => root.querySelector('#' + id) };
  runInNewContext(await readFile(resolve(rootPath, 'site/handbook.js'), 'utf8'), { document, location, window: { addEventListener: (name, callback) => { windowEvents[name] = callback; } }, URL, history: { replaceState: (_, __, value) => { location.href = new URL(value, location.href).href; } }, fetch: async () => ({ ok: true, json: async () => ({ schema: 'awesome.bot.handbook-search/1', locale: metadata.home.includes('.en.') ? 'en' : 'zh', entries: searchEntries }) }), AbortSignal, setTimeout, clearTimeout });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  return { context, pager, sidebar, language, direct, external, market, download, choice, explicitTeam, explicitDeveloper, unknownPath, root, input, results, location, settle, async navigate(url) { location.href = new URL(url, location.href).href; windowEvents.popstate(); await settle(); }, async search(query) { input.value = query; form.listeners.submit({ preventDefault() {} }); await settle(); }, hashchange: () => windowEvents.hashchange() };
}
const rootPath = root;

test('shipped path runtime maintains path pager, supplementary context, manual checks and navigation state', async () => {
  const { output } = await build(await load());
  try {
    for (const locale of ['zh', 'en']) {
      const suffix = locale === 'en' ? '.en' : '';
      const html = await readFile(join(output, `handbook-concepts${suffix}.html`), 'utf8');
      const metadata = JSON.parse(html.match(/id="handbook-path-data">([\s\S]*?)<\/script>/)[1]);
      for (const path of metadata.paths) {
        metadata.chapter = path.chapters[0];
        const url = `https://harzva.github.io/awesome-bot/handbook-${metadata.chapter}${suffix}.html?path=${path.id}&q=needle#topic`;
        const runtime = await pathRuntime(metadata, url, [{ id: 'hit', title: 'needle', chapter: 'Chapter', summary: 'Summary', text: 'needle source', url: `./handbook-scenarios${suffix}.html#cards` }]);
        assert.equal(runtime.context.hidden, false);
        assert.ok(runtime.context.textContent.includes(path.title));
        assert.equal(runtime.pager.childNodes.length, 1, 'first chapter has no previous chapter');
        assert.ok(runtime.pager.childNodes[0].href.includes(`handbook-${path.chapters[1]}${suffix}.html?path=${path.id}`));
        assert.ok(runtime.sidebar.href.includes(`path=${path.id}`));
        assert.ok(runtime.language.href.includes(`path=${path.id}`));
        assert.ok(runtime.language.href.includes('q=needle#topic'));
        assert.equal(runtime.direct.href, '#unchanged');
        assert.ok(runtime.explicitTeam.href.endsWith('?path=team#handoff'));
        assert.ok(runtime.explicitDeveloper.href.endsWith('?path=developer#local-lab'));
        assert.ok(runtime.unknownPath.href.endsWith(`?path=${path.id}#handoff`));
        assert.equal(runtime.choice.href, './handbook-team.html?path=team#handoff');
        assert.equal(runtime.market.href, './?scenario=trial');
        assert.equal(runtime.download.href, './handbook.md');
        assert.equal(runtime.external.href, 'https://example.com/handbook-start.html');
        assert.ok(runtime.results.querySelector('a').href.includes(`?path=${path.id}#cards`));
        const exit = runtime.context.querySelector('[data-handbook-path-exit]');
        assert.ok(!exit.href.includes('path='));
        assert.ok(exit.href.endsWith('?q=needle#topic'));
        runtime.location.hash = '#changed'; runtime.hashchange();
        assert.ok(runtime.language.href.endsWith('#changed'));
        await runtime.navigate('?path=unknown&q=needle#back');
        assert.equal(runtime.context.hidden, true);
        assert.equal(runtime.pager.textContent, 'Full book next');
        assert.ok(!runtime.sidebar.href.includes('path='));
        assert.ok(!runtime.language.href.includes('path='));
        assert.ok(runtime.language.href.endsWith('q=needle#back'));
        await runtime.navigate(`?path=${path.id}&q=needle#topic`);
        assert.equal(runtime.context.hidden, false, 'browser back restores selected path');
        assert.ok(runtime.results.querySelector('a').href.includes(`path=${path.id}`));
        const middleMetadata = structuredClone(metadata); middleMetadata.chapter = path.chapters[1];
        const middle = await pathRuntime(middleMetadata, `https://harzva.github.io/awesome-bot/handbook-${middleMetadata.chapter}${suffix}.html?path=${path.id}`);
        assert.equal(middle.pager.childNodes.length, 2);
        assert.ok(middle.pager.childNodes[0].href.includes(`handbook-${path.chapters[0]}${suffix}.html?path=${path.id}`));
        assert.ok(middle.pager.childNodes[1].href.includes(`handbook-${path.chapters[2]}${suffix}.html?path=${path.id}`));
        const lastMetadata = structuredClone(metadata); lastMetadata.chapter = path.chapters.at(-1);
        const last = await pathRuntime(lastMetadata, `https://harzva.github.io/awesome-bot/handbook-${lastMetadata.chapter}${suffix}.html?path=${path.id}#handbook-path-completion`);
        const completion = last.root.querySelector('.handbook-path-completion');
        assert.ok(completion.scrolled);
        assert.equal(completion.querySelectorAll('input').length, 0);
        assert.equal(completion.querySelectorAll('li').length, path.completionChecks.length + path.practiceLinks.length);
        assert.ok(completion.textContent.includes(metadata.words.completionIntro));
        assert.equal(last.pager.childNodes.length, 1, 'last chapter has no next chapter');
        const outside = metadata.chapters.find(chapter => !path.chapters.includes(chapter.id));
        if (outside) {
          const extraMetadata = structuredClone(metadata); extraMetadata.chapter = outside.id;
          const extra = await pathRuntime(extraMetadata, `https://harzva.github.io/awesome-bot/${outside.url.slice(2)}?path=${path.id}`);
          assert.ok(extra.context.textContent.includes(metadata.words.supplementary));
          assert.equal(extra.pager.hidden, true);
          assert.equal(extra.root.querySelector('.handbook-path-completion'), null);
        }
      }
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

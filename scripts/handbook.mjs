import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './engine.mjs';

const BASE = 'https://harzva.github.io/awesome-bot/';
const IDS = ['start', 'concepts', 'choose-import', 'instructions', 'team', 'scenarios', 'agents', 'contribute', 'troubleshooting', 'reference'];
const COUNT_KEYS = ['templates', 'roles', 'workflows', 'adapted', 'shared', 'scenarios'];
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = value => String(value).replace(/[\\`*_[\]<>|]/g, '\\$&');
const markdownUrl = value => value.startsWith('./') ? new URL(value, BASE).href : value;
const heading = (level, title) => `${'#'.repeat(level)} ${title}`;
const pathUrl = (id, locale, path, section = '') => `./${page(id, locale)}?path=${path}${section ? `#${section}` : ''}`;
const page = (id, locale, ext = 'html') => `handbook${id ? `-${id}` : ''}${locale === 'en' ? '.en' : ''}.${ext}`;
const words = { zh: { home: '手册首页', market: '模板市场', shared: '共享 Bot', resources: '外部资源', handbook: '使用手册', search: '搜索整本手册', go: '搜索', loading: '正在搜索…', empty: '没有匹配内容', failed: '搜索加载失败', retry: '重试', paths: '按你的目标阅读', chapters: '全部章节', full: '下载完整手册 Markdown', json: '下载双语 JSON', chapter: '下载本章 Markdown', print: '打印本章', sources: '参考来源', checked: '来源核对日期', inputs: '准备材料', outputs: '预期交付', handoff: '交接', download: '下载场景配置', view: '在市场中查看', previous: '上一章', next: '下一章', contents: '本章内容', practice: '用虚构材料练习', pathDirectory: '路径目录', exitPath: '退出路径，按全书阅读', supplementary: '补充阅读：本章不在所选路径中', completion: '路径末章：人工验收', completionIntro: '这是阅读位置，不代表任务已完成。请对照实际结果逐项检查；需要时返回相关章节或练习。', completionLink: '查看路径末章的人工验收', pathNoScript: '路径导航需要 JavaScript；当前可按完整手册顺序阅读。' }, en: { home: 'Handbook home', market: 'Template market', shared: 'Shared Bots', resources: 'External resources', handbook: 'Handbook', search: 'Search the whole handbook', go: 'Search', loading: 'Searching…', empty: 'No matching content', failed: 'Search could not load', retry: 'Retry', paths: 'Read for your goal', chapters: 'All chapters', full: 'Download complete Markdown handbook', json: 'Download bilingual JSON', chapter: 'Download chapter Markdown', print: 'Print chapter', sources: 'Sources', checked: 'Sources checked', inputs: 'Inputs', outputs: 'Expected outputs', handoff: 'Handoff', download: 'Download scenario configuration', view: 'View in market', previous: 'Previous chapter', next: 'Next chapter', contents: 'On this page', practice: 'Try the practice', pathDirectory: 'Path directory', exitPath: 'Exit path and read the full handbook', supplementary: 'Supplementary reading: this chapter is outside the selected path', completion: 'End of reading path: manual checks', completionIntro: 'This is a reading location, not a claim that the task is complete. Check each item against your actual results and return to the relevant chapter or practice when needed.', completionLink: 'View manual checks at the end of this path', pathNoScript: 'Path navigation requires JavaScript; you can read in full handbook order here.' } };
function demand(ok, detail) { if (!ok) throw new Error(`Invalid handbook: ${detail}`); }
export function validHandbookUrl(value) {
  if (typeof value !== 'string' || /[\s\\<>"'\x00-\x1f]/.test(value)) return false;
  if (value.startsWith('./')) {
    try { const decoded = decodeURIComponent(value.split(/[?#]/)[0]); return (decoded === './' || !decoded.slice(2).split('/').some(p => p === '..' || p === '.' || !p)) && !decoded.includes('\\') && new URL(value, BASE).href.startsWith(BASE); } catch { return false; }
  }
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function bilingual(value, label) {
  demand(value && typeof value === 'object' && Object.keys(value).length === 2 && ['zh', 'en'].every(k => typeof value[k] === 'string' && value[k].trim()), `${label} needs zh/en text`);
  demand(!/\p{Script=Han}/u.test(value.en), `${label} English contains Han characters`);
  for (const locale of ['zh', 'en']) for (const match of value[locale].matchAll(/{{(.*?)}}/g)) demand(COUNT_KEYS.includes(match[1]), `unknown count placeholder ${match[1]}`);
}
export function validateHandbook(data) {
  demand(data?.schema === 'awesome.bot.handbook/1' && /^\d{4}-\d{2}-\d{2}$/.test(data.checkedAt), 'schema/date');
  bilingual(data.title, 'title'); bilingual(data.intro, 'intro');
  demand(Array.isArray(data.chapters) && data.chapters.length === IDS.length && IDS.every(id => data.chapters.some(c => c.id === id)), 'chapter coverage');
  const ids = new Set(); let scenarioBlocks = 0;
  for (const chapter of data.chapters) {
    demand(!ids.has(chapter.id), 'duplicate chapter'); ids.add(chapter.id);
    bilingual(chapter.title, 'chapter title'); bilingual(chapter.summary, 'chapter summary');
    demand(Array.isArray(chapter.audiences) && chapter.audiences.length && chapter.audiences.every(a => ['start', 'team', 'developer'].includes(a)), 'audiences');
    demand(Array.isArray(chapter.sections) && chapter.sections.length, 'sections'); const sections = new Set();
    for (const section of chapter.sections) {
      demand(/^[a-z][a-z0-9-]*$/.test(section.id) && !sections.has(section.id), 'section ID'); sections.add(section.id); bilingual(section.title, 'section title');
      demand(Array.isArray(section.blocks) && section.blocks.length, 'blocks');
      for (const block of section.blocks) {
        const fields = { paragraph: ['type', 'text'], list: ['type', 'items'], steps: ['type', 'items'], code: ['type', 'language', 'text', 'label', 'copyLabel'], table: ['type', 'headers', 'rows'], links: ['type', 'items'], scenarios: ['type'] }[block.type];
        demand(fields && Object.keys(block).every(key => fields.includes(key)), 'unknown block or field');
        if (['paragraph', 'code'].includes(block.type)) bilingual(block.text, 'block text');
        if (block.type === 'code') {
          demand(['text', 'sh', 'js', 'json'].includes(block.language), 'code language');
          const hasLabel = Object.hasOwn(block, 'label'), hasCopyLabel = Object.hasOwn(block, 'copyLabel');
          demand(hasLabel === hasCopyLabel, 'code label and copyLabel must appear together');
          if (hasLabel) { bilingual(block.label, 'code label'); bilingual(block.copyLabel, 'code copyLabel'); }
        }
        if (['list', 'steps'].includes(block.type)) { demand(Array.isArray(block.items) && block.items.length, 'list'); block.items.forEach(item => bilingual(item, 'list item')); }
        if (block.type === 'links') { demand(Array.isArray(block.items) && block.items.length, 'links'); for (const item of block.items) { bilingual(item.label, 'link label'); bilingual(item.url, 'link URL'); demand(['zh', 'en'].every(l => validHandbookUrl(item.url[l])), 'unsafe URL'); } }
        if (block.type === 'table') { demand(Array.isArray(block.headers) && block.headers.length && Array.isArray(block.rows) && block.rows.length, 'table'); block.headers.forEach(v => bilingual(v, 'header')); for (const row of block.rows) { demand(Array.isArray(row) && row.length === block.headers.length, 'table width'); row.forEach(v => bilingual(v, 'cell')); } }
        if (block.type === 'scenarios') scenarioBlocks++;
      }
    }
    demand(Array.isArray(chapter.sources) && chapter.sources.length, 'sources');
    for (const source of chapter.sources) { bilingual(source.label, 'source label'); demand(validHandbookUrl(source.url) && source.url.startsWith('https://'), 'source URL'); }
  }
  demand(scenarioBlocks === 1, 'exactly one scenario block');
  demand(Array.isArray(data.paths) && data.paths.length === 3 && new Set(data.paths.map(p => p.id)).size === 3, 'three paths');
  for (const path of data.paths) {
    demand(Object.keys(path).every(key => ['id', 'title', 'summary', 'chapters', 'practiceLinks', 'completionChecks'].includes(key)), 'unknown path field');
    demand(['start', 'team', 'developer'].includes(path.id), 'path ID');
    bilingual(path.title, 'path title'); bilingual(path.summary, 'path summary');
    demand(Array.isArray(path.chapters) && path.chapters.length && new Set(path.chapters).size === path.chapters.length && path.chapters.every(id => ids.has(id)), 'path chapters');
    for (const [field, textField] of [['practiceLinks', 'label'], ['completionChecks', 'text']]) {
      demand(Array.isArray(path[field]) && path[field].length, `path ${field}`);
      for (const item of path[field]) {
        demand(item && typeof item === 'object' && Object.keys(item).length === 3 && Object.keys(item).every(key => ['chapter', 'section', textField].includes(key)), `path ${field} fields`);
        demand(path.chapters.includes(item.chapter) && data.chapters.find(chapter => chapter.id === item.chapter)?.sections.some(section => section.id === item.section), `path ${field} target`);
        bilingual(item[textField], `path ${field} ${textField}`);
      }
    }
  }
  return data;
}
function fence(text, language = 'text') { const length = Math.max(3, ...(text.match(/`+/g) || []).map(run => run.length + 1)); const marker = '`'.repeat(length); return `${marker}${language}\n${text}\n${marker}`; }
function scenarioBlocks(catalogue, locale, headingOffset = 0, practiceIds = new Set()) {
  const w = words[locale];
  return catalogue.scenarios.map(s => {
    const market = `./${locale === 'en' ? '?lang=en&' : '?'}scenario=${encodeURIComponent(s.id)}`;
    const download = `./${s.downloadUrl.replace(/^\.\//, '')}`;
    demand(validHandbookUrl(download), 'scenario download URL');
    const practice = practiceIds.has(`practice-${s.id}`) ? `./${page('scenarios', locale)}#practice-${s.id}` : null;
    return { id: s.id, title: s.title, summary: s.summary, html: `<section class="handbook-scenario" id="scenario-${esc(s.id)}"><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><h4>${w.inputs}</h4><ul>${s.inputs.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h4>${w.outputs}</h4><ul>${s.outputs.map(x => `<li>${esc(x)}</li>`).join('')}</ul><ol>${s.steps.map(step => `<li><h4><a href="${esc(`${market}&bot=${encodeURIComponent(step.botId)}`)}">${esc(step.botName)}</a></h4><pre><code>${esc(step.prompt)}</code></pre><p>${w.handoff}: ${esc(step.handoff)}</p></li>`).join('')}</ol><p><a href="${esc(market)}">${w.view}</a> · <a href="${esc(download)}" download>${w.download}</a>${practice ? ` · <a href="${esc(practice)}">${w.practice}</a>` : ''}</p></section>`, markdown: `${heading(3 + headingOffset, md(s.title))}\n\n${md(s.summary)}\n\n${heading(4 + headingOffset, w.inputs)}\n\n${s.inputs.map(x => `- ${md(x)}`).join('\n')}\n\n${heading(4 + headingOffset, w.outputs)}\n\n${s.outputs.map(x => `- ${md(x)}`).join('\n')}\n\n${s.steps.map((step, i) => `${heading(4 + headingOffset, `${i + 1}. [${md(step.botName)}](${markdownUrl(`${market}&bot=${encodeURIComponent(step.botId)}`)})`)}\n\n${fence(step.prompt)}\n\n${w.handoff}: ${md(step.handoff)}`).join('\n\n')}\n\n[${w.view}](${markdownUrl(market)}) · [${w.download}](${markdownUrl(download)})${practice ? ` · [${w.practice}](${markdownUrl(practice)})` : ''}`, text: [s.title, s.summary, ...s.inputs, ...s.outputs, ...s.steps.flatMap(step => [step.botName, step.prompt, step.handoff])].join('\n') };
  });
}
function renderBlock(block, locale, catalogue, headingOffset = 0, practiceIds = new Set()) {
  const t = v => v[locale];
  if (block.type === 'paragraph') return { html: `<p>${esc(t(block.text))}</p>`, markdown: md(t(block.text)), text: t(block.text) };
  if (block.type === 'code') return {
    html: `${block.label ? `<h3>${esc(t(block.label))}</h3>` : ''}<pre${block.copyLabel ? ` data-copy-label="${esc(t(block.copyLabel))}"` : ''}><code class="language-${block.language}">${esc(t(block.text))}</code></pre>`,
    markdown: `${block.label ? `${heading(3 + headingOffset, md(t(block.label)))}\n\n` : ''}${fence(t(block.text), block.language)}`,
    text: [block.label && t(block.label), t(block.text)].filter(Boolean).join('\n')
  };
  if (['list', 'steps'].includes(block.type)) { const tag = block.type === 'steps' ? 'ol' : 'ul'; return { html: `<${tag}>${block.items.map(v => `<li>${esc(t(v))}</li>`).join('')}</${tag}>`, markdown: block.items.map((v, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${md(t(v))}`).join('\n'), text: block.items.map(t).join('\n') }; }
  if (block.type === 'links') return { html: `<ul>${block.items.map(v => `<li><a href="${esc(t(v.url))}">${esc(t(v.label))}</a></li>`).join('')}</ul>`, markdown: block.items.map(v => `- [${md(t(v.label))}](${markdownUrl(t(v.url))})`).join('\n'), text: block.items.map(v => t(v.label)).join('\n') };
  if (block.type === 'table') return { html: `<div class="handbook-table" tabindex="0"><table><thead><tr>${block.headers.map(v => `<th scope="col">${esc(t(v))}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(v => `<td>${esc(t(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, markdown: [block.headers.map(v => md(t(v))).join(' | '), block.headers.map(() => '---').join(' | '), ...block.rows.map(row => row.map(v => md(t(v))).join(' | '))].map(row => `| ${row} |`).join('\n'), text: [...block.headers, ...block.rows.flat()].map(t).join('\n') };
  const blocks = scenarioBlocks(catalogue, locale, headingOffset, practiceIds); return Object.fromEntries(['html', 'markdown', 'text'].map(key => [key, blocks.map(b => b[key]).join('\n\n')]));
}
export async function writeHandbook({ output, version, catalogues, shared, source }) {
  const raw = validateHandbook(source || JSON.parse(await readFile(resolve(root, 'data/handbook.json'), 'utf8')));
  const catalogue = catalogues.zh;
  const counts = { templates: catalogue.entries.length, roles: catalogue.counts.roles, workflows: catalogue.counts.workflows, adapted: catalogue.entries.filter(e => e.implementation === 'third-party-adaptation').length, shared: shared.entries.length, scenarios: catalogue.scenarios.length };
  // Counts are resolved in strings only, preserving JSON structure and escaping.
  const replace = value => typeof value === 'string' ? value.replace(/{{(.*?)}}/g, (_, key) => String(counts[key])) : Array.isArray(value) ? value.map(replace) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, v]) => [key, replace(v)])) : value;
  const data = { ...replace(raw), contentRevision: version, counts, scenarios: { zh: catalogues.zh.scenarios, en: catalogues.en.scenarios } };
  const practiceIds = new Set(data.chapters.find(chapter => chapter.id === 'scenarios').sections.map(section => section.id));
  const shell = await readFile(resolve(root, 'scripts/templates/handbook.html'), 'utf8'); const pages = [];
  await writeFile(resolve(output, 'handbook.json'), JSON.stringify(data, null, 2) + '\n');
  for (const locale of ['zh', 'en']) {
    const w = words[locale], t = v => v[locale], entries = [], rendered = new Map();
    for (const chapter of data.chapters) {
      const sections = chapter.sections.map(section => {
        const blocks = section.blocks.map(block => renderBlock(block, locale, catalogues[locale], 0, practiceIds));
        entries.push({ id: `${chapter.id}#${section.id}`, chapter: t(chapter.title), title: t(section.title), summary: t(chapter.summary), text: blocks.filter((_, i) => section.blocks[i].type !== 'scenarios').map(b => b.text).join('\n'), url: `./${page(chapter.id, locale)}#${section.id}` });
        if (section.blocks.some(block => block.type === 'scenarios')) {
          for (const scenario of scenarioBlocks(catalogues[locale], locale, 0, practiceIds)) {
            entries.push({ id: `${chapter.id}#scenario-${scenario.id}`, chapter: t(chapter.title), title: scenario.title, summary: scenario.summary, text: scenario.text, url: `./${page(chapter.id, locale)}#scenario-${scenario.id}` });
          }
        }
        return { html: `<section class="handbook-section" id="${esc(section.id)}"><h2>${esc(t(section.title))}</h2>${blocks.map(b => b.html).join('\n')}</section>`, markdown: `## ${md(t(section.title))}\n\n${blocks.map(b => b.markdown).join('\n\n')}`, completeMarkdown: `### ${md(t(section.title))}\n\n${section.blocks.map(block => renderBlock(block, locale, catalogues[locale], 1, practiceIds).markdown).join('\n\n')}` };
      });
      const sourcesHTML = `<section class="handbook-section"><h2>${w.sources}</h2><p>${w.checked}: <time datetime="${data.checkedAt}">${data.checkedAt}</time></p><ul>${chapter.sources.map(s => `<li><a href="${esc(s.url)}">${esc(t(s.label))}</a></li>`).join('')}</ul></section>`;
      const chapterMarkdown = offset => `${heading(1 + offset, md(t(chapter.title)))}\n\n${md(t(chapter.summary))}\n\n${sections.map(s => offset ? s.completeMarkdown : s.markdown).join('\n\n')}\n\n${heading(2 + offset, w.sources)}\n\n${w.checked}: ${data.checkedAt}\n\n${chapter.sources.map(s => `- [${md(t(s.label))}](${markdownUrl(s.url)})`).join('\n')}\n`;
      const markdown = chapterMarkdown(0);
      rendered.set(chapter.id, { html: sections.map(s => s.html).join('\n') + sourcesHTML, completeMarkdown: chapterMarkdown(1) });
      await writeFile(resolve(output, page(chapter.id, locale, 'md')), markdown);
    }
    const pathMarkdown = `## ${w.paths}\n\n${data.paths.map(path => `### ${md(t(path.title))}\n\n${md(t(path.summary))}\n\n${path.chapters.map((id, i) => `${i + 1}. [${md(t(data.chapters.find(chapter => chapter.id === id).title))}](${markdownUrl(pathUrl(id, locale, path.id))})`).join('\n')}\n\n${path.practiceLinks.map(link => `- [${md(t(link.label))}](${markdownUrl(pathUrl(link.chapter, locale, path.id, link.section))})`).join('\n')}\n\n#### ${w.completion}\n\n${w.completionIntro}\n\n${path.completionChecks.map(check => `- [${md(t(check.text))}](${markdownUrl(pathUrl(check.chapter, locale, path.id, check.section))})`).join('\n')}`).join('\n\n')}`;
    const complete = [`# ${md(t(data.title))}`, md(t(data.intro)), pathMarkdown, ...data.chapters.map(c => rendered.get(c.id).completeMarkdown.trim())].join('\n\n') + '\n';
    await writeFile(resolve(output, page('', locale, 'md')), complete);
    await writeFile(resolve(output, `handbook-search.${locale}.json`), JSON.stringify({ schema: 'awesome.bot.handbook-search/1', locale, contentRevision: version, entries }, null, 2) + '\n');
    for (const chapter of [null, ...data.chapters]) {
      const id = chapter?.id || '', index = data.chapters.indexOf(chapter);
      const language = `<a data-handbook-language href="./${page(id, locale === 'zh' ? 'en' : 'zh')}" lang="${locale === 'zh' ? 'en' : 'zh'}">${locale === 'zh' ? 'English' : '中文'}</a>`;
      const header = `<header class="site-header"><a class="brandmark" href="./${locale === 'en' ? '?lang=en' : ''}" aria-label="Awesome Bot">Awesome Bot</a><nav class="site-nav" aria-label="${w.handbook}"><a href="./${locale === 'en' ? '?lang=en' : ''}">${w.market}</a><a href="./shared-bots.html${locale === 'en' ? '?lang=en' : ''}">${w.shared}</a><a href="./resources${locale === 'en' ? '.en' : ''}.html">${w.resources}</a><a href="./${page('', locale)}"${!chapter ? ' aria-current="page"' : ''}>${w.handbook}</a>${language}</nav></header>`;
      const sidebar = `<nav aria-label="${w.chapters}"><ul><li><a href="./${page('', locale)}"${!chapter ? ' aria-current="page"' : ''}>${w.home}</a></li>${data.chapters.map(c => `<li><a href="./${page(c.id, locale)}"${c.id === id ? ' aria-current="page"' : ''}>${esc(t(c.title))}</a></li>`).join('')}</ul></nav>`;
      const search = `<form class="handbook-search" role="search" data-locale="${locale}" data-index="./handbook-search.${locale}.json?v=${esc(version)}" data-loading="${esc(w.loading)}" data-empty="${esc(w.empty)}" data-failed="${esc(w.failed)}" data-retry="${esc(w.retry)}"><label for="handbook-search">${w.search}</label><input id="handbook-search" name="q" type="search" maxlength="160"><button type="submit">${w.go}</button></form><section id="handbook-results" aria-live="polite" data-loading="${esc(w.loading)}" data-empty="${esc(w.empty)}" data-failed="${esc(w.failed)}" data-retry="${esc(w.retry)}" hidden></section>`;
      const actions = `<div class="handbook-actions"><a href="./${page(id, locale, 'md')}" download>${chapter ? w.chapter : w.full}</a>${chapter ? `<button type="button" data-handbook-print>${w.print}</button>` : `<a href="./handbook.json" download>${w.json}</a>`}</div>`;
      const home = `<section class="handbook-paths"><h2>${w.paths}</h2>${data.paths.map(p => `<section id="path-${p.id}"><h3>${esc(t(p.title))}</h3><p>${esc(t(p.summary))}</p><ol>${p.chapters.map(cid => `<li><a data-handbook-path-choice href="${pathUrl(cid, locale, p.id)}">${esc(t(data.chapters.find(c => c.id === cid).title))}</a></li>`).join('')}</ol><ul>${p.practiceLinks.map(link => `<li><a data-handbook-path-choice href="${pathUrl(link.chapter, locale, p.id, link.section)}">${esc(t(link.label))}</a></li>`).join('')}</ul><p><a hidden data-handbook-completion-link data-handbook-path-choice href="${pathUrl(p.chapters.at(-1), locale, p.id, 'handbook-path-completion')}">${w.completionLink}</a></p></section>`).join('')}</section><section class="handbook-chapters"><h2>${w.chapters}</h2><ol>${data.chapters.map(c => `<li><h3><a href="./${page(c.id, locale)}">${esc(t(c.title))}</a></h3><p>${esc(t(c.summary))}</p></li>`).join('')}</ol></section><noscript><p>${locale === 'en' ? 'Reading-path checks are available in the' : '路径人工验收可在此查看：'} <a href="./${page('', locale, 'md')}">${w.full}</a></p></noscript>`;
      const localContents = chapter ? `<nav class="handbook-on-this-page" aria-label="${w.contents}"><ul>${chapter.sections.map(s => `<li><a href="#${esc(s.id)}">${esc(t(s.title))}</a></li>`).join('')}</ul></nav>` : '';
      const pager = chapter ? `<nav class="handbook-pager" aria-label="${w.chapters}">${index > 0 ? `<a rel="prev" href="./${page(data.chapters[index - 1].id, locale)}">${w.previous}: ${esc(t(data.chapters[index - 1].title))}</a>` : ''}${index < data.chapters.length - 1 ? `<a rel="next" href="./${page(data.chapters[index + 1].id, locale)}">${w.next}: ${esc(t(data.chapters[index + 1].title))}</a>` : ''}</nav>` : '';
      const routeData = { chapter: id, chapters: data.chapters.map(c => ({ id: c.id, title: t(c.title), url: `./${page(c.id, locale)}` })), home: `./${page('', locale)}`, paths: data.paths.map(p => ({ id: p.id, title: t(p.title), chapters: p.chapters, practiceLinks: p.practiceLinks.map(link => ({ title: t(link.label), url: pathUrl(link.chapter, locale, p.id, link.section) })), completionChecks: p.completionChecks.map(check => ({ title: t(check.text), url: pathUrl(check.chapter, locale, p.id, check.section) })) })), words: Object.fromEntries(['pathDirectory', 'exitPath', 'supplementary', 'completion', 'completionIntro', 'previous', 'next', 'practice'].map(key => [key, w[key]])) };
      const routeJSON = JSON.stringify(routeData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
      const pathContext = chapter ? `<p class="handbook-path-context" hidden></p><noscript><p>${w.pathNoScript}</p></noscript>` : '';
      const values = { lang: locale === 'zh' ? 'zh-CN' : 'en', title: esc(`${t(chapter?.title || data.title)} · Awesome Bot`), description: esc(t(chapter?.summary || data.intro)), version: esc(version), header, sidebar, content: `<article><h1>${esc(t(chapter?.title || data.title))}</h1><p class="lede handbook-lede">${esc(t(chapter?.summary || data.intro))}</p>${pathContext}${search}${actions}${localContents}${chapter ? rendered.get(id).html : home}${pager}<script type="application/json" id="handbook-path-data">${routeJSON}</script></article>`, footer: `<footer class="handbook-footer"><p>Awesome Bot · ${esc(version)} · ${w.checked}: ${data.checkedAt}</p></footer>` };
      const html = shell.replace(/{{(\w+)}}/g, (_, key) => { demand(Object.hasOwn(values, key), `unknown shell token ${key}`); return values[key]; });
      await writeFile(resolve(output, page(id, locale)), html); pages.push(page(id, locale));
    }
  }
  return { pages, counts, practiceScenarioIds: catalogue.scenarios.filter(scenario => practiceIds.has(`practice-${scenario.id}`)).map(scenario => scenario.id) };
}

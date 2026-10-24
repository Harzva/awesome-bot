import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './engine.mjs';

export const categories = {
  'team-templates': ['团队模板', 'Team templates'],
  gateway: ['任务网关', 'Gateway'],
  'workflow-reference': ['工作流参考', 'Workflow reference'],
  'cli-orchestration': ['CLI 协作', 'CLI orchestration'],
  'delegation-skill': ['委派技能', 'Delegation skill'],
  'architecture-reference': ['架构参考', 'Architecture'],
  'alternative-runtime': ['独立运行平台', 'Alternative runtime']
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function validateProjects(data) {
  if (data.schema !== 'awesome.bot.external-projects/1' || !/^\d{4}-\d{2}-\d{2}$/.test(data.checkedAt) || !Array.isArray(data.projects) || !data.projects.length) throw new Error('Invalid external project catalogue');
  const ids = new Set(), repositories = new Set();
  for (const item of data.projects) {
    const fail = () => { throw new Error(`Invalid external project: ${item.id || 'missing ID'}`); };
    if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id) || !/^[\w.-]+\/[\w.-]+$/.test(item.repository) || repositories.has(item.repository.toLowerCase())) fail();
    ids.add(item.id); repositories.add(item.repository.toLowerCase());
    if (item.url !== `https://github.com/${item.repository}` || !/^[a-f0-9]{40}$/.test(item.revision) || item.readmeUrl !== `${item.url}/blob/${item.revision}/README.md`) fail();
    if (!categories[item.category] || !item.name || item.checkedAt !== data.checkedAt) fail();
    if (item.openbot?.installable !== false || item.openbot?.status !== 'external-reference' || 'downloadUrl' in item || 'manifestUrl' in item) fail();
    for (const locale of ['zh', 'en']) if (!item.summary?.[locale]?.trim() || !item.openbot.note?.[locale]?.trim()) fail();
    if (item.openSource !== (item.license !== null)) fail();
    if (item.license !== null && (!['MIT', 'Apache-2.0'].includes(item.license) || item.licenseUrl !== `${item.url}/blob/${item.revision}/LICENSE`)) fail();
    if (item.license === null && item.licenseUrl !== null) fail();
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(item.submittedUrl)) fail();
    if (item.matchStatus === 'original_404_candidate') { if (item.submittedStatus !== 404 || item.submittedUrl === item.url) fail(); }
    else if (!['exact_public', 'case_normalized_public'].includes(item.matchStatus) || item.submittedStatus !== 200 || item.submittedUrl.toLowerCase() !== item.url.toLowerCase()) fail();
  }
  return data;
}

export async function readProjects() {
  return validateProjects(JSON.parse(await readFile(resolve(root, 'data/external-projects.json'), 'utf8')));
}

const words = {
  zh: { title: '开源与参考', market: 'Bot 市场', nav: '主导航', intro: '了解团队模板、任务网关、协作工具与独立运行平台。', boundary: '这些是外部项目资料，尚未适配为可安装的 OpenBot 模板或插件。', search: '搜索项目', placeholder: '搜索名称、作者、用途或许可证', all: '全部项目', licensed: '有开源许可', reference: '仅参考链接', kind: '收录范围', count: '个项目', checked: '核查日期', license: '许可证', unknown: '未找到许可证 · 仅链接参考', compatibility: 'OpenBot 适配', source: '查看项目', readme: '已核查 README', evidence: '来源核查', revision: '固定版本', reported: '原始线索', corrected: '原地址返回 404；按名称与用途找到此相关项目，未确认原地址重定向。', exact: '原地址已核实；仓库名称采用 GitHub 返回的大小写。', empty: '没有匹配的项目。试试其他关键词。', metadata: '项目索引 JSON', notes: '核查说明', toggle: 'English', footer: '保留作者、许可和来源；收录不代表安装或功能验收。' },
  en: { title: 'Projects & references', market: 'Bot marketplace', nav: 'Main navigation', intro: 'Explore team templates, gateways, collaboration tools and independent runtimes.', boundary: 'These are external references, without an installable OpenBot template or plugin adapter.', search: 'Search projects', placeholder: 'Search name, author, purpose or license', all: 'All projects', licensed: 'Open-source license', reference: 'Link reference only', kind: 'Listing scope', count: 'projects', checked: 'Checked', license: 'License', unknown: 'No license found · link reference only', compatibility: 'OpenBot compatibility', source: 'Open repository', readme: 'Reviewed README', evidence: 'Source review', revision: 'Pinned revision', reported: 'Original lead', corrected: 'The original URL returned 404. This related project was found by name and purpose; a redirect was not confirmed.', exact: 'The original URL was verified; repository casing follows GitHub metadata.', empty: 'No matching projects. Try another search.', metadata: 'Project index JSON', notes: 'Review notes', toggle: '中文', footer: 'Authors, licenses and sources retained. A listing does not certify installation or functionality.' }
};

export function renderProjects(data, locale, version) {
  const w = words[locale], en = locale === 'en';
  const cards = data.projects.map(item => {
    const license = item.license ? `<a href="${escape(item.licenseUrl)}" rel="noreferrer">${escape(item.license)}</a>` : escape(w.unknown);
    const search = [item.name, item.repository, ...Object.values(item.summary), ...categories[item.category], item.license || '', item.submittedUrl].join(' ').toLowerCase();
    return `<article class="project-row" id="${escape(item.id)}" data-project data-search="${escape(search)}" data-licensed="${item.openSource}">
      <div class="project-heading"><h2><a href="${escape(item.url)}" rel="noreferrer">${escape(item.name)}</a></h2><span>${escape(categories[item.category][en ? 1 : 0])}</span></div>
      <p class="project-repository">${escape(item.repository)}</p>
      <p class="project-summary">${escape(item.summary[locale])}</p>
      <p class="project-license">${w.license}: ${license}</p>
      <p class="project-compatibility"><strong>${w.compatibility}:</strong> ${escape(item.openbot.note[locale])}</p>
      <div class="project-links"><a href="${escape(item.url)}" rel="noreferrer">${w.source} ↗</a><a href="${escape(item.readmeUrl)}" rel="noreferrer">${w.readme}</a></div>
      <details><summary>${w.evidence}</summary><p>${w.checked}: ${item.checkedAt} · ${w.revision}: <a href="${escape(item.url)}/commit/${item.revision}">${item.revision.slice(0, 12)}</a></p><p>${w.reported}: <code>${escape(item.submittedUrl)}</code></p><p>${item.matchStatus === 'original_404_candidate' ? w.corrected : w.exact}</p></details>
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="${en ? 'en' : 'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${w.title} · Awesome Bot</title><meta name="description" content="${w.intro}"><link rel="stylesheet" href="./styles.css?v=${escape(version)}"><link rel="stylesheet" href="./resources.css?v=${escape(version)}"><link rel="alternate" type="application/json" href="./resources.json" title="External project index"></head>
<body class="resources-page"><a class="skip-link" href="#projects">${en ? 'Skip to projects' : '跳至项目'}</a>
<header class="site-header"><a class="brand" href="./${en ? '?lang=en' : ''}"><span class="brand-copy"><strong>Awesome Bot</strong></span></a><nav class="site-nav" aria-label="${w.nav}"><a href="./${en ? '?lang=en' : ''}">${w.market}</a><a href="./resources${en ? '.en' : ''}.html" aria-current="page">${w.title}</a><a href="./handbook${en ? '.en' : ''}.html">${en ? 'Handbook' : '使用手册'}</a><a href="https://github.com/Harzva/awesome-bot" rel="noreferrer">GitHub</a><a id="resource-language" href="./resources${en ? '' : '.en'}.html" lang="${en ? 'zh-CN' : 'en'}">${w.toggle}</a></nav></header>
<main class="resources-main" id="projects"><h1>${w.title}</h1><p class="resources-intro">${w.intro}</p><p class="resources-boundary">${w.boundary}</p>
<form class="resource-filters" role="search"><label>${w.search}<input id="resource-search" type="search" maxlength="240" placeholder="${w.placeholder}" autocomplete="off"></label><label>${w.kind}<select id="resource-scope"><option value="all">${w.all}</option><option value="true">${w.licensed}</option><option value="false">${w.reference}</option></select></label></form>
<p class="resource-count" id="resource-count" role="status" data-unit="${w.count}" data-total="${data.projects.length}">${data.projects.length} / ${data.projects.length} ${w.count}</p>
<div class="project-list">${cards}</div><p id="resource-empty" hidden>${w.empty}</p>
<footer class="resources-footer"><p>${w.checked}: ${data.checkedAt}. ${w.footer}</p><a href="./resources.json">${w.metadata}</a><a href="https://github.com/Harzva/awesome-bot/blob/main/sources/external-project-review-20261024.md">${w.notes}</a><a href="./resources${en ? '.en' : ''}.md">Markdown</a></footer></main><script src="./resources.js?v=${escape(version)}" defer></script></body></html>\n`;
}

export function projectMarkdown(data, locale) {
  const w = words[locale], en = locale === 'en';
  return [`# ${w.title}`, '', w.intro, '', w.boundary, '', `${w.checked}: ${data.checkedAt}`, '', ...data.projects.flatMap(p => [`## ${p.name}`, '', `- [${p.repository}](${p.url})`, `- ${p.summary[locale]}`, `- ${w.license}: ${p.license || w.unknown}`, `- ${w.compatibility}: ${p.openbot.note[locale]}`, `- [${w.readme}](${p.readmeUrl})`, ...(p.licenseUrl ? [`- [${w.license}](${p.licenseUrl})`] : []), `- ${w.revision}: ${p.revision}`, `- ${w.reported}: ${p.submittedUrl} (${p.submittedStatus})`, `- ${p.matchStatus === 'original_404_candidate' ? w.corrected : w.exact}`, '']), en ? 'Reading these references does not install software, execute scripts, connect accounts or grant permissions.' : '读取资料不会安装软件、执行脚本、连接账号或授予权限。', ''].join('\n');
}

export async function writeExternalProjects({ output, version }) {
  const data = await readProjects();
  await writeFile(resolve(output, 'resources.json'), `${JSON.stringify(data, null, 2)}\n`);
  for (const locale of ['zh', 'en']) {
    const filename = `resources${locale === 'en' ? '.en' : ''}`;
    await writeFile(resolve(output, filename + '.html'), renderProjects(data, locale, version));
    await writeFile(resolve(output, filename + '.md'), projectMarkdown(data, locale));
  }
}

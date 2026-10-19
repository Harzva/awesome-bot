// 覆盖率口径：状态格式声明数、引导层覆盖率。
//
// 为什么单独一份：这些数字原先有两份实现（`verify` 里一段循环、预览数据里一个函数），
// 两处各数一遍，迟早对不上；而一旦对不上，界面上那个数字就没人信了。
// 更实际的问题是——埋在 CLI 循环里的计数没法单测：真实目录里每个模板都声明了 state，
// 所以「把每个版本都记成已声明」这种改动在真实数据上是**等效变异**，测试永远咬不住。
// 抽出来之后可以喂一份假的混合目录，那个分支才可观测。
//
// 两个数字共用一条分母规则（**只算「结构上可能填满」的那部分**）：
// `state` 只算模板版本、引导层只算现行版本。两次都是同一个错误：分母里塞了
// 一件永远做不到的事，指标就成了永远差一点的数字，而永远差一点的数字没人看。
//
// 口径（这条是重点，不是实现细节）：
// **分母只算模板版本。** 组件包在格式层就不允许声明 `state`（`BUNDLE_TOP` 里没有这个键），
// 因为它自己不往实例里写东西 —— 写东西的是成员模板。把组件包算进分母，等于给作者派一件
// 结构上做不到的活，那个数字永远刷不满；而一个刷不满的指标，看两次之后就没人看了。
// 但也不能假装没有组件包：它们的版本数单独给，说明「由成员各自声明」。

import { compare } from './semver.mjs';

/**
 * @param {Array<{at?:string, kind?:string, state?:object|null}>} items 每个版本一条
 * @returns {{total:number, withState:number, missing:string[], bundles:number}}
 */
export function tallyStateCoverage(items) {
  const list = Array.isArray(items) ? items.filter((x) => x && typeof x === 'object') : [];
  const templates = list.filter((x) => x.kind === 'template');
  const missing = templates.filter((x) => !x.state).map((x) => (typeof x.at === 'string' ? x.at : 'unknown'));
  return {
    total: templates.length,
    withState: templates.length - missing.length,
    missing,
    // 组件包版本数：它们不声明，也不该被要求声明。
    bundles: list.length - templates.length
  };
}

/** 预览数据的入口：manifest 映射（`id@版本` → 已校验的 manifest）。 */
export function stateCoverageOfManifests(manifests) {
  const items = Object.entries(manifests && typeof manifests === 'object' ? manifests : {})
    .map(([at, m]) => ({ at, kind: m && m.kind, state: m && m.state }));
  return tallyStateCoverage(items);
}

// 引导层覆盖率：**分母只算现行版本**（同一个 id 里版本号最高的那一个）。
//
// 这是 state 那份分母规则的同一条道理，但踩了第二次：
// `openbot/code-reviewer@1.0.0` 是历史版本，按规则不再动（新版本已经覆盖它）。
// 把它算进分母，覆盖率就永远差一个 —— 差的那一个不是「还没补」，是「永远不会有」。
// 而一个永远差一个的数字，看两次之后就没人看了，真正该补的缺口也跟着没人看。
//
// 历史版本不能从视野里消失：它们单独给（`historicalTotal` / `historicalMissing`），
// 界面可以说「另有 1 个历史版本没写」，而不是把总数悄悄改小。
//
// 现行版本怎么定：同一个 id 内按 semver 取最高。版本号脏（比不出来）时不参与比较，
// 全都比不出来就取第一条 —— 宁可多算一个，也不要把该写的藏进「历史版本」。

/** 一个版本块里到底有没有引导层（三个字段任一非空）。 */
export function hasGuidanceBlock(manifest) {
  const g = manifest && manifest.guidance;
  if (!g || typeof g !== 'object') return false;
  const prompts = Array.isArray(g.quickPrompts) ? g.quickPrompts : [];
  const examples = Array.isArray(g.taskExamples) ? g.taskExamples : [];
  // 只有空白的 welcome 不算写了 —— 校验器本来就拒这种写法，这里对齐，
  // 免得「这版算不算有引导层」在两处有不同答案（一处说 `"  "` 是真的，一处说不是）。
  const welcome = typeof g.welcome === 'string' ? g.welcome.trim() : '';
  return !!(welcome || prompts.length || examples.length);
}

const atOf = (item) => (typeof item.at === 'string' ? item.at : 'unknown');

/** 同一个 id 的现行版本（版本号最高的那一条）。 */
function pickCurrentVersion(rows) {
  let best = rows[0];
  for (const row of rows.slice(1)) {
    const c = compare(String(row.version == null ? '' : row.version), String(best.version == null ? '' : best.version));
    if (c === null) continue; // 脏版本号不参与比较
    if (c > 0) best = row;
  }
  return best;
}

/**
 * @param {Array<{at?:string, id?:string, version?:string, hasGuidance?:boolean, translated?:boolean}>} items
 * @returns {{total:number, withGuidance:number, translated:number, missing:string[],
 *            historicalTotal:number, historicalMissing:string[]}}
 */
export function tallyGuidanceCoverage(items) {
  const list = Array.isArray(items) ? items.filter((x) => x && typeof x === 'object') : [];
  const byId = new Map();
  for (const item of list) {
    const id = typeof item.id === 'string' && item.id ? item.id : atOf(item);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(item);
  }
  const current = [];
  const historical = [];
  for (const rows of byId.values()) {
    const now = pickCurrentVersion(rows);
    current.push(now);
    for (const row of rows) if (row !== now) historical.push(row);
  }
  const lacking = (rows) => rows.filter((r) => !r.hasGuidance);
  const missing = lacking(current);
  return {
    total: current.length,
    withGuidance: current.length - missing.length,
    // 翻译只数现行版本：历史版本带翻译这件事，对今天要装的人没有意义。
    translated: current.filter((r) => r.hasGuidance && r.translated).length,
    missing: missing.map(atOf),
    // 指标到底数了哪几个版本要交出来：测试与界面要检查「它数的那些」，
    // 而不是自己再猜一遍哪些是现行版本（猜法一分叉，测试就不再盯着这个数字）。
    current: current.map(atOf),
    historicalTotal: historical.length,
    historicalMissing: lacking(historical).map(atOf)
  };
}

/** 预览数据的入口：manifest 映射（`id@版本` → 已校验的 manifest）。 */
export function guidanceCoverageOfManifests(manifests) {
  const items = Object.entries(manifests && typeof manifests === 'object' ? manifests : {})
    .map(([at, m]) => ({
      at,
      id: m && typeof m.id === 'string' ? m.id : at.split('@')[0],
      version: m && m.version,
      hasGuidance: hasGuidanceBlock(m),
      translated: !!(m && m.i18n && typeof m.i18n === 'object' && Object.keys(m.i18n).length)
    }));
  return tallyGuidanceCoverage(items);
}

// 目录装载：把「一份或多份源」读成一份可用的目录视图。
//
// 为什么单独一层：多源合并里有三个判断必须写在同一个地方，而 CLI 的入口逻辑没法单测。
//   1. 一份源属于哪一级 —— 由**签名能否用内置公钥验过**决定，不由源自己声明；
//   2. 每个版本该用哪份源的地址 / 公钥 / allowFile —— 否则 B 源的内容会按 A 源解析；
//   3. 有人拿官方 keyId 签名却验不过 —— 这是冒充，必须当场中止，不是「社区源」。
//
// 一份目录被替换整个包（连 keys 一起换）时，逐条内容的签名会全部验过 —— 因为验的是
// 攻击者自己的钥匙。所以「这份目录是不是官方的」只能由内置公钥回答，见 trust.mjs。
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateRegistry, mergeRegistries } from './registry.mjs';
import { loadCachedDocument } from './cache.mjs';
import { classifySource, registryTrust } from './trust.mjs';
import { signatureLifetime } from './lifetime.mjs';

// `https:` 是远端；`file:` 与普通路径都是本地。没有协议头的（/tmp/x.json）也是本地。
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** 带协议且不是 file: → 远端。用来决定「能不能读本机文件」。 */
export function isRemoteSpec(spec) {
  const text = String(spec || '');
  return SCHEME.test(text) && !/^file:/i.test(text);
}

function localPath(spec) {
  return /^file:/i.test(spec) ? fileURLToPath(spec) : resolve(spec);
}

/**
 * 读一份源。任何「读不到 / 不合格 / 冒充官方」都在这里抛，调用方不必逐层判断。
 * @param {string} spec 本地路径或 https 地址
 * @param {{pinned?:{keys:object,source:string|null}, fetchImpl?:Function, cache?:object}} opts
 *   cache: {dir, offline, maxAgeMs, now} —— 只对远端源生效；本地文件永远重读，
 *   因为「本机的文件」没有过期的概念，读它就是最新的。
 * @returns {Promise<object>} 可直接交给 mergeRegistries 的源描述
 */
export async function readSource(spec, { pinned = null, fetchImpl, cache = null, now = Date.now() } = {}) {
  const text = String(spec || '').trim();
  if (!text) throw new Error('空的目录源');

  let document;
  let url;
  let baseUrl;
  let allowFile;
  // 远端源才有的「这份目录是怎么来的」：network / cache / cache-revalidated
  let origin = null;

  if (isRemoteSpec(text)) {
    // 远端源只走 https：http 明文可以被中间人整份替换，那样连 integrity 都是攻击者写的。
    if (!/^https:/i.test(text)) throw new Error(`远端目录只接受 https 地址（收到 ${text}）`);
    // 缓存里只有「上一次取到的原始文档」。信任判断下面照旧重做一遍 ——
    // 缓存的文档可能是昨天验过的，但昨天那把钥匙今天可能已经作废了。
    const loaded = await loadCachedDocument({
      url: text,
      dir: (cache && cache.dir) || null,
      offline: !!(cache && cache.offline),
      maxAgeMs: (cache && cache.maxAgeMs) || 0,
      fetchImpl,
      ...(cache && cache.now !== undefined ? { now: cache.now } : {})
    });
    if (!loaded.ok) {
      const extra = loaded.notes && loaded.notes.length ? `\n  注：${loaded.notes.join('；')}` : '';
      throw new Error(`取不到目录 ${text}：${loaded.error}${extra}`);
    }
    document = loaded.document;
    origin = { from: loaded.from, stale: loaded.stale, ageMs: loaded.ageMs, notes: loaded.notes || [] };
    // 用**重定向之后**的地址算基准：相对路径要跟着实际位置走。
    // 用缓存时这个地址是当初取回时的地址（存在 meta 里），不会因为这次没联网就丢。
    url = loaded.url || text;
    try {
      baseUrl = new URL('.', url).toString();
    } catch {
      throw new Error(`目录地址无法解析：${url}`);
    }
    // 远端源永远不许把 url 指到 file:// —— 一份远程目录就能读本机任意文件。
    allowFile = false;
  } else {

    const file = localPath(text);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (err) {
      throw new Error(`读不到目录 ${file}：${err.code || err.message}`);
    }
    try {
      document = JSON.parse(raw);
    } catch {
      throw new Error(`目录不是合法 JSON：${file}`);
    }
    url = file;
    baseUrl = pathToFileURL(join(dirname(file), '/')).href;
    allowFile = true;
  }

  const checked = validateRegistry(document, url);
  if (!checked.ok) throw new Error(`目录不合格（${url}）：\n- ${checked.errors.join('\n- ')}`);

  // 信任级别：拿内置公钥验，不拿目录自己的 keys。
  const classification = classifySource(document, pinned);
  if (classification.claimedPinned && !classification.verified) {
    throw new Error(`源 ${url} 签名里用了内置公钥的 keyId（${classification.keyId}），但签名对不上：这是冒充官方，已中止\n`
      + '  真正的官方目录不会验不过内置公钥。如果官方确实换过 key，请更新本机的 keys/official.public.json（或 --pinned-key）。');
  }

  // 有效期与信任是两件事，而且**必须各算各的**：过期不等于验不过，验得过也不等于还作数。
  // 时间取 cache.now（测试与离线演练用它对齐时钟），否则取本机时间。
  // 每次都从原文重算：缓存里只有原文与取回时间，没有任何结论 —— 结论一存下来就会跟着变旧。
  const clock = cache && cache.now !== undefined ? cache.now : now;
  const lifetime = signatureLifetime(document, { now: clock });

  return {
    name: checked.value.name,
    url,
    baseUrl,
    allowFile,
    trust: classification.trust,
    verified: classification.verified,
    keyId: classification.keyId,
    reason: classification.reason,
    keys: checked.value.keys || {},
    registry: checked.value,
    document,
    classification,
    lifetime,
    // null = 本地源（不存在「这份从哪来」的问题）。信任结论不在里面：那是每轮重算的。
    origin
  };
}

/**
 * 装载并合并多份源。第一份是「主源」：它的地址/公钥是全局兜底，也是界面上展示的那一份。
 * @param {string[]} specs
 * @param {{pinned?:object, fetchImpl?:Function, cache?:object}} opts
 */
export async function loadCatalogue(specs, { pinned = null, fetchImpl, cache = null, now = Date.now() } = {}) {
  const list = (Array.isArray(specs) ? specs : [])
    .map((s) => String(s == null ? '' : s).trim())
    .filter(Boolean);
  if (list.length === 0) throw new Error('没有可读的目录源');

  const sources = [];
  for (const spec of list) {
    // 串行：源的顺序决定合并优先级，并行的完成顺序不能影响结果。
    sources.push(await readSource(spec, { pinned, fetchImpl, cache, now }));
  }

  const merged = mergeRegistries(sources);
  const primary = sources[0];

  // 只要有一份源用的是旧缓存，整次浏览就得带着这句话：
  // 「你现在看到的目录可能不是最新的，官方在此期间撤回的东西还拦不住」。
  // 不汇总到顶层，调用方（尤其界面）就只会看到「成功拿到目录」。
  const stale = sources.filter((s) => s.origin && s.origin.stale);
  const cacheNotes = [];
  for (const s of sources) {
    for (const note of (s.origin && s.origin.notes) || []) {
      const line = `${s.name}：${note}`;
      if (!cacheNotes.includes(line)) cacheNotes.push(line);
    }
  }

  return {
    entries: merged.entries,
    // 「某个社区源想给官方条目塞版本」这类事不能静默：调用方必须能打出来
    problems: merged.problems,
    // 只来自验过签名的源（见 mergeRegistries）。装载器拿它拒装被撤回的版本与发布者。
    revoked: merged.revoked,
    keys: primary.keys,
    name: primary.name,
    baseUrl: primary.baseUrl,
    allowFile: primary.allowFile,
    // 原始解析结果：验签要用它，不能用规范化视图
    document: primary.document,
    registrySignature: registryTrust(primary.document, pinned),
    // 离线/过期状态提到顶层：这两件事决定「要不要相信眼前这份目录是当下最新的」
    stale: stale.length > 0,
    cacheNotes,
    // 签名过期的源提到顶层（只放名字，结论本身在 sources[].lifetime 里）。
    // 与 stale 是两件事：stale 是「文件取回来多久了」，过期是「这份签名还能不能当依据」。
    // 两者可以同时为假：刚联网取回、内容和线上一致，而签名本身一个月前就到期了。
    expiredSources: sources.filter((s) => s.lifetime && (s.lifetime.state === 'expired' || s.lifetime.state === 'future'))
      .map((s) => ({ name: s.name, state: s.lifetime.state, expiresAt: s.lifetime.expiresAt, overdueDays: s.lifetime.overdueDays })),
    expiringSources: sources.filter((s) => s.lifetime && s.lifetime.state === 'expiring')
      .map((s) => ({ name: s.name, expiresAt: s.lifetime.expiresAt, daysLeft: s.lifetime.daysLeft })),
    sources: sources.map((s) => ({
      name: s.name,
      url: s.url,
      baseUrl: s.baseUrl,
      allowFile: s.allowFile,
      trust: s.trust,
      verified: s.verified,
      keyId: s.keyId,
      reason: s.reason,
      entries: s.registry.entries.length,
      from: s.origin ? s.origin.from : 'local',
      stale: s.origin ? s.origin.stale : false,
      ageMs: s.origin ? s.origin.ageMs : null,
      lifetime: s.lifetime || null
    }))
  };
}

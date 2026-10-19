// 目录与内容的本地缓存。
//
// 为什么需要：市场页每次打开都要取目录，联网失败就什么都看不到。所以要把上一次取到的
// 文档留在本机，离线时还能浏览。但这件事有个非常容易做错的地方：
//
//   **缓存只存「原始文档 + 取回时间」，绝不存「验过了」这个结论。**
//
// 信任判断必须每次重做：内置公钥可能在两次启动之间被改过（轮换）、某把钥匙可能被拉黑、
// 目录里的撤回名单可能更新了。如果缓存里写着「ok: true」，昨天验过的文档今天会带着
// 昨天的结论继续用 —— 钥匙作废之后它还能装上，而且没有任何一处会重新问一句。
//
// 第二条：过期 ≠ 不能用。取不到网络时用旧缓存是可以的（总比什么都看不到好），
// 但必须标成 stale 并把年龄说出来，还要明说「这期间官方的撤回可能还没生效」。
// 悄悄用旧缓存，比报错更危险 —— 用户会以为看到的是最新的市场。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchJson } from './sources.mjs';

export const CACHE_SCHEMA = 'openbot.market.cache/1';

/** 缓存文件名由 URL 决定：同一个地址永远落到同一个文件，不同源不会互相覆盖。 */
export function cacheKey(url) {
  return createHash('sha256').update(String(url)).digest('hex').slice(0, 16);
}

export function describeAge(ms) {
  // null 是「不知道」，不是 0。`Number(null)` 恰好等于 0，会把它说成「0 秒前」＝刚刚，
  // 那就把「没有这个信息」翻译成了一句具体的谎话。
  if (ms === null || ms === undefined || ms === '') return '未知时长';
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return '未知时长';
  if (n < 60_000) return `${Math.floor(n / 1000)} 秒`;
  if (n < 3_600_000) return `${Math.floor(n / 60_000)} 分钟`;
  if (n < 86_400_000) return `${Math.floor(n / 3_600_000)} 小时`;
  return `${Math.floor(n / 86_400_000)} 天`;
}

/**
 * 「多久以前」的说法。
 * 「0 秒前取到的缓存」既啰嗦又像在报警 —— 它就是刚刚。所以 10 秒以内单独说「刚刚」。
 */
export function describeAgo(ms) {
  if (ms === null || ms === undefined || ms === '') return '更早';
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return '更早';
  if (n < 10_000) return '刚刚';
  return `${describeAge(n)}前`;
}

/**
 * 「多久算新鲜」的时长。
 * 纯数字按**秒**算 —— 写 `--max-age=300` 想说 5 分钟的人，比想说 300 毫秒的人多得多；
 * 真要毫秒就显式写 `300ms`。宁可定一条明说过的规矩，也不要按上下文猜。
 */
export function parseDuration(text) {
  const raw = String(text == null ? '' : text).trim();
  const m = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i.exec(raw);
  if (!m) throw new Error(`看不懂的时长：${raw}（用 30s / 10m / 2h / 1d，纯数字按秒算）`);
  const scale = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[((m[2] || 's')).toLowerCase()];
  return Math.round(Number(m[1]) * scale);
}

/**
 * 读缓存。
 * @returns {Promise<{document:object, meta:object}|{corrupt:true}|null>}
 *   文件不存在 → null；坏了 → {corrupt:true}（调用方要说出来，不能假装没缓存也没坏）
 */
export async function readCachedDocument(dir, key) {
  if (!dir) return null;
  let raw;
  try {
    raw = await readFile(join(dir, `${key}.json`), 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schema !== CACHE_SCHEMA || !parsed.document || !parsed.meta) return { corrupt: true };
    return { document: parsed.document, meta: parsed.meta };
  } catch {
    return { corrupt: true };
  }
}

export async function writeCachedDocument(dir, key, { url, document, fetchedAt, etag = null }) {
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  const payload = {
    schema: CACHE_SCHEMA,
    // meta 只放「从哪来、什么时候取的、etag 是什么」。不要在这里写任何信任结论。
    meta: { url, fetchedAt, etag },
    document
  };
  await writeFile(join(dir, `${key}.json`), JSON.stringify(payload, null, 2) + '\n');
}

// ---------- 内容缓存（模板 / 组件包本身） ----------
//
// 和目录缓存不是一件事：目录决定「有哪些东西」，内容决定「那东西长什么样」。
// 后者有一个前者的**没有**的锚 —— 目录里写着这个版本的摘要。所以内容缓存必须
// 按「id@版本 + 目录登记的摘要」定位，并且**每次读都重算摘要**。
//
// 绝不能相信缓存文件里记的 integrity：那只是上次算出来的数字，能写缓存文件的人
// 也能把它一起改掉。缓存可以省流量，不能省校验 —— 省掉校验的缓存等于「本机文件
// 说了算」，而本机文件是任何人都能改的。
export const CONTENT_SCHEMA = 'openbot.market.content/1';

/**
 * 内容缓存的键：同一 id@版本在不同目录里登记了不同摘要时，两份内容各自成条，
 * 不会互相覆盖（那正是「同版本号不同摘要」这种要报 problems 的情况）。
 */
export function contentCacheKey(id, version, integrity) {
  return createHash('sha256').update(`${id}@${version}#${integrity || ''}`).digest('hex').slice(0, 16);
}

/** @returns {Promise<{document:object, meta:object}|{corrupt:true}|null>} */
export async function readCachedContent(dir, key) {
  if (!dir) return null;
  let raw;
  try {
    raw = await readFile(join(dir, 'content', `${key}.json`), 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schema !== CONTENT_SCHEMA || !parsed.document || !parsed.meta) return { corrupt: true };
    return { document: parsed.document, meta: parsed.meta };
  } catch {
    return { corrupt: true };
  }
}

export async function writeCachedContent(dir, key, { id, version, integrity, url, document, fetchedAt }) {
  if (!dir) return;
  const target = join(dir, 'content');
  await mkdir(target, { recursive: true });
  const payload = {
    schema: CONTENT_SCHEMA,
    // 同样只记事实：是哪个版本、目录说它该是什么摘要、从哪取的、什么时候。
    meta: { id, version, integrity, url, fetchedAt },
    document
  };
  await writeFile(join(target, `${key}.json`), JSON.stringify(payload, null, 2) + '\n');
}

/**
 * 取一份文档，能缓存就缓存。
 *
 * @param {object} input
 *   url        要取的地址
 *   dir        缓存目录（null = 不缓存）
 *   maxAgeMs   多久之内不再联网（0 = 每次都联网确认）
 *   offline    只用缓存，不发任何请求
 *   fetchImpl  注入的 fetch（测试用）
 *   now        当前时间（测试用）
 * @returns {Promise<{ok:true, document, url, from:'network'|'cache'|'cache-revalidated',
 *                    ageMs:number|null, stale:boolean, notes:string[]} | {ok:false, error:string, notes:string[]}>}
 */
export async function loadCachedDocument({
  url,
  dir = null,
  maxAgeMs = 0,
  offline = false,
  fetchImpl,
  now = Date.now()
} = {}) {
  const key = cacheKey(url);
  const cached = await readCachedDocument(dir, key);
  const notes = [];
  if (cached && cached.corrupt) notes.push('缓存文件读不出来，已按「没有缓存」处理');
  const have = cached && cached.document ? cached : null;
  const ageMs = have ? Math.max(0, now - Number(have.meta.fetchedAt || 0)) : null;

  if (offline) {
    if (!have) return { ok: false, error: `离线模式，但本机没有 ${url} 的缓存`, notes };
    return {
      ok: true, document: have.document, url, from: 'cache', ageMs, stale: true,
      notes: [...notes, `离线模式：用的是${describeAgo(ageMs)}取到的缓存，这期间官方的撤回可能还没生效`]
    };
  }

  // 还在新鲜期内：不联网。这就是「每次打开都联网不可接受」的解法。
  if (have && maxAgeMs > 0 && ageMs < maxAgeMs) {
    return { ok: true, document: have.document, url, from: 'cache', ageMs, stale: false, notes };
  }

  // 有条件请求：内容没变就 304，省流量也不改缓存里的文档
  const conditional = have && have.meta.etag ? { 'if-none-match': have.meta.etag } : {};
  const fetched = await fetchJson(url, {
    fetchImpl, maxBytes: 1024 * 1024, headers: conditional
  });

  if (fetched.ok && fetched.notModified && have) {
    await writeCachedDocument(dir, key, {
      url: fetched.url || url, document: have.document, fetchedAt: now, etag: have.meta.etag
    });
    return {
      ok: true, document: have.document, url: fetched.url || url, from: 'cache-revalidated', ageMs: 0, stale: false, notes
    };
  }
  // 「没变」只有在「手上有东西可对」时才成立。没有旧副本还回 304（缓存目录被清过、
  // 或服务端配错了），不能把 null 当成文档交出去 —— 那会让上层在“拿到了”的假象里
  // 继续往下走，最后报成「目录不合格」，把线索指向完全错误的地方。
  if (fetched.ok && fetched.notModified) {
    return { ok: false, error: `${url} 返回「内容未变」，但本机没有它的旧副本（缓存被清过或服务端配置有误）`, notes };
  }
  if (fetched.ok) {
    await writeCachedDocument(dir, key, {
      url: fetched.url || url, document: fetched.value, fetchedAt: now, etag: fetched.etag || null
    });
    return { ok: true, document: fetched.value, url: fetched.url || url, from: 'network', ageMs: 0, stale: false, notes };
  }

  // 网络挂了但有缓存：可以用，必须标 stale 并说清代价
  if (have) {
    return {
      ok: true, document: have.document, url, from: 'cache', ageMs, stale: true,
      notes: [...notes, `取不到 ${url}（${fetched.error}），用的是${describeAgo(ageMs)}取到的缓存；这期间官方的撤回可能还没生效`]
    };
  }
  return { ok: false, error: fetched.error, notes };
}

// 取内容：目录、模板、组件包。所有网络访问都从这里过，便于一齐加限制。
//
// 限制不是形式主义：市场里的东西会变成 bot 的人设，而人设是 prompt 注入面。
// 所以「从哪来、有没有被改过、有多大」三件事必须在装载时定死：
//   - 只走 https（file: 仅在显式 allowFile 时允许，用于本地目录与测试）；
//   - 有超时、有体积上限，避免一个坏地址把应用挂住或吃满内存；
//   - 有 integrity 就必须匹配，不匹配直接拒绝，不给「先装上再说」的选项。
import { join } from 'node:path';
import { integrityOf, validateManifest } from './manifest.mjs';
import { verifyJson, describeSignatureCheck } from './sign.mjs';
// 与 cache.mjs 互相 import（那边用 fetchJson 取目录）。安全的原因：两边都只在函数体里
// 引用对方的导出，模块顶层谁也不读谁 —— 所以求值顺序不影响任何东西。
import { contentCacheKey, readCachedContent, writeCachedContent } from './cache.mjs';

const DEFAULT_LIMITS = { timeoutMs: 8000, registryBytes: 1024 * 1024, manifestBytes: 256 * 1024 };

export class FetchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FetchError';
  }
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * 读一段文本。
 * @param {object} options headers 走条件请求（if-none-match）；返回 notModified 表示 304
 * @returns {Promise<{ok:boolean, notModified:boolean, text:string, error:string, url:string, etag:string|null}>}
 */
export async function fetchText(url, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, notModified: false, text: '', error: `地址不合法：${url}`, url, etag: null };
  }

  if (parsed.protocol === 'file:') {
    if (options.allowFile !== true) return { ok: false, notModified: false, text: '', error: '不允许读取本地文件（只有本地目录模式可以）', url, etag: null };
    try {
      const { readFile } = await import('node:fs/promises');
      const buf = await readFile(parsed, 'utf8');
      const limit = options.maxBytes || limits.manifestBytes;
      if (buf.length > limit) return { ok: false, notModified: false, text: '', error: `文件超过 ${limit} 字节上限`, url, etag: null };
      return { ok: true, notModified: false, text: buf, error: '', url, etag: null };
    } catch (err) {
      return { ok: false, notModified: false, text: '', error: `读不到 ${url}：${err.code || err.message}`, url, etag: null };
    }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, notModified: false, text: '', error: `只接受 https 地址（收到 ${parsed.protocol}）`, url, etag: null };
  }
  if (typeof fetchImpl !== 'function') {
    return { ok: false, notModified: false, text: '', error: '当前环境没有 fetch', url, etag: null };
  }

  const limit = options.maxBytes || limits.manifestBytes;
  const { signal, done } = withTimeout(options.timeoutMs || limits.timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal,
      redirect: 'follow',
      headers: {
        accept: 'application/json, text/plain;q=0.9',
        'user-agent': 'OpenBot-Market/1',
        ...(options.headers || {})
      }
    });
    const etag = res.headers && res.headers.get ? res.headers.get('etag') : null;
    // 304 不走 res.ok：它是「没变」，不是「失败」。缓存层要用这个信号刷新取回时间。
    if (res.status === 304) {
      return { ok: true, notModified: true, text: '', error: '', url: res.url || url, etag };
    }
    if (!res.ok) return { ok: false, notModified: false, text: '', error: `HTTP ${res.status}`, url, etag };
    // 重定向后仍要确认协议：不能从 https 被带去 http。
    if (res.url && !String(res.url).startsWith('https:') && !String(res.url).startsWith('file:')) {
      return { ok: false, notModified: false, text: '', error: '重定向到了非 https 地址', url, etag };
    }
    const declared = Number(res.headers && res.headers.get ? res.headers.get('content-length') : 0);
    if (declared && declared > limit) return { ok: false, notModified: false, text: '', error: `内容超过 ${limit} 字节上限`, url, etag };
    const text = await res.text();
    if (text.length > limit) return { ok: false, notModified: false, text: '', error: `内容超过 ${limit} 字节上限`, url, etag };
    return { ok: true, notModified: false, text, error: '', url: res.url || url, etag };
  } catch (err) {
    const reason = err && err.name === 'AbortError' ? '请求超时' : (err && err.message) || '请求失败';
    return { ok: false, notModified: false, text: '', error: reason, url, etag: null };
  } finally {
    done();
  }
}

export async function fetchJson(url, options = {}) {
  const res = await fetchText(url, options);
  if (res.notModified) return { ok: true, notModified: true, value: null, error: '', url: res.url, etag: res.etag };
  if (!res.ok) return { ok: false, notModified: false, value: null, error: res.error, url: res.url };
  try {
    return { ok: true, notModified: false, value: JSON.parse(res.text), error: '', url: res.url, etag: res.etag };
  } catch {
    return { ok: false, notModified: false, value: null, error: '不是合法的 JSON', url: res.url };
  }
}

/**
 * 造一个 loadManifest：按 id + version 找到目录里的地址，取回、验摘要、校验格式。
 * 摘要不匹配是最严重的一种失败，错误文案要说明「内容与目录登记的不一致」，
 * 不要只说「校验失败」让用户以为是格式问题。
 *
 * 内容缓存（input.cache = {dir, offline}）：能省一次下载，也能让离线装已缓存的东西。
 * 但它**不省校验** —— 读缓存时重新算摘要、重新验签名，缓存文件里记的摘要只当线索，
 * 不当结论。能写缓存文件的人也能改那个字段。
 */
export function createLoader(input) {
  const entries = Array.isArray(input && input.entries) ? input.entries : [];
  const baseUrl = (input && input.baseUrl) || '';
  const fetchImpl = input && input.fetchImpl;
  const allowFile = !!(input && input.allowFile);
  const limits = input && input.limits;
  // keyId → PEM，来自目录顶层 keys。没有 key 的条目只能按「未签名」处理。
  const keys = (input && input.keys) || {};
  const requireSignature = !!(input && input.requireSignature);
  // 撤回名单：目录（验过签名的那份）说「这个版本别再装」「这把发布者钥匙作废」。
  const revoked = input && input.revoked;
  const revokedVersions = new Set((revoked && revoked.versions) || []);
  const revokedKeyIds = new Set((revoked && revoked.keyIds) || []);
  // 内容缓存目录与离线开关
  const cacheDir = (input && input.cache && input.cache.dir) || null;
  const offline = !!(input && input.cache && input.cache.offline);
  // now 既收函数也收数字：目录缓存那边传的是数字（一次取一个时间点），
  // 这里如果只认函数，照抄参数形状的调用方会拿到「now is not a function」。
  const nowInput = input && input.cache ? input.cache.now : undefined;
  const now = typeof nowInput === 'function' ? nowInput
    : () => (typeof nowInput === 'number' ? nowInput : Date.now());
  const cache = new Map();

  return async function loadManifest(id, version) {
    const key = `${id}@${version}`;
    if (cache.has(key)) return cache.get(key);

    // 撤回先于取内容：被撤回的东西连下载都不该发生（下载本身会把内容写进缓存/日志）。
    // reason 单独给一个 'revoked'：调用方要能把「撤回」和「内容坏了」分开说 ——
    // 被撤回的内容往往完全正常，只是不该再被装。
    if (revokedVersions.has(key)) {
      const out = { ok: false, reason: 'revoked', errors: [`${id}@${version} 已被目录撤回（下架），不再提供安装`] };
      cache.set(key, out);
      return out;
    }

    const entry = entries.find((e) => e.id === id);
    if (!entry) return { ok: false, errors: [`目录里没有 ${id}`] };
    const pinned = (entry.versions || []).find((v) => v.version === version);
    if (!pinned) return { ok: false, errors: [`${id} 没有版本 ${version}`] };

    // 发布者钥匙被撤回：内容本身没被改，但签发它的钥匙不算数了。
    // 按版本记的 signer 判，不是条目级 keyId：轮换后同一 id 的旧版本还是旧钥匙签的，
    // 只看条目级会把「旧钥匙已作废」漏成「新钥匙没作废」。
    const signerKeyId = (pinned.signer || (entry.publisher && entry.publisher.keyId) || '').trim();
    if (signerKeyId && revokedKeyIds.has(signerKeyId)) {
      const out = { ok: false, reason: 'revoked', errors: [`${id}@${version} 的发布者钥匙 ${signerKeyId} 已被目录撤回`] };
      cache.set(key, out);
      return out;
    }

    // 多源合并时每个版本自带「它那份源的 baseUrl / allowFile」。
    // 只用一个全局 baseUrl 会把 B 源的模板拼到 A 源域名下；只用一个全局 allowFile
    // 则等于允许一份远端目录把 url 指到 file:// —— 那能读本机任意文件。
    const base = pinned.sourceBase || baseUrl;
    const fileOk = typeof pinned.sourceAllowFile === 'boolean' ? pinned.sourceAllowFile : allowFile;

    let url = pinned.url;
    try {
      url = new URL(pinned.url, base || undefined).toString();
    } catch {
      return { ok: false, errors: [`${id}@${version} 的地址无法解析：${pinned.url}`] };
    }

    // ① 先看内容缓存。只用「能按目录登记的摘要复核过」的那份：
    //    缓存文件里记的 integrity 只当线索 —— 能写这个文件的人也能顺手改那个字段。
    const declared = pinned.integrity || '';
    const contentKey = contentCacheKey(id, version, declared);
    let document = null;
    let fromCache = false;
    let cacheRejected = false;
    if (cacheDir && declared) {
      const cached = await readCachedContent(cacheDir, contentKey);
      if (cached && cached.document) {
        if ((await integrityOf(cached.document)) === declared) {
          document = cached.document;
          fromCache = true;
        } else {
          // 摘要对不上：文件被改过或坏了。当作没有，但要说出来（别让「缓存命中」
          // 这种说法掩盖「本机那份是坏的」）。
          cacheRejected = true;
        }
      }
    }

    // ② 缓存里没有（或对不上）才去取。离线时这里就是终点 —— 明确说缺哪个版本。
    if (!document) {
      if (offline) {
        const why = cacheRejected
          ? `本机缓存的 ${id}@${version} 与目录登记的摘要不一致（缓存被改动或损坏），已拒绝使用`
          : `本机没有 ${id}@${version} 的内容缓存`;
        const out = { ok: false, reason: 'offline-miss', errors: [`离线模式：${why}。先联网装一次，或去掉 --offline`] };
        cache.set(key, out);
        return out;
      }
      const fetched = await fetchJson(url, { fetchImpl, allowFile: fileOk, limits });
      if (!fetched.ok) {
        const out = { ok: false, errors: [`取不到 ${id}@${version}：${fetched.error}`] };
        cache.set(key, out);
        return out;
      }
      // 摘要先于格式：内容被动过就不要再往下走，免得把恶意人设当「格式错误」放过。
      const actual = await integrityOf(fetched.value);
      if (declared && actual !== declared) {
        const out = { ok: false, errors: [`${id}@${version} 的内容与目录登记不一致（摘要不匹配），已拒绝安装`] };
        cache.set(key, out);
        return out;
      }
      document = fetched.value;
    }

    // 签名在摘要之后：摘要回答「是不是目录里那份」，签名回答「是谁签的、签发后有没有改过」。
    // 两者都不能互相替代 —— 摘要只能证明你没改，证明不了内容本来是好的。
    // 缓存命中也一样要验：缓存省的是流量，不是校验。
    // 公钥也按版本取：合了多个源之后，B 源的内容只能用 B 源登记的公钥验，
    // 拿 A 源的公钥去验会得到「签名不通过」—— 那是误报，会让人以为内容被篡改。
    const keysOf = pinned.sourceKeys || keys;
    // 签名者优先按版本记的 signer 取：换钥匙后同一 id 的旧版本仍是旧钥匙签的，
    // 一律用条目级 keyId 去验，会让所有历史版本在轮换那天突然「签名为假」。
    const publicKey = signerKeyId ? keysOf[signerKeyId] : null;
    if (publicKey) {
      const checked = verifyJson(document, publicKey);
      if (!checked.ok) {
        const out = { ok: false, errors: [`${id}@${version} 的签名不通过：${describeSignatureCheck(checked)}`] };
        cache.set(key, out);
        return out;
      }
    } else if (requireSignature) {
      const out = { ok: false, errors: [`${id}@${version} 没有可验证的签名（目录未登记发布者公钥），已拒绝安装`] };
      cache.set(key, out);
      return out;
    }

    const checked = validateManifest(document, `${id}@${version}`);
    const out = checked.ok ? checked.value : { ok: false, errors: checked.errors };
    // 只有全过（摘要、签名、格式）才落缓存：别把「验不过的东西」存成「下次直接用」。
    // 注意判断用 checked.ok —— 成功时 out 是清单对象本身，它没有 ok 字段，
    // 写成 out.ok 会让这段永远不执行（缓存静默失效，而所有断言照样绿）。
    // 写失败不影响这次安装 —— 缓存是优化，不是前提。
    if (checked.ok && cacheDir && declared && !fromCache) {
      try {
        await writeCachedContent(cacheDir, contentKey, {
          id, version, integrity: declared, url, document, fetchedAt: now()
        });
      } catch {
        /* 磁盘满 / 只读：这次照装，下次再取 */
      }
    }
    cache.set(key, out);
    return out;
  };
}

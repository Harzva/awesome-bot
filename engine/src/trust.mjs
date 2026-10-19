// 「这份目录可不可信」的判断。抽出来是因为它决定 plan/install/upgrade 要不要继续，
// 而这几个命令的入口逻辑（读参数、打日志）没法单测 —— 判断本身必须能单独测。
//
// 三件事必须分开：
//   - 没有内置公钥（no-pinned-key）：不知道官方钥匙是什么，属于「没条件验」；
//   - 验了但不通过（key-mismatch / bad-signature / no-signature）：条件齐备而结果是否，
//     属于「这不是官方的目录」；
//   - 这把钥匙被本机拉黑（revoked-key）：不是「验不过」，是我们**知道它不该再被信**。
// 第一种可以靠 --allow-unpinned 显式承担风险，后两种不行：那等于把「被冒充」和
// 「钥匙泄漏了还继续用」都做成可选项。
import { readFile } from 'node:fs/promises';
import { keyIdOf, verifyAgainstKeys } from './sign.mjs';
import { describeLifetime } from './lifetime.mjs';

const asList = (v) => (Array.isArray(v) ? v : []).map((x) => String(x == null ? '' : x).trim()).filter(Boolean);
export const toRevokedSet = (v) => new Set(asList(v));

/**
 * 解析内置公钥表。两种格式都收：
 *   单把（老格式）：{alg, keyId, publicKey}
 *   多把 + 本地吊销：{keys: {keyId: PEM}, revoked: [keyId]}
 * 轮换期新旧两把必须同时在表里（旧签发、新签发的内容客户端都要能验），
 * 已经把旧钥匙作废的客户端则把它写进 revoked —— 两者是不同的意思。
 * @returns {{keys:Record<string,string>, revoked:Set<string>, source:string|null}}
 */
export async function resolvePinnedKeys({ explicitPath = null, defaultPath = null } = {}) {
  const path = explicitPath || defaultPath;
  if (!path) return { keys: {}, revoked: new Set(), source: null };
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    if (explicitPath) throw new Error(`读不到内置公钥：${path}`);
    return { keys: {}, revoked: new Set(), source: null };
  }
  const text = raw.trim();
  if (text.startsWith('{')) {
    const parsed = JSON.parse(text);
    const revoked = toRevokedSet(parsed.revoked);
    // 多把钥匙的格式：每把都要能被算出同名 keyId，乱填等于「换 key 保留 id」
    if (!parsed.keyId && parsed.keys && typeof parsed.keys === 'object') {
      const keys = {};
      for (const [keyId, pem] of Object.entries(parsed.keys)) {
        const actual = keyIdOf(pem);
        if (!actual) throw new Error(`${path}.keys["${keyId}"]：公钥解析失败`);
        if (actual !== keyId) throw new Error(`${path}.keys["${keyId}"]：与公钥算出的 ${actual} 不一致`);
        keys[keyId] = pem;
      }
      if (Object.keys(keys).length === 0) throw new Error(`${path}.keys：一把公钥都没有`);
      return { keys, revoked, source: path };
    }
    if (!parsed.keyId || !parsed.publicKey) throw new Error(`${path} 里没有 keyId / publicKey`);
    return { keys: { [parsed.keyId]: parsed.publicKey }, revoked, source: path };
  }
  const keyId = keyIdOf(text);
  if (!keyId) throw new Error(`${path} 不是可用的 PEM 公钥`);
  return { keys: { [keyId]: text }, revoked: new Set(), source: path };
}

/**
 * @param {object} document 目录的**原始解析结果**（不是规范化视图）
 * @returns {{ok:boolean, keyId:string|null, reason:string|null, pinnedFrom:string|null}}
 */
export function registryTrust(document, pinned) {
  const keys = (pinned && pinned.keys) || {};
  const revoked = (pinned && pinned.revoked) || new Set();
  const sig = document && document.signature;
  // 拉黑先于验签：钥匙还在表里（轮换期常事），但它已经不该被信了。
  if (sig && sig.keyId && revoked.has(sig.keyId)) {
    return { ok: false, keyId: sig.keyId, reason: 'revoked-key', pinnedFrom: (pinned && pinned.source) || null };
  }
  if (Object.keys(keys).length === 0) {
    return { ok: false, keyId: null, reason: 'no-pinned-key', pinnedFrom: null };
  }
  return { ...verifyAgainstKeys(document, keys), pinnedFrom: (pinned && pinned.source) || null };
}

/** 只有「没条件验」才允许用 --allow-unpinned 兜过去。 */
export function canOverride(reason) {
  return reason === 'no-pinned-key';
}

/**
 * 一个源属于哪一级，**由签名能否用内置公钥验过决定，不由它自己声明**。
 * 不用「--source 里写个 official 就算官方」那种约定：目录的信任级别不能是它自己的一个字段。
 * @returns {{trust:'official'|'community', verified:boolean, signed:boolean, keyId:string|null,
 *            reason:string|null, claimedPinned:boolean}}
 *   claimedPinned=true（签名里写的 keyId 正是我们内置的那把）却没验过 = 有人冒充官方内容，调用方应当中止。
 */
export function classifySource(document, pinned) {
  const keys = (pinned && pinned.keys) || {};
  const revoked = (pinned && pinned.revoked) || new Set();
  const hasPin = Object.keys(keys).length > 0;
  const sig = document && document.signature;
  const signed = !!(sig && typeof sig.value === 'string');
  const claimedPinned = !!(signed && keys[sig.keyId]);

  // 拉黑先于一切：这把钥匙还在表里、签名也算得对，但我们不该再信它。
  // 不报成 key-mismatch —— 那会让人以为「换过 key」，而实际是「这把 key 出事了」。
  if (signed && sig.keyId && revoked.has(sig.keyId)) {
    return { trust: 'community', verified: false, signed, keyId: sig.keyId, reason: 'revoked-key', claimedPinned: false };
  }

  if (!hasPin) return { trust: 'community', verified: false, signed, keyId: sig ? sig.keyId : null, reason: 'no-pinned-key', claimedPinned: false };
  const res = verifyAgainstKeys(document, keys);
  if (res.ok) return { trust: 'official', verified: true, signed, keyId: res.keyId, reason: null, claimedPinned };
  // 有签名但对不上：可能是别人签的（正常社区源），也可能是有人拿官方 keyId 冒充（要中止）
  return { trust: 'community', verified: false, signed, keyId: res.keyId, reason: res.reason, claimedPinned };
}

/**
 * 会改动本机状态的命令必须过这一关。
 * @returns {{overridden:boolean}} overridden=true 表示用户显式承担了「没验」的风险
 */
export function assertRegistryTrusted(trust, { allowUnpinned = false, command = '这个操作' } = {}) {
  if (trust.ok) return { overridden: false };
  if (trust.reason === 'revoked-key') {
    // 拉黑是我们自己的决定，不是「验不过」。所以这里不给任何旗子：
    // 要重新信任一把已作废的钥匙，得改本机的公钥表，那是个有记录的动作。
    throw new Error(`这份目录用的钥匙已被本机拉黑（${trust.keyId}），${command} 中止\n`
      + '  拉黑表示「这把钥匙出过事」，不是「验不过」也不是「没条件验」，所以没有旗子能绕过。\n'
      + '  确实要恢复信任：把该 keyId 从内置公钥表的 revoked 里删掉，并说明为什么。');
  }
  if (allowUnpinned && canOverride(trust.reason)) return { overridden: true };
  if (allowUnpinned) {
    throw new Error(`目录验签没通过（${trust.reason}），--allow-unpinned 不能绕过这一条\n`
      + '  --allow-unpinned 只用于「本机没有内置公钥」的情况；验过但不通过，说明这份目录不是官方发的。\n'
      + `  ${command} 已中止。`);
  }
  throw new Error(`目录签名未验证（${trust.reason}），${command} 中止\n`
    + '  这决定了「这个 id 到底是谁发的」，不能由内容自己声明。\n'
    + '  本地目录：确认 market/keys/official.public.json 存在，或加 --pinned-key=<公钥文件>；\n'
    + '  自建源/调试：加 --allow-unpinned（只在确实没有内置公钥时生效）。');
}

/**
 * 装**这一个 id** 之前的闸门。
 *
 * 为什么按条目而不是按「整份目录」判断：多源合并之后不存在「整份目录可不可信」这件事了 ——
 * 官方目录 + 两份社区源合在一起看，那个问题是没法回答的。真正要回答的是
 * 「我要装的这个东西，是哪个源给的，那个源的签名验过没有」。
 *
 * @param {object|null} entry 合并后的条目（带 sources[] 与 trust）
 * @returns {{ok:boolean, reason?:string, warning?:string, message?:string}}
 */
export function gateEntry(entry, { allowCommunity = false, allowUnpinned = false, allowExpired = false } = {}) {
  // 条目不存在不在这里报：「目录里没有 X」是 plan 的错，先说成「不可信」会误导。
  if (!entry) return { ok: true, warning: null };

  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  const where = sources.map((s) => s.name).filter(Boolean).join('、') || '未知来源';

  // 「来源是谁」与「这份签名还作不作数」是两把尺子，所以先各算各的，最后合起来报。
  // 顺序上先判来源：一个来路不明的内容，它的有效期是多久并不改变结论。
  const trust = gateTrust(sources, where, entry, { allowCommunity, allowUnpinned });
  const life = gateLifetime(sources, entry, { allowExpired, command: '这次安装' });
  if (!life.ok) return life;
  if (!trust.ok) return trust;
  const warn = [trust.warning, life.warning].filter(Boolean).join('\n');
  return { ok: true, warning: warn || null };
}

/** 来源这一关：只回答「这个 id 是谁发的、验过没有」。 */
function gateTrust(sources, where, entry, { allowCommunity, allowUnpinned }) {
  const signedSources = sources;
  if (entry.trust === 'official') return { ok: true, warning: null };

  // 来源用的钥匙被拉黑：这不是「别人的源」，是「知道出过事的钥匙」。
  // --allow-community 的意思是「我要用别人签的内容」，不是「我要用泄漏的钥匙」，所以它也兜不住。
  if (signedSources.some((s) => s.reason === 'revoked-key')) {
    const dead = signedSources.filter((s) => s.reason === 'revoked-key').map((s) => `${s.name}（${s.keyId}）`).join('、');
    return {
      ok: false,
      reason: 'revoked-key',
      message: `${entry.id} 的来源签名用的钥匙已被本机拉黑：${dead}\n`
        + '  拉黑表示这把钥匙出过事（泄漏/作废）：既不是「验不过」，也不是「没条件验」，\n'
        + '  所以 --allow-community 与 --allow-unpinned 都绕不过。\n'
        + '  确实需要恢复，得改内置公钥表的 revoked 列表，那是个有记录的动作。'
    };
  }

  // 「没有内置公钥」是没条件验；这时候 --allow-unpinned 是唯一说得通的旗子。
  const blind = signedSources.length > 0 && signedSources.every((s) => s.reason === 'no-pinned-key');
  if (allowUnpinned && blind) {
    return { ok: true, warning: `本机没有内置公钥，${entry.id} 的来源（${where}）没法验证，按 --allow-unpinned 继续` };
  }
  if (allowCommunity) {
    return { ok: true, warning: `${entry.id} 来自非官方源（${where}），按 --allow-community 继续` };
  }

  const needed = blind
    ? '--allow-unpinned（本机没有内置公钥，整份目录都验不了）'
    : '--allow-community（这个 id 来自非官方源）';
  return {
    ok: false,
    reason: blind ? 'no-pinned-key' : 'unverified-source',
    message: `${entry.id} 的来源没通过验证（${where}），这次安装中止\n`
      + `  要装它，加 ${needed}。\n`
      + '  来源决定了「这个 id 到底是谁发的」，这件事不能由内容自己声明；\n'
      + '  装进去的人设会变成 bot 的 prompt，所以默认只装验证过的源。'
  };
}

/**
 * 时间这一关：这份签名还作不作数。
 *
 * 为什么放在**条目**上而不是整份目录上：多源合并后，「整份目录的有效期」是没法回答的问题。
 * 主源昨天刚签、社区源三个月前就过期了 —— 装主源的条目时不该被对方的时间卡住。
 *
 * 无源可用或不带 lifetime（老调用方、测试直接构造的条目）时放行：
 * 这一关只处理「算得出来且过期了」的情况，不知道就当不知道（那条在 verify 里报）。
 */
function gateLifetime(sources, entry, { allowExpired, command }) {
  const live = sources.filter((s) => s && s.lifetime);
  if (live.length === 0) return { ok: true, warning: null };

  const dead = live.filter((s) => s.lifetime.state === 'expired' || s.lifetime.state === 'future');
  if (dead.length) {
    const who = dead.map((s) => `${s.name}：${describeLifetime(s.lifetime)}`).join('；');
    if (!allowExpired) {
      return {
        ok: false,
        reason: 'expired-signature',
        message: `${entry.id} 的来源目录签名已过期 —— ${who}\n`
          + '  签名本身验得过，过期说的是另一件事：这份目录太老了，\n'
          + '  这期间发布方撤回的版本、作废的钥匙，它都还不知道 —— 而它看上去和刚签的一模一样。\n'
          + '  要能继续：联网重取一份（去掉 --offline，或去掉 --cache 让它重取），或让发布方重签目录。\n'
          + '  确实要用它装（比如离线机器）：加 --allow-expired —— 那是在说「我接受这期间可能撤回了我正要装的这一版」。'
      };
    }
    return {
      ok: true,
      warning: `${entry.id} 的来源目录签名已过期 —— ${who}\n  按 --allow-expired 继续：这期间可能已经撤回了你要装的版本`
    };
  }

  const soon = live.filter((s) => s.lifetime.state === 'expiring');
  if (soon.length) {
    return {
      ok: true,
      warning: `${entry.id} 的来源目录签名快到期了（${soon.map((s) => `${s.name}：${describeLifetime(s.lifetime)}`).join('；')}）`
    };
  }
  return { ok: true, warning: null };
}

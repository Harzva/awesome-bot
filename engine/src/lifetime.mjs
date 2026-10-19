// 目录签名的「有效期」。
//
// 签名只回答一件事：这份内容是不是这把钥匙签的。它不回答「什么时候签的」。
// 于是一份三年前签的目录今天照样验得过 —— 而它不可能知道这三年里撤回了什么。
// 这是撤回链上唯一一个「永远有效」的缺口：撤回是官方在**新目录**里说的，
// 没用过新目录的客户端就永远收不到这条声明。
//
// 三件事必须分开，混成一句「签名无效」用户就会去查错方向：
//   · bad-signature  内容被改过，或不是这把钥匙签的；
//   · expired        内容一个字没动，签名验得过，只是这份签名太老了；
//   · unknown        没写有效期，不知道 —— 既不能当刚签的，也不能当过期。
//
// 两个容易写错的地方，都在下面用断言挡住：
//   1. 有效期必须写在**被签名覆盖**的位置（目录顶层 `issued`）。
//      写进 `signature` 字段里等于没写：`signableBytes` 会把整个 signature 剔掉，
//      于是谁都能把它改成 2099 年，而签名照样「有效」。
//   2. 缓存的新鲜期 ≠ 有效期。新鲜期管「多久重取一次」，有效期管「这份签名还能不能当依据」。
//      304 只刷新取回时间，不会推进 `issued` —— 所以「缓存很新 + 签名早就过期」是可能的。
const dayOf = (iso) => String(iso || '').slice(0, 10);

export const DEFAULT_TTL_DAYS = 90;
/** 有效期最长两年：再长就等于没有有效期，而「有没有」这件事是这套机制的全部内容。 */
export const MAX_TTL_DAYS = 730;
/** 剩余时间少于这个天数就开始提醒续签。留一个月，是因为重签要走一遍发布流程。 */
export const RENEW_BEFORE_DAYS = 30;
/** 允许的时钟误差：签发时间比本机时间晚一点不算异常，晚太多就说明这个时间不可信。 */
export const CLOCK_SKEW_MS = 6 * 3600 * 1000;

const DAY = 86_400_000;

// 必须显式带时区：`2026-10-20T00:00:00` 在两边不同时区会解析成不同时刻，
// 于是同一份目录在两台机器上得出不同的「还剩几天」。这类分歧最难查。
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/** 带时区的 ISO 时刻 → 毫秒；不合法或没时区 → null。 */
export function parseInstant(text) {
  if (typeof text !== 'string') return null;
  const s = text.trim();
  if (!INSTANT.test(s)) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** 生成一个 `issued` 块。`now` 与 `days` 都显式传，发布脚本才不会凭本机时间漂移。 */
export function makeIssued({ now = Date.now(), days = DEFAULT_TTL_DAYS } = {}) {
  const ttl = Number(days);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TTL_DAYS) {
    throw new Error(`有效期要写 1..${MAX_TTL_DAYS} 天（收到 ${days}）：再长就等于没有有效期`);
  }
  const base = typeof now === 'number' ? now : parseInstant(String(now));
  if (!Number.isFinite(base)) throw new Error(`--now 要写带时区的 ISO 时刻（收到 ${now}）`);
  return { at: new Date(base).toISOString(), expires: new Date(base + ttl * DAY).toISOString() };
}

/**
 * 这份目录的签名还有没有效、还能用多久。**每次装载都现算**，不落盘、不缓存结论：
 * 缓存里只留原文与取回时间，结论一存下来就会跟着缓存一起变旧（见 cache.mjs 的同类规则）。
 *
 * @returns {{state:'valid'|'expiring'|'expired'|'unknown'|'future', reason:string|null,
 *            signedAt:string|null, expiresAt:string|null, ageMs:number|null,
 *            daysLeft:number|null, overdueDays:number|null}}
 *   state 与 reason 分开：state 是结论，reason 是「为什么是这个结论」（no-issued / bad-issued / future-dated / expired）
 */
export function signatureLifetime(document, { now = Date.now(), skewMs = CLOCK_SKEW_MS, renewDays = RENEW_BEFORE_DAYS } = {}) {
  const issued = document && document.issued;
  const blank = { signedAt: null, expiresAt: null, ageMs: null, daysLeft: null, overdueDays: null };
  if (!issued || typeof issued !== 'object') return { state: 'unknown', reason: 'no-issued', ...blank };

  const at = parseInstant(issued.at);
  const expires = parseInstant(issued.expires);
  // 结构校验会先拦下这种；这里仍要能返回一个结论，而不是抛 —— 装载路径不该因为展示层的问题崩掉。
  if (at === null || expires === null) return { state: 'unknown', reason: 'bad-issued', ...blank };

  const base = { signedAt: new Date(at).toISOString(), expiresAt: new Date(expires).toISOString() };
  // 签发时间在未来：一把钥匙能签一份「2027 年签发」的目录，等于可以让它的有效期从 2027 才开始算。
  // 允许一点时钟误差，晚太多就不认。
  if (at > now + skewMs) return { state: 'future', reason: 'future-dated', ...base, ageMs: at - now };

  const ageMs = now - at;
  if (now > expires) {
    return { state: 'expired', reason: 'expired', ...base, ageMs, overdueDays: Math.floor((now - expires) / DAY) };
  }
  // 向下取整：宁可早一天提醒续签，也不要在最后一天才发现。
  const daysLeft = Math.floor((expires - now) / DAY);
  return {
    state: daysLeft <= renewDays ? 'expiring' : 'valid',
    reason: null,
    ...base,
    ageMs,
    daysLeft,
    overdueDays: 0
  };
}

/** 一句人话。过期与「验不过」必须读起来就不是一回事。 */
export function describeLifetime(l) {
  if (!l || l.state === 'unknown') {
    return l && l.reason === 'bad-issued'
      ? '目录的有效期读不出来（at / expires 要写成带时区的 ISO 时刻）'
      : '目录没写有效期：不知道这份签名是什么时候签的，也就说不上它是不是该换了';
  }
  if (l.state === 'future') {
    return `签发时间写在未来（${l.signedAt}），没法判断它是否早该过期`;
  }
  if (l.state === 'expired') {
    return `签名已于 ${dayOf(l.expiresAt)} 过期${l.overdueDays > 0 ? `（${l.overdueDays} 天前）` : ''}`;
  }
  if (l.state === 'expiring') {
    return `签名 ${dayOf(l.expiresAt)} 到期（还有 ${l.daysLeft} 天），该重签了`;
  }
  return `签名有效期到 ${dayOf(l.expiresAt)}（还有 ${l.daysLeft} 天）`;
}

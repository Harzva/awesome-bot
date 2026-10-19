// 签名与发布者身份。解决的是两件事：
//   1. 别人能不能冒充某个发布者（目录声明的 keyId ↔ 内容签名）；
//   2. 整份目录会不会被换掉（客户端内置的公钥 ↔ 目录签名）。
//
// 做法尽量小：
//   - 算法只支持 ed25519（Node 内置，不需要依赖，也没有参数选择可以选错）；
//   - 签名对象是「去掉 signature 字段后的规范化 JSON」，规则与摘要共用一份；
//   - keyId 由公钥算出来，换一把 key 就是换一个 keyId，不能悄悄替换；
//   - 只做「这一份内容确实是这把 key 签的」，不做身份认证、不接 PKI、不联网吊销。
//     发布者是谁仍由目录声明，签名只保证内容在签发后没被改过。
//
// 这里签的是**任意 JSON 文档**（模板、组件包、目录），不是 manifest 专用。
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { canonicalJson } from './manifest.mjs';

const ALG = 'ed25519';

function keyIdOfPem(publicKeyPem) {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return `${ALG}-${createHash('sha256').update(der).digest('base64url').slice(0, 16)}`;
}

export function keyIdOf(publicKeyPem) {
  try {
    return keyIdOfPem(publicKeyPem);
  } catch {
    return null;
  }
}

/**
 * 签名对象：去掉 signature 之后的规范化 JSON。
 * 摘要与签名必须共用这一份规则，否则「签的时候一个形状、验的时候另一个形状」，
 * 表现为「签名永远不对」，而原因很难查。
 * 也不能把 signature 自己算进去：否则每次重签都改签名对象，永远不可能稳定。
 */
export function signableBytes(doc) {
  const copy = { ...doc };
  delete copy.signature;
  return Buffer.from(canonicalJson(copy), 'utf8');
}

export function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync(ALG);
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  return {
    alg: ALG,
    keyId: keyIdOfPem(publicPem),
    publicKey: publicPem,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };
}

/** 生成 detached signature，返回可写进文档的 signature 对象。 */
export function signJson(doc, privateKeyPem) {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  const keyId = keyIdOfPem(publicPem);
  const value = cryptoSign(null, signableBytes(doc), privateKey).toString('base64');
  return { alg: ALG, keyId, value };
}

/**
 * @returns {{ok:boolean, reason:string|null, keyId:string|null}}
 *   reason: no-signature | unsupported-alg | key-mismatch | bad-signature | bad-key
 */
export function verifyJson(doc, publicKeyPem) {
  const sig = doc && doc.signature;
  if (!sig || typeof sig.value !== 'string') return { ok: false, reason: 'no-signature', keyId: null };
  if (sig.alg !== ALG) return { ok: false, reason: 'unsupported-alg', keyId: null };

  let expected;
  try {
    expected = keyIdOfPem(publicKeyPem);
  } catch {
    return { ok: false, reason: 'bad-key', keyId: null };
  }
  // keyId 与公钥必须自洽：否则「换了公钥但留着老 keyId」就能冒充同一发布者。
  if (sig.keyId !== expected) return { ok: false, reason: 'key-mismatch', keyId: expected };

  let good = false;
  try {
    good = cryptoVerify(null, signableBytes(doc), createPublicKey(publicKeyPem), Buffer.from(sig.value, 'base64'));
  } catch {
    good = false;
  }
  return { ok: good, reason: good ? null : 'bad-signature', keyId: expected };
}

/** 把签名写进文档（返回新对象，不改原对象）。 */
export function withSignature(doc, privateKeyPem) {
  const copy = { ...doc };
  delete copy.signature;
  copy.signature = signJson(copy, privateKeyPem);
  return copy;
}

/**
 * 一组「被信任的公钥」里有没有一把能验过这份文档。
 * 目录签名按这个方式来：客户端内置的可能不止一把（轮换期新旧并存），
 * 但**只认内置的那几把**，绝不从文档自带的 keys 里取 —— 那就是被换掉的目录自己给自己发证。
 * @param {Record<string,string>} pinnedKeys keyId → PEM
 * @returns {{ok:boolean, keyId:string|null, reason:string|null, tried:number}}
 */
export function verifyAgainstKeys(doc, pinnedKeys) {
  const entries = Object.entries(pinnedKeys || {});
  if (entries.length === 0) return { ok: false, keyId: null, reason: 'no-pinned-key', tried: 0 };
  let last = null;
  for (const [keyId, pem] of entries) {
    // keyId 与实际公钥不符的登记直接跳过：它不是一把可信的钥匙，只是一个字符串
    if (keyIdOf(pem) !== keyId) { last = { ok: false, keyId, reason: 'bad-key' }; continue; }
    const res = verifyJson(doc, pem);
    if (res.ok) return { ...res, tried: entries.length };
    last = res;
  }
  return { ...(last || { ok: false, keyId: null, reason: 'no-signature' }), tried: entries.length };
}

/** 给 CLI 与测试共用的一句人话。 */
export function describeSignatureCheck(result) {
  switch (result.reason) {
    case null: return `签名有效（${result.keyId}）`;
    case 'no-signature': return '没有签名（内容可能被改过，也无法确认发布者）';
    case 'unsupported-alg': return '签名算法不认识';
    case 'key-mismatch': return '签名里的 keyId 与这把公钥不一致（可能被换了 key）';
    case 'bad-signature': return '签名与内容不符（内容在签发后被改过）';
    case 'bad-key': return '公钥无法解析，或与登记的 keyId 不符';
    case 'no-pinned-key': return '没有可用的内置公钥（无法判断这份文档是不是官方的）';
    case 'revoked-key': return '这把钥匙已被本机拉黑（出过事或已作废，不能再当官方）';
    default: return '签名校验失败';
  }
}

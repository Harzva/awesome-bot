// 发布树里不能有私钥。这是签名机制最容易出的事故，也是唯一一个「一旦发生就全盘皆输」的：
// 私钥跟着目录一起上传，之前所有签名都变成可伪造，而且看不出来。
//
// 为什么需要一道专门的扫描：sign-manifests.mjs 只是不去写私钥，它挡不住
// 复制粘贴、拷贝模板目录时连 keys/ 一起拷、以及「把私钥临时放进 templates/ 试一下」。
// 这类操作不会报错，只会在某天被发现时已经晚了。
//
// 扫描范围只覆盖**会发布出去的那部分**（registry/templates/bundles/preview）：
// keys/ 里本来就有私钥，src/scripts 里会出现 privateKey 这个词，扫它们只会制造噪音。
// 公钥不在此列 —— 它本来就该公开。
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const PEM_PRIVATE = /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/;
// JSON 里被转义成 "\n" 的 PEM：只看有没有 BEGIN 开头，不追内容
const JSON_PRIVATE = /"(?:private|secret)[A-Za-z_]*[Kk]ey"\s*:\s*"-----BEGIN/;

export const PUBLISH_DIRS = ['registry', 'templates', 'bundles', 'preview'];

async function walk(dir, out) {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // 目录不存在不算错误：发布树可以只有其中几块
  }
  for (const item of items) {
    const full = join(dir, item.name);
    if (item.isDirectory()) await walk(full, out);
    else if (item.isFile()) out.push(full);
  }
}

/**
 * @returns {Promise<{ok:boolean, hits:{path:string, kind:string}[], scanned:number}>}
 */
export async function scanForPrivateKeys(root, dirs = PUBLISH_DIRS) {
  const files = [];
  for (const dir of dirs) await walk(join(root, dir), files);

  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      continue; // 读不了就不猜；读不了的文件也进不了发布包（会被 cp 拦住）
    }
    const at = relative(root, file);
    if (JSON_PRIVATE.test(text)) hits.push({ path: at, kind: 'JSON 里嵌了 PEM 私钥' });
    else if (PEM_PRIVATE.test(text)) hits.push({ path: at, kind: 'PEM 私钥块' });
  }
  // 一个文件都没扫到不算通过。发布树里至少有 registry/index.json，
  // 扫到 0 个说明根目录给错了 —— 报「干净」就是拿「看不到」冒充「没有」。
  return { ok: hits.length === 0 && files.length > 0, hits, scanned: files.length };
}

/** 给 CLI 用的一句话。 */
export function describeLeakScan(result) {
  if (result.scanned === 0) {
    return `发布树（${PUBLISH_DIRS.join('/')}）一个文件都没扫到，可能是根目录给错了 —— 这不等于没有私钥`;
  }
  if (result.ok) return `发布树（${PUBLISH_DIRS.join('/')}）${result.scanned} 个文件，没有私钥`;
  return `发布树里有私钥：${result.hits.map((h) => `${h.path}（${h.kind}）`).join('、')}`;
}

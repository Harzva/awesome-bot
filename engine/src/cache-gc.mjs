// 缓存治理：容量上限、淘汰、以及「不删已装内容」。
//
// 为什么单独一层：缓存不设上限就一定会长到占满磁盘（每个版本一份内容，市场越活跃越大），
// 但「删哪个」不是个可以随手决定的问题：
//
//   1. **已安装的内容不能删**。删了不会立刻出错，而是在用户下次想重装同一版本、
//      或者离线要装的时候才炸 —— 那时他根本不会想到是「缓存空间管理」干的。
//      所以淘汰时先扣掉保留集，哪怕保留集自己就超了上限，也只报告、不硬删。
//   2. **目录缓存不删**。它小，而且它是「本机知道哪些版本存在」的唯一索引；
//      删了下次连离线浏览都没了。
//   3. **读不出结构的文件只报告，不自动删**。不知道它是什么就删，等于替用户
//      扔掉可能还想留的东西；但也不能假装它不占空间（它确实占）。
//   4. **默认预演**，`--apply` 才真删 —— 和 upgrade 的规矩一致。
//
// 淘汰顺序按取回时间从旧到新。内容随时可以重新下载并重新校验，所以删旧的是安全的；
// 但「安全」不等于「用户愿意」，所以每一份删了什么、为什么、腾出多少，都要报出来。
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const DEFAULT_LIMIT_BYTES = 500 * 1024 * 1024;

/** 「500MB」「1.5GB」「800k」这种写法。纯数字按字节算，没有单位就绝不猜。 */
export function parseSize(text) {
  const raw = String(text == null ? '' : text).trim();
  const m = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|k|m|g)?$/i.exec(raw);
  if (!m) throw new Error(`看不懂的容量：${raw}（用 500MB / 1.5GB / 800KB，纯数字按字节算）`);
  const unit = (m[2] || 'b').toLowerCase();
  const scale = { b: 1, k: 1024, kb: 1024, m: 1024 ** 2, mb: 1024 ** 2, g: 1024 ** 3, gb: 1024 ** 3 }[unit];
  return Math.round(Number(m[1]) * scale);
}

export function describeBytes(n) {
  // 和 describeAge 同一个坑：`Number(null) === 0`，不先判就会把「不知道」说成「0 B」。
  if (n === null || n === undefined || n === '') return '未知大小';
  const bytes = Number(n);
  if (!Number.isFinite(bytes) || bytes < 0) return '未知大小';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** 内容缓存的文件名就是 key，所以「这是什么版本」只能从 meta 读。 */
async function readEntry(file, kind) {
  let raw;
  let size = 0;
  try {
    const info = await stat(file);
    size = info.size;
    raw = await readFile(file, 'utf8');
  } catch (err) {
    return { file, kind, bytes: size, broken: `读不到：${err.code || err.message}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { file, kind, bytes: size, broken: '不是合法 JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.meta) {
    return { file, kind, bytes: size, broken: '没有 meta（不是本模块写的格式？）' };
  }
  return {
    file,
    kind,
    bytes: size,
    meta: parsed.meta,
    // meta.fetchedAt 缺失时当 0：这种条目排在最前，先被淘汰 —— 它连「什么时候取的」
    // 都不知道，留着的价值最低。但不会因此被当成 broken。
    fetchedAt: Number(parsed.meta.fetchedAt) || 0
  };
}

/**
 * 清点缓存目录，不做任何决定。
 * @returns {Promise<{entries:object[], broken:object[], totalBytes:number, count:number,
 *                    catalogue:{count:number, bytes:number}, content:{count:number, bytes:number}}>}
 */
export async function inspectCache(dir) {
  const entries = [];
  const broken = [];
  const empty = {
    entries, broken, totalBytes: 0, brokenBytes: 0, count: 0,
    catalogue: { count: 0, bytes: 0 }, content: { count: 0, bytes: 0 }
  };
  if (!dir) return empty;

  const collect = async (sub, kind) => {
    let names = [];
    try {
      names = await readdir(sub);
    } catch {
      return; // 目录不存在：空缓存，不是错误
    }
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const entry = await readEntry(join(sub, name), kind);
      if (entry.broken) broken.push(entry);
      else entries.push(entry);
    }
  };
  await collect(dir, 'catalogue');
  await collect(join(dir, 'content'), 'content');

  const sum = (list) => list.reduce((n, e) => n + e.bytes, 0);
  // 分类计数只算「读得出的」，坏文件单独一栏 —— 否则内容缓存那一行会把坏文件的字节
  // 也算进去，和「占用」对不上，界面上就成了同一份空间被数两遍。
  const tally = (kind) => {
    const list = entries.filter((e) => e.kind === kind);
    return { count: list.length, bytes: sum(list) };
  };
  return {
    entries,
    broken,
    count: entries.length + broken.length,
    // 坏文件也占空间，必须算进去 —— 否则「还剩多少额度」是假的
    totalBytes: sum(entries) + sum(broken),
    brokenBytes: sum(broken),
    catalogue: tally('catalogue'),
    content: tally('content')
  };
}

/**
 * 决定删哪些。纯函数，不碰磁盘 —— 这样「淘汰策略」本身可以被单独测。
 * @param {object} input
 *   entries     inspectCache 的结果
 *   limitBytes  上限
 *   keep        Set<'id@版本'>，已安装的内容
 * @returns {{evict:object[], preserved:object[], overLimit:boolean, bytes:number, preservedBytes:number, notes:string[]}}
 */
export function planEviction({ entries = [], broken = [], limitBytes, keep = new Set() }) {
  const notes = [];
  const catalogues = entries.filter((e) => e.kind === 'catalogue');
  const contents = entries.filter((e) => e.kind === 'content');
  const preserved = contents.filter((e) => keep.has(`${e.meta.id}@${e.meta.version}`));
  const candidates = contents
    .filter((e) => !keep.has(`${e.meta.id}@${e.meta.version}`))
    .sort((a, b) => a.fetchedAt - b.fetchedAt); // 旧的先走

  const bytes = [...entries, ...broken].reduce((n, e) => n + e.bytes, 0);
  const preservedBytes = preserved.reduce((n, e) => n + e.bytes, 0);
  const evict = [];
  let live = bytes;

  // 目录缓存不参与淘汰：它小，而且是本机唯一的「有哪些版本」索引。
  if (catalogues.length) {
    const catalogueBytes = catalogues.reduce((n, e) => n + e.bytes, 0);
    notes.push(`${catalogues.length} 份目录缓存（${describeBytes(catalogueBytes)}）不参与淘汰：`
      + '它们是本机离线时唯一知道「有哪些版本」的东西');
    // 「很小」这句话在上限设得很低时是假的。说的每句话都得经得起看数字。
    if (catalogueBytes >= limitBytes) {
      notes.push(`光目录缓存就有 ${describeBytes(catalogueBytes)}，已经超过上限（${describeBytes(limitBytes)}）；`
        + '把内容全清空也到不了这个上限，除非删目录 —— 那会让离线什么都看不到。');
    }
  }
  if (broken.length) {
    const b = broken.reduce((n, e) => n + e.bytes, 0);
    notes.push(`${broken.length} 个缓存文件读不出结构（占 ${describeBytes(b)}）：不知道它是什么就不替你删，加 --purge-broken 才清`);
  }

  for (const entry of candidates) {
    if (live <= limitBytes) break;
    evict.push({ ...entry, reason: 'oldest' });
    live -= entry.bytes;
  }

  const overLimit = live > limitBytes;
  if (overLimit && preservedBytes > 0) {
    notes.push(`已安装的 ${preserved.length} 份内容占 ${describeBytes(preservedBytes)}，本身就已经超过上限`
      + `（${describeBytes(limitBytes)}）；这些不会被自动删除 —— 删了下次装同一版本还得重新下载，`
      + '而且用户可能正在用。要腾空间请先卸载，或把 --limit 调大。');
  }

  return { evict, preserved, overLimit, bytes, preservedBytes, notes };
}

/**
 * 执行（或预演）一次清理。
 * @returns {Promise<object>} 报告：删了什么、保留什么、坏的是什么、有没有仍然超限
 */
export async function gcCache({
  dir, limitBytes = DEFAULT_LIMIT_BYTES, keep = new Set(), dryRun = true, purgeBroken = false
} = {}) {
  const inspected = await inspectCache(dir);
  const planned = planEviction({ entries: inspected.entries, broken: inspected.broken, limitBytes, keep });
  const notes = [...planned.notes];
  // 预演时 evicted 就是「会删的」，真删时是「实际删掉的」——
  // 预演必须把计划交出来，否则「预演」等于什么都没说（第一版就是这样，evicted 恒为空）。
  const evicted = dryRun ? [...planned.evict] : [];
  const purged = [];

  if (!dryRun) {
    for (const entry of planned.evict) {
      try {
        await rm(entry.file, { force: true });
        evicted.push(entry);
      } catch (err) {
        notes.push(`删不掉 ${entry.file}：${err.code || err.message}（已跳过，其余继续）`);
      }
    }
    if (purgeBroken) {
      for (const entry of inspected.broken) {
        try {
          await rm(entry.file, { force: true });
          purged.push(entry);
        } catch (err) {
          notes.push(`删不掉 ${entry.file}：${err.code || err.message}（已跳过）`);
        }
      }
    }
  }

  const deletedBytes = evicted.reduce((n, e) => n + e.bytes, 0) + purged.reduce((n, e) => n + e.bytes, 0);
  // 预演时报「清理之后会有多少」，真删时按实际删掉的算 —— 两者不能混成一个数
  const afterBytes = dryRun
    ? planned.bytes - planned.evict.reduce((n, e) => n + e.bytes, 0)
    : inspected.totalBytes - deletedBytes;

  return {
    dir,
    dryRun,
    limitBytes,
    before: { count: inspected.count, bytes: inspected.totalBytes },
    after: { count: inspected.count - evicted.length - purged.length, bytes: afterBytes },
    evicted,
    purged,
    preserved: planned.preserved,
    broken: inspected.broken,
    brokenBytes: inspected.brokenBytes,
    catalogue: inspected.catalogue,
    content: inspected.content,
    overLimit: afterBytes > limitBytes,
    notes
  };
}

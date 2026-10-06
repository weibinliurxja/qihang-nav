import { authenticate, dataKey, iconKey, json, kvOf, sameOrigin } from '../_lib/auth.js';

/**
 * Pages 边缘函数 · /api/icon
 *
 *   GET    ?id=<linkId>            取图标：手动上传的优先，其次自动抓取缓存，最后懒抓一次
 *   POST   ?id=<linkId>            手动上传图标（body = 图片字节，Content-Type = 图片类型）
 *   DELETE ?id=<linkId>            抹掉手动图标，改回自动抓取
 *
 * 为什么服务端抓：大陆网络下 Google / DuckDuckGo / favicon.im 的图标服务全部不通，
 * 唯一能用的 icon.horse 是境外第三方（规范 R-5.2 也禁止外链第三方图标服务）。
 * 由边缘函数抓一次、缓存进 KV、再从自己域名发出去，浏览器只跟我们通信。
 *
 * 安全：本接口**只接受 linkId，绝不接受客户端传 URL** —— URL 从 KV 里那份链接列表查出来，
 *       认证账号只能请求自己的站点图标；写入类操作要求同源登录会话。
 *
 * 缓存：KV 键 user:<accountId>:icon:<linkId>
 *   手动上传 → { manual:1, ct, b64 }
 *   自动抓取 → { u:<url 指纹>, ct, b64 }   或   { u, none:1, at }（抓不到也记一笔）
 */

const MAX_FETCH_BYTES = 200 * 1024;
const MAX_UPLOAD_BYTES = 512 * 1024;
const RETRY_MS = 7 * 24 * 3600 * 1000; // 抓失败的记录 7 天后允许重试

/* ---------- base64：手写，不依赖运行时是否提供 btoa ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64encode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

function b64decode(str) {
  const clean = String(str).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0, buf = 0, bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[p++] = (buf >> bits) & 255; }
  }
  return out.subarray(0, p);
}

/* ---------- 工具 ---------- */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function isImageType(ct) {
  return /^image\//i.test(ct) || /x-icon/i.test(ct);
}

/* 内网 / 本机地址：从边缘节点永远抓不到图标，直接放弃。
   否则每个这样的链接都要挂到连接超时——CCJ 分组里几十条内网看板，
   不挡掉的话首屏会被几十个卡住的请求拖死。 */
function isPrivateHost(host) {
  const h = String(host || '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0 || a === 255) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function servedIcon(ct, b64) {
  return new Response(b64decode(b64), {
    status: 200,
    headers: {
      'content-type': ct || 'image/x-icon',
      'cache-control': 'private, no-store'
    }
  });
}

function notFound() {
  return new Response('', { status: 404, headers: { 'cache-control': 'private, no-store' } });
}

/* 从 KV 里的链接列表按 id 找到那个 Link；找不到返回 null */
async function findLink(KV, id, user) {
  const raw = await KV.get(dataKey(user));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    for (const cat of data.categories || []) {
      for (const l of cat.links || []) if (l.id === id) return l;
    }
  } catch (e) { /* 数据坏了 */ }
  return null;
}

/* 从 HTML 里挖候选图标地址：<link rel="...icon...">（apple-touch-icon 也含 icon，会一并命中） */
function iconCandidatesFromHtml(html, origin) {
  const found = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?[^"'>]*icon/i.test(tag)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!href) continue;
    const raw = href[1].trim();
    if (!raw || /^data:/i.test(raw)) continue;
    try { found.push(new URL(raw, origin).toString()); } catch (e) { /* 忽略坏地址 */ }
  }
  return found;
}

async function fetchFirstImage(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; QihangNavIcons/1.0)', accept: 'image/*,*/*;q=0.8' }
      });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
      // 关键：很多站点对 /favicon.ico 返回 200 + text/html（SPA 首页），必须挡掉
      if (!isImageType(ct)) continue;
      const buf = await res.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > MAX_FETCH_BYTES) continue;
      return { ct: ct || 'image/x-icon', bytes: new Uint8Array(buf) };
    } catch (e) { /* 换下一个 */ }
  }
  return null;
}

async function grabIcon(siteUrl) {
  let origin;
  let host;
  try { const u = new URL(siteUrl); origin = u.origin; host = u.hostname; } catch (e) { return null; }

  // 内网地址直接放弃，别去挂连接超时
  if (isPrivateHost(host)) return null;

  const candidates = [];
  try {
    const res = await fetch(origin, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; QihangNavIcons/1.0)', accept: 'text/html,*/*;q=0.8' }
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && /text\/html/i.test(ct)) {
      const html = (await res.text()).slice(0, 300000);
      candidates.push(...iconCandidatesFromHtml(html, origin));
    }
  } catch (e) { /* 首页抓不到就直接试 /favicon.ico */ }

  candidates.push(origin + '/favicon.ico');
  return fetchFirstImage(candidates);
}

/* ---------- GET ---------- */
export async function onRequestGet(context) {
  const { request } = context;
  const user = await authenticate(context);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return notFound();

  const KV = kvOf(context);
  if (!KV) return notFound();

  const link = await findLink(KV, id, user);
  if (!link || !link.url) return notFound();

  const key = iconKey(user, id);
  const urlMark = hash(link.url);
  let cached = await KV.get(key);
  // Lazy migration: old icons are visible only to admin, for unchanged original sites.
  if (!cached && user.id === 'admin') {
    const legacyRaw = await KV.get('nav:data');
    let original;
    try { original = JSON.parse(legacyRaw || '{}').categories?.flatMap(c => c.links).find(l => l.id === id); } catch {}
    if (original && original.url === link.url) {
      cached = await KV.get('icon:' + id);
      if (cached) await KV.put(key, cached);
    }
  }

  if (cached) {
    try {
      const c = JSON.parse(cached);
      // 手动上传的永远优先，且不随 URL 变化而失效
      if (c.manual && c.b64) return servedIcon(c.ct, c.b64);
      if (c.u === urlMark) {
        if (c.none) {
          if (Date.now() - (c.at || 0) < RETRY_MS) return notFound();
        } else if (c.b64) {
          return servedIcon(c.ct, c.b64);
        }
      }
    } catch (e) { /* 缓存坏了就重新抓 */ }
  }

  const got = await grabIcon(link.url);
  if (!got) {
    await KV.put(key, JSON.stringify({ u: urlMark, none: 1, at: Date.now() }));
    return notFound();
  }
  await KV.put(key, JSON.stringify({ u: urlMark, ct: got.ct, b64: b64encode(got.bytes) }));
  return servedIcon(got.ct, b64encode(got.bytes));
}

/* ---------- POST：手动上传 ---------- */
export async function onRequestPost(context) {
  const { request } = context;
  const user = await authenticate(context);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);

  const KV = kvOf(context);
  if (!KV) return json({ ok: false, error: 'KV 未绑定：请把 KV 命名空间绑定为 NAV_KV' }, 500);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'missing id' }, 400);
  // 不检查链接是否已存在于 KV：新增链接时它还没落盘，图标要能先传上去。
  // 只校验 id 格式，避免被写成任意键。代价是取消新建时可能留下一个孤儿图标（几 KB）。
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(id)) return json({ ok: false, error: 'bad id' }, 400);

  let ct = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!isImageType(ct)) ct = 'image/x-icon'; // .ico 有时 type 为空

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.byteLength) return json({ ok: false, error: 'empty file' }, 400);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return json({ ok: false, error: 'too large', max: MAX_UPLOAD_BYTES }, 413);
  }

  await KV.put(iconKey(user, id), JSON.stringify({ manual: 1, ct, b64: b64encode(bytes) }));
  return json({ ok: true, ct: ct, bytes: bytes.byteLength });
}

/* ---------- DELETE：改回自动抓取 ---------- */
export async function onRequestDelete(context) {
  const { request } = context;
  const user = await authenticate(context);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);

  const KV = kvOf(context);
  if (!KV) return json({ ok: false, error: 'KV 未绑定：请把 KV 命名空间绑定为 NAV_KV' }, 500);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'missing id' }, 400);

  // A tombstone prevents an old manual icon from being migrated again.
  await KV.put(iconKey(user, id), JSON.stringify({ reset: 1 }));
  return json({ ok: true });
}

export async function onRequest(context) {
  try {
    const m = context.request.method;
    if (m === 'GET') return await onRequestGet(context);
    if (m === 'POST') return await onRequestPost(context);
    if (m === 'DELETE') return await onRequestDelete(context);
    return json({ ok: false, error: 'method not allowed' }, 405);
  } catch (error) { return json({ ok: false, error: error.message }, 503); }
}

/**
 * EdgeOne Pages 边缘函数 · /api/icon
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
 *       所以它不是一个开放代理，不存在 SSRF。写入类操作（POST/DELETE）要求口令。
 *
 * 缓存：KV 键 icon:<linkId>
 *   手动上传 → { manual:1, ct, b64 }
 *   自动抓取 → { u:<url 指纹>, ct, b64 }   或   { u, none:1, at }（抓不到也记一笔）
 */

const ICON_PREFIX = 'icon:';
const DATA_KEY = 'nav:data';
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

function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/* ---------- 认证 ----------
   图标接口曾经是公开的（因为 <img> 带不了自定义请求头），那等于把「书签清单里有哪些站点」
   暴露给任何知道链接 id 的人。现在改成 Cookie 认证：Cookie 由 /api/data 在校验口令后种下，
   <img> 请求会自动携带它。Cookie 里放的是口令的 SHA-256，不是明文口令。 */
async function authToken(password) {
  const bytes = new TextEncoder().encode('qihang-nav:' + password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)').exec(raw);
  return m ? m[1] : '';
}

async function authed(request, env) {
  const expect = env && env.NAV_PASSWORD;
  if (!expect) return false;
  if (safeEqual(request.headers.get('X-Password'), expect)) return true;
  return safeEqual(parseCookie(request, 'nav_auth'), await authToken(expect));
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function isImageType(ct) {
  return /^image\//i.test(ct) || /x-icon/i.test(ct);
}

/* KV 绑定的取法（两种运行时都兼容）：
   线上 EdgeOne 把 KV 命名空间注入成**以绑定名为名字的全局变量**（官方示例就是裸写 my_kv.get(...)）；
   本地 dev-server.mjs 走 context.env 注入。少了这个兼容，线上 env.NAV_KV 会是 undefined。 */
function kvOf(context) {
  if (typeof NAV_KV !== 'undefined' && NAV_KV) return NAV_KV;
  return (context.env && context.env.NAV_KV) || null;
}

function servedIcon(ct, b64, maxAge) {
  return new Response(b64decode(b64), {
    status: 200,
    headers: {
      'content-type': ct || 'image/x-icon',
      'cache-control': 'public, max-age=' + (maxAge || 604800) + ', immutable'
    }
  });
}

function notFound() {
  return new Response('', { status: 404, headers: { 'cache-control': 'public, max-age=3600' } });
}

/* 从 KV 里的链接列表按 id 找到那个 Link；找不到返回 null */
async function findLink(KV, id) {
  const raw = await KV.get(DATA_KEY);
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
  try { origin = new URL(siteUrl).origin; } catch (e) { return null; }

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
  const { request, env } = context;
  if (!(await authed(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return notFound();

  const KV = kvOf(context);
  if (!KV) return notFound();

  const link = await findLink(KV, id);
  if (!link || !link.url) return notFound();

  const key = ICON_PREFIX + id;
  const urlMark = hash(link.url);
  const cached = await KV.get(key);

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
  const { request, env } = context;
  if (!(await authed(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

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

  await KV.put(ICON_PREFIX + id, JSON.stringify({ manual: 1, ct, b64: b64encode(bytes) }));
  return json({ ok: true, ct: ct, bytes: bytes.byteLength });
}

/* ---------- DELETE：改回自动抓取 ---------- */
export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!(await authed(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

  const KV = kvOf(context);
  if (!KV) return json({ ok: false, error: 'KV 未绑定：请把 KV 命名空间绑定为 NAV_KV' }, 500);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'missing id' }, 400);

  await KV.delete(ICON_PREFIX + id);
  return json({ ok: true });
}

export async function onRequest(context) {
  const m = context.request.method;
  if (m === 'GET') return onRequestGet(context);
  if (m === 'POST') return onRequestPost(context);
  if (m === 'DELETE') return onRequestDelete(context);
  return json({ ok: false, error: 'method not allowed' }, 405);
}

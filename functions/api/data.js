/**
 * EdgeOne Pages 边缘函数 · /api/data
 *
 * 契约（本地 dev-server.mjs 用同一份代码验证，所以本地测过即为上线代码）：
 *   GET  /api/data   Header: X-Password  →  { ok:true, data:{...} }
 *   POST /api/data   Header: X-Password  Body: 整份数据 JSON  → { ok:true, savedAt }
 *   口令不对一律 401，且不返回任何数据。
 *
 * 绑定（EdgeOne 控制台 → 项目 → KV / 环境变量）：
 *   KV   变量名 NAV_KV        键 nav:data
 *   环境变量 NAV_PASSWORD     访问口令
 */

const KEY = 'nav:data';

/* 首次打开时的初始内容（只有 KV 里没有数据时才会用到） */
const SEED = {
  version: 1,
  categories: [
    {
      id: 'seed-tool', name: '工具效率', color: 6, links: [
        { id: 's1', name: 'GitHub', url: 'https://github.com', desc: '代码托管' },
        { id: 's2', name: '腾讯云', url: 'https://cloud.tencent.com', desc: '云服务控制台' },
        { id: 's3', name: 'EdgeOne', url: 'https://console.cloud.tencent.com/edgeone/makers', desc: '本站的托管平台' },
        { id: 's4', name: 'DeepL', url: 'https://www.deepl.com', desc: '翻译' }
      ]
    },
    {
      id: 'seed-read', name: '学习阅读', color: 7, links: [
        { id: 's5', name: 'MDN', url: 'https://developer.mozilla.org', desc: 'Web 文档' },
        { id: 's6', name: '少数派', url: 'https://sspai.com', desc: '效率内容' }
      ]
    },
    {
      id: 'seed-news', name: '新闻资讯', color: 1, links: [
        { id: 's7', name: 'Hacker News', url: 'https://news.ycombinator.com', desc: '技术圈' },
        { id: 's8', name: 'IT之家', url: 'https://www.ithome.com', desc: '科技资讯' }
      ]
    }
  ]
};

/* ---------- 工具 ---------- */

/* KV 绑定的取法（两种运行时都兼容）：
   线上 EdgeOne 把 KV 命名空间注入成**以绑定名为名字的全局变量**（官方示例就是裸写 my_kv.get(...)）；
   本地 dev-server.mjs 走 context.env 注入。少了这个兼容，线上 env.NAV_KV 会是 undefined。 */
function kvOf(context) {
  if (typeof NAV_KV !== 'undefined' && NAV_KV) return NAV_KV;
  return (context.env && context.env.NAV_KV) || null;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

/* 定长比较，避免用 === 泄露口令长度与前缀 */
function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function authed(request, env) {
  const expect = env && env.NAV_PASSWORD;
  if (!expect) return false; // 没配口令 = 拒绝所有人，不允许裸奔
  return safeEqual(request.headers.get('X-Password'), expect);
}

/* 只做最低限度校验：结构不对就拒绝，避免把垃圾写进 KV */
function valid(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.categories)) return false;
  return data.categories.every(function (c) {
    return c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.length > 0
      && Array.isArray(c.links);
  });
}

/* ---------- 处理 ---------- */

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!authed(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const KV = kvOf(context);
  if (!KV) return json({ ok: false, error: 'KV 未绑定：请把 KV 命名空间绑定为 NAV_KV' }, 500);

  let raw = await KV.get(KEY);
  if (!raw) {
    await KV.put(KEY, JSON.stringify(SEED));
    return json({ ok: true, data: SEED, seeded: true });
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: 'stored data is corrupted' }, 500);
  }
  return json({ ok: true, data: data });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!authed(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const KV = kvOf(context);
  if (!KV) return json({ ok: false, error: 'KV 未绑定：请把 KV 命名空间绑定为 NAV_KV' }, 500);

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'invalid json' }, 400);
  }
  if (!valid(data)) return json({ ok: false, error: 'invalid shape' }, 400);

  data.version = 1;
  data.updatedAt = Date.now();
  await KV.put(KEY, JSON.stringify(data));
  return json({ ok: true, savedAt: data.updatedAt });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'method not allowed' }, 405);
}

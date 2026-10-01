/**
 * 本地开发服务器（只用于本地预览，不部署）
 *
 * 关键点：它不重写业务逻辑，而是直接 import 生产要跑的那两个边缘函数
 *       ./functions/api/data.js 和 ./functions/api/icon.js，只给它们一个
 *       "文件版 KV"，所以本地点过的每一个按钮，走的就是上线后的同一份代码。
 *
 * 用法：node dev-server.mjs   然后打开 http://127.0.0.1:8788
 * 口令：默认 qihang，可用环境变量 NAV_PASSWORD 覆盖
 * 数据：落在同目录的 data.local.json（可直接删掉重置）
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { onRequestGet as dataGet, onRequestPost as dataPost } from './functions/api/data.js';
import { onRequest as iconHandler } from './functions/api/icon.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8788);
const PASSWORD = process.env.NAV_PASSWORD || 'qihang';
const DATA_FILE = join(ROOT, 'data.local.json');

/* ---------- 文件版 KV：实现边缘函数用到的 get / put / delete ----------
   注意：这是"整个 JSON 文件读-改-写"的模拟，并发时天然会丢写
   （浏览器同时在抓图标 → 每个未命中都写一次文件）。所以所有操作串行化。
   真实 EdgeOne KV 是按 key 的原子操作，不存在这个问题。 */
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn);
  chain = run.then(() => {}, () => {});
  return run;
}
async function readAll() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}
const fileKV = {
  get(key) {
    return serial(async () => {
      const all = await readAll();
      return key in all ? all[key] : null;
    });
  },
  put(key, value) {
    return serial(async () => {
      const all = await readAll();
      all[key] = value;
      await writeFile(DATA_FILE, JSON.stringify(all, null, 2), 'utf8');
    });
  },
  delete(key) {
    return serial(async () => {
      const all = await readAll();
      delete all[key];
      await writeFile(DATA_FILE, JSON.stringify(all, null, 2), 'utf8');
    });
  }
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

/* 线上 EdgeOne 是把 KV 注入成全局变量，本地也照样注一遍，
   这样本地跑的就是线上那条代码路径，而不是只测到 env 兜底分支。 */
globalThis.NAV_KV = fileKV;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* 把边缘函数返回的 Response 原样写回 http 响应（支持二进制） */
async function pipe(out, res) {
  const buf = Buffer.from(await out.arrayBuffer());
  const headers = Object.fromEntries(out.headers);
  headers['content-length'] = buf.length;
  res.writeHead(out.status, headers);
  res.end(buf);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const raw = await readBody(req);

  const makeRequest = () => new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : raw
  });
  const env = { NAV_KV: fileKV, NAV_PASSWORD: PASSWORD };

  /* ---------- API：交给生产用的那两份边缘函数处理 ---------- */
  try {
    if (url.pathname === '/api/data') {
      const handler = req.method === 'POST' ? dataPost : dataGet;
      return pipe(await handler({ request: makeRequest(), env }), res);
    }
    if (url.pathname === '/api/icon') {
      return pipe(await iconHandler({ request: makeRequest(), env }), res);
    }
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: String((err && err.message) || err) }));
    return;
  }

  /* ---------- 静态文件 ---------- */
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const target = normalize(join(ROOT, path));
  if (!target.startsWith(ROOT) || !existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(target)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  res.end(await readFile(target));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  启航导航 · 本地预览已启动');
  console.log('  ────────────────────────────────────────');
  console.log(`  地址：http://127.0.0.1:${PORT}`);
  console.log(`  口令：${PASSWORD}`);
  console.log(`  数据：${DATA_FILE}`);
  console.log('  停止：Ctrl+C');
  console.log('');
});

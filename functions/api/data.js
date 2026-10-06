import { authenticate, dataKey, json, kvOf, sameOrigin } from '../_lib/auth.js';

function valid(data) {
  if (!data || !Array.isArray(data.categories) || data.categories.length > 200) return false;
  const ids = new Set();
  return data.categories.every(c => {
    if (!c || typeof c.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(c.id)
      || ids.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40
      || !Number.isInteger(c.color) || c.color < 1 || c.color > 8
      || !Array.isArray(c.links) || c.links.length > 2000) return false;
    ids.add(c.id);
    return c.links.every(l => {
      if (!l || typeof l.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(l.id)
        || ids.has(l.id) || typeof l.name !== 'string' || !l.name.trim() || l.name.length > 200
        || typeof l.url !== 'string' || l.url.length > 4096
        || (l.desc !== undefined && (typeof l.desc !== 'string' || l.desc.length > 1000))) return false;
      try { if (!['http:', 'https:'].includes(new URL(l.url).protocol)) return false; } catch { return false; }
      ids.add(l.id);
      return true;
    });
  });
}

export async function onRequestGet(context) {
  const user = await authenticate(context);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  const KV = kvOf(context);
  let raw = await KV.get(dataKey(user));
  if (!raw) {
    // Preserve the original document. Only the original admin owns this migration.
    raw = user.id === 'admin' ? await KV.get('nav:data') : null;
    if (raw) {
      try { JSON.parse(raw); } catch { return json({ ok: false, error: 'stored data is corrupted' }, 500); }
      await KV.put(dataKey(user), raw);
    }
  }
  if (!raw) return json({ ok: true, data: { version: 1, categories: [] } });
  try { return json({ ok: true, data: JSON.parse(raw) }); }
  catch { return json({ ok: false, error: 'stored data is corrupted' }, 500); }
}

export async function onRequestPost(context) {
  const user = await authenticate(context);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!sameOrigin(context.request)) return json({ ok: false, error: 'forbidden' }, 403);
  let data;
  try { data = await context.request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }
  if (!valid(data)) return json({ ok: false, error: 'invalid shape' }, 400);
  data.version = 1;
  data.updatedAt = Date.now();
  await kvOf(context).put(dataKey(user), JSON.stringify(data));
  return json({ ok: true, savedAt: data.updatedAt });
}

export async function onRequest(context) {
  try {
    if (context.request.method === 'GET') return await onRequestGet(context);
    if (context.request.method === 'POST') return await onRequestPost(context);
    return json({ ok: false, error: 'method not allowed' }, 405);
  } catch (error) { return json({ ok: false, error: error.message }, 503); }
}

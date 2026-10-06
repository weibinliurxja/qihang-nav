import { accounts, authenticate, credentials, json, normalizeUsername, publicAccount, sameOrigin,
  saveAccounts, validPassword, validUsername } from '../_lib/auth.js';

export async function onRequest(context) {
  try {
    const actor = await authenticate(context);
    if (!actor) return json({ ok: false, error: 'unauthorized' }, 401);
    if (actor.role !== 'admin') return json({ ok: false, error: '仅管理员可管理账号' }, 403);
    const method = context.request.method;
    const users = await accounts(context);
    if (method === 'GET') return json({ ok: true, users: users.map(publicAccount) });
    if (!sameOrigin(context.request)) return json({ ok: false, error: 'forbidden' }, 403);
    if (method !== 'POST' && method !== 'PATCH') return json({ ok: false, error: 'method not allowed' }, 405);
    let body;
    try { body = await context.request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }
    if (!body || typeof body !== 'object') return json({ ok: false, error: 'invalid body' }, 400);
    const username = normalizeUsername(body.username);
    if (!validUsername(username)) return json({ ok: false, error: '账号须为 3–32 位字母、数字、下划线或短横线，以字母或数字开头' }, 400);
    if (method === 'POST') {
      if (users.some(u => u.username === username)) return json({ ok: false, error: '账号已存在' }, 409);
      if (!validPassword(body.password)) return json({ ok: false, error: '密码须为 8–128 个字符' }, 400);
      // The initial admin is the only account administrator; new accounts are ordinary users.
      users.push({ id: crypto.randomUUID(), username, role: 'user', disabled: false,
        createdAt: Date.now(), ...await credentials(body.password) });
    } else {
      const target = users.find(u => u.username === username);
      if (!target) return json({ ok: false, error: '账号不存在' }, 404);
      if (body.action === 'password') {
        if (!validPassword(body.password)) return json({ ok: false, error: '密码须为 8–128 个字符' }, 400);
        Object.assign(target, await credentials(body.password));
      } else if (body.action === 'status' && typeof body.disabled === 'boolean') {
        if (target.role === 'admin') return json({ ok: false, error: '不能停用管理员账号' }, 400);
        target.disabled = body.disabled;
        target.sessionKey = crypto.randomUUID(); // Revokes previous sessions, including after reactivation.
      } else return json({ ok: false, error: 'invalid action' }, 400);
    }
    await saveAccounts(context, users);
    return json({ ok: true, users: users.map(publicAccount), reauthenticate: username === actor.username });
  } catch (error) { return json({ ok: false, error: error.message }, 503); }
}

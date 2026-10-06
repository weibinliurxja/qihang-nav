import { authenticate, clearCookies, json, login, publicAccount, sameOrigin, sessionCookie } from '../_lib/auth.js';

export async function onRequest(context) {
  const request = context.request;
  try {
    if (request.method === 'GET') {
      const user = await authenticate(context);
      return user ? json({ ok: true, user: publicAccount(user) }) : json({ ok: false, error: 'unauthorized' }, 401);
    }
    if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
    if (request.method === 'DELETE') {
      const response = json({ ok: true });
      for (const value of clearCookies(request)) response.headers.append('set-cookie', value);
      return response;
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string'
      || body.username.length > 64 || body.password.length > 128) return json({ ok: false, error: '账号或密码错误' }, 401);
    const user = await login(context, body.username, body.password);
    if (!user) return json({ ok: false, error: '账号或密码错误，或账号已停用' }, 401);
    return json({ ok: true, user: publicAccount(user) }, 200,
      { 'set-cookie': await sessionCookie(request, user) });
  } catch (error) {
    return json({ ok: false, error: error.message }, 503);
  }
}

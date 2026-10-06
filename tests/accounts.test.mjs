import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as session } from '../functions/api/session.js';
import { onRequest as accounts } from '../functions/api/accounts.js';
import { onRequest as data } from '../functions/api/data.js';
import { onRequest as icon } from '../functions/api/icon.js';

function fixture() {
  const store = new Map();
  const env = { NAV_ADMIN_PASSWORD: 'admin-test-password', NAV_KV: {
    get: async key => store.get(key) || null,
    put: async (key, value) => store.set(key, value),
    delete: async key => store.delete(key)
  } };
  async function call(handler, method = 'GET', body, cookie, query = '', extra = {}) {
    const headers = { ...extra };
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body instanceof Uint8Array) { payload = body; headers['content-type'] = 'image/png'; }
    else if (body !== undefined) { payload = JSON.stringify(body); headers['content-type'] = 'application/json'; }
    return handler({ request: new Request('https://nav.example/api/test' + query,
      { method, headers, body: payload }), env });
  }
  async function signIn(username, password = 'admin-test-password') {
    const response = await call(session, 'POST', { username, password });
    assert.equal(response.status, 200, await response.clone().text());
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { store, env, call, signIn };
}

const document = name => ({ version: 1, categories: [{ id: 'same-category', name, color: 1,
  links: [{ id: 'same-link', name: 'Example', url: 'https://example.com', desc: '' }] }] });

test('legacy configuration and manual icons belong only to admin; resets do not resurrect old icons', async () => {
  const f = fixture();
  const old = document('original');
  f.store.set('nav:data', JSON.stringify(old));
  f.store.set('icon:same-link', JSON.stringify({ manual: 1, ct: 'image/png', b64: 'AQID' }));
  const admin = await f.signIn('admin');
  const migrated = await f.call(data, 'GET', undefined, admin);
  assert.deepEqual((await migrated.json()).data, old);
  assert.deepEqual(JSON.parse(f.store.get('nav:data')), old);
  const oldIcon = await f.call(icon, 'GET', undefined, admin, '?id=same-link');
  assert.deepEqual(new Uint8Array(await oldIcon.arrayBuffer()), new Uint8Array([1, 2, 3]));
  assert.equal(await f.call(accounts, 'POST', { username: 'alice', password: 'alice-password' }, admin).then(r => r.status), 200);
  const alice = await f.signIn('alice', 'alice-password');
  assert.deepEqual((await (await f.call(data, 'GET', undefined, alice)).json()).data.categories, []);
  assert.equal((await f.call(icon, 'GET', undefined, alice, '?id=same-link')).status, 404);
  assert.equal((await f.call(icon, 'DELETE', undefined, admin, '?id=same-link')).status, 200);
  assert.deepEqual(JSON.parse(f.store.get('user:admin:icon:same-link')), { reset: 1 });
});

test('two accounts can save identical ids without sharing data or icons; caller account selector is ignored', async () => {
  const f = fixture();
  const admin = await f.signIn('admin');
  await f.call(accounts, 'POST', { username: 'alice', password: 'alice-password' }, admin);
  const alice = await f.signIn('alice', 'alice-password');
  assert.equal((await f.call(data, 'POST', document('admin private'), admin)).status, 200);
  assert.equal((await f.call(data, 'POST', { ...document('alice private'), username: 'admin' }, alice, '?user=admin')).status, 200);
  assert.equal((await (await f.call(data, 'GET', undefined, admin)).json()).data.categories[0].name, 'admin private');
  assert.equal((await (await f.call(data, 'GET', undefined, alice, '?user=admin')).json()).data.categories[0].name, 'alice private');
  await f.call(icon, 'POST', new Uint8Array([1, 2]), admin, '?id=same-link');
  await f.call(icon, 'POST', new Uint8Array([3, 4]), alice, '?id=same-link&user=admin');
  const a = await f.call(icon, 'GET', undefined, admin, '?id=same-link');
  const b = await f.call(icon, 'GET', undefined, alice, '?id=same-link');
  assert.deepEqual(new Uint8Array(await a.arrayBuffer()), new Uint8Array([1, 2]));
  assert.deepEqual(new Uint8Array(await b.arrayBuffer()), new Uint8Array([3, 4]));
  assert.equal(a.headers.get('cache-control'), 'private, no-store');
  assert.equal((await f.call(accounts, 'GET', undefined, alice)).status, 403);
  assert.equal((await f.call(accounts, 'POST', { username: 'mallory', password: 'mallory-password' }, alice)).status, 403);
});

test('password reset and disable revoke existing sessions; reactivation preserves configuration', async () => {
  const f = fixture();
  const admin = await f.signIn('admin');
  await f.call(accounts, 'POST', { username: 'alice', password: 'alice-password' }, admin);
  const old = await f.signIn('alice', 'alice-password');
  await f.call(data, 'POST', document('keep me'), old);
  assert.equal((await f.call(accounts, 'PATCH', { username: 'alice', action: 'password', password: 'new-password' }, admin)).status, 200);
  assert.equal((await f.call(data, 'GET', undefined, old)).status, 401);
  assert.equal((await f.call(session, 'POST', { username: 'alice', password: 'alice-password' })).status, 401);
  const current = await f.signIn('alice', 'new-password');
  await f.call(accounts, 'PATCH', { username: 'alice', action: 'status', disabled: true }, admin);
  assert.equal((await f.call(data, 'GET', undefined, current)).status, 401);
  assert.equal((await f.call(session, 'POST', { username: 'alice', password: 'new-password' })).status, 401);
  await f.call(accounts, 'PATCH', { username: 'alice', action: 'status', disabled: false }, admin);
  assert.equal((await f.call(data, 'GET', undefined, current)).status, 401);
  const renewed = await f.signIn('alice', 'new-password');
  assert.equal((await (await f.call(data, 'GET', undefined, renewed)).json()).data.categories[0].name, 'keep me');
  assert.equal((await f.call(accounts, 'PATCH', { username: 'admin', action: 'status', disabled: true }, admin)).status, 400);
});

test('only signed sessions authorize access; cookie, logout and request origin are enforced', async () => {
  const f = fixture();
  for (const handler of [data, icon, accounts]) {
    assert.equal((await f.call(handler)).status, 401);
    assert.equal((await f.call(handler, 'GET', undefined, 'nav_auth=legacy', '', { 'X-Password': 'admin-test-password' })).status, 401);
  }
  const loginResponse = await f.call(session, 'POST', { username: 'admin', password: 'admin-test-password' });
  const cookie = loginResponse.headers.get('set-cookie');
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(cookie.includes(attribute));
  const signed = cookie.split(';')[0];
  assert.equal((await f.call(data, 'GET', undefined, signed.replace('admin.', 'alice.'))).status, 401);
  assert.equal((await f.call(data, 'GET', undefined, signed.replace(/\.\d+\./, '.1000000000.'))).status, 401);
  assert.equal((await f.call(data, 'POST', document('bad'), signed, '', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.call(accounts, 'POST', { username: 'evil', password: 'evil-password' }, signed, '', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.call(session, 'POST', { username: 'admin', password: 'admin-test-password' }, undefined, '', { origin: 'https://evil.example' })).status, 403);
  const logout = await f.call(session, 'DELETE', undefined, signed);
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
  assert.equal((await f.call(session)).status, 401);
});

test('account validation, credential privacy, persisted bootstrap and own password changes', async () => {
  const f = fixture();
  const admin = await f.signIn('admin');
  assert.equal((await f.call(accounts, 'POST', { username: 'aa', password: 'long-password' }, admin)).status, 400);
  assert.equal((await f.call(accounts, 'POST', { username: 'alice', password: 'short' }, admin)).status, 400);
  assert.equal((await f.call(accounts, 'POST', { username: ' ADMIN ', password: 'long-password' }, admin)).status, 409);
  const visible = await (await f.call(accounts, 'GET', undefined, admin)).text();
  for (const secret of ['passwordHash', 'sessionKey', 'salt', 'admin-test-password']) assert.ok(!visible.includes(secret));
  assert.ok(!f.store.get('auth:users').includes('admin-test-password'));
  f.env.NAV_ADMIN_PASSWORD = 'different-env-password';
  await f.signIn('admin');
  const response = await f.call(accounts, 'PATCH', { username: 'admin', action: 'password', password: 'updated-admin-password' }, admin);
  assert.equal((await response.json()).reauthenticate, true);
  assert.equal((await f.call(data, 'GET', undefined, admin)).status, 401);
  await f.signIn('admin', 'updated-admin-password');
});

test('bad data cannot replace a valid account document, unsupported methods match production', async () => {
  const f = fixture();
  const admin = await f.signIn('admin');
  await f.call(data, 'POST', document('valid'), admin);
  const bad = document('bad'); bad.categories[0].links[0].url = 'javascript:alert(1)';
  assert.equal((await f.call(data, 'POST', bad, admin)).status, 400);
  assert.equal((await f.call(data, 'POST', { categories: [{ id: 'x', name: 'bad', links: [null] }] }, admin)).status, 400);
  assert.equal((await (await f.call(data, 'GET', undefined, admin)).json()).data.categories[0].name, 'valid');
  assert.equal((await f.call(data, 'DELETE', undefined, admin)).status, 405);
  assert.equal((await f.call(accounts, 'DELETE', undefined, admin)).status, 405);
});

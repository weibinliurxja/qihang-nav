// Shared account/session boundary. Client-supplied account ids never select a data namespace.
export const COOKIE = 'nav_session';
const USERS = 'auth:users';
const encoder = new TextEncoder();
const SESSION_SECONDS = 7 * 24 * 3600;

export function kvOf(context) {
  if (typeof NAV_KV !== 'undefined' && NAV_KV) return NAV_KV;
  return context.env && context.env.NAV_KV;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers
  } });
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return (!origin || origin === new URL(request.url).origin)
    && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validUsername(value) { return /^[a-z0-9][a-z0-9_-]{2,31}$/.test(value); }
export function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function hex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }
function randomHex() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000
  }, key, 256)));
}

export async function credentials(password) {
  const salt = randomHex();
  return { salt, passwordHash: await passwordHash(password, salt), sessionKey: randomHex() };
}

export async function accounts(context) {
  const KV = kvOf(context);
  if (!KV) throw new Error('KV 未绑定：请绑定 NAV_KV');
  const raw = await KV.get(USERS);
  if (raw) return JSON.parse(raw);
  // Bootstrap only while no account registry exists. Never reset a stored password from env.
  const password = context.env && (context.env.NAV_ADMIN_PASSWORD || context.env.NAV_PASSWORD);
  if (!password) throw new Error('请配置 NAV_ADMIN_PASSWORD 以初始化 admin 账号');
  const users = [{ id: 'admin', username: 'admin', role: 'admin', disabled: false,
    createdAt: Date.now(), ...await credentials(password) }];
  await KV.put(USERS, JSON.stringify(users));
  return users;
}

export async function saveAccounts(context, users) {
  await kvOf(context).put(USERS, JSON.stringify(users));
}

export function publicAccount(user) {
  return { username: user.username, role: user.role, disabled: !!user.disabled, createdAt: user.createdAt };
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

function cookie(request, value, seconds) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return COOKIE + '=' + value + '; HttpOnly; Path=/; SameSite=Strict; Max-Age=' + seconds + secure;
}

export async function sessionCookie(request, user) {
  const payload = user.username + '.' + Math.floor(Date.now() / 1000 + SESSION_SECONDS);
  return cookie(request, payload + '.' + await sign(payload, user.sessionKey), SESSION_SECONDS);
}

export function clearCookies(request) {
  return [cookie(request, '', 0), 'nav_auth=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'];
}

export async function authenticate(context) {
  const raw = context.request.headers.get('cookie') || '';
  const match = /(?:^|;\s*)nav_session=([^;]+)/.exec(raw);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length !== 3 || !validUsername(parts[0]) || !/^\d{10}$/.test(parts[1])) return null;
  if (Number(parts[1]) <= Date.now() / 1000) return null;
  const user = (await accounts(context)).find(u => u.username === parts[0]);
  if (!user || user.disabled) return null;
  return equal(parts[2], await sign(parts[0] + '.' + parts[1], user.sessionKey)) ? user : null;
}

export async function login(context, username, password) {
  const user = (await accounts(context)).find(u => u.username === normalizeUsername(username));
  // Also hash failed usernames; login errors do not reveal which accounts exist.
  const computed = await passwordHash(typeof password === 'string' ? password : '', user ? user.salt : 'unknown-account');
  return user && !user.disabled && equal(user.passwordHash, computed) ? user : null;
}

export function dataKey(user) { return 'user:' + user.id + ':data'; }
export function iconKey(user, id) { return 'user:' + user.id + ':icon:' + id; }

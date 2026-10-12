/**
 * Sign In to CashBookBD: how many messages does one failed login show?
 *
 *     set CHECK_ENTRY=_login_network_error_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_login_network_error_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * A login that fails at the network layer used to leave two toasts on screen:
 * the response interceptor's "Network error — please check your connection and
 * try again." and, underneath it, the login thunk repeating axios's own
 * "Network Error" through the SignIn screen's error effect. The interceptor
 * tags what it has shown (error.toastReported) so the thunk can stay quiet; the
 * risk is that it stays quiet for the wrong errors too and the user is left
 * with no message at all. So the real interceptor, the real thunk and the real
 * reducer are run here and both the toasts and the resulting state are read back.
 */

// Must exist before any module is evaluated (js-cookie, react-toastify, the
// interceptor all reach for one of these).
let cookieJar = '';
(globalThis as any).document = {
  get cookie() {
    return cookieJar;
  },
  set cookie(value: string) {
    cookieJar = value;
  },
};
(globalThis as any).window = {
  location: { protocol: 'https:', pathname: '/login', hostname: 'app.cashbookbd.com', href: '/' },
};
(globalThis as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  },
  removeItem(key: string) {
    delete this.store[key];
  },
};

import { toast } from 'react-toastify';
import authReducer, { login } from './src/features/authReducer';
import httpService from './src/components/services/httpService';
import { API_BASE_URL, API_LOGIN_URL } from './src/components/services/apiRoutes';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let pass = 0;
let fail = 0;

const check = (label: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
};

// Capture every toast instead of painting one.
const toasts: { msg: string; opts: any }[] = [];
(toast as any).error = (msg: string, opts: any) => {
  toasts.push({ msg, opts });
  return 'id';
};
(toast as any).info = (msg: string, opts: any) => {
  toasts.push({ msg, opts });
  return 'id';
};

// Run the real thunk, folding each dispatched action through the real reducer.
const runLogin = async (adapter: (config: any) => Promise<any>) => {
  httpService.defaults.adapter = adapter as any;
  let state: any = authReducer(undefined, { type: '@@INIT' });
  const dispatch = (action: any) => {
    state = authReducer(state, action);
    return action;
  };
  await login({ loginId: 'user@example.com', password: 'secret' })(dispatch);
  return state;
};

// An axios-shaped network failure: rejection with no `response`.
const networkFailure = async () => {
  const err: any = new Error('Network Error');
  err.code = 'ERR_NETWORK';
  err.isAxiosError = true;
  throw err;
};

// An axios-shaped server failure: rejection carrying a `response`.
const serverFailure = (status: number, data: any) => async () => {
  const err: any = new Error('Request failed');
  err.isAxiosError = true;
  err.response = { status, data, headers: {}, config: {} };
  throw err;
};

const main = async () => {
  console.log('Sign In — failed-login messaging\n');

  // ── Network failure: exactly one message, the interceptor's ───────────────
  toasts.length = 0;
  const netState = await runLogin(networkFailure);
  check(
    'a network failure shows exactly one toast',
    toasts.length === 1,
    `saw ${toasts.length}: ${JSON.stringify(toasts.map((t) => t.msg))}`,
  );
  check(
    'that one toast is the connection message',
    toasts[0]?.msg === 'Network error — please check your connection and try again.',
    JSON.stringify(toasts[0]?.msg),
  );
  check(
    'the login thunk does not queue a second error for SignIn to show',
    netState.errors === null,
    `errors=${JSON.stringify(netState.errors)}`,
  );
  check('the spinner is cleared', netState.isLoading === false);

  // ── Server failure (500): the thunk still reports it, once ────────────────
  toasts.length = 0;
  const srvState = await runLogin(serverFailure(500, { message: 'Server exploded' }));
  check(
    'a 500 is not swallowed — the interceptors leave it to the caller',
    toasts.length === 0,
    JSON.stringify(toasts.map((t) => t.msg)),
  );
  check(
    'the caller surfaces the server message (SignIn toasts this once)',
    srvState.errors?.message === 'Server exploded',
    JSON.stringify(srvState.errors),
  );

  // ── 422 validation: unchanged ─────────────────────────────────────────────
  const valState = await runLogin(serverFailure(422, { message: 'The credentials do not match.' }));
  check(
    'validation errors still reach SignIn',
    valState.errors?.message === 'The credentials do not match.',
    JSON.stringify(valState.errors),
  );

  // ── Device limit 403: still the device chooser, no generic toast ──────────
  toasts.length = 0;
  const devState = await runLogin(
    serverFailure(403, { error: { code: 10010, message: 'Device limit reached.' }, data: { device_limit: 2, devices: [{ id: 7 }] } }),
  );
  check('the device-limit 403 shows no toast over the chooser', toasts.length === 0);
  check(
    'the device limit is still captured for the chooser',
    devState.deviceLimit !== null && devState.deviceLimit.devices[0].id === 7,
    JSON.stringify(devState.deviceLimit),
  );

  // ── A 401 from the login call is not a session expiry ─────────────────────
  // Stale token present and the page is NOT /login (so the pathname guard would
  // not save us): a 401 from the login endpoint must not trip the interceptor's
  // session-expired redirect, which reloads the page and wipes the form.
  (globalThis as any).window.location.pathname = '/dashboard';
  (globalThis as any).window.location.href = '/dashboard';
  cookieJar = '_trio_lead_token=stale-token';
  const loginUrl401 = async () => {
    const err: any = new Error('Unauthorized');
    err.isAxiosError = true;
    err.config = { url: API_LOGIN_URL };
    err.response = { status: 401, data: { message: 'Invalid username or password!' }, headers: {}, config: err.config };
    throw err;
  };
  const staleState = await runLogin(loginUrl401);
  await sleep(700); // the interceptor redirects on a 600ms timer; give it time
  check(
    'a 401 from the login endpoint does not redirect/reload',
    (globalThis as any).window.location.href === '/dashboard',
    `href=${(globalThis as any).window.location.href}`,
  );
  check(
    'the sign-in failure is still surfaced to the caller',
    staleState.errors?.message === 'Invalid username or password!',
    JSON.stringify(staleState.errors),
  );

  // ── A 401 from any other endpoint still expires the session ───────────────
  (globalThis as any).window.location.href = '/dashboard';
  cookieJar = '_trio_lead_token=stale-token';
  httpService.defaults.adapter = (async (config: any) => {
    const err: any = new Error('Unauthorized');
    err.isAxiosError = true;
    err.config = config;
    err.response = { status: 401, data: {}, headers: {}, config };
    throw err;
  }) as any;
  await httpService.get(`${API_BASE_URL}/dashboard-summary`).catch(() => {});
  await sleep(700);
  check(
    'a 401 from another endpoint still redirects to /login (session expiry)',
    (globalThis as any).window.location.href === '/login',
    `href=${(globalThis as any).window.location.href}`,
  );

  // ── Success path: unchanged ───────────────────────────────────────────────
  const okState = await runLogin(async () => ({
    status: 200,
    data: { success: true, data: { token: 'tok-123', user: { id: 1 } } },
    headers: {},
    config: {},
  }));
  check('a successful login still signs in', okState.isLoggedIn === true && okState.errors === null);
  check('a successful login stores the token', cookieJar.includes('_trio_lead_token=tok-123'), cookieJar);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * The Demo Login Accounts table appears on ONE hostname, and only that one.
 *
 *     set CHECK_ENTRY=_demo_login_accounts_check.ts
 *     npx vite build --config vite.check.config.js && node dist-check/_demo_login_accounts_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * The demo credentials are PUBLIC working logins, so the danger is not that the
 * table fails to render -- it is that it renders somewhere it should not. A
 * suffix or substring test (`endsWith('staging.cashbookbd.com')`,
 * `includes('cashbookbd')`) would light it up on production, on localhost, and
 * on every tenant subdomain whose name merely contains the string. So the real
 * component is rendered here against a battery of hostnames -- look-alikes
 * included -- and the markup it produces is read back.
 *
 * The render also pins what a visitor must see: the four named columns, the
 * first row, the password in full, and one non-submitting Use Login button per
 * entry. And the sign-in screen is read statically to confirm the button only
 * fills the fields -- the existing login flow is untouched.
 */

// Before any module is evaluated: the component reads window.location.hostname.
(globalThis as any).window = { location: { hostname: 'accounts.staging.cashbookbd.com' } };

import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DemoLoginAccounts, {
  DEMO_ACCOUNTS_HOSTNAME,
  DEMO_LOGIN_ACCOUNTS,
  shouldShowDemoLoginAccounts,
} from './src/pages/Authentication/DemoLoginAccounts';

const setHost = (hostname: string) => {
  (globalThis as any).window = { location: { hostname } };
};

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

const render = () =>
  renderToStaticMarkup(React.createElement(DemoLoginAccounts, { onUseLogin: () => {} }));

/** Every hostname the table must stay hidden on. */
const HIDDEN_HOSTS = [
  'localhost',
  '127.0.0.1',
  'app.cashbookbd.com',
  'www.cashbookbd.com',
  'cashbookbd.com',
  'accounts.cashbookbd.com',
  'accounts.prod.cashbookbd.com',
  'accounts.staging.cashbookbd.com.evil.example',
  'evil-accounts.staging.cashbookbd.com',
  'sub.accounts.staging.cashbookbd.com',
  'accounts.staging.cashbookbd.org',
  'accounts.staging.cashbookbd.com.attacker.net',
  'ACCOUNTS.STAGING.CASHBOOKBD.COM',
  ' accounts.staging.cashbookbd.com',
  'accounts.staging.cashbookbd.com ',
  'accounts.staging.cashbookbd.com.',
  '',
];

const main = () => {
  console.log('Demo Login Accounts — exact-hostname gate\n');

  check(
    'the gate names the staging accounts host',
    DEMO_ACCOUNTS_HOSTNAME === 'accounts.staging.cashbookbd.com',
    DEMO_ACCOUNTS_HOSTNAME,
  );
  check(
    'the exact hostname is allowed',
    shouldShowDemoLoginAccounts('accounts.staging.cashbookbd.com') === true,
  );

  for (const host of HIDDEN_HOSTS) {
    check(
      `hidden on "${host || '(empty)'}"`,
      shouldShowDemoLoginAccounts(host) === false,
    );
  }

  /* -- shown on the one hostname, and carrying what a visitor needs --------- */

  setHost('accounts.staging.cashbookbd.com');
  const shown = render();

  check('the table renders on the staging host', shown.includes('Demo Login Accounts'));

  for (const header of ['Sl. No.', 'Business Type', 'User', 'Password']) {
    check(`column "${header}" is present`, shown.includes(header));
  }

  check('the first row names the business type', shown.includes('Rod, Cement, Bricks'));

  const emails = (shown.match(/rodcement@gmail\.com/g) || []).length;
  check(
    'the demo email and password are both shown in full',
    emails === 2,
    `saw ${emails} occurrence(s)`,
  );

  const buttons = (shown.match(/Use Login/g) || []).length;
  check(
    'each entry carries a Use Login button',
    buttons === DEMO_LOGIN_ACCOUNTS.length,
    `${buttons} button(s) for ${DEMO_LOGIN_ACCOUNTS.length} entr(ies)`,
  );
  check(
    'the Use Login button cannot submit a form',
    /<button[^>]*type="button"[^>]*>(?:(?!<\/button>)[\s\S])*Use Login/.test(shown),
  );

  const listShape = DEMO_LOGIN_ACCOUNTS[0];
  check(
    'the entries are a structured list (businessType/loginId/password)',
    !!listShape &&
      typeof listShape.businessType === 'string' &&
      typeof listShape.loginId === 'string' &&
      typeof listShape.password === 'string',
  );

  /* -- hidden everywhere else: nothing at all, not a styled-away table ------ */

  for (const host of HIDDEN_HOSTS) {
    setHost(host);
    check(`renders nothing on "${host || '(empty)'}"`, render() === '');
  }

  /* -- the sign-in screen only fills the fields ----------------------------- */

  const signIn = readFileSync('src/pages/Authentication/SignIn.tsx', 'utf8');

  check(
    'SignIn renders the table below the form card',
    /<\/form>\s*<\/div>[\s\S]{0,400}?<DemoLoginAccounts onUseLogin=\{handleUseDemoAccount\} \/>/.test(signIn),
  );

  const handler = signIn.slice(
    signIn.indexOf('const handleUseDemoAccount'),
    signIn.indexOf('const submitLogin'),
  );
  check('the handler writes the login id and password', /loginId,\s*password/.test(handler));
  check('the handler only sets form state', /setFormData\(/.test(handler));
  check(
    'the handler never submits or dispatches (login behaviour unchanged)',
    !/submitLogin\(|dispatch\(/.test(handler),
    handler,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

main();

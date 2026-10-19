/**
 * Ctrl + U: does it press the screen's Update button, everywhere, once?
 *
 *     node _ctrl_u_update_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. The shortcut is one app-wide listener that clicks the
 * visible Update button. Three quiet mistakes: it can fire twice (one key-hold
 * saving twice), it can pick a button that is not on screen (a print copy, a
 * closed dropdown), and a screen can grow a second listener of its own, so one
 * key press runs two submissions. Each is asserted here.
 *
 * Pure static reading of the files, so it runs on any node.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const HOOK = 'src/components/utils/hooks/useCtrlUUpdate.ts';
const LAYOUT = 'src/layout/DefaultLayout.tsx';
const PRODUCT = 'src/components/modules/product/AddProduct.tsx';
const CUSTOMER = 'src/components/modules/customer-supplier/EditCustomerSupplier.tsx';
const PRODUCT_LIST = 'src/components/modules/product/Product.tsx';

for (const path of [HOOK, LAYOUT, PRODUCT, CUSTOMER, PRODUCT_LIST]) {
  assert.ok(existsSync(path), `${path} is missing`);
}

const hook = read(HOOK);
const layout = read(LAYOUT);
const product = read(PRODUCT);
const customer = read(CUSTOMER);
const productList = read(PRODUCT_LIST);

/* -- mounted once, for every signed-in screen -------------------------------- */

assert.ok(
  /import useCtrlUUpdate from '.*useCtrlUUpdate'/.test(layout) &&
    /useCtrlUUpdate\(\);/.test(layout),
  'DefaultLayout does not mount the shortcut -- no screen gets Ctrl+U',
);

/* -- bound to Ctrl+U, capture phase, default suppressed ---------------------- */

assert.ok(
  /document\.addEventListener\('keydown', onKeyDown, true\)/.test(hook),
  'the shortcut is not bound in the capture phase -- a field could swallow it',
);
assert.ok(
  /!\(event\.ctrlKey \|\| event\.metaKey\)/.test(hook),
  'the shortcut does not require Ctrl (or Cmd)',
);
assert.ok(
  /event\.key !== 'u' && event\.key !== 'U' && event\.code !== 'KeyU'/.test(hook),
  'the shortcut does not check for the U key (key and code)',
);
assert.ok(
  /event\.repeat\) return;/.test(hook),
  '⚠️ a held key repeats -- the save would run again on every repeat',
);
assert.ok(
  /event\.preventDefault\(\);[\s\S]{0,120}\.click\(\)/.test(hook),
  '⚠️ the browser default (View Source) is not suppressed before the click',
);
assert.ok(
  /return \(\) => document\.removeEventListener\('keydown', onKeyDown, true\)/.test(hook),
  'the listener is not removed on unmount',
);

/* -- it presses the real Update button, and only a usable one ---------------- */

assert.ok(
  /\^update\\b\/i\.test\(/.test(hook),
  'the Update button is not found by its label',
);
assert.ok(
  /button\.disabled/.test(hook),
  'a disabled Update button would be pressed',
);
assert.ok(
  /getBoundingClientRect\(\)/.test(hook),
  '⚠️ hidden copies (print sheets, closed dropdowns) are not filtered out',
);
assert.ok(
  /\.pop\(\);/.test(hook),
  'the first match is pressed, not the last -- behind an open dialog that is the wrong button',
);
assert.ok(
  /if \(!update\) return;/.test(hook),
  'a screen with no Update button does not fall back to the browser',
);

/* -- one mechanism only: the screens must not bind their own ----------------- */

for (const [name, source] of [['AddProduct', product], ['EditCustomerSupplier', customer], ['Product List', productList]]) {
  assert.ok(
    !/addEventListener\('keydown'/.test(source),
    `⚠️ ${name} binds its own keydown -- one Ctrl+U would run two saves`,
  );
}

/* -- the two screens done by hand still advertise the shortcut --------------- */

for (const [name, source] of [['AddProduct', product], ['EditCustomerSupplier', customer]]) {
  assert.ok(
    /label="Update \(Ctrl \+ U\)"/.test(source),
    `${name}: the Update button does not read "Update (Ctrl + U)"`,
  );
}

console.log('ok -- Ctrl + U presses the visible Update button on every screen, once per press');

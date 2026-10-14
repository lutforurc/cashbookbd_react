/**
 * Add Product's Measurement (and Package Size) must take a number exactly as a
 * person writes it -- an integer or a decimal, with or without the leading zero
 * ("1", "1.00", "0", ".67", "0.67", "10.50", "0.01") -- and send and save it
 * without losing or reshaping it. Empty must stay empty, never become 0.
 *
 *   node _product_measurement_decimal_check.mjs
 *
 * Exit 0 when it does.
 *
 * ⚠️ WHY THIS EXISTS. Three separate things used to eat the value:
 *   1. The boxes were `type="number"`. A number input sanitises a half-typed
 *      figure -- the browser reads "0." (or "1.", or ".") as not a number and
 *      reports the value as "", so a controlled React box re-rendered empty and
 *      a decimal could never be typed at all.
 *   2. Both the form and the API asked for a leading digit
 *      (`^\d+(\.\d{1,2})?$`), so ".67" -- 0.67 without its zero -- was refused
 *      rather than read as 0.67.
 *   3. The boxes were drawn with a truthy test (`value={v ? v.toString() : ''}`),
 *      so a real 0 rendered as a blank box; and both sides refused 0 outright
 *      ("greater than zero"). A typed 0 is now kept, while empty stays NULL.
 *
 * The check reads the real files: the input attributes, the pattern the form
 * validates with, the request it sends, and (when the API repo is beside this
 * one) the pattern the API validates with. Pure static reading, so it runs on
 * any node; the API half is skipped when that repo is not present.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const FORM = 'src/components/modules/product/AddProduct.tsx';

const source = readFileSync(FORM, 'utf8');

/** A JS `/…/` literal plucked from source, as the RegExp it really is. */
const asPattern = (literal) => {
  const end = literal.lastIndexOf('/');
  return new RegExp(literal.slice(1, end), literal.slice(end + 1));
};

/* -- the boxes no longer sanitise the decimal away -------------------------- */

for (const id of ['measurement', 'package_size']) {
  const block = source.match(
    new RegExp(`<InputElement[^>]*id="${id}"[\\s\\S]*?/>`),
  );
  assert.ok(block, `the ${id} field was not found`);
  assert.ok(
    /inputMode="decimal"/.test(block[0]),
    `${id} is not marked up as a decimal field`,
  );
  assert.ok(
    !/type="number"/.test(block[0]),
    `${id} is still type="number" -- the browser wipes a half-typed "0."`,
  );
  assert.ok(
    /value=\{formData\.\w+ \?\? ''\}/.test(block[0]),
    `${id} still uses a truthy value test -- a real 0 would render blank`,
  );
}

/* -- the rule takes every written form, and still refuses a third decimal --- */

const declared = source.match(/const decimalPattern = (\/.*?\/);/);
assert.ok(declared, 'the form no longer declares its decimal pattern');
const decimalPattern = asPattern(declared[1]);

for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '.5', '0.01', '10.50', '10.5', '5']) {
  assert.ok(decimalPattern.test(good), `the form refuses a valid ${good}`);
}
for (const bad of ['.', '5.678', '10.', 'abc', '-1']) {
  assert.ok(!decimalPattern.test(bad), `the form accepts an invalid ${bad}`);
}

// Zero is no longer refused for being zero.
assert.ok(
  !/greater than zero/.test(source),
  'the form still refuses zero as "greater than zero"',
);

/* -- ".67" goes out as "0.67", from both the Add and the Edit path ---------- */

assert.ok(
  /const withLeadingZero = \(value: any\): any => \{[\s\S]*?startsWith\('\.'\)[\s\S]*?`0\$\{text\}`[\s\S]*?\};/.test(
    source,
  ),
  'there is no helper giving a leading-dot value its zero',
);

// Run the real helper, not a copy: only its two type annotations are stripped.
const helperJs = source
  .match(/const withLeadingZero = (\(value: any\): any => \{[\s\S]*?\n\});/)[1]
  .replace('(value: any): any =>', '(value) =>');
const withLeadingZero = eval(`(${helperJs})`);

assert.equal(withLeadingZero('.67'), '0.67', '".67" was not sent as "0.67"');
assert.equal(withLeadingZero('0.67'), '0.67', 'a normal decimal was changed');
assert.equal(withLeadingZero('1.00'), '1.00', 'a trailing zero was dropped');
assert.equal(withLeadingZero('1'), '1', 'an integer was changed');
assert.equal(withLeadingZero('0'), '0', 'a typed 0 was dropped');
assert.equal(withLeadingZero(''), '', 'empty was turned into something else');
assert.equal(
  withLeadingZero(null),
  null,
  'empty was turned into something else',
);
assert.equal(
  withLeadingZero(undefined),
  undefined,
  'empty was turned into something else',
);
assert.equal(
  (source.match(/withLeadingZero\(formData\.measurement\)/g) || []).length,
  2,
  'measurement is not normalised on both the store and the update path',
);
assert.equal(
  (source.match(/withLeadingZero\(formData\.package_size\)/g) || []).length,
  2,
  'package_size is not normalised on both the store and the update path',
);
assert.ok(/storeProduct\(payload/.test(source), 'the store path still sends the raw form');
assert.ok(/updateProduct\(payload/.test(source), 'the update path still sends the raw form');

/* -- the API agrees, when its repo sits beside this one --------------------- */

const API =
  process.env.CASHBOOK_API_ITEM_CONTROLLER ||
  '../cashbook_api/app/Http/Controllers/Products/ItemController.php';

if (existsSync(API)) {
  const api = readFileSync(API, 'utf8');
  const rule = api.match(/preg_match\('(\/\^.*?\/)', trim\(\(string\) \$value\)\)/);
  assert.ok(rule, 'the API no longer validates a measurement as a decimal');
  const apiPattern = asPattern(rule[1]);

  for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '10.50', '0.01']) {
    assert.ok(apiPattern.test(good), `the API refuses a valid ${good}`);
  }
  for (const bad of ['.', '5.678', '10.', '-1']) {
    assert.ok(!apiPattern.test(bad), `the API accepts an invalid ${bad}`);
  }
  assert.ok(
    !/must be greater than zero/.test(api),
    'the API still refuses zero as "greater than zero"',
  );
} else {
  console.log(`skip -- the API repo is not at ${API}`);
}

console.log(
  'ok -- Measurement/Package Size take 1, 1.00, 0, .67, 0.67, 10.50 and 0.01 as typed, ".67" is sent as 0.67, a real 0 renders and is kept, empty stays empty, and a third decimal is refused on both sides',
);

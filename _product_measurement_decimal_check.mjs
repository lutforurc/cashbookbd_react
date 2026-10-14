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
 *   2. Both the form and the API asked for a digit
 *      (`^\d+(\.\d{1,2})?$`), so ".67" -- 0.67 without its zero -- was refused
 *      rather than read as 0.67.
 *   3. The boxes were drawn with a truthy test (`value={v ? v.toString() : ''}`),
 *      so a real 0 rendered as a blank box; and both sides refused 0 outright
 *      ("greater than zero"). A typed 0 is now kept, while empty stays NULL.
 *
 * ⚠️ THE TWO FIELDS HAVE DIFFERENT SCALES. A MEASUREMENT is DECIMAL(18,3) -- a
 * sold piece may measure 0.667 -- while PACKAGE SIZE stays DECIMAL(18,2). So a
 * third decimal is accepted on Measurement (0.667) and still refused on Package
 * Size (0.667 is out of spec there); a fourth decimal is refused on both.
 *
 * The check reads the real files: the input attributes, the two patterns the
 * form validates with, the request it sends, and (when the API repo is beside
 * this one) the two patterns the API validates with. Pure static reading, so it
 * runs on any node; the API half is skipped when that repo is not present.
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

/* -- each field carries its own scale rule ---------------------------------- */

const measurementDeclared = source.match(/const measurementPattern = (\/.*?\/);/);
assert.ok(measurementDeclared, 'the form no longer declares its measurement pattern');
const measurementPattern = asPattern(measurementDeclared[1]);

const packageDeclared = source.match(/const packageSizePattern = (\/.*?\/);/);
assert.ok(packageDeclared, 'the form no longer declares its package size pattern');
const packageSizePattern = asPattern(packageDeclared[1]);

// A measurement takes three decimals: 0.667 is kept whole.
for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '.667', '0.667', '0.333', '1.125', '0.01', '10.50', '10.5', '10.500', '5']) {
  assert.ok(measurementPattern.test(good), `the form refuses a valid measurement ${good}`);
}
for (const bad of ['.', '0.6667', '5.6789', '1.2345', '10.', 'abc', '-1']) {
  assert.ok(!measurementPattern.test(bad), `the form accepts an invalid measurement ${bad}`);
}

// A package size still takes two: a third decimal is refused there.
for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '0.01', '10.50', '10.5', '5']) {
  assert.ok(packageSizePattern.test(good), `the form refuses a valid package size ${good}`);
}
for (const bad of ['.', '0.667', '5.678', '10.', 'abc', '-1']) {
  assert.ok(!packageSizePattern.test(bad), `the form accepts an invalid package size ${bad}`);
}

// Zero is no longer refused for being zero, on either field.
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
assert.equal(withLeadingZero('.667'), '0.667', '".667" was not sent as "0.667"');
assert.equal(withLeadingZero('0.667'), '0.667', 'a normal decimal was changed');
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

  const apiMeasurement = api.match(/MEASUREMENT_DECIMAL_PATTERN = '(\/\^.*?\/)';/);
  assert.ok(apiMeasurement, 'the API no longer declares a measurement decimal pattern');
  const apiMeasurementPattern = asPattern(apiMeasurement[1]);

  const apiPackage = api.match(/PACKAGE_SIZE_DECIMAL_PATTERN = '(\/\^.*?\/)';/);
  assert.ok(apiPackage, 'the API no longer declares a package size decimal pattern');
  const apiPackageSizePattern = asPattern(apiPackage[1]);

  for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '.667', '0.667', '0.333', '1.125', '0.01', '10.50', '10.5']) {
    assert.ok(apiMeasurementPattern.test(good), `the API refuses a valid measurement ${good}`);
  }
  for (const bad of ['.', '0.6667', '5.6789', '10.', '-1']) {
    assert.ok(!apiMeasurementPattern.test(bad), `the API accepts an invalid measurement ${bad}`);
  }

  for (const good of ['1', '1.00', '0', '0.00', '.67', '0.67', '0.01', '10.50', '10.5']) {
    assert.ok(apiPackageSizePattern.test(good), `the API refuses a valid package size ${good}`);
  }
  for (const bad of ['.', '0.667', '5.678', '10.', '-1']) {
    assert.ok(!apiPackageSizePattern.test(bad), `the API accepts an invalid package size ${bad}`);
  }

  assert.ok(
    /decimalFieldError\(\$measurement, 'Measurement', self::MEASUREMENT_DECIMAL_PATTERN, 'three'\)/.test(api),
    'the API does not apply the three-decimal pattern to the measurement',
  );
  assert.ok(
    /decimalFieldError\(\$packageSize, 'Package size', self::PACKAGE_SIZE_DECIMAL_PATTERN, 'two'\)/.test(api),
    'the API does not apply the two-decimal pattern to the package size',
  );
  assert.ok(
    !/must be greater than zero/.test(api),
    'the API still refuses zero as "greater than zero"',
  );
} else {
  console.log(`skip -- the API repo is not at ${API}`);
}

console.log(
  'ok -- Measurement takes 1, 1.00, 0, .667, 0.667, 0.333, 1.125, 0.01 as typed while Package Size stays at two decimals, ".67" is sent as 0.67, a real 0 renders and is kept, empty stays empty, and a fourth decimal is refused on both sides',
);

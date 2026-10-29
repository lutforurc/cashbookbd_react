/**
 * Ledger / Ledger Details Action permissions: Edit, Approve and Remove Approval
 * must be authorized per voucher TYPE on the client, and independently enforced
 * by the API.
 *
 *   node _ledger_action_permissions_check.mjs
 *
 * Exit 0 when they are.
 *
 * ⚠️ WHY THIS EXISTS. A button that shows without a permission, or an API that
 * trusts one, is invisible until somebody exercises it -- and the reports are
 * the one screen where every voucher type (cash, bank, sales, purchase, journal
 * and the two returns) sits in a single list. A generic "can edit" that leaks
 * sales.edit onto a purchase row, or a permission the client checks and the
 * server does not, both look exactly like the correct thing on screen.
 *
 * Static reading of the files, as the other checks here are. The API is read
 * live across the repo boundary, never from a copy under temp/, so a stale copy
 * cannot let this pass while the server that answers the screen differs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

let checked = 0;
const check = (title, fn) => {
  fn();
  checked += 1;
  console.log(`  ok  ${title}`);
};

/* -- the client's per-type edit table --------------------------------------- */

const helper = read('src/components/utils/utils-functions/voucherEditPermission.ts');

check('the client maps every voucher type to its own edit permission', () => {
  assert.ok(
    helper.includes("isBank ? 'bank.received.edit' : 'cash.received.edit'"),
    'the 1- pair does not split cash from bank received',
  );
  assert.ok(
    helper.includes("isBank ? 'bank.payment.edit' : 'cash.payment.edit'"),
    'the 2- pair does not split cash from bank payment',
  );
  for (const name of [
    "'sales.edit'",
    "'purchase.edit'",
    "'journal.edit'",
    "'purchase.return.edit'",
    "'sales.return.edit'",
  ]) {
    assert.ok(helper.includes(name), `the client never maps ${name}`);
  }
  assert.ok(
    helper.includes("case '3':") && helper.includes("case '10':"),
    'a credit sale (10-) is not treated as a sale',
  );
  assert.ok(
    helper.includes("case '4':") && helper.includes("case '9':"),
    'a credit purchase (9-) is not treated as a purchase',
  );
});

/* -- both reports ask the row's own type, not one generic right -------------- */

const screens = {
  Ledger: read('src/components/modules/reports/ledger/Ledger.tsx'),
  'Ledger Details': read(
    'src/components/modules/reports/ledger-with-product/LedgerWithProduct.tsx',
  ),
};

for (const [name, source] of Object.entries(screens)) {
  check(`${name} gates Edit on the row's voucher type`, () => {
    assert.ok(
      source.includes('canEditVoucherRow(userPermissions, row)'),
      `${name} does not ask the row which permission its type demands`,
    );
    assert.ok(
      /canShowEditAction=\{mayEditRow && !isApproved\}/.test(source),
      `${name} still shows Edit on a generic right, not the row's type`,
    );
    // The old OR-list of edit permissions has no place left in the screen.
    assert.ok(
      !source.includes("'cash.payment.edit',"),
      `${name} still carries the generic edit-permission list`,
    );
  });
}

check('the journal (5-) is offered no Edit -- it has no update endpoint', () => {
  const listMatch = /const EDITABLE_VOUCHER_PREFIXES = \[([^\]]*)\]/.exec(helper);
  assert.ok(listMatch, 'there is no list of report-editable voucher types');
  assert.ok(
    !listMatch[1].includes("'5'"),
    '5- is offered an Edit whose save cannot land on the voucher',
  );
  // The server mirror keeps the journal mapping -- the list, not the permission,
  // is what withholds the button.
  assert.ok(
    helper.includes("case '5':") && helper.includes("'journal.edit'"),
    'the client dropped the journal mapping instead of withholding the button',
  );
});

check('both reports still keep the same approve / remove rules', () => {
  for (const [name, source] of Object.entries(screens)) {
    assert.ok(
      source.includes("hasAnyPermission(userPermissions, ['cashbook.approved'])"),
      `${name} lost the approval permission`,
    );
    assert.ok(
      source.includes("hasPermission(userPermissions, 'remove.approval')"),
      `${name} lost the removal permission`,
    );
  }
});

/* -- the permission helpers agree ------------------------------------------- */

check('the two permission helpers accept the same shapes', () => {
  const checker = read('src/components/utils/permissionChecker.tsx');
  assert.ok(
    checker.includes("typeof permission === 'string' ? permission : permission?.name"),
    'permissionChecker.hasPermission still answers false for a string list',
  );
});

/* -- the API enforces it, independently, on the voucher's own type ----------- */

const api = read('../www/cashbook_api/app/Helpers/helpers.php');

check('the API has one rule, read off the voucher itself', () => {
  assert.ok(api.includes('function voucherEditPermissionFor'), 'the API has no pure type table');
  assert.ok(api.includes('function voucherEditPermission'), 'the API has no voucher-type edit rule');
  assert.ok(
    api.includes("function denyUnlessVoucherEditable"),
    'the API never enforces the edit rule',
  );
  for (const name of [
    "'cash.received.edit'",
    "'cash.payment.edit'",
    "'bank.received.edit'",
    "'bank.payment.edit'",
    "'sales.edit'",
    "'purchase.edit'",
    "'journal.edit'",
    "'purchase.return.edit'",
    "'sales.return.edit'",
  ]) {
    assert.ok(api.includes(name), `the API never demands ${name}`);
  }
});

check('the API fails closed on a type it cannot classify', () => {
  assert.ok(api.includes('function voucherEditForbidden'), 'no 403 for an unsupported type');
  assert.ok(
    /if \(\$permission === null\) \{\s*return voucherEditForbidden\(/.test(api),
    'an unclassified voucher is waved through instead of refused with 403',
  );
});

const API = '../www/cashbook_api/app';
const protectedFiles = [
  'Http/Controllers/Transaction/ReceivedController.php',
  'Http/Controllers/Transaction/PaymentController.php',
  'Http/Controllers/Transaction/BankPaymentController.php',
  'Services/BankService/BankServices.php',
  'Http/Controllers/Inventory/TradingSalesController.php',
  'Http/Controllers/Inventory/TradingPurchaseController.php',
  'Http/Controllers/Inventory/TradingCombinedController.php',
  'Http/Controllers/Inventory/SalesReturnController.php',
  'Http/Controllers/Inventory/PurchaseReturnController.php',
  'Http/Controllers/Inventory/ElectronicsSalesController.php',
  'Http/Controllers/Inventory/ElectronicsPurchaseController.php',
  'Http/Controllers/Inventory/ConstructionPurchaseController.php',
];

check('every voucher update endpoint that changes data asks the rule', () => {
  for (const file of protectedFiles) {
    const source = read(`${API}/${file}`);
    assert.ok(
      source.includes('denyUnlessVoucherEditable('),
      `${file} updates a voucher without asking the edit rule`,
    );
  }
});

check('approve and remove approval keep their own enforced permissions', () => {
  const received = read(`${API}/Http/Controllers/Transaction/ReceivedController.php`);
  assert.ok(
    received.includes("denyUnlessPermitted('cashbook.approved')"),
    'the approval endpoint no longer enforces cashbook.approved',
  );

  const modification = read(
    `${API}/Http/Controllers/VoucherModification/VoucherModificationController.php`,
  );
  const guards = (modification.match(/denyUnlessPermitted\('remove\.approval'\)/g) || []).length;
  assert.ok(guards >= 2, 'the removal endpoints no longer enforce remove.approval');
});

console.log(`\n${checked} checks passed.`);

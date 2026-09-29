/**
 * One party, one balance: every Tiles invoice screen reads the party's own
 * ledger figure (debit - credit), sign and all.
 *
 *   node _invoice_balance_rule_check.mjs
 *
 * Exit 0 when they do.
 *
 * ⚠️ WHY THIS EXISTS. The purchase screens used to ask the endpoint for the
 * ledger turned round (`payable: 1`), so the same party showed a POSITIVE
 * balance on the sales screen and a NEGATIVE one on the purchase screen -- two
 * balances for one account, which is what the owner reported. The rule is now
 * one reading everywhere, and each half of it is one word in a params object
 * that nothing else would notice going missing:
 *
 *   - every screen asks with `allow_negative` (the server floors a credit
 *     balance to nought for the receipt box, and a floored balance makes the
 *     Total Tk. under it wrong by exactly the amount);
 *   - no screen asks with `payable` (the direction flip);
 *   - and the bill's own term keeps its sign, which is not the same sign on
 *     every screen: the sign follows which side of the party's account the
 *     voucher posts to. A SALE debits the customer, so the bill ADDS to their
 *     balance; a PURCHASE credits the supplier, so it comes OFF; a sales
 *     RETURN credits the customer (off) and a purchase RETURN debits the
 *     supplier (on). Flip one of them and that screen quietly totals the
 *     opposite way -- the likeliest mistake here, and the one this check is
 *     really for.
 *
 * Source-level on purpose: these are facts about what the screens send and how
 * they add up, and neither shows up in a build. Plain node, no React.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SCREENS = [
  // path, and what the voucher does to the party's own balance: a sale debits
  // the customer (adds), a purchase credits the supplier (takes off), and each
  // return posts back the other way.
  ['src/components/modules/invoices/sales/TilesBusinessSales.tsx', '+'],
  ['src/components/modules/invoices/sales/TilesBusinessSalesReturn.tsx', '-'],
  ['src/components/modules/invoices/purchase/TilesBusinessPurchase.tsx', '-'],
  ['src/components/modules/invoices/purchase/TilesBusinessPurchaseReturn.tsx', '+'],
];

for (const [path, sign] of SCREENS) {
  const source = readFileSync(path, 'utf8');
  const name = path.split('/').pop();

  assert.ok(
    /API_TILES_PREVIOUS_BALANCE_URL/.test(source),
    `${name} no longer asks the previous-balance endpoint at all`,
  );

  assert.ok(
    /params:\s*\{[^}]*allow_negative:\s*1/.test(source),
    `${name} does not ask for the sign -- a credit balance would come back nought`,
  );

  assert.ok(
    !/params:\s*\{[^}]*payable/.test(source),
    `${name} still asks for the ledger turned round -- one party, two balances`,
  );

  // The balance term of the total, whatever spacing it is written with.
  const total = /const totalTkAmount\s*=\s*([^;]+);/.exec(source);
  assert.ok(total, `${name} has no totalTkAmount`);

  const wanted = new RegExp(`previousBalance\\s*\\${sign}\\s*billAmount`);
  const other = new RegExp(`previousBalance\\s*\\${sign === '+' ? '-' : '\\+'}\\s*billAmount`);

  assert.ok(
    wanted.test(total[1]) && !other.test(total[1]),
    `${name} posts the bill the wrong way (want "${sign} billAmount"): ${total[1].trim()}`,
  );
}

console.log(`ok -- ${SCREENS.length} invoice screens: one balance, one sign, the bill taken the right way`);

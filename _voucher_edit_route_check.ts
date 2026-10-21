/**
 * Cash Book's Edit: does each voucher open on the screen that wrote it?
 *
 *     CHECK_ENTRY=_voucher_edit_route_check.ts npx vite build --config vite.check.config.js \
 *       && node dist-check/_voucher_edit_route_check.js
 *
 * Runs the real voucherEditNavigation helpers. An Employee Loan is a "2-"
 * voucher like a cash payment, so the prefix alone sent it to Cash Payment;
 * the report now marks it `edit_screen: 'employee_loan'` and that has to win.
 */
import { readFileSync } from 'node:fs';
import routes from './src/components/services/appRoutes';
import {
  buildVoucherAutoEditStateForRow,
  getVoucherEditTarget,
  getVoucherEditTargetForRow,
} from './src/components/utils/utils-functions/voucherEditNavigation';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
};

console.log('Where Edit opens\n');

const loanRow = { vr_no: '2-261000343', mtm_id: 4081, edit_screen: 'employee_loan' };
const paymentRow = { vr_no: '2-261000342', mtm_id: 4080, edit_screen: null };

check('loan row -> Employee Loan', getVoucherEditTargetForRow(loanRow)?.route === routes.employee_loan);
check('plain "2-" row -> Cash Payment', getVoucherEditTargetForRow(paymentRow)?.route === routes.cash_payment);
check('by number alone it would have gone to Cash Payment (the fault)', getVoucherEditTarget(loanRow.vr_no)?.route === routes.cash_payment);

const state = buildVoucherAutoEditStateForRow(loanRow);
check('auto-edit state carries the loan voucher number', state?.voucherAutoEdit === true && state?.voucherAutoEditNo === '2-261000343');

check('sales / purchase rows unchanged',
  getVoucherEditTargetForRow({ vr_no: '3-261000001' })?.route === routes.inv_sales &&
  getVoucherEditTargetForRow({ vr_no: '4-261000001' })?.route === routes.inv_purchase);
check('edit_vr_no still preferred over vr_no', buildVoucherAutoEditStateForRow({ vr_no: '2-1', edit_vr_no: '1-9' })?.voucherAutoEditNo === '1-9');
check('unknown edit_screen falls back to the prefix', getVoucherEditTargetForRow({ vr_no: '1-5', edit_screen: 'nope' })?.route === routes.cash_received);
check('a row with no voucher opens nothing', buildVoucherAutoEditStateForRow({ vr_no: '' }) === null);

console.log('\nThe screens\n');
const cashBook = readFileSync('src/components/modules/reports/cashbook/CashBook.tsx', 'utf8');
const loan = readFileSync('src/components/modules/hrms/loan/EmployeeLoan.tsx', 'utf8');
check('Cash Book Edit asks by the row', /getVoucherEditTargetForRow\(row\)/.test(cashBook) && /buildVoucherAutoEditStateForRow\(row\)/.test(cashBook));
check('Employee Loan picks up the auto-edit and searches it', /useVoucherAutoEditSearch\(\{/.test(loan) && /triggerSearch: \(vrNo\) => searchTransaction\(vrNo\)/.test(loan));
check('Search button does not pass the click event as the number', /onClick=\{\(\) => searchTransaction\(\)\}/.test(loan));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

/**
 * Ledger Details: does un-approving one row change that row and nothing else?
 *
 *     npx vite build --config vite.check.config.js && node dist-check/_row_approval_check.js
 *
 * ⚠️ WHY THIS EXISTS
 *
 * Removing an approval used to re-run the report, and a report in flight takes
 * the whole table off the screen -- so every other row vanished and came back
 * to show one icon change. The fix patches the row where the rows are kept
 * (the slice), and the risk moves: if the patch misses its row, or catches a
 * second one, or drops the rows it did not touch, the screen shows the wrong
 * thing with no error at all. So the reducer is run here against the row shape
 * the report actually sends and the result is read back.
 *
 * The rows below are the API's own -- the keys, and the opening row that
 * carries no voucher -- copied from ReportsController::apiCustomerSupplierStatement.
 */
import reducer, {
  setRowApproval,
} from './src/components/modules/reports/ledger-with-product/ledgerWithProductSlice';
import type { LedgerWithProductReportData } from './src/components/modules/reports/ledger-with-product/ledgerWithProductTypes';

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

const openRow = {
  sl_number: '',
  vr_date: '01/07/2026',
  vr_no: '',
  trx_type: 'Opening',
  debit: 0,
  credit: 0,
  balance: 12500,
  remarks: 'Opening Balance',
};

const salesRow = {
  sl_number: 1,
  mtmid: 4187,
  is_approved: 1,
  vr_date: '04/07/2026',
  vr_no: '3-1042',
  trx_type: 'Sales',
  total: 8400,
  debit: 8400,
  credit: 0,
  balance: 20900,
  remarks: 'Sold on credit',
};

const receiptRow = {
  sl_number: 2,
  mtmid: 4192,
  is_approved: 0,
  vr_date: '09/07/2026',
  vr_no: '1-2264',
  trx_type: 'Transaction',
  received: 5000,
  debit: 5000,
  credit: 0,
  balance: 25900,
  remarks: 'Cash received',
};

/** The state as the thunk leaves it: the report's payload, straight in. */
const loaded = (): any =>
  reducer(
    undefined,
    {
      type: 'reports/ledgerWithProduct/fulfilled',
      payload: {
        rows: [{ ...openRow }, { ...salesRow }, { ...receiptRow }],
        summary: { closing_balance: 25900 },
        party: { name: 'Shahanur Enterprise' },
      } as LedgerWithProductReportData,
    },
  );

console.log('Ledger Details row approval patch\n');

// ── The un-approval the report was about ────────────────────────────────────
const before = loaded();
const after = reducer(before, setRowApproval({ voucherId: 4187, isApproved: false }));

check(
  'the row that was un-approved reads as not approved',
  Number(after.data.rows[1].is_approved ?? 0) === 1 === false,
  `is_approved=${JSON.stringify(after.data.rows[1].is_approved)}`,
);
check(
  'the icon test the Action column uses now hides the cross and shows the pencil',
  Number(after.data.rows[1].is_approved ?? 0) !== 1,
);
check(
  'no other row moved',
  JSON.stringify(after.data.rows[0]) === JSON.stringify(before.data.rows[0]) &&
    JSON.stringify(after.data.rows[2]) === JSON.stringify(before.data.rows[2]),
);
check(
  'every row is still there, in the same order',
  after.data.rows.length === 3 &&
    after.data.rows[0].vr_no === '' &&
    after.data.rows[1].mtmid === 4187 &&
    after.data.rows[2].mtmid === 4192,
  JSON.stringify(after.data.rows.map((r: any) => r.mtmid ?? 'opening')),
);
check(
  'the opening row, which carries no voucher, is untouched',
  after.data.rows[0].vr_no === '' && after.data.rows[0].balance === 12500,
);
check(
  'the rest of the statement -- summary, party -- came through',
  after.data.summary.closing_balance === 25900 &&
    after.data.party.name === 'Shahanur Enterprise',
);

// ── The other direction, on the row that had no approval ────────────────────
const approved = reducer(before, setRowApproval({ voucherId: 4192, isApproved: true }));
check(
  'approving the second row sets only it',
  Number(approved.data.rows[2].is_approved) === 1 &&
    Number(approved.data.rows[1].is_approved) === 1,
);

// ── A failure path: the call came back unsuccessful, so nothing is dispatched.
//    Same state object, so the icons cannot have moved.
check(
  'no dispatch on a failed call leaves the rows exactly as the server sent them',
  Number(before.data.rows[1].is_approved) === 1 &&
    Number(before.data.rows[2].is_approved) === 0,
);

// ── Ids that match nothing, and a statement that was never loaded ───────────
const unmatched = reducer(before, setRowApproval({ voucherId: 999999, isApproved: false }));
check(
  'an id no row carries changes nothing',
  JSON.stringify(unmatched.data.rows) === JSON.stringify(before.data.rows),
);

const empty: any = reducer(undefined, { type: 'reports/ledgerWithProduct/pending' });
check(
  'a patch before any statement is loaded does not throw',
  reducer(empty, setRowApproval({ voucherId: 4187, isApproved: false })) !== null,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

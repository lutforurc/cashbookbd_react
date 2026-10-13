import { useCallback, useEffect, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import Table from '../../utils/others/Table';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { ButtonLoading, ROW_ACTION_BUTTON_CLASS } from '../../../pages/UiElements/CustomButtons';
import { formatDate } from '../../utils/utils-functions/formatDate';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

import httpService from '../../services/httpService';
import {
  API_REPORT_MISMATCH_FIX_URL,
  API_REPORT_MISMATCH_LIST_URL,
} from '../../services/apiRoutes';

/**
 * Report Mismatch (VR Settings).
 *
 * The vouchers a report cannot make up its mind about, in two kinds, and the
 * repair for the one kind that can be repaired without anybody deciding
 * anything.
 *
 * ⚠️ EVERY STRING ON THIS SCREEN IS ENGLISH — labels, headers, toasts, the
 * confirmation dialog, and the `detail` text the API builds. Asked for by the
 * owner on 2026-10-10; the Bangla that was here is gone, so do not add it back.
 *
 * ⚠️ KIND 1 — A VOUCHER THAT BELONGS TO NOBODY. Every query that filters
 * `mtm.company_id` — the Balance Sheet's ledger side, the Trial Balance, the
 * Mismatch report — cannot see a voucher whose `company_id` is empty, because
 * `= 1` never matches NULL. Profit & Loss filters only branch and status, so it
 * counts the voucher anyway. The purchase ends up in the Net Profit/Loss line
 * and in nothing else, and the Balance Sheet's Difference row grows by exactly
 * that amount. One such voucher dated 04/07/2026 put ৳1,87,000 in the
 * Difference column of July's report.
 *
 * ⚠️ SO THE REPAIR IS NOT A JUDGEMENT CALL. The voucher's branch is already on
 * the row and the branch already knows which company it belongs to, so the
 * button just hands the voucher the company it should have had. No amount,
 * date, voucher number or posting line is touched — it stops being nobody's,
 * nothing else about it changes.
 *
 * ⚠️ KIND 2 — A VOUCHER THAT DOES NOT BALANCE. Its debits and credits differ,
 * so EVERY report that reads the ledger is out by that amount, and it lands in
 * the Balance Sheet's Difference row. There is no button for these: one of the
 * amounts on the voucher is simply wrong, and only a human knows which one.
 * Live case: `3-261000002` (Cash Dr 1,660 + Sales Discount Dr 3 / Sales Cr
 * 1,660) — ৳3.
 *
 * ⚠️ KIND 3 IS GONE, REMOVED 2026-10-10. It listed trading heads holding an
 * entry on the side the Profit & Loss never read — the one-sided read in the
 * API's `extractNetProfitLossAmount()`. That function now reads all eight heads
 * net (`debit - credit`), so the entry is no longer invisible and the check has
 * nothing left to say. Its live case, a ৳100 Sales Discount credit on the
 * sales-return voucher `13-261000002` (03/10/2026), was a real ৳100 fault while
 * the read was one-sided and is a correct voucher now — keeping the check would
 * report it as a mismatch for ever. The check is deleted on both sides: here and
 * in `ReportMismatchController`.
 *
 * ⚠️ A ROW IS NOT A VOUCHER. `amount` is the number the check tripped on, shown
 * so a row can be recognised; two vouchers sharing a number appear as two rows,
 * which is the honest picture — and the number is never rewritten to fix that.
 */

const MISMATCH_TYPES: Record<string, { label: string; help: string }> = {
  company_missing: {
    label: 'No Company',
    help: 'Voucher belongs to no company — Profit & Loss counts it, Balance Sheet does not',
  },
  unbalanced: {
    label: 'Unbalanced',
    help: 'Debit and credit are not equal — every report is off by this amount',
  },
};

const typeLabel = (row: any) => MISMATCH_TYPES[row?.type]?.label ?? row?.type;

const ReportMismatch = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_REPORT_MISMATCH_LIST_URL);
      const payload = res?.data?.data?.data;

      setRows(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the mismatch list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const repair = async () => {
    const row = confirmRow;

    if (!row) return;

    setFixingId(row.id);

    try {
      const res = await httpService.post(API_REPORT_MISMATCH_FIX_URL, { id: row.id });

      if (res?.data?.success === false) {
        toast.error(res?.data?.error?.message || 'Could not be fixed');
      } else {
        toast.success(`${row.vr_no} has been fixed`);
      }

      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not be fixed');
    } finally {
      setFixingId(null);
      setConfirmRow(null);
    }
  };

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + 1;

    return acc;
  }, {});

  const columns = [
    {
      key: 'serial_number',
      header: 'Sl. No.',
      width: '60px',
      render: (row: any) => <div className="text-center">{row.serial_number}</div>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '150px',
      render: (row: any) => (
        <div title={MISMATCH_TYPES[row.type]?.help}>{typeLabel(row)}</div>
      ),
    },
    {
      key: 'vr_no',
      header: 'Voucher No',
      width: '130px',
      render: (row: any) => <div>{row.vr_no}</div>,
    },
    {
      key: 'vr_date',
      header: 'Voucher Date',
      width: '110px',
      render: (row: any) => <div>{formatDate(row.vr_date)}</div>,
    },
    {
      key: 'detail',
      header: 'Details',
      render: (row: any) => (
        <div className="text-xs text-body dark:text-bodydark">{row.detail}</div>
      ),
    },
    {
      key: 'branch_name',
      header: 'Branch',
      width: '150px',
      render: (row: any) => <div>{row.branch_name}</div>,
    },
    {
      key: 'amount',
      header: 'Amount (Tk)',
      is_number: true,
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="text-right">{thousandSeparator(row.amount)}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (row: any) => (
        <div>
          {Number(row.status) === 1 ? (
            'Active'
          ) : (
            <span className="text-bodydark2">Recycled</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '150px',
      render: (row: any) =>
        row.type === 'company_missing' ? (
          <ButtonLoading
            size="sm"
            variant="primary"
            label="Fix"
            title="Put this voucher under the company its branch belongs to"
            buttonLoading={fixingId === row.id}
            disabled={fixingId !== null}
            onClick={() => setConfirmRow(row)}
            className={`rounded ${ROW_ACTION_BUTTON_CLASS}`}
          />
        ) : (
          // Not a tagging mistake — an amount on the voucher is wrong, and
          // nothing here can guess which, so no button.
          <span
            className="text-xs text-bodydark2"
            title={MISMATCH_TYPES[row.type]?.help}
          >
            Cannot be fixed here
          </span>
        ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Report Mismatch" />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Report Mismatch
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-body dark:text-bodydark">
            Two causes of a <span className="font-medium">Difference</span> in the Balance Sheet.{' '}
            <span className="font-medium">No Company</span> — Profit &amp; Loss counts the voucher,
            the Balance Sheet does not. <span className="font-medium">Unbalanced</span> — debit and
            credit are not equal, so every report is off by that amount.{' '}
            <span className="font-medium">Fix</span> is offered for the first kind only, because
            only that one can be settled without a judgement call; no amount, date, voucher number
            or posting line is touched.
          </p>
        </div>

        <ButtonLoading
          label="Refresh"
          icon={<FiRefreshCcw size={16} />}
          buttonLoading={loading}
          onClick={load}
          className="rounded"
        />
      </div>

      {loading && rows.length === 0 ? (
        <Loader />
      ) : (
        <>
          {rows.length > 0 && (
            <p className="mb-2 text-sm text-body dark:text-bodydark">
              {rows.length} voucher{rows.length === 1 ? '' : 's'} in total —{' '}
              {Object.entries(MISMATCH_TYPES)
                .map(([type, meta]) => `${meta.label} ${counts[type] ?? 0}`)
                .join(', ')}
              .
            </p>
          )}

          <div className="overflow-y-auto">
            <Table
              columns={columns}
              data={rows}
              // A voucher can trip two checks at once, so the type has to be in
              // the key — the id alone is not unique across the two kinds.
              getRowKey={(row: any) => `${row.type}-${row.id}`}
              noDataMessage="No mismatch found — no voucher is company-less or unbalanced."
            />
          </div>
        </>
      )}

      {/* Same dialog Voucher Delete uses, so a confirmation in VR Settings
          looks and behaves the same wherever it is met. */}
      <ConfirmModal
        show={Boolean(confirmRow)}
        title="This voucher will be fixed"
        confirmLabel="Fix"
        cancelLabel="Cancel"
        className="bg-primary hover:bg-primary/90"
        loading={fixingId !== null}
        onCancel={() => setConfirmRow(null)}
        onConfirm={repair}
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>This voucher will be put under the company its branch belongs to:</div>
            <div className="mt-2 border border-[rgb(var(--c-border))] px-3 py-2 text-sm">
              <div>
                Voucher: <span className="font-bold">{confirmRow?.vr_no}</span>
              </div>
              <div>Date: {formatDate(confirmRow?.vr_date)}</div>
              <div>Branch: {confirmRow?.branch_name}</div>
              <div>Amount: {thousandSeparator(confirmRow?.amount, 0)}</div>
            </div>
            <div className="mt-2 text-sm">
              No amount, date, voucher number or posting line changes. The voucher simply stops
              belonging to no company.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ReportMismatch;

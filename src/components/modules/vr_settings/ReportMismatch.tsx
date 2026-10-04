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
 * The vouchers a report cannot make up its mind about, and the repair for the
 * ones that can be repaired without anybody deciding anything.
 *
 * ⚠️ WHY A VOUCHER BELONGS TO NOBODY AND A REPORT STILL DISAGREES WITH ITSELF.
 * Every query that filters `mtm.company_id` — the Balance Sheet's ledger side,
 * the Trial Balance, the Mismatch report — cannot see a voucher whose
 * `company_id` is empty, because `= 1` never matches NULL. Profit & Loss
 * filters only branch and status, so it counts the voucher anyway. The purchase
 * ends up in the Net Profit/Loss line and in nothing else, and the Balance
 * Sheet's Difference row grows by exactly that amount. One such voucher dated
 * 04/07/2026 put ৳1,87,000 in the Difference column of July's report.
 *
 * ⚠️ SO THE REPAIR IS NOT A JUDGEMENT CALL. The voucher's branch is already on
 * the row and the branch already knows which company it belongs to, so the
 * button just hands the voucher the company it should have had. No amount,
 * date, voucher number or posting line is touched — it stops being nobody's,
 * nothing else about it changes.
 *
 * ⚠️ A ROW IS NOT A VOUCHER. `amount` is the sum of the voucher's debits, shown
 * so a row can be recognised; two vouchers sharing a number appear as two rows,
 * which is the honest picture — and the number is never rewritten to fix that.
 */

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
      toast.error(error?.response?.data?.message || 'মিসম্যাচের তালিকা আনা যায়নি');
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
        toast.error(res?.data?.error?.message || 'ঠিক করা যায়নি');
      } else {
        toast.success(`${row.vr_no} ঠিক করা হয়েছে`);
      }

      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'ঠিক করা যায়নি');
    } finally {
      setFixingId(null);
      setConfirmRow(null);
    }
  };

  const columns = [
    {
      key: 'serial_number',
      header: 'ক্রম',
      width: '60px',
      render: (row: any) => <div className="text-center">{row.serial_number}</div>,
    },
    {
      key: 'vr_no',
      header: 'ভাউচার নম্বর',
      width: '130px',
      render: (row: any) => <div>{row.vr_no}</div>,
    },
    {
      key: 'vr_date',
      header: 'তারিখ',
      width: '110px',
      render: (row: any) => <div>{formatDate(row.vr_date)}</div>,
    },
    {
      key: 'branch_name',
      header: 'ব্রাঞ্চ',
      width: '150px',
      render: (row: any) => <div>{row.branch_name}</div>,
    },
    {
      key: 'amount',
      header: 'টাকা (Tk)',
      is_number: true,
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="text-right">{thousandSeparator(row.amount, 0)}</div>
      ),
    },
    {
      key: 'status',
      header: 'অবস্থা',
      width: '110px',
      render: (row: any) => (
        <div>
          {Number(row.status) === 1 ? (
            'সক্রিয়'
          ) : (
            <span className="text-bodydark2">রিসাইকেল</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'সমাধান',
      width: '150px',
      render: (row: any) => (
        <ButtonLoading
          size="sm"
          variant="primary"
          label="ঠিক করুন"
          title="ভাউচারটিকে তার ব্রাঞ্চের কোম্পানির অধীনে নিন"
          buttonLoading={fixingId === row.id}
          disabled={fixingId !== null}
          onClick={() => setConfirmRow(row)}
          className={`rounded ${ROW_ACTION_BUTTON_CLASS}`}
        />
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
            যে ভাউচারগুলো <span className="font-medium">কোনো কোম্পানির অধীনে নেই</span> — Profit &amp;
            Loss এগুলো গুনে, কিন্তু Balance Sheet ও Ledger গুনে না। ফলে Balance Sheet-এ Difference
            দেখায়। <span className="font-medium">ঠিক করুন</span> চাপলে ভাউচারটি তার ব্রাঞ্চের
            কোম্পানির অধীনে চলে যাবে; টাকা, তারিখ, ভাউচার নম্বর বা পোস্টিং কিছুই বদলাবে না।
          </p>
        </div>

        <ButtonLoading
          label="রিফ্রেশ"
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
              মোট {rows.length} টি ভাউচার — প্রতিটির পাশে <span className="font-medium">ঠিক করুন</span>{' '}
              চাপলে সেটি সারিয়ে ফেলা হবে।
            </p>
          )}

          <div className="overflow-y-auto">
            <Table
              columns={columns}
              data={rows}
              getRowKey={(row: any) => row.id}
              noDataMessage="কোনো মিসম্যাচ পাওয়া যায়নি — প্রতিটি ভাউচার তার কোম্পানির অধীনে আছে।"
            />
          </div>
        </>
      )}

      {/* Same dialog Voucher Delete uses, so a confirmation in VR Settings
          looks and behaves the same wherever it is met. */}
      <ConfirmModal
        show={Boolean(confirmRow)}
        title="ভাউচারটি ঠিক করা হবে"
        confirmLabel="ঠিক করুন"
        cancelLabel="বাতিল"
        className="bg-primary hover:bg-primary/90"
        loading={fixingId !== null}
        onCancel={() => setConfirmRow(null)}
        onConfirm={repair}
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>এই ভাউচারটি তার ব্রাঞ্চের কোম্পানির অধীনে নেওয়া হবে:</div>
            <div className="mt-2 border border-[rgb(var(--c-border))] px-3 py-2 text-sm">
              <div>
                ভাউচার: <span className="font-bold">{confirmRow?.vr_no}</span>
              </div>
              <div>তারিখ: {formatDate(confirmRow?.vr_date)}</div>
              <div>ব্রাঞ্চ: {confirmRow?.branch_name}</div>
              <div>টাকা: {thousandSeparator(confirmRow?.amount, 0)}</div>
            </div>
            <div className="mt-2 text-sm">
              টাকা, তারিখ, ভাউচার নম্বর বা পোস্টিং — কিছুই বদলাবে না। শুধু ভাউচারটি আর “কোনো
              কোম্পানির নয়” থাকবে না।
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ReportMismatch;

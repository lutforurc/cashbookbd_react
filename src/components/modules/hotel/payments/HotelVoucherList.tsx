import { useCallback, useEffect, useState } from 'react';
import { FiPrinter, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';

import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_HEIGHT, FIELD_LABEL } from '../../../../theme/fieldStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import { API_HOTEL_VOUCHER_LIST_URL } from '../../../services/apiRoutes';

export type HotelVoucherKind = 'payment' | 'received' | 'asset';

export interface HotelVoucherRow {
  main_trx_id: number;
  vr_no: string;
  vr_date: string;
  manual_voucher_no: string | null;
  particulars: string;
  amount: number;
}

interface Props {
  kind: HotelVoucherKind;
  onClose: () => void;
  /** Handed the row; the screen prints it through its VoucherPrintRegistry. */
  onPrint: (row: HotelVoucherRow) => void;
}

const HEADING: Record<HotelVoucherKind, string> = {
  payment: 'Payment vouchers',
  received: 'Received vouchers',
  asset: 'Asset purchase vouchers',
};

/**
 * The List button on the three hotel money screens: one month's vouchers of
 * that kind, newest first, each one printable.
 *
 * ⚠️ A PANEL ON THE SCREEN, NOT A PAGE. The clerk opens it to reprint the
 * voucher they wrote ten minutes ago, and a page turn would throw away the
 * half-filled form underneath.
 *
 * ⚠️ A FAILED READ SAYS SO. An empty table means the month had none; a read
 * that failed shows the server's sentence instead, never an empty table.
 */
const HotelVoucherList = ({ kind, onClose, onPrint }: Props) => {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<HotelVoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;

    setLoading(true);
    setFailed(null);

    try {
      const res = await httpService.get(`${API_HOTEL_VOUCHER_LIST_URL}/${kind}`, {
        params: { month },
      });
      const body = res?.data;

      // A refusal rides HTTP 200 with success:false -- see the save handlers.
      if (!body?.success) {
        setRows([]);
        setTotal(0);
        setFailed(body?.message || 'Could not read the vouchers.');
        return;
      }

      const data = body?.data?.data ?? {};
      setRows(data.rows ?? []);
      setTotal(Number(data.total) || 0);
    } catch (error: any) {
      setRows([]);
      setTotal(0);
      setFailed(error?.response?.data?.message || 'Could not read the vouchers.');
    } finally {
      setLoading(false);
    }
  }, [kind, month]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      key: 'vr_date',
      header: 'Date',
      // ⚠️ Fixed widths on every column but Particulars. Without them the
      // table is laid out by content, the head names push it wider than the
      // panel, and Amount and Print -- the two columns the list is for --
      // end up scrolled off the right edge.
      width: 100,
      render: (row: HotelVoucherRow) => dayjs(row.vr_date).format('DD/MM/YYYY'),
    },
    {
      key: 'vr_no',
      header: 'Voucher No',
      width: 150,
      render: (row: HotelVoucherRow) => (
        <span>
          {row.vr_no}
          {row.manual_voucher_no ? (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({row.manual_voucher_no})
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'particulars',
      header: 'Particulars',
      // Cut to the column, the whole of it on hover.
      render: (row: HotelVoucherRow) => <span title={row.particulars}>{row.particulars}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: 120,
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: HotelVoucherRow) => thousandSeparator(Number(row.amount)),
    },
    {
      key: 'action',
      header: 'Print',
      width: 70,
      headerClass: 'text-center w-20',
      cellClass: 'text-center',
      render: (row: HotelVoucherRow) => (
        <button
          type="button"
          onClick={() => onPrint(row)}
          title={`Print ${row.vr_no}`}
          className="inline-flex items-center rounded border border-stroke p-1.5 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
        >
          <FiPrinter size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-base font-semibold text-black dark:text-white">{HEADING[kind]}</h2>
          <div className="w-40">
            <label htmlFor={`voucher_list_month_${kind}`} className={FIELD_LABEL}>
              Month
            </label>
            <input
              id={`voucher_list_month_${kind}`}
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`w-full rounded border border-stroke bg-transparent px-2 dark:border-strokedark dark:bg-boxdark ${FIELD_HEIGHT}`}
            />
          </div>
        </div>

        <ButtonLoading
          onClick={onClose}
          label="Close list"
          variant="default"
          icon={<FiX size={16} />}
        />
      </div>

      {failed ? (
        <p className="mb-2 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          {failed}
        </p>
      ) : null}

      <div className="relative">
        {loading ? <Loader /> : null}
        <Table
          columns={columns}
          data={rows}
          // The panel's width exactly, so the column widths above are obeyed
          // and Particulars takes what is left rather than all it wants.
          tableClassName="w-full"
          noDataMessage={failed ? 'Could not read the vouchers.' : 'No vouchers in that month.'}
        />
      </div>

      {rows.length ? (
        <p className="mt-2 text-right text-sm text-gray-600 dark:text-gray-300">
          {rows.length} {rows.length === 1 ? 'voucher' : 'vouchers'}, total{' '}
          <strong className="text-black dark:text-white">{thousandSeparator(total)}</strong>
        </p>
      ) : null}
    </div>
  );
};

export default HotelVoucherList;

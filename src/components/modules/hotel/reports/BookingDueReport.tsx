import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';

import httpService from '../../../services/httpService';
import { API_HOTEL_BOOKING_DUE_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { money } from '../setupHelpers';

/**
 * Booking-wise due: stays that have ended and still owe.
 *
 * ⚠️ THIS PAGE, NOT THE LEDGER HEAD, IS THE REAL PICTURE. Advance Against
 * Booking nets one guest's advance against another guest's balance, so its own
 * total hides both. The footer sets what is owed on ended stays beside what is
 * held on open ones, so the head can be reconciled against it.
 *
 * Every row opens the folio, where the three ways out are: take the money,
 * move it to a party, or write it off.
 */
const BookingDueReport = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_HOTEL_BOOKING_DUE_URL);

      if (res.data?.success === true) {
        setReport(res.data?.data?.data ?? res.data?.data ?? null);
      } else {
        toast.error(res.data?.message || 'Could not load the report');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        key: 'booking_no',
        header: 'Booking',
        render: (row: any) => (
          <button
            type="button"
            className="text-primary underline"
            onClick={() => navigate(`${routes.hotel_booking_folio}/${row.booking_id}`)}
          >
            {row.booking_no}
          </button>
        ),
      },
      { key: 'guest', header: 'Guest', render: (row: any) => row.guest ?? '—' },
      { key: 'mobile', header: 'Mobile', render: (row: any) => row.mobile ?? '—' },
      {
        key: 'checkout_date',
        header: 'Checked out',
        render: (row: any) => (row.checkout_date ? formatDayMonthYear(row.checkout_date) : '—'),
      },
      {
        key: 'billed',
        header: 'Billed',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.billed),
      },
      {
        key: 'paid',
        header: 'Paid',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.paid),
      },
      {
        key: 'written_off',
        header: 'Written off',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => (Number(row.written_off) ? money(row.written_off) : '—'),
      },
      {
        key: 'due',
        header: 'Due',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => (
          <strong className="text-danger dark:text-red-400">{money(row.due)}</strong>
        ),
      },
      {
        key: 'days_overdue',
        header: 'Days',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => row.days_overdue ?? '—',
      },
      { key: 'checked_out_by', header: 'Checked out by', render: (row: any) => row.checked_out_by ?? '—' },
      { key: 'reason', header: 'Reason', render: (row: any) => row.reason ?? '—' },
    ],
    [navigate],
  );

  return (
    <div>
      <HelmetTitle title="Booking-wise Due" />

      {loading ? <Loader /> : null}

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Checked-out bookings whose guest still owes. A balance moved to a party is on that
        party&rsquo;s ledger and is not listed here.
      </p>

      {/* Nothing below until the answer is in: an empty table and 0.00 totals
          while loading read as "nobody owes anything". */}
      {report ? (
      <>
      <Table
        columns={columns}
        data={report?.rows ?? []}
        noDataMessage="Nothing is owing on any checked-out booking."
      />

      {/* The two halves of the Advance Against Booking head. */}
      <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 rounded border border-stroke p-3 text-sm dark:border-strokedark sm:grid-cols-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total due ({report?.totals?.count ?? 0}{' '}
            {report?.totals?.count === 1 ? 'booking' : 'bookings'})
          </div>
          <div className="text-base font-semibold text-danger dark:text-red-400">
            {money(report?.totals?.due ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Advance held on open bookings
          </div>
          <div className="text-base font-semibold text-black dark:text-white">
            {money(report?.totals?.advance_held ?? 0)}
          </div>
        </div>
      </div>

      {report?.note ? (
        <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{report.note}</p>
      ) : null}
      </>
      ) : null}
    </div>
  );
};

export default BookingDueReport;

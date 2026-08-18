import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiEdit2, FiInbox, FiMinus, FiPlus, FiPrinter, FiSearch, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import httpService from '../../services/httpService';
import {
  API_BRANCH_TRANSFER_COMPARISON_URL,
  API_BRANCH_TRANSFER_DESTROY_URL,
} from '../../services/apiRoutes';
import InlineConfirm, {
  InlineConfirmPosition,
} from '../../utils/components/InlineConfirm';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getBranchTransfers, getBranchTransferDetails } from './warehouseTransferSlice';
import ChallanPrint from './ChallanPrint';
import ComparisonPanel from './ComparisonPanel';
import ROUTES from '../../services/appRoutes';
import dayjs from 'dayjs';

// transfer_status: 1 = issued/in transit (still receivable), 3 = fully received.
const STATUS_IN_TRANSIT = 1;

// transfer_type: 1 = issue, 2 = receive. Asked for explicitly, because the
// endpoint hands back both kinds otherwise -- and a receive carries the same
// from/to branches as the issue behind it, so the challan would appear twice
// on this list, the second time under the receive voucher's number.
const TRANSFER_TYPE_ISSUE = 1;

interface TransferListProps {
  refreshKey?: number;
}

const pickFirst = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      return row[key];
    }
  }
  return '';
};

/**
 * The date as the rest of the app writes it: 15/08/2026, not 2026-08-15.
 *
 * Through dayjs rather than by splitting on the dashes, because the API sends
 * the day on its own in some rows and with a time attached in others, and a
 * split would hand back "15 00:00:00" for the second kind.
 */
const asDate = (value: any) =>
  value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '-';

// transfer_status: 1 = issued (still in transit), 2 = partially received,
// 3 = fully received. Shows at a glance which stock hasn't arrived yet.
const TRANSFER_STATUS: Record<number, { label: string; className: string }> = {
  1: { label: 'In Transit', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  2: { label: 'Partial', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  3: { label: 'Received', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const TransferList = ({ refreshKey = 0 }: TransferListProps) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const transfer = useSelector((s: any) => s.branchTransfer);
  const myBranchId = useSelector((s: any) => s.settings?.data?.branch?.id);

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [printingId, setPrintingId] = useState<number | string | null>(null);
  // One challan compared at a time — two open at once and it stops being clear
  // which set of figures belongs to which voucher.
  const [comparedTransferId, setComparedTransferId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<any | null>(null);
  const [comparingId, setComparingId] = useState<number | null>(null);
  // Which row is being asked about, and where its button is, so the confirm
  // opens against that row rather than in the middle of a list of twenty.
  const [pendingDelete, setPendingDelete] = useState<
    { id: number; vrNo: string; at: InlineConfirmPosition } | null
  >(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // How the printed challan is set out. 0 rows means "all on one page", which
  // is what a challan of a few lines wants; a long one can be split.
  const [printRows, setPrintRows] = useState<number>(0);
  const [printFont, setPrintFont] = useState<number>(11);

  // Empty is kept as 0 rather than snapping back to a number, so the box can be
  // cleared and retyped instead of fighting the operator mid-edit.
  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintRows(Number.isFinite(value) && value > 0 ? value : 0);
  };

  const handlePrintFontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintFont(Number.isFinite(value) && value > 0 ? value : 11);
  };

  /** Sends the voucher to the recycle bin, where it can be restored. */
  const deleteTransfer = async (transferId: number) => {
    setDeletingId(transferId);

    try {
      const response = await httpService.post(
        `${API_BRANCH_TRANSFER_DESTROY_URL}${transferId}`,
      );

      if (response?.data?.success) {
        toast.success(response?.data?.message || 'Transfer deleted.');
        // Anything opened against the row that has just gone would be reading
        // figures for a voucher no longer there.
        setComparedTransferId(null);
        setComparison(null);
        dispatch(
          getBranchTransfers({ page, perPage, search, transfer_type: TRANSFER_TYPE_ISSUE }),
        );
        return;
      }

      // A refusal -- already received, or another branch's voucher -- carries
      // the reason, and the reason is the whole point of showing it.
      toast.error(
        response?.data?.message ||
          response?.data?.error?.message ||
          'Could not delete this transfer.',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Could not delete this transfer.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  /** Opens what was sent against what arrived, for one challan. */
  const toggleComparison = async (transferId: number) => {
    if (comparedTransferId === transferId) {
      setComparedTransferId(null);
      setComparison(null);
      return;
    }

    setComparingId(transferId);
    try {
      const response = await httpService.get(
        `${API_BRANCH_TRANSFER_COMPARISON_URL}${transferId}`,
      );
      setComparison(response?.data?.data?.data ?? null);
      setComparedTransferId(transferId);
    } catch {
      toast.error('Could not load the issued versus received figures.');
      setComparedTransferId(null);
      setComparison(null);
    } finally {
      setComparingId(null);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const printChallan = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Delivery Challan',
    removeAfterPrint: true,
  });

  // Fetch the transfer's lines by id, then print once the hidden component has
  // re-rendered with them. The small delay mirrors the voucher print registry.
  const handlePrint = (id: number | string) => {
    if (printingId) return;
    setPrintingId(id);
    dispatch(getBranchTransferDetails(id))
      .unwrap()
      .then(() => setTimeout(() => printChallan(), 300))
      .catch(() => {})
      .finally(() => setTimeout(() => setPrintingId(null), 400));
  };

  useEffect(() => {
    dispatch(
      getBranchTransfers({ page, perPage, search, transfer_type: TRANSFER_TYPE_ISSUE }),
    );
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(
      getBranchTransfers({ page: 1, perPage, search, transfer_type: TRANSFER_TYPE_ISSUE }),
    );
    setTimeout(() => setSearchLoading(false), 150);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    setPerPage(selected === '' ? '' : Number(selected));
    setCurrentPage(1);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const totalPages = Number(transfer?.pagination?.lastPage || 1);
  const tableData = Array.isArray(transfer?.data) ? transfer.data : [];

  const columns = [
    {
      // Ahead of the serial, in the Action icons' blue: what was sent against
      // what arrived is a question about the whole challan, not about a column
      // of it.
      key: 'compare',
      header: '',
      headerClass: 'text-center !pl-0',
      // Table writes px-3 on every cell and appends cellClass after it; the
      // later stylesheet rule wins rather than the later name, so the padding
      // has to be marked important to take effect.
      cellClass: 'text-center w-8 !px-1',
      render: (row: any) => {
        const id = Number(row?.id || 0);
        if (!id) return null;
        const isOpen = comparedTransferId === id;

        return (
          <button
            type="button"
            title={isOpen ? 'Hide issued vs received' : 'Show issued vs received'}
            onClick={() => toggleComparison(id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-500/40 text-blue-500 transition hover:border-blue-500 hover:bg-blue-500/10"
          >
            {comparingId === id ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
            ) : isOpen ? (
              <FiMinus className="cursor-pointer w-4 h-4" />
            ) : (
              <FiPlus className="cursor-pointer w-4 h-4" />
            )}
          </button>
        );
      },
    },
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center !pl-0',
      cellClass: 'text-center w-16 !pl-0',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'vr_no',
      header: 'Voucher',
      headerClass: 'w-40',
      cellClass: 'w-40',
      render: (row: any) => (
        <span>{pickFirst(row, ['vr_no', 'transfer_no', 'voucher_no']) || '-'}</span>
      ),
    },
    {
      key: 'transfer_date',
      header: 'Date',
      headerClass: 'w-36',
      cellClass: 'w-36',
      render: (row: any) => <span>{asDate(pickFirst(row, ['transfer_date', 'date', 'vr_date']))}</span>,
    },
    {
      key: 'from_branch',
      header: 'From',
      headerClass: 'w-56',
      cellClass: 'w-56',
      render: (row: any) => (
        <span>{pickFirst(row, ['from_branch_name', 'from_branch', 'branch_from']) || '-'}</span>
      ),
    },
    {
      key: 'to_branch',
      header: 'To',
      headerClass: 'w-56',
      cellClass: 'w-56',
      render: (row: any) => (
        <span>{pickFirst(row, ['to_branch_name', 'to_branch', 'branch_to']) || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center w-28',
      cellClass: 'text-center w-28',
      render: (row: any) => {
        const s = Number(pickFirst(row, ['transfer_status', 'status']) || 0);
        const meta = TRANSFER_STATUS[s];
        return meta ? (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>
            {meta.label}
          </span>
        ) : (
          <span>-</span>
        );
      },
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: any) => <span>{pickFirst(row, ['product_name', 'product']) || '-'}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-right w-24',
      cellClass: 'text-right w-24',
      render: (row: any) => (
        <span>{thousandSeparator(Number(pickFirst(row, ['qty', 'quantity']) || 0))}</span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => (
        <span>{thousandSeparator(Number(pickFirst(row, ['rate', 'unit_price']) || 0))}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right w-30',
      cellClass: 'text-right w-30',
      render: (row: any) => {
        const qty = Number(pickFirst(row, ['qty', 'quantity']) || 0);
        const rate = Number(pickFirst(row, ['rate', 'unit_price']) || 0);
        return <span>{thousandSeparator(qty * rate)}</span>;
      },
    },
    {
      key: 'action',
      header: 'Action',
      // Room for three icons, which is the most either end sees: the sending
      // branch gets edit, delete and print; the destination gets print and
      // receive.
      headerClass: 'text-center w-32',
      cellClass: 'text-center w-32',
      render: (row: any) => {
        const fromBranch = Number(pickFirst(row, ['from_branch', 'from_branch_id']) || 0);
        const toBranch = Number(pickFirst(row, ['to_branch', 'to_branch_id']) || 0);
        const status = Number(pickFirst(row, ['transfer_status', 'status']) || 0);
        // Only the destination branch's user can receive, and only while the
        // transfer is still in transit.
        const canReceive =
          myBranchId &&
          toBranch === Number(myBranchId) &&
          status === STATUS_IN_TRANSIT;

        // The voucher belongs to the branch that raised it -- this list is
        // issues only, so that is the sending branch. The destination sees the
        // row because the goods are coming to it, but the paper is not its to
        // change: the API refuses an edit or a delete from anybody else, so
        // offering the buttons here only ever bought a refusal.
        const isOwnVoucher = Boolean(myBranchId) && fromBranch === Number(myBranchId);

        // And only while nothing has been received against it. Once the other
        // end has taken the goods in, the receive was priced from these lines,
        // and changing them underneath it would leave the two ends disagreeing
        // about what travelled -- which is what the API refuses anyway.
        const canEdit = isOwnVoucher && status === STATUS_IN_TRANSIT;

        return (
          <div className="flex items-center justify-center gap-3">
            {canEdit ? (
              <button
                type="button"
                title="Edit this transfer"
                onClick={() =>
                  navigate(ROUTES.branch_transfer, { state: { editTransferId: row.id } })
                }
                className="text-warning hover:opacity-80"
              >
                <FiEdit2 className="inline h-4 w-4" />
              </button>
            ) : null}
            {isOwnVoucher ? (
              <button
                type="button"
                title="Delete this transfer"
                disabled={deletingId === row.id}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setPendingDelete({
                    id: Number(row.id),
                    vrNo: String(pickFirst(row, ['vr_no', 'transfer_no', 'voucher_no']) || ''),
                    at: { top: rect.bottom + 10, left: rect.left + rect.width / 2 },
                  });
                }}
                className="text-danger hover:opacity-80 disabled:opacity-40"
              >
                <FiTrash2 className="inline h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              title="Print challan"
              disabled={printingId === row.id}
              onClick={() => handlePrint(row.id)}
              className="text-primary hover:opacity-80 disabled:opacity-40"
            >
              <FiPrinter className="inline h-4 w-4" />
            </button>
            {canReceive ? (
              <button
                type="button"
                title="Receive this transfer"
                onClick={() =>
                  navigate(ROUTES.branch_received, { state: { sourceTransferId: row.id } })
                }
                className="text-meta-3 hover:opacity-80"
              >
                <FiInbox className="inline h-4 w-4" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mt-6">
      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearch}
            buttonLoading={searchLoading}
            label="Search"
            icon={<FiSearch className="mr-2 h-4 w-4" />}
            className="whitespace-nowrap"
          />
        </div>

        {/* Both belong to the printed challan, not to the list: the challan is
            what gets read on paper, and how much fits on a page depends on the
            printer and the eyes in front of it. Laid out as the Cash Book lays
            them out, so anyone who has set them once knows these. */}
        <div className="flex items-end gap-2">
          <div>
            <PrintFontInput
              id="challanFont"
              name="challanFont"
              label=""
              // A box of bare digits says nothing about what it governs. The
              // bubble goes to the left because this row scrolls: hung beneath
              // the box it would overflow the row's height and earn it a
              // scrollbar, where to the left it sits in the gap the toolbar
              // already leaves between the search button and this box.
              title="Font Size for print"
              titlePlacement="left"
              value={String(printFont)}
              onChange={handlePrintFontChange}
              type="text"
              className="h-10 !w-20 text-center text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {transfer?.isLoading ? <Loader /> : ''}
        <Table
          columns={columns}
          data={tableData}
          className=""
          renderRowExpansion={(row: any) =>
            comparedTransferId === Number(row?.id) && comparison ? (
              <ComparisonPanel
                comparison={comparison}
                onClose={() => toggleComparison(Number(row?.id))}
              />
            ) : null
          }
        />
        {totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : (
          ''
        )}
      </div>

      <InlineConfirm
        position={pendingDelete?.at ?? null}
        question={
          pendingDelete?.vrNo
            ? `Delete ${pendingDelete.vrNo}?`
            : 'Delete this transfer?'
        }
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const pending = pendingDelete;
          setPendingDelete(null);
          if (pending) deleteTransfer(pending.id);
        }}
      />

      {/* Hidden — react-to-print pulls from this ref on demand. */}
      <div className="hidden">
        <ChallanPrint
          ref={printRef}
          master={transfer?.details?.master}
          details={transfer?.details?.details || []}
          rowsPerPage={printRows}
          fontSize={printFont}
        />
      </div>
    </div>
  );
};

export default TransferList;

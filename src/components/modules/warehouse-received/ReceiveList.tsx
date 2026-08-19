import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiMinus, FiPlus, FiPrinter, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import httpService from '../../services/httpService';
import { API_BRANCH_TRANSFER_COMPARISON_URL } from '../../services/apiRoutes';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ChallanPrint from '../warehouse-transfer/ChallanPrint';
import ComparisonPanel from '../warehouse-transfer/ComparisonPanel';
import { getBranchTransferDetails } from '../warehouse-transfer/warehouseTransferSlice';
import { getBranchReceived } from './warehouseReceivedSlice';
import dayjs from 'dayjs';

interface ReceiveListProps {
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

const ReceiveList = ({ refreshKey = 0 }: ReceiveListProps) => {
  const dispatch = useDispatch<any>();
  const received = useSelector((s: any) => s.branchReceived);
  // A receive is a row of inventory_transfer_masters like an issue is, so the
  // transfer details endpoint serves the print for both.
  const transferDetails = useSelector((s: any) => s.branchTransfer?.details);

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  // How the printed challan is set out, as on the Transfer List.
  const [printRows, setPrintRows] = useState<number>(0);
  const [printFont, setPrintFont] = useState<number>(11);

  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintRows(Number.isFinite(value) && value > 0 ? value : 0);
  };

  const handlePrintFontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintFont(Number.isFinite(value) && value > 0 ? value : 11);
  };
  const [searchLoading, setSearchLoading] = useState(false);
  const [printingId, setPrintingId] = useState<number | string | null>(null);
  // One receive compared at a time, as on the Transfer List.
  const [comparedReceiveId, setComparedReceiveId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<any | null>(null);
  const [comparingId, setComparingId] = useState<number | null>(null);

  /**
   * Opens what was sent against what arrived.
   *
   * Handed a receive, the endpoint answers about the issue behind it, so the
   * receiving branch sees the same figures the issuing one does -- including
   * anything received against that issue on another note.
   */
  const toggleComparison = async (receiveId: number) => {
    if (comparedReceiveId === receiveId) {
      setComparedReceiveId(null);
      setComparison(null);
      return;
    }

    setComparingId(receiveId);
    try {
      const response = await httpService.get(
        `${API_BRANCH_TRANSFER_COMPARISON_URL}${receiveId}`,
      );
      setComparison(response?.data?.data?.data ?? null);
      setComparedReceiveId(receiveId);
    } catch {
      toast.error('Could not load the issued versus received figures.');
      setComparedReceiveId(null);
      setComparison(null);
    } finally {
      setComparingId(null);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const printReceiveNote = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Received Challan',
  });

  // Fetch the receive's lines by id, then print once the hidden component has
  // re-rendered with them. Mirrors the Transfer List challan print.
  const handlePrint = (id: number | string) => {
    if (printingId) return;
    setPrintingId(id);
    dispatch(getBranchTransferDetails(id))
      .unwrap()
      .then(() => setTimeout(() => printReceiveNote(), 300))
      .catch(() => {})
      .finally(() => setTimeout(() => setPrintingId(null), 400));
  };

  useEffect(() => {
    dispatch(getBranchReceived({ page, perPage, search }));
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(getBranchReceived({ page: 1, perPage, search }));
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

  const totalPages = Number(received?.pagination?.lastPage || 1);
  const tableData = Array.isArray(received?.data) ? received.data : [];

  const columns = [
    {
      // Ahead of the serial, in the Action icons' blue -- same place and same
      // look as the Transfer List, so it reads as one feature seen twice.
      key: 'compare',
      header: '',
      headerClass: 'text-center !pl-0',
      cellClass: 'text-center w-8 !px-1',
      render: (row: any) => {
        const id = Number(row?.id || 0);
        if (!id) return null;
        const isOpen = comparedReceiveId === id;

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
      headerClass: 'text-center w-16 !pl-0',
      cellClass: 'text-center w-16 !pl-0',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'vr_no',
      header: 'Voucher',
      headerClass: 'w-40',
      cellClass: 'w-40',
      render: (row: any) => (
        <span>{pickFirst(row, ['vr_no', 'receive_no', 'transfer_no', 'voucher_no']) || '-'}</span>
      ),
    },
    {
      key: 'transfer_date',
      header: 'Date',
      headerClass: 'w-36',
      cellClass: 'w-36',
      render: (row: any) => (
        <span>{asDate(pickFirst(row, ['receive_date', 'transfer_date', 'date', 'vr_date']))}</span>
      ),
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
      headerClass: 'text-center w-24',
      cellClass: 'text-center w-24',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            title="Print receive note"
            disabled={printingId === row.id}
            onClick={() => handlePrint(row.id)}
            className="text-primary hover:opacity-80 disabled:opacity-40"
          >
            <FiPrinter className="inline h-4 w-4" />
          </button>
        </div>
      ),
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

        {/* Both belong to the printed challan, not to the list, and are set
            out as the Transfer List sets them out. */}
        <div className="flex items-end gap-2">
          <div>
            
            <PrintFontInput
              id="receiveChallanFont"
              name="receiveChallanFont"
              label=""
              value={String(printFont)}
              onChange={handlePrintFontChange}
              type="text"
              className="h-10 !w-20 text-center text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {received?.isLoading ? <Loader /> : ''}
        <Table
          columns={columns}
          data={tableData}
          className=""
          renderRowExpansion={(row: any) =>
            comparedReceiveId === Number(row?.id) && comparison ? (
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

      {/* Hidden â€” react-to-print pulls from this ref on demand. */}
      <div className="hidden">
        <ChallanPrint
          ref={printRef}
          master={transferDetails?.master}
          details={transferDetails?.details || []}
          rowsPerPage={printRows}
          fontSize={printFont}
        />
      </div>
    </div>
  );
};

export default ReceiveList;

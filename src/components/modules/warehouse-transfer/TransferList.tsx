import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiSearch } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getBranchTransfers, getBranchTransferDetails } from './warehouseTransferSlice';
import ChallanPrint from './ChallanPrint';

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

// transfer_status: 1 = issued (still in transit), 2 = partially received,
// 3 = fully received. Shows at a glance which stock hasn't arrived yet.
const TRANSFER_STATUS: Record<number, { label: string; className: string }> = {
  1: { label: 'In Transit', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  2: { label: 'Partial', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  3: { label: 'Received', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const TransferList = ({ refreshKey = 0 }: TransferListProps) => {
  const dispatch = useDispatch<any>();
  const transfer = useSelector((s: any) => s.branchTransfer);

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [printingId, setPrintingId] = useState<number | string | null>(null);

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
    dispatch(getBranchTransfers({ page, perPage, search }));
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(getBranchTransfers({ page: 1, perPage, search }));
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
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
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
      render: (row: any) => <span>{pickFirst(row, ['transfer_date', 'date', 'vr_date']) || '-'}</span>,
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
      headerClass: 'text-center w-20',
      cellClass: 'text-center w-20',
      render: (row: any) => (
        <button
          type="button"
          title="Print challan"
          disabled={printingId === row.id}
          onClick={() => handlePrint(row.id)}
          className="text-primary hover:opacity-80 disabled:opacity-40"
        >
          <FiPrinter className="inline h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Transfer List</h3>

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
      </div>

      <div className="relative overflow-x-auto">
        {transfer?.isLoading ? <Loader /> : ''}
        <Table columns={columns} data={tableData} className="" />
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

      {/* Hidden — react-to-print pulls from this ref on demand. */}
      <div className="hidden">
        <ChallanPrint
          ref={printRef}
          master={transfer?.details?.master}
          details={transfer?.details?.details || []}
        />
      </div>
    </div>
  );
};

export default TransferList;

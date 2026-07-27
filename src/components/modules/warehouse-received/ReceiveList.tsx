import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ChallanPrint from '../warehouse-transfer/ChallanPrint';
import { getBranchTransferDetails } from '../warehouse-transfer/warehouseTransferSlice';
import { getBranchReceived } from './warehouseReceivedSlice';

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
  const [searchLoading, setSearchLoading] = useState(false);
  const [printingId, setPrintingId] = useState<number | string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const printReceiveNote = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Goods Receive Note',
    removeAfterPrint: true,
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
        <span>{pickFirst(row, ['vr_no', 'receive_no', 'transfer_no', 'voucher_no']) || '-'}</span>
      ),
    },
    {
      key: 'transfer_date',
      header: 'Date',
      headerClass: 'w-36',
      cellClass: 'w-36',
      render: (row: any) => (
        <span>{pickFirst(row, ['receive_date', 'transfer_date', 'date', 'vr_date']) || '-'}</span>
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
      <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Receive List</h3>

      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearch}
            buttonLoading={searchLoading}
            label="Search"
            className="whitespace-nowrap"
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {received?.isLoading ? <Loader /> : ''}
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
          master={transferDetails?.master}
          details={transferDetails?.details || []}
          title="Goods Receive Note"
        />
      </div>
    </div>
  );
};

export default ReceiveList;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheckCircle, FiPrinter, FiRotateCcw, FiSearch, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { hasPermission } from '../../utils/permissionChecker';
import httpService from '../../services/httpService';
import { API_APPROVAL_CENTER_ACTION_URL } from '../../services/apiRoutes';
import { destroyProductOut, getProductOutReasons, getProductOuts } from './productOutSlice';
import ProductOutPrintModal from './ProductOutPrintModal';

interface ProductOutListProps {
  refreshKey?: number;
}

/**
 * Pending and approved write-offs.
 *
 * ⚠️ THE APPROVE BUTTON IS THE APPROVAL CENTER'S OWN ENDPOINT. Every voucher
 * type here is approved through `approval-center/action`, and a write-off is a
 * voucher -- so this button posts there rather than opening a second door that
 * would approve stock without the permission and the trail the center applies.
 * Approving is also the moment the stock moves (ProductOutPosting), which is
 * why the row says so once it is done.
 */
const ProductOutList = ({ refreshKey = 0 }: ProductOutListProps) => {
  const dispatch = useDispatch<any>();
  const productOut = useSelector((s: any) => s.productOut);
  const settings = useSelector((s: any) => s.settings);
  const canApprove = hasPermission(settings?.data?.permissions, 'product.out.approve');
  const canDelete = hasPermission(settings?.data?.permissions, 'product.out.create');

  const reasons: any[] = Array.isArray(productOut?.reasons) ? productOut.reasons : [];

  const [search, setSearchValue] = useState('');
  const [approval, setApproval] = useState('all');
  const [reasonId, setReasonId] = useState('');
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [printId, setPrintId] = useState<number | string | null>(null);

  // Every filter is passed in rather than read from state, because the setState
  // above a reload has not landed yet -- reading it back would send the previous
  // filter and quietly show the wrong rows.
  const load = (overrides: any = {}) => {
    const nextApproval = overrides.approval ?? approval;
    const nextReason = overrides.reasonId ?? reasonId;

    dispatch(
      getProductOuts({
        page: overrides.page ?? page,
        perPage,
        search,
        approval: nextApproval,
        reason_id: nextReason || undefined,
      }),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, perPage, refreshKey]);

  useEffect(() => {
    if (!reasons.length) dispatch(getProductOutReasons());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    load({ page: 1 });
    setTimeout(() => setSearchLoading(false), 150);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    setPerPage(selected === '' ? '' : Number(selected));
    setCurrentPage(1);
    setPage(1);
  };

  const handleFilterChange = (which: 'approval' | 'reasonId') => (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = event.target.value;

    if (which === 'approval') setApproval(value);
    else setReasonId(value);

    setPage(1);
    setCurrentPage(1);
    load({ page: 1, [which]: value });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const runApproval = async (row: any, action: 'approve' | 'remove') => {
    const verb = action === 'approve' ? 'Approve' : 'Take the approval back off';
    const note =
      action === 'approve'
        ? 'The stock goes off the shelf the moment this is approved.'
        : 'The stock comes back onto the shelf.';

    if (!window.confirm(`${verb} ${row.out_no}?\n\n${note}`)) return;

    setBusyId(row.id);
    try {
      const response = await httpService.post(API_APPROVAL_CENTER_ACTION_URL, {
        type: 'voucher',
        action,
        ids: [Number(row.main_trx_id)],
        remarks: `${verb} from the product out list`,
      });
      toast.success(response?.data?.message || `${verb} done`);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || `${verb} failed`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (row: any) => {
    if (!window.confirm(`Delete ${row.out_no}?`)) return;

    setBusyId(row.id);
    dispatch(
      destroyProductOut(row.id, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Deleted');
          load();
        } else {
          toast.error(response?.message || 'Delete failed');
        }
        setBusyId(null);
      }),
    );
  };

  const totalPages = Number(productOut?.pagination?.lastPage || 1);
  const tableData = Array.isArray(productOut?.data) ? productOut.data : [];

  const columns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'out_no',
      header: 'Out No',
      headerClass: 'w-40',
      cellClass: 'w-40',
      render: (row: any) => <span>{row?.out_no || '-'}</span>,
    },
    {
      key: 'out_date',
      header: 'Date',
      headerClass: 'w-28',
      cellClass: 'w-28',
      render: (row: any) => <span>{row?.out_date || '-'}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: any) => <span>{row?.reason_name || '-'}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row: any) => <span>{row?.warehouse_name || '-'}</span>,
    },
    {
      key: 'party',
      header: 'Went Back To',
      render: (row: any) => <span>{row?.party_name || '-'}</span>,
    },
    {
      key: 'item_count',
      header: 'Items',
      headerClass: 'text-right w-20',
      cellClass: 'text-right w-20',
      render: (row: any) => <span>{Number(row?.item_count || 0)}</span>,
    },
    {
      key: 'total_qty',
      header: 'Total Qty',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => <span>{thousandSeparator(Number(row?.total_qty || 0))}</span>,
    },
    {
      key: 'status',
      header: 'Stock',
      headerClass: 'text-center w-32',
      cellClass: 'text-center w-32',
      // The row has to say what the shelf currently thinks, because a pending
      // slip is a breakage the stock does NOT yet know about.
      render: (row: any) => (
        <span
          className={
            row?.is_approved
              ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          }
        >
          {row?.is_approved ? 'Off the shelf' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center w-40',
      cellClass: 'text-center w-40',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            onClick={() => setPrintId(row?.id)}
            title="Print"
            className="text-primary hover:text-blue-700"
          >
            <FiPrinter className="cursor-pointer text-lg" />
          </Button>

          {canApprove &&
            (row?.is_approved ? (
              <Button
                type="button"
                disabled={busyId === row?.id}
                onClick={() => runApproval(row, 'remove')}
                title="Take the approval back off"
                className="text-amber-600 hover:text-amber-800 disabled:opacity-40"
              >
                <FiRotateCcw className="cursor-pointer text-lg" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busyId === row?.id}
                onClick={() => runApproval(row, 'approve')}
                title="Approve — takes the stock off the shelf"
                className="text-green-600 hover:text-green-800 disabled:opacity-40"
              >
                <FiCheckCircle className="cursor-pointer text-lg" />
              </Button>
            ))}

          {canDelete && !row?.is_approved && (
            <Button
              type="button"
              disabled={busyId === row?.id}
              onClick={() => handleDelete(row)}
              title="Delete"
              className="text-red-500 hover:text-red-700 disabled:opacity-40"
            >
              <FiTrash2 className="cursor-pointer text-lg" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] mb-2">
        Write-off List
      </h3>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
        <select
          value={approval}
          onChange={handleFilterChange('approval')}
          className="rounded border border-[rgb(var(--c-border))] bg-white px-2 text-sm dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-text))]"
        >
          <option value="all">All</option>
          <option value="pending">Pending only</option>
          <option value="approved">Approved only</option>
        </select>
        <select
          value={reasonId}
          onChange={handleFilterChange('reasonId')}
          className="rounded border border-[rgb(var(--c-border))] bg-white px-2 text-sm dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-text))]"
        >
          <option value="">Every reason</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
        <ButtonLoading
          onClick={handleSearch}
          buttonLoading={searchLoading}
          label="Search"
          className="whitespace-nowrap w-30 text-left"
          icon={<FiSearch />}
        />
      </div>

      <div className="relative overflow-x-auto">
        {productOut?.isLoading ? <Loader /> : ''}
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

      {printId !== null && (
        <ProductOutPrintModal id={printId} onClose={() => setPrintId(null)} />
      )}
    </div>
  );
};

export default ProductOutList;

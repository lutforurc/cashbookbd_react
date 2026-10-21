import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheckCircle, FiEdit2, FiPrinter, FiRotateCcw, FiSearch, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
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
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import ImagePopup from '../../utils/others/ImagePopup';

interface ProductOutListProps {
  refreshKey?: number;
  /** Open this slip in the form above for changing. */
  onEdit?: (id: number) => void;
}

/**
 * Pending and approved write-offs.
 *
 * ⚠️ THE APPROVE BUTTON IS THE APPROVAL CENTER'S OWN ENDPOINT. Every voucher
 * type here is approved through `approval-center/action`, and a write-off is a
 * voucher -- so this button posts there rather than opening a second door that
 * would approve stock without the permission and the trail the center applies.
 * The stock already moved at save; approving is only the sign-off.
 */
const ProductOutList = ({ refreshKey = 0, onEdit }: ProductOutListProps) => {
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

  // The approval being asked about, put in the voucher screens' ConfirmModal
  // rather than the browser's confirm() box.
  const [approvalAsk, setApprovalAsk] = useState<{ row: any; action: 'approve' | 'remove' } | null>(null);

  const runApproval = (row: any, action: 'approve' | 'remove') => setApprovalAsk({ row, action });

  const handleApprovalConfirmed = async () => {
    if (!approvalAsk) return;
    const { row, action } = approvalAsk;
    const verb = action === 'approve' ? 'Approve' : 'Take the approval back off';

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
      setApprovalAsk(null);
    }
  };

  // The row the delete question is being asked about. The voucher screens' own
  // ConfirmModal puts it, rather than the browser's confirm() box.
  const [deleteRow, setDeleteRow] = useState<any | null>(null);

  const handleDelete = (row: any) => setDeleteRow(row);

  const handleDeleteConfirmed = () => {
    const row = deleteRow;
    if (!row) return;

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
        setDeleteRow(null);
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
      // The photos on the slip's voucher, opened in the same viewer the Cash
      // Book's Voucher column uses. Empty when there are none.
      key: 'voucher_image',
      header: 'Photos',
      headerClass: 'text-center w-24',
      cellClass: 'text-center w-24',
      render: (row: any) =>
        row?.voucher_image ? (
          <ImagePopup
            title={row?.out_no || ''}
            branchPad={row?.branch_pad || ''}
            voucher_image={row.voucher_image}
            openPdfInNewTab
          />
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'status',
      header: 'Approval',
      headerClass: 'text-center w-32',
      cellClass: 'text-center w-32',
      render: (row: any) => (
        <span
          className={
            row?.is_approved
              ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          }
        >
          {row?.is_approved ? 'Approved' : 'Pending'}
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
                title="Approve"
                className="text-green-600 hover:text-green-800 disabled:opacity-40"
              >
                <FiCheckCircle className="cursor-pointer text-lg" />
              </Button>
            ))}

          {/* Edit sits under the same rule as Delete: the slip's own
              permission, and not once it is signed off. */}
          {canDelete && !row?.is_approved && onEdit && (
            <Button
              type="button"
              disabled={busyId === row?.id}
              onClick={() => onEdit(row.id)}
              title="Edit"
              className="text-green-600 hover:text-green-800 disabled:opacity-40"
            >
              <FiEdit2 className="cursor-pointer text-lg" />
            </Button>
          )}

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
        {/* Same class as SelectOption beside it, so every control in the row
            stands at the one --control-height. */}
        <select
          value={approval}
          onChange={handleFilterChange('approval')}
          className={`${FIELD_SELECT} block p-2 text-sm`}
        >
          <option value="all">All</option>
          <option value="pending">Pending only</option>
          <option value="approved">Approved only</option>
        </select>
        <select
          value={reasonId}
          onChange={handleFilterChange('reasonId')}
          className={`${FIELD_SELECT} block p-2 text-sm`}
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

      <ConfirmModal
        show={approvalAsk !== null}
        title={approvalAsk?.action === 'remove' ? 'Remove Approval' : 'Confirm Approval'}
        message={
          <>
            {approvalAsk?.action === 'remove'
              ? 'Take the approval back off write-off'
              : 'Are you sure you want to approve write-off'}
            <span className="block font-bold mt-1">{approvalAsk?.row?.out_no} ?</span>
            <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">
              The stock already left the shelf at save; this does not change it.
            </span>
          </>
        }
        confirmLabel={approvalAsk?.action === 'remove' ? 'Remove Approval' : 'Approve'}
        loading={approvalAsk !== null && busyId === approvalAsk?.row?.id}
        onCancel={() => setApprovalAsk(null)}
        onConfirm={handleApprovalConfirmed}
        className={
          approvalAsk?.action === 'remove'
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-green-600 hover:bg-green-700'
        }
      />

      {/* The same dialog the Voucher Delete screen asks with. */}
      <ConfirmModal
        show={deleteRow !== null}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete write-off
            <span className="block font-bold mt-1">{deleteRow?.out_no} ?</span>
          </>
        }
        loading={deleteRow !== null && busyId === deleteRow?.id}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default ProductOutList;

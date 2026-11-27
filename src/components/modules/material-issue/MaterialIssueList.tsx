import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiCheckSquare, FiEdit2, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import SearchInput from '../../utils/fields/SearchInput';
import Table from '../../utils/others/Table';
import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import InlineConfirm, {
  InlineConfirmPosition,
} from '../../utils/components/InlineConfirm';
import { hasPermission } from '../../utils/permissionChecker';
import httpService from '../../services/httpService';
import { API_MATERIAL_ISSUE_DESTROY_URL } from '../../services/apiRoutes';
import ROUTES from '../../services/appRoutes';
import { getMaterialIssues } from './materialIssueSlice';
import MaterialIssuePrintModal from './MaterialIssuePrintModal';

interface MaterialIssueListProps {
  refreshKey?: number;
}

const MaterialIssueList = ({ refreshKey = 0 }: MaterialIssueListProps) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const materialIssue = useSelector((s: any) => s.materialIssue);
  const permissions = useSelector((s: any) => s.settings?.data?.permissions ?? []);
  // Correcting an issue opens the issue form, which the create permission
  // guards; a reader who may only view the list is not offered the edit.
  const canEdit = hasPermission(permissions, 'material.issue.create');

  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | string>(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [printId, setPrintId] = useState<number | string | null>(null);
  // Which row is being asked about, and where its button is, so the confirm
  // opens against that row rather than in the middle of the list.
  const [pendingDelete, setPendingDelete] = useState<
    { id: number | string; issueNo: string; at: InlineConfirmPosition } | null
  >(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  useEffect(() => {
    dispatch(getMaterialIssues({ page, perPage, search }));
  }, [dispatch, page, perPage, refreshKey]);

  const handleSearch = () => {
    setSearchLoading(true);
    setCurrentPage(1);
    setPage(1);
    dispatch(getMaterialIssues({ page: 1, perPage, search }));
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

  /** Sends the issue to the recycle bin, where it can be restored. */
  const deleteIssue = async (id: number | string) => {
    setDeletingId(id);

    try {
      const response = await httpService.post(`${API_MATERIAL_ISSUE_DESTROY_URL}${id}`);

      if (response?.data?.success) {
        toast.success(response.data.message || 'Material issue deleted.');
        // Anything opened against the row that has just gone would be reading a
        // challan no longer in the list.
        setPrintId(null);
        dispatch(getMaterialIssues({ page, perPage, search }));
        return;
      }

      // A refusal -- a closed year, another branch's voucher -- carries the
      // reason, and the reason is the whole point of showing it.
      toast.error(
        response?.data?.message || response?.data?.error?.message || 'Could not delete this issue.',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Could not delete this issue.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Number(materialIssue?.pagination?.lastPage || 1);
  const tableData = Array.isArray(materialIssue?.data) ? materialIssue.data : [];

  const columns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'issue_no',
      header: 'Issue No',
      headerClass: 'w-32',
      cellClass: 'w-32',
      render: (row: any) => <span>{row?.issue_no || '-'}</span>,
    },
    {
      key: 'issue_date',
      header: 'Date',
      headerClass: 'w-32',
      cellClass: 'w-32',
      render: (row: any) => <span>{row?.issue_date && dayjs(row.issue_date).isValid() ? dayjs(row.issue_date).format('DD/MM/YYYY') : '-'}</span>,
    },
    {
      key: 'project',
      header: 'Project / Site',
      render: (row: any) => <span>{row?.project_name || '-'}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row: any) => <span>{row?.warehouse_name || '-'}</span>,
    },
    {
      key: 'received_by',
      header: 'Received By',
      render: (row: any) => <span>{row?.received_by || '-'}</span>,
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
      key: 'action',
      header: 'Action',
      headerClass: 'text-center w-28',
      cellClass: 'text-center w-28',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          {canEdit ? (
            <Button
              type="button"
              onClick={() =>
                navigate(ROUTES.material_issue, { state: { editIssueId: row?.id } })
              }
              title="Edit this issue"
              className="text-amber-500 hover:text-amber-700"
            >
              <FiEdit2 className="mx-auto cursor-pointer text-lg" />
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              type="button"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setPendingDelete({
                  id: row?.id,
                  issueNo: String(row?.issue_no || ''),
                  at: { top: rect.bottom + 10, left: rect.left + rect.width / 2 },
                });
              }}
              title="Delete this issue"
              disabled={deletingId === row?.id}
              className="text-red-500 hover:text-red-700 disabled:opacity-40"
            >
              <FiTrash2 className="mx-auto cursor-pointer text-lg" />
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => setPrintId(row?.id)}
            title="Print"
            className="text-primary hover:text-blue-700"
          >
            <FiPrinter className="mx-auto cursor-pointer text-lg" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          {/* Issue No, the products on the lines, and the line's work item --
              the three things somebody actually remembers about a challan.
              Enter runs the same search the button does. */}
          <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap"
            placeholder="Issue No, Product or Work Item"
            onEnter={handleSearch}
          />
          <ButtonLoading
            onClick={handleSearch}
            buttonLoading={searchLoading}
            label="Search"
            className="whitespace-nowrap w-30 text-left"
            icon={<FiCheckSquare />}
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {materialIssue?.isLoading ? <Loader /> : ''}
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

      <InlineConfirm
        position={pendingDelete?.at ?? null}
        question={
          pendingDelete?.issueNo
            ? `Delete ${pendingDelete.issueNo}?`
            : 'Delete this issue?'
        }
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const pending = pendingDelete;
          setPendingDelete(null);
          if (pending) deleteIssue(pending.id);
        }}
      />

      {printId !== null && (
        <MaterialIssuePrintModal id={printId} onClose={() => setPrintId(null)} />
      )}
    </div>
  );
};

export default MaterialIssueList;

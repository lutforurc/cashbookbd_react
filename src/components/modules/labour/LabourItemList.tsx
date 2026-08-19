import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import SearchInput from '../../utils/fields/SearchInput';
import SelectOption from '../../utils/utils-functions/SelectOption';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { hasPermission } from '../../utils/permissionChecker';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import routes from '../../services/appRoutes';
import {
  LabourItem as LabourItemRow,
  labourCategoryDdl,
  labourItemDelete,
  labourItemList,
  labourItemStatus,
  setItemStatus,
} from './labourSetupSlice';

/**
 * Labour items — the list, with the form on its own page.
 *
 * The category filter sits with the other filters rather than in the table:
 * items are read category by category far more often than all at once.
 */
const LabourItemList = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const { items, categoryDdl, loading, saving } = useSelector((state: any) => state.labourSetup);
  const permissions = useSelector((state: any) => state.settings?.data?.permissions) || [];

  const canEdit = hasPermission(permissions, 'labour.item.edit');
  const canDelete = hasPermission(permissions, 'labour.item.delete');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | number>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [rowToDelete, setRowToDelete] = useState<LabourItemRow | null>(null);

  useEffect(() => {
    dispatch(labourCategoryDdl());
  }, [dispatch]);

  const load = () => {
    dispatch(
      labourItemList({
        page,
        per_page: perPage,
        q: q || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      }),
    );
  };

  useEffect(load, [dispatch, page, perPage, q, categoryFilter]);

  const totalPages = perPage > 0 ? Math.ceil((items?.total || 0) / perPage) : 0;

  const filterOptions = useMemo(
    () => [{ id: '', name: 'All Categories' }, ...(Array.isArray(categoryDdl) ? categoryDdl : [])],
    [categoryDdl],
  );

  const handleDeleteConfirmed = async () => {
    if (!rowToDelete) return;

    const result = await dispatch(labourItemDelete(rowToDelete.id));
    setRowToDelete(null);

    if (labourItemDelete.rejected.match(result)) {
      toast.info(String(result.payload ?? 'Could not delete the labour item'));
      return;
    }

    toast.success('Labour item deleted');
    load();
  };

  /** The row moves first, the request follows -- see LabourCategoryList. */
  const handleStatusChange = async (row: LabourItemRow, checked: boolean) => {
    dispatch(setItemStatus({ id: row.id, status: checked ? 1 : 0 }));

    const result = await dispatch(labourItemStatus({ id: row.id, status: checked }));

    if (labourItemStatus.rejected.match(result)) {
      dispatch(setItemStatus({ id: row.id, status: checked ? 0 : 1 }));
      toast.info(String(result.payload ?? 'Could not change the status'));
    }
  };

  const columns = [
    { key: 'serial_no', header: 'Sl. No.', headerClass: 'text-center w-24', cellClass: 'text-center' },
    {
      key: 'category_name',
      header: 'Category',
      render: (row: LabourItemRow) => <div>{row.category_name || '-'}</div>,
    },
    { key: 'name', header: 'Item Name' },
    {
      key: 'description',
      header: 'Description',
      render: (row: LabourItemRow) => <div>{row.description || '-'}</div>,
    },
    {
      key: 'unit_name',
      header: 'Unit',
      headerClass: 'text-center w-24',
      cellClass: 'text-center',
      render: (row: LabourItemRow) => <div>{row.unit_name || '-'}</div>,
    },
    {
      key: 'purchase_price',
      header: 'Rate',
      headerClass: 'text-right w-28',
      cellClass: 'text-right',
      render: (row: LabourItemRow) => <div>{thousandSeparator(Number(row.purchase_price || 0))}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center w-32',
      cellClass: 'text-center',
      render: (row: LabourItemRow) => (
        <div className="flex justify-center">
          <ToggleSwitch
            ariaLabel={`${row.name} active`}
            checked={Number(row.status) === 1}
            disabled={!canEdit}
            onChange={(checked) => handleStatusChange(row, checked)}
          />
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center w-28',
      cellClass: 'text-center',
      render: (row: LabourItemRow) => (
        <div className="flex items-center justify-center">
          {canEdit ? (
            <Button
              type="button"
              title="Edit"
              onClick={() => navigate(`${routes.labour_item_edit}/${row.id}`)}
              className="ml-2 text-blue-500"
            >
              <FiEdit2 className="cursor-pointer" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button type="button" title="Delete" onClick={() => setRowToDelete(row)} className="ml-2 text-red-500">
              <FiTrash2 className="cursor-pointer" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Labour Item List" />

      <div className="mb-1 flex justify-between overflow-x-auto">
        <div className="flex">
          <SelectOption
            onChange={(e: any) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="mr-1 md:mr-2"
          />

          <div className="mr-1 w-52 md:mr-2">
            <DropdownCommon
              id="categoryFilter"
              name="categoryFilter"
              value={categoryFilter?.toString()}
              data={filterOptions}
              onChange={(e: any) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className=""
            />
          </div>

          <SearchInput search={search} setSearchValue={setSearch} className="text-nowrap" />

          <ButtonLoading
            onClick={() => {
              setQ(search);
              setPage(1);
            }}
            label="Search"
            icon={<FiSearch />}
            className="whitespace-nowrap"
          />
        </div>

        {canEdit ? (
          <ButtonLoading
            onClick={() => navigate(routes.labour_item_create)}
            label="New Item"
            icon={<FiPlus size={18} />}
            className="whitespace-nowrap"
          />
        ) : null}
      </div>

      <div className="relative overflow-x-auto">
        {loading ? <Loader /> : null}

        <Table columns={columns} data={items?.rows || []} />

        {totalPages > 1 ? (
          <Pagination currentPage={page} totalPages={totalPages} handlePageChange={setPage} />
        ) : null}
      </div>

      <ConfirmModal
        show={rowToDelete !== null}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete
            <span className="mt-1 block font-bold">{rowToDelete?.name} ?</span>
            <span className="mt-2 block text-sm text-body dark:text-bodydark">
              An item already used on a labour bill cannot be deleted — mark it inactive instead.
            </span>
          </>
        }
        loading={saving}
        onCancel={() => setRowToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default LabourItemList;

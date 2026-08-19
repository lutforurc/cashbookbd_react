import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import SearchInput from '../../utils/fields/SearchInput';
import SelectOption from '../../utils/utils-functions/SelectOption';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { hasPermission } from '../../utils/permissionChecker';
import routes from '../../services/appRoutes';
import {
  LabourCategory as LabourCategoryRow,
  labourCategoryDelete,
  labourCategoryList,
  labourCategoryStatus,
  setCategoryStatus,
} from './labourSetupSlice';

/**
 * Labour categories — the list, with the form on its own page.
 *
 * Same shape as the product Category List it sits beside: filters on the left,
 * New on the right, and the row's own actions at the end.
 */
const LabourCategoryList = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const { categories, loading, saving } = useSelector((state: any) => state.labourSetup);
  const permissions = useSelector((state: any) => state.settings?.data?.permissions) || [];

  const canEdit = hasPermission(permissions, 'labour.category.edit');
  const canDelete = hasPermission(permissions, 'labour.category.delete');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [rowToDelete, setRowToDelete] = useState<LabourCategoryRow | null>(null);

  const load = () => {
    dispatch(labourCategoryList({ page, per_page: perPage, q: q || undefined }));
  };

  useEffect(load, [dispatch, page, perPage, q]);

  const totalPages = perPage > 0 ? Math.ceil((categories?.total || 0) / perPage) : 0;

  const handleDeleteConfirmed = async () => {
    if (!rowToDelete) return;

    const result = await dispatch(labourCategoryDelete(rowToDelete.id));
    setRowToDelete(null);

    if (labourCategoryDelete.rejected.match(result)) {
      toast.info(String(result.payload ?? 'Could not delete the labour category'));
      return;
    }

    toast.success('Labour category deleted');
    load();
  };

  /**
   * The row moves first, the request follows.
   *
   * A switch that waits for the server before it slides reads as a switch that
   * did not work, so the list is changed at once and put back if the save
   * fails. The dropdown on the item form only offers active categories, so
   * turning one off here takes it out of that list too.
   */
  const handleStatusChange = async (row: LabourCategoryRow, checked: boolean) => {
    dispatch(setCategoryStatus({ id: row.id, status: checked ? 1 : 0 }));

    const result = await dispatch(labourCategoryStatus({ id: row.id, status: checked }));

    if (labourCategoryStatus.rejected.match(result)) {
      dispatch(setCategoryStatus({ id: row.id, status: checked ? 0 : 1 }));
      toast.info(String(result.payload ?? 'Could not change the status'));
    }
  };

  const columns = [
    { key: 'serial_no', header: 'Sl. No.', headerClass: 'text-center w-24', cellClass: 'text-center' },
    { key: 'name', header: 'Category Name' },
    {
      key: 'description',
      header: 'Category Description',
      render: (row: LabourCategoryRow) => <div>{row.description || '-'}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center w-32',
      cellClass: 'text-center',
      render: (row: LabourCategoryRow) => (
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
      render: (row: LabourCategoryRow) => (
        <div className="flex items-center justify-center">
          {canEdit ? (
            <Button
              type="button"
              title="Edit"
              onClick={() => navigate(`${routes.labour_category_edit}/${row.id}`)}
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
      <HelmetTitle title="Labour Category List" />

      <div className="mb-1 flex justify-between overflow-x-auto">
        <div className="flex">
          <SelectOption
            onChange={(e: any) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="mr-1 md:mr-2"
          />

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
            onClick={() => navigate(routes.labour_category_create)}
            label="New Category"
            icon={<FiPlus size={18} />}
            className="h-9 whitespace-nowrap"
          />
        ) : null}
      </div>

      <div className="relative overflow-x-auto">
        {loading ? <Loader /> : null}

        <Table columns={columns} data={categories?.rows || []} />

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
              A category with labour items under it cannot be deleted.
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

export default LabourCategoryList;

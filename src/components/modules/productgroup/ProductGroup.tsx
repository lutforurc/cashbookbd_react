import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { deleteProductGroup, getProductGroup, storeProductGroup } from './productGroupSlice';
import Table from '../../utils/others/Table';
import InputElement from '../../utils/fields/InputElement';
import { toast } from 'react-toastify';

const emptyEditForm = { id: '', group_name: '', description: '' };

/**
 * Product Group list -- Category List's own shape, with one difference: the
 * owner asked that a new group also be made from this same screen, so there
 * is no separate create page. "New Group" opens the same modal as Edit, with
 * an empty form; apiStoreProductGroup already upserts on whether `id` is set.
 */
const ProductGroup = () => {
  const productGroup = useSelector((state: any) => state.productGroup);
  const dispatch = useDispatch<any>();

  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>(emptyEditForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    dispatch(getProductGroup({ page, perPage, search }));
  }, [dispatch, page, perPage, search]);

  useEffect(() => {
    const paginated = productGroup?.listData;

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);

    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
    }
  }, [productGroup?.listData]);

  const handleSearchButton = () => {
    setButtonLoading(true);

    setCurrentPage(1);
    setPage(1);

    dispatch(getProductGroup({ page: 1, perPage, search }));

    setTimeout(() => setButtonLoading(false), 200);
  };

  const handleSelectChange = (e: any) => {
    const newPerPage = Number(e.target.value);

    setPerPage(newPerPage);
    setPage(1);
    setCurrentPage(1);

    dispatch(getProductGroup({ page: 1, perPage: newPerPage, search }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };

  const openNew = () => {
    setEditForm(emptyEditForm);
    setEditOpen(true);
  };

  const openEdit = (row: any) => {
    setEditForm({
      id: row.id,
      group_name: row.name || '',
      description: row.description || '',
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (e: any) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = () => {
    if (!editForm.group_name.trim()) {
      toast.info('Group name is required');
      return;
    }
    if (!editForm.description.trim()) {
      toast.info('Group description is required');
      return;
    }

    setEditLoading(true);
    dispatch(
      storeProductGroup(editForm, (message: string, success?: boolean) => {
        setEditLoading(false);
        if (success) {
          toast.success(message);
          closeEdit();
          dispatch(getProductGroup({ page, perPage, search }));
        } else {
          toast.error(typeof message === 'string' ? message : 'Failed to save product group');
        }
      }),
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteRow?.id) return;

    setDeleteLoading(true);
    dispatch(
      deleteProductGroup(deleteRow.id, (message: string, success?: boolean) => {
        setDeleteLoading(false);
        if (success) {
          toast.success(message);
          setDeleteRow(null);
          dispatch(getProductGroup({ page, perPage, search }));
        } else {
          // e.g. "This product group has 5 product(s), so it cannot be deleted."
          toast.error(typeof message === 'string' ? message : 'Unable to delete product group');
          setDeleteRow(null);
        }
      }),
    );
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => (currentPage - 1) * perPage + index + 1,
    },
    {
      key: 'name',
      header: 'Group Name',
    },
    {
      key: 'description',
      header: 'Group Description',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (data: any) => (
        <div className="flex justify-center items-center">
          <Button onClick={() => openEdit(data)} className="text-blue-500" title="Edit">
            <FiEdit2 className="cursor-pointer" />
          </Button>
          <Button onClick={() => setDeleteRow(data)} className="text-red-500 ml-2" title="Delete">
            <FiTrash2 className="cursor-pointer" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title={'Product Group'} />

      <div className="flex overflow-x-auto justify-between mb-1">
        <div className="flex">
          <SelectOption
            onChange={handleSelectChange}
            className="mr-1 md:mr-2"
          />

          <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap"
          />

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            icon={<FiSearch className="" />}
            className="whitespace-nowrap"
          />
        </div>

        <ButtonLoading
          onClick={openNew}
          label="New Group"
          size="sm"
          className="whitespace-nowrap text-center mr-0"
          icon={<FiPlus className="text-white text-base ml-1 mr-1" />}
        />
      </div>

      <div className="relative overflow-x-auto">
        {productGroup?.isLoading === true ? <Loader /> : ''}

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

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-5 py-3">
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                {editForm.id ? 'Edit Product Group' : 'New Product Group'}
              </h3>
              <Button
                type="button"
                onClick={closeEdit}
                className="text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
                aria-label="Close"
              >
                <FiX />
              </Button>
            </div>

            <div className="space-y-3 p-5">
              <div>
                <InputElement
                  id="group_name"
                  name="group_name"
                  label="Group Name"
                  placeholder="Group Name"
                  value={editForm.group_name}
                  onChange={handleEditChange}
                />
              </div>
              <div>
                <InputElement
                  id="description"
                  name="description"
                  label="Group Description"
                  placeholder="Group Description"
                  value={editForm.description}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
              <Button
                type="button"
                onClick={closeEdit}
                className="border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleEditSave}
                buttonLoading={editLoading}
                disabled={editLoading}
                label={editForm.id ? 'Update' : 'Save'}
                className="px-6"
                icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
              />
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                <FiTrash2 />
              </span>
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Delete Product Group</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-[rgb(var(--c-text-muted))]">
              Are you sure you want to delete
              <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]"> {deleteRow.name}</span>?
              <p className="mt-1 text-xs text-slate-400">
                If any product exists under this group, it cannot be deleted.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
              <Button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="border border-[rgb(var(--c-border))] px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-meta-4"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleDeleteConfirm}
                buttonLoading={deleteLoading}
                disabled={deleteLoading}
                label="Delete"
                icon={<FiTrash2 className="mr-2" />}
                variant="danger"
                className="px-6"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroup;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit2, FiRefreshCcw, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { deleteCategory, getCategory, storeCategory } from './categorySlice';
import Table from '../../utils/others/Table';
import InputElement from '../../utils/fields/InputElement';
import { toast } from 'react-toastify';

const emptyEditForm = { id: '', category_name: '', description: '' };

const Category = () => {
  const category = useSelector((state: any) => state.category);
  const dispatch = useDispatch<any>();

  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);            // ✅ page 0 না, 1 থেকে শুরু
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

  // ✅ API Call (search/page/perPage change হলে)
  useEffect(() => {
    dispatch(getCategory({ page, perPage, search })); // ✅ আপনার thunk যদি per_page চায়, নিচে দেখুন
  }, [dispatch, page, perPage, search]);

  // ✅ API Response আসলে table + pagination set করবেন
  useEffect(() => {
    const paginated = category?.listData; // ✅ আপনার paginator এখানেই

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);

    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
    }
  }, [category?.listData]);

  const handleSearchButton = () => {
    setButtonLoading(true);

    setCurrentPage(1);
    setPage(1);

    // ✅ state async, তাই page: 1 hard করে পাঠান
    dispatch(getCategory({ page: 1, perPage, search }));

    setTimeout(() => setButtonLoading(false), 200);
  };

  const handleSelectChange = (e: any) => {
    const newPerPage = Number(e.target.value);

    setPerPage(newPerPage);
    setPage(1);
    setCurrentPage(1);

    // ✅ perPage change হলে page 1 থেকে fetch
    dispatch(getCategory({ page: 1, perPage: newPerPage, search }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };

  const openEdit = (row: any) => {
    setEditForm({
      id: row.id,
      category_name: row.name || '',
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
    if (!editForm.category_name.trim()) {
      toast.info('Category name is required');
      return;
    }
    if (!editForm.description.trim()) {
      toast.info('Category description is required');
      return;
    }

    setEditLoading(true);
    dispatch(
      storeCategory(editForm, (message: string, success?: boolean) => {
        setEditLoading(false);
        if (success) {
          toast.success(message);
          closeEdit();
          dispatch(getCategory({ page, perPage, search }));
        } else {
          toast.error(typeof message === 'string' ? message : 'Failed to update category');
        }
      }),
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteRow?.id) return;

    setDeleteLoading(true);
    dispatch(
      deleteCategory(deleteRow.id, (message: string, success?: boolean) => {
        setDeleteLoading(false);
        if (success) {
          toast.success(message);
          setDeleteRow(null);
          dispatch(getCategory({ page, perPage, search }));
        } else {
          // e.g. "This category has 5 product(s), so it cannot be deleted."
          toast.error(typeof message === 'string' ? message : 'Unable to delete category');
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
      header: 'Category Name',
    },
    {
      key: 'description',
      header: 'Category Description',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (data: any) => (
        <div className="flex justify-center items-center">
          <button onClick={() => {}} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button onClick={() => openEdit(data)} className="text-blue-500 ml-2" title="Edit">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => setDeleteRow(data)} className="text-red-500 ml-2" title="Delete">
            <FiTrash2 className="cursor-pointer" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title={'Category List'} />

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

        <Link to="/category/create" className="text-nowrap">
          New Category
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {category?.isLoading === true ? <Loader /> : ''}

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
          <div className="w-full max-w-md border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke px-5 py-3 dark:border-strokedark">
              <h3 className="text-base font-semibold text-black dark:text-white">Edit Category</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div>
                <InputElement
                  id="category_name"
                  name="category_name"
                  label="Category Name"
                  placeholder="Category Name"
                  value={editForm.category_name}
                  onChange={handleEditChange}
                />
              </div>
              <div>
                <InputElement
                  id="description"
                  name="description"
                  label="Category Description"
                  placeholder="Category Description"
                  value={editForm.description}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stroke px-5 py-3 dark:border-strokedark">
              <button
                type="button"
                onClick={closeEdit}
                className="h-9 border border-stroke px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-strokedark dark:text-bodydark dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <ButtonLoading
                type="button"
                onClick={handleEditSave}
                buttonLoading={editLoading}
                disabled={editLoading}
                label="Update"
                className="h-9 px-6"
                icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
              />
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-3 border-b border-stroke px-5 py-3 dark:border-strokedark">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500/10 text-red-500">
                <FiTrash2 />
              </span>
              <h3 className="text-base font-semibold text-black dark:text-white">Delete Category</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-bodydark">
              Are you sure you want to delete
              <span className="font-semibold text-black dark:text-white"> {deleteRow.name}</span>?
              <p className="mt-1 text-xs text-slate-400">
                If any product exists under this category, it cannot be deleted.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-stroke px-5 py-3 dark:border-strokedark">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="h-9 border border-stroke px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-strokedark dark:text-bodydark dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <ButtonLoading
                type="button"
                onClick={handleDeleteConfirm}
                buttonLoading={deleteLoading}
                disabled={deleteLoading}
                label="Delete"
                icon={<FiTrash2 className="mr-2" />}
                className="h-9 bg-red-600 px-6 hover:bg-red-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Category;

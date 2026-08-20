import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCw, FiRefreshCcw, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';

import { fetchBrands, updateBrand, deleteBrand } from './brandSlice';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import Link from '../../../utils/others/Link';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import SearchInput from '../../../utils/fields/SearchInput';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import InputElement from '../../../utils/fields/InputElement';
import ROUTES from '../../../services/appRoutes';

type BrandRow = {
  id: string | number;
  name: string;
  email?: string;
  contacts?: string;
  address?: string;
  serial?: number;
  manufacturer_id?: string; // hashed (if backend provides)
  brand_id?: string;        // optional
  product_id?: string;      // optional
};

const Brands = () => {
  const dispatch = useDispatch<any>();
  const brandState = useSelector((state: any) => state.brand);

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [buttonLoading, setButtonLoading] = useState(false);

  const emptyEditForm = { id: '', name: '', email: '', address: '', contacts: '' };
  const [editForm, setEditForm] = useState<any>(emptyEditForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEdit = (row: any) => {
    setEditForm({
      id: row.id,
      name: row.name || '',
      email: row.email || '',
      address: row.address || '',
      contacts: row.contacts || '',
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

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      toast.info('Brand name is required');
      return;
    }
    if (!editForm.address.trim()) {
      toast.info('Address is required');
      return;
    }
    if (!editForm.contacts.trim()) {
      toast.info('Contact is required');
      return;
    }

    setEditLoading(true);
    try {
      const res = await dispatch(updateBrand(editForm)).unwrap();
      if (res?.success) {
        toast.success(res?.message || 'Brand updated successfully');
        closeEdit();
        dispatch(fetchBrands({ search, page, per_page: perPage }));
      } else {
        toast.error(res?.message || 'Failed to update brand');
      }
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Failed to update brand');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow?.id) return;

    setDeleteLoading(true);
    try {
      const res = await dispatch(deleteBrand(deleteRow.id)).unwrap();
      if (res?.success) {
        toast.success(res?.message || 'Brand deleted successfully');
        setDeleteRow(null);
        dispatch(fetchBrands({ search, page, per_page: perPage }));
      } else {
        toast.error(res?.message || 'Unable to delete brand');
        setDeleteRow(null);
      }
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Unable to delete brand');
      setDeleteRow(null);
    } finally {
      setDeleteLoading(false);
    }
  };



  useEffect(() => {
    setTableData(brandState?.brands?.data?.data || []);
  }, [brandState]);


  // load data
  useEffect(() => {
    dispatch(fetchBrands({ search, page, per_page: perPage }));
  }, [search, page, perPage]);

  // show api error
  useEffect(() => {
    if (brandState?.error) {
      toast.error(brandState.error);
    }
  }, [brandState?.error]);



  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    dispatch(fetchBrands({ search, page: 1, per_page: perPage }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };


  useEffect(() => {
    
    const paginated = brandState?.brands?.data;

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);
 
    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
      setPage(paginated.current_page);
    }
  }, [brandState?.brands]);


  const columns = [
    {
      key: 'serial_no',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Brand',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'address',
      header: 'Address',
    },
    {
      key: 'contacts',
      header: 'Contact',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (data: any) => (
        <div className="flex justify-center items-center">
          <Button onClick={() => openEdit(data)} className="text-blue-500 ml-2" title="Edit">
            <FiEdit2 className="cursor-pointer" />
          </Button>
          <Button onClick={() => setDeleteRow(data)} className="text-red-500 ml-2" title="Delete">
            <FiTrash2 className="cursor-pointer" />
          </Button>
        </div>
      ),
    },
  ];

  // 🔥 Per Page Change
  const handleSelectChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
    setCurrentPage(1);
    dispatch(fetchBrands({ search, page: 1, per_page: Number(e.target.value) }));
  };

  return (
    <div>
      <HelmetTitle title="Brand List" />

      {/* Top Search Panel */}
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

        <Link to={ROUTES.brand_create} className="text-nowrap">
          New Brand
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {brandState.isLoading && <Loader />}

        <Table columns={columns} data={tableData} />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-xl">
            <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-5 py-3">
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Edit Brand</h3>
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
              <InputElement id="name" name="name" label="Brand Name" placeholder="Brand Name" value={editForm.name} onChange={handleEditChange} />
              <InputElement id="email" name="email" label="Email" placeholder="Email" value={editForm.email} onChange={handleEditChange} />
              <InputElement id="address" name="address" label="Address" placeholder="Address" value={editForm.address} onChange={handleEditChange} />
              <InputElement id="contacts" name="contacts" label="Contact" placeholder="Contact" value={editForm.contacts} onChange={handleEditChange} />
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
                label="Update"
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
              <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Delete Brand</h3>
            </div>

            <div className="px-5 py-4 text-sm text-slate-600 dark:text-[rgb(var(--c-text-muted))]">
              Are you sure you want to delete
              <span className="font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]"> {deleteRow.name}</span>?
              <p className="mt-1 text-xs text-slate-400">
                If any product exists under this brand, it cannot be deleted.
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

export default Brands;

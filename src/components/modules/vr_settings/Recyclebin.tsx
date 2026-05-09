import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiPrinter, FiSearch, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { fetchRecycleBin, removeRecycleBin, restoreRecycleBin } from './voucherSettingsSlice';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { toast } from 'react-toastify';
import { FaRecycle } from 'react-icons/fa';
import { VoucherPrintRegistry } from '../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../vouchers';

const getRecyclePrintMtmId = (row: any) =>
  [
    row?.mtm_id,
    row?.smtm_id,
    row?.main_trx_id,
    row?.main_transaction_id,
    row?.main_trx_master_id,
    row?.main_transaction_master_id,
    row?.main_trx_master?.id,
    row?.main_transaction_master?.id,
    row?.main_transaction?.id,
    row?.main_transaction?.main_trx_id,
    row?.transaction?.main_trx_id,
    row?.transaction?.mtm_id,
    row?.transaction?.id,
    row?.voucher_id,
    row?.trx_id,
    row?.transaction_id,
    row?.main_id,
    row?.mt_id,
    row?.mtmid,
    row?.mtmId,
    row?.mid,
  ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0);

const getDeletedAtTime = (row: any) => {
  const rawValue = row?.deleted_at ?? row?.delete_at ?? row?.deletedAt ?? row?.deleteAt;
  if (!rawValue) return 0;

  if (typeof rawValue === 'number') return rawValue;

  const text = String(rawValue).trim();
  const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dateMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = dateMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).getTime();
  }

  const directTime = Date.parse(text);
  return Number.isNaN(directTime) ? 0 : directTime;
};

const sortRecycleRowsLatestFirst = (rows: any[]) =>
  [...rows].sort((a, b) => getDeletedAtTime(b) - getDeletedAtTime(a));

const Recyclebin = () => {
  const dispatch = useDispatch();
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  // Redux state
  const voucherSettings = useSelector((state: any) => state.voucherSettings);

  // Local state
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Modal & loading state
  const [showConfirm, setShowConfirm] = useState(false); // Delete
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false); // Restore
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch data
  const fetchData = () => {
    setButtonLoading(true);
    dispatch(fetchRecycleBin({ page, per_page: perPage, search, sort_by: 'deleted_at', sort_order: 'desc' }))
      .unwrap()
      .finally(() => setButtonLoading(false));
  };

  useEffect(() => {
    if (search.trim().length === 0 || search.trim().length > 3) {
      fetchData();
    }
  }, [search, page, perPage]);

  // Update table & total pages whenever voucherSettings changes
  useEffect(() => {
    const data = voucherSettings?.recycleBinItems?.data?.data?.data || [];
    const total = voucherSettings?.recycleBinItems?.data?.data?.total || 0;
    setTableData(sortRecycleRowsLatestFirst(data));
    setTotalPages(Math.ceil(total / perPage));
  }, [voucherSettings, perPage]);

  // Handlers
  const handleSearchButton = () => {
    setPage(1);
    fetchData();
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRemoveRecycle = (row: any) => {
    if (!row?.id) return;
    setSelectedRow(row);
    setShowConfirm(true);
  };

  const handleRestoreRecycle = (row: any) => {
    if (!row?.id) return;
    setSelectedRow(row);
    setShowRestoreConfirm(true);
  };

  const handlePrintRecycle = (row: any) => {
    const mtmId = getRecyclePrintMtmId(row);

    if (!row?.vr_no) {
      toast.error('Invalid voucher data');
      return;
    }

    handleVoucherPrint({
      ...row,
      ...(mtmId ? { mtm_id: mtmId } : {}),
      status: 0,
      fromRecycleBin: true,
    });
  };

  // Delete Confirm
  const handleDeleteConfirmed = async () => {
    if (!selectedRow?.id) return;
    setLoading(true);

    try {
      const result = await dispatch(removeRecycleBin({ id: selectedRow.id })).unwrap();
      toast.success(result.message || "Voucher deleted successfully");
      await dispatch(fetchRecycleBin({ page, per_page: perPage, search, sort_by: 'deleted_at', sort_order: 'desc' })).unwrap();
    } catch (err) {
      toast.error("Delete failed");
      console.error(err);
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setSelectedRow(null);
    }
  };

  // Restore Confirm
  const handleRestoreConfirmed = async () => {
    if (!selectedRow?.id) return;
    setLoading(true);

    try {
      const result = await dispatch(restoreRecycleBin({ id: selectedRow.id })).unwrap();
      toast.success(result.message || "Voucher restored successfully");
      await dispatch(fetchRecycleBin({ page, per_page: perPage, search, sort_by: 'deleted_at', sort_order: 'desc' })).unwrap();
    } catch (err) {
      toast.error("Restore failed");
      console.error(err);
    } finally {
      setLoading(false);
      setShowRestoreConfirm(false);
      setSelectedRow(null);
    }
  };

  // Table columns
  const columns = [
    { key: 'sl_no', header: 'Sl. No.', headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'vr_no',
      header: 'Voucher No',
      render: (row: any) => (
        <button
          type="button"
          className="hover:underline"
          onClick={() => handlePrintRecycle(row)}
          title="Print Preview"
        >
          {row.vr_no}
        </button>
      ),
    },
    { key: 'vr_date', header: 'Voucher Date', render: (row: any) => <p>{row.vr_date}</p> },
    { key: 'coal_name', header: 'Name', render: (row: any) => <p>{row.coal_name}</p> },
    {
      key: 'delete_at',
      header: 'Deleted At',
      render: (row: any) => (
        <p>
          <span className="font-semibold block">{row.delete_at}</span>
          <span className="font-semibold">{row.delete_at_human}</span>
        </p>
      ),
    },
    {
      key: 'delete_by',
      header: 'Deleted By',
      render: (row: any) => <p className="font-semibold">{row.delete_by}</p>,
    },
    {
      key: 'debit',
      header: 'Debit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <p>{thousandSeparator(row.debit)}</p>,
    },
    {
      key: 'credit',
      header: 'Credit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <p>{thousandSeparator(row.credit)}</p>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex justify-center items-center">
          <button
            type="button"
            onClick={() => handlePrintRecycle(row)}
            title="Print Preview"
          >
            <FiPrinter className="text-blue-500 text-lg font-bold" />
          </button>
          <button onClick={() => handleRestoreRecycle(row)}>
            <FaRecycle className="text-green-500 text-lg font-bold ml-2" />
          </button>
          <button onClick={() => handleRemoveRecycle(row)}>
            <FiTrash2 className="text-red-500 ml-2 text-lg" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Recycle Bin" />

      {/* Filters */}
      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-2" />
          <SearchInput className='' search={search} setSearchValue={setSearchValue} />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
            icon={<FiSearch className="text-white text-lg ml-2 mr-2" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        {voucherSettings.loading && <Loader />}
        <Table columns={columns} data={tableData} />
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        show={showConfirm}
        title="Confirm Deletion"
        message={
          <>
            Delete this item permanently?
            <span className="block font-bold mt-1">{selectedRow?.vr_no || selectedRow?.id}</span>
          </>
        }
        loading={loading}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedRow(null);
        }}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />

      {/* Restore Modal */}
      <ConfirmModal
        show={showRestoreConfirm}
        title="Confirm Restore"
        message={
          <>
            Restore this voucher?
            <span className="block font-bold mt-1">{selectedRow?.vr_no || selectedRow?.id}</span>
          </>
        }
        loading={loading}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setSelectedRow(null);
        }}
        onConfirm={handleRestoreConfirmed}
        className="bg-green-600 hover:bg-green-700"
      />

      <VoucherPrintRegistry
        ref={voucherRegistryRef}
        rowsPerPage={10}
        fontSize={10}
      />
    </div>
  );
};

export default Recyclebin;

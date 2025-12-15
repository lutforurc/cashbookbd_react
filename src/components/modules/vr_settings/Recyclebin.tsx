import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { fetchRecycleBin } from './voucherSettingsSlice';

const Recyclebin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const voucherSettings = useSelector((state: any) => state.voucherSettings);

  // Local state
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1); // 1-based indexing
  const [perPage, setPerPage] = useState(10);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Fetch data whenever page, perPage, or search changes
  useEffect(() => {
    setButtonLoading(true);
    dispatch(fetchRecycleBin({ page, per_page: perPage, search }))
      .unwrap()
      .finally(() => setButtonLoading(false));
  }, [page, perPage, dispatch]);

  // Update table data & total pages whenever voucherSettings changes
  useEffect(() => {
    const data = voucherSettings?.recycleBinItems?.data?.data?.data || [];
    const total = voucherSettings?.recycleBinItems?.data?.data?.total || 0;
    setTableData(data);
    setTotalPages(Math.ceil(total / perPage));
  }, [voucherSettings, perPage]);

  // Handlers
  const handleSearchButton = () => {
    setPage(1); // reset page when searching
    dispatch(fetchRecycleBin({ page: 1, per_page: perPage, search }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  // Update table when voucherSettings changes
  useEffect(() => {
    const data = voucherSettings?.recycleBinItems?.data?.data?.data || [];
    setTableData(data);
  }, [voucherSettings]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleProductEdit = (row: any) => {
    navigate(`/product/edit/${row.product_id}`);
  };

  // Table columns
  const columns = [
    {
      key: 'sl_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'vr_no',
      header: 'Voucher No',
      render: (row: any) => <p>{row.vr_no}</p>,
    },
    {
      key: 'vr_date',
      header: 'Voucher Date',
      render: (row: any) => <p>{row.vr_date}</p>,
    },
    {
      key: 'coal_name',
      header: 'Name',
      render: (row: any) => <p>{row.coal_name}</p>,
    },
    {
      key: 'delete_at',
      header: 'Deleted At',
      render: (row: any) => (
        <p>
          {
            <>
              <span className="font-semibold block">{row.delete_at}</span>
              <span className="font-semibold">{row.delete_at_human}</span>
            </>
          }
        </p>
      ),
    },

    {
      key: 'delete_by',
      header: 'Deleted By',
      render: (row: any) => (
        <p>
          {
            <>
              <span className="font-semibold">{row.delete_by}</span>
              <br />
            </>
          }
        </p>
      ),
    },
    {
      key: 'debit',
      header: 'Debit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <p>{thousandSeparator(row.debit, 0)}</p>,
    },
    {
      key: 'credit',
      header: 'Credit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <p>{thousandSeparator(row.credit, 0)}</p>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex justify-center items-center">
          <button className="text-blue-500">
            <FiBook />
          </button>
          <button
            onClick={() => handleProductEdit(row)}
            className="text-blue-500 ml-2"
          >
            <FiEdit2 />
          </button>
          <button className="text-red-500 ml-2">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Recycle Bin" />

      <div className="flex overflow-x-auto justify-between mb-2">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-2" />
          <SearchInput
            className=""
            search={search}
            setSearchValue={setSearchValue}
          />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
          />
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {voucherSettings.isLoading && <Loader />}
        <Table columns={columns} data={tableData} />
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default Recyclebin;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProduct, updateProductQtyRate } from './productSlice';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { useNavigate } from 'react-router-dom';
import InputElement from '../../utils/fields/InputElement';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';

const Product = (user: any) => {
  const product = useSelector((state: any) => state.product);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [editedRows, setEditedRows] = useState<Record<number, any>>({});

  /* ================= FETCH ================= */
  useEffect(() => {
    dispatch(getProduct({ page, perPage, search }));
  }, [page, perPage]);


  useEffect(() => {
    setPerPage(perPage);
    dispatch(getSettings());
  }, []);

  useEffect(() => {
    if (product?.data?.data) {
      setTableData(product.data.data);
      setTotalPages(Math.ceil(product.data.total / perPage));
    }
  }, [product]);


  console.log('====================================');
  console.log("settings", settings?.data?.branch?.is_opening);
  console.log('====================================');


  /* ================= HANDLERS ================= */
  const handleSearchButton = () => {
    setPage(1);
    setCurrentPage(1);
    dispatch(getProduct({ page: 1, perPage, search }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };

  const handleProductInputChange = (
    productId: number,
    field: 'qty' | 'rate' | 'serial_no',
    value: any
  ) => {
    setEditedRows((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: value,
      },
    }));
  };


  const handleSerialChange = (
    row: any,
    value: string
  ) => {
    // split by newline
    const serialArray = value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    setEditedRows((prev) => ({
      ...prev,
      [row.product_id]: {
        ...(prev[row.product_id] || {}),
        serial_no: value,
        qty: serialArray.length, // 🔥 AUTO QTY
      },
    }));
  };

  const handleSerialBlur = (row: any) => {
    const edited = editedRows[row.product_id];
    if (!edited?.serial_no) return;

    const serialArray = edited.serial_no
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    setEditedRows((prev) => ({
      ...prev,
      [row.product_id]: {
        ...prev[row.product_id],
        serial_no: serialArray.join('\n'), // clean format
        qty: serialArray.length,           // ensure sync
      },
    }));
  };


  const handleProductBlur = async (e: any, row: any) => {
    e.preventDefault();
    e.stopPropagation();

    const edited = editedRows[row.product_id];
    if (!edited) return;

    const payload = {
      product_id: row.product_id,
      branch_id: user.user.branch_id,
      qty: edited.qty ?? row.qty,
      rate: edited.rate ?? row.rate,
      serial_no: edited.serial_no ?? row.serial_no ?? '',
    };

    // 🔒 REQUIRED FIELD CHECK
    if (
      !payload.product_id ||
      !payload.branch_id ||
      payload.qty === undefined ||
      payload.qty === null ||
      payload.rate === undefined ||
      payload.rate === null
    ) {
      return; // ❌ API call হবে না
    }

    try {
      const result = await dispatch(updateProductQtyRate(payload));

      if (result?.success && result?.message) {
        toast.success(result.message);
      } else if (result?.message) {
        toast.info(result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };





  const handleProductEdit = (row: any) => {
    navigate(`/product/edit/${row.product_id}`);
  };

  /* ================= TABLE ================= */

  const serialQtyRateColumns = [
    /* ===== IMEI / SERIAL ===== */
    {
      key: 'serial_no',
      header: 'IMEI / Serial',
      render: (row: any) => (
        <textarea
          rows={2}
          className={`w-full px-3 py-1 text-gray-600 bg-white border rounded-xs 
                                            outline-none dark:bg-transparent dark:border-gray-600 dark:text-white 
                                            dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 
                                            dark:focus:ring-blue-400 dark:focus:border-blue-400`}
          placeholder="IMEI Number"
          value={
            editedRows[row.product_id]?.serial_no ??
            row.serial_no ??
            ''
          }
          onChange={(e) =>
            handleProductInputChange(
              row.product_id,
              'serial_no',
              e.target.value
            )
          }
          onBlur={(e) => {
            handleSerialBlur(row);
            handleProductBlur(e, row);
          }}
        />
      ),
    },

    /* ===== QTY ===== */
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => (
        <InputElement
          type="number"
          className="text-right w-20"
          placeholder='Qty'
          value={editedRows[row.product_id]?.qty ?? row.qty ?? ''}
          onChange={(e) =>
            handleProductInputChange(
              row.product_id,
              'qty',
              e.target.value
            )
          }
          onBlur={(e) => handleProductBlur(e, row)}
        />
      ),
    },

    /* ===== RATE ===== */
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => (
        <InputElement
          type="number"
          placeholder='Rate'
          className="text-right w-24"
          value={editedRows[row.product_id]?.rate ?? row.rate ?? ''}
          onChange={(e) =>
            handleProductInputChange(
              row.product_id,
              'rate',
              e.target.value
            )
          }
          onBlur={(e) => handleProductBlur(e, row)}
        />
      ),
    },
  ];


  const columns = [
    {
      key: 'serial',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Product',
    },
    {
      key: 'category',
      header: 'Category',
    },
    {
      key: 'unit',
      header: 'Unit',
    },
    ...(settings?.data?.branch?.is_opening == 1 ? serialQtyRateColumns : []),
    {
      key: 'purchase',
      header: 'P. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.purchase > 0
          ? thousandSeparator(row.purchase, 0)
          : '-',
    },

    {
      key: 'sales',
      header: 'S. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.sales > 0
          ? thousandSeparator(row.sales, 0)
          : '-',
    },

    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex justify-center gap-2">
          <FiBook className="cursor-pointer text-blue-500" />
          <FiEdit2
            className="cursor-pointer text-blue-500"
            onClick={() => handleProductEdit(row)}
          />
          <FiTrash2 className="cursor-pointer text-red-500" />
        </div>
      ),
    },
  ];

  /* ================= RENDER ================= */

  return (
    <div>
      <HelmetTitle title="Product List" />

      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <SelectOption onChange={(e: any) => setPerPage(e.target.value)} />
          <SearchInput className='' search={search} setSearchValue={setSearchValue} />
          <ButtonLoading label="Search" onClick={handleSearchButton} />
        </div>

        <Link to="/product/add-product">New Product</Link>
      </div>

      <div className="relative overflow-x-auto">
        {product.isLoading && <Loader />}

        <Table columns={columns} data={tableData} />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default Product;

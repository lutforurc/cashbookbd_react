import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProduct } from './productSlice';
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
import { render } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const Product = () => {
  const product = useSelector((state) => state.product);
  const dispatch = useDispatch();
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    dispatch(getProduct({ page, perPage, search }));
    setTotalPages(Math.ceil(product?.data?.total / perPage));
    setTableData(product?.data?.data);
  }, [page, perPage, product?.data?.total]);

  const handleSearchButton = (e: any) => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getProduct({ page, perPage, search }));

    if (product?.data?.total >= 0) {
      setTotalPages(Math.ceil(product?.data?.total / perPage));
      setTableData(product?.data?.data);
    }
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(product?.data?.total / perPage));
    setTableData(product?.data?.data);
  };

  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(product?.data?.last_page));
    setTableData(product.data.data);
  };

  useEffect(() => {
    setTableData(product?.data?.data);
  }, [product]);

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Product Name',
      render: (row: any) => (
        <>
          <p className="">{row.name}</p>
        </>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row: any) => (
        <>
          <p className="">{row.unit}</p>
        </>
      ),
    },
    {
      key: 'category',
      header: 'Category Name',
    },

    {
      key: 'purchase',
      header: 'P. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.purchase > 0 ? thousandSeparator(row.purchase, 0) : '-'}
          </p>
        </>
      ),
    },

    {
      key: 'sales',
      header: 'S. Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.sales > 0 ? thousandSeparator(row.sales, 0) : '-'}
          </p>
        </>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex justify-center items-center">
          <button onClick={() => {}} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button
            onClick={() => handleProductEdit(row)}
            className="text-blue-500  ml-2"
          >
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => {}} className="text-red-500 ml-2">
            <FiTrash2 className="cursor-pointer" />
          </button>
        </div>
      ),
    },
  ];

  const handleProductEdit = (row: any) => {
    navigate(`/product/edit/${row.product_id}`);
  };

  return (
    <div>
      <HelmetTitle title={'Product List'} />
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
            className="whitespace-nowrap"
          />
        </div>
        <Link to="/product/add-product" className="text-nowrap">
          New Product
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {product.isLoading == true ? <Loader /> : ''}

        <Table columns={columns} data={tableData} className="" />

        {/* Pagination Controls */}
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
    </div>
  );
};

export default Product;

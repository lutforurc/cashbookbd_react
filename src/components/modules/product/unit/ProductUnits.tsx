import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import SearchInput from '../../../utils/fields/SearchInput';
import Table from '../../../utils/others/Table';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import ROUTES from '../../../services/appRoutes';
import { fetchProductUnits } from './unitSlice';
import { FiPlus, FiSearch, FiEdit2 } from 'react-icons/fi';

const ProductUnits = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const productUnit = useSelector((state: any) => state.productUnit);

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchProductUnits({ search, page, per_page: perPage }));
  }, [dispatch, search, page, perPage]);

  useEffect(() => {
    if (productUnit?.error) {
      toast.error(productUnit.error);
    }
  }, [productUnit?.error]);



  console.log('====================================');
  console.log("productUnit", productUnit);
  console.log('====================================');


  useEffect(() => {
    const paginated = productUnit?.units;

    if (Array.isArray(paginated)) {
      setTableData(paginated);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);

    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
      setPage(paginated.current_page);
    }
  }, [productUnit?.units]);

  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    dispatch(fetchProductUnits({ search, page: 1, per_page: perPage }));
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPerPage = Number(e.target.value);
    setPerPage(nextPerPage);
    setPage(1);
    setCurrentPage(1);
    dispatch(fetchProductUnits({ search, page: 1, per_page: nextPerPage }));
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Unit Name',
    },
    {
      key: 'short_name',
      header: 'Short Name',
    },
    {
      key: 'description',
      header: 'Description',
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <ButtonLoading
          onClick={() => navigate(`/product-unit/unit-edit/${row.id}`)}
          buttonLoading={false}
          label="Edit"
          size="sm"
          className="h-7! whitespace-nowrap text-center mr-0"
          icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
        />
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Unit List" />

      <div className="flex overflow-x-auto justify-between mb-1">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />

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
          onClick={() => navigate(ROUTES.product_unit_create)}
          label="New Unit"
          size="sm"
          className="whitespace-nowrap text-center mr-0"
          icon={<FiPlus className="text-white text-base ml-1 mr-1" />}
        />
      </div>

      <div className="relative overflow-x-auto">
        {productUnit?.isLoading && <Loader />}

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

export default ProductUnits;

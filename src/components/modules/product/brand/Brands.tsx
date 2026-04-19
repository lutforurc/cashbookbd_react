import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';

import { fetchBrands } from './brandSlice';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import Link from '../../../utils/others/Link';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import SearchInput from '../../../utils/fields/SearchInput';
import SelectOption from '../../../utils/utils-functions/SelectOption';
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
    </div>
  );
};

export default Brands;

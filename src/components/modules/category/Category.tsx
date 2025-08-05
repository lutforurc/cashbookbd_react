import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { getcategory } from './categorySlice';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiBookOpen, FiEdit, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { getCategory } from './categorySlice';
import { Link as RouterLink } from 'react-router-dom';
import Table from '../../utils/others/Table';

const Category = () => {
  const category = useSelector((state) => state.category);
  const dispatch = useDispatch();
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    dispatch(getCategory({ page, perPage, search }));
    setTotalPages(Math.ceil(category?.data?.total / perPage));
    setTableData(category?.data?.data);
  }, [page, perPage, category?.data?.total]);

  const handleSearchButton = (e: any) => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getCategory({ page, perPage, search }));
    if (category?.data?.total >= 0) {
      setTotalPages(Math.ceil(category?.data?.total / perPage));
      setTableData(category?.data?.data);
    }
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(category?.data?.total / perPage));
    setTableData(category?.data?.data);
  };

  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(category?.data?.last_page));
    setTableData(category.data.data);
  };

  useEffect(() => {
    setTableData(category?.data?.data);
  }, [category]);

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
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
          <button onClick={() => { }} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button onClick={() => { }} className="text-blue-500  ml-2">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => { }} className="text-red-500 ml-2">
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
            className="whitespace-nowrap"
          />
        </div>
        <Link to="/category/create" className="text-nowrap">
          New Category
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {category.isLoading == true ? <Loader /> : ''}
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

export default Category;

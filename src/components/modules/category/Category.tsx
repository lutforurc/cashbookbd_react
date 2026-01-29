import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SearchInput from '../../utils/fields/SearchInput';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { getCategory } from './categorySlice';
import Table from '../../utils/others/Table';

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
          <button onClick={() => {}} className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button onClick={() => {}} className="text-blue-500 ml-2">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button onClick={() => {}} className="text-red-500 ml-2">
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
    </div>
  );
};

export default Category;

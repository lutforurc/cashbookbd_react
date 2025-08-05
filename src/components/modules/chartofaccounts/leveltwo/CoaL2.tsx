import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { getCoal2 } from './coal2Sliders';
import SearchInput from '../../../utils/fields/SearchInput';
import Link from '../../../utils/others/Link';

const CoaL2 = () => {
    const coal2 = useSelector((state) => state.coal2);
    const dispatch = useDispatch();
    const [search, setSearchValue] = useState('');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [tableData, setTableData] = useState([]);


    useEffect(() => {
        dispatch(getCoal2({ page, perPage, search })); //.finally(() => setIsDataLoading(false));
        setTotalPages(Math.ceil(coal2?.data?.last_page) || 0);
        setTableData(coal2?.data?.data);
        setCurrentPage(page);
    }, [page, perPage, search]);

    useEffect(() => {
        if (coal2?.data?.data) {
            setTableData(coal2.data.data);
            setTotalPages(coal2?.data?.last_page || 0);
            setCurrentPage(coal2?.data?.current_page || 1);
        }
    }, [coal2]);

    const handleSearchButton = (e: any) => {
        setCurrentPage(1);
        setPage(1);
        dispatch(getCoal2({ page, perPage, search }));
        if (coal2?.data?.total >= 0) {
            setTotalPages(Math.ceil(coal2?.data?.total / perPage));
            setTableData(coal2?.data?.data);
        }
    };

    const handleSelectChange = (page: any) => {
        setPerPage(page.target.value);
        setPage(1);
        setCurrentPage(1);
        setTotalPages(Math.ceil(coal2.data.total / page.target.value));
        setTableData(coal2.data.data);
    };
    const handlePageChange = (page: any) => {
        setPerPage(perPage);
        setPage(page);
        setCurrentPage(page);
        setTotalPages(Math.ceil(coal2?.data?.last_page));
        setTableData(coal2.data.data);
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
            header: 'Chart of Account L2', 
        },
        {
            key: 'l1_name',
            header: 'Chart of Account L1', 
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
            <HelmetTitle title={'Chart of Accounts L2'} />
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
                    New COA L2
                </Link>
            </div>
            <div className="relative overflow-x-auto overflow-y-hidden">
                {coal2.isLoading == true ? <Loader /> : null}
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

export default CoaL2;



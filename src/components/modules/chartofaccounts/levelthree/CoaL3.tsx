import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { getCoal3 } from './coal3Sliders';
import SearchInput from '../../../utils/fields/SearchInput';
import Link from '../../../utils/others/Link';
import DataTable from '../../../../DataTable';

const CoaL3: React.FC = () => {
    const coal3 = useSelector((state) => state.coal3);
    const dispatch = useDispatch();
    const [search, setSearchValue] = useState('');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);

    const handleChange = (option: OptionType | null) => {
        setSelectedOption(option);
    };

    useEffect(() => {
        dispatch(getCoal3({ page, perPage, search })); //.finally(() => setIsDataLoading(false));
        setTotalPages(Math.ceil(coal3?.data?.last_page) || 0);
        setTableData(coal3?.data?.data);
        setCurrentPage(page);
        setSelectedOption(tableData);
    }, [page, perPage, search]);

    useEffect(() => {
        if (coal3?.data?.data) {
            setTableData(coal3.data.data);
            setSelectedOption(coal3.data.data);
            setTotalPages(coal3?.data?.last_page || 0);
            setCurrentPage(coal3?.data?.current_page || 1);
        }
    }, [coal3]);

    const handleSearchButton = (e: any) => {
        setCurrentPage(1);
        setPage(1);
        dispatch(getCoal3({ page, perPage, search }));
        if (coal3?.data?.total >= 0) {
            setTotalPages(Math.ceil(coal3?.data?.total / perPage));
            setTableData(coal3?.data?.data);
        }
    };

    const handleSelectChange = (page: any) => {
        setPerPage(page.target.value);
        setPage(1);
        setCurrentPage(1);
        setTotalPages(Math.ceil(coal3.data.total / page.target.value));
        setTableData(coal3.data.data);
    };
    const handlePageChange = (page: any) => {
        setPerPage(perPage);
        setPage(page);
        setCurrentPage(page);
        setTotalPages(Math.ceil(coal3?.data?.last_page));
        setTableData(coal3.data.data);
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
            header: 'Chart of Account L3', 
        },
        {
            key: 'l1_name',
            header: 'Chart of Account L2', 
        },
        {
            key: 'source_name',
            header: 'Source Name', 
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
    const options = [
        { value: 1, label: 'Lutfor Rahman', additionalDetails: 'Additional details for option 1' },
        { value: 2, label: 'Kamal Hossain', additionalDetails: 'Extra information about option 2' },
        { value: 3, label: 'Jamal Hossain', additionalDetails: 'More details for option 3' },
    ];

    return (
        <div>
            <HelmetTitle title={'Chart of Accounts L3'} />
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
                    New COA L3
                </Link>
            </div>
            <div className="relative overflow-x-auto overflow-y-hidden">
                {coal3.isLoading == true ? <Loader /> : null}
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

export default CoaL3;



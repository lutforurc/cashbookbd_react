import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiSearch, FiTrash2, FiPlus } from 'react-icons/fi';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { getCoal2 } from './coal2Sliders';
import { getCoal1 } from '../levelone/coal1Sliders';
import SearchInput from '../../../utils/fields/SearchInput';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { useNavigate } from 'react-router-dom';

const CoaL2 = () => {
    const navigate = useNavigate();
    const coal2 = useSelector((state) => state.coal2);
    // The first level's own list and store, read here for the filter's options.
    const coal1 = useSelector((state: any) => state.coal1);
    const dispatch = useDispatch();
    const [search, setSearchValue] = useState('');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    // The selected level-1 head, or '' for the whole chart.
    const [coal1Id, setCoal1Id] = useState<string>('');

    // The level-1 heads the filter offers, from the L1 screen's own call and
    // store. Read from there rather than from a second endpoint so the filter
    // and that screen cannot disagree about what the chart's first level is.
    const coal1Rows = Array.isArray(coal1?.data?.data) ? coal1.data.data : [];


    // The filter's options, fetched once. `per_page` is generous on purpose:
    // the first level of a chart is a handful of heads, and a filter offering
    // only the first ten would be one nobody could rely on.
    useEffect(() => {
        dispatch(getCoal1({ page: 1, perPage: 500, search: '' }));
    }, []);


    useEffect(() => {
        dispatch(getCoal2({ page, perPage, search, coal1Id })); //.finally(() => setIsDataLoading(false));
        setTotalPages(Math.ceil(coal2?.data?.last_page) || 0);
        setTableData(coal2?.data?.data);
        setCurrentPage(page);
    }, [page, perPage, search, coal1Id]);

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
        // The selection rides along, so searching looks through the chosen head
        // rather than quietly falling back to the whole chart.
        dispatch(getCoal2({ page, perPage, search, coal1Id }));
        if (coal2?.data?.total >= 0) {
            setTotalPages(Math.ceil(coal2?.data?.total / perPage));
            setTableData(coal2?.data?.data);
        }
    };

    /**
     * Choosing a level-1 head runs the list again on it.
     *
     * A new request rather than a re-sift of the rows in hand: the server
     * narrows the query with `coal1_id` and paginates the narrowed set, so the
     * page count comes back right with the rows. The page is put back to one at
     * the same time -- a reader on page four of the whole chart would otherwise
     * land on page four of a much shorter selection.
     */
    const handleCoal1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCoal1Id(e.target.value);
        setPage(1);
        setCurrentPage(1);
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
                    <Button onClick={() => { }} className="text-blue-500">
                        <FiBook className="cursor-pointer" />
                    </Button>
                    <Button onClick={() => { }} className="text-blue-500  ml-2">
                        <FiEdit2 className="cursor-pointer" />
                    </Button>
                    <Button onClick={() => { }} className="text-red-500 ml-2">
                        <FiTrash2 className="cursor-pointer" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <HelmetTitle title={'Chart of Accounts L2'} />
            <div className="flex overflow-x-auto justify-between mb-1">
                <div className="flex">
                    <Select
                        id="coal1_filter"
                        name="coal1_filter"
                        value={coal1Id}
                        onChange={handleCoal1Change}
                        disabled={coal1?.isLoading === true}
                        title="Filter by Chart of Accounts L1"
                        aria-label="Filter by Chart of Accounts L1"
                        className={`${FIELD_SELECT} block p-2 text-sm mr-1 md:mr-2 w-56`}
                    >
                        <option value="">All Chart of Accounts L1</option>
                        {coal1?.isLoading === true ? (
                            <option value="__loading__" disabled>
                                Loading Chart of Accounts L1...
                            </option>
                        ) : null}
                        {coal1Rows.map((item: any) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Select>
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
                         icon={<FiSearch size={15} />}
                    />
                </div>
                <ButtonLoading
                  onClick={() => navigate('/category/create')}
                  buttonLoading={false}
                  label="New COA L2"
                  className="whitespace-nowrap text-center mr-0 hidden"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                />
            </div>
            <div className="relative overflow-x-auto overflow-y-hidden">
                {coal2.isLoading == true ? <Loader /> : null}
                <Table
                    columns={columns}
                    data={tableData}
                    className=""
                    noDataMessage={
                        coal1Id
                            ? 'No Chart of Accounts L2 found for the selected Chart of Accounts L1.'
                            : undefined
                    }
                />

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



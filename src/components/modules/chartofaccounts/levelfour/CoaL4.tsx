import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiSearch, FiTrash2, FiPlus } from 'react-icons/fi';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { ButtonLoading, IconButton } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { getCoal4, getCoal4Ddl } from './coal4Sliders';
import { getCoal1 } from '../levelone/coal1Sliders';
import { getCoal2DdlByCoal1 } from '../leveltwo/coal2Sliders';
import SearchInput from '../../../utils/fields/SearchInput';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import routes from '../../../services/appRoutes';
import { useNavigate } from 'react-router-dom';

type DdlOption = {
    id: string | number;
    name: string;
};

const CoaL4 = () => {
    const coal4 = useSelector((state) => state.coal4);
    // The first level's own list and store, read here for the filter's options.
    const coal1 = useSelector((state: any) => state.coal1);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [search, setSearchValue] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [buttonLoading, setButtonLoading] = useState(false);
    // Reading the search box does not re-run the list request on its own: the
    // button is what does. This counter is how it asks for one when the page is
    // already 1, where `setPage(1)` on its own would change nothing.
    const [searchRun, setSearchRun] = useState(0);
    const [tableData, setTableData] = useState([]);
    const [searchName, setSearchName] = useState('');
    // The selected level-1 head, or '' for the whole chart.
    const [coal1Id, setCoal1Id] = useState<string>('');

    // The cascading selection: a level-1 head, and optionally one of its level-2
    // heads. Both ride on the L4 list call as `coal1_id` / `coal2_id`.
    const [coal2Id, setCoal2Id] = useState<string>('');
    const [coal2Options, setCoal2Options] = useState<DdlOption[]>([]);
    const [coal2Loading, setCoal2Loading] = useState(false);
    // Guards the level-2 option fetch the way the list guards its rows: a slower
    // answer for a head the reader has moved off must not land on the dropdown.
    const coal2RequestId = useRef(0);

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


    // One request per change, and this is the only place the list is asked for.
    // The handlers below move state and nothing else -- a second call from a
    // click handler would race this one, and it would be built from the state
    // that click had not yet changed (`page` in particular).
    //
    // `search` is deliberately not a dependency: it is applied by the Search
    // button, so leaving it in made the request chase every keystroke and then
    // run again on the press that was meant to send it.
    useEffect(() => {
        dispatch(getCoal4({ page, perPage, search, coal1Id, coal2Id }));
    }, [page, perPage, coal1Id, coal2Id, searchRun]);



    useEffect(() => {
        if (coal4?.data?.data) {
            setTableData(coal4.data.data);
            setTotalPages(coal4?.data?.last_page || 0);
            setCurrentPage(coal4?.data?.current_page || 1);
        }
    }, [coal4]);

    // Both selections ride along on the request the effect sends, so searching
    // looks through the chosen heads rather than quietly falling back to the
    // whole chart.
    const handleSearchButton = () => {
        setCurrentPage(1);
        setPage(1);
        setSearchRun((run) => run + 1);
    };

    /**
     * Choosing (or clearing) a level-1 head resets everything below it.
     *
     * The level-2 selection and its options belong to the head that was chosen,
     * so they go first: keeping them would leave the dropdown offering another
     * head's level 2s and the list narrowed by a level 2 that no longer sits
     * under the level 1 on screen. The related level-2 options are then
     * requested from the server, and the list reloads -- all of that head's
     * accounts when no level 2 is chosen, the whole chart when the head is
     * cleared.
     */
    const handleCoal1Change = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextCoal1Id = e.target.value;

        setCoal1Id(nextCoal1Id);
        setCoal2Id('');
        setCoal2Options([]);
        setPage(1);
        setCurrentPage(1);

        if (!nextCoal1Id) return;

        const requestId = ++coal2RequestId.current;
        setCoal2Loading(true);

        try {
            const rows = await dispatch(getCoal2DdlByCoal1(nextCoal1Id) as any);
            // A newer head has been chosen; its options are the ones to keep.
            if (requestId !== coal2RequestId.current) return;
            setCoal2Options(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (requestId !== coal2RequestId.current) return;
            setCoal2Options([]);
        } finally {
            if (requestId === coal2RequestId.current) setCoal2Loading(false);
        }
    };

    /**
     * Choosing a level-2 head narrows the list to its own accounts. The level-1
     * head stays where it is -- a level 2 cannot sit under a head that was not
     * chosen -- and the page goes back to one.
     */
    const handleCoal2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCoal2Id(e.target.value);
        setPage(1);
        setCurrentPage(1);
    };

    // The page count and the rows come back with the answer to the request these
    // set off; copying them here would only copy the previous answer's numbers
    // over the new ones for as long as the request takes.
    const handleSelectChange = (page: any) => {
        setPerPage(page.target.value);
        setPage(1);
        setCurrentPage(1);
    };
    const handlePageChange = (page: any) => {
        setPerPage(perPage);
        setPage(page);
        setCurrentPage(page);
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
            header: 'Chart of Account L4', 
        },
        {
            key: 'l3_name',
            header: 'COA L3', 
        },
        // {
        //     key: 'l2_name',
        //     header: 'COA L2', 
        // },

        {
            key: 'action',
            header: 'Action', 
            render: (data: any) => {
                // A head with no company on it belongs to the shared chart every
                // company reads from -- it is nobody's here to rename or remove,
                // so neither action is offered on those rows at all.
                const isShared = Boolean(data?.is_global ?? !data?.company_id);

                return (
                    <div className="flex justify-center items-center gap-2">
                        <IconButton
                            title="Ledger"
                            tone="primary"
                            icon={<FiBook />}
                            onClick={() => { }}
                        />
                        {!isShared ? (
                            <IconButton
                                title="Edit"
                                tone="primary"
                                icon={<FiEdit2 />}
                                onClick={() => navigate(`/coal4/edit-coal4/${data.id}`)}
                            />
                        ) : null}
                        {!isShared ? (
                            <IconButton
                                title="Delete"
                                tone="danger"
                                icon={<FiTrash2 />}
                                onClick={() => { }}
                            />
                        ) : null}
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <HelmetTitle title={'Chart of Accounts L4'} />
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
                    {/* Held shut until a level-1 head is chosen: a level 2 means
                        nothing on its own, and the server only answers for the
                        head it was asked about. */}
                    <Select
                        id="coal2_filter"
                        name="coal2_filter"
                        value={coal2Id}
                        onChange={handleCoal2Change}
                        disabled={!coal1Id || coal2Loading}
                        title="Chart of Accounts Level 2"
                        aria-label="Chart of Accounts Level 2"
                        className={`${FIELD_SELECT} block p-2 text-sm mr-1 md:mr-2 w-56`}
                    >
                        <option value="">
                            {!coal1Id
                                ? 'Select Chart of Accounts L1 first'
                                : coal2Loading
                                    ? 'Loading Chart of Accounts L2...'
                                    : 'All Chart of Accounts L2'}
                        </option>
                        {coal2Options.map((item) => (
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
                  onClick={() => navigate(routes.coal4_add)}
                  buttonLoading={false}
                  label="New COA L4"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                />
            </div>
            <div className="relative overflow-x-auto overflow-y-hidden">
                {coal4.isLoading == true ? <Loader /> : null}
                <Table
                    columns={columns}
                    data={tableData}
                    className=""
                    noDataMessage={
                        coal2Id
                            ? 'No Chart of Accounts L4 found for the selected Chart of Accounts L2.'
                            : coal1Id
                                ? 'No Chart of Accounts L4 found for the selected Chart of Accounts L1.'
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

export default CoaL4;



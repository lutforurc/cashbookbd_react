import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBook, FiEdit2, FiSearch, FiTrash2, FiPlus } from 'react-icons/fi';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { ButtonLoading, IconButton } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { getCoal3 } from './coal3Sliders';
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

const CoaL3: React.FC = () => {
    const coal3 = useSelector((state) => state.coal3);
    // The first level's own list and store, read here for the first filter's
    // options, so the two screens cannot disagree about the chart's first level.
    const coal1 = useSelector((state: any) => state.coal1);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [search, setSearchValue] = useState('');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);

    // The cascading selection: a level-1 head, and optionally one of its level-2
    // heads. Both ride on the L3 list call as `coal1_id` / `coal2_id`.
    const [coal1Id, setCoal1Id] = useState<string>('');
    const [coal2Id, setCoal2Id] = useState<string>('');
    const [coal2Options, setCoal2Options] = useState<DdlOption[]>([]);
    const [coal2Loading, setCoal2Loading] = useState(false);
    // Guards the level-2 option fetch the way the list guards its rows: a slower
    // answer for a head the reader has moved off must not land on the dropdown.
    const coal2RequestId = useRef(0);

    const coal1Rows = Array.isArray(coal1?.data?.data) ? coal1.data.data : [];

    const handleChange = (option: OptionType | null) => {
        setSelectedOption(option);
    };

    // The level-1 heads, fetched once. `per_page` is generous on purpose: the
    // first level of a chart is a handful of heads, and a filter offering only
    // the first ten would be one nobody could rely on.
    useEffect(() => {
        dispatch(getCoal1({ page: 1, perPage: 500, search: '' }));
    }, []);

    useEffect(() => {
        dispatch(getCoal3({ page, perPage, search, coal1Id, coal2Id }));
        setTotalPages(Math.ceil(coal3?.data?.last_page) || 0);
        setTableData(coal3?.data?.data);
        setCurrentPage(page);
        setSelectedOption(tableData);
    }, [page, perPage, search, coal1Id, coal2Id]);

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
        // Both selections ride along, so searching looks through the chosen
        // heads rather than quietly falling back to the whole chart.
        dispatch(getCoal3({ page, perPage, search, coal1Id, coal2Id }));
        if (coal3?.data?.total >= 0) {
            setTotalPages(Math.ceil(coal3?.data?.total / perPage));
            setTableData(coal3?.data?.data);
        }
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
            // ⚠️ The level-2 name, not the level-1 one. The column is headed
            // "Chart of Account L2" and was reading `l1_name`, so every row
            // showed its head's name here -- which matters now that the level-2
            // dropdown is what decides the rows beneath it.
            key: 'l2_name',
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
                                onClick={() => navigate(`/coal3/edit-coal3/${data.id}`)}
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
                    <Select
                        id="coal1_filter"
                        name="coal1_filter"
                        value={coal1Id}
                        onChange={handleCoal1Change}
                        disabled={coal1?.isLoading === true}
                        title="Chart of Accounts Level 1"
                        aria-label="Chart of Accounts Level 1"
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
                  onClick={() => navigate(routes.coal3_add)}
                  buttonLoading={false}
                  label="New COA L3"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                />
            </div>
            <div className="relative overflow-x-auto overflow-y-hidden">
                {coal3.isLoading == true ? <Loader /> : null}
                <Table
                    columns={columns}
                    data={tableData}
                    className=""
                    noDataMessage={
                        coal2Id
                            ? 'No Chart of Accounts L3 found for the selected Chart of Accounts L2.'
                            : coal1Id
                                ? 'No Chart of Accounts L3 found for the selected Chart of Accounts L1.'
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

export default CoaL3;




import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';

import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getLedger } from '../ledger/ledgerSlice';
import { getMitchMatch } from './mitchMatchSlice';
import {formatDate} from '../../../utils/utils-functions/formatDate';
import { render } from 'react-dom';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

const MitchMatch = (user: any) => {
    const dispatch = useDispatch();
    const branchDdlData = useSelector((state) => state.branchDdl);
    const mitchMatch = useSelector((state) => state.mitchMatch);
    const [dropdownData, setDropdownData] = useState<any[]>([]);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array

    const [branchId, setBranchId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(getDdlProtectedBranch());
        setBranchId(user.user.branch_id);
    }, []);

    useEffect(() => {
        // Update table data only when ledgerData is valid
        if (!mitchMatch.isLoading && Array.isArray(mitchMatch?.data)) {
            setTableData(mitchMatch?.data);
        }
    }, [mitchMatch]);

    const handleBranchChange = (e: any) => {
        setBranchId(e.target.value);
    };



    const handleActionButtonClick = () => {
        dispatch(getMitchMatch({ branchId }))
    };

    useEffect(() => {
        if (
            branchDdlData?.protectedData?.data &&
            branchDdlData?.protectedData?.transactionDate
        ) {
            setDropdownData(branchDdlData?.protectedData?.data);

            setBranchId(user.user.branch_id);
        }
    }, [branchDdlData?.protectedData]);

    const columns = [
        {
            key: 'serial_number',
            header: 'Sl. No.', 
            render: (row:any) => <div className="text-center">{row.serial_number}</div>,
            width: '20px',
        },
        {
            key: 'vr_no',
            header: 'Vr No.',
            render: (row:any) => <div className="w-25">{row.vr_no}</div>,
            width: '100px',
        },
        {
            key: 'vr_date',
            header: 'Vr No.',
            render: (row:any) => <div className="w-25 text-left">{ formatDate(row.vr_date)}</div>,
            width: '100px',
        },
        {
            key: 'total_debit',
            header: 'Debit (Tk)',
            is_number: true,
            width: '100px',
            headerClass: 'text-right',
            cellClass: 'text-right',
            render: (row:any) => <div className="text-right">{ thousandSeparator (row.total_debit,0)}</div>,
        },
        {
            key: 'total_credit',
            header: 'Credit (Tk)',
            is_number: true,
            width: '100px',
            headerClass: 'text-right',
            cellClass: 'text-right',
            render: (row:any) => <div className="text-right">{ thousandSeparator (row.total_credit,0)}</div>,
        },
        {
            key: 'difference',
            header: 'Difference',
            is_number: true,
            width: '100px',
            headerClass: 'text-right',
            cellClass: 'text-right',
            render: (row:any) => <div className="text-right">{ thousandSeparator (row.difference,0)}</div>,
        }
    ];

    return (
        <div className="">
            <HelmetTitle title={'Mitch Match Report'} />
            <div className="mb-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-5 md:gap-x-4">
                    <div className=''>
                        <div>
                            {' '}
                            <label htmlFor="">Select Branch</label>
                        </div>
                        <div>
                            {branchDdlData.isLoading == true ? <Loader /> : ''}
                            <BranchDropdown
                                onChange={handleBranchChange}
                                className="w-full font-medium text-sm p-2"
                                branchDdl={dropdownData}
                            />
                        </div>
                    </div>
                    <div className='mt-2 md:mt-0'>
                        <ButtonLoading
                            onClick={handleActionButtonClick}
                            buttonLoading={buttonLoading}
                            label="Run"
                            className="mt-0 md:mt-6 pt-2 pb-2.5 w-full"
                        />
                    </div>
                </div>
            </div>
            <div className='overflow-y-auto'>
                {mitchMatch.isLoading && <Loader />}
                <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}
            </div>
        </div>
    );
};

export default MitchMatch;
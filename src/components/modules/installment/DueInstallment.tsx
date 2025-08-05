import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import dayjs from 'dayjs';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { getFilterInstallment, installmentReceived } from './installmentSlice';
import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import InputDatePicker from '../../utils/fields/DatePicker';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Table from '../../utils/others/Table';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { InstallmentStatus } from '../../utils/fields/DataConstant';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import StatusIcon from '../../utils/utils-functions/StatusIcon';
import InputElement from '../../utils/fields/InputElement';
import InstallmentModal from './InstallmentModal';
import 'antd/dist/reset.css';
import { Tooltip } from 'antd';
import { Popover } from '@headlessui/react';
import PaymentDetailsModal from './PaymentDetailsModal';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

const DueInstallment = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const installment = useSelector((state: any) => state.installment);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dueOnly, setDueOnly] = useState<boolean>(true);
  const [status, setStatus] = useState<string | null>(null);
  const [upComingDays, setUpComingDays] = useState<number | null>(7);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [amount, setAmount] = useState<number | string>('');
  const [paymentInstallments, setPaymentInstallments] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData.protectedData.data);
      const [day, month, year] =
        branchDdlData.protectedData.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
    }
  }, [branchDdlData?.protectedData]);

  useEffect(() => {
    const responseData = installment?.filterInstallment?.data?.data;

    if (responseData) {
      const totalInstallments = responseData.total_installments ?? 0; // fallback to 0 if undefined
      console.log('Total Installments:', totalInstallments); // (optional) log if needed
      setTableData(responseData?.installments);
    } else {
      setTableData([]);
    }
  }, [installment?.filterInstallment]);

  useEffect(() => {
    if (!startDate || !endDate || !branchId) return;

    const payload = {
      branch_id: branchId,
      startDate: dayjs(startDate).format('YYYY-MM-DD'),
      endDate: dayjs(endDate).format('YYYY-MM-DD'),
      due_only: dueOnly,
      upcoming_day: upComingDays,
      status: status || undefined,
    };

    dispatch(getFilterInstallment(payload));
  }, [branchId, startDate, endDate, dueOnly, status, upComingDays]);

  const handleDueToggle = () => {
    setDueOnly(!dueOnly);
  };

  const handleSave = () => {
    const payloads = {
      branch_id: branchId,
      startDate: dayjs(startDate).format('YYYY-MM-DD'),
      endDate: dayjs(endDate).format('YYYY-MM-DD'),
      due_only: dueOnly,
      upcoming_day: upComingDays,
      status: status || undefined,
    };

    let payload = {
      installment_id: selectedInstallmentId,
      amount,
      remarks,
    };
    // API call this section
    dispatch(installmentReceived(payload))
      .unwrap()
      .then(() => {
        dispatch(getFilterInstallment(payloads));
      })
      .catch((error) => {
        console.error('Error receiving installment:', error);
      });
    setShowModal(false);
  };

  const handleOnStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('Selected Value:', value);
    setStatus(value || null);
  };

  const handleReceive = (installment_id: any, defaultAmount = '') => {
    setSelectedInstallmentId(installment_id);
    setAmount(defaultAmount); // set the passed value as string
    setRemarks('');
    setShowModal(true);
  };

  const handleInstallments = (installments: any) => {
    setPaymentInstallments(installments);
    setShowPaymentsModal(true);
  };

  const handleBranchChange = (e: any) => setBranchId(e.target.value);

  const handleUpcomingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
      setUpComingDays(parsedValue);
    } else {
      setUpComingDays(null); // Reset if input is invalid
    }
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div className="w-25">{row?.sl_number || '-'}</div>,
    },
    {
      key: 'customer_name',
      header: 'Customer Name',
      render: (row: any) => (
        <div className="">
          <span className="block">{row?.customer_name}</span>
          {row?.father && <span className="block">{row?.father}</span>}
          <span className="block">{row?.customer_address}</span>
          <span className="block">{row?.customer_mobile}</span>
          <span className="block text-red-500">{row?.employee}</span>
        </div>
      ),
    },
    {
      key: 'installment_no',
      header: 'Inst No',
      render: (row: any) => (
        <>
          {row.payments.length > 0 ? (
            <ButtonLoading
              onClick={() => handleInstallments(row.payments)}
              label={row.installment_no}
              className="mt-0 pt-1 pb-1 border border-black dark:border-white rounded-sm"
            />
          ) : (
            <span className="p-4">{row.installment_no}</span>
          )}
        </>
      ),
    },

    {
      key: 'invoice_no',
      header: 'Due Date',
      render: (row: any) => (
        <div className="">
          <span className="block">{row?.due_date}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: (
        <div className="text-right">
          <span className="block">Inst. Amount</span>
          <span className="block border-t border-t-red">Due Amount</span>
        </div>
      ),
      width: '130px !important',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="text-right">
          <span className="block">
            {row?.amount ? thousandSeparator(row.amount, 0) : '-'}
          </span>
          <span className="block border-t border-t-red rounded-sm">
            {row?.due_amount ? thousandSeparator(row.due_amount, 0) : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Rcv Amount',
      width: '150px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="text-right">
          {row?.paid_amount ? thousandSeparator(row.paid_amount, 0) : '-'}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '150px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          {row.due_amount > 0 ? (
            <ButtonLoading
              onClick={() => handleReceive(row.installment_id, row.due_amount)}
              buttonLoading={buttonLoading}
              label="Receive"
              className="mt-0 pt-2 pb-2"
            />
          ) : (
            <div className="text-center">
              {row?.received_date ? row.received_date : '-'}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '150px',
      render: (row: any) => (
        <div className="text-right">
          <StatusIcon status={row?.status} />
        </div>
      ),
    },
  ];

  const columnToSum = 'due_amount'; // or any dynamic key you choose
  const totalSum = tableData?.reduce((acc, row) => {
    const value = Number(row?.[columnToSum]);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);

  return (
    <div>
      <HelmetTitle title="Due Installments" />
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
        <div>
          <label>Select Branch</label>
          {branchDdlData.isLoading && <Loader />}
          <BranchDropdown
            defaultValue={user?.user?.branch_id}
            onChange={handleBranchChange}
            className="w-full font-medium text-sm p-1.5"
            branchDdl={dropdownData}
          />
        </div>
        <div>
          <label>Start Date</label>
          <InputDatePicker
            setCurrentDate={setStartDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
          />
        </div>
        <div>
          <label>End Date</label>
          <InputDatePicker
            setCurrentDate={setEndDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
          />
        </div>
        <InputElement
          id="upcoming_days"
          value={upComingDays?.toString() || ''}
          name="upcoming_days"
          placeholder={'Upcoming Days'}
          label={'Upcoming Days'}
          className={'h-[2.0rem] bg-transparent'}
          onChange={handleUpcomingChange}
        />
        <div>
          <DropdownCommon
            id="business_type_id"
            name={'business_type_id'}
            label="Select Status"
            onChange={handleOnStatusChange}
            defaultValue={''}
            className="h-[2.0rem] bg-transparent"
            data={InstallmentStatus}
          />
        </div>

        <div className="flex flex-col justify-center md:mt-6">
          <ToggleSwitch
            label="Show All"
            checked={!dueOnly}
            onChange={handleDueToggle}
          />
        </div>
      </div>
      <div className="overflow-y-auto">
        {installment.isLoading ? (
          <Loader />
        ) : (
          <>
            <Table columns={columns} data={tableData || []} />
            <div className="text-right font-semibold mt-2">
              Total {columnToSum.replace(/_/g, ' ')}:{' '}
              {totalSum ? thousandSeparator(totalSum, 0) : 0}
            </div>
          </>
        )}
        <InstallmentModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          amount={amount}
          setAmount={setAmount}
          remarks={remarks}
          setRemarks={setRemarks}
        />
        <PaymentDetailsModal
          open={showPaymentsModal}
          onClose={() => setShowPaymentsModal(false)}
          installments={paymentInstallments}
        />
      </div>
    </div>
  );
};

export default DueInstallment;

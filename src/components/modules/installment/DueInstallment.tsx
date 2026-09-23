import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import dayjs from 'dayjs';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { getFilterInstallment, installmentReceived } from './installmentSlice';
import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import InputDatePicker from '../../utils/fields/DatePicker';
import { ButtonLoading, ButtonPrint, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Table from '../../utils/others/Table';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { InstallmentStatus } from '../../utils/fields/DataConstant';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import StatusIcon from '../../utils/utils-functions/StatusIcon';
import InputElement from '../../utils/fields/InputElement';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import { FIELD_HEIGHT } from '../../../theme/fieldStyles';
import InstallmentModal from './InstallmentModal';
import { Tooltip } from 'antd';
import { Popover } from '@headlessui/react';
import PaymentDetailsModal from './PaymentDetailsModal';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import DueInstallmentsPrint, { InstallmentRow } from './DueInstallmentsPrint';
import { set } from 'react-datepicker/dist/date_utils';
import { FiFileText } from 'react-icons/fi';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';


const DueInstallment = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const mobileFormat = useMobileFormat();
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
  const [pageSize, setPageSize] = useState<number | null>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [amount, setAmount] = useState<number | string>('');
  const [paymentInstallments, setPaymentInstallments] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
  });

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
      .then((response: any) => {
        const message =
          response.message || 'Installment received successfully!';
        dispatch(getFilterInstallment(payloads));
        setTimeout(() => {
          if (response.success) {
            toast.success(message);
          } else {
            toast.info(message);
          }
        }, 100);
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to receive installment');
      });
    setShowModal(false);
  };

  const handleOnStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
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
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
      setPageSize(parsedValue);
    } else {
      setPageSize(0); // cleared box = All
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
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
          <span className="block">{formatMobile(row?.customer_mobile, mobileFormat)}</span>
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
              icon={<FiFileText className="h-5 w-5" />}
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
            {row?.amount ? thousandSeparator(row.amount) : '-'}
          </span>
          <span className="block border-t border-t-red rounded-sm">
            {row?.due_amount ? thousandSeparator(row.due_amount) : '-'}
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
          {row?.paid_amount ? thousandSeparator(row.paid_amount) : '-'}
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

  // Cash Book's label, so the two screens read alike.
  const filterLabel = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <>
      <div>
        <HelmetTitle title="Due Installments" />
        {/* One wrapping row (owner, 2026-09-23): the fields stretch to fill it
            and the small boxes and Print follow the last field, so a screen
            that fits three fields per line gets Status beside the toolbar on
            the next -- not Status alone with the toolbar under it. */}
        <div className="py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[300px] flex-1">
              <label className={filterLabel}>Select Branch</label>
              {branchDdlData.isLoading && <Loader />}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-2"
                branchDdl={dropdownData}
              />
            </div>

            <div className="min-w-[180px] flex-1">
              <label className={filterLabel}>Start Date</label>
              <InputDatePicker
                setCurrentDate={setStartDate}
                className="font-medium text-sm w-full"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>

            <div className="min-w-[180px] flex-1">
              <label className={filterLabel}>End Date</label>
              <InputDatePicker
                setCurrentDate={setEndDate}
                className="font-medium text-sm w-full"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>

            <div className="min-w-[180px] flex-1">
              {/* Its own label, so it sits like the three beside it. */}
              <label htmlFor="business_type_id" className={filterLabel}>Select Status</label>
              <DropdownCommon
                id="business_type_id"
                name={'business_type_id'}
                onChange={handleOnStatusChange}
                defaultValue={''}
                className="bg-transparent"
                data={InstallmentStatus}
              />
            </div>

            <div className="grid min-w-max grid-cols-[minmax(88px,0.45fr)_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto">
              <div>
                <label htmlFor="upcoming_days" className={filterLabel}>Soon</label>
                <InputElement
                  id="upcoming_days"
                  value={upComingDays?.toString() || ''}
                  name="upcoming_days"
                  placeholder="Days"
                  label=""
                  className="font-medium text-sm w-20! text-center"
                  onChange={handleUpcomingChange}
                />
              </div>
              <div>
                <label htmlFor="page_size" className={filterLabel}>Rows</label>
                <PrintRowsInput
                  id="page_size"
                  name="page_size"
                  label=""
                  value={pageSize?.toString() || ''}
                  onChange={handlePageSizeChange}
                  type="text"
                  className="font-medium text-sm w-20! text-center"
                />
              </div>
              <div>
                <label htmlFor="fontSize" className={filterLabel}>Font</label>
                <PrintFontInput
                  id="fontSize"
                  name="fontSize"
                  label=""
                  value={fontSize.toString()}
                  onChange={handleFontSizeChange}
                  type="text"
                  className="font-medium text-sm w-20! text-center"
                />
              </div>
              <PrintButton onClick={handlePrint} label="Print" className="px-6" />
              <div className={`flex items-center ${FIELD_HEIGHT}`}>
                <ToggleSwitch label="Show All" checked={!dueOnly} onChange={handleDueToggle} />
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto">
          {installment.isLoading ? (
            <Loader />
          ) : (
            <div>
              <Table columns={columns} data={tableData || []} />
              <div className="text-right font-semibold mt-2">
                Total {columnToSum.replace(/_/g, ' ')}:{' '}
                {totalSum ? thousandSeparator(totalSum) : 0}
              </div>

              {/* === Hidden Print Component === */}
              <div className="hidden">
                <DueInstallmentsPrint
                  ref={printRef}
                  rows={(tableData as InstallmentRow[]) || []}
                  startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : ''}
                  endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : ''}
                  statusLabel={dueOnly ? 'Due Only' : 'All'}
                  showAll={!dueOnly}
                  rowsPerPage={Number(pageSize)}
                  fontSize={Number(fontSize)}
                />
              </div>
            </div>
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
    </>
  );
};

export default DueInstallment;

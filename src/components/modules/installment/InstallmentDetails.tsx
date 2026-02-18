import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getInstallment,
  getInstallmentDetails,
  installmentReceived,
} from './installmentSlice';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../utils/others/HelmetTitle';
import StatusIcon from '../../utils/utils-functions/StatusIcon';
import InstallmentModal from './InstallmentModal';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import Loader from '../../../common/Loader';
import Table from '../../utils/others/Table';
import PaymentDetailsModal from './PaymentDetailsModal';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { toast } from 'react-toastify'; 

type Installment = {
  sl_number: number;
  invoice_no: string;
  installment_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  overdue: string;
  status: string;
  received_date: string;
};

const InstallmentDetails = () => {
  const dispatch = useDispatch();
  const installment = useSelector((state) => state.installment);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [reportType, setReportType] = useState(false);
  const [paymentInstallments, setPaymentInstallments] = useState([]);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);

  useEffect(() => {
    const installmentData = installment?.customerInstallment?.data?.data;
    if (Array.isArray(installmentData) && installmentData.length > 0) {
      setInstallments(installmentData);
    } else {
      // Clear old data if new customer has no data
      setInstallments([]);
    }
  }, [installment?.customerInstallment]);

  const handleReceive = (installment_id: any, amount: number) => {
    setSelectedInstallmentId(installment_id);
    setAmount(amount.toString());
    setRemarks('');
    setShowModal(true);
  };

  const handleSave = () => {

    let payload = {
      installment_id: selectedInstallmentId,
      amount,
      remarks
    };
    // API call this section
    dispatch(installmentReceived(payload))
      .unwrap()
      .then((response:any) => {
        const message = response.message || 'Installment received successfully!';
        dispatch(getInstallmentDetails({ customerId: ledgerId }));
        setTimeout(() => { 
          if (response.success) {
            toast.success(message);
          }else{
            toast.info(message);
          }
        }, 100);
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to receive installment');
      });

    setShowModal(false);
  };

  const handleCustomerSelect = (option: any) => {
    setLedgerAccount(option.value);
    dispatch(getInstallmentDetails({ customerId: option.value }));
  };

  const handleGroupToggle = (checked) => {
    setReportType(checked);
    dispatch(
      getInstallmentDetails({
        customerId: ledgerId,
        report: checked,
      }),
    );
  };

  const handleInstallments = (installments: any) => {
    setPaymentInstallments(installments);
    setShowPaymentsModal(true);
  };

  useEffect(() => {
    setTableData(installment?.customerInstallment?.data?.data);
  }, [installment]);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="">{row?.sl_number ? row.sl_number : '-'}</div>
      ),
    },
    {
      key: 'invoice_no',
      header: 'Sales Invoice',
      width: '100px',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => (
        <div className="w-25">{row?.invoice_no ? row.invoice_no : '-'}</div>
      ),
    },
    {
      key: 'installment_no',
      header: 'Installment No',
      render: (row: any) => (
        <>
          {row.payments.length > 0 ? (
            <ButtonLoading
              onClick={() => handleInstallments(row.payments)}
              label={row.installment_no}
              className="mt-0 pt-1 pb-1 w-7 border border-black dark:border-white rounded-full"
            />
          ) : (
            <span className="p-4">{row.installment_no}</span>
          )}
        </>
      ),
    },
    {
      key: 'due_date',
      header: 'Inst. Date',
      width: '100px',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => (
        <div className="w-25">{row?.due_date ? row.due_date : '-'}</div>
      ),
    },
    {
      key: 'due_amount',
      header: 'Inst. Amount',
      width: '150px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="text-right">
          {row?.due_amount ?  thousandSeparator (row.due_amount,0) : '-'}
        </div>
      ),
    },
    {
      key: 'installment_id',
      header: 'Action',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
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
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <StatusIcon status={row.status} />,
    },
  ];

  const columnToSum = 'due_amount'; // or any dynamic key you choose
  const totalSum = tableData?.reduce((acc, row) => {
    const value = Number(row?.[columnToSum]);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);

  return (
    <div className="p-4">
      <HelmetTitle title={'Installments'} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="mb-4">
          <div className="">
            <label htmlFor="" className="dark:text-white">
              Select Customer
            </label>
            <DdlMultiline onSelect={handleCustomerSelect} acType={''} />
          </div>
        </div>
        <div className="mt-8">
          <ToggleSwitch
            label="Show All"
            checked={reportType}
            onChange={handleGroupToggle}
          />
        </div>
      </div>
      {installment.loading ? <Loader /> : ''}

      <>
        <Table columns={columns} data={tableData || []} />
        <div className="text-right font-semibold mt-2">
          Total {columnToSum.replace(/_/g, ' ')}:{' '}
          {totalSum ? thousandSeparator(totalSum, 0) : 0}
        </div>
      </>
      <InstallmentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        amount={amount}
        setAmount={amount => setAmount(amount.toString())}
        remarks={remarks}
        setRemarks={setRemarks}
      />
      <PaymentDetailsModal
        open={showPaymentsModal}
        onClose={() => setShowPaymentsModal(false)}
        installments={paymentInstallments}
      />
    </div>
  );
};

export default InstallmentDetails;

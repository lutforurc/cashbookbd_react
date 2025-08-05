import React from 'react';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { render } from 'react-dom';

interface Installment {
  amount: string | number; // Allow string or number to handle potential string values
  date: string;
  // Add other fields as needed
}

interface InstallmentModalProps {
  open: boolean;
  onClose: () => void;
  installments: Installment[];
}

const PaymentDetailsModal: React.FC<InstallmentModalProps> = ({
  open,
  onClose,
  installments,
}) => {
  if (!open) return null;
 
  const columns = [
    {
      key: 'vr_no',
      header: 'Vr No',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'paid_at',
      header: 'Date',
      width: '100px',
      headerClass: 'text-center',
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: Installment) => (
        <span className="text-right">
          {thousandSeparator(Number(row.amount), 0)}
        </span>
      ),
    },
  ];


const totalAmount = installments 
  .reduce((sum, payment) => sum + Number(payment.amount), 0);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-96 text-gray-900 dark:text-gray-100 border-2 border-gray-900 dark:border-gray-400">
        <h2 className="text-lg font-bold mb-4">Installment Details</h2>

        <div className="mb-3">
          {installments.length > 0 ? (
            <>
            <Table columns={columns} data={installments || []} />
            <div className="mt-4 ml-4">
              <h3 className="text-md font-semibold">Total amount paid: { thousandSeparator (totalAmount,0)}</h3>
            </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No installments available</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <ButtonLoading
            onClick={onClose}
            label="Cancel"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;

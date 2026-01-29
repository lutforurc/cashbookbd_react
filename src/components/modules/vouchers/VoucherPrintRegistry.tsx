import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
 
import { electronicsSalesPrint } from '../invoices/sales/electronicsSalesSlice';
import ElectronicsSalesInvoicePrint from '../invoices/sales/ElectronicsSalesInvoicePrint';

type Props = {
  rowsPerPage: number;
  fontSize: number;
};

export const VoucherPrintRegistry = React.forwardRef(
  ({ rowsPerPage, fontSize }: Props, ref: any) => {
    const dispatch = useDispatch();

    /* ================= REFS ================= */
    const salesRef = useRef<any>(null);
    // future:
    // const purchaseRef = useRef<any>(null);
    // const cashReceiveRef = useRef<any>(null);
    // const cashPaymentRef = useRef<any>(null);

    /* ================= PRINT ================= */
    const printSales = useReactToPrint({
      content: () => salesRef.current,
      documentTitle: 'Sales Voucher',
    });

    /* ================= PUBLIC METHOD ================= */
    React.useImperativeHandle(ref, () => ({
      printVoucher(row: any) {
        const voucherType = row?.vr_no?.split('-')[0];

        switch (voucherType) {
          case '3': // SALES
            dispatch(
              electronicsSalesPrint({ mt: row.mtm_id }, (message?: string) => {
                if (message) {
                  toast.error(message);
                } else {
                  setTimeout(printSales, 300);
                }
              })
            );
            break;

          case '1':
            console.log('Cash Receive – future');
            break;

          case '2':
            console.log('Cash Payment – future');
            break;

          case '4':
            console.log('Purchase – future');
            break;

          default:
            toast.error('Unknown voucher type');
        }
      },
    }));

    /* ================= HIDDEN PRINTS ================= */
    return (
      <div className="hidden">
        <ElectronicsSalesInvoicePrint
          ref={salesRef}
          data={useSelector((s: any) => s.electronicsSales.data)}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />

        {/* Future vouchers */}
        {/* <PurchaseInvoicePrint ref={purchaseRef} /> */}
        {/* <CashReceivePrint ref={cashReceiveRef} /> */}
        {/* <CashPaymentPrint ref={cashPaymentRef} /> */}
      </div>
    );
  }
);

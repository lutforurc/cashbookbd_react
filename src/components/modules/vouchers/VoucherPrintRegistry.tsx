import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';

import { electronicsSalesPrint } from '../invoices/sales/electronicsSalesSlice';

import ElectronicsSalesInvoicePrint from '../invoices/sales/ElectronicsSalesInvoicePrint';
import PurchaseInvoicePrint from './print_items/PurchaseInvoicePrint';
import CashPaymentPrint from './print_items/CashPaymentPrint';
import CashReceivedPrint from './print_items/CashReceivedPrint';

type Props = {
  rowsPerPage: number;
  fontSize: number;
};

export const VoucherPrintRegistry = forwardRef(
  ({ rowsPerPage, fontSize }: Props, ref: any) => {
    const dispatch = useDispatch();

    /* ================= STORE DATA ================= */
    const voucherData = useSelector(
      (s: any) => s.electronicsSales.data
    );

    /* ================= PRINT REFS ================= */
    const salesRef = useRef<HTMLDivElement | null>(null);
    const cashPaymentRef = useRef<HTMLDivElement | null>(null);
    const cashReceivedRef = useRef<HTMLDivElement | null>(null);
    const purchaseRef = useRef<HTMLDivElement | null>(null);

    /* 👉 ACTIVE REF (KEY FIX) */
    const activePrintRef = useRef<HTMLDivElement | null>(null);

    /* ================= PRINT HANDLER ================= */
    const printVoucherDoc = useReactToPrint({
      content: () => activePrintRef.current,
      documentTitle: 'Voucher Print',
      removeAfterPrint: true,
    });

    /* ================= PUBLIC METHOD ================= */
    useImperativeHandle(ref, () => ({
      printVoucher(row: any) {
        if (!row?.mtm_id || !row?.vr_no) {
          toast.error('Invalid voucher data');
          return;
        }

        const voucherType = row.vr_no.split('-')[0];

        switch (voucherType) {
          /* ================= CASH PAYMENT ================= */
          case '1':
            activePrintRef.current = cashReceivedRef.current;

            dispatch(
              electronicsSalesPrint(
                { mt: row.mtm_id },
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printVoucherDoc, 300);
                  }
                }
              )
            );
            break;
          /* ================= CASH PAYMENT ================= */
          case '2':
            activePrintRef.current = cashPaymentRef.current;

            dispatch(
              electronicsSalesPrint(
                { mt: row.mtm_id },
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printVoucherDoc, 300);
                  }
                }
              )
            );
            break;

          /* ================= SALES ================= */
          case '3':
            activePrintRef.current = salesRef.current;

            dispatch(
              electronicsSalesPrint(
                { mt: row.mtm_id },
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printVoucherDoc, 300);
                  }
                }
              )
            );
            break;

          /* ================= PURCHASE (FUTURE) ================= */
          case '4':
            activePrintRef.current = purchaseRef.current;
            toast.error('Purchase print not implemented yet');
            break;

          default:
            toast.error('Unknown voucher type');
        }
      },
    }));

    /* ================= HIDDEN PRINT COMPONENTS ================= */
    return (
      <div className="hidden">
        {/* SALES */}
        <ElectronicsSalesInvoicePrint
          ref={salesRef}
          data={voucherData}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />

        {/* CASH RECEIVED */}
        <CashReceivedPrint
          ref={cashReceivedRef}
          data={voucherData}
          fontSize={fontSize}
        />

        {/* CASH PAYMENT */}
        <CashPaymentPrint
          ref={cashPaymentRef}
          data={voucherData}
          fontSize={fontSize}
        />

        {/* PURCHASE (FUTURE) */}
        <PurchaseInvoicePrint
          ref={purchaseRef}
          data={voucherData}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    );
  }
);

VoucherPrintRegistry.displayName = 'VoucherPrintRegistry';

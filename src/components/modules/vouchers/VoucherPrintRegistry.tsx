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

type PrintPayload = {
  mt?: number;
  voucher_no?: string;
  status?: number;
  include_deleted?: boolean;
  recycle_bin?: boolean;
};

const isValidMtmId = (value: any) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

const getPrintMtmId = (row: any) => {
  const directId = [
    row?.mtm_id,
    row?.smtm_id,
    row?.main_trx_id,
    row?.main_transaction_id,
    row?.main_trx_master_id,
    row?.main_transaction_master_id,
    row?.main_trx_master?.id,
    row?.main_transaction_master?.id,
    row?.main_transaction?.id,
    row?.main_transaction?.main_trx_id,
    row?.transaction?.main_trx_id,
    row?.transaction?.mtm_id,
    row?.transaction?.id,
    row?.voucher_id,
    row?.trx_id,
    row?.transaction_id,
    row?.main_id,
    row?.mt_id,
    row?.mtmid,
    row?.mtmId,
    row?.mid,
  ].find(isValidMtmId);

  if (directId) return directId;

  if (Number(row?.status) === 0 || row?.fromRecycleBin) {
    return null;
  }

  return isValidMtmId(row?.id) ? row.id : null;
};

const buildPrintPayload = (mtmId: any, row: any): PrintPayload => {
  const isRecycleBinVoucher = Number(row?.status) === 0 || row?.fromRecycleBin;
  const payload: PrintPayload = {};

  if (isValidMtmId(mtmId)) {
    payload.mt = Number(mtmId);
  }

  if (isRecycleBinVoucher) {
    payload.status = 0;
    payload.include_deleted = true;
    payload.recycle_bin = true;

    if (row?.vr_no) {
      payload.voucher_no = String(row.vr_no);
    }
  }

  return payload;
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
        const mtmId = getPrintMtmId(row);
        if (!row?.vr_no) {
          toast.error('Invalid voucher data');
          return;
        }

        const printPayload = buildPrintPayload(mtmId, row);

        if (!printPayload.mt && !printPayload.voucher_no) {
          toast.error('Invalid voucher data');
          return;
        }

        const rawVoucherType = String(row.vr_no).split('-')[0]?.trim();
        const parsedVoucherType = Number.parseInt(rawVoucherType, 10);
        const voucherType = Number.isNaN(parsedVoucherType)
          ? rawVoucherType
          : String(parsedVoucherType);

        switch (voucherType) {
          /* ================= CASH PAYMENT ================= */
          case '1':
            activePrintRef.current = cashReceivedRef.current;

            dispatch(
              electronicsSalesPrint(
                printPayload,
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
                printPayload,
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
                printPayload,
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

          /* ================= PURCHASE ================= */
          case '4':
            activePrintRef.current = purchaseRef.current;
            dispatch(
              electronicsSalesPrint(
                printPayload,
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

          default:
            toast.error(`Unknown voucher type: ${rawVoucherType || 'N/A'}`);
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

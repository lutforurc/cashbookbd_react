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
  mt?: number | null;
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
  const payload: PrintPayload = { mt: null };

  if (isValidMtmId(mtmId)) {
    payload.mt = Number(mtmId);
  }

  if (isRecycleBinVoucher) {
    payload.status = 0;
    payload.include_deleted = true;
    payload.recycle_bin = true;
  }

  if (row?.vr_no && !payload.mt) {
    payload.voucher_no = String(row.vr_no);
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

    /* 👉 WHICH PRINT COMPONENT WAS ASKED FOR (KEY FIX)
     *
     * ⚠️ THE REF, NOT THE NODE IT HAPPENED TO BE SHOWING. This held the DOM
     * node the click found, and that is why the first print of a sale came out
     * reading "No invoice data" while the second was perfect. These components
     * stand a placeholder div on the page until their payload arrives and then
     * render the real paper in its place -- two different element types, so
     * React throws the placeholder away and mounts a new node. react-to-print
     * clones what it is handed, and it was being handed the throwaway: the
     * sale's data arrived and went into the store, and the paper still showed
     * the node it had replaced. By the second press the placeholder was long
     * gone, the node the click found was the real one, and it stayed.
     *
     * Reading the ref's .current when the print actually starts gets the node
     * on the page at that moment. All four types share the one variable
     * because only one of them is ever being printed -- the switch says which.
     */
    const activeRef = useRef<React.RefObject<HTMLDivElement | null> | null>(null);

    /* ================= PRINT HANDLER ================= */
    /**
     * ⚠️ No `contentRef`, deliberately. It is read when the hook is built and
     * would hand back the node captured at click time; the callback form is
     * read when the print runs. Same reason as activeRef above.
     */
    const printVoucherDoc = useReactToPrint({
      documentTitle: 'Voucher Print',
    });

    const printActive = () =>
      printVoucherDoc(() => activeRef.current?.current ?? null);

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
            activeRef.current = cashReceivedRef;

            dispatch(
              electronicsSalesPrint(
                printPayload,
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printActive, 300);
                  }
                }
              )
            );
            break;
          /* ================= CASH PAYMENT ================= */
          case '2':
            activeRef.current = cashPaymentRef;

            dispatch(
              electronicsSalesPrint(
                printPayload,
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printActive, 300);
                  }
                }
              )
            );
            break;

          /* ================= SALES ================= */
          /**
           * Both sale numbers, because they are one paper.
           *
           * The prefix says how a sale was PAID FOR, not what it is: 3 is a
           * cash sale and 10 a credit one, and the invoice that goes to the
           * customer is the same document either way. This knew only 3, so a
           * credit sale fell to the default below and answered "Unknown voucher
           * type: 10" -- the ledger listed the invoice, and clicking it printed
           * nothing.
           *
           * The same mistake the quantity columns on Ledger Details made, and
           * for the same reason: 9 and 10 were added as prefixes of their own
           * after this switch was written, and nothing went back to teach the
           * places that were reading the number to decide what a voucher was.
           */
          case '3':
          case '10':
            activeRef.current = salesRef;

            dispatch(
              electronicsSalesPrint(
                printPayload,
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printActive, 300);
                  }
                }
              )
            );
            break;

          /* ================= PURCHASE ================= */
          /** 4 is a cash purchase, 9 a credit one -- one paper, as above. */
          case '4':
          case '9':
            activeRef.current = purchaseRef;
            dispatch(
              electronicsSalesPrint(
                printPayload,
                (message?: string) => {
                  if (message) {
                    toast.error(message);
                  } else {
                    setTimeout(printActive, 300);
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

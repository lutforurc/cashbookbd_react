import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../../utils/utils-functions/thousandSeparator';
import { chartDateTime } from '../../../../utils/utils-functions/formatDate';

type CashVoucherMode = 'payment' | 'received';
type CashVoucherVariant = 'a4-portrait' | 'a4-landscape' | 'half-portrait' | 'half-landscape';

type Props = {
  data: any;
  fontSize?: number;
  mode: CashVoucherMode;
  variant: CashVoucherVariant;
};

const numberToWords = (num: number): string => {
  if (!num || num === 0) return 'Zero Taka Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n: number): string => {
    let str = '';

    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }

    if (n >= 10 && n < 20) {
      str += `${teens[n - 10]} `;
    } else {
      if (n >= 20) {
        str += `${tens[Math.floor(n / 10)]} `;
        n %= 10;
      }
      if (n > 0) str += `${ones[n]} `;
    }

    return str.trim();
  };

  let result = '';
  let n = num;

  if (n >= 10000000) {
    result += `${convertBelowThousand(Math.floor(n / 10000000))} Crore `;
    n %= 10000000;
  }
  if (n >= 100000) {
    result += `${convertBelowThousand(Math.floor(n / 100000))} Lakh `;
    n %= 100000;
  }
  if (n >= 1000) {
    result += `${convertBelowThousand(Math.floor(n / 1000))} Thousand `;
    n %= 1000;
  }
  if (n > 0) result += convertBelowThousand(n);

  return `${result.trim()} Taka Only`;
};

const getCashVoucherData = (data: any, mode: CashVoucherMode) => {
  const accMastersRaw = data?.acc_transaction_master;
  const accMasters = Array.isArray(accMastersRaw)
    ? accMastersRaw
    : accMastersRaw
      ? [accMastersRaw]
      : [];

  const trxMaster = accMasters[0];
  const trxDetails = trxMaster?.acc_transaction_details ?? [];

  if (!trxDetails.length) {
    return { error: 'No payment data found' } as const;
  }

  const entry = mode === 'payment'
    ? trxDetails.find((d: any) => Number(d.debit) > 0)
    : trxDetails.find((d: any) => Number(d.credit) > 0);

  if (!entry) {
    return { error: 'Invalid voucher structure' } as const;
  }

  return {
    headOfAccount: entry?.coa_l4?.name ?? '',
    amount: Number(mode === 'payment' ? entry?.debit : entry?.credit) ?? 0,
    remarks: entry?.remarks ?? '',
    address: entry?.coa_l4?.cust_party_infos?.address ?? '',
    mobile: entry?.coa_l4?.cust_party_infos?.mobile ?? '',
    preparedBy: data?.user?.name ?? '',
  };
};

const variantConfig = {
  'a4-portrait': {
    pageSize: 'A4 portrait',
    pageMargin: '6mm 6mm 8mm 8mm',
    titleFsOffset: 6,
    titleMt: 'mt-3',
    titleMb: 'mb-4',
    tableRowHeight: '100px',
    amountWidth: 'w-40',
    signatureMt: 'mt-10',
    containerClass: '',
    textClass: 'text-xs',
  },
  'a4-landscape': {
    pageSize: 'A4 landscape',
    pageMargin: '6mm 8mm 8mm 8mm',
    titleFsOffset: 5,
    titleMt: 'mt-2',
    titleMb: 'mb-3',
    tableRowHeight: '74px',
    amountWidth: 'w-44',
    signatureMt: 'mt-8',
    containerClass: '',
    textClass: 'text-xs',
  },
  'half-portrait': {
    pageSize: '210mm 148.5mm',
    pageMargin: '4mm 5mm 5mm 5mm',
    titleFsOffset: 3,
    titleMt: 'mt-2',
    titleMb: 'mb-2',
    tableRowHeight: '52px',
    amountWidth: 'w-28',
    signatureMt: 'mt-4',
    containerClass: 'px-1 py-1',
    textClass: 'text-[10px]',
  },
  'half-landscape': {
    pageSize: '148.5mm 210mm',
    pageMargin: '5mm 6mm 6mm 6mm',
    titleFsOffset: 3,
    titleMt: 'mt-1',
    titleMb: 'mb-2',
    tableRowHeight: '60px',
    amountWidth: 'w-32',
    signatureMt: 'mt-5',
    containerClass: 'px-2 py-1',
    textClass: 'text-[10px]',
  },
} as const;

const CashVoucherPrintBase = React.forwardRef<HTMLDivElement, Props>(
  ({ data, fontSize = 10, mode, variant }, ref) => {
    const printData = getCashVoucherData(data, mode);

    if ('error' in printData) {
      return <div ref={ref}>{printData.error}</div>;
    }

    const config = variantConfig[variant];
    const fs = variant.startsWith('half') ? Math.max(fontSize - 1, 8.5) : fontSize;
    const title = mode === 'payment' ? 'Cash Debit (Payment) Voucher' : 'Cash Credit (Received) Voucher';

    return (
      <div ref={ref} className="print-root text-gray-900">
        <style>{`
          @media print {
            @page {
              size: ${config.pageSize};
              margin: ${config.pageMargin};
            }
            .print-root {
              padding: 0 !important;
            }
          }
        `}</style>

        <div className={config.containerClass}>
          <PadPrinting />

          <h1
            className={`text-center font-bold uppercase ${config.titleMt} ${config.titleMb}`}
            style={{ fontSize: fs + config.titleFsOffset }}
          >
            {title}
          </h1>

          <div className={`flex justify-between mb-3 ${config.textClass}`}>
            <div><b>Voucher No:</b> {data?.vr_no}</div>
            <div><b>Date:</b> {dayjs(data?.vr_date).format('DD/MM/YYYY')}</div>
          </div>

          <table className={`w-full border-collapse ${config.textClass}`}>
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left">
                  <div className={variant.startsWith('half') ? '' : 'ml-3'}>Head of Account</div>
                </th>
                <th className={`border border-black px-2 py-1 text-right ${config.amountWidth}`}>
                  <div className="mr-2">{variant.startsWith('half') ? 'Amount' : 'Amount (Taka)'}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: config.tableRowHeight }}>
                <td className={`border border-black px-2 ${variant.startsWith('half') ? 'align-top' : 'align-middle'}`}>
                  <div className={variant.startsWith('half') ? 'pt-1' : 'ml-3'}>
                    {printData.headOfAccount}
                    {printData.address && <><br />{variant.startsWith('half') ? printData.address : <span className="text-gray-700">{printData.address}</span>}</>}
                    {String(printData.mobile).length > 5 && <><br />{variant.startsWith('half') ? printData.mobile : <span className="text-gray-700">{printData.mobile}</span>}</>}
                    {printData.remarks && <><br />{variant.startsWith('half') ? printData.remarks : <span className="text-gray-700">{printData.remarks}</span>}</>}
                  </div>
                </td>
                <td className="border border-black px-2 text-right align-middle">
                  <div className="mr-2">{thousandSeparator(printData.amount)}</div>
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-right font-semibold">
                  <div className="mr-2">Total Amount{variant.startsWith('half') ? '' : ' (Taka)'}</div>
                </td>
                <td className="border border-black px-2 py-1 text-right font-semibold">
                  <div className="mr-2">{thousandSeparator(printData.amount)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className={`mt-3 ${config.textClass}`}>
            <b>Taka in Word:</b> {numberToWords(printData.amount)}
          </div>

          <div className={`${config.signatureMt} grid grid-cols-3 gap-6 ${config.textClass}`}>
            <div>
              <div className={`border-t border-black pt-1 text-center ${variant.startsWith('half') ? '' : 'w-40'}`}>Received By</div>
            </div>
            <div className="text-center">
              <div className={`border-t border-black pt-1 ${variant.startsWith('half') ? '' : 'w-40 mx-auto'}`}>Prepared by</div>
              {printData.preparedBy && <div className={variant.startsWith('half') ? '' : 'mt-1'}>{printData.preparedBy}</div>}
              {data?.created_at && <div>{chartDateTime(data.created_at)}</div>}
            </div>
            <div className={variant.startsWith('half') ? '' : 'text-right'}>
              <div className={`border-t border-black pt-1 text-center ${variant.startsWith('half') ? '' : 'w-40 ml-auto'}`}>Approved By</div>
            </div>
          </div>

          {!variant.startsWith('half') && (
            <div className="mt-4 text-xs text-gray-600">
              * This voucher is system generated.
            </div>
          )}
        </div>
      </div>
    );
  },
);

CashVoucherPrintBase.displayName = 'CashVoucherPrintBase';

export default CashVoucherPrintBase;

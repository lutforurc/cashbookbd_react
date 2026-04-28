import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../../utils/utils-functions/thousandSeparator';
import { chartDateTime } from '../../../../utils/utils-functions/formatDate';
import { formatTransportationNumber } from '../../../../utils/utils-functions/formatRoleName';

type Variant = 'a4-portrait' | 'a4-landscape' | 'half-portrait' | 'half-landscape';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
  settings: any;
  variant: Variant;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data) || size <= 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const getWarrantyInfo = (warranty: any) => {
  if (!warranty || typeof warranty !== 'object') return null;

  const labelKey = Object.keys(warranty).find((key) => !Number.isNaN(Number(key)));
  const label = labelKey ? warranty[labelKey] : '';
  const dayValue = warranty?.day;

  if (!label || dayValue == null || dayValue === '') return null;

  return {
    label: `${label}:`,
    value: `${dayValue} day`,
  };
};

const isEnabled = (value: unknown) => value === true || value === 1 || value === '1';

const variantConfig = {
  'a4-portrait': {
    pageSize: 'A4 portrait',
    pageMargin: '5mm 4mm 8mm 8mm',
    pagePadding: '5mm 8mm',
    minHeight: '276mm',
    fontAdjust: 0,
    rowsLimit: 10,
    amountWidth: 'w-28',
    qtyWidth: 'w-20',
    rateWidth: 'w-24',
    showFooter: true,
    titleOffset: 4,
  },
  'a4-landscape': {
    pageSize: 'A4 landscape',
    pageMargin: '6mm 8mm 8mm 8mm',
    pagePadding: '4mm 8mm',
    minHeight: '188mm',
    fontAdjust: -0.5,
    rowsLimit: 8,
    amountWidth: 'w-32',
    qtyWidth: 'w-20',
    rateWidth: 'w-24',
    showFooter: true,
    titleOffset: 4,
  },
  'half-portrait': {
    pageSize: '210mm 148.5mm',
    pageMargin: '4mm 5mm 5mm 5mm',
    pagePadding: '3mm 5mm',
    minHeight: '138mm',
    fontAdjust: -1,
    rowsLimit: 4,
    amountWidth: 'w-20',
    qtyWidth: 'w-14',
    rateWidth: 'w-16',
    showFooter: false,
    titleOffset: 3,
  },
  'half-landscape': {
    pageSize: '148.5mm 210mm',
    pageMargin: '5mm 6mm 6mm 6mm',
    pagePadding: '4mm 6mm',
    minHeight: '198mm',
    fontAdjust: -1,
    rowsLimit: 6,
    amountWidth: 'w-24',
    qtyWidth: 'w-14',
    rateWidth: 'w-16',
    showFooter: false,
    titleOffset: 3,
  },
} as const;

const getSalesMeta = (data: any) => {
  const salesMaster = data?.sales_master;
  const details = salesMaster?.details || [];
  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );
  const received = trxDetails.find((d: any) => d.coa4_id === 17);
  const discount = trxDetails.find((d: any) => d.coa4_id === 23);
  const tds = trxDetails.find((d: any) => d.coa4_id === 41);
  const serviceCharge = trxDetails.find((d: any) => d.coa4_id === 42);
  const carryingOutward = trxDetails.find((d: any) => d.coa4_id === 198);

  const customerId = Number(salesMaster?.customer_id);
  const customerDetail =
    trxDetails.find(
      (d: any) =>
        Number(d?.coa4_id) === customerId ||
        Number(d?.coa_l4?.id) === customerId,
    ) ||
    trxDetails.find((d: any) => d?.coa_l4?.cust_party_infos);
  const customerInfo = customerDetail?.coa_l4?.cust_party_infos || {};
  const grandTotal = details.reduce((sum: number, d: any) => sum + Number(d.quantity) * Number(d.sales_price), 0);

  return {
    salesMaster,
    details,
    customerName: salesMaster?.name || customerInfo?.name || customerDetail?.coa_l4?.name || '-',
    customerMobile: salesMaster?.mobile || customerInfo?.mobile || '',
    customerAddress: salesMaster?.address || customerInfo?.address || customerInfo?.manual_address || '',
    receivedAmount: received ? Number(received.debit) : 0,
    discountAmount: discount ? Number(discount.debit) : 0,
    tdsName: tds ? tds.coa_l4?.name : '',
    tdsAmount: tds ? Number(tds.credit) : 0,
    serviceChargeName: serviceCharge ? serviceCharge.coa_l4?.name : '',
    serviceChargeAmount: serviceCharge ? Number(serviceCharge.credit) : 0,
    carryingOutwardName: carryingOutward ? carryingOutward.coa_l4?.name : '',
    carryingOutwardAmount: carryingOutward ? Number(carryingOutward.credit) : 0,
    grandTotal,
  };
};

const ElectronicsSalesInvoicePrintBase = React.forwardRef<HTMLDivElement, Props>(
  ({ data, rowsPerPage = 10, fontSize = 10, settings, variant }, ref) => {
    const meta = getSalesMeta(data);

    if (!meta.salesMaster) {
      return <div ref={ref}>No invoice data</div>;
    }
    if (!meta.details.length) {
      return (
        <div ref={ref} className="print-root">
          <PadPrinting />
          <div className="text-center mt-20 text-sm">No item found in this invoice</div>
        </div>
      );
    }

    const config = variantConfig[variant];
    const fs = Math.max(fontSize + config.fontAdjust, 8);
    const pageRows = Math.min(rowsPerPage, config.rowsLimit);
    const pages = chunkRows(meta.details, pageRows);
    const isHalf = variant.startsWith('half');

    return (
      <div ref={ref} className="print-root text-gray-900">
        <style>{`
          @media print {
            @page {
              size: ${config.pageSize};
              margin: ${config.pageMargin};
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .print-root { padding: 0 !important; }
            .print-page {
              padding: ${config.pagePadding} !important;
              min-height: ${config.minHeight};
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            .page-break { page-break-after: always; }
            .avoid-break { break-inside: avoid; }
          }
        `}</style>

        {pages.map((pageRowsData, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className={isHalf ? 'mt-2 mb-2' : 'mt-3 mb-3'}>
              <h1 className="text-center font-bold leading-tight" style={{ fontSize: fs + config.titleOffset }}>
                SALES INVOICE
              </h1>

              <div className={`grid ${isHalf ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-2`} style={{ lineHeight: 1.25, fontSize: fs }}>
                <div className={`space-y-1 ${isHalf ? 'col-span-1' : 'col-span-2'}`}>
                  <div><span className="font-semibold">Name:</span> {meta.customerName}</div>
                  {meta.customerMobile.length > 5 && !isHalf && (
                    <div>Mobile: {String(meta.customerMobile).replace(/^(\d{5})(\d+)/, '$1-$2')}</div>
                  )}
                  {meta.customerAddress && <div>Address: {meta.customerAddress}</div>}
                  {data?.sales_master?.sales_order?.order_number && <div>Order Number: {data.sales_master.sales_order.order_number}</div>}
                  {!isHalf && data?.sales_master?.sales_order?.delivery_location && (
                    <div>Delivery Location: {data.sales_master.sales_order.delivery_location}</div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div><span className="font-semibold">Invoice No:</span> {data.vr_no}</div>
                  <div><span className="font-semibold">Date:</span> {dayjs(data.vr_date).format('DD/MM/YYYY')}</div>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className={`border border-black px-1 py-1 ${isHalf ? 'w-8' : 'w-10'} text-center`} style={{ fontSize: fs }}>#</th>
                  <th className="border border-black px-1 py-1 text-left" style={{ fontSize: fs }}>Product</th>
                  <th className={`border border-black px-1 py-1 ${config.qtyWidth} text-center`} style={{ fontSize: fs }}>Qty</th>
                  <th className={`border border-black px-1 py-1 ${config.rateWidth} text-right`} style={{ fontSize: fs }}>Rate</th>
                  <th className={`border border-black px-1 py-1 ${config.amountWidth} text-right`} style={{ fontSize: fs }}>Amount</th>
                </tr>
              </thead>

              <tbody>
                {pageRowsData.map((row: any, idx: number) => {
                  const qty = Number(row.quantity);
                  const rate = Number(row.sales_price);
                  const total = qty * rate;
                  const warrantyInfo = getWarrantyInfo(row.product?.warranty_days);

                  return (
                    <tr key={idx} className="avoid-break">
                      <td className="border border-black px-1 text-center align-top" style={{ fontSize: fs }}>
                        {pageIndex * pageRows + idx + 1}
                      </td>
                      <td className="border border-black px-1 align-top" style={{ fontSize: isHalf ? fs - 0.5 : fs, lineHeight: 1.2 }}>
                        {isEnabled(settings?.data?.branch?.show_category_in_invoice) && row.product?.category?.name && (
                          <span className="block">{row.product.category.name}</span>
                        )}
                        <span>
                          {isEnabled(settings?.data?.branch?.show_brand_in_invoice) && row.product?.brand?.name && (
                            <span>{row.product.brand.name} </span>
                          )}
                          {row.product?.name}
                        </span>
                        {isEnabled(settings?.data?.branch?.show_description_in_invoice) && !isHalf && row.product?.description && (
                          <span className="block italic">({row.product.description})</span>
                        )}
                        {row.serial_no && (
                          <span className="block">
                            <span className="font-semibold">
                              {settings?.data?.branch?.device_identifier_text
                                ? `${settings.data.branch.device_identifier_text} `
                                : ''}
                            </span>{' '}
                            {row.serial_no}
                          </span>
                        )}
                        {warrantyInfo && (
                          <span className="block">
                            <span className="font-semibold">{warrantyInfo.label}</span> {warrantyInfo.value}
                          </span>
                        )}
                      </td>
                      <td className="border border-black px-1 text-center" style={{ fontSize: fs }}>{thousandSeparator(qty)}</td>
                      <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>{thousandSeparator(rate)}</td>
                      <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>{thousandSeparator(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pageIndex === pages.length - 1 && (
              <div className={isHalf ? 'mt-2' : 'mt-3'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {data?.sales_master?.vehicle_no && (
                      <div className={isHalf ? 'mt-1' : 'mt-2'}>
                        <span className="inline-block border border-black px-2 py-1 font-semibold" style={{ fontSize: fs }}>
                          Vehicle No: <span className="uppercase">{formatTransportationNumber(data?.sales_master?.vehicle_no)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <table className="border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>Total Tk.</td>
                        <td className={`border-y border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'} font-semibold`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.grandTotal)}
                        </td>
                      </tr>
                      {meta.tdsName && meta.tdsAmount !== 0 && !isHalf && (
                        <tr>
                          <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>{meta.tdsName} Tk.</td>
                          <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>{thousandSeparator(meta.tdsAmount)}</td>
                        </tr>
                      )}
                      {meta.serviceChargeName && meta.serviceChargeAmount !== 0 && !isHalf && (
                        <tr>
                          <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>{meta.serviceChargeName} Tk.</td>
                          <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>{thousandSeparator(meta.serviceChargeAmount)}</td>
                        </tr>
                      )}
                      {meta.carryingOutwardName && meta.carryingOutwardAmount !== 0 && !isHalf && (
                        <tr>
                          <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>{meta.carryingOutwardName} Tk.</td>
                          <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>{thousandSeparator(meta.carryingOutwardAmount)}</td>
                        </tr>
                      )}
                      {meta.discountAmount !== 0 && !isHalf && (
                        <tr>
                          <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>Discount Tk.</td>
                          <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                            (-) {thousandSeparator(meta.discountAmount)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>Net Tk.</td>
                        <td className={`border-y border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'} font-semibold`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.grandTotal + meta.tdsAmount + meta.serviceChargeAmount + meta.carryingOutwardAmount - meta.discountAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>Received Tk.</td>
                        <td className={`border-y border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'}`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.receivedAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-black px-1 py-1 text-right font-bold" style={{ fontSize: fs }}>Due Tk.</td>
                        <td className={`border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'} font-bold`} style={{ fontSize: fs }}>
                          {thousandSeparator(
                            (meta.grandTotal + meta.tdsAmount + meta.serviceChargeAmount + meta.carryingOutwardAmount) -
                            meta.discountAmount -
                            meta.receivedAmount,
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {settings?.data?.branch?.show_spelling_of_money == '1' && (
                  <div className={isHalf ? 'pt-2' : 'w-full pt-4 text-left leading-snug'} style={{ fontSize: fs - 0.25 }}>
                    <span className="tracking-wide">{data?.inword}</span>
                  </div>
                )}

                <div className={isHalf ? 'flex items-end justify-end pt-3' : 'flex items-end justify-end pt-8 pr-8'}>
                  <div className="text-left" style={{ fontSize: fs }}>
                    <div className="border-t border-black min-w-[110px] text-center">{data?.user?.name}</div>
                    <div className="text-center leading-none mt-0.5">{chartDateTime(data?.created_at)}</div>
                  </div>
                </div>
              </div>
            )}

            {settings?.data?.branch?.show_instalment_list == '1' && pageIndex === pages.length - 1 &&
              data?.installments && data.installments.length > 0 && !isHalf && (
                <div className="ml-10 w-[260px] overflow-hidden avoid-break">
                  <h2 className="block w-full text-center text-xs">Installment Details</h2>
                  <div className="grid grid-cols-[36px_96px_96px] border-b-[0.5px] border-black px-3 py-1 font-semibold" style={{ fontSize: fs - 0.5 }}>
                    <div className="text-center">SL</div>
                    <div>Due Date</div>
                    <div className="text-right">Amount</div>
                  </div>
                  {data.installments.map((inst: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[36px_96px_96px] px-3 py-1 border-b-[0.5px] border-gray-300 last:border-b-0" style={{ fontSize: fs }}>
                      <div className="font-medium text-center">{idx + 1}</div>
                      <div>{dayjs(inst.due_date).format('DD/MM/YYYY')}</div>
                      <div className="text-right font-medium">{thousandSeparator(Number(inst.amount))}</div>
                    </div>
                  ))}
                </div>
              )}

            {config.showFooter && (
              <div className="mt-auto text-xs text-right" style={{ lineHeight: 1.2 }}>
                Page {pageIndex + 1} of {pages.length}
              </div>
            )}

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

ElectronicsSalesInvoicePrintBase.displayName = 'ElectronicsSalesInvoicePrintBase';

export default ElectronicsSalesInvoicePrintBase;

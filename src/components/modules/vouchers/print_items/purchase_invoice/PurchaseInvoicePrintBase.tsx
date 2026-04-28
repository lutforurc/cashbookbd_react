import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../../utils/utils-functions/formatRoleName';
import { chartDateTime } from '../../../../utils/utils-functions/formatDate';
import numberToWords from '../../../../utils/utils-functions/numberToWords';

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

const getPurchaseMeta = (data: any) => {
  const purchaseMaster = data?.purchase_master;
  const details = purchaseMaster?.details || [];
  const transactions = data?.acc_transaction_master || [];
  const trxDetails = transactions.flatMap((t: any) => t?.acc_transaction_details || []);
  const supplierFallback =
    trxDetails.find(
      (d: any) =>
        Number(d?.coa4_id) === Number(purchaseMaster?.supplier_id) &&
        d?.coa_l4?.cust_party_infos,
    )?.coa_l4?.cust_party_infos || {};

  const totalAmount = Number(purchaseMaster?.total ?? 0);
  const discountFromLedger = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 40)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);
  const discountAmount = discountFromLedger || Number(purchaseMaster?.discount ?? 0);
  const netAmount = totalAmount - discountAmount;
  const paidAmount = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 17)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);

  return {
    purchaseMaster,
    details,
    supplierName: purchaseMaster?.name || supplierFallback?.name || '-',
    supplierMobile: purchaseMaster?.mobile || supplierFallback?.mobile || '',
    supplierAddress:
      purchaseMaster?.address ||
      supplierFallback?.address ||
      supplierFallback?.manual_address ||
      '',
    totalAmount,
    discountAmount,
    netAmount,
    paidAmount,
    dueAmount: Math.max(netAmount - paidAmount, 0),
    purchaseInWord:
      data?.inword ||
      purchaseMaster?.inword ||
      `${numberToWords(netAmount)} Only`.trim(),
  };
};

const PurchaseInvoicePrintBase = React.forwardRef<HTMLDivElement, Props>(
  ({ data, rowsPerPage = 10, fontSize = 10, settings, variant }, ref) => {
    const meta = getPurchaseMeta(data);

    if (!meta.purchaseMaster || !meta.details.length) {
      return <div ref={ref}>No purchase invoice data found</div>;
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
                PURCHASE INVOICE
              </h1>

              <div
                className={`grid ${isHalf ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-2`}
                style={{ lineHeight: 1.25, fontSize: fs }}
              >
                <div className={`space-y-1 ${isHalf ? 'col-span-1' : 'col-span-2'}`}>
                  <div><span className="font-semibold">Name:</span> {meta.supplierName}</div>
                  {meta.supplierMobile.length > 5 && !isHalf && (
                    <div>Mobile: {String(meta.supplierMobile).replace(/^(\d{5})(\d+)/, '$1-$2')}</div>
                  )}
                  {meta.supplierAddress && <div>Address: {meta.supplierAddress}</div>}
                  {data?.purchase_master?.purchase_order?.order_number && (
                    <div>Order Number: {data.purchase_master.purchase_order.order_number}</div>
                  )}
                  {!isHalf && data?.purchase_master?.purchase_order?.delivery_location && (
                    <div>Delivery Location: {data.purchase_master.purchase_order.delivery_location}</div>
                  )}
                  {meta.purchaseMaster?.notes && <div><span className="font-semibold">Notes:</span> {meta.purchaseMaster.notes}</div>}
                </div>

                <div className="text-right space-y-1">
                  <div><span className="font-semibold">Voucher No:</span> {data?.vr_no}</div>
                  <div>
                    <span className="font-semibold">Date:</span>{' '}
                    {dayjs(meta.purchaseMaster?.invoice_date || meta.purchaseMaster?.transact_date || data?.vr_date).format('DD/MM/YYYY')}
                  </div>
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
                  const qty = Number(row?.quantity ?? 0);
                  const rate = Number(row?.purchase_price ?? 0);
                  const total = qty * rate;
                  const warrantyInfo = getWarrantyInfo(row?.product?.warranty_days);

                  return (
                    <tr key={row?.id ?? idx} className="avoid-break">
                      <td className="border border-black px-1 text-center align-top" style={{ fontSize: fs }}>
                        {pageIndex * pageRows + idx + 1}
                      </td>
                      <td className="border border-black px-1 align-top" style={{ fontSize: isHalf ? fs - 0.5 : fs, lineHeight: 1.2 }}>
                        {isEnabled(settings?.data?.branch?.show_category_in_invoice) && row?.product?.category?.name && (
                          <span className="block">{row.product.category.name}</span>
                        )}
                        <span>
                          {isEnabled(settings?.data?.branch?.show_brand_in_invoice) && row?.product?.brand?.name && (
                            <>{row.product.brand.name} </>
                          )}
                          {row?.product?.name || '-'}
                        </span>
                        {isEnabled(settings?.data?.branch?.show_description_in_invoice) && !isHalf && row?.product?.description && (
                          <span className="block italic">({row.product.description})</span>
                        )}
                        {row?.serial_no && (
                          <span className="block">
                            <span className="font-semibold">
                              {settings?.data?.branch?.device_identifier_text
                                ? `${settings.data.branch.device_identifier_text} `
                                : ''}
                            </span>
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
                    {meta.purchaseMaster?.vehicle_no && (
                      <div className={isHalf ? 'mt-1' : 'mt-2'}>
                        <span className="inline-block border border-black px-2 py-1 font-semibold" style={{ fontSize: fs }}>
                          Vehicle No: <span className="uppercase">{formatTransportationNumber(meta.purchaseMaster?.vehicle_no)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <table className="border-collapse">
                    <tbody>
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>Total Tk.</td>
                        <td className={`border-y border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'} font-semibold`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.totalAmount)}
                        </td>
                      </tr>
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
                          {thousandSeparator(meta.netAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>Paid Tk.</td>
                        <td className={`border-y border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'}`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.paidAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border-black px-1 py-1 text-right font-bold" style={{ fontSize: fs }}>Due Tk.</td>
                        <td className={`border-black px-1 py-1 text-right ${isHalf ? 'w-24' : 'w-32'} font-bold`} style={{ fontSize: fs }}>
                          {thousandSeparator(meta.dueAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {settings?.data?.branch?.show_spelling_of_money == '1' && (
                  <div className={isHalf ? 'pt-2' : 'w-full pt-4 text-left leading-snug'} style={{ fontSize: fs - 0.25 }}>
                    <span className="tracking-wide">{meta.purchaseInWord}</span>
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

PurchaseInvoicePrintBase.displayName = 'PurchaseInvoicePrintBase';

export default PurchaseInvoicePrintBase;

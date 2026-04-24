import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { chartDateTime } from '../../../utils/utils-functions/formatDate';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';

type Props = {
  data: any; // sales.data
  rowsPerPage?: number;
  fontSize?: number;
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
  if (!warranty || typeof warranty !== 'object') return '';

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

const ElectronicsSalesInvoicePrint = React.forwardRef<HTMLDivElement, Props>(({ data, rowsPerPage = 10, fontSize = 10 }, ref) => {

  const settings = useSelector((state: any) => state.settings);

  console.log('====================================');
  console.log("show_description_in_invoice", settings?.data?.branch?.show_description_in_invoice);
  console.log("show_category_in_invoice", settings?.data?.branch?.show_category_in_invoice);
  console.log('====================================');

  if (!data?.sales_master) {
    return <div ref={ref}>No invoice data</div>;
  }
  const details = data.sales_master.details || [];
  if (!details.length) {
    return (
      <div ref={ref} className="print-root">
        <PadPrinting />
        <div className="text-center mt-20 text-sm">
          No item found in this invoice
        </div>
      </div>
    );
  }
  const pages = chunkRows(details, rowsPerPage);

  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );
  const received = trxDetails
    .find((d: any) => d.coa4_id === 17);
  const receivedAmount = received ? Number(received.debit) : 0;

  const discount = trxDetails.find((d: any) => d.coa4_id === 23);
  const discountAmount = discount ? Number(discount.debit) : 0;
  const tds = trxDetails.find((d: any) => d.coa4_id === 41);
  const tdsName = tds ? tds.coa_l4?.name : '';
  const tdsAmount = tds ? Number(tds.credit) : 0;

  const serviceCharge = trxDetails.find((d: any) => d.coa4_id === 42);
  const serviceChargeName = serviceCharge ? serviceCharge.coa_l4?.name : '';
  const serviceChargeAmount = serviceCharge ? Number(serviceCharge.credit) : 0;
  const carryingOutward = trxDetails.find((d: any) => d.coa4_id === 198);
  const carryingOutwardName = carryingOutward ? carryingOutward.coa_l4?.name : '';
  const carryingOutwardAmount = carryingOutward ? Number(carryingOutward.credit) : 0;

  const customerId = Number(data?.sales_master?.customer_id);
  const customerDetail =
    trxDetails.find(
      (d: any) =>
        Number(d?.coa4_id) === customerId ||
        Number(d?.coa_l4?.id) === customerId,
    ) ||
    trxDetails.find((d: any) => d?.coa_l4?.cust_party_infos);
  const customerInfo = customerDetail?.coa_l4?.cust_party_infos || {};
  const customerName =
    data?.sales_master?.name ||
    customerInfo?.name ||
    customerDetail?.coa_l4?.name ||
    '-';
  const customerMobile =
    data?.sales_master?.mobile ||
    customerInfo?.mobile ||
    '';
  const customerAddress =
    data?.sales_master?.address ||
    customerInfo?.address ||
    customerInfo?.manual_address ||
    '';

  const fs = fontSize;

  const grandTotal = details.reduce(
    (sum: number, d: any) =>
      sum + Number(d.quantity) * Number(d.sales_price),
    0,
  );


  return (
    <div ref={ref} className="print-root text-gray-900">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 4mm 8mm 8mm;
          }

          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          .print-root { padding: 0 !important; }

          .print-page {
            padding: 5mm 8mm !important;
            min-height: calc(297mm - 5mm - 4mm - 8mm - 8mm);
            display: flex;
            flex-direction: column;
          }

          .page-break { page-break-after: always; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      {pages.map((pageRows, pageIndex) => (
        <div key={pageIndex} className="print-page">
          {/* ================= PAD HEADER ================= */}
          <PadPrinting />

          {/* ================= INVOICE HEADER ================= */}
          <div className="mt-3 mb-3">
            <h1
              className="text-center font-bold leading-tight"
              style={{ fontSize: fs + 4 }}
            >
              SALES INVOICE
            </h1>

            <div
              className="grid grid-cols-3 gap-2 text-xs mt-2"
              style={{ lineHeight: 1.25 }}
            >
              <div className="space-y-1 col-span-2">
                <div style={{ fontSize: fs }}>
                  <span className="font-semibold">Name:</span>{' '}
                  {customerName}
                </div>

                {customerMobile.length > 5 && (
                  <div style={{ fontSize: fs }}>
                    Mobile: {String(customerMobile).replace(/^(\d{5})(\d+)/, '$1-$2')}
                  </div>
                )}

                {customerAddress && (
                  <div style={{ fontSize: fs }}>
                    Address: {customerAddress}
                  </div>
                )}
                
                {data?.sales_master?.sales_order?.order_number && (
                  <div style={{ fontSize: fs }}>
                    Order Number: {data.sales_master.sales_order.order_number}
                  </div>
                )}
                {data?.sales_master?.sales_order?.delivery_location && (
                  <div style={{ fontSize: fs }}>
                    Delivery Location: {data.sales_master.sales_order.delivery_location}
                  </div>
                )}
                
              </div>

              <div className="text-right space-y-1 col-span-1">
                <div style={{ fontSize: fs }}>
                  <span className="font-semibold">Invoice No:</span>{' '}
                  {data.vr_no}
                </div>

                <div style={{ fontSize: fs }}>
                  <span className="font-semibold">Date:</span>{' '}
                  {dayjs(data.vr_date).format('DD/MM/YYYY')}
                </div>
              </div>
            </div>
          </div>

          {/* ================= PRODUCT TABLE ================= */}
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-black px-2 py-1 w-10 text-center" style={{ fontSize: fs }}>
                  #
                </th>
                <th className="border border-black px-2 py-1 text-left" style={{ fontSize: fs }}>
                  Product
                </th>
                <th className="border border-black px-2 py-1 w-20 text-center" style={{ fontSize: fs }}>
                  Qty
                </th>
                <th className="border border-black px-2 py-1 w-24 text-right" style={{ fontSize: fs }}>
                  Rate
                </th>
                <th className="border border-black px-2 py-1 w-28 text-right" style={{ fontSize: fs }}>
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {pageRows.map((row: any, idx: number) => {
                const qty = Number(row.quantity);
                const rate = Number(row.sales_price);
                const total = qty * rate;
                const warrantyInfo = getWarrantyInfo(row.product?.warranty_days);

                return (
                  <tr key={idx} className="avoid-break">
                    <td className="border border-black px-1 text-center" style={{ fontSize: fs }}>
                      {pageIndex * rowsPerPage + idx + 1}
                    </td>

                    <td
                      className="border border-black px-1"
                      style={{ fontSize: fs, lineHeight: 1.25 }}
                    >

                      {/* {row.serial_no && ( */}
                      <div
                        className="text-black"
                        style={{ fontSize: fs - 1, lineHeight: 1.5 }}
                      >
                        {/* Category (optional) */}
                        {isEnabled(settings?.data?.branch?.show_category_in_invoice) && row.product?.category?.name && (
                          <span className='block'>{row.product.category.name}</span>
                        )}
                        {/* Brand + Product Name */}
                        <span>
                          {isEnabled(settings?.data?.branch?.show_brand_in_invoice) && row.product?.brand?.name && (
                            <span className=''>{row.product.brand.name} </span>
                          )}
                          {row.product?.name}
                        </span>

                         {isEnabled(settings?.data?.branch?.show_description_in_invoice) && row.product?.description && (
                          <span className='block italic'>({row.product.description})</span>
                        )}

                        {/* Serial */}
                        {row.serial_no && (
                          <span className='block'> <span className='font-semibold'>{ settings?.data?.branch?.device_identifier_text && `${settings.data.branch.device_identifier_text} `}</span> {row.serial_no}</span>
                        )}
                        {warrantyInfo && (
                          <span className='block'>
                            <span className='font-semibold'>{warrantyInfo.label}</span>{' '}
                            {warrantyInfo.value}
                          </span>
                        )}
                      </div>
                      {/* )} */}
                    </td>

                    <td className="border border-black px-1 text-center" style={{ fontSize: fs }}>
                      { thousandSeparator(qty) }
                    </td>

                    <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>
                      {thousandSeparator(rate)}
                    </td>

                    <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>
                      {thousandSeparator(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>



          {/* ================= TOTALS (LAST PAGE ONLY) ================= */}
          {pageIndex === pages.length - 1 && (
            <div className="mt-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {data?.sales_master?.vehicle_no && (
                    <div className="mt-2">
                      <span
                        className="inline-block border border-black px-2 py-1 font-semibold"
                        style={{ fontSize: fs }}
                      >
                        Vehicle No: <span className="uppercase">{ formatTransportationNumber(data?.sales_master?.vehicle_no)}</span>
                      </span>
                    </div>
                  )}
                </div>

                <table className="border-collapse">
                  <tbody>
                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>
                        Total Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32 font-semibold" style={{ fontSize: fs }}>
                        {thousandSeparator(grandTotal)}
                      </td>
                    </tr>

                    {tdsName && tdsAmount !== 0 && (
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                          {tdsName} Tk.
                        </td>
                        <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                          {thousandSeparator(tdsAmount)}
                        </td>
                      </tr>
                    )}
                    {serviceChargeName && serviceChargeAmount !== 0 && (
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                          {serviceChargeName} Tk.
                        </td>
                        <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                          {thousandSeparator(serviceChargeAmount)}
                        </td>
                      </tr>
                    )}
                    {carryingOutwardName && carryingOutwardAmount !== 0 && (
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                          {carryingOutwardName} Tk.
                        </td>
                        <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                          {thousandSeparator(carryingOutwardAmount)}
                        </td>
                      </tr>
                    )}

                    {discountAmount !== 0 && (
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                          Discount Tk.
                        </td>
                        <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                          (-) {thousandSeparator(discountAmount)}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>
                        Net Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32 font-semibold" style={{ fontSize: fs }}>
                        {thousandSeparator((grandTotal + tdsAmount + serviceChargeAmount + carryingOutwardAmount - discountAmount))}
                      </td>
                    </tr>

                    {receivedAmount !== 0 && (
                      <tr>
                        <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                          Received Tk.
                        </td>
                        <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                          {thousandSeparator(receivedAmount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="border-black px-1 py-1 text-right font-bold" style={{ fontSize: fs }}>
                        Due Tk.
                      </td>
                      <td className="border-black px-1 py-1 text-right w-32 font-bold" style={{ fontSize: fs }}>
                        {thousandSeparator(
                          (grandTotal + tdsAmount + serviceChargeAmount + carryingOutwardAmount) - discountAmount - receivedAmount)}
                      </td>
                    </tr>
                  </tbody>


                </table>
              </div>

              {settings?.data?.branch?.show_spelling_of_money == '1' && (
                <div
                  className="w-full pt-4 text-left leading-snug"
                  style={{ fontSize: fs - 0.25, textAlign: 'left' }}
                >
                  <span className="tracking-wide">
                    { data?.inword}
                  </span>
                </div>
              )}


              <div className="flex items-end justify-end pt-8 pr-8">
                <div className="text-left" style={{ fontSize: fs }}>
                  <div className="border-t border-black min-w-[140px] text-center">
                    {data?.user?.name}
                  </div>
                  <div className="text-center leading-none mt-0.5">
                    {chartDateTime(data?.created_at)}
                  </div>
                </div>
              </div>

            </div>
          )}

          {settings?.data?.branch?.show_instalment_list == '1' && pageIndex === pages.length - 1 &&
            data?.installments && data.installments.length > 0 && (
              <div className="ml-10 w-[260px] overflow-hidden avoid-break">
                <h2 className='block w-full text-center text-xs'>Installment Details</h2>
                <div
                  className="grid grid-cols-[36px_96px_96px] border-b-[0.5px] border-black px-3 py-1 font-semibold"
                  style={{ fontSize: fs - 0.5 }}
                >
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

          {/* ================= FOOTER ================= */}
          <div
            className="mt-auto text-xs text-right"
            style={{ lineHeight: 1.2 }}
          >
            Page {pageIndex + 1} of {pages.length}
          </div>

          {pageIndex !== pages.length - 1 && (
            <div className="page-break" />
          )}
        </div>
      ))}

      {/* <div className="mt-2 text-xs text-gray-700">
        * This invoice is system generated.
      </div> */}
    </div>
  );
});

ElectronicsSalesInvoicePrint.displayName =
  'ElectronicsSalesInvoicePrint';

export default ElectronicsSalesInvoicePrint;

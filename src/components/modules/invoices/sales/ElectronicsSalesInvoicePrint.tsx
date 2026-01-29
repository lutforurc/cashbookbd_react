import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';

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

const ElectronicsSalesInvoicePrint = React.forwardRef<
  HTMLDivElement,
  Props
>(({ data, rowsPerPage = 10, fontSize = 10 }, ref) => {
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

  const transactions = data?.acc_transaction_master || [];
  const received = transactions
    .flatMap((t: any) => t.acc_transaction_details)
    .find((d: any) => d.coa4_id === 17);
  const receivedAmount = received ? Number(received.debit) : 0;

  const discount = transactions.flatMap((t: any) => t.acc_transaction_details).find((d: any) => d.coa4_id === 23);
  const discountAmount = discount ? Number(discount.debit) : 0;
  const tds = transactions.flatMap((t: any) => t.acc_transaction_details).find((d: any) => d.coa4_id === 41);
  const tdsName = tds ? tds.coa_l4?.name : '';
  const tdsAmount = tds ? Number(tds.credit) : 0;

  const serviceCharge = transactions.flatMap((t: any) => t.acc_transaction_details).find((d: any) => d.coa4_id === 42);
  const serviceChargeName = serviceCharge ? serviceCharge.coa_l4?.name : '';
  const serviceChargeAmount = serviceCharge ? Number(serviceCharge.credit) : 0;

  const customer =
    data?.acc_transaction_master?.[0]?.acc_transaction_details?.find(
      (d: any) => d.coa_l4?.cust_party_infos,
    )?.coa_l4?.cust_party_infos;

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
                  {customer?.name}
                </div>

                {customer?.mobile && (
                  <div style={{ fontSize: fs }}>
                    Mobile: {customer.mobile.replace(/^(\d{5})(\d+)/, "$1-$2")}
                  </div>
                )}

                {(customer?.address || customer?.manual_address) && (
                  <div style={{ fontSize: fs }}>
                    Address:{' '}
                    {customer.address ?? customer.manual_address}
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

                return (
                  <tr key={idx} className="avoid-break">
                    <td className="border border-black px-1 text-center" style={{ fontSize: fs }}>
                      {pageIndex * rowsPerPage + idx + 1}
                    </td>

                    <td
                      className="border border-black px-1"
                      style={{ fontSize: fs, lineHeight: 1.25 }}
                    >

                      {row.serial_no && (
                        <div
                          className="text-black"
                          style={{ fontSize: fs - 1, lineHeight: 1.5 }}
                        >
                          {/* Category (optional) */}
                          {row.product?.category?.name && (
                            <span>{row.product.category.name}</span>
                          )}

                          {row.product?.category?.name && <br />}

                          {/* Brand + Product Name */}
                          <span>
                            {row.product?.brand?.name && (
                              <>{row.product.brand.name} </>
                            )}
                            {row.product?.name}
                          </span>

                          <br />

                          {/* Serial */}
                          <span>SN: {row.serial_no}</span>
                        </div>
                      )}
                    </td>

                    <td className="border border-black px-1 text-center" style={{ fontSize: fs }}>
                      {qty}
                    </td>

                    <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>
                      {thousandSeparator(rate, 0)}
                    </td>

                    <td className="border border-black px-1 text-right" style={{ fontSize: fs }}>
                      {thousandSeparator(total, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ================= TOTALS (LAST PAGE ONLY) ================= */}
          {pageIndex === pages.length - 1 && (
            <div className="mt-3 flex justify-end">
              <table className="border-collapse">
                <tbody>
                  <tr>
                    <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>
                      Total Tk.
                    </td>
                    <td className="border-y border-black px-1 py-1 text-right w-32 font-semibold" style={{ fontSize: fs }}>
                      {thousandSeparator(grandTotal, 0)}
                    </td>
                  </tr>

                  {tdsName && tdsAmount !== 0 && (
                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                        {tdsName} Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                        {thousandSeparator(tdsAmount, 0)}
                      </td>
                    </tr>
                  )}
                  {serviceChargeName && serviceChargeAmount !== 0 && (
                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                        {serviceChargeName} Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                        {thousandSeparator(serviceChargeAmount, 0)}
                      </td>
                    </tr>
                  )}

                  {discountAmount !== 0 && (
                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                        Discount Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                        (-) {thousandSeparator(discountAmount, 0)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="border-y border-black px-1 py-1 text-right font-semibold" style={{ fontSize: fs }}>
                      Net Tk.
                    </td>
                    <td className="border-y border-black px-1 py-1 text-right w-32 font-semibold" style={{ fontSize: fs }}>
                      {thousandSeparator((grandTotal + tdsAmount + serviceChargeAmount - discountAmount), 0)}
                    </td>
                  </tr>



                  {receivedAmount !== 0 && (
                    <tr>
                      <td className="border-y border-black px-1 py-1 text-right" style={{ fontSize: fs }}>
                        Received Tk.
                      </td>
                      <td className="border-y border-black px-1 py-1 text-right w-32" style={{ fontSize: fs }}>
                        {thousandSeparator(receivedAmount, 0)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="border-black px-1 py-1 text-right font-bold" style={{ fontSize: fs }}>
                      Due Tk.
                    </td>
                    <td className="border-black px-1 py-1 text-right w-32 font-bold" style={{ fontSize: fs }}>
                      {thousandSeparator(
                        (grandTotal + tdsAmount + serviceChargeAmount) - discountAmount - receivedAmount,
                        0,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
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

      <div className="mt-2 text-xs text-gray-700">
        * This invoice is system generated.
      </div>
    </div>
  );
});

ElectronicsSalesInvoicePrint.displayName =
  'ElectronicsSalesInvoicePrint';

export default ElectronicsSalesInvoicePrint;

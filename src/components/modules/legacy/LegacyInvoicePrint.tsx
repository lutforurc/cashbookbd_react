import React, { forwardRef } from "react";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import PrintStyles from "../../utils/utils-functions/PrintStyles";
import PrintFooter from "../../utils/utils-functions/PrintFooter";

/**
 * A bill from the old Old ERP, redrawn from the archived JSON.
 *
 * This is a reproduction of somebody else's document, so it deliberately does
 * NOT follow the modern bill's layout: same headings, same order, same
 * "In Word" line, same six-line amount block at the foot. A customer who kept
 * the old bill should recognise this one. The pad comes from the archive, not
 * from our branch settings, because the sheet has to match the paper it
 * replaces -- not the pad we use for new bills today.
 *
 * Nothing here posts to the ledger. See the plan:
 * ~/.claude/plans/playful-plotting-dream.md
 */

export type LegacyInvoiceItem = {
  sl: number;
  product_code?: string | null;
  product_name?: string | null;
  qty_raw?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount?: number | null;
};

export type LegacyInvoice = {
  pad?: { name?: string; address?: string; phone?: string } | null;
  legacy_no?: string | number | null;
  invoice_date_raw?: string | null;
  invoice_time?: string | null;
  challan?: string | null;
  cash_memo?: string | null;
  sold_by?: string | null;
  party?: { name?: string; address?: string; phone?: string } | null;
  items?: LegacyInvoiceItem[];
  totals?: Record<string, number | null> | null;
  in_word?: string | null;
  notice?: string[];
};

type Props = {
  invoice: LegacyInvoice;
  title?: string; // default "BILL INVOICE"
  fontSize?: number; // default 11
};

/** `-2,640.00` — the old sheet keeps the sign and always shows two decimals. */
const money = (v: number | null | undefined) =>
  v == null || Number.isNaN(Number(v))
    ? ""
    : Number(v).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/**
 * One line of the amount block -- drawn only where the archive has the
 * figure. A second old system may have no "Previous Advanced" at all, and a
 * label over an empty space would be a reprint of a sheet that never existed.
 */
const LabelValue = ({
  label,
  value,
  fs,
}: {
  label: string;
  value?: number | null;
  fs: number;
}) =>
  value == null ? null : (
    <div className="flex justify-between" style={{ fontSize: fs }}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );

/** "Invoice: 14611, Challan: C-8074" -- each part only where it has a value. */
const joinPresent = (parts: Array<[string, unknown]>) =>
  parts
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => `${label} ${v}`)
    .join(", ");

const LegacyInvoicePrint = forwardRef<HTMLDivElement, Props>(
  ({ invoice, title = "BILL INVOICE", fontSize = 11 }, ref) => {
    const items = invoice?.items ?? [];
    const totals = invoice?.totals ?? {};
    const fs = fontSize;

    const cell = (extra = "") =>
      `border border-gray-900 dark:border-gray-500 print:border-gray-900 px-2 py-1 ${extra}`.trim();

    return (
      <div ref={ref} className="p-8 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 print:bg-white print:text-gray-900 print-root">
        {/* On screen the sheet follows the theme like every other screen (the
            app's dark background used to swallow its black text); on paper it
            is always white with black rules -- the .dark class is still on
            <html> when the print dialog opens, so print: has to say so. */}
        <PrintStyles />

        <div className="print-page">
          {/* ---- pad: the old system's own letterhead, or nothing -- never
                  another client's ---- */}
          {invoice?.pad?.name ? (
            <div className="text-center leading-tight">
              <div className="font-bold" style={{ fontSize: fs + 5 }}>
                {invoice.pad.name}
              </div>
              {invoice.pad.address ? (
                <div style={{ fontSize: fs - 1 }}>{invoice.pad.address}</div>
              ) : null}
              {invoice.pad.phone ? (
                <div style={{ fontSize: fs - 1 }}>Mobile: {invoice.pad.phone}</div>
              ) : null}
            </div>
          ) : null}

          {/* ---- title ---- */}
          <div
            className="mt-3 border border-gray-900 dark:border-gray-500 print:border-gray-900 py-1 text-center font-bold"
            style={{ fontSize: fs + 1 }}
          >
            {title}
          </div>

          {/* ---- customer | invoice meta ---- */}
          <div className="grid grid-cols-2 border-x border-b border-gray-900 dark:border-gray-500 print:border-gray-900">
            <div className="border-r border-gray-900 dark:border-gray-500 print:border-gray-900 p-2 leading-snug">
              <div style={{ fontSize: fs }} className="font-bold">
                Customer Name: {invoice?.party?.name}
              </div>
              <div style={{ fontSize: fs }}>
                Address: {invoice?.party?.address}
              </div>
              <div style={{ fontSize: fs }}>Phone: {invoice?.party?.phone}</div>
            </div>

            <div className="p-2 leading-snug">
              <div style={{ fontSize: fs }} className="font-bold">
                {joinPresent([
                  ["Invoice:", invoice?.legacy_no],
                  ["Challan:", invoice?.challan],
                  ["Cash Memo:", invoice?.cash_memo],
                ])}
              </div>
              <div style={{ fontSize: fs }}>
                Date: {invoice?.invoice_date_raw}
                {invoice?.invoice_time ? `, ${invoice.invoice_time}` : ""}
              </div>
              {invoice?.sold_by ? (
                <div style={{ fontSize: fs }}>Sold: {invoice.sold_by}</div>
              ) : null}
            </div>
          </div>

          {/* ---- items ---- */}
          <table
            className="mt-3 w-full table-fixed border-collapse"
            style={{ fontSize: fs }}
          >
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 print:bg-gray-200 font-bold">
                <th className={cell("w-10 text-center")}>SL</th>
                <th className={cell("w-24 text-left")}>Code</th>
                <th className={cell("text-left")}>Particulars</th>
                <th className={cell("w-24 text-center")}>Qty</th>
                <th className={cell("w-20 text-right")}>Price</th>
                <th className={cell("w-24 text-right")}>Amount</th>
              </tr>
            </thead>

            <tbody>
              {items.length ? (
                items.map((it, i) => (
                  <tr key={it?.sl ?? i} className="avoid-break">
                    <td className={cell("text-center")}>{it?.sl ?? i + 1}</td>
                    <td className={cell("text-left")}>{it?.product_code}</td>
                    <td className={cell("text-left")}>{it?.product_name}</td>
                    {/* the old sheet prints "310/PCS" -- quantity and unit in
                        one cell, so it is drawn the same way here */}
                    <td className={cell("text-center")}>
                      {it?.qty_raw ?? it?.quantity}
                    </td>
                    <td className={cell("text-right")}>{thousandSeparator(it?.rate ?? 0)}</td>
                    <td className={cell("text-right")}>{thousandSeparator(it?.amount ?? 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={cell("py-6 text-center")}>
                    No item found
                  </td>
                </tr>
              )}

              <tr className="font-bold">
                <td className={cell("text-center")} />
                <td className={cell("text-center")} colSpan={2}>
                  Total
                </td>
                <td className={cell("text-center")}>
                  {thousandSeparator(totals?.quantity??0)}
                </td>
                <td className={cell("text-right")} />
                <td className={cell("text-right")}>
                  {thousandSeparator(totals?.price_amount ?? 0)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ---- in word ---- */}
          {invoice?.in_word ? (
            <div
              className="mt-3 text-center font-bold"
              style={{ fontSize: fs }}
            >
              In Word: {invoice.in_word}
            </div>
          ) : null}

          {/* ---- amounts: each line only where the archive has it ---- */}
          <div className="mt-3 space-y-0.5">
            <LabelValue label="Price Amount:" value={totals?.price_amount} fs={fs} />
            <LabelValue label="Discount Amount:" value={totals?.discount} fs={fs} />
            <LabelValue
              label="Previous Advanced"
              value={totals?.previous_advanced}
              fs={fs}
            />
            {totals?.final_amount != null ? (
              <div className="flex justify-between border-y border-gray-900 dark:border-gray-500 print:border-gray-900 py-0.5 font-bold" style={{ fontSize: fs }}>
                <span>Final Amount</span>
                <span>{money(totals.final_amount)}</span>
              </div>
            ) : null}
            <LabelValue label="Paid Amount:" value={totals?.paid} fs={fs} />
            <LabelValue
              label="Advanced Amount"
              value={totals?.advanced_amount}
              fs={fs}
            />
          </div>

          {/* ---- notice + signatures ---- */}
          <div className="mt-4" style={{ fontSize: fs - 2 }}>
            {(invoice?.notice ?? []).map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>

          <div className="mt-10 flex justify-between" style={{ fontSize: fs }}>
            <span>Customer Signature &amp; Seal</span>
            <span>Signature</span>
          </div>

          <PrintFooter fontSize={fs} hidePrintedAt />
        </div>
      </div>
    );
  }
);

LegacyInvoicePrint.displayName = "LegacyInvoicePrint";
export default LegacyInvoicePrint;

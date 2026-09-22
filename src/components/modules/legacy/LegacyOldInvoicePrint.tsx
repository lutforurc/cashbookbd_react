import { forwardRef } from "react";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import PrintStyles from "../../utils/utils-functions/PrintStyles";
import PrintFooter from "../../utils/utils-functions/PrintFooter";

/**
 * A bill from the client's OLDER ERP install, redrawn from the archived JSON.
 *
 * A twin of LegacyInvoicePrint rather than a branch inside it. The archive
 * that one draws is in a client's hands already, and the owner asked for the
 * two old systems to be kept wholly apart (2026-09-22); a shared component
 * would make every future correction to this sheet a change to theirs.
 *
 * ⚠️ THIS BUILD'S SHEET IS NOT THE NEWER BUILD'S, which is the whole reason
 * this file exists:
 *   - seven item columns, with a per-line Discount, headed "Description"
 *   - Qty reads "100 PCS", a space, not "310/PCS"
 *   - the amount block has nine lines, not six, and two of them read
 *     "Previous Due Amount" and "Due amount" where the newer sheet reads
 *     "Previous Advanced" and "Advanced Amount" -- the same money with the
 *     sign the other way round
 *
 * ⚠️ THE AMOUNT BLOCK IS PRINTED FROM `footer`, LABEL FOR LABEL, exactly as
 * the old system wrote it. It is not rebuilt out of named fields. A customer
 * holding the original should be able to lay the two side by side, and the
 * only way to guarantee a label means what it says is to print the label the
 * old system printed next to the figure it printed beside it.
 *
 * Nothing here posts to the ledger.
 */

export type LegacyOldInvoiceItem = {
  sl: number;
  product_code?: string | null;
  product_name?: string | null;
  qty_raw?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount?: number | null;
};

export type LegacyOldInvoice = {
  pad?: { name?: string; address?: string; phone?: string } | null;
  legacy_no?: string | number | null;
  bill_no_printed?: string | null;
  invoice_date_raw?: string | null;
  invoice_time?: string | null;
  challan?: string | null;
  cash_memo?: string | null;
  sold_by?: string | null;
  party?: {
    name?: string;
    address?: string;
    phone?: string;
    details?: string | null;
  } | null;
  items?: LegacyOldInvoiceItem[];
  totals?: Record<string, number | null> | null;
  /** The sheet's own amount block, in the order and wording it was printed. */
  footer?: Array<{ label: string; value: string }>;
  in_word?: string | null;
  notice?: string[];
};

type Props = {
  invoice: LegacyOldInvoice;
  title?: string; // default "BILL INVOICE"
  fontSize?: number; // default 11
};

/** "Bill No: KBT-22126, Chalan No: C-9898" -- each part only where it has one. */
const joinPresent = (parts: Array<[string, unknown]>) =>
  parts
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => `${label} ${v}`)
    .join(", ");

const LegacyOldInvoicePrint = forwardRef<HTMLDivElement, Props>(
  ({ invoice, title = "BILL INVOICE", fontSize = 11 }, ref) => {
    const items = invoice?.items ?? [];
    const totals = invoice?.totals ?? {};
    const footer = invoice?.footer ?? [];
    const fs = fontSize;

    const cell = (extra = "") =>
      `border border-gray-900 dark:border-gray-500 print:border-gray-900 px-2 py-1 ${extra}`.trim();

    // The last line of the old block is the one the customer looks at.
    const lastLabel = footer.length ? footer[footer.length - 1].label : "";

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 print:bg-white print:text-gray-900 print-root"
      >
        <PrintStyles />

        <div className="print-page">
          {/* ---- pad: this old system's own letterhead, never another's ---- */}
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

          {/* ---- customer | bill meta ---- */}
          <div className="grid grid-cols-2 border-x border-b border-gray-900 dark:border-gray-500 print:border-gray-900">
            <div className="border-r border-gray-900 dark:border-gray-500 print:border-gray-900 p-2 leading-snug">
              {/* The old sheet ran name, address and phone together in one
                  cell, so that cell is printed as it stood. The split fields
                  are the fallback, off the party's ledger header. */}
              {invoice?.party?.details ? (
                <div style={{ fontSize: fs }} className="font-bold">
                  Customer Details: {invoice.party.details}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: fs }} className="font-bold">
                    Customer Name: {invoice?.party?.name}
                  </div>
                  <div style={{ fontSize: fs }}>
                    Address: {invoice?.party?.address}
                  </div>
                  <div style={{ fontSize: fs }}>
                    Phone: {invoice?.party?.phone}
                  </div>
                </>
              )}
            </div>

            <div className="p-2 leading-snug">
              <div style={{ fontSize: fs }} className="font-bold">
                {joinPresent([
                  ["Bill No:", invoice?.bill_no_printed ?? invoice?.legacy_no],
                  ["Chalan No:", invoice?.challan],
                  ["Cash Memo:", invoice?.cash_memo],
                ])}
              </div>
              <div style={{ fontSize: fs }}>
                Date: {invoice?.invoice_date_raw}
                {invoice?.invoice_time ? `, ${invoice.invoice_time}` : ""}
              </div>
              {invoice?.sold_by ? (
                <div style={{ fontSize: fs }}>Sold by: {invoice.sold_by}</div>
              ) : null}
            </div>
          </div>

          {/* ---- items: seven columns, the way this build printed them ---- */}
          <table
            className="mt-3 w-full table-fixed border-collapse"
            style={{ fontSize: fs }}
          >
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 print:bg-gray-200 font-bold">
                <th className={cell("w-10 text-center")}>SL</th>
                <th className={cell("w-24 text-left")}>Code</th>
                <th className={cell("text-left")}>Description</th>
                <th className={cell("w-24 text-center")}>Qty</th>
                <th className={cell("w-20 text-right")}>Price</th>
                <th className={cell("w-20 text-right")}>Discount</th>
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
                    {/* "100 PCS" -- count and unit in one cell, as printed */}
                    <td className={cell("text-center")}>
                      {it?.qty_raw ?? it?.quantity}
                    </td>
                    <td className={cell("text-right")}>
                      {thousandSeparator(it?.rate ?? 0)}
                    </td>
                    <td className={cell("text-right")}>
                      {thousandSeparator((it as any)?.discount ?? 0)}
                    </td>
                    <td className={cell("text-right")}>
                      {thousandSeparator(it?.amount ?? 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={cell("py-6 text-center")}>
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
                  {thousandSeparator(totals?.quantity ?? 0)}
                </td>
                <td className={cell("text-right")} colSpan={2} />
                <td className={cell("text-right")}>
                  {thousandSeparator(totals?.price_amount ?? 0)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ---- in word ---- */}
          {invoice?.in_word ? (
            <div className="mt-3 text-center font-bold" style={{ fontSize: fs }}>
              In Word: {invoice.in_word}
            </div>
          ) : null}

          {/* ---- the old sheet's amount block, label for label ---- */}
          <div className="mt-3 space-y-0.5">
            {footer.map((row, i) => {
              // Final Amount is ruled off on the original, and the closing
              // line is what the customer reads first.
              const strong =
                /final amount/i.test(row.label) || row.label === lastLabel;

              return (
                <div
                  key={`${row.label}-${i}`}
                  className={
                    strong
                      ? "flex justify-between border-y border-gray-900 dark:border-gray-500 print:border-gray-900 py-0.5 font-bold"
                      : "flex justify-between"
                  }
                  style={{ fontSize: fs }}
                >
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              );
            })}
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

LegacyOldInvoicePrint.displayName = "LegacyOldInvoicePrint";
export default LegacyOldInvoicePrint;

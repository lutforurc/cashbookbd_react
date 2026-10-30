import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { computeRow, missingFields, totalsOf, TilesPurchaseRow } from './tilesPurchaseCalc';
import { DEMO_INVOICES, DEMO_SUPPLIERS, TilesPurchaseInvoice } from './tilesPurchaseDemo';

/**
 * Tiles purchase report: the shop's Excel sheet, one table per purchase
 * invoice of the chosen supplier in the chosen month.
 *
 * ⚠️ DUMMY. It reads DEMO_INVOICES, not the API -- the company measurement and
 * the commission settings it needs do not exist yet. The layout and every
 * figure's arithmetic (tilesPurchaseCalc) are the real ones; only the data
 * source is to be swapped.
 *
 * An invoice with a line whose settings are missing is not shown at all:
 * the report stops for it and names the products and fields, rather than
 * printing a sheet with holes in it.
 */

/** Fixed decimals with the en-IN grouping; '-' for nothing, as the paper leaves it. */
const fmt = (n: number, decimals = 2) =>
  Number.isFinite(n) && Math.abs(n) >= 0.5 * 10 ** -decimals
    ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : '-';

// The headings drawn are headerRowsFor()'s; `header` here names the column
// in the Table's show/hide menu.
const num = (key: keyof TilesPurchaseRow, header: string, decimals = 2, width = 'w-24') => ({
  key,
  header,
  cellClass: `${width} text-right whitespace-nowrap`,
  render: (row: TilesPurchaseRow) => fmt(row[key] as number, decimals),
});

const columns = [
  { key: 'sn', header: 'SN', cellClass: 'w-10 text-center', render: (_: any, i: number) => i + 1 },
  { key: 'code', header: 'Code', cellClass: 'w-44 whitespace-nowrap' },
  { key: 'size', header: 'Size', cellClass: 'w-16 whitespace-nowrap' },
  num('box', 'Box', 2, 'w-16'),
  num('companyMeasurement', 'Company Measurement', 4),
  num('sft', 'SFT'),
  num('rate', 'Rate', 2, 'w-20'),
  num('withoutMeasurement', 'Without Measurement'),
  num('monthly', 'Monthly SFT', 2, 'w-16'),
  num('monthlyTotal', 'Monthly Total'),
  num('broken', 'Broken SFT', 4, 'w-20'),
  num('brokenTotal', 'Broken Total'),
  num('quarterly', 'Quarterly SFT', 2, 'w-16'),
  num('quarterlyTotal', 'Quarterly Total'),
  num('offer', 'Offer SFT', 2, 'w-16'),
  num('offerTotal', 'Offer Total'),
  num('invoice', 'Invoice', 2, 'w-28'),
  num('actualPerSft', 'Actual Price/SFT'),
  num('actualPerPcs', 'Actual Price/pcs'),
  num('quantity', 'Quaty', 0, 'w-16'),
  num('total', 'Total', 2, 'w-28'),
];

const single = (label: string) => ({ label, rowSpan: 2, className: 'text-center align-middle' });
const group = (label: string) => ({ label, colSpan: 2, className: 'text-center' });
const sub = (label: string) => ({ label, className: 'text-center' });

const headerRowsFor = (invoice: TilesPurchaseInvoice) => {
  const date = dayjs(invoice.invoiceDate);

  return [
    [{ label: <div className="text-center text-base font-semibold normal-case">{invoice.supplier}</div>, colSpan: columns.length }],
    [
      {
        label: (
          <div className="flex justify-between font-normal normal-case">
            <span>Invoice No: {invoice.invoiceNo}</span>
            <span>Month: {date.format('MMM-YY')}</span>
            <span>Invoice Date: {date.format('DD-MM-YY')}</span>
          </div>
        ),
        colSpan: columns.length,
      },
    ],
    [
      single('SN'), single('Code'), single('Size'), single('Box'), single('Company Measurement'), single('SFT'),
      single('Rate'), single('Without Measurement'),
      group('Monthly'), group('Broken'), group('Quarterly'), group('Offer'),
      single('Invoice'), single('Actual Price/SFT'), single('Actual Price/pcs'), single('Quaty'), single('Total'),
    ],
    [sub('SFT'), sub('Total'), sub('SFT'), sub('Total'), sub('SFT'), sub('Total'), sub('SFT'), sub('Total')],
  ];
};

const footerRowsFor = (rows: TilesPurchaseRow[]) => {
  const t = totalsOf(rows);
  const cell = (n: number, decimals = 2) => ({ label: fmt(n, decimals), className: 'text-right font-semibold whitespace-nowrap' });
  const blank = { label: '' };

  return [[
    { label: 'Total', colSpan: 3, className: 'text-right font-semibold' },
    cell(t.box), blank, cell(t.sft), blank, blank,
    blank, cell(t.monthlyTotal), blank, cell(t.brokenTotal), blank, cell(t.quarterlyTotal), blank, cell(t.offerTotal),
    cell(t.invoice), blank, blank, cell(t.quantity, 0), cell(t.total),
  ]];
};

const TilesPurchaseReport = () => {
  const [supplierId, setSupplierId] = useState<string>(String(DEMO_SUPPLIERS[0].id));
  const [month, setMonth] = useState<string>('2026-10');
  const [applied, setApplied] = useState<{ supplierId: string; month: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const invoices = useMemo(() => {
    if (!applied) return [];
    const supplier = DEMO_SUPPLIERS.find((s) => String(s.id) === applied.supplierId);

    return DEMO_INVOICES.filter(
      (inv) => inv.supplier === supplier?.name && inv.invoiceDate.startsWith(applied.month)
    ).map((inv) => {
      const problems = inv.lines
        .map((line) => ({ code: line.code, missing: missingFields(line) }))
        .filter((p) => p.missing.length);

      return { invoice: inv, problems, rows: problems.length ? [] : inv.lines.map(computeRow) };
    });
  }, [applied]);

  const apply = () => {
    if (!supplierId || !month) {
      toast.info('Choose a supplier and a month first.');
      return;
    }
    setApplied({ supplierId, month });
  };

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Tiles Purchase Report' });

  return (
    <div>
      <HelmetTitle title="Tiles Purchase Report" />

      <div className="mb-3 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Demo data: invoice ACR-30401 with the company measurement and commissions taken from the Excel sheet. Not yet read from the database.
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Supplier</label>
            <Select
              className={`${FIELD_SELECT} w-full px-2 text-sm font-medium`}
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              {DEMO_SUPPLIERS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Month</label>
            <input
              type="month"
              className={`${FIELD_SELECT} w-full px-2 text-sm font-medium`}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-end gap-2 xl:ml-auto">
          <ButtonLoading onClick={apply} buttonLoading={false} label="Apply" icon={<FiCheckSquare />} className="px-6" />
          <ButtonLoading onClick={() => setApplied(null)} buttonLoading={false} label="Reset" icon={<FiRotateCcw />} className="px-4" />
          <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!invoices.length} />
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {applied && !invoices.length ? (
          <p className="text-sm text-slate-500">No purchase invoices from this supplier in {dayjs(`${applied.month}-01`).format('MMM YYYY')}.</p>
        ) : null}

        {invoices.map(({ invoice, problems, rows }) =>
          problems.length ? (
            <div key={invoice.mtmId} className="rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
              <div className="font-semibold">Invoice {invoice.invoiceNo} not shown: settings are missing.</div>
              <ul className="mt-1 list-disc pl-5">
                {problems.map((p) => (
                  <li key={p.code}>{p.code}: {p.missing.join(', ')}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={invoice.mtmId} className="break-after-page">
              <Table
                columns={columns as any}
                data={rows}
                headerRows={headerRowsFor(invoice) as any}
                footerRows={footerRowsFor(rows) as any}
                getRowKey={(row: any, i: number) => `${row.code}-${i}`}
                noDataMessage="No lines."
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TilesPurchaseReport;

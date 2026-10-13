import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { humanizeEnumText } from '../../../utils/hooks/humanizeEnumText';
import { FiArrowRight } from 'react-icons/fi';

type StockRow = {
  sl_number?: number | string;
  brand_id?: number | string;
  brand_name?: string;
  group_id?: number | string;
  group_name?: string;
  category_id?: number | string;
  cat_name?: string;
  product_name?: string;
  /** Absent on databases the product-code column has not reached. */
  code?: string;
  opening?: number;
  stock_in?: number;
  stock_out?: number;
  balance?: number;
  unit?: string;
};

type Props = {
  rows: StockRow[];
  startDate?: string;
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

type PrintRow =
  | { __type: 'BRAND_HEADER'; brand_name: string }
  | { __type: 'GROUP_HEADER'; brand_name: string; group_name: string }
  | { __type: 'CAT_HEADER'; brand_name: string; group_name: string; cat_name: string }
  | { __type: 'CAT_TOTAL'; brand_name: string; group_name: string; cat_name: string; opening: number; stock_in: number; stock_out: number; balance: number }
  | { __type: 'BRAND_TOTAL'; brand_name: string; opening: number; stock_in: number; stock_out: number; balance: number }
  | { __type: 'GRAND_TOTAL'; opening: number; stock_in: number; stock_out: number; balance: number }
  | ({ __type: 'ITEM' } & StockRow);

/**
 * A heading's path on the paper, drawn as `A → B → C`. ⚠️ Empty parts are
 * dropped, so an item with no group prints `Brand → Category` rather than a
 * blank step where a group's name would be.
 */
const PrintPath = ({ parts }: { parts: any[] }) => {
  const shown = parts.map((part) => String(part ?? '').trim()).filter(Boolean);

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {shown.map((part, index) => (
        <React.Fragment key={`${index}-${part}`}>
          {index > 0 && <FiArrowRight className="shrink-0 text-gray-900" />}
          <span>{part}</span>
        </React.Fragment>
      ))}
    </span>
  );
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const StockBookPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, startDate, endDate, title = 'Stock Report', rowsPerPage = 10, fontSize }, ref) => {
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    const printableRows: PrintRow[] = useMemo(() => {
      const rowsArr: StockRow[] = Array.isArray(rows)
        ? rows.filter((row: any) => row?.__type !== 'GRAND_TOTAL')
        : [];

      const byName = (a: any, b: any) => String(a ?? '').localeCompare(String(b ?? ''));

      // ⚠️ Keyed by the server's ids, like the screen behind it, so two records
      // that share a name stay apart. The name is only the fallback.
      const hasId = (v: any) => v !== null && v !== undefined && String(v) !== '';
      const brandNameOf = (row: StockRow) =>
        String(row.brand_name || 'Unknown Brand').trim() || 'Unknown Brand';
      const brandKeyOf = (row: StockRow) =>
        hasId(row.brand_id) ? `b:${row.brand_id}` : `b:${brandNameOf(row)}`;
      // ⚠️ '' MEANS "NO GROUP", NOT A GROUP CALLED SOMETHING. The category then
      // sits straight under the brand instead of under a made-up band.
      const groupNameOf = (row: StockRow) => String(row.group_name || '').trim();
      const groupKeyOf = (row: StockRow) => {
        const label = groupNameOf(row);
        if (!label) return '';
        return hasId(row.group_id) ? `g:${row.group_id}` : `g:${label}`;
      };
      const catNameOf = (row: StockRow) =>
        String(row.cat_name || 'Uncategorized').trim() || 'Uncategorized';
      const catKeyOf = (row: StockRow) =>
        hasId(row.category_id) ? `c:${row.category_id}` : `c:${catNameOf(row)}`;

      // ✅ Sort by Brand -> Group -> Category -> Product
      const sorted = [...rowsArr].sort((a, b) => {
        const brand = byName(a.brand_name, b.brand_name);
        if (brand !== 0) return brand;

        const group = byName(a.group_name, b.group_name);
        if (group !== 0) return group;

        const cat = byName(a.cat_name, b.cat_name);
        if (cat !== 0) return cat;

        return byName(a.product_name, b.product_name);
      });

      // ✅ Group by Brand
      const brandMap = new Map<string, { name: string; items: StockRow[] }>();
      for (const r of sorted) {
        const brandKey = brandKeyOf(r);
        if (!brandMap.has(brandKey)) brandMap.set(brandKey, { name: brandNameOf(r), items: [] });
        brandMap.get(brandKey)!.items.push(r);
      }

      const out: PrintRow[] = [];

      // ✅ grand totals
      let gOpening = 0;
      let gIn = 0;
      let gOut = 0;
      let gBal = 0;

      // One category block: heading, its items, its subtotal -- and back comes
      // the block's own totals for the brand and grand total to fold in.
      const emitCategory = (brand: string, group: string, catName: string, items: StockRow[]) => {
        out.push({
          __type: 'CAT_HEADER',
          brand_name: brand,
          group_name: group,
          cat_name: catName,
        });

        // ✅ serial reset per category (inside its group, or its brand)
        let serial = 1;

        let tOpening = 0;
        let tIn = 0;
        let tOut = 0;
        let tBal = 0;

        for (const it of items) {
          const opening = toNum(it.opening);
          const stockIn = toNum(it.stock_in);
          const stockOut = toNum(it.stock_out);
          const balance = it.balance != null ? toNum(it.balance) : opening + stockIn - stockOut;

          tOpening += opening;
          tIn += stockIn;
          tOut += stockOut;
          tBal += balance;

          out.push({
            __type: 'ITEM',
            ...it,
            sl_number: serial++, // ✅ override
            balance,
          });
        }

        out.push({
          __type: 'CAT_TOTAL',
          brand_name: brand,
          group_name: group,
          cat_name: catName,
          opening: tOpening,
          stock_in: tIn,
          stock_out: tOut,
          balance: tBal,
        });

        return { opening: tOpening, stock_in: tIn, stock_out: tOut, balance: tBal };
      };

      // The categories of a set of rows, keyed by id where the server sent one.
      const categoriesOf = (items: StockRow[]) => {
        const map = new Map<string, { name: string; items: StockRow[] }>();
        for (const it of items) {
          const key = catKeyOf(it);
          if (!map.has(key)) map.set(key, { name: catNameOf(it), items: [] });
          map.get(key)!.items.push(it);
        }
        return map;
      };

      for (const brandEntry of brandMap.values()) {
        const brand = brandEntry.name;
        out.push({ __type: 'BRAND_HEADER', brand_name: brand });

        // Split the brand's rows into its named groups and the ones with none.
        const groupMap = new Map<string, { name: string; items: StockRow[] }>();
        const ungrouped: StockRow[] = [];
        for (const it of brandEntry.items) {
          const groupKey = groupKeyOf(it);
          if (!groupKey) {
            ungrouped.push(it);
            continue;
          }
          if (!groupMap.has(groupKey)) groupMap.set(groupKey, { name: groupNameOf(it), items: [] });
          groupMap.get(groupKey)!.items.push(it);
        }

        let bOpening = 0;
        let bIn = 0;
        let bOut = 0;
        let bBal = 0;

        const fold = (t: { opening: number; stock_in: number; stock_out: number; balance: number }) => {
          bOpening += t.opening;
          bIn += t.stock_in;
          bOut += t.stock_out;
          bBal += t.balance;
        };

        // ✅ Brand -> Group -> Category
        for (const groupEntry of groupMap.values()) {
          out.push({ __type: 'GROUP_HEADER', brand_name: brand, group_name: groupEntry.name });

          for (const catEntry of categoriesOf(groupEntry.items).values()) {
            fold(emitCategory(brand, groupEntry.name, catEntry.name, catEntry.items));
          }
        }

        // ✅ Brand -> Category, for the items that have no group.
        for (const catEntry of categoriesOf(ungrouped).values()) {
          fold(emitCategory(brand, '', catEntry.name, catEntry.items));
        }

        // ✅ brand total
        out.push({
          __type: 'BRAND_TOTAL',
          brand_name: brand,
          opening: bOpening,
          stock_in: bIn,
          stock_out: bOut,
          balance: bBal,
        });

        // ✅ add into grand total
        gOpening += bOpening;
        gIn += bIn;
        gOut += bOut;
        gBal += bBal;
      }

      out.push({
        __type: 'GRAND_TOTAL',
        opening: gOpening,
        stock_in: gIn,
        stock_out: gOut,
        balance: gBal,
      });

      return out;
    }, [rows]);

    const pages = useMemo(() => chunkRows(printableRows, rowsPerPage), [printableRows, rowsPerPage]);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span> {startDate || '-'} to {endDate || '-'}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-8 text-center">
                      #
                    </th>
                    {/* Plain, matching the screen: the product line below prints
                        its code and name only, the chain lives on the headings. */}
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-left">
                      Product Name
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-center">
                      Opening
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-center">
                      Stock In
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-center">
                      Stock Out
                    </th>
                    <th style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 w-26 text-center">
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => {
                      if (row.__type === 'BRAND_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold bg-gray-50">
                              {(row.brand_name)}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'GROUP_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-semibold bg-gray-50">
                              <PrintPath parts={[row.brand_name, row.group_name]} />
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'CAT_HEADER') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td colSpan={6} style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-semibold bg-white">
                              <PrintPath parts={[row.brand_name, row.group_name, row.cat_name]} />
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'CAT_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-semibold text-right">
                              Subtotal
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.opening))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_in))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.stock_out))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-semibold">
                              {thousandSeparator(Number(row.balance))}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'BRAND_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold text-right bg-gray-50">
                              Brand Total
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.opening))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_in))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_out))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.balance))}
                            </td>
                          </tr>
                        );
                      }

                      if (row.__type === 'GRAND_TOTAL') {
                        return (
                          <tr key={idx} className="avoid-break">
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center"></td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 font-bold text-right bg-gray-50">
                              Grand Total
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.opening))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_in))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.stock_out))}
                            </td>
                            <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right font-bold bg-gray-50">
                              {thousandSeparator(Number(row.balance))}
                            </td>
                          </tr>
                        );
                      }

                      // ✅ ITEM row
                      return (
                        <tr key={idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-center">
                            {row?.sl_number || ''}
                          </td>

                          <td
                            style={{ fontSize: fs, borderWidth: '0.5px', verticalAlign: 'middle' }}
                            className="border border-gray-500 px-2 py-0 align-middle"
                          >
                            <span style={{ fontSize: fs, borderWidth: '0.5px' }} className="text-xs text-gray-900 leading-tight">
                              {row.code ? `${row.code} - ` : ''}
                              {(row.product_name) || ''}
                            </span>
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.opening) > 0 ? (
                              <span style={{ fontSize: fs, borderWidth: '0.5px' }} className="text-sm">
                                {thousandSeparator(Number(row.opening))} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.stock_in) > 0 ? (
                              <span style={{ fontSize: fs, borderWidth: '0.5px' }} className="text-sm">
                                {thousandSeparator(Number(row.stock_in))} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.stock_out) > 0 ? (
                              <span style={{ fontSize: fs, borderWidth: '0.5px' }} className="text-sm">
                                {thousandSeparator(Number(row.stock_out))} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td style={{ fontSize: fs, borderWidth: '0.5px' }} className="border border-gray-500 px-2 py-0 text-right">
                            {Number(row?.balance) !== 0 ? (
                              <span className="text-sm">
                                {thousandSeparator(Number(row.balance))} {row.unit ? `(${row.unit})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-gray-500 px-3 py-6 text-center text-gray-900">
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PrintFooter page={pIdx + 1} total={pages.length} fontSize={fs} />

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

StockBookPrint.displayName = 'StockBookPrint';
export default StockBookPrint;

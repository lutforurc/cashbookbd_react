import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type RowType = {
    sl_number?: number;
    product_name?: string;
    cat_name?: string;
    unit?: string;
    quantity?: number;
};

type Props = {
    rows: RowType[];
    branchName?: string;
    reportType?: string;
    startDate?: string;
    endDate?: string;
    rowsPerPage?: number;
    fontSize?: number;
    title?: string;
};

/// ──────────────────────────────────
/// Group rows by Category
/// ──────────────────────────────────
const groupByCategory = (rows: RowType[]) => {
    const groups: Record<string, RowType[]> = {};
    rows.forEach((row) => {
        const key = row.cat_name || "Unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });
    return groups;
};

/// ──────────────────────────────────
/// Convert Grouped Rows Into Page-wise Chunks
/// ──────────────────────────────────
const paginateGroupedRows = (
    grouped: Record<string, RowType[]>,
    rowsPerPage: number
) => {
    const pages: any[] = [];
    let currentPage: any[] = [];
    let rowCounter = 0;

    for (const [category, items] of Object.entries(grouped)) {

        // Category header
        if (rowCounter >= rowsPerPage) {
            pages.push(currentPage);
            currentPage = [];
            rowCounter = 0;
        }
        currentPage.push({ type: "category", category });
        rowCounter++;

        // Actual items
        items.forEach((row) => {
            if (rowCounter >= rowsPerPage) {
                pages.push(currentPage);
                currentPage = [];
                rowCounter = 0;
            }
            currentPage.push({ type: "row", row });
            rowCounter++;
        });

        // Sub total row (with category included)
        const subtotal = items.reduce(
            (sum, row) => sum + (Number(row.quantity) || 0),
            0
        );

        if (rowCounter >= rowsPerPage) {
            pages.push(currentPage);
            currentPage = [];
            rowCounter = 0;
        }

        currentPage.push({ type: "subtotal", subtotal, category });
        rowCounter++;
    }

    if (currentPage.length > 0) pages.push(currentPage);

    return pages;
};


/// ──────────────────────────────────
/// COMPONENT
/// ──────────────────────────────────
const CatWiseInOutPrint = React.forwardRef<HTMLDivElement, Props>(
    (
        {
            rows,
            startDate,
            endDate,
            rowsPerPage = 25,
            fontSize = 10,
            title = "Category Wise In/Out Report",
        },
        ref
    ) => {
        const fs = fontSize;

        // Group rows
        const grouped = groupByCategory(rows);

        // break into pages
        const pages = paginateGroupedRows(grouped, rowsPerPage);

        // Grand total (EXCLUDING last row)
        const grandTotal = rows.reduce(
            (sum, r) => sum + (Number(r.quantity) || 0),
            0
        );

        return (
            <div ref={ref} className="p-8 text-gray-900 print-root">
                <PrintStyles />

                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} className="print-page">
                        <PadPrinting />

                        {/* HEADER */}
                        <div className="mb-4">
                            <h4 className="font-semibold text-center">{title}</h4>
                            <div className="text-center text-xs mt-1">
                                <strong>Date:</strong> {startDate || "-"} — {endDate || "-"}
                            </div>
                        </div>

                        {/* TABLE */}
                        <table className="w-full table-fixed border-collapse">
                            <thead className="">
                                <tr>
                                    <th
                                        className="border border-gray-900 px-2 py-2 text-center w-10"
                                        style={{ fontSize: fs }}
                                    >
                                        Sl
                                    </th>
                                    <th
                                        className="border border-gray-900 px-2 py-2 text-left"
                                        style={{ fontSize: fs }}
                                    >
                                        Product
                                    </th>
                                    <th
                                        className="border border-gray-900 px-2 py-2 text-right w-30"
                                        style={{ fontSize: fs }}
                                    >
                                        Quantity
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {page.map((item, i) => {
                                    // Category Row
                                    if (item.type === "category") {
                                        return (
                                            <tr key={i} className="">
                                                <td
                                                    colSpan={3}
                                                    className="border border-gray-900 px-2 py-1 font-semibold"
                                                    style={{ fontSize: fs }}
                                                >
                                                    Category: {item.category}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Actual Product Row
                                    if (item.type === "row") {
                                        const row = item.row;
                                        return (
                                            <tr key={i}>
                                                <td
                                                    className="border border-gray-900 px-2 py-1 text-center"
                                                    style={{ fontSize: fs }}
                                                >
                                                    {row.sl_number}
                                                </td>
                                                <td
                                                    className="border border-gray-900 px-2 py-1"
                                                    style={{ fontSize: fs }}
                                                >
                                                    {row.product_name}
                                                </td>
                                                <td
                                                    className="border border-gray-900 px-2 py-1 text-right"
                                                    style={{ fontSize: fs }}
                                                >
                                                    {thousandSeparator(row.quantity || 0, 0)}{" "}
                                                    {row.unit}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Sub-Total Row
                                    if (item.type === "subtotal") {
                                        return (
                                            <tr key={i} className="font-semibold">
                                                <td
                                                    colSpan={2}
                                                    className="border border-gray-900 px-2 py-1 text-right"
                                                    style={{ fontSize: fs }}
                                                >
                                                    {item.category} Total:
                                                </td>
                                                <td
                                                    className="border border-gray-900 px-2 py-1 text-right"
                                                    style={{ fontSize: fs }}
                                                >
                                                    {thousandSeparator(item.subtotal, 0)}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return null;
                                })}

                                {/* GRAND TOTAL only on last page */}
                                {pageIndex === pages.length - 1 && (
                                    <tr className="font-bold">
                                        <td
                                            colSpan={2}
                                            className="border border-gray-900 px-2 py-2 text-right"
                                            style={{ fontSize: fs }}
                                        >
                                            Grand Total:
                                        </td>
                                        <td
                                            className="border border-gray-900 px-2 py-2 text-right"
                                            style={{ fontSize: fs }}
                                        >
                                            {thousandSeparator(grandTotal, 0)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* PAGE FOOTER */}
                        <div className="text-right text-xs mt-2" style={{ fontSize: fs }}>
                            Page {pageIndex + 1} of {pages.length}
                        </div>

                        {pageIndex !== pages.length - 1 && <div className="page-break" />}
                    </div>
                ))}

                <div className="text-xs mt-1">* This document is system generated.</div>
            </div>
        );
    }
);

CatWiseInOutPrint.displayName = "CatWiseInOutPrint";
export default CatWiseInOutPrint;

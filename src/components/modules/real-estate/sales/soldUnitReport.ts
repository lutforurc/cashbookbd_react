import type React from "react";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import {
  SoldUnitCustomer,
  SoldUnitLine,
  SoldUnitRow,
  SoldUnitTotals,
} from "./types";

/**
 * An amount in whole taka. The paisa is dropped rather than rounded — a unit
 * priced at 2,50,000.80 reads as 2,50,000 — and dropped toward zero, so a
 * discount of -36,000.80 reads as -36,000 rather than being pushed out to
 * -36,001 and deepening a refund nobody gave.
 *
 * Kept in step with the allotment letter, which prints these same figures.
 */
export const wholeTaka = (value: any) => Math.trunc(Number(value ?? 0));

export const money = (value: any) => {
  const amount = wholeTaka(value);
  return amount ? thousandSeparator(amount) : "-";
};

/**
 * Report totals added up from the figures the report actually shows.
 *
 * The API totals the exact amounts and hands back one number, but every amount
 * on the page has had its paisa dropped first — so four parkings at 2,50,000.80
 * read as 10,00,000 down the column while the API's total reads 10,00,003.
 * Adding the same whole taka the reader can see keeps the column and its total
 * telling the same story.
 *
 * Counts come straight from the API; only money is re-added here.
 */
export const reportTotals = (
  customers: SoldUnitCustomer[],
  totals?: SoldUnitTotals
): SoldUnitTotals => {
  const summed = {
    unit_price_amount: 0,
    parking_amount: 0,
    total_amount: 0,
    received_amount: 0,
    due_amount: 0,
  };

  customers.forEach((customer) => {
    (customer.units ?? []).forEach((unit) => {
      summed.unit_price_amount += wholeTaka(unit.unit_price_amount);
      summed.parking_amount += wholeTaka(unit.parking_amount);
      summed.total_amount += wholeTaka(unit.total_amount);
      summed.received_amount += wholeTaka(unit.received_amount);
      summed.due_amount += wholeTaka(unit.due_amount);
    });
  });

  return {
    customer_count: totals?.customer_count ?? customers.length,
    unit_count: totals?.unit_count ?? 0,
    parking_count: totals?.parking_count ?? 0,
    ...summed,
  };
};

/**
 * Each customer block in the report is outlined in its own colour so a buyer's
 * units, parking and charge lines read as one group. Colours cycle by position.
 */
export const CUSTOMER_COLORS = [
  { border: "#2563eb", tint: "rgba(37, 99, 235, 0.10)" }, // blue
  { border: "#059669", tint: "rgba(5, 150, 105, 0.10)" }, // emerald
  { border: "#d97706", tint: "rgba(217, 119, 6, 0.10)" }, // amber
  { border: "#7c3aed", tint: "rgba(124, 58, 237, 0.10)" }, // violet
  { border: "#db2777", tint: "rgba(219, 39, 119, 0.10)" }, // pink
  { border: "#0891b2", tint: "rgba(8, 145, 178, 0.10)" }, // cyan
  { border: "#65a30d", tint: "rgba(101, 163, 13, 0.10)" }, // lime
  { border: "#e11d48", tint: "rgba(225, 29, 72, 0.10)" }, // rose
];

export const customerColor = (index: number) =>
  CUSTOMER_COLORS[index % CUSTOMER_COLORS.length];

/**
 * Charge lines of one sale. A sale saved without stored line items still renders
 * a single line built from its own unit/parking labels.
 */
export const saleLines = (unit: SoldUnitRow): SoldUnitLine[] =>
  unit.lines?.length
    ? unit.lines
    : [
        {
          type: unit.is_parking_only ? "PARKING" : "UNIT_PRICE",
          caption:
            [unit.is_parking_only ? unit.parking_no : unit.unit_no, unit.floor_name]
              .filter(Boolean)
              .join(", ") || "-",
          place: [unit.project_name, unit.building_name].filter(Boolean).join(", "),
          amount: unit.total_amount,
        },
      ];

type EdgeFlags = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

/** Colour only the edges of a cell that sit on the customer block's outline. */
export const edgeStyle = (
  color: string,
  { top, bottom, left, right }: EdgeFlags
): React.CSSProperties => ({
  ...(top ? { borderTop: `2px solid ${color}` } : {}),
  ...(bottom ? { borderBottom: `2px solid ${color}` } : {}),
  ...(left ? { borderLeft: `4px solid ${color}` } : {}),
  ...(right ? { borderRight: `2px solid ${color}` } : {}),
});

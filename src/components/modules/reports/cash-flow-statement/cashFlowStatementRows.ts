export type CashFlowRow = {
  key: string;
  label: string;
  amount: number | null;
  kind: "section" | "line" | "subtotal" | "total" | "note";
};

/** "Add" when the amount grows the figure, "Deduct" when it reduces it. */
const addDeduct = (amount: number, label: string) =>
  `${amount < 0 ? "Deduct" : "Add"}: ${label}`;

/** "Less" when the amount reduces the figure, "Add" when it is a reversal. */
const lessAdd = (amount: number, label: string) =>
  `${amount < 0 ? "Less" : "Add"}: ${label}`;

/**
 * The one direction word that applies to a working-capital line.
 *
 * The amount is the CASH EFFECT: positive means cash came in. An asset line
 * with a positive effect is a decrease in that asset; a liability line with a
 * positive effect is an increase. The opposite word is used for the opposite
 * sign, rather than printing "Increase / (Decrease)" both ways.
 */
const workingCapitalLabel = (line: any) => {
  const amount = Number(line.amount || 0);
  const group = String(line.group || "");

  if (Math.abs(amount) < 0.005) {
    return `Increase / (Decrease) in ${group}`;
  }

  if (line.type === "liability") {
    return `${amount > 0 ? "Increase" : "Decrease"} in ${group}`;
  }

  return `${amount > 0 ? "Decrease" : "Increase"} in ${group}`;
};

export const cashFlowRows = (data: any): CashFlowRow[] => {
  if (!data) return [];

  const rows: CashFlowRow[] = [];

  rows.push({ key: "op-head", label: "Operating Activities", amount: null, kind: "section" });

  const netProfit = Number(data.operating?.net_profit || 0);
  rows.push({
    key: "net-profit",
    label:
      netProfit < 0
        ? "Net loss for the period"
        : "Net profit for the period",
    amount: netProfit,
    kind: "line",
  });

  const depreciation = Number(data.operating?.non_cash?.depreciation || 0);
  const otherExpense = Number(
    data.operating?.non_cash?.other_expense ?? data.operating?.non_cash?.other ?? 0,
  );
  const nonCashIncome = Number(data.operating?.non_cash?.income || 0);

  if (data.basis?.depreciation_supported || otherExpense !== 0 || nonCashIncome !== 0) {
    rows.push({
      key: "noncash-head",
      label: "Non-cash adjustments",
      amount: null,
      kind: "note",
    });

    if (data.basis?.depreciation_supported) {
      rows.push({
        key: "depreciation",
        label: addDeduct(depreciation, "Depreciation (non-cash)"),
        amount: depreciation,
        kind: "line",
      });
    }

    if (otherExpense !== 0) {
      rows.push({
        key: "other-noncash-expense",
        label: addDeduct(
          otherExpense,
          "Non-cash purchases & expenses (settled outside cash)",
        ),
        amount: otherExpense,
        kind: "line",
      });
    }

    if (nonCashIncome !== 0) {
      const incomeAmount = -nonCashIncome;
      rows.push({
        key: "noncash-income",
        label: lessAdd(incomeAmount, "Non-cash sales & income (settled outside cash)"),
        amount: incomeAmount,
        kind: "line",
      });
    }
  }

  const workingCapital = Array.isArray(data.operating?.working_capital)
    ? data.operating.working_capital
    : [];

  if (workingCapital.length > 0) {
    rows.push({ key: "wc-head", label: "Working capital adjustments", amount: null, kind: "note" });
    workingCapital.forEach((line: any, index: number) => {
      rows.push({
        key: `wc-${line.key || index}`,
        label: workingCapitalLabel(line),
        amount: Number(line.amount || 0),
        kind: "line",
      });
    });
  }

  rows.push({
    key: "op-total",
    label: "Net cash from operating activities",
    amount: Number(data.operating?.total || 0),
    kind: "subtotal",
  });

  rows.push({ key: "inv-head", label: "Investing Activities", amount: null, kind: "section" });
  (Array.isArray(data.investing?.lines) ? data.investing.lines : []).forEach(
    (line: any, index: number) => {
      rows.push({
        key: `inv-${line.key || index}`,
        label: line.group,
        amount: Number(line.amount || 0),
        kind: "line",
      });
    },
  );
  rows.push({
    key: "inv-total",
    label: "Net cash from investing activities",
    amount: Number(data.investing?.total || 0),
    kind: "subtotal",
  });

  rows.push({ key: "fin-head", label: "Financing Activities", amount: null, kind: "section" });
  (Array.isArray(data.financing?.lines) ? data.financing.lines : []).forEach(
    (line: any, index: number) => {
      rows.push({
        key: `fin-${line.key || index}`,
        label: line.group,
        amount: Number(line.amount || 0),
        kind: "line",
      });
    },
  );
  rows.push({
    key: "fin-total",
    label: "Net cash from financing activities",
    amount: Number(data.financing?.total || 0),
    kind: "subtotal",
  });

  const unclassified = Array.isArray(data.unclassified?.lines)
    ? data.unclassified.lines
    : [];

  if (unclassified.length > 0) {
    rows.push({
      key: "unc-head",
      label: "Other movements not classified",
      amount: null,
      kind: "section",
    });
    unclassified.forEach((line: any, index: number) => {
      rows.push({
        key: `unc-${line.key || index}`,
        label: `${line.group} (${line.type})`,
        amount: Number(line.amount || 0),
        kind: "line",
      });
    });
    rows.push({
      key: "unc-total",
      label: "Net other movements",
      amount: Number(data.unclassified?.total || 0),
      kind: "subtotal",
    });
  }

  const netIncrease = Number(data.reconciliation?.net_increase || 0);
  rows.push({
    key: "net-increase",
    label:
      netIncrease < 0
        ? "Net decrease in cash and cash equivalents"
        : netIncrease > 0
          ? "Net increase in cash and cash equivalents"
          : "Net increase / (decrease) in cash and cash equivalents",
    amount: netIncrease,
    kind: "total",
  });
  rows.push({
    key: "opening-cash",
    label: "Cash and cash equivalents at the beginning of the period",
    amount: Number(data.reconciliation?.opening_cash || 0),
    kind: "line",
  });
  rows.push({
    key: "closing-cash",
    label: "Cash and cash equivalents at the end of the period",
    amount: Number(data.reconciliation?.closing_cash || 0),
    kind: "total",
  });

  if (!data.reconciliation?.reconciles) {
    rows.push({
      key: "difference",
      label: "Unreconciled difference against the ledger",
      amount: Number(data.reconciliation?.difference || 0),
      kind: "note",
    });
    rows.push({
      key: "ledger-closing",
      label: "Cash and cash equivalents per the ledger",
      amount: Number(data.reconciliation?.ledger_closing_cash || 0),
      kind: "note",
    });
  }

  return rows;
};

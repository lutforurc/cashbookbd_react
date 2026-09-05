export type LedgerWithProductRow = {
  id?: number | string;
  sl_number?: number | string;
  vr_no?: string;
  vr_date?: string;
  transaction_name?: string;
  sales_item_name?: string;
  remarks?: string;
  order_number?: string;
  truck_no?: string;
  /**
   * What the server calls this row -- 'Sales', 'Purchase', 'Opening' or
   * 'Transaction'. Read in preference to the voucher number's prefix; see
   * isPurchaseRow in ledgerWithProductUtils.
   */
  trx_type?: string;
  quantity?: number | string;
  rate?: number | string;
  total?: number | string;
  purchase_total?: number | string;
  sales_total?: number | string;
  received?: number | string;
  payment?: number | string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
  displayed_received?: number;
  displayed_payment?: number;
  running_balance?: number;
  voucher_type?: number | string;
  voucher_type_id?: number | string;
  mtm_id?: number | string;
  mtmid?: number | string;
  mtmId?: number | string;
  mid?: number | string;
  acc_transaction_master?: any[] | Record<string, any>;
};

export type LedgerWithProductSummary = {
  opening_balance?: number | string;
  qty?: number;
  purchase_qty?: number;
  sales_qty?: number;
  purchase_amt?: number;
  sales_amt?: number;
  total_amount?: number;
  total_received?: number;
  total_payment?: number;
  closing_balance?: number | string;
  debit?: number | string;
  credit?: number | string;
};

export type LedgerWithProductParty = {
  name?: string;
  ledger_page?: string | null;
  mobile?: string | null;
  manual_address?: string | null;
};

export type LedgerWithProductReportData = {
  rows?: LedgerWithProductRow[];
  summary?: LedgerWithProductSummary;
  party?: LedgerWithProductParty;
};

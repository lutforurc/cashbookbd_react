import { useCallback, useState } from 'react';
import httpService from '../../services/httpService';
import { API_PRODUCT_FINANCIAL_STATEMENT_URL } from '../../services/apiRoutes';

export type StatementRow = {
  vr_date: string;
  vr_no: string | null;
  main_trx_id: number;
  line_type: string;
  source_type: string | null;
  source_id: number | null;
  party_name: string | null;
  remarks: string | null;
  quantity: number | null;
  rate: number | null;
  sales_bill: number;
  sales_return: number;
  purchase_bill: number;
  purchase_return: number;
  cash_received: number;
  cash_payment: number;
  receivable_balance: number;
  payable_balance: number;
};

export type StatementData = {
  branch: { id: number; name: string | null };
  party: { id: number; name: string | null };
  product: { id: number; name: string; bangla: string | null; barcode: string | null };
  is_tracked: boolean;
  start_date: string;
  end_date: string;
  summary: {
    opening_receivable: number;
    sales_bill: number;
    sales_return: number;
    cash_received: number;
    closing_receivable: number;
    opening_payable: number;
    purchase_bill: number;
    purchase_return: number;
    cash_payment: number;
    closing_payable: number;
  };
  unmapped: { received: number; payment: number; rows_count: number };
  notice: string;
  rows: StatementRow[];
};

export type StatementParams = {
  product_id: number;
  branch_id: number;
  coa4_id: number;
  start_date: string;
  end_date: string;
};

/**
 * Data layer for the Product Financial Statement.
 *
 * The report does not run by itself -- only when the user presses Apply. These
 * are large figures, so it is not re-queried on every change of a filter.
 */
export function useProductStatement() {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (params: StatementParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpService.get(API_PRODUCT_FINANCIAL_STATEMENT_URL, { params });
      setData(response?.data?.data?.data ?? null);
    } catch (e: any) {
      setData(null);
      setError(
        e?.response?.status === 403
          ? 'You are not allowed to view this report (product.tracking.report.view).'
          : e?.response?.data?.message ?? 'The report could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, load, clear };
}

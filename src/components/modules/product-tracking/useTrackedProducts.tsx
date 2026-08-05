import { useCallback, useEffect, useState } from 'react';
import httpService from '../../services/httpService';
import { API_PRODUCT_TRACKING_PRODUCTS_URL } from '../../services/apiRoutes';

export type TrackedProduct = {
  id: number;
  name: string;
  bangla?: string | null;
  barcode?: string | null;
  branch_id: number;
  coa4_id: number;
  is_active: boolean;
};

// 'sales' and 'purchase' are the invoice screens. They read the same settings
// row as the voucher contexts, but through track_sales_bill / track_purchase_bill
// rather than the cash flags, so a product can be tracked on bills without being
// offered on a receipt -- which is the point of having four switches.
export type TrackedProductContext = 'received' | 'payment' | 'sales' | 'purchase' | 'ledger';

/**
 * Data for the "Select Product (Optional)" dropdown on the Cash Received,
 * Cash Payment and Ledger forms.
 *
 * coa4Id is the chosen Customer/Supplier. Tracking is per party, so changing
 * the account changes the list: the products set for that party, plus the ones
 * added for "all parties".
 *
 * Until an account is chosen only the "all parties" products show; if there are
 * none the list stays empty and the form behaves exactly as it did before.
 */
export function useTrackedProducts(
  context: TrackedProductContext,
  branchId?: number | string | null,
  includeInactive = false,
  coa4Id?: number | string | null,
) {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    httpService
      .get(API_PRODUCT_TRACKING_PRODUCTS_URL, {
        params: {
          context,
          branch_id: branchId || undefined,
          coa4_id: coa4Id || undefined,
          include_inactive: includeInactive ? 1 : undefined,
        },
      })
      .then((response) => {
        setProducts(response?.data?.data?.data ?? []);
      })
      .catch(() => {
        // With tracking unconfigured, or the permission missing, the dropdown
        // simply hides. The existing form is never broken by it.
        setProducts([]);
        setError('unavailable');
      })
      .finally(() => setLoading(false));
  }, [context, branchId, includeInactive, coa4Id]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    products,
    loading,
    error,
    reload: load,
    /** With no tracked product there is no reason to show the field at all */
    enabled: products.length > 0,
  };
}

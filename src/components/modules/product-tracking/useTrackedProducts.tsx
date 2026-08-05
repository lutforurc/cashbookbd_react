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

export type TrackedProductContext = 'received' | 'payment' | 'ledger';

/**
 * Cash Received / Cash Payment / Ledger form-এর "Select Product (Optional)"
 * dropdown-এর data.
 *
 * coa4Id = নির্বাচিত Customer/Supplier। Tracking party-ভিত্তিক, তাই Account
 * বদলালে তালিকাও বদলায় — ঐ পার্টির জন্য নির্দিষ্ট Product গুলো, এবং যেগুলো
 * "সব পার্টি" হিসেবে যোগ করা আছে সেগুলো।
 *
 * Account না বাছা পর্যন্ত শুধু "সব পার্টি" Product দেখাবে; কিছুই না থাকলে
 * তালিকা খালি থাকে এবং form আগের মতোই চলে।
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
        // Tracking configure করা না থাকলে বা permission না থাকলে dropdown
        // নিঃশব্দে লুকিয়ে যাবে — existing form কখনো ভাঙবে না।
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
    /** কোনো tracked product না থাকলে field দেখানোরই দরকার নেই */
    enabled: products.length > 0,
  };
}

import { useCallback, useEffect, useState } from 'react';
import httpService from '../../services/httpService';
import {
  API_PRODUCT_TRACKING_AVAILABLE_PRODUCTS_URL,
  API_PRODUCT_TRACKING_SETTINGS_URL,
} from '../../services/apiRoutes';

export type TrackingSetting = {
  id: number;
  product_id: number;
  product_name: string | null;
  product_bangla: string | null;
  product_barcode: string | null;
  branch_id: number;
  branch_name: string | null;
  coa4_id: number;
  party_name: string | null;
  track_sales_bill: boolean;
  track_purchase_bill: boolean;
  track_cash_received: boolean;
  track_cash_payment: boolean;
  is_active: boolean;
};

export type AvailableProduct = {
  id: number;
  name: string;
  bangla: string | null;
  barcode: string | null;
};

export type SettingPayload = {
  product_id: number;
  branch_id: number;
  coa4_id: number;
  track_sales_bill: boolean;
  track_purchase_bill: boolean;
  track_cash_received: boolean;
  track_cash_payment: boolean;
  is_active: boolean;
};

/**
 * Data layer for the Product Tracking settings screen.
 *
 * Deliberately not in Redux: only one screen reads this list, so component
 * local state is enough and the store stays light.
 */
export function useProductTrackingSettings() {
  const [settings, setSettings] = useState<TrackingSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    httpService
      .get(API_PRODUCT_TRACKING_SETTINGS_URL, { params: { search: search || undefined } })
      .then((response) => {
        // the paginate() wrapper sits inside data.data.data
        const payload = response?.data?.data?.data;
        setSettings(payload?.data ?? []);
      })
      .catch((e) => {
        setSettings([]);
        setError(
          e?.response?.status === 403
            ? 'You are not allowed to view this screen (product.tracking.settings.view).'
            : 'The list could not be loaded.',
        );
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: SettingPayload) => {
      setSaving(true);
      try {
        const response = await httpService.post(API_PRODUCT_TRACKING_SETTINGS_URL, payload);
        load();
        return { ok: response?.data?.success === true, message: response?.data?.message ?? '' };
      } catch (e: any) {
        return { ok: false, message: e?.response?.data?.message ?? 'Could not be added.' };
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const update = useCallback(
    async (id: number, payload: SettingPayload) => {
      setSaving(true);
      try {
        const response = await httpService.put(`${API_PRODUCT_TRACKING_SETTINGS_URL}/${id}`, payload);
        load();
        return { ok: response?.data?.success === true, message: response?.data?.message ?? '' };
      } catch (e: any) {
        return { ok: false, message: e?.response?.data?.message ?? 'Could not be saved.' };
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const toggle = useCallback(
    async (id: number, isActive: boolean) => {
      setSaving(true);
      try {
        await httpService.patch(`${API_PRODUCT_TRACKING_SETTINGS_URL}/${id}/toggle`, {
          is_active: isActive ? 1 : 0,
        });
        load();
        return { ok: true, message: '' };
      } catch (e: any) {
        return { ok: false, message: e?.response?.data?.message ?? 'Could not be changed.' };
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  return { settings, loading, saving, error, search, setSearch, reload: load, create, update, toggle };
}

/**
 * The Add form's dropdown -- the products not yet configured for this
 * (branch + party) scope. The same product can be added again for another
 * party, which is why the list changes when the party does.
 */
export function useAvailableProducts(branchId: number, coa4Id: number) {
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    httpService
      .get(API_PRODUCT_TRACKING_AVAILABLE_PRODUCTS_URL, {
        params: { branch_id: branchId, coa4_id: coa4Id },
      })
      .then((response) => setProducts(response?.data?.data?.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [branchId, coa4Id]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, reload: load };
}

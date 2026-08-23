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
/** Rows a page, when nobody says otherwise. */
const DEFAULT_PER_PAGE = 10;

export function useProductTrackingSettings() {
  const [settings, setSettings] = useState<TrackingSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /**
   * The endpoint has always paginated -- 25 a page by default. This screen
   * asked for one page and drew whatever came back, so a company past that
   * many settings simply stopped seeing the rest, with nothing on screen to
   * say so.
   */
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState(DEFAULT_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    httpService
      .get(API_PRODUCT_TRACKING_SETTINGS_URL, {
        params: { search: search || undefined, page, per_page: perPage },
      })
      .then((response) => {
        // the paginate() wrapper sits inside data.data.data
        const payload = response?.data?.data?.data;
        setSettings(payload?.data ?? []);
        setTotal(Number(payload?.total ?? 0));
        setLastPage(Math.max(1, Number(payload?.last_page ?? 1)));
      })
      .catch((e) => {
        setSettings([]);
        setTotal(0);
        setLastPage(1);
        setError(
          e?.response?.status === 403
            ? 'You are not allowed to view this screen (product.tracking.settings.view).'
            : 'The list could not be loaded.',
        );
      })
      .finally(() => setLoading(false));
  }, [search, page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  // Searching or resizing the page starts the list again from the top. Staying
  // on page four of a list that has just become one page long shows nothing.
  const setSearchAndReset = useCallback((value: string) => {
    setSearch(value);
    setPageState(1);
  }, []);

  const setPerPage = useCallback((value: number) => {
    setPerPageState(value);
    setPageState(1);
  }, []);

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

  /**
   * Only a setting nothing has been recorded against can go. The server is the
   * one that decides that, so its refusal is passed straight back to the caller
   * rather than guessed at here.
   */
  const remove = useCallback(
    async (id: number) => {
      setSaving(true);
      try {
        const response = await httpService.delete(`${API_PRODUCT_TRACKING_SETTINGS_URL}/${id}`);

        // Deleting the only row on the last page leaves that page empty, and
        // reloading it would show an empty table with page buttons above it.
        // Step back instead, so the list ends where the rows do.
        if (settings.length === 1 && page > 1) {
          setPageState(page - 1);
        } else {
          load();
        }

        return { ok: response?.data?.success === true, message: response?.data?.message ?? '' };
      } catch (e: any) {
        return { ok: false, message: e?.response?.data?.message ?? 'Could not be deleted.' };
      } finally {
        setSaving(false);
      }
    },
    // settings and page as well as load: the step-back above reads both, and a
    // stale closure would step back from the wrong page.
    [load, settings, page],
  );

  return {
    settings,
    loading,
    saving,
    error,
    search,
    setSearch: setSearchAndReset,
    page,
    setPage: setPageState,
    perPage,
    setPerPage,
    total,
    lastPage,
    reload: load,
    create,
    update,
    toggle,
    remove,
  };
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

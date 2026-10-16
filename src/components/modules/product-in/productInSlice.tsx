import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_PRODUCT_IN_DESTROY_URL,
  API_PRODUCT_IN_DETAILS_URL,
  API_PRODUCT_IN_LIST_URL,
  API_PRODUCT_IN_REASON_DESTROY_URL,
  API_PRODUCT_IN_REASON_LIST_URL,
  API_PRODUCT_IN_REASON_STORE_URL,
  API_PRODUCT_IN_REASON_UPDATE_URL,
  API_PRODUCT_IN_REPORT_URL,
  API_PRODUCT_IN_STORE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface ProductInState {
  isLoading: boolean;
  isSaving: boolean;
  errors: string | null;
  data: any[];
  reasons: any[];
  report: any;
  pagination: {
    total: number;
    lastPage: number;
    currentPage: number;
  };
  storeData: any;
}

interface ProductInListPayload {
  rows: any[];
  total: number;
  lastPage: number;
  currentPage: number;
}

const initialState: ProductInState = {
  isLoading: false,
  isSaving: false,
  errors: null,
  data: [],
  reasons: [],
  report: null,
  pagination: { total: 0, lastPage: 1, currentPage: 1 },
  storeData: {},
};

// foundData() wraps the payload one level deeper than it looks: the body is
// {success, data: {success, data: <payload>}}.
const unwrap = (responseData: any) =>
  responseData?.data?.data ?? responseData?.data ?? {};

const pickError = (responseData: any, fallback: string) =>
  responseData?.error?.message || responseData?.message || fallback;

const normalizeListPayload = (payload: any): ProductInListPayload => {
  const listRoot = payload?.data?.data ?? payload?.data ?? payload ?? [];

  if (Array.isArray(listRoot)) {
    return { rows: listRoot, total: listRoot.length, lastPage: 1, currentPage: 1 };
  }

  return {
    rows: Array.isArray(listRoot?.data) ? listRoot.data : [],
    total: Number(listRoot?.total || 0),
    lastPage: Number(listRoot?.last_page || 1),
    currentPage: Number(listRoot?.current_page || 1),
  };
};

// The reason a fresh receipt opens on. The shop's own list is the only set of
// reasons the backend accepts, and it already arrives in the shop's order
// (`sort`), so the first one still offered is the sensible default -- the field
// is never left blank, and the clerk can still change it. A retired reason is
// skipped: it exists to explain old slips, not to be picked on a new one.
export const pickDefaultReasonId = (reasons: any[]): string => {
  const rows = Array.isArray(reasons) ? reasons : [];
  const offered = rows.find((r) => Number(r?.is_active) === 1) ?? rows[0];

  return offered ? String(offered.id) : '';
};

// What the reason field should hold: whatever is already chosen, otherwise the
// shop's default. So a new receipt is never blank, and a reason already on the
// form (an existing slip, or one the clerk picked) is never overwritten.
export const resolveReasonId = (current: string, reasons: any[]): string =>
  current ? current : pickDefaultReasonId(reasons);

export const getProductIns = createAsyncThunk<
  ProductInListPayload,
  any,
  { rejectValue: string }
>('productIn/getProductIns', async (params = {}, thunkAPI) => {
  try {
    // ⚠️ `{ params }`, not `params`: axios reads get()'s second argument as its
    // config, so bare filters are dropped and the list never filters.
    const res = await httpService.get(API_PRODUCT_IN_LIST_URL, { params });
    const responseData = res.data;

    if (responseData?.success) {
      return normalizeListPayload(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load receipts'));
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

export const getProductInReasons = createAsyncThunk<any, void, { rejectValue: string }>(
  'productIn/getProductInReasons',
  async (_arg, thunkAPI) => {
    try {
      const res = await httpService.get(API_PRODUCT_IN_REASON_LIST_URL);
      const responseData = res.data;

      if (responseData?.success) {
        const rows = unwrap(responseData);
        return Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
      }

      return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load reasons'));
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || 'Something went wrong',
      );
    }
  },
);

const getProductInDetailsThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/getProductInDetails', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_PRODUCT_IN_DETAILS_URL}/${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      const details = unwrap(responseData);
      if (typeof callback === 'function') callback({ success: true, data: details });
      return details;
    }

    const message = pickError(responseData, 'Failed to load receipt details');
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const getProductInDetails =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductInDetailsThunk({ id, callback }));

const storeProductInThunk = createAsyncThunk<
  any,
  { data: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/storeProductIn', async ({ data, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(API_PRODUCT_IN_STORE_URL, data);
    const responseData = res.data;

    // The callback is handed the RAW body, success or not -- the same
    // arrangement the write-off screen uses, so a refusal carrying extra keys
    // still reaches the form intact.
    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to save receipt'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const storeProductIn =
  (data: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(storeProductInThunk({ data, callback }));

const destroyProductInThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/destroyProductIn', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_PRODUCT_IN_DESTROY_URL}/${id}`);
    const responseData = res.data;

    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to delete receipt'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const destroyProductIn =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(destroyProductInThunk({ id, callback }));

const saveReasonThunk = createAsyncThunk<
  any,
  { id?: number | string | null; data: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/saveReason', async ({ id, data, callback }, thunkAPI) => {
  try {
    const url = id ? `${API_PRODUCT_IN_REASON_UPDATE_URL}/${id}` : API_PRODUCT_IN_REASON_STORE_URL;
    const res = await httpService.post(url, data);
    const responseData = res.data;

    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to save reason'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const saveReason =
  (id: number | string | null, data: any, callback?: (response: any) => void) =>
  (dispatch: any) =>
    dispatch(saveReasonThunk({ id, data, callback }));

const destroyReasonThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/destroyReason', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_PRODUCT_IN_REASON_DESTROY_URL}/${id}`);
    const responseData = res.data;

    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to delete reason'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const destroyReason =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(destroyReasonThunk({ id, callback }));

const getProductInReportThunk = createAsyncThunk<
  any,
  { params: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productIn/getProductInReport', async ({ params, callback }, thunkAPI) => {
  try {
    // `{ params }` -- see getProductIns: bare, the dates never reach the API.
    const res = await httpService.get(API_PRODUCT_IN_REPORT_URL, { params });
    const responseData = res.data;

    if (responseData?.success) {
      const report = unwrap(responseData);
      if (typeof callback === 'function') callback({ success: true, data: report });
      return report;
    }

    const message = pickError(responseData, 'Failed to load the register');
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const getProductInReport =
  (params: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductInReportThunk({ params, callback }));

const productInSlice = createSlice({
  name: 'productIn',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProductIns.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getProductIns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload.rows;
        state.pagination = {
          total: action.payload.total,
          lastPage: action.payload.lastPage,
          currentPage: action.payload.currentPage,
        };
      })
      .addCase(getProductIns.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load receipts';
      })
      .addCase(getProductInReasons.fulfilled, (state, action) => {
        state.reasons = action.payload;
      })
      .addCase(storeProductInThunk.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(storeProductInThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.storeData = action.payload;
      })
      .addCase(storeProductInThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload || 'Failed to save receipt';
      })
      .addCase(getProductInReportThunk.fulfilled, (state, action) => {
        state.report = action.payload;
      });
  },
});

export default productInSlice.reducer;

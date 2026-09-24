import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_PRODUCT_OUT_DESTROY_URL,
  API_PRODUCT_OUT_DETAILS_URL,
  API_PRODUCT_OUT_LIST_URL,
  API_PRODUCT_OUT_REASON_DESTROY_URL,
  API_PRODUCT_OUT_REASON_LIST_URL,
  API_PRODUCT_OUT_REASON_STORE_URL,
  API_PRODUCT_OUT_REASON_UPDATE_URL,
  API_PRODUCT_OUT_REPORT_URL,
  API_PRODUCT_OUT_STORE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface ProductOutState {
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

interface ProductOutListPayload {
  rows: any[];
  total: number;
  lastPage: number;
  currentPage: number;
}

const initialState: ProductOutState = {
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

const normalizeListPayload = (payload: any): ProductOutListPayload => {
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

export const getProductOuts = createAsyncThunk<
  ProductOutListPayload,
  any,
  { rejectValue: string }
>('productOut/getProductOuts', async (params = {}, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCT_OUT_LIST_URL, params);
    const responseData = res.data;

    if (responseData?.success) {
      return normalizeListPayload(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load write-offs'));
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

export const getProductOutReasons = createAsyncThunk<any, void, { rejectValue: string }>(
  'productOut/getProductOutReasons',
  async (_arg, thunkAPI) => {
    try {
      const res = await httpService.get(API_PRODUCT_OUT_REASON_LIST_URL);
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

const getProductOutDetailsThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('productOut/getProductOutDetails', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_PRODUCT_OUT_DETAILS_URL}/${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      const details = unwrap(responseData);
      if (typeof callback === 'function') callback({ success: true, data: details });
      return details;
    }

    const message = pickError(responseData, 'Failed to load write-off details');
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const getProductOutDetails =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductOutDetailsThunk({ id, callback }));

const storeProductOutThunk = createAsyncThunk<
  any,
  { data: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productOut/storeProductOut', async ({ data, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(API_PRODUCT_OUT_STORE_URL, data);
    const responseData = res.data;

    // ⚠️ The callback is handed the RAW body, success or not. A shortage comes
    // back as success:false WITH a `shortages` list, and the form has to see
    // both to ask the clerk "these are not on the shelf -- write it off
    // anyway?". Branching on success here would lose the list.
    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to save write-off'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const storeProductOut =
  (data: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(storeProductOutThunk({ data, callback }));

const destroyProductOutThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('productOut/destroyProductOut', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_PRODUCT_OUT_DESTROY_URL}/${id}`);
    const responseData = res.data;

    if (typeof callback === 'function') callback(responseData);

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to delete write-off'));
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const destroyProductOut =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(destroyProductOutThunk({ id, callback }));

const saveReasonThunk = createAsyncThunk<
  any,
  { id?: number | string | null; data: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productOut/saveReason', async ({ id, data, callback }, thunkAPI) => {
  try {
    const url = id
      ? `${API_PRODUCT_OUT_REASON_UPDATE_URL}/${id}`
      : API_PRODUCT_OUT_REASON_STORE_URL;
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
>('productOut/destroyReason', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_PRODUCT_OUT_REASON_DESTROY_URL}/${id}`);
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

const getProductOutReportThunk = createAsyncThunk<
  any,
  { params: any; callback?: (response: any) => void },
  { rejectValue: string }
>('productOut/getProductOutReport', async ({ params, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCT_OUT_REPORT_URL, params);
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

export const getProductOutReport =
  (params: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductOutReportThunk({ params, callback }));

const productOutSlice = createSlice({
  name: 'productOut',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProductOuts.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getProductOuts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload.rows;
        state.pagination = {
          total: action.payload.total,
          lastPage: action.payload.lastPage,
          currentPage: action.payload.currentPage,
        };
      })
      .addCase(getProductOuts.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load write-offs';
      })
      .addCase(getProductOutReasons.fulfilled, (state, action) => {
        state.reasons = action.payload;
      })
      .addCase(storeProductOutThunk.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(storeProductOutThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.storeData = action.payload;
      })
      .addCase(storeProductOutThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload || 'Failed to save write-off';
      })
      .addCase(getProductOutReportThunk.fulfilled, (state, action) => {
        state.report = action.payload;
      });
  },
});

export default productOutSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_PRODUCTION_ALLOCATABLE_URL,
  API_PRODUCTION_COSTING_URL,
  API_PRODUCTION_DESTROY_URL,
  API_PRODUCTION_DETAILS_URL,
  API_PRODUCTION_LIST_URL,
  API_PRODUCTION_POST_URL,
  API_PRODUCTION_REGISTER_URL,
  API_PRODUCTION_REVERSE_URL,
  API_PRODUCTION_SALES_RETURN_STORE_URL,
  API_PRODUCTION_SALES_RETURN_UPDATE_URL,
  API_PRODUCTION_STOCK_URL,
  API_PRODUCTION_STORE_URL,
  API_PRODUCTION_UPDATE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface ProductionState {
  isLoading: boolean;
  isSaving: boolean;
  errors: string | null;
  data: any[];
  batcheCount: number;
  storeData: any;
  // The batch Costing report's detail -- one batch, opened from the register.
  costing: any;
}

const initialState: ProductionState = {
  isLoading: false,
  isSaving: false,
  errors: null,
  data: [],
  batcheCount: 0,
  storeData: {},
  costing: null,
};

// foundData() wraps the payload one level deeper than it looks: the body is
// {success, data: {data: <payload>}}.
const unwrap = (responseData: any) =>
  responseData?.data?.data ?? responseData?.data ?? {};

const pickError = (responseData: any, fallback: string) =>
  responseData?.error?.message || responseData?.message || fallback;

export const getProductionBatches = createAsyncThunk<
  any[],
  any,
  { rejectValue: string }
>('production/getProductionBatches', async (params = {}, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCTION_LIST_URL, { params });
    const responseData = res.data;

    if (responseData?.success) {
      const rows = unwrap(responseData);
      return Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load batches'));
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

// The posted expense lines a batch may be costed from, for a given date.
export const getProductionAllocatable = createAsyncThunk<
  any[],
  { date?: string },
  { rejectValue: string }
>('production/getProductionAllocatable', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCTION_ALLOCATABLE_URL, { params });
    const responseData = res.data;

    if (responseData?.success) {
      const rows = unwrap(responseData);
      return Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load expense lines'));
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

// How much of a product is on hand, for the input rows. product_ids is a
// comma-separated list, so one call answers the whole form.
export const getProductionStock = createAsyncThunk<
  any,
  { product_ids: string; date?: string },
  { rejectValue: string }
>('production/getProductionStock', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCTION_STOCK_URL, { params });
    const responseData = res.data;

    if (responseData?.success) {
      return unwrap(responseData);
    }

    return thunkAPI.rejectWithValue(pickError(responseData, 'Failed to load stock'));
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

export const getProductionDetails = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('production/getProductionDetails', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_PRODUCTION_DETAILS_URL}/${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      const details = unwrap(responseData);
      if (typeof callback === 'function') callback({ success: true, data: details });
      return details;
    }

    const message = pickError(responseData, 'Failed to load the batch');
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

// A thin wrapper over a POST whose callback wants the RAW body: post and reverse
// answer success or a refusal the screen must show word for word.
const postAction =
  (thunkName: string, urlFor: (id: number | string) => string) =>
  (id: number | string, data: any, callback?: (response: any) => void) =>
  async () => {
    try {
      const res = await httpService.post(urlFor(id), data || {});
      if (typeof callback === 'function') callback(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Something went wrong';
      if (typeof callback === 'function') callback({ success: false, message });
    }
  };

export const storeProduction = (data: any, callback?: (response: any) => void) => async () => {
  try {
    const res = await httpService.post(API_PRODUCTION_STORE_URL, data);
    if (typeof callback === 'function') callback(res.data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
  }
};

export const updateProduction = (data: any, callback?: (response: any) => void) => async () => {
  try {
    const res = await httpService.post(API_PRODUCTION_UPDATE_URL, data);
    if (typeof callback === 'function') callback(res.data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
  }
};

export const postProduction = postAction('post', (id) => `${API_PRODUCTION_POST_URL}/${id}`);
export const reverseProduction = postAction('reverse', (id) => `${API_PRODUCTION_REVERSE_URL}/${id}`);
export const destroyProduction = postAction('destroy', (id) => `${API_PRODUCTION_DESTROY_URL}/${id}`);

// Production Sales Return -- the new form, its own store/update, the ordinary
// return's ledger underneath.
export const storeProductionSalesReturn = (data: any, callback?: (response: any) => void) => async () => {
  try {
    const res = await httpService.post(API_PRODUCTION_SALES_RETURN_STORE_URL, data);
    if (typeof callback === 'function') callback(res.data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
  }
};

export const updateProductionSalesReturn = (data: any, callback?: (response: any) => void) => async () => {
  try {
    const res = await httpService.post(API_PRODUCTION_SALES_RETURN_UPDATE_URL, data);
    if (typeof callback === 'function') callback(res.data);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
  }
};

const getProductionRegisterThunk = createAsyncThunk<
  any,
  { params: any; callback?: (response: any) => void },
  { rejectValue: string }
>('production/getProductionRegister', async ({ params, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCTION_REGISTER_URL, { params });
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

export const getProductionRegister =
  (params: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductionRegisterThunk({ params, callback }));

const getProductionCostingThunk = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void },
  { rejectValue: string }
>('production/getProductionCosting', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_PRODUCTION_COSTING_URL}/${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      const detail = unwrap(responseData);
      if (typeof callback === 'function') callback({ success: true, data: detail });
      return detail;
    }

    const message = pickError(responseData, 'Failed to load the batch');
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const getProductionCosting =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getProductionCostingThunk({ id, callback }));

const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProductionBatches.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getProductionBatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.batcheCount = action.payload.length;
      })
      .addCase(getProductionBatches.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load batches';
      })
      .addCase(getProductionCostingThunk.fulfilled, (state, action) => {
        state.costing = action.payload;
      });
  },
});

export default productionSlice.reducer;

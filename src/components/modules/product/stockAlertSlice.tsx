import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_PRODUCT_NEGATIVE_STOCK_URL,
  API_PRODUCT_SLOW_MOVING_URL,
  API_PRODUCT_WAREHOUSE_DIFFERENCE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

export type StockAlertType = 'negative' | 'slowMoving' | 'warehouseDifference';

type StockAlertParams = {
  search?: string;
  category_id?: string | number;
  brand_id?: string | number;
  per_page?: number;
  page?: number;
  days?: number;
};

type FetchStockAlertArgs = {
  type: StockAlertType;
  params: StockAlertParams;
};

type StockAlertEntry = {
  data: any;
  isLoading: boolean;
  error: string | null;
};

type StockAlertState = Record<StockAlertType, StockAlertEntry>;

const emptyEntry: StockAlertEntry = {
  data: null,
  isLoading: false,
  error: null,
};

const initialState: StockAlertState = {
  negative: { ...emptyEntry },
  slowMoving: { ...emptyEntry },
  warehouseDifference: { ...emptyEntry },
};

const endpoints: Record<StockAlertType, string> = {
  negative: API_PRODUCT_NEGATIVE_STOCK_URL,
  slowMoving: API_PRODUCT_SLOW_MOVING_URL,
  warehouseDifference: API_PRODUCT_WAREHOUSE_DIFFERENCE_URL,
};

export const fetchStockAlertProducts = createAsyncThunk<
  { type: StockAlertType; data: any },
  FetchStockAlertArgs,
  { rejectValue: { type: StockAlertType; message: string } }
>('stockAlert/fetchStockAlertProducts', async ({ type, params }, thunkAPI) => {
  try {
    const res = await httpService.get(endpoints[type], { params });
    return { type, data: res.data?.data ?? res.data };
  } catch (err: any) {
    return thunkAPI.rejectWithValue({
      type,
      message:
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to fetch stock alert products',
    });
  }
});

const stockAlertSlice = createSlice({
  name: 'stockAlert',
  initialState,
  reducers: {
    clearStockAlertError(state, action) {
      state[action.payload as StockAlertType].error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockAlertProducts.pending, (state, action) => {
        const type = action.meta.arg.type;
        state[type].isLoading = true;
        state[type].error = null;
      })
      .addCase(fetchStockAlertProducts.fulfilled, (state, action) => {
        const { type, data } = action.payload;
        state[type].isLoading = false;
        state[type].data = data;
      })
      .addCase(fetchStockAlertProducts.rejected, (state, action) => {
        const type = action.payload?.type ?? action.meta.arg.type;
        state[type].isLoading = false;
        state[type].error = action.payload?.message || 'Failed to fetch stock alert products';
      });
  },
});

export const { clearStockAlertError } = stockAlertSlice.actions;
export default stockAlertSlice.reducer;

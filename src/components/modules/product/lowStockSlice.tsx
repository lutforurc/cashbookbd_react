import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_PRODUCT_LOW_STOCK_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';

type LowStockParams = {
  search?: string;
  category_id?: string | number;
  brand_id?: string | number;
  per_page?: number;
  page?: number;
};

type LowStockState = {
  data: any;
  isLoading: boolean;
  error: string | null;
};

const initialState: LowStockState = {
  data: null,
  isLoading: false,
  error: null,
};

export const fetchLowStockProducts = createAsyncThunk<
  any,
  LowStockParams,
  { rejectValue: string }
>('lowStock/fetchLowStockProducts', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCT_LOW_STOCK_URL, { params });
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to fetch low stock products',
    );
  }
});

const lowStockSlice = createSlice({
  name: 'lowStock',
  initialState,
  reducers: {
    clearLowStockError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLowStockProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLowStockProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(fetchLowStockProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch low stock products';
      });
  },
});

export const { clearLowStockError } = lowStockSlice.actions;
export default lowStockSlice.reducer;

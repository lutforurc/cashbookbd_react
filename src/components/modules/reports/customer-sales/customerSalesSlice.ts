import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_REPORT_CUSTOMER_SALES_URL } from '../../../services/apiRoutes';

/* ================= TYPES ================= */

/** One sales invoice line, as the report endpoint answers it. */
export interface CustomerSalesRow {
  sl_number?: number | string;
  mtm_id?: number | string | null;
  customer_id?: number | string | null;
  customer_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  brand_id?: number | string | null;
  brand_name?: string | null;
  group_id?: number | string | null;
  group_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  product_id?: number | string | null;
  product_name?: string | null;
  product_code?: string | null;
  unit?: string | null;
  quantity?: number | string | null;
  rate?: number | string | null;
  amount?: number | string | null;
}

export interface CustomerSalesFilters {
  branchId: number | string | null;
  customerId?: number | string | null;
  brandId?: number | string | null;
  groupId?: number | string | null;
  categoryId?: number | string | null;
  productId?: number | string | null;
  startDate?: string;
  endDate?: string;
}

interface CustomerSalesState {
  loading: boolean;
  error: string | null;
  data: CustomerSalesRow[];
}

/* ================= STATE ================= */

const initialState: CustomerSalesState = {
  loading: false,
  error: null,
  data: [],
};

/* ================= ASYNC THUNK ================= */

/**
 * The report's own endpoint. Every filter is optional and sent as it stands --
 * an unset one travels empty and the server drops it, so "all customers" and
 * "all brands" are the same query with two fewer clauses.
 */
export const getCustomerSales = createAsyncThunk<
  CustomerSalesRow[],
  CustomerSalesFilters,
  { rejectValue: string }
>('customerSales/fetch', async (filters, { rejectWithValue }) => {
  try {
    const response = await httpService.get(API_REPORT_CUSTOMER_SALES_URL, {
      params: {
        branch_id: filters.branchId ?? '',
        customer_id: filters.customerId || '',
        brand_id: filters.brandId || '',
        group_id: filters.groupId || '',
        category_id: filters.categoryId || '',
        product_id: filters.productId || '',
        startdate: filters.startDate,
        enddate: filters.endDate,
      },
    });

    const payload = response?.data;

    if (payload?.success === false) {
      return rejectWithValue(payload?.message || 'Customer sales report load failed');
    }

    const rows = payload?.data?.data ?? payload?.data ?? [];

    return Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || 'Something went wrong',
    );
  }
});

/* ================= SLICE ================= */

const customerSalesSlice = createSlice({
  name: 'customerSales',
  initialState,
  reducers: {
    resetCustomerSales(state) {
      state.loading = false;
      state.error = null;
      state.data = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCustomerSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomerSales.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getCustomerSales.rejected, (state, action) => {
        state.loading = false;
        // Cleared rather than left standing: a failed read must not leave the
        // previous filter's lines on screen under a new heading.
        state.data = [];
        state.error = (action.payload as string) || 'Something went wrong';
      });
  },
});

export const { resetCustomerSales } = customerSalesSlice.actions;
export default customerSalesSlice.reducer;

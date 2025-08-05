import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_CONTACT_DETAILS_LIST_URL,
  API_STORE_CUSTOMER_URL,
} from '../../services/apiRoutes';

// Types
type CustomerRequestPayload = {
  per_page: number;
  page: number | null;
  search: string | null;
};

type StoreCustomerPayload = {
  name: string;
  manual_address: string;
  mobile: string;
  ledger_page?: string;
  idfr_code?: string;
  type_id: string;
  area_id: string;
  customerLogin?: boolean;
};

type Customer = {
  serial: number;
  name: string;
  father: string;
  mobile: string;
  email: string;
  manual_address: string;
};

type PaginatedCustomerResponse = {
  data: Customer[];
  current_page: number;
  total: number;
};

type ErrorResponse = { message: string };

interface CustomerState {
  customer: Customer[];
  currentPage: number;
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customer: [],
  currentPage: 1,
  total: 0,
  loading: false,
  error: null,
};

export const getCustomer = createAsyncThunk<
  PaginatedCustomerResponse,
  CustomerRequestPayload,
  { rejectValue: ErrorResponse }
>('getCustomer/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_CONTACT_DETAILS_LIST_URL, {
      per_page: payload.per_page,
      page: payload.page,
      search: payload.search,
    });

    return data.data; // Laravel wraps actual data under `.data`
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch installments',
    });
  }
});
export const storeCustomer = createAsyncThunk<any,StoreCustomerPayload,{ rejectValue: ErrorResponse }>('customer/store', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_STORE_CUSTOMER_URL, payload);
    return data;
  } catch (error) {
    return rejectWithValue({ message: 'Failed to store customer' });
  }
});

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customer = action.payload.data;
        state.currentPage = action.payload.current_page;
        state.total = action.payload.total;
      })
      .addCase(getCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })

      .addCase(storeCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(storeCustomer.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(storeCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Store failed!';
      });
  },
});

export const { setLoading } = customerSlice.actions;
export default customerSlice.reducer;

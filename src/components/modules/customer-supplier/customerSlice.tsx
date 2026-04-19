import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_CONTACT_DETAILS_LIST_URL,
  API_CONTACT_EDIT_URL,
  API_CONTACT_UPDATE_URL,
  API_CUSTOMER_FROM_UI_URL,
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
  ledger_page: string;
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
  /* 🔥 NEW */
  editCustomer: any | null;
  editLoading: boolean;

  loading: boolean;
  error: string | null;
}
type EditCustomerResponse = {
  success: boolean;
  data: any;
};

type UpdateCustomerPayload = {
  id: number;
  data: any;
};

const initialState: CustomerState = {
  customer: [],
  currentPage: 1,
  total: 0,
  editCustomer: null,
  editLoading: false,

  loading: false,
  error: null,
};

export const getCustomer = createAsyncThunk<PaginatedCustomerResponse, CustomerRequestPayload, { rejectValue: ErrorResponse }>('getCustomer/fetch', async (payload, { rejectWithValue }) => {
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
export const storeCustomer = createAsyncThunk<any, StoreCustomerPayload, { rejectValue: ErrorResponse }>('customer/store', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_STORE_CUSTOMER_URL, payload);
    return data;
  } catch (error) {
    return rejectWithValue({ message: 'Failed to store customer' });
  }
});
export const getCustomerForEdit = createAsyncThunk<any,number,{ rejectValue: ErrorResponse }>("customer/getCustomerForEdit", async (id, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(
        `${API_CONTACT_EDIT_URL}${id}`
      );

      return data.data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to load customer",
      });
    }
  }
);

export const updateCustomerFromEdit = createAsyncThunk<
  { message: string },
  UpdateCustomerPayload,
  { rejectValue: ErrorResponse }
>(
  "customer/updateCustomerFromEdit",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await httpService.post(
        `${API_CONTACT_UPDATE_URL}${id}`,
        data
      );

      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        message:
          error.response?.data?.message ||
          "Failed to update customer",
      });
    }
  }
);

/* ---------- Update From UI ---------- */
export const updateCustomerFromUI = createAsyncThunk<{ message: string }, { id: number; data: any }, { rejectValue: string }>("employee/updateEmployeeFromUI",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_CUSTOMER_FROM_UI_URL}${id}`, data);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to update employee"
      );
    }
  }
);


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
      })

      /* ================= EDIT LOAD ================= */
      .addCase(getCustomerForEdit.pending, (state) => {
        state.editLoading = true;
        state.editCustomer = null;
      })
      .addCase(getCustomerForEdit.fulfilled, (state, action) => {
        state.editLoading = false;
        state.editCustomer = action.payload;
      })
      .addCase(getCustomerForEdit.rejected, (state, action) => {
        state.editLoading = false;
        state.error = action.payload?.message || "Failed to load customer";
      })

      /* ================= EDIT UPDATE ================= */
      .addCase(updateCustomerFromEdit.pending, (state) => {
        state.editLoading = true;
      })
      .addCase(updateCustomerFromEdit.fulfilled, (state) => {
        state.editLoading = false;
      })
      .addCase(updateCustomerFromEdit.rejected, (state, action) => {
        state.editLoading = false;
        state.error = action.payload?.message || "Update failed";
      })
  },
});

export const { setLoading } = customerSlice.actions;
export default customerSlice.reducer;

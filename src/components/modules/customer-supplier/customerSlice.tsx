import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_CONTACT_DETAILS_LIST_URL,
  API_CONTACT_DELETE_URL,
  API_CONTACT_EDIT_URL,
  API_CONTACT_UPDATE_URL,
  API_CUSTOMER_FROM_UI_URL,
  API_CUSTOMER_OPENING_DELETE_URL,
  API_CUSTOMER_SET_PASSWORD_URL,
  API_STORE_CUSTOMER_URL,
} from '../../services/apiRoutes';

// Types
type CustomerRequestPayload = {
  per_page: number;
  page: number | null;
  search: string | null;
  /**
   * A `cust_party_infos.party_type_id` (1 Customer, 2 Supplier, 3 Supplier &
   * Customer, 4 Advance), or '' / null / undefined for every party.
   */
  partyTypeId?: string | number | null;
  /**
   * An `hrm_employees.id` -- whose customers to list, set from the List
   * Customers screen where Branch Setup's "Customer Handle By Employee" is on.
   * '' / null / undefined is every party, the ones nobody holds included.
   */
  employeeId?: string | number | null;
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
  /* Kept separate from editLoading so submitting does not unmount the edit form. */
  updating: boolean;

  loading: boolean;
  error: string | null;
  /**
   * ⚠️ Which request is the current one.
   *
   * The screen fires a fresh call the moment the classification changes, and a
   * slower earlier call can land after a faster later one. Without this the
   * older answer -- for a type the reader has already moved off -- would
   * overwrite the newer rows, and the table would show one classification of
   * customers under another's heading. Every pending is tagged by Redux
   * Toolkit's own request id, and only the latest tag is allowed through.
   */
  activeRequestId: string | null;
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
  updating: false,

  loading: false,
  error: null,
  activeRequestId: null,
};

export const getCustomer = createAsyncThunk<PaginatedCustomerResponse, CustomerRequestPayload, { rejectValue: ErrorResponse }>('getCustomer/fetch', async (payload, { rejectWithValue }) => {
  try {
    const body: Record<string, any> = {
      per_page: payload.per_page,
      page: payload.page,
      search: payload.search,
    };

    // Absent rather than empty: the server's own "no filter" is the missing
    // param, and an empty string would have to be special-cased there too.
    if (
      payload.partyTypeId !== '' &&
      payload.partyTypeId !== null &&
      payload.partyTypeId !== undefined
    ) {
      body.party_type_id = payload.partyTypeId;
    }

    // Same rule for the employee: the server's "no filter" is the missing
    // param, and the blank option on the screen means exactly that.
    if (
      payload.employeeId !== '' &&
      payload.employeeId !== null &&
      payload.employeeId !== undefined
    ) {
      body.handle_by_employee_id = payload.employeeId;
    }

    const { data } = await httpService.post(API_CONTACT_DETAILS_LIST_URL, body);

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

    // A refusal (the plan's customer limit, a closed year) comes back as HTTP
    // 200 with success:false. Returning it as-is would resolve unwrap(), so the
    // form would show the refusal in a green "success" toast and clear itself
    // while no customer had been saved.
    if (data?.success === false) {
      return rejectWithValue({
        message: data?.error?.message || data?.message || 'Failed to store customer',
      } as ErrorResponse);
    }

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

/* ---------- Remove an opening balance and the voucher behind it ----------
   The customer stays; only the figure and its journal voucher go. */
export const deleteCustomerOpening = createAsyncThunk<any, number, { rejectValue: string }>(
  "customer/deleteOpeningBalance",
  async (id, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_CUSTOMER_OPENING_DELETE_URL}${id}`);

      // notFound() answers with a 2xx and success:false, so the refusal reason
      // -- an approved voucher, another branch -- has to be read off the body.
      if (response.data?.success === false) {
        return thunkAPI.rejectWithValue(
          response.data?.message || "Opening balance could not be deleted"
        );
      }

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Opening balance could not be deleted"
      );
    }
  }
);

/* ---------- Set / reset customer portal password ---------- */
export const setCustomerPortalPassword = createAsyncThunk<
  { message: string },
  { id: number; password: string },
  { rejectValue: string }
>(
  "customer/setPortalPassword",
  async ({ id, password }, thunkAPI) => {
    try {
      const response = await httpService.post(
        `${API_CUSTOMER_SET_PASSWORD_URL}${id}`,
        { password }
      );
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to set portal password"
      );
    }
  }
);

export const deleteCustomer = createAsyncThunk<any, number, { rejectValue: string }>(
  "customer/deleteCustomer",
  async (id, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_CONTACT_DELETE_URL}${id}`);
      if (response.data?.success === false) {
        return thunkAPI.rejectWithValue(response.data?.message || "Customer delete failed");
      }

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Customer delete failed"
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
      .addCase(getCustomer.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // The tag the answers below are checked against.
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(getCustomer.fulfilled, (state, action) => {
        // A newer request has already been sent; its answer is the one to keep.
        if (state.activeRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.customer = action.payload.data;
        state.currentPage = action.payload.current_page;
        state.total = action.payload.total;
      })
      .addCase(getCustomer.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;

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
        state.updating = true;
      })
      .addCase(updateCustomerFromEdit.fulfilled, (state) => {
        state.updating = false;
      })
      .addCase(updateCustomerFromEdit.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload?.message || "Update failed";
      })
  },
});

export const { setLoading } = customerSlice.actions;
export default customerSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import {API_INSTALLMENT_DELETE_URL,API_VOUCHER_DELETE_URL,API_VOUCHER_RECYCLEBIN_URL,API_REMOVE_RECYCLEBIN_URL,} from "../../services/apiRoutes";

// ---------- Types ----------
export interface VoucherItem {
  id: number;
  vr_no: string;
  vr_date: string;
  coal_name: string;
  delete_by: string;
  delete_at?: string;
  remarks: string | null;
  debit: string;
  credit: string;
}

interface RecycleBinResponse {
  data: VoucherItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface VoucherDeleteResponse {
  success: boolean;
  message: string;
  voucher_no: string | number;
}

interface RecycleBinParams {
  page?: number;
  per_page?: number;
  search?: string;
}

interface RemoveRecycleBinParams {
  id: number;
}

interface RemoveRecycleBinResponse {
  success: boolean;
  message: string;
}

interface VoucherState {
  vouchers: VoucherItem[];
  recycleBinItems: RecycleBinResponse | null;
  loading: boolean;
  error: string | null;
  deleteSuccess: boolean;
}

const initialState: VoucherState = {
  vouchers: [],
  recycleBinItems: null,
  loading: false,
  error: null,
  deleteSuccess: false,
};

// ---------- Thunks ----------

// Fetch Recycle Bin
export const fetchRecycleBin = createAsyncThunk<RecycleBinResponse,RecycleBinParams | void,{ rejectValue: string }>("voucher/fetchRecycleBin", async (params, thunkAPI) => {
  try {
    const response = await httpService.post(API_VOUCHER_RECYCLEBIN_URL, {
      page: params?.page || 1,
      per_page: params?.per_page || 10,
      ...(params?.search ? { search: params.search } : {}),
    });
    return response.data as RecycleBinResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch recycle bin"
    );
  }
});

// Permanent Remove From Recycle Bin
export const removeRecycleBin = createAsyncThunk<RemoveRecycleBinResponse,RemoveRecycleBinParams,{ rejectValue: string }>("voucher/removeRecycleBin", async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_REMOVE_RECYCLEBIN_URL, {
      id: payload.id,
    });
    return response.data as RemoveRecycleBinResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
        error.message ||
        "Failed to remove recycle bin item"
    );
  }
});

// Delete Voucher (soft delete)
export const deleteVoucher = createAsyncThunk<VoucherDeleteResponse,{ voucher_no: string | number },{ rejectValue: string }>("voucher/deleteVoucher", async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_VOUCHER_DELETE_URL, {
      voucher_no: payload.voucher_no,
    });
    return response.data as VoucherDeleteResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || "Failed to delete voucher"
    );
  }
});

// Delete Installment
export const deleteInstallment = createAsyncThunk<VoucherDeleteResponse,{ voucher_no: string | number },{ rejectValue: string }>("voucher/deleteInstallment", async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_INSTALLMENT_DELETE_URL, {
      voucher_no: payload.voucher_no,
    });
    return response.data as VoucherDeleteResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || "Failed to delete installment"
    );
  }
});

// ---------- Slice ----------
const voucherSlice = createSlice({
  name: "voucher",
  initialState,
  reducers: {
    addVoucher(state, action: PayloadAction<VoucherItem>) {
      state.vouchers.push(action.payload);
    },
    clearRecycleBin(state) {
      state.recycleBinItems = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Recycle Bin
    builder
      .addCase(fetchRecycleBin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecycleBin.fulfilled, (state, action) => {
        state.loading = false;
        state.recycleBinItems = action.payload;
      })
      .addCase(fetchRecycleBin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch recycle bin";
      });

    // Remove Recycle Bin Item
    builder
      .addCase(removeRecycleBin.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeRecycleBin.fulfilled, (state, action) => {
        state.loading = false;
        // state.message = action.payload;
      })
      .addCase(removeRecycleBin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Recycle bin remove failed";
      });

    // Delete Voucher
    builder
      .addCase(deleteVoucher.pending, (state) => {
        state.loading = true;
        state.deleteSuccess = false;
      })
      .addCase(deleteVoucher.fulfilled, (state, action) => {
        state.loading = false;
        state.deleteSuccess = true;
        state.vouchers = state.vouchers.filter(
          (v) => v.vr_no !== action.payload.voucher_no
        );
      })
      .addCase(deleteVoucher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Delete failed";
      });

    // Delete Installment
    builder
      .addCase(deleteInstallment.pending, (state) => {
        state.loading = true;
        state.deleteSuccess = false;
      })
      .addCase(deleteInstallment.fulfilled, (state, action) => {
        state.loading = false;
        state.deleteSuccess = true;
        state.vouchers = state.vouchers.filter(
          (v) => v.vr_no !== action.payload.voucher_no
        );
      })
      .addCase(deleteInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Delete failed";
      });
  },
});

// ---------- Exports ----------
export const { addVoucher, clearRecycleBin } = voucherSlice.actions;
export default voucherSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import { API_INSTALLMENT_DELETE_URL, API_VOUCHER_DELETE_URL } from "../../services/apiRoutes";


// ---------- Types ----------
export interface VoucherItem {
  voucher_no: string | number;
}

interface VoucherDeleteState {
  vouchers: VoucherItem[];
  loading: boolean;
  error: string | null;
  deleteSuccess: boolean;
}

const initialState: VoucherDeleteState = {
  vouchers: [],
  loading: false,
  error: null,
  deleteSuccess: false,
};

// ---------- Delete API Response ----------
type VoucherDeleteResponse = {
  success: boolean;
  message: string;
  voucher_no: string | number;
};

// ---------- Thunk: Delete Voucher ----------
export const deleteVoucher = createAsyncThunk<VoucherDeleteResponse, { voucher_no: string | number }, { rejectValue: string }>("voucher/deleteVoucher", async (payload, thunkAPI) => {
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

// ---------- Thunk: Delete Voucher ----------
export const deleteInstallment = createAsyncThunk<VoucherDeleteResponse, { voucher_no: string | number },{ rejectValue: string }>("voucher/deleteInstallment", async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_INSTALLMENT_DELETE_URL, {
      voucher_no: payload.voucher_no,
    });
    return response.data as VoucherDeleteResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || "Failed to delete voucher"
    );
  }
});

// ---------- Slice ----------
const voucherDeleteSlice = createSlice({name: "voucherDelete",initialState,reducers: {
    addVoucher(state, action: PayloadAction<VoucherItem>) {
      state.vouchers.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // -------- Delete --------
      .addCase(deleteInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.deleteSuccess = false;
      })

      .addCase(
        deleteInstallment.fulfilled,
        (state, action: PayloadAction<VoucherDeleteResponse>) => {
          state.loading = false;
          state.deleteSuccess = true;

          // Remove deleted voucher from local state
          state.vouchers = state.vouchers.filter(
            (v) => v.voucher_no !== action.payload.voucher_no
          );
        }
      )

      .addCase(deleteInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Delete failed";
        state.deleteSuccess = false;
      })

      // -------- Delete --------
      .addCase(deleteVoucher.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.deleteSuccess = false;
      })

      .addCase(
        deleteVoucher.fulfilled,
        (state, action: PayloadAction<VoucherDeleteResponse>) => {
          state.loading = false;
          state.deleteSuccess = true;

          // Remove deleted voucher from local state
          state.vouchers = state.vouchers.filter(
            (v) => v.voucher_no !== action.payload.voucher_no
          );
        }
      )

      .addCase(deleteVoucher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Delete failed";
        state.deleteSuccess = false;
      });
  },
});

// ---------- Export ----------
export const { addVoucher } = voucherDeleteSlice.actions;
export default voucherDeleteSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { API_VOUCHER_DATE_CHANGE_URL } from "../../../services/apiRoutes";
import httpService from "../../../services/httpService";

// ✅ Payload type (based on Formik form)
export interface VoucherDateChangePayload {
  branch_id: number;
  voucher_type: string;
  current_date: string;
  change_date: string;
  start_voucher_number: string;
  end_voucher_number: string;
}

// ✅ Slice state type
interface VoucherDateChangeState {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

// ✅ Initial state
const initialState: VoucherDateChangeState = {
  loading: false,
  error: null,
  successMessage: null,
};

// ✅ Async thunk
export const changeVoucherDate = createAsyncThunk<string, VoucherDateChangePayload, { rejectValue: { message: string } }>("voucher/changeDate",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_VOUCHER_DATE_CHANGE_URL, payload);
      return response.data.message; // ✅ assuming API returns { message: "..." }
    } catch (error: any) {
      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to change voucher date",
      });
    }
  }
);

// ✅ Slice
const changeVoucherTypeSlice = createSlice({
  name: "changeVoucherType",
  initialState,
  reducers: {
    resetVoucherChangeState: (state) => {
      state.loading = false;
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(changeVoucherDate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(changeVoucherDate.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(changeVoucherDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      });
  },
});

export const { resetVoucherChangeState } = changeVoucherTypeSlice.actions;
export default changeVoucherTypeSlice.reducer;

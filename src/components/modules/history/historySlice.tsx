import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import { API_CHANGE_HISTORY_URL } from "../../services/apiRoutes";


/* ================= TYPES ================= */

// Transaction Detail
export interface TransactionDetail {
  id: number;
  coa4_id: number;
  remarks: string | null;
  debit: number;
  credit: number;
}

// Before / After Voucher Snapshot
export interface VoucherSnapshot {
  id: number;
  vr_no: string;
  vr_date: string;
  branch_id: number;
  acc_transaction_master: {
    id: number;
    acc_transaction_details: TransactionDetail[];
  }[];
}

// Change Summary
export interface ChangeSummary {
  amount_change: {
    before_total: number;
    after_total: number;
    difference: number;
  };
  remarks_change: {
    before: string[];
    after: string[];
  };
  detail_ids: {
    removed: number[];
    added: number[];
  };
}

// Single History Item
export interface VoucherChangeHistoryItem {
  id: number;
  voucher_id: number;
  changed_by: string;
  changed_at: string;
  before: VoucherSnapshot;
  after: VoucherSnapshot;
  change_summary: ChangeSummary;
}

// API Response
interface VoucherChangeHistoryResponse {
  data: VoucherChangeHistoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Params
interface HistoryParams {
  voucher_no: number;
  page?: number;
  per_page?: number;
}

/* ================= STATE ================= */

interface VoucherChangeHistoryState {
  history: VoucherChangeHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: VoucherChangeHistoryState = {
  history: null,
  loading: false,
  error: null,
};

/* ================= THUNK ================= */

export const fetchVoucherChangeHistory = createAsyncThunk<VoucherChangeHistoryResponse, HistoryParams, { rejectValue: string }>(
  "voucher/fetchChangeHistory",
  async (params, thunkAPI) => {
    try {
      const response = await httpService.post(
        API_CHANGE_HISTORY_URL,
        {
          voucher_no: params.voucher_no
        }
      );

      return response.data as VoucherChangeHistoryResponse;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch voucher change history"
      );
    }
  }
);

/* ================= SLICE ================= */

const historySlice = createSlice({
  name: "voucherChangeHistory",
  initialState,
  reducers: {
    clearVoucherChangeHistory(state) {
      state.history = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Pending
      .addCase(fetchVoucherChangeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      // Fulfilled
      .addCase(
        fetchVoucherChangeHistory.fulfilled,
        (state, action: PayloadAction<VoucherChangeHistoryResponse>) => {
          state.loading = false;
          state.history = action.payload;
        }
      )

      // Rejected
      .addCase(fetchVoucherChangeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch voucher change history";
      });
  },
});

/* ================= EXPORTS ================= */

export const { clearVoucherChangeHistory } =
  historySlice.actions;

export default historySlice.reducer;
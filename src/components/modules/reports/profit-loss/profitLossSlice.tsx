import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_PROFIT_LOSS_URL } from "../../../services/apiRoutes";

/* ================= TYPES ================= */

export interface ProfitLossRequest {
  branch_id?: number;
  start_date: string; // e.g. "2026-02-01" or "01/02/2026"
  end_date: string;   // e.g. "2026-02-27" or "27/02/2026"
}

/**
 * NOTE:
 * Your backend "profitLossData" response shape might be different.
 * Keep it flexible, but still typed enough for UI usage.
 */
export interface ProfitLossLine {
  title?: string;
  coa_id?: number;
  name?: string;
  amount: number;
  effect?: "+" | "-";
}

export interface ProfitLossData {
  // Example summary (adjust to your API)
  summary?: {
    opening_stock?: number;
    closing_stock?: number;
    total_income?: number;
    total_expense?: number;
    gross_profit?: number;
    net_profit?: number;
  };

  income?: ProfitLossLine[];
  expense?: ProfitLossLine[];

  // If your API returns anything else
  [key: string]: any;
}

/* ================= STATE ================= */

interface ProfitLossState {
  data: ProfitLossData | null;

  loading: boolean;
  error: string | null;
  message: string | null;

  // For UI progress (0 - 100)
  progress: number;
}

const initialState: ProfitLossState = {
  data: null,

  loading: false,
  error: null,
  message: null,

  progress: 0,
};

/* ================= THUNK ================= */

/**
 * Backend example (your PHP):
 * apiProfitLoss(Request $request) -> returns foundData($data)
 * So we assume response like: { success: true, data: ... }
 */
export const fetchProfitLoss = createAsyncThunk<ProfitLossData,ProfitLossRequest, { rejectValue: string }>("profitLoss/fetchProfitLoss", async (payload, thunkAPI) => {
  try {
    // Optional: show staged progress in UI
    thunkAPI.dispatch(setProfitLossProgress(35));

    // If your endpoint is GET, change to httpService.get and pass params
    const res = await httpService.post(API_REPORT_PROFIT_LOSS_URL, payload);

    // Another staged progress (visual only)
    thunkAPI.dispatch(setProfitLossProgress(65));

    if (res.data?.success === true) {
      // Final step
      thunkAPI.dispatch(setProfitLossProgress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load profit & loss"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || "Request failed");
  }
});

/* ================= SLICE ================= */

const profitLossSlice = createSlice({
  name: "profitLoss",
  initialState,
  reducers: {
    clearProfitLossState(state) {
      state.data = null;

      state.loading = false;
      state.error = null;
      state.message = null;

      state.progress = 0;
    },

    setProfitLossProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },

    clearProfitLossMessage(state) {
      state.message = null;
    },

    clearProfitLossError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfitLoss.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;

        // start progress
        state.progress = 10;
      })
      .addCase(
        fetchProfitLoss.fulfilled,
        (state, action: PayloadAction<ProfitLossData>) => {
          state.loading = false;
          state.data = action.payload;
          state.message = "Profit & loss loaded";
          state.progress = 100;
        }
      )
      .addCase(fetchProfitLoss.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load profit & loss";
        state.progress = 0;
      });
  },
});

/* ================= EXPORT ================= */

export const {clearProfitLossState, setProfitLossProgress, clearProfitLossMessage, clearProfitLossError } = profitLossSlice.actions;
export default profitLossSlice.reducer;
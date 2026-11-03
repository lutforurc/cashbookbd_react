import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_PROFIT_LOSS_DATE_WISE_URL } from "../../../services/apiRoutes";

export interface ProfitLossDateWiseRequest {
  branch_id?: number | string | null;
  start_date: string; // e.g. "2026-02-01"
  end_date: string; // e.g. "2026-02-27"
}

/** One date's slice of the trading account. */
export interface ProfitLossDateWiseRow {
  sl_no?: number;
  vr_date?: string;
  date_display?: string;
  purchase?: number;
  sales?: number;
  profit?: number;
  loss?: number;
}

export interface ProfitLossDateWiseTotals {
  purchase: number;
  sales: number;
  profit: number;
  loss: number;
}

export interface ProfitLossDateWiseData {
  rows: ProfitLossDateWiseRow[];
  /** What the FIFO days cannot carry, so the total lands on the P&L Gross Profit. */
  adjustment?: ProfitLossDateWiseTotals | null;
  totals: ProfitLossDateWiseTotals;
}

const EMPTY: ProfitLossDateWiseData = {
  rows: [],
  adjustment: null,
  totals: { purchase: 0, sales: 0, profit: 0, loss: 0 },
};

interface ProfitLossDateWiseState {
  data: ProfitLossDateWiseData | null;
  isLoading: boolean;
  errors: string | null;
}

const initialState: ProfitLossDateWiseState = {
  data: null,
  isLoading: false,
  errors: null,
};

export const fetchProfitLossDateWise = createAsyncThunk<
  ProfitLossDateWiseData,
  ProfitLossDateWiseRequest,
  { rejectValue: string }
>("profitLossDateWise/fetchProfitLossDateWise", async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_REPORT_PROFIT_LOSS_DATE_WISE_URL, payload);

    // foundData()'s envelope: the payload sits at data.data.
    if (res.data?.success === true) {
      return res.data.data?.data ?? EMPTY;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load date wise profit & loss"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed"
    );
  }
});

const profitLossDateWiseSlice = createSlice({
  name: "profitLossDateWise",
  initialState,
  reducers: {
    clearProfitLossDateWiseState(state) {
      state.data = null;
      state.isLoading = false;
      state.errors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfitLossDateWise.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(
        fetchProfitLossDateWise.fulfilled,
        (state, action: PayloadAction<ProfitLossDateWiseData>) => {
          state.isLoading = false;
          state.data = action.payload;
        }
      )
      .addCase(fetchProfitLossDateWise.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || "Failed to load date wise profit & loss";
      });
  },
});

export const { clearProfitLossDateWiseState } = profitLossDateWiseSlice.actions;
export default profitLossDateWiseSlice.reducer;

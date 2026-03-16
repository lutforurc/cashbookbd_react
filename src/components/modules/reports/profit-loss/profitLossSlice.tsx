import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_PROFIT_LOSS_URL } from "../../../services/apiRoutes";

/* ================= TYPES ================= */

export interface ProfitLossRequest {
  branch_id?: number;
  start_date: string; // e.g. "2026-02-01" or "01/02/2026"
  end_date: string; // e.g. "2026-02-27" or "27/02/2026"
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

/* ============ CLOSING STOCK (NEW) ============ */

/**
 * Backend route:
 * Route::post('reports/closing-stock', [ReportsController::class, 'apiClosingStockItems']);
 */
const API_REPORT_CLOSING_STOCK_URL = "reports/closing-stock";

export interface ClosingStockRequest {
  branch_id?: number;
  start_date: string;
  end_date: string;
}

/**
 * Flexible item type (adjust keys based on your API).
 * Keep numeric fields as number for UI calculations.
 */
export interface ClosingStockItem {
  product_id?: number;
  product_name?: string;

  category_id?: number;
  category_name?: string;

  brand_id?: number;
  brand_name?: string;

  unit_id?: number;
  unit_name?: string;

  qty?: number;
  rate?: number;
  amount?: number;

  // any extra fields from API
  [key: string]: any;
}

export interface ClosingStockData {
  items?: ClosingStockItem[];

  summary?: {
    total_qty?: number;
    total_amount?: number;
  };

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

  /* ============ CLOSING STOCK (NEW) ============ */
  closingStockData: ClosingStockData | null;
  closingStockLoading: boolean;
  closingStockError: string | null;
  closingStockMessage: string | null;
  closingStockProgress: number;
}

const initialState: ProfitLossState = {
  data: null,

  loading: false,
  error: null,
  message: null,

  progress: 0,

  /* ============ CLOSING STOCK (NEW) ============ */
  closingStockData: null,
  closingStockLoading: false,
  closingStockError: null,
  closingStockMessage: null,
  closingStockProgress: 0,
};

/* ================= THUNK ================= */

/**
 * Backend example (your PHP):
 * apiProfitLoss(Request $request) -> returns foundData($data)
 * So we assume response like: { success: true, data: ... }
 */
export const fetchProfitLoss = createAsyncThunk<ProfitLossData, ProfitLossRequest, { rejectValue: string } >("profitLoss/fetchProfitLoss", async (payload, thunkAPI) => {
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
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed"
    );
  }
});

/* ============ CLOSING STOCK THUNK (NEW) ============ */

export const fetchClosingStockItems = createAsyncThunk<ClosingStockData, ClosingStockRequest, { rejectValue: string }>("profitLoss/fetchClosingStockItems", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setClosingStockProgress(35));

    const res = await httpService.post(API_REPORT_CLOSING_STOCK_URL, payload);

    thunkAPI.dispatch(setClosingStockProgress(65));

    if (res.data?.success === true) {
      thunkAPI.dispatch(setClosingStockProgress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load closing stock"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed"
    );
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

    /* ============ CLOSING STOCK REDUCERS (NEW) ============ */

    clearClosingStockState(state) {
      state.closingStockData = null;

      state.closingStockLoading = false;
      state.closingStockError = null;
      state.closingStockMessage = null;

      state.closingStockProgress = 0;
    },

    setClosingStockProgress(state, action: PayloadAction<number>) {
      state.closingStockProgress = action.payload;
    },

    clearClosingStockMessage(state) {
      state.closingStockMessage = null;
    },

    clearClosingStockError(state) {
      state.closingStockError = null;
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
      })

      /* ============ CLOSING STOCK EXTRA REDUCERS (NEW) ============ */
      .addCase(fetchClosingStockItems.pending, (state) => {
        state.closingStockLoading = true;
        state.closingStockError = null;
        state.closingStockMessage = null;
        state.closingStockProgress = 10;
      })
      .addCase(
        fetchClosingStockItems.fulfilled,
        (state, action: PayloadAction<ClosingStockData>) => {
          state.closingStockLoading = false;
          state.closingStockData = action.payload;
          state.closingStockMessage = "Closing stock loaded";
          state.closingStockProgress = 100;
        }
      )
      .addCase(fetchClosingStockItems.rejected, (state, action) => {
        state.closingStockLoading = false;
        state.closingStockError = action.payload || "Failed to load closing stock";
        state.closingStockProgress = 0;
      });
  },
});

/* ================= EXPORT ================= */

export const {
  clearProfitLossState,
  setProfitLossProgress,
  clearProfitLossMessage,
  clearProfitLossError,

  // Closing stock exports (NEW)
  clearClosingStockState,
  setClosingStockProgress,
  clearClosingStockMessage,
  clearClosingStockError,
} = profitLossSlice.actions;

export default profitLossSlice.reducer;

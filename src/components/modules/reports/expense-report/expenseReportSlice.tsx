import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_REPORT_EXPENSE_URL,
  API_REPORT_EXPENSE_DETAILS_URL,
} from "../../../services/apiRoutes";

/* ================= TYPES ================= */

/**
 * The group rows and the detail rows are asked for with exactly the same three
 * parameters. The detail endpoint deliberately takes no ledger id: it returns
 * the level 4 rows for every expense group in one response, so the group totals
 * and the rows beneath them always come from the same reading of the ledger and
 * can never disagree with one another.
 */
export interface ExpenseReportRequest {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseReportDetailsRequest {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseReportState {
  data: any;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;

  /* The level 4 drill down rows, kept beside the group rows but on their own
   * loading and error fields so a slow or failed detail fetch never blanks the
   * group table the user is already reading. */
  detailData: any;
  detailLoading: boolean;
  detailError: string | null;
  detailMessage: string | null;
  detailProgress: number;
}

const initialState: ExpenseReportState = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,

  detailData: null,
  detailLoading: false,
  detailError: null,
  detailMessage: null,
  detailProgress: 0,
};

/* ================= THUNKS ================= */

/**
 * The group rows: one line per level 3 expense head, carrying opening,
 * movement and closing on both sides.
 */
export const fetchExpenseReport = createAsyncThunk<
  any,
  ExpenseReportRequest,
  { rejectValue: string }
>("expenseReport/fetchExpenseReport", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setExpenseReportProgress(35));

    const res = await httpService.get(API_REPORT_EXPENSE_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setExpenseReportProgress(65));

    // The endpoint answers with a bare array, but the same three shapes are
    // accepted here as on the trial balance screens so a later change of
    // envelope on the server does not empty the report without warning.
    if (Array.isArray(res.data)) {
      thunkAPI.dispatch(setExpenseReportProgress(100));
      return res.data;
    }

    if (Array.isArray(res.data?.data)) {
      thunkAPI.dispatch(setExpenseReportProgress(100));
      return res.data.data;
    }

    if (res.data?.success === true) {
      thunkAPI.dispatch(setExpenseReportProgress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load Expense Report",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

/**
 * The detail rows: every level 4 account under every expense group, fetched in
 * a single call. The screen filters them by parent group when a row is opened,
 * and the print view walks the whole set, so one fetch serves both.
 */
export const fetchExpenseReportDetails = createAsyncThunk<
  any,
  ExpenseReportDetailsRequest,
  { rejectValue: string }
>("expenseReport/fetchExpenseReportDetails", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setExpenseReportDetailsProgress(35));

    const res = await httpService.get(API_REPORT_EXPENSE_DETAILS_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setExpenseReportDetailsProgress(65));

    if (Array.isArray(res.data)) {
      thunkAPI.dispatch(setExpenseReportDetailsProgress(100));
      return res.data;
    }

    if (Array.isArray(res.data?.data)) {
      thunkAPI.dispatch(setExpenseReportDetailsProgress(100));
      return res.data.data;
    }

    if (res.data?.success === true) {
      thunkAPI.dispatch(setExpenseReportDetailsProgress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load Expense Report details",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

/* ================= SLICE ================= */

const expenseReportSlice = createSlice({
  name: "expenseReport",
  initialState,
  reducers: {
    clearExpenseReportState(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setExpenseReportProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearExpenseReportMessage(state) {
      state.message = null;
    },
    clearExpenseReportError(state) {
      state.error = null;
    },

    /* ---- the drill down half, cleared on its own ---- */

    clearExpenseReportDetailsState(state) {
      state.detailData = null;
      state.detailLoading = false;
      state.detailError = null;
      state.detailMessage = null;
      state.detailProgress = 0;
    },
    setExpenseReportDetailsProgress(state, action: PayloadAction<number>) {
      state.detailProgress = action.payload;
    },
    clearExpenseReportDetailsMessage(state) {
      state.detailMessage = null;
    },
    clearExpenseReportDetailsError(state) {
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenseReport.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(fetchExpenseReport.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.message = "Expense Report loaded";
        state.progress = 100;
      })
      .addCase(fetchExpenseReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load Expense Report";
        state.progress = 0;
      })

      .addCase(fetchExpenseReportDetails.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailMessage = null;
        state.detailProgress = 10;
      })
      .addCase(fetchExpenseReportDetails.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detailData = action.payload;
        state.detailMessage = "Expense Report details loaded";
        state.detailProgress = 100;
      })
      .addCase(fetchExpenseReportDetails.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError =
          action.payload || "Failed to load Expense Report details";
        state.detailProgress = 0;
      });
  },
});

/* ================= EXPORT ================= */

export const {
  clearExpenseReportState,
  setExpenseReportProgress,
  clearExpenseReportMessage,
  clearExpenseReportError,

  clearExpenseReportDetailsState,
  setExpenseReportDetailsProgress,
  clearExpenseReportDetailsMessage,
  clearExpenseReportDetailsError,
} = expenseReportSlice.actions;

export default expenseReportSlice.reducer;

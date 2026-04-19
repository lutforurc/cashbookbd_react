import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_BALANCE_SHEET_URL } from "../../../services/apiRoutes";

export interface BalanceSheetRequest {
  branchId?: number;
  startDate: string;
  endDate: string;
}

export interface BalanceSheetItem {
  coa4_id?: number | null;
  name?: string;
  balance?: number | string;
}

export interface BalanceSheetGroup {
  group_name?: string;
  total?: number | string;
  items?: BalanceSheetItem[];
}

export interface BalanceSheetTotals {
  assets?: number | string;
  liabilities?: number | string;
  equity?: number | string;
  liabilities_and_equity?: number | string;
  difference?: number | string;
}

export interface BalanceSheetData {
  assets?: BalanceSheetGroup[];
  liabilities?: BalanceSheetGroup[];
  equity?: BalanceSheetGroup[];
  totals?: BalanceSheetTotals;
  report_date?: {
    start_date?: string;
    end_date?: string;
    as_on_date?: string;
  };
  branch_id?: number;
  [key: string]: any;
}

interface BalanceSheetState {
  data: BalanceSheetData | null;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;
}

const initialState: BalanceSheetState = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,
};

export const fetchBalanceSheet = createAsyncThunk<
  BalanceSheetData,
  BalanceSheetRequest,
  { rejectValue: string }
>("balanceSheet/fetchBalanceSheet", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setBalanceSheetProgress(35));
    const res = await httpService.post(API_REPORT_BALANCE_SHEET_URL, payload);
    thunkAPI.dispatch(setBalanceSheetProgress(65));

    if (res.data?.success === true) {
      thunkAPI.dispatch(setBalanceSheetProgress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load balance sheet",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

const balanceSheetSlice = createSlice({
  name: "balanceSheet",
  initialState,
  reducers: {
    clearBalanceSheetState(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setBalanceSheetProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearBalanceSheetMessage(state) {
      state.message = null;
    },
    clearBalanceSheetError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalanceSheet.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(
        fetchBalanceSheet.fulfilled,
        (state, action: PayloadAction<BalanceSheetData>) => {
          state.loading = false;
          state.data = action.payload;
          state.message = "Balance sheet loaded";
          state.progress = 100;
        },
      )
      .addCase(fetchBalanceSheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load balance sheet";
        state.progress = 0;
      });
  },
});

export const {
  clearBalanceSheetState,
  setBalanceSheetProgress,
  clearBalanceSheetMessage,
  clearBalanceSheetError,
} = balanceSheetSlice.actions;

export default balanceSheetSlice.reducer;

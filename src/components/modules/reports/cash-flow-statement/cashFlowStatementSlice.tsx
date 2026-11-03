import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_CASH_FLOW_STATEMENT_URL } from "../../../services/apiRoutes";

export interface CashFlowStatementRequest {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface CashFlowStatementState {
  data: any;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;
}

const initialState: CashFlowStatementState = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,
};

export const fetchCashFlowStatement = createAsyncThunk<
  any,
  CashFlowStatementRequest,
  { rejectValue: string }
>("cashFlowStatement/fetchCashFlowStatement", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setCashFlowStatementProgress(35));

    const res = await httpService.get(API_REPORT_CASH_FLOW_STATEMENT_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setCashFlowStatementProgress(100));

    if (res.data?.success === true) {
      return res.data.data?.data ?? null;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load the Cash Flow Statement",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

const cashFlowStatementSlice = createSlice({
  name: "cashFlowStatement",
  initialState,
  reducers: {
    clearCashFlowStatementState(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setCashFlowStatementProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearCashFlowStatementError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCashFlowStatement.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(fetchCashFlowStatement.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.message = "Cash Flow Statement loaded";
        state.progress = 100;
      })
      .addCase(fetchCashFlowStatement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load the Cash Flow Statement";
        state.progress = 0;
      });
  },
});

export const {
  clearCashFlowStatementState,
  setCashFlowStatementProgress,
  clearCashFlowStatementError,
} = cashFlowStatementSlice.actions;

export default cashFlowStatementSlice.reducer;

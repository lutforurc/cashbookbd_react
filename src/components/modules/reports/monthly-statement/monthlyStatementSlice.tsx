import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_MONTHLY_STATEMENT_URL } from "../../../services/apiRoutes";

export interface MonthlyStatementRequest {
  branch_id?: number | string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
}

export interface StatementLine {
  key: string;
  title: string;
  amount: number;
}

export interface BankLine {
  name: string;
  opening: number;
  deposit: number;
  withdraw: number;
  closing: number;
}

export interface MonthlyStatementData {
  from: string;
  to: string;
  /** Cash in hand only: Opening + Total Credit - Total Debit = Closing. */
  cash: {
    opening: number;
    credit: StatementLine[];
    debit: StatementLine[];
    total_credit: number;
    total_debit: number;
    closing: number;
  };
  /** Business that moved no cash -- shown, added to neither side. */
  memo: StatementLine[];
  bank: {
    rows: BankLine[];
    totals: Omit<BankLine, "name">;
  };
  /** The Profit & Loss Account for the same range. */
  profit: {
    net_sales: number;
    cost_of_sales: number;
    gross_profit: number;
    other_income: number;
    expenses: number;
    net_profit: number;
  };
}

interface MonthlyStatementState {
  data: MonthlyStatementData | null;
  isLoading: boolean;
  errors: string | null;
}

const initialState: MonthlyStatementState = {
  data: null,
  isLoading: false,
  errors: null,
};

export const fetchMonthlyStatement = createAsyncThunk<
  MonthlyStatementData,
  MonthlyStatementRequest,
  { rejectValue: string }
>("monthlyStatement/fetchMonthlyStatement", async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_REPORT_MONTHLY_STATEMENT_URL, payload);

    // foundData()'s envelope: the payload sits at data.data.
    if (res.data?.success === true && res.data.data?.data) {
      return res.data.data.data;
    }

    return thunkAPI.rejectWithValue(res.data?.message || "Failed to load monthly statement");
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed"
    );
  }
});

const monthlyStatementSlice = createSlice({
  name: "monthlyStatement",
  initialState,
  reducers: {
    clearMonthlyStatementState(state) {
      state.data = null;
      state.isLoading = false;
      state.errors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonthlyStatement.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(
        fetchMonthlyStatement.fulfilled,
        (state, action: PayloadAction<MonthlyStatementData>) => {
          state.isLoading = false;
          state.data = action.payload;
        }
      )
      .addCase(fetchMonthlyStatement.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || "Failed to load monthly statement";
      });
  },
});

export const { clearMonthlyStatementState } = monthlyStatementSlice.actions;
export default monthlyStatementSlice.reducer;

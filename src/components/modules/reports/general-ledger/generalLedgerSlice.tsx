import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_GENERAL_LEDGER_URL } from "../../../services/apiRoutes";

export interface GeneralLedgerRequest {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
  coa4_id?: number | null;
  page?: number;
  per_page?: number;
}

export interface GeneralLedgerState {
  data: any;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;
}

const initialState: GeneralLedgerState = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,
};

export const fetchGeneralLedger = createAsyncThunk<
  any,
  GeneralLedgerRequest,
  { rejectValue: string }
>("generalLedger/fetchGeneralLedger", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setGeneralLedgerProgress(35));

    const res = await httpService.get(API_REPORT_GENERAL_LEDGER_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setGeneralLedgerProgress(100));

    if (res.data?.success === true) {
      return res.data.data?.data ?? null;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load the General Ledger",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

const generalLedgerSlice = createSlice({
  name: "generalLedger",
  initialState,
  reducers: {
    clearGeneralLedgerState(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setGeneralLedgerProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearGeneralLedgerError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeneralLedger.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(fetchGeneralLedger.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.message = "General Ledger loaded";
        state.progress = 100;
      })
      .addCase(fetchGeneralLedger.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load the General Ledger";
        state.progress = 0;
      });
  },
});

export const {
  clearGeneralLedgerState,
  setGeneralLedgerProgress,
  clearGeneralLedgerError,
} = generalLedgerSlice.actions;

export default generalLedgerSlice.reducer;

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_TRIAL_BALANCE_LEVEL4_URL } from "../../../services/apiRoutes";

export interface TrialBalanceLevel4Request {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface TrialBalanceLevel4State {
  data: any;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;
}

const initialState: TrialBalanceLevel4State = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,
};

export const fetchTrialBalanceLevel4 = createAsyncThunk<
  any,
  TrialBalanceLevel4Request,
  { rejectValue: string }
>("trialBalanceLevel4/fetchTrialBalanceLevel4", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setTrialBalanceLevel4Progress(35));

    const res = await httpService.get(API_REPORT_TRIAL_BALANCE_LEVEL4_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setTrialBalanceLevel4Progress(65));

    if (Array.isArray(res.data)) {
      thunkAPI.dispatch(setTrialBalanceLevel4Progress(100));
      return res.data;
    }

    if (Array.isArray(res.data?.data)) {
      thunkAPI.dispatch(setTrialBalanceLevel4Progress(100));
      return res.data.data;
    }

    if (res.data?.success === true) {
      thunkAPI.dispatch(setTrialBalanceLevel4Progress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load Trial Balance Details",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

const trialBalanceLevel4Slice = createSlice({
  name: "trialBalanceLevel4",
  initialState,
  reducers: {
    clearTrialBalanceLevel4State(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setTrialBalanceLevel4Progress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearTrialBalanceLevel4Message(state) {
      state.message = null;
    },
    clearTrialBalanceLevel4Error(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrialBalanceLevel4.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(fetchTrialBalanceLevel4.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.message = "Trial Balance Details loaded";
        state.progress = 100;
      })
      .addCase(fetchTrialBalanceLevel4.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load Trial Balance Details";
        state.progress = 0;
      });
  },
});

export const {
  clearTrialBalanceLevel4State,
  setTrialBalanceLevel4Progress,
  clearTrialBalanceLevel4Message,
  clearTrialBalanceLevel4Error,
} = trialBalanceLevel4Slice.actions;

export default trialBalanceLevel4Slice.reducer;

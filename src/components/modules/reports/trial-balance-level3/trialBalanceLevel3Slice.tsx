import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REPORT_TRIAL_BALANCE_LEVEL3_URL } from "../../../services/apiRoutes";

export interface TrialBalanceLevel3Request {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface TrialBalanceLevel3State {
  data: any;
  loading: boolean;
  error: string | null;
  message: string | null;
  progress: number;
}

const initialState: TrialBalanceLevel3State = {
  data: null,
  loading: false,
  error: null,
  message: null,
  progress: 0,
};

export const fetchTrialBalanceLevel3 = createAsyncThunk<
  any,
  TrialBalanceLevel3Request,
  { rejectValue: string }
>("trialBalanceLevel3/fetchTrialBalanceLevel3", async (payload, thunkAPI) => {
  try {
    thunkAPI.dispatch(setTrialBalanceLevel3Progress(35));

    const res = await httpService.get(API_REPORT_TRIAL_BALANCE_LEVEL3_URL, {
      params: payload,
    });

    thunkAPI.dispatch(setTrialBalanceLevel3Progress(65));

    if (Array.isArray(res.data)) {
      thunkAPI.dispatch(setTrialBalanceLevel3Progress(100));
      return res.data;
    }

    if (Array.isArray(res.data?.data)) {
      thunkAPI.dispatch(setTrialBalanceLevel3Progress(100));
      return res.data.data;
    }

    if (res.data?.success === true) {
      thunkAPI.dispatch(setTrialBalanceLevel3Progress(100));
      return res.data.data;
    }

    return thunkAPI.rejectWithValue(
      res.data?.message || "Failed to load Trial Balance Group",
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || "Request failed",
    );
  }
});

const trialBalanceLevel3Slice = createSlice({
  name: "trialBalanceLevel3",
  initialState,
  reducers: {
    clearTrialBalanceLevel3State(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.message = null;
      state.progress = 0;
    },
    setTrialBalanceLevel3Progress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    clearTrialBalanceLevel3Message(state) {
      state.message = null;
    },
    clearTrialBalanceLevel3Error(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrialBalanceLevel3.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.progress = 10;
      })
      .addCase(fetchTrialBalanceLevel3.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.message = "Trial Balance Group loaded";
        state.progress = 100;
      })
      .addCase(fetchTrialBalanceLevel3.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load Trial Balance Group";
        state.progress = 0;
      });
  },
});

export const {
  clearTrialBalanceLevel3State,
  setTrialBalanceLevel3Progress,
  clearTrialBalanceLevel3Message,
  clearTrialBalanceLevel3Error,
} = trialBalanceLevel3Slice.actions;

export default trialBalanceLevel3Slice.reducer;

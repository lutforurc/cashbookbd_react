import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_FESTIVAL_BONUS_GENERATE_URL,
  API_FESTIVAL_BONUS_PAYMENT_URL,
  API_FESTIVAL_BONUS_SHEET_PRINT_URL,
  API_FESTIVAL_BONUS_SHEET_URL,
  API_FESTIVAL_BONUS_VIEW_URL,
} from "../../../services/apiRoutes";

type BonusState = {
  bonusEmployees: any[];
  bonusSheet: any;
  bonusPrintSheet: any;
  loading: boolean;
  error: string | null;
  message: string | null;
};

const initialState: BonusState = {
  bonusEmployees: [],
  bonusSheet: null,
  bonusPrintSheet: null,
  loading: false,
  error: null,
  message: null,
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const festivalBonusView = createAsyncThunk<any, any, { rejectValue: string }>(
  "festivalBonus/festivalBonusView",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await httpService.post(API_FESTIVAL_BONUS_VIEW_URL, payload);
      if (res.data?.success === true) {
        return res.data;
      }
      return rejectWithValue(res.data?.message || "No bonus data found");
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch bonus data"));
    }
  }
);

export const festivalBonusGenerate = createAsyncThunk<any, any, { rejectValue: string }>(
  "festivalBonus/festivalBonusGenerate",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await httpService.post(API_FESTIVAL_BONUS_GENERATE_URL, payload);
      if (res.data?.success === true) {
        return res.data;
      }
      return rejectWithValue(res.data?.message || "Bonus generation failed");
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to generate bonus"));
    }
  }
);

export const fetchFestivalBonusSheet = createAsyncThunk<any, any, { rejectValue: string }>(
  "festivalBonus/fetchFestivalBonusSheet",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await httpService.post(API_FESTIVAL_BONUS_SHEET_URL, payload);
      if (res.data?.success === true) {
        return res.data;
      }
      return rejectWithValue(res.data?.message || "No bonus sheet found");
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch bonus sheet"));
    }
  }
);

export const festivalBonusSheetPrint = createAsyncThunk<any, any, { rejectValue: string }>(
  "festivalBonus/festivalBonusSheetPrint",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await httpService.post(API_FESTIVAL_BONUS_SHEET_PRINT_URL, payload);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to load bonus sheet"));
    }
  }
);

export const festivalBonusPayment = createAsyncThunk<any, any, { rejectValue: string }>(
  "festivalBonus/festivalBonusPayment",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await httpService.post(API_FESTIVAL_BONUS_PAYMENT_URL, payload);
      if (res.data?.success === true) {
        return res.data;
      }
      return rejectWithValue(res.data?.message || "Bonus payment failed");
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, "Failed to pay bonus"));
    }
  }
);

const bonusSlice = createSlice({
  name: "festivalBonus",
  initialState,
  reducers: {
    clearFestivalBonusState(state) {
      state.bonusEmployees = [];
      state.bonusSheet = null;
      state.bonusPrintSheet = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(festivalBonusView.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(festivalBonusView.fulfilled, (state, action) => {
        state.loading = false;
        state.bonusEmployees = action.payload?.data?.data || [];
        state.message = action.payload?.message || "Bonus data fetched successfully";
      })
      .addCase(festivalBonusView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch bonus data";
      })
      .addCase(festivalBonusGenerate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(festivalBonusGenerate.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Festival bonus generated successfully";
      })
      .addCase(festivalBonusGenerate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to generate festival bonus";
      })
      .addCase(fetchFestivalBonusSheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFestivalBonusSheet.fulfilled, (state, action) => {
        state.loading = false;
        state.bonusSheet = action.payload;
        state.message = action.payload?.message || "Festival bonus sheet loaded";
      })
      .addCase(fetchFestivalBonusSheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch festival bonus sheet";
      })
      .addCase(festivalBonusSheetPrint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(festivalBonusSheetPrint.fulfilled, (state, action) => {
        state.loading = false;
        state.bonusPrintSheet = action.payload;
      })
      .addCase(festivalBonusSheetPrint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to print festival bonus sheet";
      })
      .addCase(festivalBonusPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(festivalBonusPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Festival bonus payment completed successfully";
      })
      .addCase(festivalBonusPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to process bonus payment";
      });
  },
});

export const { clearFestivalBonusState } = bonusSlice.actions;

export default bonusSlice.reducer;

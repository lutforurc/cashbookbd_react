import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { SalePricingPayload, SoldUnitsFilters, SoldUnitsResult } from "./types";
import {
  API_UNIT_SALE_SOLD_UNITS_URL,
  API_UNIT_SALE_STORE_URL,
} from "../../../services/apiRoutes";

/* ================= STATE ================= */

interface UnitSaleState {
  loading: boolean;
  success: boolean;
  error: string | null;
  message: string | null;
  lastSaleId: number | null;
  soldUnits: SoldUnitsResult;
  soldUnitsLoading: boolean;
  soldUnitsError: string | null;
}

const emptySoldUnits: SoldUnitsResult = {
  data: [],
  totals: {
    customer_count: 0,
    unit_count: 0,
    parking_count: 0,
    unit_price_amount: 0,
    parking_amount: 0,
    total_amount: 0,
    received_amount: 0,
    due_amount: 0,
  },
};

const initialState: UnitSaleState = {
  loading: false,
  success: false,
  error: null,
  message: null,
  lastSaleId: null,
  soldUnits: emptySoldUnits,
  soldUnitsLoading: false,
  soldUnitsError: null,
};

/* ================= ASYNC THUNK ================= */

export const storeSalePricing = createAsyncThunk<
  { success: boolean; sale_id?: number; message?: string },
  SalePricingPayload,
  { rejectValue: string }
>(
  "unitSale/store",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await httpService.post(
        API_UNIT_SALE_STORE_URL,
        payload
      );

      if (response.data?.success === true) {
        return response.data;
      }

      return rejectWithValue(
        response.data?.message || "Unit sale transaction failed"
      );
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error.message ||
          "Unit sale transaction failed"
      );
    }
  }
);

/* ---- Customer wise sold unit list ---- */
export const fetchSoldUnits = createAsyncThunk<
  SoldUnitsResult,
  SoldUnitsFilters | undefined,
  { rejectValue: string }
>("unitSale/soldUnits", async (filters, { rejectWithValue }) => {
  try {
    const response = await httpService.get(API_UNIT_SALE_SOLD_UNITS_URL, {
      params: filters ?? {},
    });

    if (response.data?.success === true) {
      const payload = response.data?.data?.data;
      return {
        data: payload?.data ?? [],
        totals: payload?.totals ?? emptySoldUnits.totals,
      };
    }

    return rejectWithValue(
      response.data?.message || "Failed to load sold unit list"
    );
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load sold unit list"
    );
  }
});

/* ================= SLICE ================= */

const unitSaleSlice = createSlice({
  name: "unitSale",
  initialState,
  reducers: {
    clearUnitSaleState(state) {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.message = null;
      state.lastSaleId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(storeSalePricing.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(storeSalePricing.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message =
          action.payload?.message ||
          "Unit sale transaction saved successfully";
        state.lastSaleId = action.payload?.sale_id || null;
      })
      .addCase(storeSalePricing.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || "Unit sale transaction failed";
      })
      .addCase(fetchSoldUnits.pending, (state) => {
        state.soldUnitsLoading = true;
        state.soldUnitsError = null;
      })
      .addCase(fetchSoldUnits.fulfilled, (state, action) => {
        state.soldUnitsLoading = false;
        state.soldUnits = action.payload;
      })
      .addCase(fetchSoldUnits.rejected, (state, action) => {
        state.soldUnitsLoading = false;
        state.soldUnits = emptySoldUnits;
        state.soldUnitsError = action.payload || "Failed to load sold unit list";
      });
  },
});

export const { clearUnitSaleState } = unitSaleSlice.actions;
export default unitSaleSlice.reducer;

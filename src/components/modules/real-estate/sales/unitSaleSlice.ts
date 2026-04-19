import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { SalePricingPayload } from "./types";
import { API_UNIT_SALE_STORE_URL } from "../../../services/apiRoutes";

/* ================= STATE ================= */

interface UnitSaleState {
  loading: boolean;
  success: boolean;
  error: string | null;
  message: string | null;
  lastSaleId: number | null;
}

const initialState: UnitSaleState = {
  loading: false,
  success: false,
  error: null,
  message: null,
  lastSaleId: null,
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
      });
  },
});

export const { clearUnitSaleState } = unitSaleSlice.actions;
export default unitSaleSlice.reducer;

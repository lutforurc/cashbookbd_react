import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  SaleEditData,
  SalePricingPayload,
  SaleUpdatePayload,
  SoldUnitsFilters,
  SoldUnitsResult,
} from "./types";
import {
  API_UNIT_SALE_CANCEL_URL,
  API_UNIT_SALE_EDIT_URL,
  API_UNIT_SALE_SOLD_UNITS_URL,
  API_UNIT_SALE_STORE_URL,
  API_UNIT_SALE_UPDATE_URL,
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
  reportInvalidationTimestamp: number;
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
  reportInvalidationTimestamp: 0,
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

/* ---- Correcting a sale already on the books ---- */

/**
 * The sale as the pricing screen needs it back, plus the reasons a box on it
 * might be shut — an approved voucher, money already taken, papers issued.
 */
export const fetchSaleForEdit = createAsyncThunk<
  SaleEditData,
  number,
  { rejectValue: string }
>("unitSale/edit", async (saleId, { rejectWithValue }) => {
  try {
    const response = await httpService.get(`${API_UNIT_SALE_EDIT_URL}${saleId}`);
    const payload = response?.data?.data?.data;

    if (response.data?.success === true && payload?.sale) {
      return payload as SaleEditData;
    }

    return rejectWithValue(response.data?.message || "Could not load this sale");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Could not load this sale"
    );
  }
});

/**
 * Writes the corrected figure back onto the sale's own invoice.
 *
 * Rejects with the server's own sentence rather than a generic one: the refusals
 * that matter here say something the clerk has to act on — the voucher is
 * approved, or the money already received is more than the new total.
 */
export const updateSalePricing = createAsyncThunk<
  { success: boolean; message?: string },
  { saleId: number; payload: SaleUpdatePayload },
  { rejectValue: string }
>("unitSale/updateSale", async ({ saleId, payload }, { rejectWithValue }) => {
  try {
    const response = await httpService.post(
      `${API_UNIT_SALE_UPDATE_URL}${saleId}`,
      payload
    );

    if (response.data?.success === true) {
      return response.data;
    }

    return rejectWithValue(response.data?.message || "Could not update the sale");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Could not update the sale"
    );
  }
});

/**
 * Withdraws a sale altogether.
 *
 * The reason is not optional: a flat that is suddenly for sale again gets asked
 * about, and the answer belongs on the record rather than in somebody's memory.
 *
 * The refusals matter more here than anywhere else on this screen — an issued
 * letter, a live installment schedule, a receipt taken afterwards — so the
 * server's own sentence is what gets shown.
 */
export const cancelSale = createAsyncThunk<
  { success: boolean; message?: string },
  { saleId: number; reason: string },
  { rejectValue: string }
>("unitSale/cancel", async ({ saleId, reason }, { rejectWithValue }) => {
  try {
    const response = await httpService.post(
      `${API_UNIT_SALE_CANCEL_URL}${saleId}`,
      { reason }
    );

    if (response.data?.success === true) {
      return response.data;
    }

    return rejectWithValue(response.data?.message || "Could not cancel the sale");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Could not cancel the sale"
    );
  }
});

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
      // An update shares `loading` with a save: it is the same Save button on
      // the same screen, and it must be just as unclickable while it runs.
      .addCase(updateSalePricing.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSalePricing.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload?.message || "Sale updated successfully";
        state.reportInvalidationTimestamp = Date.now();
      })
      .addCase(updateSalePricing.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || "Could not update the sale";
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

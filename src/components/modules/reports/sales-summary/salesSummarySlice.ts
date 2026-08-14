import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_REAL_ESTATE_SALES_SUMMARY_URL } from "../../../services/apiRoutes";

/* ================= TYPES ================= */

/** One sale under a buyer: where the flat is, and which one it is. */
export interface SalesSummaryUnit {
  sale_id: number;
  area_name: string | null;
  project_name: string | null;
  building_name: string | null;
  floor_name: string | null;
  unit_no: string | null;
  parking_no: string | null;
}

/** One line of the report: a buyer, what they bought, and what they owe. */
export interface SalesSummaryCustomer {
  customer_id: number;
  customer_name: string;
  customer_mobile: string | null;
  units: SalesSummaryUnit[];
  total_amount: number;
  received_amount: number;
  due_amount: number;
}

export interface SalesSummaryTotals {
  customer_count: number;
  total_amount: number;
  received_amount: number;
  due_amount: number;
}

export interface SalesSummaryFilters {
  area_id?: number;
  project_id?: number;
  building_id?: number;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  q?: string;
  due_only?: boolean;
}

export interface SalesSummaryResult {
  data: SalesSummaryCustomer[];
  totals: SalesSummaryTotals;
}

/* ================= STATE ================= */

interface SalesSummaryState {
  rows: SalesSummaryResult;
  loading: boolean;
  error: string | null;
}

const emptyResult: SalesSummaryResult = {
  data: [],
  totals: {
    customer_count: 0,
    total_amount: 0,
    received_amount: 0,
    due_amount: 0,
  },
};

const initialState: SalesSummaryState = {
  rows: emptyResult,
  loading: false,
  error: null,
};

/* ================= ASYNC THUNK ================= */

/**
 * The report's own endpoint, not the sold-units list's.
 *
 * Kept separate because the permission is separate: this one answers only to
 * real.estate.sales.summary, so a role that may enter a sale but not read the
 * whole sales book gets a 403 here while its own screens keep working.
 */
export const fetchSalesSummary = createAsyncThunk<
  SalesSummaryResult,
  SalesSummaryFilters | undefined,
  { rejectValue: string }
>("salesSummary/fetch", async (filters, { rejectWithValue }) => {
  try {
    const response = await httpService.get(API_REAL_ESTATE_SALES_SUMMARY_URL, {
      params: filters ?? {},
    });

    if (response.data?.success === true) {
      const payload = response.data?.data?.data;
      return {
        data: payload?.data ?? [],
        totals: payload?.totals ?? emptyResult.totals,
      };
    }

    return rejectWithValue(
      response.data?.message || "Failed to load sales summary"
    );
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load sales summary"
    );
  }
});

/* ================= SLICE ================= */

const salesSummarySlice = createSlice({
  name: "salesSummary",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload;
      })
      .addCase(fetchSalesSummary.rejected, (state, action) => {
        state.loading = false;
        // Cleared rather than left standing: a refused or failed read must not
        // leave the previous filter's figures on screen under new headings.
        state.rows = emptyResult;
        state.error = action.payload || "Failed to load sales summary";
      });
  },
});

export default salesSummarySlice.reducer;

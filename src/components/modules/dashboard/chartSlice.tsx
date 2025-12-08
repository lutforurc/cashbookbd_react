import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import {
  API_BRANCH_PURCHASE_SALES_CHART_URL,
  API_BRANCH_TRANSACTION_CHART_URL,
  API_HEAD_OFFICE_PAYMENT_CHART_URL,
  API_HEAD_OFFICE_RECEIVED_CHART_URL,
  API_ITEM_COMPARE_CHART_URL,
} from "../../services/apiRoutes";

/* =========================================
✅ Branch Transaction Chart
========================================= */
export const getBranchChart = createAsyncThunk(
  "getBranchChart/fetch",
  async (params, { rejectWithValue }) => {
    try {
      const { month = 12, branch = "" } = params || {};
      const { data } = await httpService.get(
        `${API_BRANCH_TRANSACTION_CHART_URL}?month=${month}&branch=${branch}`
      );
      return data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch branch transaction chart",
      });
    }
  }
);

/* =========================================
✅ Monthly Purchase Sales
========================================= */
export const getMonthlyPurchaseSales = createAsyncThunk(
  "getMonthlyPurchaseSales/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(
        `${API_BRANCH_PURCHASE_SALES_CHART_URL}`
      );
      return data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch monthly purchase sales",
      });
    }
  }
);

/* =========================================
✅ Head Office Payment Chart
========================================= */
export const getHeadOfficePaymentChart = createAsyncThunk(
  "getHeadOfficePaymentChart/fetch",
  async (params, { rejectWithValue }) => {
    try {
      const { month = 12, branch = "" } = params || {};
      const { data } = await httpService.get(
        `${API_HEAD_OFFICE_PAYMENT_CHART_URL}?month=${month}&branch=${branch}`
      );
      return data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch head office payment chart",
      });
    }
  }
);

/* =========================================
✅ Head Office Received Chart
========================================= */
export const getHeadOfficeReceivedChart = createAsyncThunk(
  "getHeadOfficeReceivedChart/fetch",
  async (params, { rejectWithValue }) => {
    try {
      const { month = 12, branch = "" } = params || {};
      const { data } = await httpService.get(
        `${API_HEAD_OFFICE_RECEIVED_CHART_URL}?month=${month}&branch=${branch}`
      );
      return data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch head office received chart",
      });
    }
  }
);

/* =========================================
✅ Item Compare Chart
========================================= */
export const getCompare = createAsyncThunk(
  "compare/fetch",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await httpService.post(
        API_ITEM_COMPARE_CHART_URL,
        payload
      );
      return data.data; // ✅ IMPORTANT → only inner data return
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch compare transaction",
      });
    }
  }
);

/* =========================================
✅ SLICE
========================================= */
const chartSlice = createSlice({
  name: "chartProperties",
  initialState: {
    loading: false,

    transactionChart: {},   // ✅ object
    compareData: null,      // ✅ object
    headOfficePayment: {},  // ✅ object
    headOfficeReceived: {}, // ✅ object
    purchaseSales: {},      // ✅ object

    error: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ===== ✅ COMPARE ===== */
      .addCase(getCompare.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCompare.fulfilled, (state, action) => {
        state.loading = false;
        state.compareData = action.payload; // ✅ FIXED
      })
      .addCase(getCompare.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Compare failed";
      })

      /* ===== ✅ BRANCH CHART ===== */
      .addCase(getBranchChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBranchChart.fulfilled, (state, action) => {
        state.loading = false;
        state.transactionChart = action.payload; // ✅ FIXED
      })
      .addCase(getBranchChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Branch chart failed";
      })

      /* ===== ✅ PURCHASE SALES ===== */
      .addCase(getMonthlyPurchaseSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMonthlyPurchaseSales.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseSales = action.payload;
      })
      .addCase(getMonthlyPurchaseSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Purchase sales failed";
      })

      /* ===== ✅ HEAD OFFICE PAYMENT ===== */
      .addCase(getHeadOfficePaymentChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHeadOfficePaymentChart.fulfilled, (state, action) => {
        state.loading = false;
        state.headOfficePayment = action.payload;
      })
      .addCase(getHeadOfficePaymentChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Head office payment failed";
      })

      /* ===== ✅ HEAD OFFICE RECEIVED ===== */
      .addCase(getHeadOfficeReceivedChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHeadOfficeReceivedChart.fulfilled, (state, action) => {
        state.loading = false;
        state.headOfficeReceived = action.payload;
      })
      .addCase(getHeadOfficeReceivedChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Head office received failed";
      });
  },
});

export const { setLoading } = chartSlice.actions;
export default chartSlice.reducer;

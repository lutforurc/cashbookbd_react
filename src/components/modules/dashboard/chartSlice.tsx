// 

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import { API_BRANCH_PURCHASE_SALES_CHART_URL, API_BRANCH_TRANSACTION_CHART_URL, API_HEAD_OFFICE_PAYMENT_CHART_URL, API_HEAD_OFFICE_RECEIVED_CHART_URL, API_ITEM_COMPARE_CHART_URL } from "../../services/apiRoutes";

export const getBranchChart = createAsyncThunk("getBranchChart/fetch", async (params, { rejectWithValue }) => {
  try {

    const { month = 12, branch = '' } = params || {};
    const { data } = await httpService.get(`${API_BRANCH_TRANSACTION_CHART_URL}?month=${month}&branch=${branch}`);
    return { data };
  } catch (error) {
    return rejectWithValue({ message: "Authentication failed, please try again!" });
  }
}
);


export const getMonthlyPurchaseSales = createAsyncThunk("getMonthlyPurchaseSales/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await httpService.get(`${API_BRANCH_PURCHASE_SALES_CHART_URL}`);
    return { data };
  } catch (error) {
    return rejectWithValue({ message: "Authentication failed, please try again!" });
  }
}
);

export const getHeadOfficePaymentChart = createAsyncThunk("getHeadOfficePaymentChart/fetch", async (params, { rejectWithValue }) => {
  try {
    const { month = 12, branch = '' } = params || {};
    const { data } = await httpService.get(`${API_HEAD_OFFICE_PAYMENT_CHART_URL}?month=${month}&branch=${branch}`);

    return { data };
  } catch (error) {
    return rejectWithValue({ message: "Authentication failed, please try again!" });
  }
}
);


export const getCompare = createAsyncThunk(
  "compare/fetch",
  async (payload, { rejectWithValue }) => {
    try {
      // HARD-CODED PAYLOAD
      // const payload = {
      //   branch_id: 14,
      //   coal4_id: 126,
      //   period1_start: "2025-10-01",
      //   period1_end: "2025-10-31",
      //   period2_start: "2025-11-01",
      //   period2_end: "2025-11-30",
      // };

      const { data } = await httpService.post(API_ITEM_COMPARE_CHART_URL, payload);
      return data.data;
    } catch (error) {
      return rejectWithValue({
        message: "Failed to fetch compare transaction",
      });
    }
  }
);



export const getHeadOfficeReceivedChart = createAsyncThunk("getHeadOfficeReceivedChart/fetch", async (params, { rejectWithValue }) => {
  try {
    const { month = 12, branch = '' } = params || {};

    const { data } = await httpService.get(`${API_HEAD_OFFICE_RECEIVED_CHART_URL}?month=${month}&branch=${branch}`);
    return { data };
  } catch (error) {
    return rejectWithValue({ message: "Authentication failed, please try again!" });
  }
}
);

// Slice
const chartSlice = createSlice({
  name: "chartProperties",
  initialState: {
    loading: false,
    transactionChart: [],
    compareData: [],
    headOfficePayment: [],
    headOfficeReceived: [],
    purchaseSales: [],
    error: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(getCompare.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCompare.fulfilled, (state, action) => {
        state.loading = false;
        state.compareData = action.payload.data;
      })
      .addCase(getCompare.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      .addCase(getBranchChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBranchChart.fulfilled, (state, action) => {
        state.loading = false;
        state.transactionChart = action.payload.data;
      })
      .addCase(getBranchChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      .addCase(getMonthlyPurchaseSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMonthlyPurchaseSales.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseSales = action.payload.data;
      })
      .addCase(getMonthlyPurchaseSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })


      .addCase(getHeadOfficePaymentChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHeadOfficePaymentChart.fulfilled, (state, action) => {
        state.loading = false;
        state.headOfficePayment = action.payload.data;
      })
      .addCase(getHeadOfficePaymentChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      .addCase(getHeadOfficeReceivedChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHeadOfficeReceivedChart.fulfilled, (state, action) => {
        state.loading = false;
        state.headOfficeReceived = action.payload.data;
      })
      .addCase(getHeadOfficeReceivedChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

  },
});

export const { setLoading } = chartSlice.actions;
export default chartSlice.reducer;
// 

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import { API_BRANCH_PURCHASE_SALES_CHART_URL, API_BRANCH_TRANSACTION_CHART_URL, API_HEAD_OFFICE_PAYMENT_CHART_URL, API_HEAD_OFFICE_RECEIVED_CHART_URL } from "../../services/apiRoutes";

export const getBranchChart = createAsyncThunk("getBranchChart/fetch", async (params, { rejectWithValue }) => {
    try {

      const { month = 12, branch = ''} = params || {};
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
      const { month = 12, branch = ''} = params || {};
      const { data } = await httpService.get(`${API_HEAD_OFFICE_PAYMENT_CHART_URL}?month=${month}&branch=${branch}`);
 
      return { data };
    } catch (error) {
      return rejectWithValue({ message: "Authentication failed, please try again!" });
    }
  }
);


// export const getTransactions = createAsyncThunk("getTransactions/fetch", async (params, { rejectWithValue }) => {
//   try {
//     const { page = 1, perPage = 5, search='' } = params || {};
//     const { data } = await httpService.get(`${API_GET_TRANSACTION_URL}?page=${page}&per_page=${perPage}&search=${search}`);
//     return { data };

export const getHeadOfficeReceivedChart = createAsyncThunk("getHeadOfficeReceivedChart/fetch", async (params, { rejectWithValue }) => {
  try {
      const { month = 12, branch = ''} = params || {};

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
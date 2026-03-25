import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_REPORT_CUSTOMER_SUPPLIER_STATEMENT_URL } from '../../../services/apiRoutes';

type Params = {
  branchId: number;
  partyId: number;
  startDate: string;
  endDate: string;
};

type StatementState = {
  loading: boolean;
  error: string | null;
  data: any;
};

const initialState: StatementState = {
  loading: false,
  error: null,
  data: null,
};

export const fetchCustomerSupplierStatement = createAsyncThunk(
  'reports/ledgerWithProduct',
  async ({ branchId, partyId, startDate, endDate }: Params, { rejectWithValue }) => {
    try {
      const response = await httpService.get(
        `${API_REPORT_CUSTOMER_SUPPLIER_STATEMENT_URL}?branch_id=${branchId}&party_id=${partyId}&start_date=${startDate}&end_date=${endDate}`,
      );

      const payload = response?.data;

      if (payload?.success) {
        return payload?.data?.data ?? payload?.data;
      }

      return rejectWithValue(payload?.message || payload?.error?.message || 'Report load failed');
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Something went wrong',
      );
    }
  },
);

const ledgerWithProductSlice = createSlice({
  name: 'ledgerWithProduct',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerSupplierStatement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerSupplierStatement.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchCustomerSupplierStatement.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Something went wrong';
      });
  },
});

export default ledgerWithProductSlice.reducer;

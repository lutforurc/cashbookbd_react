import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_REPORT_CUSTOMER_SUPPLIER_STATEMENT_URL } from '../../../services/apiRoutes';
import { getVoucherId } from '../../vouchers/useRemoveVoucherApproval';
import type { LedgerWithProductReportData } from './ledgerWithProductTypes';

type Params = {
  branchId: number;
  partyId: number;
  productId?: number | null;
  transactionType?: string;
  itemId?: number | null;
  startDate: string;
  endDate: string;
};

type StatementState = {
  loading: boolean;
  error: string | null;
  data: LedgerWithProductReportData | null;
};

const initialState: StatementState = {
  loading: false,
  error: null,
  data: null,
};

export const fetchCustomerSupplierStatement = createAsyncThunk(
  'reports/ledgerWithProduct',
  async ({ branchId, partyId, productId, itemId, transactionType, startDate, endDate }: Params, { rejectWithValue }) => {
    try {
      const selectedItemId = itemId ?? productId ?? '';
      const params = new URLSearchParams({
        branch_id: String(branchId),
        party_id: String(partyId),
        transaction_type: transactionType ?? '',
        item_id: selectedItemId ? String(selectedItemId) : '',
        start_date: startDate,
        end_date: endDate,
      });
      const response = await httpService.get(
        `${API_REPORT_CUSTOMER_SUPPLIER_STATEMENT_URL}?${params.toString()}`,
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
  reducers: {
    clearCustomerSupplierStatement: (state) => {
      state.loading = false;
      state.error = null;
      state.data = null;
    },
    /**
     * One row's approval, changed where the row is kept.
     *
     * ⚠️ NOT THE WHOLE STATEMENT RE-FETCHED. Approving or un-approving used to
     * run the report again, and this slice's loading flag takes the table off
     * the screen while a report runs -- so the reader watched every other row
     * disappear and come back to see one icon change, on a page they had
     * scrolled to find that row in.
     *
     * The flag is the only thing either call changes, and the rows are already
     * in hand. A fresh report replaces `data` wholesale, so nothing has to be
     * undone: the next fetch is the authority again.
     */
    setRowApproval: (
      state,
      action: PayloadAction<{ voucherId: number; isApproved: boolean }>,
    ) => {
      const rows = state.data?.rows;

      if (!Array.isArray(rows)) return;

      const { voucherId, isApproved } = action.payload;

      rows.forEach((row) => {
        if (getVoucherId(row) === voucherId) {
          row.is_approved = isApproved ? 1 : 0;
        }
      });
    },
  },
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

export const { clearCustomerSupplierStatement, setRowApproval } =
  ledgerWithProductSlice.actions;

export default ledgerWithProductSlice.reducer;

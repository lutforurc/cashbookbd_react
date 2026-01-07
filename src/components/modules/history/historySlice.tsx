import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import {
  API_CHANGE_HISTORY_URL,
  API_TRANSACTION_HISTORY_URL,
} from "../../services/apiRoutes";

/* ================= TYPES ================= */

// Transaction Detail
export interface TransactionDetail {
  id: number;
  coa4_id: number;
  remarks: string | null;
  debit: number;
  credit: number;
}

// Before / After Voucher Snapshot
export interface VoucherSnapshot {
  id: number;
  vr_no: string;
  vr_date: string;
  branch_id: number;
  acc_transaction_master: {
    id: number;
    acc_transaction_details: TransactionDetail[];
  }[];
}

// Change Summary
export interface ChangeSummary {
  amount_change: {
    before_total: number;
    after_total: number;
    difference: number;
  };
  remarks_change: {
    before: string[];
    after: string[];
  };
  detail_ids: {
    removed: number[];
    added: number[];
  };
}

// Single History Item
export interface VoucherChangeHistoryItem {
  id: number;
  voucher_id: number;
  changed_by: string;
  changed_at: string;
  before: VoucherSnapshot;
  after: VoucherSnapshot;
  change_summary: ChangeSummary;
}

// API Response (Voucher Change History)
export interface VoucherChangeHistoryResponse {
  data: VoucherChangeHistoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Params (Voucher Change History)
export interface HistoryParams {
  branch: number;
  voucher_no: number;
  page?: number;
  per_page?: number;
}

/* ================= TRANSACTION HISTORY TYPES (NEW) ================= */

export interface ActionByUser {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface MainTransaction {
  id: number;
  vr_no: string;
  status: number;
  mtmId: string;
}

export interface TransactionHistoryItem {
  id: number;
  branch_id: number;
  main_trx_id: number;
  action: string;
  action_by: number;
  created_at: string;
  serial_no: number;

  action_by_user: ActionByUser;
  branch: Branch;
  main_transaction: MainTransaction;
}

export interface TransactionHistoryPaginationLink {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

export interface TransactionHistoryPaginated {
  current_page: number;
  data: TransactionHistoryItem[];
  first_page_url?: string;
  from?: number;
  last_page: number;
  last_page_url?: string;
  links?: TransactionHistoryPaginationLink[];
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number;
  total: number;
}

// API wrapper response (Transaction History) - based on your sample
export interface TransactionHistoryApiResponse {
  success: boolean;
  message: string;
  data: {
    data: TransactionHistoryPaginated;
    transaction_date: string;
  };
  success_code: {
    code: number;
  };
  error: {
    code: number;
  };
}

// Params (Transaction History)
export interface TransactionHistoryParams {
  page?: number;
  per_page?: number;
}

/* ================= STATE ================= */

interface VoucherChangeHistoryState {
  // ✅ পুরোনো UI এর জন্য এগুলো unchanged:
  history: VoucherChangeHistoryResponse | null;
  loading: boolean;
  error: string | null;

  // ✅ নতুন transaction history (old UI তে impact করবে না):
  transactionHistories: TransactionHistoryPaginated | null;
  transaction_date: string;
}

const initialState: VoucherChangeHistoryState = {
  history: null,
  loading: false,
  error: null,

  transactionHistories: null,
  transaction_date: "",
};

/* ================= THUNK ================= */

/**
 * ✅ এই thunk একদম unchanged রাখা হয়েছে
 * - একই নাম
 * - একই action type string: "voucher/fetchChangeHistory"
 * - একই request payload (branch, voucher_no)
 */
export const fetchVoucherChangeHistory = createAsyncThunk<
  VoucherChangeHistoryResponse,
  HistoryParams,
  { rejectValue: string }
>(
  "voucher/fetchChangeHistory",
  async (params, thunkAPI) => {
    try {
      const response = await httpService.post(API_CHANGE_HISTORY_URL, {
        branch: params.branch,
        voucher_no: params.voucher_no,
      });

      return response.data as VoucherChangeHistoryResponse;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch voucher change history"
      );
    }
  }
);

/**
 * ✅ NEW thunk: Transaction Histories
 */
export const fetchTransactionHistories = createAsyncThunk<
  { transactionHistories: TransactionHistoryPaginated; transaction_date: string },
  TransactionHistoryParams,
  { rejectValue: string }
>(
  "history/fetchTransactionHistories",
  async (params, thunkAPI) => {
    try {
      const response = await httpService.get<TransactionHistoryApiResponse>(
        API_TRANSACTION_HISTORY_URL,
        {
          params: {
            page: params.page ?? 1,
            per_page: params.per_page ?? 10,
          },
        }
      );

      return {
        transactionHistories: response.data.data.data,
        transaction_date: response.data.data.transaction_date,
      };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch transaction histories"
      );
    }
  }
);

/* ================= SLICE ================= */

const historySlice = createSlice({
  // ✅ UNCHANGED (UI dependency থাকতে পারে)
  name: "voucherChangeHistory",
  initialState,
  reducers: {
    // ✅ UNCHANGED
    clearVoucherChangeHistory(state) {
      state.history = null;
      state.loading = false;
      state.error = null;

      // ✅ new data clear (won't affect old UI)
      state.transactionHistories = null;
      state.transaction_date = "";
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Voucher Change History (UNCHANGED) ===== */

      // Pending
      .addCase(fetchVoucherChangeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      // Fulfilled
      .addCase(
        fetchVoucherChangeHistory.fulfilled,
        (state, action: PayloadAction<VoucherChangeHistoryResponse>) => {
          state.loading = false;
          state.history = action.payload;
        }
      )

      // Rejected
      .addCase(fetchVoucherChangeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch voucher change history";
      })

      /* ===== Transaction Histories (NEW) ===== */

      .addCase(fetchTransactionHistories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(
        fetchTransactionHistories.fulfilled,
        (
          state,
          action: PayloadAction<{
            transactionHistories: TransactionHistoryPaginated;
            transaction_date: string;
          }>
        ) => {
          state.loading = false;
          state.transactionHistories = action.payload.transactionHistories;
          state.transaction_date = action.payload.transaction_date;
        }
      )

      .addCase(fetchTransactionHistories.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch transaction histories";
      });
  },
});

/* ================= EXPORTS ================= */

// ✅ UNCHANGED export
export const { clearVoucherChangeHistory } = historySlice.actions;

// ✅ reducer unchanged export
export default historySlice.reducer;

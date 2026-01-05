import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_EMPLOYEE_DDL_SEARCH_URL,
  API_EMPLOYEE_LOAN_DISBURSEMENT_URL,
} from '../../../services/apiRoutes';

// ===== Types =====
export type Coal4Item = {
  value: string | number;
  label: string;
  id?: number | string;
  name?: string;
  l3_name?: string;
  l2_name?: string;
};

// Loan Disbursement Types
export type LoanDisbursementPayload = {
  employee_id: number | string;
  amount: number;
  disbursement_date?: string; // "YYYY-MM-DD"
  remarks?: string;
};

export type LoanDisbursementResponse = {
  id?: number | string;
  employee_id?: number | string;
  amount?: number;
  disbursement_date?: string;
  remarks?: string;
  [key: string]: any;
};

type Coal4State = {
  // existing (DDL)
  ddl: Coal4Item[];
  loading: boolean;
  error: string | null;

  // new (Loan Disbursement)
  disbursementSubmitting: boolean;
  disbursementSuccess: boolean;
  disbursementData: LoanDisbursementResponse | null;
  disbursementError: string | null;
};

const initialState: Coal4State = {
  ddl: [],
  loading: false,
  error: null,

  disbursementSubmitting: false,
  disbursementSuccess: false,
  disbursementData: null,
  disbursementError: null,
};

// ===== Thunk: Employee DDL Search (আগেরটাই) =====
export const employeeLoan = createAsyncThunk<
  Coal4Item[],
  { searchName: string },
  { rejectValue: string }
>('employeeLoan/employeeLoan', async ({ searchName }, thunkAPI) => {
  try {
    const response = await httpService.get(API_EMPLOYEE_DDL_SEARCH_URL, {
      params: { searchName },
    });

    const raw = response.data;
    const list: any[] = raw?.data?.data ?? raw?.data ?? raw ?? [];

    const normalized: Coal4Item[] = list.map((x: any) => {
      if (x?.value !== undefined && x?.label !== undefined) return x;

      return {
        value: x?.id,
        label:
          x?.label ??
          (x?.l3_name || x?.l2_name
            ? `${x?.name} (${x?.l3_name ?? ''}${x?.l2_name ? ' / ' + x?.l2_name : ''})`
            : x?.name),
        ...x,
      };
    });

    return normalized;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to fetch COA L4 DDL';
    return thunkAPI.rejectWithValue(message);
  }
});

// ===== Thunk: Loan Disbursement (নতুন) =====
export const employeeLoanDisbursement = createAsyncThunk<
  LoanDisbursementResponse,
  LoanDisbursementPayload,
  { rejectValue: string }
>('employeeLoan/employeeLoanDisbursement', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_EMPLOYEE_LOAN_DISBURSEMENT_URL, payload);

    const raw = response.data;
    const data = raw?.data?.data ?? raw?.data ?? raw ?? null;

    return (data ?? {}) as LoanDisbursementResponse;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to create loan disbursement';
    return thunkAPI.rejectWithValue(message);
  }
});

// ===== Slice =====
const employeeLoanSlice = createSlice({
  name: 'employeeLoan',
  initialState,
  reducers: {
    // existing
    clearCoal4Ddl(state) {
      state.ddl = [];
      state.error = null;
      state.loading = false;
    },

    // new
    resetLoanDisbursement(state) {
      state.disbursementSubmitting = false;
      state.disbursementSuccess = false;
      state.disbursementData = null;
      state.disbursementError = null;
    },
    clearLoanDisbursementError(state) {
      state.disbursementError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== employeeLoan (আপনার দেয়া অংশ 그대로) =====
      .addCase(employeeLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(employeeLoan.fulfilled, (state, action: PayloadAction<Coal4Item[]>) => {
        state.loading = false;
        state.ddl = action.payload;
      })
      .addCase(employeeLoan.rejected, (state, action) => {
        state.loading = false;
        state.ddl = [];
        state.error = (action.payload as string) || 'Failed to fetch data';
      })

      // ===== LoanDisbursement (নতুন যোগ) =====
      .addCase(employeeLoanDisbursement.pending, (state) => {
        state.disbursementSubmitting = true;
        state.disbursementSuccess = false;
        state.disbursementError = null;
        // চাইলে আগের ডাটা রেখে দিতে পারেন; আমি ক্লিন রাখলাম:
        state.disbursementData = null;
      })
      .addCase(
        employeeLoanDisbursement.fulfilled,
        (state, action: PayloadAction<LoanDisbursementResponse>) => {
          state.disbursementSubmitting = false;
          state.disbursementSuccess = true;
          state.disbursementData = action.payload;
        }
      )
      .addCase(employeeLoanDisbursement.rejected, (state, action) => {
        state.disbursementSubmitting = false;
        state.disbursementSuccess = false;
        state.disbursementData = null;
        state.disbursementError =
          (action.payload as string) || 'Failed to create loan disbursement';
      });
  },
});

export const {
  clearCoal4Ddl,
  resetLoanDisbursement,
  clearLoanDisbursementError,
} = employeeLoanSlice.actions;

export default employeeLoanSlice.reducer;

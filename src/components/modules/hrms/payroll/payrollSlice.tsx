import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_SALARY_ENGINE_URL,
  API_HRMS_SALARY_GENERATE_V2_URL,
  API_HRMS_SALARY_PREVIEW_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface PayrollComponentLine {
  component_code: string;
  component_name: string;
  component_type: 'earning' | 'deduction' | 'employer_contribution';
  amount: number | string;
  quantity?: number | string;
  note?: string | null;
}

export interface PayrollPreviewRow {
  employee_id: number;
  employee_name: string;
  employee_serial?: number | string;
  designation_name?: string | null;
  employment_type?: string | null;
  is_daily_labour?: boolean;
  month_days: number;
  payable_days: number;
  absent_days: number;
  unpaid_leave_days: number;
  half_days: number;
  late_count: number;
  late_deduction_days: number;
  early_out_count: number;
  early_out_deduction_days: number;
  overtime_minutes: number;
  overtime_amount: number;
  monthly_basic_salary: number;
  monthly_others_allowance: number;
  basic_salary: number;
  others_allowance: number;
  gross: number;
  attendance_deduction: number;
  loan_deduction: number;
  others_deduction: number;
  provident_fund: number;
  total_deduction: number;
  net: number;
  components: PayrollComponentLine[];
}

export interface PayrollPreview {
  month: string;
  month_days: number;
  sheet_type: string;
  rows: PayrollPreviewRow[];
  totals: Record<string, number>;
}

interface PayrollState {
  engine: 'legacy' | 'components';
  engineBranchId: number | null;
  preview: PayrollPreview | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PayrollState = {
  engine: 'legacy',
  engineBranchId: null,
  preview: null,
  isLoading: false,
  error: null,
};

/**
 * Which engine this branch is on.
 *
 * A failed read answers 'legacy' rather than throwing: the Generate screen must
 * always resolve to a working path, and the old path is the one that is always
 * safe.
 */
export const fetchPayrollEngine = createAsyncThunk<
  { branchId: number; engine: 'legacy' | 'components' },
  number | string,
  { rejectValue: string }
>('payroll/fetchPayrollEngine', async (branchId, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_SALARY_ENGINE_URL, {
      params: { branch_id: branchId },
    });

    const data = unwrapApiData(res.data);

    return {
      branchId: Number(data?.branch_id ?? branchId),
      engine: data?.engine === 'components' ? 'components' : 'legacy',
    };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to read the payroll engine',
    );
  }
});

export const fetchPayrollPreview = createAsyncThunk<
  PayrollPreview,
  Record<string, any>,
  { rejectValue: string }
>('payroll/fetchPayrollPreview', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_SALARY_PREVIEW_URL, payload);

    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to preview the salary sheet');
    }

    return unwrapApiData(res.data) as PayrollPreview;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to preview the salary sheet',
    );
  }
});

export const generatePayroll = createAsyncThunk<
  any,
  Record<string, any>,
  { rejectValue: string }
>('payroll/generatePayroll', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_SALARY_GENERATE_V2_URL, payload);

    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to generate the salary sheet');
    }

    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to generate the salary sheet',
    );
  }
});

const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearPayrollPreview(state) {
      state.preview = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayrollEngine.fulfilled, (state, action: PayloadAction<{ branchId: number; engine: 'legacy' | 'components' }>) => {
        state.engine = action.payload.engine;
        state.engineBranchId = action.payload.branchId;
      })
      .addCase(fetchPayrollEngine.rejected, (state) => {
        // Never leave the screen without a path to run.
        state.engine = 'legacy';
      })
      .addCase(fetchPayrollPreview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayrollPreview.fulfilled, (state, action: PayloadAction<PayrollPreview>) => {
        state.isLoading = false;
        state.preview = action.payload;
      })
      .addCase(fetchPayrollPreview.rejected, (state, action) => {
        state.isLoading = false;
        state.preview = null;
        state.error = action.payload || 'Failed to preview the salary sheet';
      })
      .addCase(generatePayroll.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generatePayroll.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(generatePayroll.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to generate the salary sheet';
      });
  },
});

export const { clearPayrollPreview } = payrollSlice.actions;

export default payrollSlice.reducer;

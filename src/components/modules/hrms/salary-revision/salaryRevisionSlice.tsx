import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_SALARY_EMPLOYEE_REVISION_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface SalaryRevisionComponent {
  component_id: number | string;
  code?: string;
  name?: string;
  short_name?: string | null;
  component_type?: string;
  category?: string;
  calculation_type?: string;
  amount?: number | string | null;
  percent?: number | string | null;
  prorate?: number | string | null;
  sort_order?: number | string;
}

export interface SalaryRevision {
  id: number | string;
  structure_id?: number | string | null;
  structure_name?: string | null;
  structure_code?: string | null;
  effective_from: string;
  effective_to?: string | null;
  gross_salary?: number | string;
  status?: string;
  note?: string | null;
  created_at?: string;
  components?: SalaryRevisionComponent[];
}

interface SalaryRevisionState {
  revisions: SalaryRevision[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SalaryRevisionState = {
  revisions: [],
  isLoading: false,
  error: null,
};

export const fetchSalaryRevisions = createAsyncThunk<
  SalaryRevision[],
  number | string,
  { rejectValue: string }
>('salaryRevision/fetchSalaryRevisions', async (employeeId, thunkAPI) => {
  try {
    const res = await httpService.get(
      `${API_HRMS_SALARY_EMPLOYEE_REVISION_URL}/${employeeId}/revisions`,
    );
    return unwrapApiData(res.data) ?? [];
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary revisions',
    );
  }
});

export const saveSalaryRevision = createAsyncThunk<
  any,
  { employeeId: number | string; payload: Record<string, any> },
  { rejectValue: string }
>('salaryRevision/saveSalaryRevision', async ({ employeeId, payload }, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_HRMS_SALARY_EMPLOYEE_REVISION_URL}/${employeeId}/revisions`,
      payload,
    );

    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to save salary revision');
    }

    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save salary revision',
    );
  }
});

/** Delete a revision nobody has been paid from yet. */
export const deleteSalaryRevision = createAsyncThunk<
  any,
  { employeeId: number | string; revisionId: number | string },
  { rejectValue: string }
>('salaryRevision/deleteSalaryRevision', async ({ employeeId, revisionId }, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_HRMS_SALARY_EMPLOYEE_REVISION_URL}/${employeeId}/revisions/${revisionId}/delete`,
    );

    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to delete the salary revision');
    }

    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to delete the salary revision',
    );
  }
});

const salaryRevisionSlice = createSlice({
  name: 'salaryRevision',
  initialState,
  reducers: {
    clearSalaryRevisions(state) {
      state.revisions = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalaryRevisions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSalaryRevisions.fulfilled, (state, action: PayloadAction<SalaryRevision[]>) => {
        state.isLoading = false;
        state.revisions = action.payload;
      })
      .addCase(fetchSalaryRevisions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch salary revisions';
      })
      .addCase(saveSalaryRevision.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveSalaryRevision.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveSalaryRevision.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save salary revision';
      });
  },
});

export const { clearSalaryRevisions } = salaryRevisionSlice.actions;

export default salaryRevisionSlice.reducer;

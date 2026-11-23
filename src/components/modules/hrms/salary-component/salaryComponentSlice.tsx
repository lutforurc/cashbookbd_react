import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_SALARY_COMPONENT_DDL_URL,
  API_HRMS_SALARY_COMPONENT_EDIT_URL,
  API_HRMS_SALARY_COMPONENT_LIST_URL,
  API_HRMS_SALARY_COMPONENT_STATUS_URL,
  API_HRMS_SALARY_COMPONENT_STORE_URL,
  API_HRMS_SALARY_COMPONENT_UPDATE_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface SalaryComponentItem {
  id: number | string;
  code: string;
  name: string;
  short_name?: string | null;
  component_type: 'earning' | 'deduction' | 'employer_contribution';
  category?: string;
  calculation_type?: string;
  percent_base?: string | null;
  day_basis?: string;
  default_amount?: number | string | null;
  default_percent?: number | string | null;
  prorate?: number | string;
  rounding?: string;
  include_in_gross?: number | string;
  include_in_deduction_base?: number | string;
  salary_sheet_types?: string;
  sort_order?: number | string;
  is_system?: number | string;
  system_locked?: boolean;
  status?: number | string;
}

interface SalaryComponentState {
  components: any;
  ddl: SalaryComponentItem[];
  editData: SalaryComponentItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SalaryComponentState = {
  components: [],
  ddl: [],
  editData: null,
  isLoading: false,
  error: null,
};

export const fetchSalaryComponents = createAsyncThunk<
  any,
  { search?: string; page?: number; per_page?: number; component_type?: string },
  { rejectValue: string }
>('salaryComponent/fetchSalaryComponents', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_SALARY_COMPONENT_LIST_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary components',
    );
  }
});

export const fetchSalaryComponentDdl = createAsyncThunk<
  SalaryComponentItem[],
  { search?: string; component_type?: string } | undefined,
  { rejectValue: string }
>('salaryComponent/fetchSalaryComponentDdl', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_SALARY_COMPONENT_DDL_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary component list',
    );
  }
});

export const editSalaryComponent = createAsyncThunk<
  SalaryComponentItem,
  number | string,
  { rejectValue: string }
>('salaryComponent/editSalaryComponent', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_HRMS_SALARY_COMPONENT_EDIT_URL}/${id}`);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary component',
    );
  }
});

export const saveSalaryComponent = createAsyncThunk<
  any,
  Partial<SalaryComponentItem>,
  { rejectValue: string }
>('salaryComponent/saveSalaryComponent', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_SALARY_COMPONENT_STORE_URL, payload);
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to save salary component');
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save salary component',
    );
  }
});

export const updateSalaryComponent = createAsyncThunk<
  any,
  SalaryComponentItem,
  { rejectValue: string }
>('salaryComponent/updateSalaryComponent', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_HRMS_SALARY_COMPONENT_UPDATE_URL}/${payload.id}`,
      payload,
    );
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to update salary component');
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to update salary component',
    );
  }
});

/**
 * Switch a pay head on or off.
 *
 * There is no delete: a pay head already named by a revision or a payslip is
 * history, so the list offers Disable instead.
 */
export const setSalaryComponentStatus = createAsyncThunk<
  any,
  { id: number | string; status: number },
  { rejectValue: string }
>('salaryComponent/setSalaryComponentStatus', async ({ id, status }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_HRMS_SALARY_COMPONENT_STATUS_URL}/${id}`, { status });
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to change status');
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to change status',
    );
  }
});

const salaryComponentSlice = createSlice({
  name: 'salaryComponent',
  initialState,
  reducers: {
    clearSalaryComponentError(state) {
      state.error = null;
    },
    clearSalaryComponentEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalaryComponents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSalaryComponents.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.components = action.payload;
      })
      .addCase(fetchSalaryComponents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch salary components';
      })
      .addCase(fetchSalaryComponentDdl.fulfilled, (state, action: PayloadAction<SalaryComponentItem[]>) => {
        state.ddl = action.payload;
      })
      .addCase(fetchSalaryComponentDdl.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch salary component list';
      })
      .addCase(editSalaryComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editSalaryComponent.fulfilled, (state, action: PayloadAction<SalaryComponentItem>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(editSalaryComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch salary component';
      })
      .addCase(saveSalaryComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveSalaryComponent.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveSalaryComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save salary component';
      })
      .addCase(updateSalaryComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSalaryComponent.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(updateSalaryComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update salary component';
      })
      .addCase(setSalaryComponentStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setSalaryComponentStatus.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(setSalaryComponentStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to change status';
      });
  },
});

export const { clearSalaryComponentError, clearSalaryComponentEditData } =
  salaryComponentSlice.actions;

export default salaryComponentSlice.reducer;

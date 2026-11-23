import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_SALARY_STRUCTURE_DDL_URL,
  API_HRMS_SALARY_STRUCTURE_EDIT_URL,
  API_HRMS_SALARY_STRUCTURE_LIST_URL,
  API_HRMS_SALARY_STRUCTURE_STATUS_URL,
  API_HRMS_SALARY_STRUCTURE_STORE_URL,
  API_HRMS_SALARY_STRUCTURE_UPDATE_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface SalaryStructureLine {
  id?: number | string;
  component_id: number | string;
  code?: string;
  name?: string;
  short_name?: string | null;
  component_type?: string;
  category?: string;
  calculation_type?: string | null;
  master_calculation_type?: string;
  percent_base?: string | null;
  amount?: number | string | null;
  percent?: number | string | null;
  day_basis?: string | null;
  prorate?: number | string | null;
  master_prorate?: number | string;
  rounding?: string;
  sort_order?: number | string;
  is_required?: number | string;
  component_status?: number | string;
}

export interface SalaryStructureItem {
  id: number | string;
  code: string;
  name: string;
  description?: string | null;
  is_default?: number | string;
  status?: number | string;
  component_count?: number;
  components?: SalaryStructureLine[];
}

interface SalaryStructureState {
  structures: any;
  ddl: SalaryStructureItem[];
  editData: SalaryStructureItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SalaryStructureState = {
  structures: [],
  ddl: [],
  editData: null,
  isLoading: false,
  error: null,
};

export const fetchSalaryStructures = createAsyncThunk<
  any,
  { search?: string; page?: number; per_page?: number },
  { rejectValue: string }
>('salaryStructure/fetchSalaryStructures', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_SALARY_STRUCTURE_LIST_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary structures',
    );
  }
});

export const fetchSalaryStructureDdl = createAsyncThunk<
  SalaryStructureItem[],
  void,
  { rejectValue: string }
>('salaryStructure/fetchSalaryStructureDdl', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_SALARY_STRUCTURE_DDL_URL);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary structures',
    );
  }
});

export const editSalaryStructure = createAsyncThunk<
  SalaryStructureItem,
  number | string,
  { rejectValue: string }
>('salaryStructure/editSalaryStructure', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_HRMS_SALARY_STRUCTURE_EDIT_URL}/${id}`);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch salary structure',
    );
  }
});

export const saveSalaryStructure = createAsyncThunk<
  any,
  Partial<SalaryStructureItem>,
  { rejectValue: string }
>('salaryStructure/saveSalaryStructure', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_SALARY_STRUCTURE_STORE_URL, payload);
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to save salary structure');
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save salary structure',
    );
  }
});

export const updateSalaryStructure = createAsyncThunk<
  any,
  SalaryStructureItem,
  { rejectValue: string }
>('salaryStructure/updateSalaryStructure', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_HRMS_SALARY_STRUCTURE_UPDATE_URL}/${payload.id}`,
      payload,
    );
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'Failed to update salary structure');
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to update salary structure',
    );
  }
});

export const setSalaryStructureStatus = createAsyncThunk<
  any,
  { id: number | string; status: number },
  { rejectValue: string }
>('salaryStructure/setSalaryStructureStatus', async ({ id, status }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_HRMS_SALARY_STRUCTURE_STATUS_URL}/${id}`, { status });
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

const salaryStructureSlice = createSlice({
  name: 'salaryStructure',
  initialState,
  reducers: {
    clearSalaryStructureError(state) {
      state.error = null;
    },
    clearSalaryStructureEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalaryStructures.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSalaryStructures.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.structures = action.payload;
      })
      .addCase(fetchSalaryStructures.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch salary structures';
      })
      .addCase(fetchSalaryStructureDdl.fulfilled, (state, action: PayloadAction<SalaryStructureItem[]>) => {
        state.ddl = action.payload;
      })
      .addCase(fetchSalaryStructureDdl.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch salary structures';
      })
      .addCase(editSalaryStructure.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editSalaryStructure.fulfilled, (state, action: PayloadAction<SalaryStructureItem>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(editSalaryStructure.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch salary structure';
      })
      .addCase(saveSalaryStructure.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveSalaryStructure.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveSalaryStructure.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save salary structure';
      })
      .addCase(updateSalaryStructure.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSalaryStructure.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(updateSalaryStructure.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update salary structure';
      })
      .addCase(setSalaryStructureStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setSalaryStructureStatus.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(setSalaryStructureStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to change status';
      });
  },
});

export const { clearSalaryStructureError, clearSalaryStructureEditData } =
  salaryStructureSlice.actions;

export default salaryStructureSlice.reducer;

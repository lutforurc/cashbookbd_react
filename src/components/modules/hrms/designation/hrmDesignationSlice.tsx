import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_DESIGNATION_DDL_URL,
  API_HRMS_DESIGNATION_DELETE_URL,
  API_HRMS_DESIGNATION_EDIT_URL,
  API_HRMS_DESIGNATION_LEVEL_DDL_URL,
  API_HRMS_DESIGNATION_LIST_URL,
  API_HRMS_DESIGNATION_STORE_URL,
  API_HRMS_DESIGNATION_UPDATE_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface HrmDesignationItem {
  id: number | string;
  name: string;
  description?: string;
  level_id?: number | string;
  post_sequence?: number | string;
  status?: number | string;
}

interface HrmDesignationState {
  designations: any;
  ddl: HrmDesignationItem[];
  designationLevelDdl: { id: number | string; name: string }[];
  editData: HrmDesignationItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: HrmDesignationState = {
  designations: [],
  ddl: [],
  designationLevelDdl: [],
  editData: null,
  isLoading: false,
  error: null,
};

export const fetchHrmDesignations = createAsyncThunk<
  any,
  { search?: string; page?: number; per_page?: number },
  { rejectValue: string }
>('hrmDesignation/fetchHrmDesignations', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_DESIGNATION_LIST_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designations',
    );
  }
});

export const fetchHrmDesignationDdl = createAsyncThunk<
  HrmDesignationItem[],
  string | undefined,
  { rejectValue: string }
>('hrmDesignation/fetchHrmDesignationDdl', async (search = '', thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_DESIGNATION_DDL_URL, {
      params: { search },
    });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation dropdown',
    );
  }
});

export const fetchDesignationLevelOptions = createAsyncThunk<
  { id: number | string; name: string }[],
  string | undefined,
  { rejectValue: string }
>('hrmDesignation/fetchDesignationLevelOptions', async (search = '', thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_DESIGNATION_LEVEL_DDL_URL, {
      params: { search },
    });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation level options',
    );
  }
});

export const editHrmDesignation = createAsyncThunk<
  HrmDesignationItem,
  number | string,
  { rejectValue: string }
>('hrmDesignation/editHrmDesignation', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_HRMS_DESIGNATION_EDIT_URL}/${id}`);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation',
    );
  }
});

export const saveHrmDesignation = createAsyncThunk<
  any,
  Partial<HrmDesignationItem>,
  { rejectValue: string }
>('hrmDesignation/saveHrmDesignation', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_DESIGNATION_STORE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save designation',
    );
  }
});

export const updateHrmDesignation = createAsyncThunk<
  any,
  HrmDesignationItem,
  { rejectValue: string }
>('hrmDesignation/updateHrmDesignation', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_DESIGNATION_UPDATE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to update designation',
    );
  }
});

export const deleteHrmDesignation = createAsyncThunk<
  any,
  number | string,
  { rejectValue: string }
>('hrmDesignation/deleteHrmDesignation', async (id, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_HRMS_DESIGNATION_DELETE_URL}/${id}`);
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(
        res.data?.message || 'Failed to delete designation',
      );
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to delete designation',
    );
  }
});

const hrmDesignationSlice = createSlice({
  name: 'hrmDesignation',
  initialState,
  reducers: {
    clearHrmDesignationError(state) {
      state.error = null;
    },
    clearHrmDesignationEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrmDesignations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHrmDesignations.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.designations = action.payload;
      })
      .addCase(fetchHrmDesignations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch designations';
      })
      .addCase(fetchHrmDesignationDdl.fulfilled, (state, action: PayloadAction<any>) => {
        state.ddl = action.payload;
      })
      .addCase(fetchDesignationLevelOptions.fulfilled, (state, action: PayloadAction<{ id: number | string; name: string }[]>) => {
        state.designationLevelDdl = action.payload;
      })
      .addCase(editHrmDesignation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editHrmDesignation.fulfilled, (state, action: PayloadAction<HrmDesignationItem>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(editHrmDesignation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch designation';
      })
      .addCase(saveHrmDesignation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveHrmDesignation.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveHrmDesignation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save designation';
      })
      .addCase(updateHrmDesignation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateHrmDesignation.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(updateHrmDesignation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update designation';
      })
      .addCase(deleteHrmDesignation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteHrmDesignation.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteHrmDesignation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete designation';
      });
  },
});

export const { clearHrmDesignationError, clearHrmDesignationEditData } =
  hrmDesignationSlice.actions;

export default hrmDesignationSlice.reducer;


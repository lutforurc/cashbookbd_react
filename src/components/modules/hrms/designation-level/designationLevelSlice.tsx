import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_HRMS_DESIGNATION_LEVEL_DDL_URL,
  API_HRMS_DESIGNATION_LEVEL_DELETE_URL,
  API_HRMS_DESIGNATION_LEVEL_EDIT_URL,
  API_HRMS_DESIGNATION_LEVEL_LIST_URL,
  API_HRMS_DESIGNATION_LEVEL_STORE_URL,
  API_HRMS_DESIGNATION_LEVEL_UPDATE_URL,
} from '../../../services/apiRoutes';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface DesignationLevelItem {
  id: number | string;
  name: string;
  description?: string;
  status?: number | string;
}

interface DesignationLevelState {
  levels: any;
  ddl: DesignationLevelItem[];
  editData: DesignationLevelItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DesignationLevelState = {
  levels: [],
  ddl: [],
  editData: null,
  isLoading: false,
  error: null,
};

export const fetchDesignationLevels = createAsyncThunk<
  any,
  { search?: string; page?: number; per_page?: number },
  { rejectValue: string }
>('designationLevel/fetchDesignationLevels', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_DESIGNATION_LEVEL_LIST_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation levels',
    );
  }
});

export const fetchDesignationLevelDdl = createAsyncThunk<
  DesignationLevelItem[],
  string | undefined,
  { rejectValue: string }
>('designationLevel/fetchDesignationLevelDdl', async (search = '', thunkAPI) => {
  try {
    const res = await httpService.get(API_HRMS_DESIGNATION_LEVEL_DDL_URL, {
      params: { search },
    });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation level dropdown',
    );
  }
});

export const editDesignationLevel = createAsyncThunk<
  DesignationLevelItem,
  number | string,
  { rejectValue: string }
>('designationLevel/editDesignationLevel', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_HRMS_DESIGNATION_LEVEL_EDIT_URL}/${id}`);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch designation level',
    );
  }
});

export const saveDesignationLevel = createAsyncThunk<
  any,
  Partial<DesignationLevelItem>,
  { rejectValue: string }
>('designationLevel/saveDesignationLevel', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_DESIGNATION_LEVEL_STORE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save designation level',
    );
  }
});

export const updateDesignationLevel = createAsyncThunk<
  any,
  DesignationLevelItem,
  { rejectValue: string }
>('designationLevel/updateDesignationLevel', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_HRMS_DESIGNATION_LEVEL_UPDATE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to update designation level',
    );
  }
});

export const deleteDesignationLevel = createAsyncThunk<
  any,
  number | string,
  { rejectValue: string }
>('designationLevel/deleteDesignationLevel', async (id, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_HRMS_DESIGNATION_LEVEL_DELETE_URL}/${id}`);
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(
        res.data?.message || 'Failed to delete designation level',
      );
    }
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to delete designation level',
    );
  }
});

const designationLevelSlice = createSlice({
  name: 'designationLevel',
  initialState,
  reducers: {
    clearDesignationLevelError(state) {
      state.error = null;
    },
    clearDesignationLevelEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDesignationLevels.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDesignationLevels.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.levels = action.payload;
      })
      .addCase(fetchDesignationLevels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch designation levels';
      })
      .addCase(fetchDesignationLevelDdl.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDesignationLevelDdl.fulfilled, (state, action: PayloadAction<DesignationLevelItem[]>) => {
        state.isLoading = false;
        state.ddl = action.payload;
      })
      .addCase(fetchDesignationLevelDdl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch designation level dropdown';
      })
      .addCase(editDesignationLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editDesignationLevel.fulfilled, (state, action: PayloadAction<DesignationLevelItem>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(editDesignationLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch designation level';
      })
      .addCase(saveDesignationLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveDesignationLevel.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveDesignationLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save designation level';
      })
      .addCase(updateDesignationLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDesignationLevel.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(updateDesignationLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update designation level';
      })
      .addCase(deleteDesignationLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDesignationLevel.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteDesignationLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete designation level';
      });
  },
});

export const { clearDesignationLevelError, clearDesignationLevelEditData } =
  designationLevelSlice.actions;

export default designationLevelSlice.reducer;


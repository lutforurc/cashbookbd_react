import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_MATERIAL_ISSUE_DETAILS_URL,
  API_MATERIAL_ISSUE_LIST_URL,
  API_MATERIAL_ISSUE_STORE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface MaterialIssueState {
  isLoading: boolean;
  isSaving: boolean;
  errors: string | null;
  data: any[];
  pagination: {
    total: number;
    lastPage: number;
    currentPage: number;
  };
  storeData: any;
}

interface MaterialIssueListPayload {
  rows: any[];
  total: number;
  lastPage: number;
  currentPage: number;
}

interface MaterialIssueStorePayload {
  data: any;
  callback?: (response: any) => void;
}

const initialState: MaterialIssueState = {
  isLoading: false,
  isSaving: false,
  errors: null,
  data: [],
  pagination: {
    total: 0,
    lastPage: 1,
    currentPage: 1,
  },
  storeData: {},
};

const normalizeListPayload = (payload: any): MaterialIssueListPayload => {
  const listRoot = payload?.data?.data ?? payload?.data ?? payload ?? [];

  if (Array.isArray(listRoot)) {
    return {
      rows: listRoot,
      total: listRoot.length,
      lastPage: 1,
      currentPage: 1,
    };
  }

  return {
    rows: Array.isArray(listRoot?.data) ? listRoot.data : [],
    total: Number(listRoot?.total || 0),
    lastPage: Number(listRoot?.last_page || 1),
    currentPage: Number(listRoot?.current_page || 1),
  };
};

export const getMaterialIssues = createAsyncThunk<
  MaterialIssueListPayload,
  any,
  { rejectValue: string }
>('materialIssue/getMaterialIssues', async (params = {}, thunkAPI) => {
  try {
    const res = await httpService.get(API_MATERIAL_ISSUE_LIST_URL, params);
    const responseData = res.data;

    if (responseData?.success) {
      return normalizeListPayload(responseData);
    }

    return thunkAPI.rejectWithValue(
      responseData?.error?.message ||
        responseData?.message ||
        'Failed to load material issues',
    );
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

interface MaterialIssueDetailsPayload {
  id: number | string;
  callback?: (response: any) => void;
}

const getMaterialIssueDetailsThunk = createAsyncThunk<
  any,
  MaterialIssueDetailsPayload,
  { rejectValue: string }
>('materialIssue/getMaterialIssueDetails', async ({ id, callback }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_MATERIAL_ISSUE_DETAILS_URL}/${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      // foundData() wraps the payload as data.data, so unwrap one level here.
      const details = responseData?.data?.data ?? responseData?.data ?? {};
      if (typeof callback === 'function') callback({ success: true, data: details });
      return details;
    }

    const message =
      responseData?.error?.message ||
      responseData?.message ||
      'Failed to load material issue details';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Something went wrong';
    if (typeof callback === 'function') callback({ success: false, message });
    return thunkAPI.rejectWithValue(message);
  }
});

export const getMaterialIssueDetails =
  (id: number | string, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(getMaterialIssueDetailsThunk({ id, callback }));

const storeMaterialIssueThunk = createAsyncThunk<
  any,
  MaterialIssueStorePayload,
  { rejectValue: string }
>('materialIssue/storeMaterialIssue', async ({ data, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(API_MATERIAL_ISSUE_STORE_URL, data);
    const responseData = res.data;

    if (typeof callback === 'function') {
      callback(responseData);
    }

    if (responseData?.success) {
      return responseData?.data?.data ?? responseData?.data ?? {};
    }

    return thunkAPI.rejectWithValue(
      responseData?.error?.message ||
        responseData?.message ||
        'Failed to save material issue',
    );
  } catch (err: any) {
    const fallback = {
      success: false,
      message: err?.response?.data?.message || err?.message || 'Something went wrong',
    };
    if (typeof callback === 'function') {
      callback(fallback);
    }
    return thunkAPI.rejectWithValue(fallback.message);
  }
});

export const storeMaterialIssue =
  (data: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(storeMaterialIssueThunk({ data, callback }));

const materialIssueSlice = createSlice({
  name: 'materialIssue',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getMaterialIssues.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getMaterialIssues.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload.rows;
        state.pagination = {
          total: action.payload.total,
          lastPage: action.payload.lastPage,
          currentPage: action.payload.currentPage,
        };
      })
      .addCase(getMaterialIssues.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load material issues';
      })
      .addCase(storeMaterialIssueThunk.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(storeMaterialIssueThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.storeData = action.payload;
      })
      .addCase(storeMaterialIssueThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload || 'Failed to save material issue';
      });
  },
});

export default materialIssueSlice.reducer;

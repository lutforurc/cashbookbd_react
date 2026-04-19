import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_BRANCH_RECEIVED_LIST_URL,
  API_BRANCH_RECEIVED_STORE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface BranchReceivedState {
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

interface BranchReceivedListPayload {
  rows: any[];
  total: number;
  lastPage: number;
  currentPage: number;
}

interface BranchReceivedStorePayload {
  data: any;
  callback?: (response: any) => void;
}

const initialState: BranchReceivedState = {
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

const normalizeListPayload = (payload: any): BranchReceivedListPayload => {
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

export const getBranchReceived = createAsyncThunk<BranchReceivedListPayload, any, { rejectValue: string }>('branchReceived/getBranchReceived', async (params = {}, thunkAPI) => {
  try {
    const res = await httpService.get(API_BRANCH_RECEIVED_LIST_URL, params);
    const responseData = res.data;

    if (responseData?.success) {
      return normalizeListPayload(responseData);
    }

    return thunkAPI.rejectWithValue(
      responseData?.error?.message ||
        responseData?.message ||
        'Failed to load branch receives',
    );
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

const storeBranchReceivedThunk = createAsyncThunk<
  any,
  BranchReceivedStorePayload,
  { rejectValue: string }
>('branchReceived/storeBranchReceived', async ({ data, callback }, thunkAPI) => {
  try {
    const res = await httpService.post(API_BRANCH_RECEIVED_STORE_URL, data);
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
        'Failed to save branch receive',
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

export const storeBranchReceived =
  (data: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(storeBranchReceivedThunk({ data, callback }));

const branchReceivedSlice = createSlice({
  name: 'branchReceived',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getBranchReceived.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getBranchReceived.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload.rows;
        state.pagination = {
          total: action.payload.total,
          lastPage: action.payload.lastPage,
          currentPage: action.payload.currentPage,
        };
      })
      .addCase(getBranchReceived.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load branch receives';
      })
      .addCase(storeBranchReceivedThunk.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(storeBranchReceivedThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.storeData = action.payload;
      })
      .addCase(storeBranchReceivedThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload || 'Failed to save branch receive';
      });
  },
});

export default branchReceivedSlice.reducer;

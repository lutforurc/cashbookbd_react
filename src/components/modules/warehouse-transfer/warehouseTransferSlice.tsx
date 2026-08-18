import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_BRANCH_TRANSFER_DETAILS_URL,
  API_BRANCH_TRANSFER_LIST_URL,
  API_BRANCH_TRANSFER_STORE_URL,
  API_BRANCH_TRANSFER_UPDATE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface BranchTransferState {
  isLoading: boolean;
  isSaving: boolean;
  isLoadingDetails: boolean;
  errors: string | null;
  data: any[];
  details: { master: any; details: any[] } | null;
  pagination: {
    total: number;
    lastPage: number;
    currentPage: number;
  };
  storeData: any;
}

interface BranchTransferListPayload {
  rows: any[];
  total: number;
  lastPage: number;
  currentPage: number;
}

interface BranchTransferStorePayload {
  data: any;
  callback?: (response: any) => void;
  // An id means the voucher already exists and is being corrected; without one
  // a new voucher is raised. The same payload serves both, so the entry form
  // does not have to keep two shapes of the same challan.
  id?: number | string | null;
}

const initialState: BranchTransferState = {
  isLoading: false,
  isSaving: false,
  isLoadingDetails: false,
  errors: null,
  data: [],
  details: null,
  pagination: {
    total: 0,
    lastPage: 1,
    currentPage: 1,
  },
  storeData: {},
};

const normalizeListPayload = (payload: any): BranchTransferListPayload => {
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

export const getBranchTransfers = createAsyncThunk<
  BranchTransferListPayload,
  any,
  { rejectValue: string }
>('branchTransfer/getBranchTransfers', async (params = {}, thunkAPI) => {
  try {
    const res = await httpService.get(API_BRANCH_TRANSFER_LIST_URL, params);
    const responseData = res.data;

    if (responseData?.success) {
      return normalizeListPayload(responseData);
    }

    return thunkAPI.rejectWithValue(
      responseData?.error?.message ||
        responseData?.message ||
        'Failed to load branch transfers',
    );
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

export const getBranchTransferDetails = createAsyncThunk<
  { master: any; details: any[] },
  number | string,
  { rejectValue: string }
>('branchTransfer/getBranchTransferDetails', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_BRANCH_TRANSFER_DETAILS_URL}${id}`);
    const responseData = res.data;

    if (responseData?.success) {
      // foundData wraps as { data: { data: {...}, transaction_date } }
      const payload = responseData?.data?.data ?? responseData?.data ?? {};
      return {
        master: payload?.master ?? null,
        details: Array.isArray(payload?.details) ? payload.details : [],
      };
    }

    return thunkAPI.rejectWithValue(
      responseData?.error?.message ||
        responseData?.message ||
        'Failed to load transfer details',
    );
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Something went wrong',
    );
  }
});

const storeBranchTransferThunk = createAsyncThunk<
  any,
  BranchTransferStorePayload,
  { rejectValue: string }
>('branchTransfer/storeBranchTransfer', async ({ data, callback, id }, thunkAPI) => {
  try {
    const url = id
      ? `${API_BRANCH_TRANSFER_UPDATE_URL}${id}`
      : API_BRANCH_TRANSFER_STORE_URL;
    const res = await httpService.post(url, data);
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
        'Failed to save branch transfer',
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

export const storeBranchTransfer =
  (data: any, callback?: (response: any) => void) => (dispatch: any) =>
    dispatch(storeBranchTransferThunk({ data, callback }));

/** The same save, aimed at a voucher that already exists. */
export const updateBranchTransfer =
  (id: number | string, data: any, callback?: (response: any) => void) =>
  (dispatch: any) =>
    dispatch(storeBranchTransferThunk({ data, callback, id }));

const branchTransferSlice = createSlice({
  name: 'branchTransfer',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getBranchTransfers.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getBranchTransfers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload.rows;
        state.pagination = {
          total: action.payload.total,
          lastPage: action.payload.lastPage,
          currentPage: action.payload.currentPage,
        };
      })
      .addCase(getBranchTransfers.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load branch transfers';
      })
      .addCase(getBranchTransferDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.errors = null;
      })
      .addCase(getBranchTransferDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.details = action.payload;
      })
      .addCase(getBranchTransferDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.errors = action.payload || 'Failed to load transfer details';
      })
      .addCase(storeBranchTransferThunk.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(storeBranchTransferThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.storeData = action.payload;
      })
      .addCase(storeBranchTransferThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload || 'Failed to save branch transfer';
      });
  },
});

export default branchTransferSlice.reducer;

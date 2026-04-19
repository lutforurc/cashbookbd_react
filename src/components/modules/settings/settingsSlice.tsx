import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_APP_BRANCH_SETTING_URL, API_APP_SETTING_URL, API_SERVICE_LIST_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';

// ---------------- Types ----------------

interface SettingsState {
  data: any;
  branchSettings: any;
  serviceList: any[];
  loading: boolean;
  serviceLoading: boolean;
  error: string | null;
  serviceError: string | null;
}

interface SettingsResponse {
  success: boolean;
  data: { data: any };
  error: { message: string };
}

// ---------------- Initial State ----------------

const initialState: SettingsState = {
  data: {},
  branchSettings: {},
  serviceList: [],
  loading: false,
  serviceLoading: false,
  error: null,
  serviceError: null,
};

// ---------------- Async Thunks ----------------

// 🔵 Existing (Settings)
export const getBranchSettings = createAsyncThunk<any, any, { rejectValue: string }>('settings/getBranchSettings',async (payload, thunkAPI) => {
    try {
      const res = await httpService.post(API_APP_BRANCH_SETTING_URL, payload);
      const _data: SettingsResponse = res.data;

      if (_data.success) {
        return _data.data.data;
      } else {
        return thunkAPI.rejectWithValue(_data.error.message);
      }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Something went wrong.');
    }
  },
);

// 🔵 Existing (Settings)
export const getSettings = createAsyncThunk<any, any, { rejectValue: string }>('settings/getSettings',async (payload, thunkAPI) => {
    try {
      const res = await httpService.post(API_APP_SETTING_URL, payload);
      const _data: SettingsResponse = res.data;

      if (_data.success) {
        return _data.data.data;
      } else {
        return thunkAPI.rejectWithValue(_data.error.message);
      }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Something went wrong.');
    }
  },
);

// 🔵 NEW → Get Service List
export const getServiceList = createAsyncThunk<any[], any, { rejectValue: string }>('settings/getServiceList', async (payload, thunkAPI) => {
    try {
      const res = await httpService.post(API_SERVICE_LIST_URL, payload);
      const _data: SettingsResponse = res.data;
      if (_data.success) {
        return _data.data.data;
      } else {
        return thunkAPI.rejectWithValue(_data.error.message);
      }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Failed to load service list');
    }
  },
);

// ---------------- Slice ----------------

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings(state, action: PayloadAction<any>) {
      state.data = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      // ---------------- Settings ----------------
      .addCase(getSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ---------------- Settings ----------------
      .addCase(getBranchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBranchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.branchSettings = action.payload;
      })
      .addCase(getBranchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ---------------- Service List ----------------
      .addCase(getServiceList.pending, (state) => {
        state.serviceLoading = true;
        state.serviceError = null;
      })
      .addCase(getServiceList.fulfilled, (state, action) => {
        state.serviceLoading = false;
        state.serviceList = action.payload;
      })
      .addCase(getServiceList.rejected, (state, action) => {
        state.serviceLoading = false;
        state.serviceError = action.payload as string;
      });
  },
});

export const { updateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

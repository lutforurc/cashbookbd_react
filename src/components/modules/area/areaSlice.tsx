import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import { API_DDL_AREA_LIST_URL } from '../../services/apiRoutes';

// Types
type AreaRequestPayload = {
  searchName: string | null;
};

type Area = {
  serial: number;
  name: string;
  father: string;
  mobile: string;
  email: string;
  manual_address: string;
};

type AreaResponse = {
  data: Area[];
};

type ErrorResponse = { message: string };

interface AreaState {
  area: Area[];
  loading: boolean;
  error: string | null;
}

const initialState: AreaState = {
  area: [],
  loading: false,
  error: null,
};

export const getDdlArea = createAsyncThunk<Area[], AreaRequestPayload | void, { rejectValue: ErrorResponse }>(
  'getDdlArea/fetch',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await httpService.post(API_DDL_AREA_LIST_URL, {
        searchName: payload?.searchName ?? '',
      });
      return data.data; // already an array
    } catch (error) {
      return rejectWithValue({
        message: 'Failed to fetch areas',
      });
    }
  }
);

const areaSlice = createSlice({
  name: 'area',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDdlArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDdlArea.fulfilled, (state, action) => {
        state.loading = false;
        state.area = action.payload;
      })
      .addCase(getDdlArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      });
  },
});

export const { setLoading } = areaSlice.actions;
export default areaSlice.reducer;

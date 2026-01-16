// src/store/slices/areaSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_AREA_LIST_URL,
  API_AREA_SAVE_URL,
  API_AREA_EDIT_URL,
  API_AREA_UPDATE_URL,
  API_AREA_DDL_URL
} from '../../../services/apiRoutes';

/* ================= TYPES ================= */

export interface Area {
  id: string | number;
  name: string;
  code?: string;
  remarks?: string;
  status?: 'active' | 'inactive';
}

export interface District {
  id: string | number;
  name: string;
}

export interface Upazila {
  id: string | number;
  name: string;
  districtId: string | number;
}

interface AreaState {
  areas: Area[];
  areaDdl: AreaDdlItem[];
  loading: boolean;
  error: string | null;
}
export interface AreaDdlItem {
  value: string | number;
  label: string;
  status?: string | number;
}
/* ================= INITIAL STATE ================= */

const initialState: AreaState = {
  areas: [],
  areaDdl: [],
  loading: false,
  error: null,
};

/* ================= ASYNC THUNKS ================= */

// 📌 Fetch Area list
export const fetchAreas = createAsyncThunk<Area[], void, { rejectValue: string }>('area/fetchAreas', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_AREA_LIST_URL);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.message || 'Failed to fetch areas'
    );
  }
});

// 📌 Save Area
export const saveArea = createAsyncThunk<Area, Partial<Area>, { rejectValue: string }>('area/saveArea', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_AREA_SAVE_URL, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.message || 'Failed to save area'
    );
  }
});

// 📌 Edit Area
export const editArea = createAsyncThunk<Area, { id: string | number }, { rejectValue: string }
>('area/editArea', async ({ id }, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_AREA_EDIT_URL}/${id}`);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.message || 'Failed to fetch area'
    );
  }
});

// 📌 Update Area
export const updateArea = createAsyncThunk<Area, Area, { rejectValue: string }>('area/updateArea', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_AREA_UPDATE_URL, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.message || 'Failed to update area'
    );
  }
});

// 📌 Area DDL (for dropdown)
export const fetchAreaDdl = createAsyncThunk<AreaDdlItem[], string | undefined, { rejectValue: string } >('area/fetchAreaDdl', async (search = '', thunkAPI) => {
  try {
    const res = await httpService.get(
      `${API_AREA_DDL_URL}?q=${search}`
    );
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.message || 'Failed to fetch area dropdown'
    );
  }
});

/* ================= SLICE ================= */

const areaSlice = createSlice({
  name: 'area',
  initialState,
  reducers: {
    clearAreaError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder

      /* ===== Area List ===== */
      .addCase(fetchAreas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAreas.fulfilled, (state, action) => {
        state.loading = false;
        state.areas = action.payload;
      })
      .addCase(fetchAreas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch areas';
      })

      /* ===== Save Area ===== */
      .addCase(saveArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveArea.fulfilled, (state, action) => {
        state.loading = false;
        state.areas.push(action.payload);
      })
      .addCase(saveArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to save area';
      })

      /* ===== Edit Area ===== */
      .addCase(editArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editArea.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.areas.findIndex(
          (a) => a.id === action.payload.id
        );
        if (idx !== -1) {
          state.areas[idx] = action.payload;
        } else {
          state.areas.push(action.payload);
        }
      })
      .addCase(editArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch area';
      })

      /* ===== Update Area ===== */
      .addCase(updateArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateArea.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.areas.findIndex(
          (a) => a.id === action.payload.id
        );
        if (idx !== -1) {
          state.areas[idx] = action.payload;
        }
      })
      .addCase(updateArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update area';
      })
      /* ===== Area DDL ===== */
      .addCase(fetchAreaDdl.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAreaDdl.fulfilled, (state, action) => {
        state.loading = false;
        state.areaDdl = action.payload;
      })
      .addCase(fetchAreaDdl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch area dropdown';
      })
  },
});

/* ================= EXPORTS ================= */

export const { clearAreaError } = areaSlice.actions;
export default areaSlice.reducer;

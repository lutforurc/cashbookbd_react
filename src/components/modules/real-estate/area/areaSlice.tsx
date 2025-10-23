// src/store/slices/areaSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import {
  API_AREA_LIST_URL,
  API_AREA_SAVE_URL,
  API_AREA_EDIT_URL,
  API_AREA_UPDATE_URL,
} from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

/* ---------------- Types / Interfaces ---------------- */

export interface Area {
  id: string | number;
  name: string;
  code?: string;
  districtId?: number | string;
  upazilaId?: number | string;
  remarks?: string;
  status?: 'active' | 'inactive';
}

interface AreaState {
  areas: Area[];
  loading: boolean;
  error: string | null;
}

const initialState: AreaState = {
  areas: [],
  loading: false,
  error: null,
};

// (ঐচ্ছিক) সার্ভারের সেভ-রেসপন্স টাইপ; প্রয়োজনমত অ্যাডজাস্ট করো
type SaveAreaResponse = {
  success: boolean;
  message?: string | number;
  data?: Area | Area[]; // কখনো single, কখনো list আসতে পারে
  success_code?: { code: number };
  error?: { code: number; message?: string };
};

/* ---------------- Async Thunks ---------------- */

// 📌 Fetch Area list
export const fetchAreas = createAsyncThunk<Area[], void, { rejectValue: string }>('area/fetchAreas', async (_, thunkAPI) => {
    try {
      const res = await httpService.get(API_AREA_LIST_URL);
      // ধরে নিচ্ছি API সরাসরি Area[] রিটার্ন করে; না হলে res.data.data ইত্যাদি অনুযায়ী map করো
      return res.data as Area[];
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err?.message || 'Failed to fetch areas');
    }
  }
);

// 📌 Save Area (create)
export const saveArea = createAsyncThunk<Area, Partial<Area>, { rejectValue: string }>('area/saveArea',async (payload, thunkAPI) => {
    try {
      const res = await httpService.post(API_AREA_SAVE_URL, payload);
      // const data = (res.data?.data ?? res.data) as Area;
      return res.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err?.message || 'Failed to save area');
    }
  }
);

// 📌 Edit Area (get single by id)
export const editArea = createAsyncThunk<Area, { id: string | number }, { rejectValue: string }>('area/editArea', async ({ id }, thunkAPI) => {
    try {
      const res = await httpService.get(`${API_AREA_EDIT_URL}/${id}`);
      const data = (res.data?.data ?? res.data) as Area;
      return data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err?.message || 'Failed to fetch area');
    }
  }
);

// 📌 Update Area
export const updateArea = createAsyncThunk<Area, Area, { rejectValue: string }>('area/updateArea',async (payload, thunkAPI) => {
    try {
      const res = await httpService.post(API_AREA_UPDATE_URL, payload);
      const data = (res.data?.data ?? res.data) as Area;
      return data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err?.message || 'Failed to update area');
    }
  }
);

/* ---------------- Slice ---------------- */

const areaSlice = createSlice({
  name: 'area',
  initialState,
  reducers: {
    addArea(state, action: PayloadAction<Area>) {
      state.areas.push(action.payload);
    },
    deleteArea(state, action: PayloadAction<string | number>) {
      state.areas = state.areas.filter((a) => a.id !== action.payload);
    },
    // (ঐচ্ছিক) bulk set
    setAreas(state, action: PayloadAction<Area[]>) {
      state.areas = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 📌 Fetch
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

      // 📌 Save
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

      // 📌 Edit (fetch single & merge/replace)
      .addCase(editArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editArea.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.areas.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) {
          state.areas[idx] = action.payload;
        } else {
          // যদি আগে লিস্টে না থাকে, চাইলে পুশ করো
          state.areas.push(action.payload);
        }
      })
      .addCase(editArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch area';
      })

      // 📌 Update
      .addCase(updateArea.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateArea.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.areas.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) {
          state.areas[idx] = action.payload;
        }
      })
      .addCase(updateArea.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update area';
      });
  },
});

/* ---------------- Exports ---------------- */

export const { addArea, deleteArea, setAreas } = areaSlice.actions;
export default areaSlice.reducer;

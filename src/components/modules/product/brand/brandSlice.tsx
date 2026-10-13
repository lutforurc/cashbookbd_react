import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { API_BRAND_LIST_URL, API_BRAND_SAVE_URL, API_BRAND_EDIT_URL, API_BRAND_UPDATE_URL, API_BRAND_DDL_URL, API_BRAND_DELETE_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

/* ================= TYPES ================= */

export interface Brand {
  id: string | number;
  name: string;
  address: string;
  email: string;
  contacts: string;
  status?: 'active' | 'inactive' | string;
}

export interface BrandDdlItem {
  value: string | number;
  label: string;
  status?: string | number;
}

interface BrandState {
  brands: Brand[];
  brandDdl: BrandDdlItem[];
  editData: Brand | null;
  isLoading: boolean;
  /**
   * Has `fetchBrandDdl` ever come back? `isLoading` cannot answer that: it
   * starts false, so the render before the thunk's pending action lands looks
   * exactly like a finished fetch with nothing in it -- and a screen gating on
   * it draws an empty box for that frame. Same flag, same reading, as
   * areaSlice's `loaded`.
   */
  loaded: boolean;
  error: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: BrandState = {
  brands: [],
  brandDdl: [],
  editData: null,
  isLoading: false,
  loaded: false,
  error: null,
};

/* ================= ASYNC THUNKS ================= */

// 📌 Fetch Brand list
export const fetchBrands = createAsyncThunk<any, { search?: string; page?: number; per_page?: number }, { rejectValue: string }>('brand/fetchBrands', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_BRAND_LIST_URL, { params });

    // ⚠️ "Nothing matched" is not a failure to the transport. notFound() rides
    // HTTP 201, so axios hands it back as a success, `data.data` is an empty
    // array, and the words it carried -- "No brand found" -- were dropped on
    // the floor: the list went quietly blank instead. Every other refusal
    // arrives as a throw and is caught below; this is the one that has to be
    // read, and reading it is what puts it on the screen.
    if (res.data?.success === false) {
      return thunkAPI.rejectWithValue(res.data?.message || 'No brand found');
    }

    return res.data?.data ?? res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch brands'
    );
  }
});

// 📌 Save Brand
export const saveBrand = createAsyncThunk<any, Partial<Brand>, { rejectValue: string }>('brand/saveBrand', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_BRAND_SAVE_URL, payload);
    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.message || 'Failed to save brand');
  }
}
);

// 📌 Edit Brand
export const editBrand = createAsyncThunk<any, string | number, { rejectValue: string }>('brand/editBrand', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_BRAND_EDIT_URL}/${id}`);
    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.message || 'Failed to fetch brand');
  }
}
);

// 📌 Update Brand
export const updateBrand = createAsyncThunk<any, Brand, { rejectValue: string }>('brand/updateBrand', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_BRAND_UPDATE_URL, payload);
    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.message || 'Failed to update brand');
  }
}
);

// 📌 Delete Brand
export const deleteBrand = createAsyncThunk<any, string | number, { rejectValue: string }>('brand/deleteBrand', async (id, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_BRAND_DELETE_URL}${id}`);
    return res.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to delete brand'
    );
  }
}
);

// 📌 Brand DDL (for dropdown)
export const fetchBrandDdl = createAsyncThunk<BrandDdlItem[],string | undefined,{ rejectValue: string }>('brand/fetchBrandDdl', async (search = '', thunkAPI) => {
    try {
      const res = await httpService.get(API_BRAND_DDL_URL, {
        params: { search }, // ✅ backend expects "search"
      });

      return res.data?.data ?? res.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || 'Failed to fetch brand dropdown'
      );
    }
  }
);


/* ================= SLICE ================= */

const brandSlice = createSlice({
  name: 'brand',
  initialState,
  reducers: {
    clearBrandError(state) {
      state.error = null;
    },
    clearBrandEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Brand List ===== */
      .addCase(fetchBrands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action: PayloadAction<Brand[]>) => {
        state.isLoading = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch brands';
        // The rows standing under a "No brand found" toast must not be the
        // previous search's. The screen reads `brands.data.data`, so a bare
        // array here is how it is told there is nothing to draw.
        state.brands = [];
      })

      /* ===== Save Brand ===== */
      .addCase(saveBrand.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveBrand.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;

        const newBrand: Brand | undefined = action.payload?.data ?? action.payload;
        if (newBrand?.id) {
          state.brands.unshift(newBrand);
        }
      })
      .addCase(saveBrand.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save brand';
      })

      /* ===== Edit Brand ===== */
      .addCase(editBrand.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editBrand.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;

        const brandData: Brand | null = action.payload?.data ?? null;
        state.editData = brandData;

        if (brandData?.id) {
          const idx = state.brands.findIndex((b) => b.id === brandData.id);
          if (idx !== -1) state.brands[idx] = brandData;
        }
      })
      .addCase(editBrand.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch brand';
      })

      /* ===== Update Brand ===== */
      .addCase(updateBrand.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBrand.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;

        const updated: Brand | undefined = action.payload?.data ?? action.payload;
        if (updated?.id) {
          const idx = state.brands.findIndex((b) => b.id === updated.id);
          if (idx !== -1) state.brands[idx] = updated;
          state.editData = updated; // form sync
        }
      })
      .addCase(updateBrand.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update brand';
      })

      /* ===== Brand DDL ===== */
      .addCase(fetchBrandDdl.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBrandDdl.fulfilled, (state, action: PayloadAction<BrandDdlItem[]>) => {
        state.isLoading = false;
        state.loaded = true;
        state.brandDdl = action.payload;
      })
      .addCase(fetchBrandDdl.rejected, (state, action) => {
        state.isLoading = false;
        // A failed call has still come back -- there is nothing more to wait
        // for, and a box that spun forever would hide the error behind it.
        state.loaded = true;
        state.error = action.payload || 'Failed to fetch brand dropdown';
      });
  },
});

/* ================= EXPORTS ================= */

export const { clearBrandError, clearBrandEditData } = brandSlice.actions;
export default brandSlice.reducer;

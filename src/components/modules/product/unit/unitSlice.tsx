import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  API_PRODUCT_UNIT_DDL_URL,
  API_PRODUCT_UNIT_EDIT_URL,
  API_PRODUCT_UNIT_LIST_URL,
  API_PRODUCT_UNIT_SAVE_URL,
  API_PRODUCT_UNIT_UPDATE_URL,
} from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

const unwrapApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

export interface ProductUnit {
  id: string | number;
  name: string;
  short_name: string;
  description: string;
  status?: string | number;
}

export interface ProductUnitDdlItem {
  value: string | number;
  label: string;
  status?: string | number;
}

interface ProductUnitState {
  units: any;
  unitDdl: any[];
  editData: ProductUnit | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductUnitState = {
  units: [],
  unitDdl: [],
  editData: null,
  isLoading: false,
  error: null,
};

export const fetchProductUnits = createAsyncThunk<
  any,
  { search?: string; page?: number; per_page?: number },
  { rejectValue: string }
>('productUnit/fetchProductUnits', async (params, thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCT_UNIT_LIST_URL, { params });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch units',
    );
  }
});

export const saveProductUnit = createAsyncThunk<
  any,
  Partial<ProductUnit>,
  { rejectValue: string }
>('productUnit/saveProductUnit', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_PRODUCT_UNIT_SAVE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to save unit',
    );
  }
});

export const editProductUnit = createAsyncThunk<
  any,
  string | number,
  { rejectValue: string }
>('productUnit/editProductUnit', async (id, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_PRODUCT_UNIT_EDIT_URL}/${id}`);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to fetch unit',
    );
  }
});

export const updateProductUnit = createAsyncThunk<
  any,
  ProductUnit,
  { rejectValue: string }
>('productUnit/updateProductUnit', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_PRODUCT_UNIT_UPDATE_URL, payload);
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || err?.message || 'Failed to update unit',
    );
  }
});

export const fetchProductUnitDdl = createAsyncThunk<
  ProductUnitDdlItem[],
  string | undefined,
  { rejectValue: string }
>('productUnit/fetchProductUnitDdl', async (search = '', thunkAPI) => {
  try {
    const res = await httpService.get(API_PRODUCT_UNIT_DDL_URL, {
      params: { search },
    });
    return unwrapApiData(res.data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch unit dropdown',
    );
  }
});

const unitSlice = createSlice({
  name: 'productUnit',
  initialState,
  reducers: {
    clearProductUnitError(state) {
      state.error = null;
    },
    clearProductUnitEditData(state) {
      state.editData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductUnits.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchProductUnits.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.isLoading = false;
          state.units = action.payload;
        },
      )
      .addCase(fetchProductUnits.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch units';
      })
      .addCase(saveProductUnit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveProductUnit.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        const newUnit: ProductUnit | undefined = action.payload;
        if (newUnit?.id) {
          if (Array.isArray(state.units)) {
            state.units.unshift(newUnit);
          } else if (Array.isArray(state.units?.data)) {
            state.units.data.unshift(newUnit);
          }
        }
      })
      .addCase(saveProductUnit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to save unit';
      })
      .addCase(editProductUnit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editProductUnit.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.editData = action.payload ?? null;
      })
      .addCase(editProductUnit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch unit';
      })
      .addCase(updateProductUnit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        updateProductUnit.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.isLoading = false;
          const updated: ProductUnit | undefined = action.payload;
          if (updated?.id) {
            if (Array.isArray(state.units)) {
              const idx = state.units.findIndex((unit) => unit.id === updated.id);
              if (idx !== -1) state.units[idx] = updated;
            } else if (Array.isArray(state.units?.data)) {
              const idx = state.units.data.findIndex(
                (unit) => unit.id === updated.id,
              );
              if (idx !== -1) state.units.data[idx] = updated;
            }
            state.editData = updated;
          }
        },
      )
      .addCase(updateProductUnit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update unit';
      })
      .addCase(fetchProductUnitDdl.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        fetchProductUnitDdl.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.isLoading = false;
          state.unitDdl = action.payload;
        },
      )
      .addCase(fetchProductUnitDdl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch unit dropdown';
      });
  },
});

export const { clearProductUnitError, clearProductUnitEditData } =
  unitSlice.actions;
export default unitSlice.reducer;

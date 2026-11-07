import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_PRODUCTION_RECIPE_DESTROY_URL,
  API_PRODUCTION_RECIPE_DETAILS_URL,
  API_PRODUCTION_RECIPE_LIST_URL,
  API_PRODUCTION_RECIPE_NEW_VERSION_URL,
  API_PRODUCTION_RECIPE_STORE_URL,
  API_PRODUCTION_RECIPE_UPDATE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface ProductionRecipeState {
  isLoading: boolean;
  isSaving: boolean;
  errors: string | null;
  // Every version, or -- with a date -- the one in force that day.
  recipes: any[];
  // One version with its lines, for the form and the entry picker.
  recipe: any;
}

const initialState: ProductionRecipeState = {
  isLoading: false,
  isSaving: false,
  errors: null,
  recipes: [],
  recipe: null,
};

// foundData() wraps the payload one level deeper than it looks: the body is
// {success, data: {data: <payload>}}.
const unwrap = (responseData: any) =>
  responseData?.data?.data ?? responseData?.data ?? {};

const pickError = (responseData: any, fallback: string) =>
  responseData?.error?.message || responseData?.message || fallback;

export const getProductionRecipes = createAsyncThunk<any[], { date?: string } | undefined>(
  'productionRecipe/getRecipes',
  async (params, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_PRODUCTION_RECIPE_LIST_URL, { params: params ?? {} });
      const body = res.data;

      if (body?.success) {
        const payload = unwrap(body);

        return Array.isArray(payload) ? payload : (payload?.data ?? []);
      }

      return rejectWithValue(pickError(body, 'Failed to load recipes'));
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to load recipes');
    }
  },
);

export const getProductionRecipe = createAsyncThunk<
  any,
  { id: number | string; callback?: (response: any) => void }
>('productionRecipe/getRecipe', async ({ id, callback }, { rejectWithValue }) => {
  try {
    const res = await httpService.get(`${API_PRODUCTION_RECIPE_DETAILS_URL}/${id}`);
    const body = res.data;

    if (body?.success) {
      const payload = unwrap(body);

      callback?.({ success: true, data: payload });

      return payload;
    }

    callback?.({ success: false, message: pickError(body, 'Could not open the recipe') });

    return rejectWithValue(pickError(body, 'Could not open the recipe'));
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || 'Could not open the recipe';
    callback?.({ success: false, message });

    return rejectWithValue(message);
  }
});

// Add and update share one thunk: the id decides which endpoint. The server
// keeps the version chain, so an edit never silently becomes a new version.
export const saveProductionRecipe = (
  id: number | null,
  data: any,
  callback?: (response: any) => void,
) => async () => {
  const url = id ? API_PRODUCTION_RECIPE_UPDATE_URL : API_PRODUCTION_RECIPE_STORE_URL;
  const res = await httpService.post(url, { ...data, ...(id ? { id } : {}) });
  const responseData = res.data;

  callback?.(responseData);

  return responseData;
};

export const newProductionRecipeVersion = (
  id: number,
  effectiveDate: string | null,
  callback?: (response: any) => void,
) => async () => {
  const res = await httpService.post(`${API_PRODUCTION_RECIPE_NEW_VERSION_URL}/${id}`, {
    effective_date: effectiveDate || null,
  });
  const responseData = res.data;

  callback?.(responseData);

  return responseData;
};

export const destroyProductionRecipe = (id: number, callback?: (response: any) => void) => async () => {
  const res = await httpService.post(`${API_PRODUCTION_RECIPE_DESTROY_URL}/${id}`, {});
  const responseData = res.data;

  callback?.(responseData);

  return responseData;
};

const productionRecipeSlice = createSlice({
  name: 'productionRecipe',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProductionRecipes.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getProductionRecipes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recipes = action.payload;
      })
      .addCase(getProductionRecipes.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = (action.payload as string) || 'Failed to load recipes';
      })
      .addCase(getProductionRecipe.fulfilled, (state, action) => {
        state.recipe = action.payload;
      });
  },
});

export default productionRecipeSlice.reducer;

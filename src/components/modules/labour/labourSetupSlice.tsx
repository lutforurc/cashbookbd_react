import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_LABOUR_CATEGORY_DDL_URL,
  API_LABOUR_CATEGORY_DELETE_URL,
  API_LABOUR_CATEGORY_LIST_URL,
  API_LABOUR_CATEGORY_STATUS_URL,
  API_LABOUR_CATEGORY_STORE_URL,
  API_LABOUR_CATEGORY_UPDATE_URL,
  API_LABOUR_ITEM_DELETE_URL,
  API_LABOUR_ITEM_LIST_URL,
  API_LABOUR_ITEM_STATUS_URL,
  API_LABOUR_ITEM_STORE_URL,
  API_LABOUR_ITEM_UPDATE_URL,
} from '../../services/apiRoutes';

/**
 * Labour categories and labour items — the two lists a labour bill is built
 * from. One slice for both, because the item form needs the category list and
 * splitting them would mean two slices fetching the same dropdown.
 */

export interface LabourCategory {
  id: number;
  name: string;
  description: string;
  status: number;
  serial_no?: number;
}

export interface LabourItem {
  id: number;
  name: string;
  description: string;
  lab_cat_id: number;
  unit_id: number;
  purchase_price: string | number;
  status: number;
  category_name?: string;
  unit_name?: string;
  serial_no?: number;
}

interface ListState<T> {
  rows: T[];
  total: number;
  currentPage: number;
}

interface LabourSetupState {
  categories: ListState<LabourCategory>;
  items: ListState<LabourItem>;
  categoryDdl: Array<{ id: number; name: string }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const emptyList = { rows: [], total: 0, currentPage: 1 };

const initialState: LabourSetupState = {
  categories: { ...emptyList },
  items: { ...emptyList },
  categoryDdl: [],
  loading: false,
  saving: false,
  error: null,
};

/**
 * The paginator the API sends back, flattened.
 *
 * `foundData()` wraps everything one level deep, and a paginated payload adds
 * another, so the rows are three levels down. Read once here rather than at
 * every call site.
 */
const readPage = (payload: any) => {
  const page = payload?.data?.data ?? payload?.data ?? {};
  return {
    rows: Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [],
    total: Number(page?.total ?? 0),
    currentPage: Number(page?.current_page ?? 1),
  };
};

/** The message the API sends, whichever shape the failure took. */
const readError = (error: any, fallback: string) =>
  error?.response?.data?.message
  ?? error?.response?.data?.error?.message
  ?? error?.message
  ?? fallback;

/* ========================= Categories ========================= */

export const labourCategoryList = createAsyncThunk(
  'labourSetup/categoryList',
  async (params: { page?: number; per_page?: number; q?: string }, thunkAPI) => {
    try {
      const response = await httpService.get(API_LABOUR_CATEGORY_LIST_URL, { params });
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not load labour categories'));
    }
  },
);

export const labourCategoryDdl = createAsyncThunk(
  'labourSetup/categoryDdl',
  async (_: void, thunkAPI) => {
    try {
      const response = await httpService.get(API_LABOUR_CATEGORY_DDL_URL);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not load labour categories'));
    }
  },
);

export const labourCategorySave = createAsyncThunk(
  'labourSetup/categorySave',
  async (payload: { id?: number | null; name: string; description?: string; status?: boolean }, thunkAPI) => {
    try {
      const url = payload.id
        ? `${API_LABOUR_CATEGORY_UPDATE_URL}/${payload.id}`
        : API_LABOUR_CATEGORY_STORE_URL;

      const response = await httpService.post(url, {
        name: payload.name,
        description: payload.description ?? '',
        status: payload.status === false ? 0 : 1,
      });

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not save the labour category'));
    }
  },
);

export const labourCategoryDelete = createAsyncThunk(
  'labourSetup/categoryDelete',
  async (id: number, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_LABOUR_CATEGORY_DELETE_URL}/${id}`);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not delete the labour category'));
    }
  },
);

export const labourCategoryStatus = createAsyncThunk(
  'labourSetup/categoryStatus',
  async (payload: { id: number; status: boolean }, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_LABOUR_CATEGORY_STATUS_URL}/${payload.id}`, {
        status: payload.status ? 1 : 0,
      });
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not change the status'));
    }
  },
);

/* =========================== Items =========================== */

export const labourItemList = createAsyncThunk(
  'labourSetup/itemList',
  async (params: { page?: number; per_page?: number; q?: string; category_id?: number }, thunkAPI) => {
    try {
      const response = await httpService.get(API_LABOUR_ITEM_LIST_URL, { params });
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not load labour items'));
    }
  },
);

export const labourItemSave = createAsyncThunk(
  'labourSetup/itemSave',
  async (
    payload: {
      id?: number | null;
      name: string;
      lab_cat_id: number | string;
      unit_id: number | string;
      purchase_price?: number | string;
      description?: string;
      status?: boolean;
    },
    thunkAPI,
  ) => {
    try {
      const url = payload.id
        ? `${API_LABOUR_ITEM_UPDATE_URL}/${payload.id}`
        : API_LABOUR_ITEM_STORE_URL;

      const response = await httpService.post(url, {
        name: payload.name,
        lab_cat_id: Number(payload.lab_cat_id),
        unit_id: Number(payload.unit_id),
        purchase_price: Number(payload.purchase_price ?? 0),
        description: payload.description ?? '',
        status: payload.status === false ? 0 : 1,
      });

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not save the labour item'));
    }
  },
);

export const labourItemDelete = createAsyncThunk(
  'labourSetup/itemDelete',
  async (id: number, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_LABOUR_ITEM_DELETE_URL}/${id}`);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not delete the labour item'));
    }
  },
);

export const labourItemStatus = createAsyncThunk(
  'labourSetup/itemStatus',
  async (payload: { id: number; status: boolean }, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_LABOUR_ITEM_STATUS_URL}/${payload.id}`, {
        status: payload.status ? 1 : 0,
      });
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(readError(error, 'Could not change the status'));
    }
  },
);

const labourSetupSlice = createSlice({
  name: 'labourSetup',
  initialState,
  reducers: {
    /**
     * Flip a row's status in the list without refetching it.
     *
     * A switch that waits for a round trip before it moves reads as broken, so
     * the row is changed at once and put back if the request fails.
     */
    setCategoryStatus: (state, action: { payload: { id: number; status: number } }) => {
      const row = state.categories.rows.find((r) => Number(r.id) === action.payload.id);
      if (row) row.status = action.payload.status;
    },
    setItemStatus: (state, action: { payload: { id: number; status: number } }) => {
      const row = state.items.rows.find((r) => Number(r.id) === action.payload.id);
      if (row) row.status = action.payload.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(labourCategoryList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(labourCategoryList.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = readPage(action.payload);
      })
      .addCase(labourCategoryList.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload ?? 'Could not load labour categories');
      })

      .addCase(labourCategoryDdl.fulfilled, (state, action: any) => {
        const rows = action.payload?.data?.data ?? action.payload?.data ?? [];
        state.categoryDdl = Array.isArray(rows) ? rows : [];
      })

      .addCase(labourItemList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(labourItemList.fulfilled, (state, action) => {
        state.loading = false;
        state.items = readPage(action.payload);
      })
      .addCase(labourItemList.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload ?? 'Could not load labour items');
      });

    // Every save and delete shares one saving flag, so the buttons on both
    // screens can be disabled while a write is in flight.
    [labourCategorySave, labourCategoryDelete, labourItemSave, labourItemDelete].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.saving = false;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = String(action.payload ?? 'Save failed');
        });
    });
  },
});

export const { setCategoryStatus, setItemStatus } = labourSetupSlice.actions;

export default labourSetupSlice.reducer;

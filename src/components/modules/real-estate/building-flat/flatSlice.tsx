import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_FLAT_LIST_URL,
  API_FLAT_STORE_URL,
  API_FLAT_UPDATE_URL,
  API_FLAT_EDIT_URL,
  API_FLAT_DDL_LIST_URL,
  API_FLAT_LAYOUT_URL,
} from "../../../services/apiRoutes";
import { getToken } from "../../../../features/authReducer";
import { FlatItem } from "./types";

/* ================= TYPES ================= */

interface FlatListRequest {
  page: number;
  per_page: number;
  search?: string;
  building_id?: number | string;
  floor_no?: number | string;
}

interface FlatDdlItem {
  value: number;
  label: string;
  label_1?: string;
  status: number;
}

/* ---- Layout Types ---- */

interface UnitItem {
  id: number;
  unit_no: string;
  size_sqft: string;
  status: number;
}

interface FlatLayoutFlat {
  flat_no: string;
  units: UnitItem[];
}

interface FlatLayoutFloor {
  floor_no: number;
  flats: FlatLayoutFlat[];
}

interface FlatLayoutResponse {
  building: string;
  floors: FlatLayoutFloor[];
}

/* ---- State ---- */

interface FlatState {
  flats: FlatItem[];
  flatDdl: FlatDdlItem[];
  editFlat: FlatItem | null;

  flatLayout: FlatLayoutResponse | null;

  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: FlatState = {
  flats: [],
  flatDdl: [],
  editFlat: null,

  flatLayout: null,

  loading: false,
  error: null,
  message: null,
};

/* ================= ASYNC THUNKS ================= */

/* ---- Flat List ---- */
export const floorList = createAsyncThunk<
  FlatItem[],
  FlatListRequest,
  { rejectValue: string }
>("flat/flatList", async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_FLAT_LIST_URL, { params });
    if (res.data?.success === true) {
      return res.data.data.data;
    }
    return rejectWithValue(res.data?.message || "Failed to fetch flats");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to fetch flats"
    );
  }
});

/* ---- Flat DDL ---- */
export const flatDdl = createAsyncThunk<
  FlatDdlItem[],
  string | undefined,
  { rejectValue: string }
>("flat/flatDdl", async (search = "", { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch(API_FLAT_DDL_LIST_URL + `?q=${search}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data?.success === true) {
      return data.data;
    }

    return rejectWithValue(data?.message || "Failed to load flat ddl");
  } catch (error: any) {
    return rejectWithValue(error?.message || "Failed to load flat ddl");
  }
});

/* ---- Store Flat ---- */
export const flatStore = createAsyncThunk<
  any,
  FlatItem,
  { rejectValue: string }
>("flat/flatStore", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_FLAT_STORE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Flat create failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Flat create failed"
    );
  }
});

/* ---- Update Flat ---- */
export const flatUpdate = createAsyncThunk<
  any,
  FlatItem,
  { rejectValue: string }
>("flat/flatUpdate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_FLAT_UPDATE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Flat update failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Flat update failed"
    );
  }
});

/* ---- Edit Flat ---- */
export const flatEdit = createAsyncThunk<
  FlatItem,
  number,
  { rejectValue: string }
>("flat/flatEdit", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_FLAT_EDIT_URL + id);
    if (res.data?.success === true) {
      return res.data.data.data;
    }

    return rejectWithValue(res.data?.message || "Failed to load flat");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load flat"
    );
  }
});

/* ---- Flat Layout (Building → Floor → Flat → Unit) ---- */
export const flatLayout = createAsyncThunk<FlatLayoutResponse,number,{ rejectValue: string }>("flat/flatLayout", async (buildingId, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_FLAT_LAYOUT_URL + buildingId + "/layout");

    if (res.data?.success === true) {
      return res.data.data.data;
    }

    return rejectWithValue(res.data?.message || "Failed to load flat layout");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load flat layout"
    );
  }
});

/* ================= SLICE ================= */

const flatSlice = createSlice({
  name: "flat",
  initialState,
  reducers: {
    clearFlatState(state) {
      state.flats = [];
      state.flatDdl = [];
      state.editFlat = null;
      state.flatLayout = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Flat List ===== */
      .addCase(floorList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        floorList.fulfilled,
        (state, action: PayloadAction<FlatItem[]>) => {
          state.loading = false;
          state.flats = action.payload;
        }
      )
      .addCase(floorList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load flats";
      })

      /* ===== Flat DDL ===== */
      .addCase(flatDdl.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        flatDdl.fulfilled,
        (state, action: PayloadAction<FlatDdlItem[]>) => {
          state.loading = false;
          state.flatDdl = action.payload;
        }
      )
      .addCase(flatDdl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load flat ddl";
      })

      /* ===== Store Flat ===== */
      .addCase(flatStore.pending, (state) => {
        state.loading = true;
      })
      .addCase(flatStore.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Flat created successfully";
      })
      .addCase(flatStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Flat create failed";
      })

      /* ===== Update Flat ===== */
      .addCase(flatUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(flatUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Flat updated successfully";
      })
      .addCase(flatUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Flat update failed";
      })

      /* ===== Edit Flat ===== */
      .addCase(flatEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        flatEdit.fulfilled,
        (state, action: PayloadAction<FlatItem>) => {
          state.loading = false;
          state.editFlat = action.payload;
        }
      )
      .addCase(flatEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load flat";
      })

      /* ===== Flat Layout ===== */
      .addCase(flatLayout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        flatLayout.fulfilled,
        (state, action: PayloadAction<FlatLayoutResponse>) => {
          state.loading = false;
          state.flatLayout = action.payload;
        }
      )
      .addCase(flatLayout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load flat layout";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearFlatState } = flatSlice.actions;

export default flatSlice.reducer;

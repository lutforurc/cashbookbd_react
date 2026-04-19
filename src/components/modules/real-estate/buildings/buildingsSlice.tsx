import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_BUILDING_LIST_URL,
  API_BUILDING_STORE_URL,
  API_BUILDING_UPDATE_URL,
  API_BUILDING_EDIT_URL,
  API_BUILDING_DDL_LIST_URL,
} from "../../../services/apiRoutes";
import { getToken } from "../../../../features/authReducer";

/* ================= TYPES ================= */

export interface BuildingItem {
  id?: number;
  name: string;
  code?: string;
  status?: number;
}

/* ---- List Request ---- */
interface BuildingListRequest {
  page: number;
  per_page: number;
  search?: string;
  project_id?: number | string;
  branchId?: number; // <-- add this
}

/* ---- DDL ---- */
interface BuildingDdlItem {
  value: number;
  label: string;
  status: number;
}

/* ---- State ---- */
interface BuildingState {
  buildings: BuildingItem[];
  buildingDdl: BuildingDdlItem[];
  editBuilding: BuildingItem | null;

  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: BuildingState = {
  buildings: [],
  buildingDdl: [],
  editBuilding: null,

  loading: false,
  error: null,
  message: null,
};

/* ================= ASYNC THUNKS ================= */

/* ---- Building List ---- */
export const buildingList = createAsyncThunk<any, BuildingListRequest, { rejectValue: string } >("building/buildingList",
  async (params, thunkAPI) => {
    try {
      const queryParams: any = {
        page: params.page,
        per_page: params.per_page,
      };

      // search -> q (backend যদি q নেয়)
      if (params.search) queryParams.q = params.search;

      if (params.project_id !== undefined) queryParams.project_id = params.project_id;

      if (params.branchId !== undefined) queryParams.branch_id = params.branchId;

      const res = await httpService.get(API_BUILDING_LIST_URL, { params: queryParams });

      if (res.data?.success === true) {
        return res.data.data.data;
      }

      return thunkAPI.rejectWithValue(
        res.data?.message || "Failed to fetch buildings"
      );
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch buildings"
      );
    }
  }
);

/* ---- Building DDL ---- */
export const fetchBuildingDdl = createAsyncThunk<BuildingDdlItem[],string | undefined,{ rejectValue: string }>("building/fetchBuildingDdl", async (search = "", { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch(API_BUILDING_DDL_LIST_URL + `?q=${search}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (data?.success === true) {
      return data.data;
    }

    return rejectWithValue(data?.message || "Failed to load building ddl");
  } catch (error: any) {
    return rejectWithValue(error?.message || "Failed to load building ddl");
  }
});

/* ---- Store Building ---- */
export const buildingStore = createAsyncThunk<any,BuildingItem,{ rejectValue: string }>("building/buildingStore", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_BUILDING_STORE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Building create failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Building create failed"
    );
  }
});

/* ---- Update Building ---- */
export const buildingUpdate = createAsyncThunk<
  any,
  BuildingItem,
  { rejectValue: string }
>("building/buildingUpdate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_BUILDING_UPDATE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Building update failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Building update failed"
    );
  }
});

/* ---- Edit Building ---- */
export const buildingEdit = createAsyncThunk<
  BuildingItem,
  number,
  { rejectValue: string }
>("building/buildingEdit", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_BUILDING_EDIT_URL + id);
    if (res.data?.success === true) {
      return res.data.data.data;
    }
    return rejectWithValue(res.data?.message || "Failed to load building");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load building"
    );
  }
});

/* ================= SLICE ================= */

const buildingSlice = createSlice({
  name: "building",
  initialState,
  reducers: {
    clearBuildingState(state) {
      state.buildings = [];
      state.buildingDdl = [];
      state.editBuilding = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Building List ===== */
      .addCase(buildingList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        buildingList.fulfilled,
        (state, action: PayloadAction<BuildingItem[]>) => {
          state.loading = false;
          state.buildings = action.payload;
        }
      )
      .addCase(buildingList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load buildings";
      })

      /* ===== Building DDL ===== */
      .addCase(fetchBuildingDdl.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchBuildingDdl.fulfilled,
        (state, action: PayloadAction<BuildingDdlItem[]>) => {
          state.loading = false;
          state.buildingDdl = action.payload;
        }
      )
      .addCase(fetchBuildingDdl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load building ddl";
      })

      /* ===== Store Building ===== */
      .addCase(buildingStore.pending, (state) => {
        state.loading = true;
      })
      .addCase(buildingStore.fulfilled, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Building created successfully";
      })
      .addCase(buildingStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Building create failed";
      })

      /* ===== Update Building ===== */
      .addCase(buildingUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(buildingUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Building updated successfully";
      })
      .addCase(buildingUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Building update failed";
      })

      /* ===== Edit Building ===== */
      .addCase(buildingEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        buildingEdit.fulfilled,
        (state, action: PayloadAction<BuildingItem>) => {
          state.loading = false;
          state.editBuilding = action.payload;
        }
      )
      .addCase(buildingEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load building";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearBuildingState } = buildingSlice.actions;
export default buildingSlice.reducer;

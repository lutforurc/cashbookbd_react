import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_UNIT_LIST_URL,
  API_UNIT_STORE_URL,
  API_UNIT_UPDATE_URL,
  API_UNIT_EDIT_URL,
  API_UNIT_DDL_LIST_URL,
} from "../../../services/apiRoutes";
import { getToken } from "../../../../features/authReducer";

/* ================= TYPES ================= */

export interface BuildingUnitListRequest {
  page: number;
  per_page: number;
  search?: string;
  flat_id?: number;
  customer_id?: number;
  status?: number; // 0=Inactive,1=Active,2=UnderDev,3=Completed,4=Sold
}

export interface UnitItem {
  id?: number;
  building_id?: number | string;
  floor_no?: number | string;
  flat_id?: number | string;

  unit_no: string;
  size_sqft?: string;
  status?: number;
}

/* ---- List Request ---- */
interface UnitListRequest {
  page: number;
  per_page: number;
  search?: string;
  building_id?: number | string;
  floor_no?: number | string;
  flat_id?: number | string;
}

/* ---- DDL ---- */
interface UnitDdlItem {
  value: number;
  label: string;
  label_1?: string;
  status: number;
}

/* ---- State ---- */
interface UnitState {
  units: UnitItem[];
  unitDdl: UnitDdlItem[];
  editUnit: UnitItem | null;

  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: UnitState = {
  units: [],
  unitDdl: [],
  editUnit: null,

  loading: false,
  error: null,
  message: null,
};

/* ================= ASYNC THUNKS ================= */

/* ---- Building Unit List ---- */
export const buildingUnitList = createAsyncThunk<any, BuildingUnitListRequest, { rejectValue: string } >( "buildingUnit/buildingUnitList", async (params, thunkAPI) => {
    try {
      const queryParams: any = {
        page: params.page,
        per_page: params.per_page,
      };

      // Optional filters
      if (params.search) queryParams.search = params.search;
      if (params.flat_id !== undefined) queryParams.flat_id = params.flat_id;
      if (params.customer_id !== undefined) queryParams.customer_id = params.customer_id;
      if (params.status !== undefined) queryParams.status = params.status;

      const res = await httpService.get(API_UNIT_LIST_URL, {
        params: queryParams,
      });

      if (res.data?.success === true) { 
        return res.data.data.data;
      }

      return thunkAPI.rejectWithValue(
        res.data?.message || "Failed to fetch building units"
      );
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch building units"
      );
    }
  }
);


/* ---- Unit DDL ---- */
export const unitDdl = createAsyncThunk<
  UnitDdlItem[],
  string | undefined,
  { rejectValue: string }
>("unit/unitDdl", async (search = "", { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch(API_UNIT_DDL_LIST_URL + `?q=${search}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data?.success === true) {
      return data.data;
    }

    return rejectWithValue(data?.message || "Failed to load unit ddl");
  } catch (error: any) {
    return rejectWithValue(error?.message || "Failed to load unit ddl");
  }
});

/* ---- Store Unit ---- */
export const unitStore = createAsyncThunk<
  any,
  UnitItem,
  { rejectValue: string }
>("unit/unitStore", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_STORE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Unit create failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Unit create failed"
    );
  }
});

/* ---- Update Unit ---- */
export const unitUpdate = createAsyncThunk<any, UnitItem, { rejectValue: string } >("unit/unitUpdate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_UPDATE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Unit update failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Unit update failed"
    );
  }
});

/* ---- Edit Unit ---- */
export const unitEdit = createAsyncThunk<
  UnitItem,
  number,
  { rejectValue: string }
>("unit/unitEdit", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_UNIT_EDIT_URL + id);
    if (res.data?.success === true) {
      return res.data.data.data;
    }
    return rejectWithValue(res.data?.message || "Failed to load unit");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to load unit"
    );
  }
});



/* ---- Unit DDL ---- */
export const fetchBuildingDdl = createAsyncThunk<UnitDdlItem[],string | undefined,{ rejectValue: string }>("building/fetchBuildingDdl", async (search = "", { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch(API_UNIT_DDL_LIST_URL + `?q=${search}`, {
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


/* ================= SLICE ================= */

const unitSlice = createSlice({
  name: "unit",
  initialState,
  reducers: {
    clearUnitState(state) {
      state.units = [];
      state.unitDdl = [];
      state.editUnit = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Unit List ===== */
      .addCase(buildingUnitList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        buildingUnitList.fulfilled,
        (state, action: PayloadAction<UnitItem[]>) => {
          state.loading = false;
          state.units = action.payload;
        }
      )
      .addCase(buildingUnitList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load units";
      })

      /* ===== Unit DDL ===== */
      .addCase(unitDdl.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        unitDdl.fulfilled,
        (state, action: PayloadAction<UnitDdlItem[]>) => {
          state.loading = false;
          state.unitDdl = action.payload;
        }
      )
      .addCase(unitDdl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load unit ddl";
      })

      /* ===== Store Unit ===== */
      .addCase(unitStore.pending, (state) => {
        state.loading = true;
      })
      .addCase(unitStore.fulfilled, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Unit created successfully";
      })
      .addCase(unitStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unit create failed";
      })

      /* ===== Update Unit ===== */
      .addCase(unitUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(unitUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Unit updated successfully";
      })
      .addCase(unitUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unit update failed";
      })

      /* ===== Edit Unit ===== */
      .addCase(unitEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        unitEdit.fulfilled,
        (state, action: PayloadAction<UnitItem>) => {
          state.loading = false;
          state.editUnit = action.payload;
        }
      )
      .addCase(unitEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load unit";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearUnitState } = unitSlice.actions;
export default unitSlice.reducer;

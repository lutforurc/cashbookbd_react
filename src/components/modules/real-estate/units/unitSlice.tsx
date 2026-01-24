import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_UNIT_LIST_URL, API_UNIT_STORE_URL, API_UNIT_UPDATE_URL, API_UNIT_EDIT_URL, API_UNIT_DDL_LIST_URL, API_UNIT_CHARGE_TYPE_LIST_URL, API_UNIT_CHARGE_TYPE_STORE_URL } from "../../../services/apiRoutes";
import { getToken } from "../../../../features/authReducer";
import { UnitChargeTypeItem } from "./types";

/* ================= TYPES ================= */

export interface BuildingUnitListRequest {
  page: number;
  per_page: number;
  search?: string;
  flat_id?: number;
  customer_id?: number;
  status?: number;
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

/* ---- Unit Price Breakdown ---- */
export interface UnitPriceItem {
  id: number;
  unit_id: number;
  charge_type_id: number;
  amount: number;
  note?: string;
  charge_type?: {
    id: number;
    name: string;
    effect: "+" | "-";
    sort_order: number;
  };
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

  unitChargeTypes: UnitChargeTypeItem[];
  unitPrices: UnitPriceItem[];

  loading: boolean;
  error: string | null;
  message: string | null;
}

export interface UnitChargeTypeListRequest {
  page: number;
  per_page?: number;   // primary
  limit?: number;      // fallback
  q?: string;
  branch_id?: number;
  is_active?: number;  // 1/0
}

/* ================= INITIAL STATE ================= */

const initialState: UnitState = {
  units: [],
  unitDdl: [],
  editUnit: null,

  unitChargeTypes: [],
  unitPrices: [],

  loading: false,
  error: null,
  message: null,
};

/* ================= UNIT CHARGE TYPE (DDL + CRUD) ================= */

export const unitChargeTypeList = createAsyncThunk<
  any, // paginator object
  UnitChargeTypeListRequest,
  { rejectValue: string }
>("unit/unitChargeTypeList", async (params, thunkAPI) => {
  try {
    const queryParams: any = {
      page: params.page,
      per_page: params.per_page ?? params.limit ?? 50,
    };

    if (params.q) queryParams.q = params.q;
    if (params.branch_id !== undefined) queryParams.branch_id = params.branch_id;
    if (params.is_active !== undefined) queryParams.is_active = params.is_active;

    const res = await httpService.get(API_UNIT_CHARGE_TYPE_LIST_URL, { params: queryParams });

    // ✅ API response: { data: { current_page, data: [], total, ... } }
    if (res.data?.data?.data) {
      return res.data.data; // <-- paginator object
    }

    return thunkAPI.rejectWithValue(res.data?.message || "Failed to fetch unit charge types");
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});


/* ---- Unit Charge Types DDL ---- */
export const unitChargeTypeDdl = createAsyncThunk<UnitChargeTypeItem[], void, { rejectValue: string }>("unit/unitChargeTypeDdl", async (_, { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch("/api/units/charge-types/ddl", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data?.success === true) {
      return data.data;
    }
    return rejectWithValue(data?.message || "Failed to load unit charge types");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Fetch Single Charge Type (Edit) ---- */
export const fetchUnitChargeType = createAsyncThunk<UnitChargeTypeItem, number, { rejectValue: string }>("unit/fetchUnitChargeType", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(`/api/units/charge-types/${id}`);
    if (res.data?.success === true) {
      return res.data.data;
    }
    return rejectWithValue(res.data?.message || "Failed to load charge type");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Store Charge Type ---- */
export const storeUnitChargeType = createAsyncThunk<any, Partial<UnitChargeTypeItem>, { rejectValue: string }>("unit/storeUnitChargeType", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_CHARGE_TYPE_STORE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Failed to create charge type");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Update Charge Type ---- */
export const updateUnitChargeType = createAsyncThunk<any, Partial<UnitChargeTypeItem>, { rejectValue: string }>("unit/updateUnitChargeType", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.put(`${API_UNIT_CHARGE_TYPE_LIST_URL}/${payload.id}`,
      payload
    );
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Failed to update charge type");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ================= UNIT PRICE CRUD ================= */

/* ---- List Unit Prices ---- */
export const fetchUnitPrices = createAsyncThunk<UnitPriceItem[], number, { rejectValue: string }>("unit/fetchUnitPrices", async (unitId, { rejectWithValue }) => {
  try {
    const res = await httpService.get(`/api/real-estate/units/unit-prices/${unitId}`);
    if (res.data?.success === true) {
      return res.data.data.breakdowns;
    }
    return rejectWithValue(res.data?.message || "Failed to load unit prices");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Store Unit Prices ---- */
export const storeUnitPrices = createAsyncThunk<any, { unit_id: number; items: { charge_type_id: number; amount: number; note?: string; }[] }, { rejectValue: string }>("unit/storeUnitPrices", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_CHARGE_TYPE_LIST_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Failed to save unit prices");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Update Unit Price ---- */
export const updateUnitPrice = createAsyncThunk<any, { id: number; amount: number; note?: string }, { rejectValue: string }>("unit/updateUnitPrice", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.put(`${API_UNIT_CHARGE_TYPE_LIST_URL}/${payload.id}`, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Update failed");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Delete Unit Price ---- */
export const deleteUnitPrice = createAsyncThunk<number, number, { rejectValue: string }>("unit/deleteUnitPrice", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.delete(`${API_UNIT_CHARGE_TYPE_LIST_URL}/${id}`);
    if (res.data?.success === true) {
      return id;
    }
    return rejectWithValue(res.data?.message || "Delete failed");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ================= EXISTING THUNKS ================= */

/* ---- Building Unit List ---- */
export const buildingUnitList = createAsyncThunk<any, BuildingUnitListRequest, { rejectValue: string }>("buildingUnit/buildingUnitList", async (params, thunkAPI) => {
  try {
    const queryParams: any = {
      page: params.page,
      per_page: params.per_page,
    };

    if (params.search) queryParams.search = params.search;
    if (params.flat_id !== undefined) queryParams.flat_id = params.flat_id;
    if (params.customer_id !== undefined)
      queryParams.customer_id = params.customer_id;
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
    return thunkAPI.rejectWithValue(error.message);
  }
});

/* ---- Unit DDL ---- */
export const unitDdl = createAsyncThunk<UnitDdlItem[], string | undefined, { rejectValue: string }>("unit/unitDdl", async (search = "", { rejectWithValue }) => {
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
    return rejectWithValue(error.message);
  }
});

/* ---- Store Unit ---- */
export const unitStore = createAsyncThunk<any, UnitItem, { rejectValue: string }>("unit/unitStore", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_STORE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Unit create failed");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Update Unit ---- */
export const unitUpdate = createAsyncThunk<any, UnitItem, { rejectValue: string }>("unit/unitUpdate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_UNIT_UPDATE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Unit update failed");
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/* ---- Edit Unit ---- */
export const unitEdit = createAsyncThunk<UnitItem, number, { rejectValue: string }>("unit/unitEdit", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_UNIT_EDIT_URL + id);
    if (res.data?.success === true) {
      return res.data.data.data;
    }
    return rejectWithValue(res.data?.message || "Failed to load unit");
  } catch (error: any) {
    return rejectWithValue(error.message);
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

      state.unitChargeTypes = [];
      state.unitPrices = [];

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
      .addCase(unitDdl.fulfilled, (state, action) => {
        state.unitDdl = action.payload;
      })

      /* ===== Unit Charge Types ===== */
      .addCase(unitChargeTypeDdl.fulfilled, (state, action) => {
        state.unitChargeTypes = action.payload;
      })

      /* ===== Unit Price ===== */
      .addCase(fetchUnitPrices.fulfilled, (state, action) => {
        state.unitPrices = action.payload;
      })
      .addCase(storeUnitPrices.fulfilled, (state, action) => {
        state.message = action.payload?.message || "Unit price saved";
      })
      .addCase(updateUnitPrice.fulfilled, (state) => {
        state.message = "Unit price updated";
      })
      .addCase(deleteUnitPrice.fulfilled, (state, action) => {
        state.unitPrices = state.unitPrices.filter(
          (item) => item.id !== action.payload
        );
      })

      /* ===== Unit Charge Type CRUD (Message only) ===== */
      .addCase(storeUnitChargeType.fulfilled, (state, action) => {
        state.message =
          action.payload?.message || "Charge type created successfully";
      })
      .addCase(updateUnitChargeType.fulfilled, (state, action) => {
        state.message =
          action.payload?.message || "Charge type updated successfully";
      })
      /* ===== Unit Charge Type List ===== */
      .addCase(unitChargeTypeList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unitChargeTypeList.fulfilled, (state, action) => {
        state.loading = false;
        state.unitChargeTypes = action.payload;
      })
      .addCase(unitChargeTypeList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load unit charge types";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearUnitState } = unitSlice.actions;
export default unitSlice.reducer;

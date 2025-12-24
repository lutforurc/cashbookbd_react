import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {

  API_EMPLOYEE_DDL_LIST_URL,
  API_EMPLOYEE_EDIT_URL,
  API_EMPLOYEE_LIST_URL,
  API_EMPLOYEE_SETTINGS_URL,
  API_EMPLOYEE_STORE_URL,
} from "../../../services/apiRoutes";

/* ================= TYPES ================= */

/* ---------- Employee (DDL / Dropdown) ---------- */
export interface EmployeeDDL {
  id: number;
  name: string;
}

/* ---------- Employee List ---------- */
export interface Employee {
  id: number;
  name: string;
  father_name: string | null;
  mobile: string;
  designation: string;
  branch_id: number;
  status: "Active" | "Inactive";
  joining_date: string;
}

export interface EmployeeListResponse {
  data: Employee[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface EmployeeListParams {
  page?: number;
  per_page?: number;
  branch_id?: number;
  status?: string;
  search?: string;
}

/* ---------- Employee Settings (Dropdown) ---------- */
export interface Branch {
  id: number;
  name: string;
}

export interface Designation {
  id: number;
  name: string;
}

export interface EmployeeGroup {
  id: number;
  name: string;
}

export interface EmployeeSettingsResponse {
  branches: Branch[];
  designations: Designation[];
  employee_groups: EmployeeGroup[];
  statuses: string[];
  genders: string[];
}

/* ---------- Request Payload ---------- */
export interface EmployeeDDLRequest {
  branchId: number;
}

/* ================= STATE ================= */

interface EmployeeState {
  employees: EmployeeListResponse | null;
  employee: any;
  employeeDDL: EmployeeDDL[];
  employeeSettings: EmployeeSettingsResponse | null;

  loading: boolean;
  error: string | null;
  message: string | null; // ✅ NEW
}

const initialState: EmployeeState = {
  employees: null,
  employee: {},
  employeeDDL: [],
  employeeSettings: null,
  loading: false,
  error: null,
  message: null, // ✅ NEW
};

/* ================= THUNKS ================= */

export const fetchEmployees = createAsyncThunk<
  EmployeeListResponse,
  EmployeeListParams | undefined,
  { rejectValue: string }
>(
  "employee/fetchEmployees",
  async (params = {}, thunkAPI) => {
    try {
      const response = await httpService.get(API_EMPLOYEE_LIST_URL, {
        params: {
          page: params.page ?? 1,
          per_page: params.per_page ?? 10,
          branch_id: params.branch_id ?? "",
          status: params.status ?? "",
          search: params.search ?? "",
        },
      });

      return response.data as EmployeeListResponse;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch employees"
      );
    }
  }
);

export const fetchEmployeeSettings = createAsyncThunk<EmployeeSettingsResponse, void, { rejectValue: string }>("employee/fetchEmployeeSettings", async (_, thunkAPI) => {
  try {
    const response = await httpService.get(API_EMPLOYEE_SETTINGS_URL);
    return response.data as EmployeeSettingsResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch employee settings"
    );
  }
});

export const getEmployeesDDL = createAsyncThunk<EmployeeDDL[], EmployeeDDLRequest, { rejectValue: { message: string } }>("employee/getEmployeesDDL", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_EMPLOYEE_DDL_LIST_URL, {
      branchId: payload.branchId,
    });
    return data;
  } catch {
    return rejectWithValue({
      message: "Failed to fetch employees",
    });
  }
});


/* ---------- Store Employee ---------- */
export const storeEmployee = createAsyncThunk<{ message: string }, any, { rejectValue: string }>("employee/storeEmployee", async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(
      API_EMPLOYEE_STORE_URL,
      payload
    );
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
      error.message ||
      "Failed to save employee"
    );
  }
}
);


export const fetchEmployeeById = createAsyncThunk<
  any,                // return type
  number,             // argument type (id)
  { rejectValue: string }
>(
  'employee/fetchEmployeeById',
  async (id, thunkAPI) => {
    try {
      const response = await httpService.get(
        `${API_EMPLOYEE_EDIT_URL}${id}`
      );

      // API structure অনুযায়ী
      if (response.data?.success) {
        return response.data.data.data;
      } else {
        return thunkAPI.rejectWithValue(
          response.data?.error?.message || 'Failed to fetch employee'
        );
      }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch employee'
      );
    }
  }
);

/* ================= SLICE ================= */

const employeeSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    // ✅ SAME STYLE AS installmentSlice
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setMessage(state, action: PayloadAction<string | null>) {
      state.message = action.payload;
    },
    clearEmployees(state) {
      state.employees = null;
      state.employee = {};
      state.employeeDDL = [];
      state.employeeSettings = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Employee List ===== */
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEmployees.fulfilled,
        (state, action: PayloadAction<EmployeeListResponse>) => {
          state.loading = false;
          state.employees = action.payload;
        }
      )
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch employees";
      })


      .addCase(fetchEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEmployeeById.fulfilled,
        (state, action: PayloadAction<EmployeeListResponse>) => {
          state.loading = false;
          state.employee = action.payload;
        }
      )
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch employees";
      })

      /* ===== Employee Settings ===== */
      .addCase(fetchEmployeeSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEmployeeSettings.fulfilled,
        (state, action: PayloadAction<EmployeeSettingsResponse>) => {
          state.loading = false;
          state.employeeSettings = action.payload;
        }
      )
      .addCase(fetchEmployeeSettings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch employee settings";
      })

      /* ===== Employee Dropdown ===== */
      .addCase(getEmployeesDDL.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getEmployeesDDL.fulfilled,
        (state, action: PayloadAction<EmployeeDDL[]>) => {
          state.loading = false;
          state.employeeDDL = action.payload;
        }
      )
      .addCase(getEmployeesDDL.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to fetch employees";
      })

      /* ===== Store Employee ===== */
      .addCase(storeEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(storeEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message || "Employee saved successfully";
      })
      .addCase(storeEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to save employee";
      });
  },
});

/* ================= EXPORTS (LIKE installmentSlice) ================= */

export const { setLoading, setMessage, clearEmployees } =
  employeeSlice.actions;

export default employeeSlice.reducer;

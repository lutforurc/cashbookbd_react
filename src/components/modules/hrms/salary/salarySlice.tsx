import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import { API_SALARY_VIEW_URL } from "../../../services/apiRoutes";

/* ================= TYPES ================= */

interface Designation {
  id: number;
  name: string;
}

export interface SalaryEmployee {
  id: number;
  employee_serial: string;
  name: string;
  bangla: string;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  others_allowance: number;
  loan_deduction: number;
  others_deduction: number;
  joning_dt: string;
  designation: number;
  serial_no: number;
  designation_name?: string;
  designations?: Designation;
}

interface SalaryViewRequest {
  branch_id: number;
  group_id?: number;
  month_id: string; // "YYYY-MM"
}

interface SalaryState {
  salaryEmployees: SalaryEmployee[];
  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: SalaryState = {
  salaryEmployees: [],
  loading: false,
  error: null,
  message: null,
};

/* ================= ASYNC THUNK ================= */

export const salaryView = createAsyncThunk<SalaryEmployee[], SalaryViewRequest, { rejectValue: string }>("salary/salaryView", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_SALARY_VIEW_URL, payload);
    if (res.data?.success === true) {
      return res.data.data;
    }

    return rejectWithValue(res.data?.message || "No salary data found");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch salary data"
    );
  }
}
);

export const salaryGenerate = createAsyncThunk<any, SalaryGenerateRequest, { rejectValue: string }>("salary/salaryGenerate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_SALARY_GENERATE_URL, payload);

    if (res.data?.success === true) {
      return res.data;
    }

    return rejectWithValue(
      res.data?.message || "Salary generation failed"
    );
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
      error.message ||
      "Failed to generate salary"
    );
  }
}
);


/* ================= SLICE ================= */

const salarySlice = createSlice({
  name: "salary",
  initialState,
  reducers: {
    clearSalaryData(state) {
      state.salaryEmployees = [];
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Salary View ===== */
      .addCase(salaryView.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(
        salaryView.fulfilled,
        (state, action: PayloadAction<SalaryEmployee[]>) => {
          state.loading = false;
          state.salaryEmployees = action.payload;
          state.message = "Salary data fetched successfully";
        }
      )
      .addCase(salaryView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch salary data";
      })

      /* ===== Salary Generate ===== */
      .addCase(salaryGenerate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(salaryGenerate.fulfilled, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Salary generated successfully";
      })
      .addCase(salaryGenerate.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to generate salary";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearSalaryData } = salarySlice.actions;

export default salarySlice.reducer;

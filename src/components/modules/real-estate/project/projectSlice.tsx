import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";
import {
  API_PROJECT_LIST_URL,
  API_PROJECT_STORE_URL,
  API_PROJECT_UPDATE_URL,
  API_PROJECT_EDIT_URL,
  API_PROJECT_DDL_LIST_URL,
} from "../../../services/apiRoutes";
import { getToken } from "../../../../features/authReducer";
import { ProjectItem } from "./types";

/* ================= TYPES ================= */

// export interface ProjectItem {
//   id?: number;
//   company_id: number | string;
//   branch_id: number | string;
//   area_id: number | string;
//   customer_id?: number | string | null;

//   name: string;
//   location_details?: string;
//   area_sqft: number | string;
//   purchase_price: number | string;
//   purchase_date: string;
//   sale_price?: number | string | null;
//   sale_date?: string | null;

//   notes?: string;
//   status: number | string;
// }

interface ProjectListRequest {
  page: number;
  per_page: number;
  search?: string;
  area_id?: number | string;
}

interface ProjectDdlItem {
  value: number;
  label: string;
  label_1?: string;
  status: number;
}

interface ProjectState {
  projects: ProjectItem[];
  projectDdl: ProjectDdlItem[];
  editProject: ProjectItem | null;
  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: ProjectState = {
  projects: [],
  projectDdl: [],
  editProject: null,
  loading: false,
  error: null,
  message: null,
};

/* ================= ASYNC THUNKS ================= */

/* ---- Project List ---- */
export const projectList = createAsyncThunk<
  any,
  ProjectListRequest,
  { rejectValue: string }
>("project/projectList", async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_PROJECT_LIST_URL, { params });

    if (res.data?.success === true) {
      return res.data.data.data;
    }

    return rejectWithValue(res.data?.message || "Failed to fetch projects");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error.message ||
        "Failed to fetch projects"
    );
  }
});

/* ---- Project DDL ---- */
export const projectDdl = createAsyncThunk<ProjectDdlItem[], string | undefined, { rejectValue: string }>("project/projectDdl", async (search = "", { rejectWithValue }) => {
  try {
    const token = getToken();
    const res = await fetch(API_PROJECT_DDL_LIST_URL + `?q=${search}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data?.success === true) {
      return data.data;
    }

    return rejectWithValue(data?.message || "Failed to load project ddl");
  } catch (error: any) {
    return rejectWithValue(
      error?.message || "Failed to load project ddl"
    );
  }
});

/* ---- Store Project ---- */
export const projectStore = createAsyncThunk<any, ProjectItem, { rejectValue: string } >("project/projectStore", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_PROJECT_STORE_URL, payload);

    if (res.data?.success === true) {
      return res.data;
    }

    return rejectWithValue(res.data?.message || "Project create failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error.message || "Project create failed"
    );
  }
});

/* ---- Update Project ---- */
export const projectUpdate = createAsyncThunk<any, ProjectItem, { rejectValue: string } >("project/projectUpdate", async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_PROJECT_UPDATE_URL, payload);
    if (res.data?.success === true) {
      return res.data;
    }
    return rejectWithValue(res.data?.message || "Project update failed");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error.message || "Project update failed"
    );
  }
});

/* ---- Edit Project ---- */
export const projectEdit = createAsyncThunk<ProjectItem, number, { rejectValue: string } >("project/projectEdit", async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_PROJECT_EDIT_URL + id);
    if (res.data?.success === true) {
      return res.data.data.data;
    }

    return rejectWithValue(res.data?.message || "Failed to load project");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error.message || "Failed to load project"
    );
  }
});

/* ================= SLICE ================= */

const projectSlice = createSlice({name: "project", initialState, reducers: {
    clearProjectState(state) {
      state.projects = [];
      state.projectDdl = [];
      state.editProject = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ===== Project List ===== */
      .addCase(projectList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        projectList.fulfilled,
        (state, action: PayloadAction<ProjectItem[]>) => {
          state.loading = false;
          state.projects = action.payload;
        }
      )
      .addCase(projectList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load projects";
      })

      /* ===== Project DDL ===== */
      .addCase(projectDdl.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        projectDdl.fulfilled,
        (state, action: PayloadAction<ProjectDdlItem[]>) => {
          state.loading = false;
          state.projectDdl = action.payload;
        }
      )
      .addCase(projectDdl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load project ddl";
      })

      /* ===== Store Project ===== */
      .addCase(projectStore.pending, (state) => {
        state.loading = true;
      })
      .addCase(projectStore.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Project created successfully";
      })
      .addCase(projectStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Project create failed";
      })

      /* ===== Update Project ===== */
      .addCase(projectUpdate.pending, (state) => {
        state.loading = true;
      })
      .addCase(projectUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload?.message || "Project updated successfully";
      })
      .addCase(projectUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Project update failed";
      })

      /* ===== Edit Project ===== */
      .addCase(projectEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        projectEdit.fulfilled,
        (state, action: PayloadAction<ProjectItem>) => {
          state.loading = false;
          state.editProject = action.payload;
        }
      )
      .addCase(projectEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load project";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearProjectState } = projectSlice.actions;

export default projectSlice.reducer;

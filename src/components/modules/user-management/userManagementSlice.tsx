import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import {
  API_GET_PERMISSIONS_URL,
  API_GET_ROLES_URL,
  API_GET_SELECTED_PERMISSIONS_URL,
  API_ROLE_STORE_URL,
  API_UPDATE_ROLE_PERMISSIONS_URL,
} from "../../services/apiRoutes";

// ------------------ Interfaces -------------------
interface Role {
  id: number;
  name: string;
  // add more if needed
}

interface Permission {
  id: number;
  name: string;
  // add more if needed
}

interface RoleState {
  loading: boolean;
  roles: Role[];
  permissions: Permission[];
  selectedPermissions: number[]; // Assuming selected permission IDs
  storeRole: any; // You can define a type if needed
  updatePermission: any; // You can define a type if needed
  error: string | null;
}

interface ErrorResponse {
  message: string;
}

interface UpdateRolePermissionsParams {
  roleId: string | number;
  selectedPermissions: number[];
}

// ------------------ Initial State -------------------
const initialState: RoleState = {
  loading: false,
  roles: [],
  permissions: [],
  selectedPermissions: [],
  storeRole: {},
  updatePermission: {},
  error: null,
};

// ------------------ Thunks -------------------
export const getRoles = createAsyncThunk<Role[], void, { rejectValue: ErrorResponse }>("getRoles/fetch", async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(API_GET_ROLES_URL);
      return data;
    } catch {
      return rejectWithValue({ message: "Authentication failed, please try again!" });
    }
  }
);

export const getPermissions = createAsyncThunk<Permission[], void, { rejectValue: ErrorResponse }>("getPermissions/fetch",async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(API_GET_PERMISSIONS_URL);
      return data;
    } catch {
      return rejectWithValue({ message: "Authentication failed, please try again!" });
    }
  }
);

export const getSelectedPermissions = createAsyncThunk<number[], number | string, { rejectValue: ErrorResponse }>("getRoleSelectedPermissions/fetch",async (roleId, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(`${API_GET_SELECTED_PERMISSIONS_URL}/${roleId}`);
      return data;
    } catch {
      return rejectWithValue({ message: "Authentication failed, please try again!" });
    }
  }
);

export const updateRolePermissions = createAsyncThunk<any, UpdateRolePermissionsParams, { rejectValue: ErrorResponse }>("updateRolePermissions/fetch", async ({ roleId, selectedPermissions }, { rejectWithValue }) => {
    try {
      const response = await httpService.put(`${API_UPDATE_ROLE_PERMISSIONS_URL}/${roleId}`, selectedPermissions);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

export const storeRole = createAsyncThunk<any, any, { rejectValue: ErrorResponse }>("storeRole/fetch",async (formData, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_ROLE_STORE_URL, formData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

// ------------------ Slice -------------------
const userManagementSlice = createSlice({
  name: "rolesProperties",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // getRoles
      .addCase(getRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(getRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      // getPermissions
      .addCase(getPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.permissions = action.payload;
      })
      .addCase(getPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      // getSelectedPermissions
      .addCase(getSelectedPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSelectedPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPermissions = action.payload;
      })
      .addCase(getSelectedPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      // updateRolePermissions
      .addCase(updateRolePermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRolePermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.updatePermission = action.payload;
      })
      .addCase(updateRolePermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })

      // storeRole
      .addCase(storeRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(storeRole.fulfilled, (state, action) => {
        state.loading = false;
        state.storeRole = action.payload;
      })
      .addCase(storeRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      });
  },
});

export const { setLoading } = userManagementSlice.actions;
export default userManagementSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import httpService from "../../services/httpService";
import {
  API_DDL_ROLE_LIST_URL,
  API_GET_PERMISSIONS_URL,
  API_GET_ROLES_URL,
  API_OWNER_ROLE_GROUP_URL,
  API_OWNER_ROLE_GROUP_SYNC_URL,
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
  ownerRoleGroup: any;
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

const extractRoleCollection = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeRolesPayload = (roles: any[]) => {
  const normalized = roles
    .map((role: any) => ({
      id: role?.id ?? role?.value ?? role?.role_id ?? null,
      name: role?.name ?? role?.label ?? role?.title ?? '',
      can_edit_permissions: role?.can_edit_permissions,
      is_plan_role: role?.is_plan_role,
      role_source: role?.role_source,
      subscription_plan_id: role?.subscription_plan_id ?? null,
      role_group_code: role?.role_group_code ?? null,
      is_company_owned_role: role?.is_company_owned_role ?? false,
      company_id: role?.company_id ?? null,
      team_id: role?.team_id ?? null,
    }))
    .filter((role: any) => role.id !== null && String(role.name || '').trim() !== '')
    .filter((role: any, index: number, arr: any[]) => {
      return index === arr.findIndex((item: any) => {
        if (item.id === role.id) return true;
        return String(item.name).trim().toLowerCase() === String(role.name).trim().toLowerCase();
      });
    });

  return {
    success: true,
    data: {
      data: normalized,
    },
  };
};

// ------------------ Initial State -------------------
const initialState: RoleState = {
  loading: false,
  roles: [],
  permissions: [],
  selectedPermissions: [],
  ownerRoleGroup: null,
  storeRole: {},
  updatePermission: {},
  error: null,
};

// ------------------ Thunks -------------------
export const getRoles = createAsyncThunk<Role[], void, { rejectValue: ErrorResponse }>("getRoles/fetch", async (_, { rejectWithValue }) => {
    try {
      const [ddlResponse, roleResponse] = await Promise.all([
        httpService.get(API_DDL_ROLE_LIST_URL),
        httpService.get(API_GET_ROLES_URL),
      ]);

      const ddlRoles = extractRoleCollection(ddlResponse?.data);
      const allRoles = extractRoleCollection(roleResponse?.data);
      const mergedRoles = [...ddlRoles, ...allRoles];

      return normalizeRolesPayload(mergedRoles) as any;
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

export const getOwnerRoleGroup = createAsyncThunk<any, void, { rejectValue: ErrorResponse }>(
  "ownerRoleGroup/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpService.get(API_OWNER_ROLE_GROUP_URL);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

export const updateOwnerRoleGroup = createAsyncThunk<any, number[], { rejectValue: ErrorResponse }>(
  "ownerRoleGroup/update",
  async (permissionIds, { rejectWithValue }) => {
    try {
      const response = await httpService.put(API_OWNER_ROLE_GROUP_URL, { permission_ids: permissionIds });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

export const syncOwnerRoleGroup = createAsyncThunk<any, void, { rejectValue: ErrorResponse }>(
  "ownerRoleGroup/sync",
  async (_, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_OWNER_ROLE_GROUP_SYNC_URL);
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

      // owner role group
      .addCase(getOwnerRoleGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOwnerRoleGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.ownerRoleGroup = action.payload;
      })
      .addCase(getOwnerRoleGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })
      .addCase(updateOwnerRoleGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOwnerRoleGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.updatePermission = action.payload;
        state.ownerRoleGroup = action.payload;
      })
      .addCase(updateOwnerRoleGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      })
      .addCase(syncOwnerRoleGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncOwnerRoleGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.updatePermission = action.payload;
        state.ownerRoleGroup = action.payload;
      })
      .addCase(syncOwnerRoleGroup.rejected, (state, action) => {
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

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"; 
import httpService from "../../services/httpService";
import { API_DDL_ROLE_LIST_URL } from "../../services/apiRoutes";




export const getRoles = createAsyncThunk<Role[], void, { rejectValue: { message: string } }>("getRoles/fetch",async (_, { rejectWithValue }) => {
      try {
        const { data } = await httpService.get(API_DDL_ROLE_LIST_URL);
        return data;
      } catch (error: unknown) {
        return rejectWithValue({ message: "Authentication failed, please try again!" });
      }
    }
  );

// Define TypeScript types
interface Role {
  id: number;
  name: string;
}

interface RolesState {
  loading: boolean;
  roles: Role[]; // Define roles as an array of Role objects
  error: string | null;
}

// Initial State
const initialState: RolesState = {
  loading: false,
  roles: [],   
  error: null,
};

// Slice
const rolesSlice = createSlice({
  name: "rolesProperties",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload; // Now TypeScript recognizes this as Role[]
      })
      .addCase(getRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong!";
      });
  },
});

export const { setLoading } = rolesSlice.actions;
export default rolesSlice.reducer;
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_EMPLOYEE_DDL_LIST_URL, 
} from '../../services/apiRoutes';

// Types
type EmployeeRequestPayload = {
  branchId: number;  
};


 
type Employee = {
  id: number;
  name: string;
};
 
 

type ErrorResponse = { message: string };

// ✅ Define initialState here
interface InstallmentState {
  employees: Employee[];   
  loading: boolean;
  error: string | null;
}

const initialState: InstallmentState = {
  employees: [],    
  loading: false,
  error: null,
};

// Async thunk
export const getEmployees = createAsyncThunk<Employee[],EmployeeRequestPayload,{ rejectValue: ErrorResponse }>('getEmployees/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_EMPLOYEE_DDL_LIST_URL, {
      branchId: payload.branchId, 
    });
    return data;
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch employees',
    });
  }
});
 
 
// Slice
const employeeSlice = createSlice({
  name: 'installmentProperties',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(getEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(getEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })

  },
});

export const { setLoading } = employeeSlice.actions;
export default employeeSlice.reducer;

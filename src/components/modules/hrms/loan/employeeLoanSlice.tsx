import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_CHART_OF_ACCOUNTS_DDL_L4_URL, API_EMPLOYEE_DDL_SEARCH_URL } from '../../../services/apiRoutes';


// ===== Types =====
export type Coal4Item = {
  value: string | number; // API যদি value দেয়
  label: string;          // API যদি label দেয়
  // optional extra fields (আপনার API যেগুলো দেয়)
  id?: number | string;
  name?: string;
  l3_name?: string;
  l2_name?: string;
};

type Coal4State = {
  ddl: Coal4Item[];
  loading: boolean;
  error: string | null;
};

const initialState: Coal4State = {
  ddl: [],
  loading: false,
  error: null,
};

// ===== Thunk =====
// inputValue + acType দুইটাই পাঠাবেন
export const employeeLoan = createAsyncThunk<Coal4Item[],{ searchName: string },{ rejectValue: string }>(
  'employeeLoan/getCoal4DdlNext',
  async ({ searchName }, thunkAPI) => {
    try {
      // ✅ যদি httpService এ token interceptor থাকে, headers লাগবে না
      const response = await httpService.get(API_EMPLOYEE_DDL_SEARCH_URL, {
        params: {
          searchName: searchName
        },
      });

      const raw = response.data;

      // ✅ Safely unwrap
      const list: any[] = raw?.data?.data ?? raw?.data ?? raw ?? [];

      // যদি API থেকে id/name আসে কিন্তু value/label না আসে, তাহলে map করে দিন
      const normalized: Coal4Item[] = list.map((x: any) => {
        // already value/label থাকলে রাখুন
        if (x?.value !== undefined && x?.label !== undefined) return x;

        // না থাকলে id/name দিয়ে বানান
        return {
          value: x?.id,
          label:
            x?.label ??
            (x?.l3_name || x?.l2_name
              ? `${x?.name} (${x?.l3_name ?? ''}${x?.l2_name ? ' / ' + x?.l2_name : ''})`
              : x?.name),
          ...x,
        };
      });

      return normalized;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to fetch COA L4 DDL';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ===== Slice =====
const employeeLoanSlice = createSlice({
  name: 'employeeLoan',
  initialState,
  reducers: {
    clearCoal4Ddl(state) {
      state.ddl = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(employeeLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(employeeLoan.fulfilled, (state, action: PayloadAction<Coal4Item[]>) => {
        state.loading = false;
        state.ddl = action.payload;
      })
      .addCase(employeeLoan.rejected, (state, action) => {
        state.loading = false;
        state.ddl = [];
        state.error = (action.payload as string) || 'Failed to fetch data';
      });
  },
});

export const { clearCoal4Ddl } = employeeLoanSlice.actions;
export default employeeLoanSlice.reducer;



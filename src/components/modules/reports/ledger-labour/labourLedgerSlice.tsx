import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_LABOUR_ITEMS_URL, API_LABOUR_LEDGER_URL } from '../../../services/apiRoutes';

// Types
type LabourLedgerPayload = {
  branchId: number | null;
  ledgerId: number | null;
  labourId: number | null;
  startDate: string | null;
  endDate: string | null;
};

type LabourItem = {
  id: number;
  name: string;
};

type LabourExpenses = {
  labourId: number;
  labourName: string;
  date: string;
  qty: number;
  rate: number;
  amount: number;
  description: string;
};

type ErrorResponse = { message: string };

// ✅ Define initialState here
interface LabourLedgerState {
  labourItems: LabourItem[];
  labourExpenses: LabourExpenses[];
  loading: boolean;
  error: string | null;
}

const initialState: LabourLedgerState = {
  labourItems: [],
  labourExpenses: [],
  loading: false,
  error: null,
};

// Async thunk
export const getLabourItems = createAsyncThunk<LabourItem[], void, { rejectValue: ErrorResponse }>('getLabourItems/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await httpService.get(API_LABOUR_ITEMS_URL);
    return data;
  } catch (error) {
    return rejectWithValue({message: 'Failed to fetch Labour Items'});
  }
});

// Async thunk
export const getLabourLedger = createAsyncThunk<LabourExpenses[],LabourLedgerPayload,{ rejectValue: ErrorResponse }>('getLabourLedger/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_LABOUR_LEDGER_URL, {
      branchId: payload.branchId,
      ledgerId: payload.ledgerId,
      labourId: payload.labourId,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
    return data;
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch Labour Expenses',
    });
  }
});

// Slice
const labourLedgerSlice = createSlice({
  name: 'labourLedgerProperties',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLabourLedger.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLabourLedger.fulfilled, (state, action) => {
        state.loading = false;
        state.labourExpenses = action.payload;
      })
      .addCase(getLabourLedger.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })
      .addCase(getLabourItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLabourItems.fulfilled, (state, action) => {
        state.loading = false;
        state.labourItems = action.payload;
      })
      .addCase(getLabourItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!'; // I got an error here, Property 'message' does not exist on type '{}'.ts(2339)

      });
  },
});

export const { setLoading } = labourLedgerSlice.actions;
export default labourLedgerSlice.reducer;

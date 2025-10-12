import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ---------------- Interfaces ----------------

export interface TransactionList {
  id: string | number;
  account: string;
  accountName: string;
  remarks: string;
  amount: number | string;
}

export interface ReceivedItem {
  id: string | number;
  mtmId: string;
  receiverAccount: string;
  receiverAccountName: string;
  transactionList: TransactionList[];
}

// ---------------- Initial State ----------------

interface BankReceivedState {
  bankReceived: ReceivedItem[];
  loading: boolean;
  error: string | null;
}

const initialState: BankReceivedState = {
  bankReceived: [],
  loading: false,
  error: null,
};

// ---------------- Async Thunks ----------------

// Fetch Bank Received list
export const fetchBankReceived = createAsyncThunk<ReceivedItem[], void, { rejectValue: string }>('bankReceived/fetchBankReceived', async (_, thunkAPI) => {
  try {
    const response = await axios.get('/api/general/bank/received'); // GET API
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch data');
  }
});

// Save Bank Received
export const saveBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/saveBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await axios.post('/api/general/bank/received', payload); // POST API
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to save data');
  }
});

// ---------------- Slice ----------------

const bankReceivedSlice = createSlice({name: 'bankReceived',initialState,reducers: { addBankReceived(state, action: PayloadAction<ReceivedItem>) {
      state.bankReceived.push(action.payload);
    }, 
    updateBankReceived(state, action: PayloadAction<ReceivedItem>) {
      const index = state.bankReceived.findIndex(item => item.id === action.payload.id);
      if (index !== -1) state.bankReceived[index] = action.payload;
    },
    deleteBankReceived(state, action: PayloadAction<string | number>) {
      state.bankReceived = state.bankReceived.filter(item => item.id !== action.payload);
    },
  },
  extraReducers: (builder) => {builder// Fetch
      .addCase(fetchBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankReceived.fulfilled, (state, action: PayloadAction<ReceivedItem[]>) => {
        state.loading = false;
        state.bankReceived = action.payload;
      })
      .addCase(fetchBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Save
      .addCase(saveBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveBankReceived.fulfilled, (state, action: PayloadAction<ReceivedItem>) => {
        state.loading = false;
        state.bankReceived.push(action.payload);
      })
      .addCase(saveBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ---------------- Export Actions & Reducer ----------------

export const { addBankReceived, updateBankReceived, deleteBankReceived } = bankReceivedSlice.actions;
export default bankReceivedSlice.reducer;

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import {
  API_BANK_GENERAL_EDIT_URL,
  API_BANK_GENERAL_UPDATE_URL,
  API_BANK_RECEIVED_LIST_URL,
  API_BANK_RECEIVED_URL,
} from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

// ---------------- Interfaces ----------------

export interface TransactionList {
  id: string | number;
  account: number;
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

// 📌 Fetch Bank Received list
export const fetchBankReceived = createAsyncThunk<ReceivedItem[],void,{ rejectValue: string }>('bankReceived/fetchBankReceived', async (_, thunkAPI) => {
  try {
    const response = await httpService.get(API_BANK_RECEIVED_LIST_URL);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch data');
  }
});

// 📌 Save Bank Received
export const saveBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/saveBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_RECEIVED_URL, payload);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to save data');
  }
});

// 📌 Edit Bank Received
export const editBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/editBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.get(`${API_BANK_GENERAL_EDIT_URL}/${payload.id}`,);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || 'Failed to update bank received',
    );
  }
});

// 📌 Update Bank Received
export const updateBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/updateBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_GENERAL_UPDATE_URL, payload);
    // const response = await httpService.put(`${API_BANK_GENERAL_UPDATE_URL}/${payload.id}`,payload,);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || 'Failed to update bank received',
    );
  }
});

// ---------------- Slice ----------------

const bankReceivedSlice = createSlice({
  name: 'bankReceived',
  initialState,
  reducers: {
    addBankReceived(state, action: PayloadAction<ReceivedItem>) {
      state.bankReceived.push(action.payload);
    },
    // ❌ updateBankReceived reducer মুছে ফেলা হলো
    deleteBankReceived(state, action: PayloadAction<string | number>) {
      state.bankReceived = state.bankReceived.filter(
        (item) => item.id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // 📌 Fetch
      .addCase(fetchBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchBankReceived.fulfilled,
        (state, action: PayloadAction<ReceivedItem[]>) => {
          state.loading = false;
          state.bankReceived = action.payload;
        },
      )
      .addCase(fetchBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Save
      .addCase(saveBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        saveBankReceived.fulfilled,
        (state, action: PayloadAction<ReceivedItem>) => {
          state.loading = false;
          state.bankReceived.push(action.payload);
        },
      )
      .addCase(saveBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Edit
      .addCase(editBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        editBankReceived.fulfilled,
        (state, action: PayloadAction<ReceivedItem>) => {
          state.loading = false;
          const index = state.bankReceived.findIndex(
            (item) => item.id === action.payload.id,
          );
          if (index !== -1) {
            state.bankReceived[index] = action.payload;
          }
        },
      )
      .addCase(editBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Update
      .addCase(updateBankReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateBankReceived.fulfilled,
        (state, action: PayloadAction<ReceivedItem>) => {
          state.loading = false;
          const index = state.bankReceived.findIndex(
            (item) => item.id === action.payload.id,
          );
          if (index !== -1) {
            state.bankReceived[index] = action.payload;
          }
        },
      )
      .addCase(updateBankReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ---------------- Export Actions & Reducer ----------------

export const { addBankReceived, deleteBankReceived } = bankReceivedSlice.actions;
export default bankReceivedSlice.reducer;

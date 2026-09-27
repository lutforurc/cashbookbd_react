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

// types for the server response you showed
type SaveBankReceivedResponse = {
  success: boolean;
  message: number;
  data: { data: string[]; transaction_date: string };
  success_code: { code: number };
  error: { code: number };
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
export const saveBankReceived = createAsyncThunk<ReceivedItem,SaveBankReceivedResponse,{ rejectValue: string }>('bankReceived/saveBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_RECEIVED_URL, payload);

    // ⚠️ A refusal travels as success:false on a 200 -- a closed year (§42),
    // a missing head. Handed on as a rejection, so the screen's catch shows
    // the sentence rather than clearing the form as if it had saved.
    if (response.data?.success === false) {
      return thunkAPI.rejectWithValue(response.data?.message || 'Could not save the voucher.');
    }

    return response.data as SaveBankReceivedResponse;
  } catch (error: any) {
    // ⚠️ The server's sentence first. A "No data found" or "This voucher
    // already approved" arrives as a 404 whose body carries the words; read
    // second, the desk got axios's "Request failed with status code 404"
    // instead, which says nothing about what to do next.
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || 'Failed to save data',
    );
  }
});

// 📌 Edit Bank Received
export const editBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/editBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.get(`${API_BANK_GENERAL_EDIT_URL}/${payload.id}`,);
    return response.data;
  } catch (error: any) {
    // The server's own sentence, as above -- "No data found" is what a wrong
    // or unknown voucher number earns, and it is the words the desk needs.
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || 'Failed to update bank received',
    );
  }
});

// 📌 Update Bank Received
export const updateBankReceived = createAsyncThunk<ReceivedItem,ReceivedItem,{ rejectValue: string }>('bankReceived/updateBankReceived', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_GENERAL_UPDATE_URL, payload);
    // const response = await httpService.put(`${API_BANK_GENERAL_UPDATE_URL}/${payload.id}`,payload,);

    // ⚠️ A refusal arrives on top of a 2xx as success:false -- the closed year,
    // a missing head, a journal already approved. Without this the thunk
    // resolves, the screen clears the form, and the clerk hears "saved" for a
    // voucher nothing was written to. saveBankReceived carries the same guard.
    if (response.data?.success === false) {
      return thunkAPI.rejectWithValue(
        response.data?.message || 'Could not update the voucher.',
      );
    }

    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message || error.message || 'Failed to update bank received',
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

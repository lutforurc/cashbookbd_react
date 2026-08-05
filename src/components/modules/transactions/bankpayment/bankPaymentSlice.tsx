import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import {API_BANK_PAYMENT_EDIT_URL, API_BANK_PAYMENT_UPDATE_URL, API_BANK_PAYMENT_URL, API_BANK_RECEIVED_LIST_URL, } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

// ---------------- Interfaces ----------------

export interface TransactionList {
  id: string | number;
  account: number;
  accountName: string;
  remarks: string;
  amount: number | string;
}

export interface PaymentItem {
  id: string | number;
  mtmId: string;
  receiverAccount: string;
  receiverAccountName: string;
  transactionList: TransactionList[];
}

// ---------------- Initial State ----------------

interface BankPaymentState {
  bankPayment: PaymentItem[];
  loading: boolean;
  error: string | null;
}

const initialState: BankPaymentState = {
  bankPayment: [],
  loading: false,
  error: null,
};

// types for the server response you showed
type SaveBankPaymentResponse = {
  success: boolean;
  message: number;
  data: { data: string[]; transaction_date: string };
  success_code: { code: number };
  error: { code: number };
};

// ---------------- Async Thunks ----------------

// 📌 Fetch Bank Payment list
export const fetchBankPayment = createAsyncThunk<PaymentItem[],void,{ rejectValue: string }>('bankPayment/fetchBankPayment', async (_, thunkAPI) => {
  try {
    const response = await httpService.get(API_BANK_RECEIVED_LIST_URL);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch data');
  }
});

// 📌 Save Bank Payment
export const saveBankPayment = createAsyncThunk<PaymentItem, SaveBankPaymentResponse,{ rejectValue: string }>('bankPayment/saveBankPayment', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_PAYMENT_URL, payload);
    return response.data as SaveBankPaymentResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to save data');
  }
});

// 📌 Edit Bank Payment
export const editBankPayment = createAsyncThunk<PaymentItem,PaymentItem,{ rejectValue: string }>('bankPayment/editBankPayment', async (payload, thunkAPI) => {
  try {
    // The bank PAYMENT endpoints, not the received ones. Routes and URL
    // constants for these have existed all along; this screen simply never
    // pointed at them, so editing a payment loaded it through the received
    // controller -- which then rewrote the contra row as a receipt and stamped
    // the product map with TYPE_BANK_RECEIVED, turning money out into money in.
    const response = await httpService.get(`${API_BANK_PAYMENT_EDIT_URL}/${payload.id}`,);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || 'Failed to update bank payment',
    );
  }
});

// 📌 Update Bank Payment
export const updateBankPayment = createAsyncThunk<PaymentItem,PaymentItem,{ rejectValue: string }>('bankPayment/updateBankPayment', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_BANK_PAYMENT_UPDATE_URL, payload);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.message || 'Failed to update bank payment',
    );
  }
});

// ---------------- Slice ----------------

const bankPaymentSlice = createSlice({
  name: 'bankPayment',
  initialState,
  reducers: {
    addBankPayment(state, action: PayloadAction<PaymentItem>) {
      state.bankPayment.push(action.payload);
    },

    deleteBankPayment(state, action: PayloadAction<string | number>) {
      state.bankPayment = state.bankPayment.filter(
        (item) => item.id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // 📌 Fetch
      .addCase(fetchBankPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchBankPayment.fulfilled,
        (state, action: PayloadAction<PaymentItem[]>) => {
          state.loading = false;
          state.bankPayment = action.payload;
        },
      )
      .addCase(fetchBankPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Save
      .addCase(saveBankPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        saveBankPayment.fulfilled,
        (state, action: PayloadAction<PaymentItem>) => {
          state.loading = false;
          state.bankPayment.push(action.payload);
        },
      )
      .addCase(saveBankPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Edit
      .addCase(editBankPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        editBankPayment.fulfilled,
        (state, action: PayloadAction<PaymentItem>) => {
          state.loading = false;
          const index = state.bankPayment.findIndex(
            (item) => item.id === action.payload.id,
          );
          if (index !== -1) {
            state.bankPayment[index] = action.payload;
          }
        },
      )
      .addCase(editBankPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 📌 Update
      .addCase(updateBankPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateBankPayment.fulfilled,
        (state, action: PayloadAction<PaymentItem>) => {
          state.loading = false;
          const index = state.bankPayment.findIndex(
            (item) => item.id === action.payload.id,
          );
          if (index !== -1) {
            state.bankPayment[index] = action.payload;
          }
        },
      )
      .addCase(updateBankPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ---------------- Export Actions & Reducer ----------------

export const { addBankPayment, deleteBankPayment } = bankPaymentSlice.actions;
export default bankPaymentSlice.reducer;

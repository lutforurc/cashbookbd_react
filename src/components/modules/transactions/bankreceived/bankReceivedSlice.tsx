import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BankReceived {
  id: number;
  date: string;
  amount: number;
  bankName: string;
  description?: string;
}

interface BankReceivedState {
  bankReceived: BankReceived[];
  loading: boolean;
  error: string | null;
}

const initialState: BankReceivedState = {
  bankReceived: [],
  loading: false,
  error: null,
};

const bankReceivedSlice = createSlice({
  name: 'bankReceived',
  initialState,
  reducers: {
    fetchBankReceivedStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBankReceivedSuccess(state, action: PayloadAction<BankReceived[]>) {
      state.loading = false;
      state.bankReceived = action.payload;
    },
    fetchBankReceivedFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    addBankReceived(state, action: PayloadAction<BankReceived>) {
      state.bankReceived.push(action.payload);
    },
    updateBankReceived(state, action: PayloadAction<BankReceived>) {
      const index = state.bankReceived.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.bankReceived[index] = action.payload;
      }
    },
    deleteBankReceived(state, action: PayloadAction<number>) {
      state.bankReceived = state.bankReceived.filter(item => item.id !== action.payload);
    },
  },
});

export const {
  fetchBankReceivedStart,
  fetchBankReceivedSuccess,
  fetchBankReceivedFailure,
  addBankReceived,
  updateBankReceived,
  deleteBankReceived,
} = bankReceivedSlice.actions;

export default bankReceivedSlice.reducer;

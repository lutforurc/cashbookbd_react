import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import { API_JOURNAL_STORE_URL } from '../../../services/apiRoutes';

export interface JournalStorePayload {
  payer_code: string;
  receiver_code: string;
  amount: number;
  note: string;
}

interface JournalState {
  loading: boolean;
  error: string | null;
  message: string | null;
  savedData: unknown;
}

const initialState: JournalState = {
  loading: false,
  error: null,
  message: null,
  savedData: null,
};

export const saveJournalPayment = createAsyncThunk<
  any,
  JournalStorePayload,
  { rejectValue: string }
>('journal/saveJournalPayment', async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_JOURNAL_STORE_URL, payload);

    if (res.data?.success === true || res.status === 200 || res.status === 201) {
      return res.data;
    }

    return rejectWithValue(res.data?.message || 'Journal save failed');
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message ||
        error?.message ||
        'Journal save failed',
    );
  }
});

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    clearJournalState(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.savedData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveJournalPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(saveJournalPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.savedData = action.payload?.data ?? action.payload;
        state.message = action.payload?.message || 'Journal saved successfully';
      })
      .addCase(saveJournalPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Journal save failed';
      });
  },
});

export const { clearJournalState } = journalSlice.actions;
export default journalSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import { API_SEND_SMS_URL } from '../../services/apiRoutes';

export interface SmsPayload {
  mobile: string;
  message: string;
}

interface SmsState {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: SmsState = {
  loading: false,
  error: null,
  successMessage: null,
};

export const sendSms = createAsyncThunk<
  string,
  SmsPayload,
  { rejectValue: string }
>('sms/send', async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(API_SEND_SMS_URL, payload);
    const data = res?.data;

    if (data?.success) {
      return data?.message || 'SMS sent successfully';
    }

    return rejectWithValue(data?.error?.message || data?.message || 'Failed to send SMS');
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Failed to send SMS',
    );
  }
});

const smsSlice = createSlice({
  name: 'sms',
  initialState,
  reducers: {
    resetSmsState: state => {
      state.loading = false;
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(sendSms.pending, state => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(sendSms.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(sendSms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send SMS';
      });
  },
});

export const { resetSmsState } = smsSlice.actions;
export default smsSlice.reducer;

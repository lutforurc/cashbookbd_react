import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import { API_SEND_SMS_URL } from '../../services/apiRoutes';

export interface SmsLogItem {
  id: number;
  request_id: string;
  mobile: string;
  message: string;
  provider: string;
  status: string;
  attempts: number;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

interface SmsPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

interface SmsLogListPayload {
  items: SmsLogItem[];
  pagination: SmsPagination;
  transaction_date: string;
}

interface SmsLogQuery {
  page?: number;
  branch_id?: number | null;
  mobile?: string;
  per_page?: number;
}

interface SmsState {
  loading: boolean;
  error: string | null;
  logs: SmsLogItem[];
  pagination: SmsPagination;
  transactionDate: string;
}

const initialState: SmsState = {
  loading: false,
  error: null,
  logs: [],
  pagination: {
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  },
  transactionDate: '',
};

export const getSmsLogs = createAsyncThunk<
  SmsLogListPayload,
  SmsLogQuery,
  { rejectValue: string }
>('sms/logs', async ({ page = 1, branch_id = null, mobile = '', per_page = 10 }, { rejectWithValue }) => {
  try {
    const payload = {
      branch_id: branch_id ? Number(branch_id) : null,
      mobile: mobile?.trim() || null,
      per_page,
    };

    const res = await httpService.post(`${API_SEND_SMS_URL}?page=${page}`, payload);
    const data = res?.data;

    if (data?.success) {
      return {
        items: data?.data?.data?.items || [],
        pagination: data?.data?.data?.pagination || initialState.pagination,
        transaction_date: data?.data?.transaction_date || '',
      };
    }

    return rejectWithValue(data?.error?.message || data?.message || 'Failed to load SMS logs');
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Failed to load SMS logs',
    );
  }
});

const smsSlice = createSlice({
  name: 'sms',
  initialState,
  reducers: {
    resetSmsState: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(getSmsLogs.pending, state => {
        state.loading = true;
        state.error = null;
        state.logs = [];
      })
      .addCase(getSmsLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.items;
        state.pagination = action.payload.pagination;
        state.transactionDate = action.payload.transaction_date;
      })
      .addCase(getSmsLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load SMS logs';
        state.logs = [];
        state.pagination = {
          ...state.pagination,
          total: 0,
          from: null,
          to: null,
          last_page: 1,
        };
      });
  },
});

export const { resetSmsState } = smsSlice.actions;
export default smsSlice.reducer;

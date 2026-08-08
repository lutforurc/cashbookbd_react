import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_ACCOUNT_OPENING_DELETE_URL,
  API_ACCOUNT_OPENING_LIST_URL,
  API_ACCOUNT_OPENING_UPDATE_URL,
} from '../../../services/apiRoutes';

export type OpeningAccount = {
  id: number;
  serial: number;
  name: string;
  group_id: number;
  group_name: string;
  status: string;
  is_active: boolean;
  /** Read back off the voucher's own entry line, so it keeps the poisha. */
  openingbalance: number;
  main_trx_id: number | null;
  opening_vr_no: string | null;
  opening_vr_date: string | null;
};

interface AccountOpeningState {
  accounts: OpeningAccount[];
  loading: boolean;
  error: string | null;
}

const initialState: AccountOpeningState = {
  accounts: [],
  loading: false,
  error: null,
};

/**
 * notFound() answers with a 2xx and success:false, so a refusal -- an approved
 * voucher, another branch, opening balances switched off -- has to be read off
 * the body rather than caught.
 */
const refusal = (response: any, fallback: string) =>
  response?.data?.success === false
    ? (response?.data?.message || fallback)
    : null;

export const getAccountOpenings = createAsyncThunk<
  OpeningAccount[],
  { search?: string } | undefined,
  { rejectValue: string }
>('accountOpening/list', async (payload, thunkAPI) => {
  try {
    const response = await httpService.post(API_ACCOUNT_OPENING_LIST_URL, {
      search: payload?.search ?? '',
    });

    // "No accounts found!" comes back the same way a refusal does. An empty
    // list is not an error here -- every bank may simply be inactive -- so it
    // resolves to nothing rather than rejecting.
    if (response.data?.success === false) {
      return [];
    }

    // foundData() wraps twice: { success, message, data: { data, transaction_date } }.
    // The rows are the inner one.
    const rows = response.data?.data?.data;

    return Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
      error.message ||
      'Accounts could not be loaded'
    );
  }
});

export const updateAccountOpening = createAsyncThunk<
  any,
  { id: number; openingbalance: string | number },
  { rejectValue: string }
>('accountOpening/update', async ({ id, openingbalance }, thunkAPI) => {
  try {
    const response = await httpService.post(
      `${API_ACCOUNT_OPENING_UPDATE_URL}${id}`,
      { openingbalance }
    );

    const refused = refusal(response, 'Opening balance could not be saved');
    if (refused) {
      return thunkAPI.rejectWithValue(refused);
    }

    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message ||
      error.message ||
      'Opening balance could not be saved'
    );
  }
});

/* Removes the opening balance and sends its journal voucher to the trash. The
   account itself stays. */
export const deleteAccountOpening = createAsyncThunk<any, number, { rejectValue: string }>(
  'accountOpening/delete',
  async (id, thunkAPI) => {
    try {
      const response = await httpService.post(`${API_ACCOUNT_OPENING_DELETE_URL}${id}`);

      const refused = refusal(response, 'Opening balance could not be deleted');
      if (refused) {
        return thunkAPI.rejectWithValue(refused);
      }

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        'Opening balance could not be deleted'
      );
    }
  }
);

const accountOpeningSlice = createSlice({
  name: 'accountOpening',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAccountOpenings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountOpenings.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
      })
      .addCase(getAccountOpenings.rejected, (state, action) => {
        state.loading = false;
        state.accounts = [];
        state.error = action.payload || 'Something went wrong!';
      });
  },
});

export default accountOpeningSlice.reducer;

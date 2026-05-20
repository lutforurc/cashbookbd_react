import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_RESELLER_ADMIN_ASSIGN_COMPANY_URL,
  API_RESELLER_ADMIN_BASE_URL,
  API_RESELLER_ADMIN_COMMISSION_LEDGERS_URL,
  API_RESELLER_ADMIN_COMPANIES_URL,
  API_RESELLER_ADMIN_OVERVIEW_URL,
  API_RESELLER_ADMIN_PAY_COMMISSION_URL,
  API_RESELLER_ADMIN_PAYMENTS_URL,
  API_RESELLER_COMMISSION_LEDGERS_URL,
  API_RESELLER_COMPANIES_URL,
  API_RESELLER_DASHBOARD_URL,
  API_RESELLER_PAYMENTS_URL,
} from '../../services/apiRoutes';

export interface Reseller {
  id: number;
  user_id?: number | null;
  name: string;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  status: number;
  notes?: string | null;
  company_count?: number;
  approved_amount?: number;
  approved_commission?: number;
  paid_commission?: number;
  payable_commission?: number;
}

export interface ResellerCompany {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  status?: number;
  reseller_id?: number | null;
  reseller_name?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
  access_status?: string | null;
}

export interface ResellerPayment {
  id: number;
  company_name?: string | null;
  reseller_name?: string | null;
  plan_name?: string | null;
  payment_status: string;
  amount: number;
  currency: string;
  commission_amount: number;
  transaction_id?: string | null;
  created_at?: string | null;
}

export interface ResellerCommissionLedger {
  id: number;
  reseller_id: number;
  reseller_name?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  subscription_id?: number | null;
  payment_id?: number | null;
  ledger_type: 'earned' | 'paid' | 'adjustment';
  payment_method?: 'bkash' | 'nagad' | 'bank' | 'cash' | 'other' | null;
  paid_to_account?: string | null;
  payment_reference?: string | null;
  amount: number;
  currency: string;
  status: string;
  reference_no?: string | null;
  ledger_date?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface ResellerOverview {
  total_resellers: number;
  active_resellers: number;
  assigned_companies: number;
  approved_payments: number;
  approved_amount: number;
  approved_commission: number;
  paid_commission: number;
  payable_commission: number;
}

export interface ResellerPayload {
  name: string;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  commission_type: string;
  commission_value: number;
  password?: string;
  status: number;
  notes?: string | null;
}

interface ResellerState {
  overview: ResellerOverview | null;
  resellers: Reseller[];
  companies: ResellerCompany[];
  payments: ResellerPayment[];
  commissionLedgers: ResellerCommissionLedger[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ResellerState = {
  overview: null,
  resellers: [],
  companies: [],
  payments: [],
  commissionLedgers: [],
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

const getErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  fallback;

const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  return [];
};

const extractObject = <T,>(payload: any): T | null => {
  if (payload?.data?.data && !Array.isArray(payload.data.data)) return payload.data.data as T;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data as T;
  return null;
};

export const fetchResellerAdminData = createAsyncThunk<
  {
    overview: ResellerOverview | null;
    resellers: Reseller[];
    companies: ResellerCompany[];
    payments: ResellerPayment[];
    commissionLedgers: ResellerCommissionLedger[];
  },
  void,
  { rejectValue: string }
>('reseller/fetchAdminData', async (_, thunkAPI) => {
  try {
    const [overviewRes, resellerRes, companyRes, paymentRes, ledgerRes] = await Promise.all([
      httpService.get(API_RESELLER_ADMIN_OVERVIEW_URL),
      httpService.get(API_RESELLER_ADMIN_BASE_URL),
      httpService.get(API_RESELLER_ADMIN_COMPANIES_URL),
      httpService.get(API_RESELLER_ADMIN_PAYMENTS_URL),
      httpService.get(API_RESELLER_ADMIN_COMMISSION_LEDGERS_URL),
    ]);

    return {
      overview: extractObject<ResellerOverview>(overviewRes.data),
      resellers: extractArray<Reseller>(resellerRes.data),
      companies: extractArray<ResellerCompany>(companyRes.data),
      payments: extractArray<ResellerPayment>(paymentRes.data),
      commissionLedgers: extractArray<ResellerCommissionLedger>(ledgerRes.data),
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load reseller data.'));
  }
});

export const fetchResellerDashboardData = createAsyncThunk<
  {
    overview: ResellerOverview | null;
    resellers: Reseller[];
    companies: ResellerCompany[];
    payments: ResellerPayment[];
    commissionLedgers: ResellerCommissionLedger[];
  },
  void,
  { rejectValue: string }
>('reseller/fetchDashboardData', async (_, thunkAPI) => {
  try {
    const [overviewRes, companyRes, paymentRes, ledgerRes] = await Promise.all([
      httpService.get(API_RESELLER_DASHBOARD_URL),
      httpService.get(API_RESELLER_COMPANIES_URL),
      httpService.get(API_RESELLER_PAYMENTS_URL),
      httpService.get(API_RESELLER_COMMISSION_LEDGERS_URL),
    ]);

    return {
      overview: extractObject<ResellerOverview>(overviewRes.data),
      resellers: [],
      companies: extractArray<ResellerCompany>(companyRes.data),
      payments: extractArray<ResellerPayment>(paymentRes.data),
      commissionLedgers: extractArray<ResellerCommissionLedger>(ledgerRes.data),
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load reseller dashboard.'));
  }
});

export const saveReseller = createAsyncThunk<
  { message: string },
  { id?: number; payload: ResellerPayload },
  { rejectValue: string }
>('reseller/save', async ({ id, payload }, thunkAPI) => {
  try {
    const url = id ? `${API_RESELLER_ADMIN_BASE_URL}/${id}` : API_RESELLER_ADMIN_BASE_URL;
    const res = await httpService.post(url, payload);
    return { message: res?.data?.message || 'Reseller saved successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to save reseller.'));
  }
});

export const assignCompanyToReseller = createAsyncThunk<
  { message: string },
  { reseller_id: number; company_id: number; status?: number },
  { rejectValue: string }
>('reseller/assignCompany', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_RESELLER_ADMIN_ASSIGN_COMPANY_URL, {
      status: 1,
      ...payload,
    });
    return { message: res?.data?.message || 'Company assigned successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to assign company.'));
  }
});

export const payResellerCommission = createAsyncThunk<
  { message: string },
  {
    reseller_id: number;
    amount: number;
    currency?: string;
    payment_method: string;
    paid_to_account?: string | null;
    payment_reference?: string | null;
    ledger_date?: string | null;
    notes?: string | null;
  },
  { rejectValue: string }
>('reseller/payCommission', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_RESELLER_ADMIN_PAY_COMMISSION_URL, {
      currency: 'BDT',
      ...payload,
    });
    return { message: res?.data?.message || 'Reseller commission paid successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to pay reseller commission.'));
  }
});

const resellerSlice = createSlice({
  name: 'reseller',
  initialState,
  reducers: {
    clearResellerFeedback(state) {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResellerAdminData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResellerAdminData.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload.overview;
        state.resellers = action.payload.resellers;
        state.companies = action.payload.companies;
        state.payments = action.payload.payments;
        state.commissionLedgers = action.payload.commissionLedgers;
      })
      .addCase(fetchResellerAdminData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load reseller data.';
      })
      .addCase(fetchResellerDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResellerDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload.overview;
        state.resellers = action.payload.resellers;
        state.companies = action.payload.companies;
        state.payments = action.payload.payments;
        state.commissionLedgers = action.payload.commissionLedgers;
      })
      .addCase(fetchResellerDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load reseller dashboard.';
      })
      .addCase(saveReseller.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveReseller.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload.message;
      })
      .addCase(saveReseller.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to save reseller.';
      })
      .addCase(assignCompanyToReseller.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(assignCompanyToReseller.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload.message;
      })
      .addCase(assignCompanyToReseller.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to assign company.';
      })
      .addCase(payResellerCommission.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(payResellerCommission.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload.message;
      })
      .addCase(payResellerCommission.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to pay reseller commission.';
      });
  },
});

export const { clearResellerFeedback } = resellerSlice.actions;
export default resellerSlice.reducer;

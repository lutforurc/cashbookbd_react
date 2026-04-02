import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_SUBSCRIPTION_CURRENT_URL,
  API_SUBSCRIPTION_ADMIN_APPROVE_PAYMENT_URL,
  API_SUBSCRIPTION_ADMIN_ASSIGN_URL,
  API_SUBSCRIPTION_ADMIN_COMPANIES_URL,
  API_SUBSCRIPTION_ADMIN_OVERVIEW_URL,
  API_SUBSCRIPTION_ADMIN_PAYMENTS_URL,
  API_SUBSCRIPTION_ADMIN_PLANS_URL,
  API_SUBSCRIPTION_ADMIN_TENANTS_URL,
  API_SUBSCRIPTION_PAYMENT_HISTORY_URL,
  API_SUBSCRIPTION_PAYMENT_SUBMIT_URL,
  API_SUBSCRIPTION_PLANS_URL,
} from '../../services/apiRoutes';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'pending_payment'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type SubscriptionAccessStatus = 'full' | 'limited' | 'billing_only' | 'blocked';

export interface SubscriptionFeature {
  feature_key: string;
  feature_name: string;
  feature_value: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  billing_interval: string;
  price: number;
  currency: string;
  trial_days: number;
  max_users?: number | null;
  max_branches?: number | null;
  max_transactions_per_month?: number | null;
  sort_order?: number;
  is_active?: boolean;
  description?: string | null;
  features?: SubscriptionFeature[];
}

export interface SubscriptionPlanPayload {
  name: string;
  slug?: string;
  billing_interval: string;
  price: number;
  currency: string;
  trial_days: number;
  max_users?: number | null;
  max_branches?: number | null;
  max_transactions_per_month?: number | null;
  sort_order?: number;
  is_active: boolean;
  description?: string;
}

export interface CurrentSubscription {
  id: number;
  company_id: number;
  plan_id: number;
  plan_name?: string;
  status: SubscriptionStatus;
  access_status: SubscriptionAccessStatus;
  start_date?: string | null;
  end_date?: string | null;
  trial_end_at?: string | null;
  next_billing_date?: string | null;
  grace_period_end_at?: string | null;
  notes?: string | null;
  features?: SubscriptionFeature[];
}

export interface SubscriptionPayment {
  id: number;
  payment_method: string;
  payment_status: string;
  amount: number;
  currency: string;
  billing_months: number;
  paid_at?: string | null;
  transaction_id?: string | null;
  sender_number?: string | null;
  receiver_account?: string | null;
  admin_note?: string | null;
  customer_note?: string | null;
  plan_name?: string | null;
  created_at?: string | null;
}

export interface ManualPaymentPayload {
  plan_id: number;
  amount: number;
  payment_method: string;
  billing_months: number;
  paid_at: string;
  transaction_id: string;
  sender_number: string;
  receiver_account?: string;
  customer_note?: string;
}

export interface AdminSubscriptionOverview {
  pending_payments: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  trial_subscriptions: number;
}

export interface AdminTenantSubscription extends CurrentSubscription {
  company_name?: string | null;
}

export interface AdminSubscriptionPayment extends SubscriptionPayment {
  subscription_id: number;
  company_id: number;
  company_name?: string | null;
  subscription_status?: string | null;
  access_status?: string | null;
}

export interface SubscriptionCompanyOption {
  id: number;
  name: string;
}

export interface AssignSubscriptionPayload {
  company_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  access_status: SubscriptionAccessStatus;
  start_date?: string;
  end_date?: string;
  trial_end_at?: string;
  notes?: string;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  current: CurrentSubscription | null;
  payments: SubscriptionPayment[];
  loadingPlans: boolean;
  loadingCurrent: boolean;
  loadingPayments: boolean;
  submittingPayment: boolean;
  loadingAdmin: boolean;
  updatingAdminPayment: boolean;
  initialized: boolean;
  error: string | null;
  submitSuccessMessage: string | null;
  adminOverview: AdminSubscriptionOverview | null;
  adminTenants: AdminTenantSubscription[];
  adminPayments: AdminSubscriptionPayment[];
  adminCompanies: SubscriptionCompanyOption[];
  adminPlans: SubscriptionPlan[];
  editingPlan: SubscriptionPlan | null;
  loadingAdminPlans: boolean;
  loadingPlanDetails: boolean;
  savingPlan: boolean;
}

const initialState: SubscriptionState = {
  plans: [],
  current: null,
  payments: [],
  loadingPlans: false,
  loadingCurrent: false,
  loadingPayments: false,
  submittingPayment: false,
  loadingAdmin: false,
  updatingAdminPayment: false,
  initialized: false,
  error: null,
  submitSuccessMessage: null,
  adminOverview: null,
  adminTenants: [],
  adminPayments: [],
  adminCompanies: [],
  adminPlans: [],
  editingPlan: null,
  loadingAdminPlans: false,
  loadingPlanDetails: false,
  savingPlan: false,
};

const getErrorMessage = (error: any, fallback: string): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
};

const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  return [];
};

const extractObject = <T,>(payload: any): T | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  if ('data' in payload) {
    const levelOne = payload.data;
    if (!levelOne || typeof levelOne !== 'object' || Array.isArray(levelOne)) return null;

    if ('data' in levelOne) {
      const levelTwo = (levelOne as any).data;
      if (!levelTwo || typeof levelTwo !== 'object' || Array.isArray(levelTwo)) return null;
      return levelTwo as T;
    }

    return levelOne as T;
  }

  if ('status' in payload || 'plan_id' in payload || 'id' in payload) {
    return payload as T;
  }

  return null;
};

export const fetchSubscriptionPlans = createAsyncThunk<
  SubscriptionPlan[],
  void,
  { rejectValue: string }
>('subscription/plans', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_PLANS_URL);
    return extractArray<SubscriptionPlan>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load plans'));
  }
});

export const fetchCurrentSubscription = createAsyncThunk<
  CurrentSubscription | null,
  void,
  { rejectValue: string }
>('subscription/current', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_CURRENT_URL);
    return extractObject<CurrentSubscription>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load subscription'));
  }
});

export const fetchSubscriptionPayments = createAsyncThunk<
  SubscriptionPayment[],
  void,
  { rejectValue: string }
>('subscription/payments', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_PAYMENT_HISTORY_URL);
    return extractArray<SubscriptionPayment>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load payment history'));
  }
});

export const submitManualSubscriptionPayment = createAsyncThunk<
  { message: string },
  ManualPaymentPayload,
  { rejectValue: string }
>('subscription/submitManualPayment', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_SUBSCRIPTION_PAYMENT_SUBMIT_URL, payload);
    return {
      message:
        res?.data?.message ||
        res?.data?.data?.message ||
        'Manual payment submitted successfully.',
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to submit payment'));
  }
});

export const fetchSubscriptionAdminOverview = createAsyncThunk<
  AdminSubscriptionOverview | null,
  void,
  { rejectValue: string }
>('subscription/adminOverview', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_ADMIN_OVERVIEW_URL);
    return extractObject<AdminSubscriptionOverview>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load subscription overview'));
  }
});

export const fetchAdminSubscriptionCompanies = createAsyncThunk<
  SubscriptionCompanyOption[],
  void,
  { rejectValue: string }
>('subscription/adminCompanies', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_ADMIN_COMPANIES_URL);
    return extractArray<SubscriptionCompanyOption>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load companies'));
  }
});

export const fetchAdminTenantSubscriptions = createAsyncThunk<
  AdminTenantSubscription[],
  void,
  { rejectValue: string }
>('subscription/adminTenants', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_ADMIN_TENANTS_URL);
    return extractArray<AdminTenantSubscription>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load tenant subscriptions'));
  }
});

export const fetchAdminSubscriptionPayments = createAsyncThunk<
  AdminSubscriptionPayment[],
  void,
  { rejectValue: string }
>('subscription/adminPayments', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_ADMIN_PAYMENTS_URL);
    return extractArray<AdminSubscriptionPayment>(res.data);
  } catch (error: any) {
    const missingRouteMessage = getErrorMessage(error, '');

    if (missingRouteMessage.includes('api/admin/subscription/payment-requests')) {
      try {
        const fallbackUrl = API_SUBSCRIPTION_ADMIN_PAYMENTS_URL.replace('/payment-requests', '/payments');
        const fallbackRes = await httpService.get(fallbackUrl);
        return extractArray<AdminSubscriptionPayment>(fallbackRes.data);
      } catch (fallbackError: any) {
        return thunkAPI.rejectWithValue(
          getErrorMessage(fallbackError, 'Failed to load payment requests'),
        );
      }
    }

    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load payment requests'));
  }
});

export const approveSubscriptionPayment = createAsyncThunk<
  { message: string },
  { paymentId: number; admin_note?: string },
  { rejectValue: string }
>('subscription/approvePayment', async ({ paymentId, admin_note }, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_SUBSCRIPTION_ADMIN_APPROVE_PAYMENT_URL}/${paymentId}/approve`,
      { admin_note },
    );
    return { message: res?.data?.message || 'Payment approved successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to approve payment'));
  }
});

export const rejectSubscriptionPayment = createAsyncThunk<
  { message: string },
  { paymentId: number; admin_note?: string },
  { rejectValue: string }
>('subscription/rejectPayment', async ({ paymentId, admin_note }, thunkAPI) => {
  try {
    const res = await httpService.post(
      `${API_SUBSCRIPTION_ADMIN_APPROVE_PAYMENT_URL}/${paymentId}/reject`,
      { admin_note },
    );
    return { message: res?.data?.message || 'Payment rejected successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to reject payment'));
  }
});

export const assignSubscriptionToCompany = createAsyncThunk<
  { message: string },
  AssignSubscriptionPayload,
  { rejectValue: string }
>('subscription/assign', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_SUBSCRIPTION_ADMIN_ASSIGN_URL, payload);
    return { message: res?.data?.message || 'Subscription assigned successfully.' };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to assign subscription'));
  }
});

export const fetchAdminPlans = createAsyncThunk<
  SubscriptionPlan[],
  void,
  { rejectValue: string }
>('subscription/adminPlansList', async (_, thunkAPI) => {
  try {
    const res = await httpService.get(API_SUBSCRIPTION_ADMIN_PLANS_URL);
    return extractArray<SubscriptionPlan>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load plans'));
  }
});

export const fetchAdminPlan = createAsyncThunk<
  SubscriptionPlan | null,
  number,
  { rejectValue: string }
>('subscription/adminPlanDetails', async (planId, thunkAPI) => {
  try {
    const res = await httpService.get(`${API_SUBSCRIPTION_ADMIN_PLANS_URL}/${planId}`);
    return extractObject<SubscriptionPlan>(res.data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to load plan details'));
  }
});

export const createSubscriptionPlan = createAsyncThunk<
  { message: string; data: SubscriptionPlan | null },
  SubscriptionPlanPayload,
  { rejectValue: string }
>('subscription/createPlan', async (payload, thunkAPI) => {
  try {
    const res = await httpService.post(API_SUBSCRIPTION_ADMIN_PLANS_URL, payload);
    return {
      message: res?.data?.message || 'Subscription plan created successfully.',
      data: extractObject<SubscriptionPlan>(res.data),
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to create plan'));
  }
});

export const updateSubscriptionPlan = createAsyncThunk<
  { message: string; data: SubscriptionPlan | null },
  { id: number; payload: SubscriptionPlanPayload },
  { rejectValue: string }
>('subscription/updatePlan', async ({ id, payload }, thunkAPI) => {
  try {
    const res = await httpService.post(`${API_SUBSCRIPTION_ADMIN_PLANS_URL}/${id}`, payload);
    return {
      message: res?.data?.message || 'Subscription plan updated successfully.',
      data: extractObject<SubscriptionPlan>(res.data),
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Failed to update plan'));
  }
});

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearSubscriptionFeedback(state) {
      state.error = null;
      state.submitSuccessMessage = null;
    },
    resetEditingPlan(state) {
      state.editingPlan = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.loadingPlans = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
        state.loadingPlans = false;
        state.plans = action.payload;
      })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.loadingPlans = false;
        state.error = action.payload || 'Failed to load plans';
      })
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.loadingCurrent = true;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => {
        state.loadingCurrent = false;
        state.initialized = true;
        state.current = action.payload;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.loadingCurrent = false;
        state.initialized = true;
        state.error = action.payload || 'Failed to load subscription';
      })
      .addCase(fetchSubscriptionPayments.pending, (state) => {
        state.loadingPayments = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPayments.fulfilled, (state, action) => {
        state.loadingPayments = false;
        state.payments = action.payload;
      })
      .addCase(fetchSubscriptionPayments.rejected, (state, action) => {
        state.loadingPayments = false;
        state.error = action.payload || 'Failed to load payment history';
      })
      .addCase(submitManualSubscriptionPayment.pending, (state) => {
        state.submittingPayment = true;
        state.error = null;
        state.submitSuccessMessage = null;
      })
      .addCase(submitManualSubscriptionPayment.fulfilled, (state, action) => {
        state.submittingPayment = false;
        state.submitSuccessMessage = action.payload.message;
      })
      .addCase(submitManualSubscriptionPayment.rejected, (state, action) => {
        state.submittingPayment = false;
        state.error = action.payload || 'Failed to submit payment';
      })
      .addCase(fetchSubscriptionAdminOverview.pending, (state) => {
        state.loadingAdmin = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionAdminOverview.fulfilled, (state, action) => {
        state.loadingAdmin = false;
        state.adminOverview = action.payload;
      })
      .addCase(fetchSubscriptionAdminOverview.rejected, (state, action) => {
        state.loadingAdmin = false;
        state.error = action.payload || 'Failed to load subscription overview';
      })
      .addCase(fetchAdminTenantSubscriptions.pending, (state) => {
        state.loadingAdmin = true;
        state.error = null;
      })
      .addCase(fetchAdminTenantSubscriptions.fulfilled, (state, action) => {
        state.loadingAdmin = false;
        state.adminTenants = action.payload;
      })
      .addCase(fetchAdminTenantSubscriptions.rejected, (state, action) => {
        state.loadingAdmin = false;
        state.error = action.payload || 'Failed to load tenant subscriptions';
      })
      .addCase(fetchAdminSubscriptionCompanies.pending, (state) => {
        state.loadingAdmin = true;
        state.error = null;
      })
      .addCase(fetchAdminSubscriptionCompanies.fulfilled, (state, action) => {
        state.loadingAdmin = false;
        state.adminCompanies = action.payload;
      })
      .addCase(fetchAdminSubscriptionCompanies.rejected, (state, action) => {
        state.loadingAdmin = false;
        state.error = action.payload || 'Failed to load companies';
      })
      .addCase(fetchAdminSubscriptionPayments.pending, (state) => {
        state.loadingAdmin = true;
        state.error = null;
      })
      .addCase(fetchAdminSubscriptionPayments.fulfilled, (state, action) => {
        state.loadingAdmin = false;
        state.adminPayments = action.payload;
      })
      .addCase(fetchAdminSubscriptionPayments.rejected, (state, action) => {
        state.loadingAdmin = false;
        state.error = action.payload || 'Failed to load payment requests';
      })
      .addCase(approveSubscriptionPayment.pending, (state) => {
        state.updatingAdminPayment = true;
        state.error = null;
      })
      .addCase(approveSubscriptionPayment.fulfilled, (state, action) => {
        state.updatingAdminPayment = false;
        state.submitSuccessMessage = action.payload.message;
      })
      .addCase(approveSubscriptionPayment.rejected, (state, action) => {
        state.updatingAdminPayment = false;
        state.error = action.payload || 'Failed to approve payment';
      })
      .addCase(rejectSubscriptionPayment.pending, (state) => {
        state.updatingAdminPayment = true;
        state.error = null;
      })
      .addCase(rejectSubscriptionPayment.fulfilled, (state, action) => {
        state.updatingAdminPayment = false;
        state.submitSuccessMessage = action.payload.message;
      })
      .addCase(rejectSubscriptionPayment.rejected, (state, action) => {
        state.updatingAdminPayment = false;
        state.error = action.payload || 'Failed to reject payment';
      })
      .addCase(assignSubscriptionToCompany.pending, (state) => {
        state.updatingAdminPayment = true;
        state.error = null;
        state.submitSuccessMessage = null;
      })
      .addCase(assignSubscriptionToCompany.fulfilled, (state, action) => {
        state.updatingAdminPayment = false;
        state.submitSuccessMessage = action.payload.message;
      })
      .addCase(assignSubscriptionToCompany.rejected, (state, action) => {
        state.updatingAdminPayment = false;
        state.error = action.payload || 'Failed to assign subscription';
      })
      .addCase(fetchAdminPlans.pending, (state) => {
        state.loadingAdminPlans = true;
        state.error = null;
      })
      .addCase(fetchAdminPlans.fulfilled, (state, action) => {
        state.loadingAdminPlans = false;
        state.adminPlans = action.payload;
      })
      .addCase(fetchAdminPlans.rejected, (state, action) => {
        state.loadingAdminPlans = false;
        state.error = action.payload || 'Failed to load plans';
      })
      .addCase(fetchAdminPlan.pending, (state) => {
        state.loadingPlanDetails = true;
        state.error = null;
      })
      .addCase(fetchAdminPlan.fulfilled, (state, action) => {
        state.loadingPlanDetails = false;
        state.editingPlan = action.payload;
      })
      .addCase(fetchAdminPlan.rejected, (state, action) => {
        state.loadingPlanDetails = false;
        state.error = action.payload || 'Failed to load plan details';
      })
      .addCase(createSubscriptionPlan.pending, (state) => {
        state.savingPlan = true;
        state.error = null;
        state.submitSuccessMessage = null;
      })
      .addCase(createSubscriptionPlan.fulfilled, (state, action) => {
        state.savingPlan = false;
        state.submitSuccessMessage = action.payload.message;
        if (action.payload.data) {
          state.adminPlans = [action.payload.data, ...state.adminPlans];
        }
      })
      .addCase(createSubscriptionPlan.rejected, (state, action) => {
        state.savingPlan = false;
        state.error = action.payload || 'Failed to create plan';
      })
      .addCase(updateSubscriptionPlan.pending, (state) => {
        state.savingPlan = true;
        state.error = null;
        state.submitSuccessMessage = null;
      })
      .addCase(updateSubscriptionPlan.fulfilled, (state, action) => {
        state.savingPlan = false;
        state.submitSuccessMessage = action.payload.message;
        state.editingPlan = action.payload.data;

        if (action.payload.data) {
          state.adminPlans = state.adminPlans.map((plan) =>
            plan.id === action.payload.data?.id ? action.payload.data : plan,
          );
        }
      })
      .addCase(updateSubscriptionPlan.rejected, (state, action) => {
        state.savingPlan = false;
        state.error = action.payload || 'Failed to update plan';
      });
  },
});

export const { clearSubscriptionFeedback, resetEditingPlan } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {API_EMPLOYEES_INSTALLMENT_LIST_URL,API_FILTER_INSTALLMENT_LIST_URL,API_INSTALLMENT_DETAILS_BY_ID_URL,API_INSTALLMENT_LIST_URL,API_INSTALLMENT_RECEIVED_URL,} from '../../services/apiRoutes';
import { set } from 'react-datepicker/dist/date_utils';

// Types
type InstallmentRequestPayload = {
  customerId: number;
  installmentId: number | null;
};
type FilterRequest = {
  branch_id?: number | null;
  customer_id?: number | null;
  startDate: string | null; // ISO format date string
  endDate: string | null; // ISO format date string
  due_only?: boolean | null;
  status?: 'overdue' | 'pending' | 'upcoming' | 'partial' | null;
};


type EmployeesRequest = {
  branch_id?: number | null;
  employee_id?: number | null;
  startDate: string | null; // ISO format date string
  endDate: string | null; // ISO format date string
  due_only?: boolean | null;
  status?: 'overdue' | 'pending' | 'upcoming' | 'partial' | null;
};

type InstallmentReceivePayload = {
  installmentId: string;
  amount: number;
  remarks: string;
  message?: string; // Optional message for success notification
};

// Types
type InstallmentRequestDetailsPayload = {
  customerId: number;
  report?: boolean; // Optional parameter for report
};

type Installment = {
  installment_no: number;
  due_date: string;
  amount: number;
};
type InstallmentDetails = {
  invoice_no: string;
  installment_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
};
type FilterDetails = {
  invoice_no: string;
  installment_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
};




type ErrorResponse = { message: string };

// ✅ Define initialState here
interface InstallmentState {
  installment: Installment[];
  filterInstallment: FilterDetails[];
  employeeInstallments: FilterDetails[];
  customerInstallment: InstallmentDetails[];
  installmentPayment: {};
  loading: boolean;
  message: string | null;
  error: string | null;
}

const initialState: InstallmentState = {
  installment: [],
  filterInstallment: [],
  employeeInstallments: [],
  customerInstallment: [],
  installmentPayment: [],
  loading: false,
  message: null,
  error: null,
};

// Async thunk
export const getInstallment = createAsyncThunk<Installment[],InstallmentRequestPayload,{ rejectValue: ErrorResponse }>('getInstallment/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_INSTALLMENT_LIST_URL, {
      customerId: payload.customerId,
      installmentId: payload.installmentId,
    });
    return data;
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch installments',
    });
  }
});
// Async thunk
export const getFilterInstallment = createAsyncThunk<FilterDetails[],FilterRequest,{ rejectValue: ErrorResponse }>('getFilterInstallment/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_FILTER_INSTALLMENT_LIST_URL,payload);
    return data;
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch installments',
    });
  }
});

// installment/employees
export const getEmployeeWiseInstallment = createAsyncThunk<FilterDetails[], EmployeesRequest,{ rejectValue: ErrorResponse }>('getEmployeeWiseInstallment/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await httpService.post(API_EMPLOYEES_INSTALLMENT_LIST_URL,payload);
    return data;
  } catch (error) {
    return rejectWithValue({
      message: 'Failed to fetch installments',
    });
  }
});

export const getInstallmentDetails = createAsyncThunk<InstallmentDetails[],InstallmentRequestDetailsPayload,{ rejectValue: ErrorResponse }>('getInstallmentDetails/fetch', async (payload, { rejectWithValue }) => {
  try {
    const { customerId, report = false } = payload;
    const response = await httpService.get<InstallmentDetails[]>(
      `${API_INSTALLMENT_DETAILS_BY_ID_URL}/${customerId}?report=${report}`,
    );

    return response.data;
  } catch (err: any) {
    return rejectWithValue({
      message: err.response?.data?.message || 'Failed to fetch installments',
    });
  }
});

export const installmentReceived = createAsyncThunk<any,InstallmentReceivePayload,{ rejectValue: ErrorResponse }>('installmentReceived/fetch', async (payload, { rejectWithValue }) => {
  try {
    const response = await httpService.post(API_INSTALLMENT_RECEIVED_URL,payload,);
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message:
        error?.response?.data?.message || 'Failed to receive installment',
    });
  }
});

// Slice
const installmentSlice = createSlice({
  name: 'installmentProperties',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setMessage: (state, action) => {
      state.message = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(getInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallment.fulfilled, (state, action) => {
        state.loading = false;
        state.installment = action.payload;
      })
      .addCase(getInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })

      .addCase(getFilterInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFilterInstallment.fulfilled, (state, action) => {
        state.loading = false;
        state.filterInstallment = action.payload;
      })
      .addCase(getFilterInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })

      .addCase(getEmployeeWiseInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeWiseInstallment.fulfilled, (state, action) => {
        state.loading = false;
        state.employeeInstallments = action.payload;
      })
      .addCase(getEmployeeWiseInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })


      

      .addCase(installmentReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;  // Reset success message
      })
      .addCase(installmentReceived.fulfilled, (state, action) => {
        state.loading = false;
        state.installmentPayment = action.payload;
        // Dispatch success message after successful response
        if (action.payload.success) {
          state.message = action.payload.message;
        }
      })
      .addCase(installmentReceived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      })

      .addCase(getInstallmentDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallmentDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.customerInstallment = action.payload;
      })
      .addCase(getInstallmentDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Something went wrong!';
      });
  },
});

export const { setLoading, setMessage } = installmentSlice.actions;
export default installmentSlice.reducer;

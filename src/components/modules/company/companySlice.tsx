import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  API_COMPANY_EDIT_URL,
  API_COMPANY_LIST_URL,
  API_COMPANY_UPDATE_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

type CompanyListParams = {
  page: number;
  perPage: number;
  search?: string;
};

type CompanyState = {
  isLoading: boolean;
  isSaving: boolean;
  errors: any;
  data: any;
  editData: any;
};

const extractPayload = (responseData: any) =>
  responseData?.data?.data ?? responseData?.data ?? responseData;

export const getCompanies = createAsyncThunk(
  'company/list',
  async ({ page, perPage, search = '' }: CompanyListParams, { rejectWithValue }) => {
    try {
      const res = await httpService.get(
        `${API_COMPANY_LIST_URL}?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`,
      );
      const responseData = res.data;

      if (responseData?.success === false) {
        return rejectWithValue(responseData?.error?.message || 'Company list load failed');
      }

      return extractPayload(responseData);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Something went wrong');
    }
  },
);

export const editCompany = createAsyncThunk(
  'company/edit',
  async (id: string | number, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_COMPANY_EDIT_URL}${id}`);
      const responseData = res.data;

      if (responseData?.success === false) {
        return rejectWithValue(responseData?.error?.message || 'Company load failed');
      }

      return extractPayload(responseData);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Something went wrong');
    }
  },
);

export const updateCompany = createAsyncThunk(
  'company/update',
  async (data: any, { rejectWithValue }) => {
    try {
      const config =
        data instanceof FormData
          ? {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          : undefined;
      const res = await httpService.post(API_COMPANY_UPDATE_URL, data, config);
      const responseData = res.data;

      if (responseData?.success === false) {
        // notFound() puts the reason in `message` and leaves `error.message` empty,
        // so read both before falling back to the generic text.
        return rejectWithValue(
          responseData?.error?.message ||
            responseData?.message ||
            'Company update failed',
        );
      }

      return responseData;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Something went wrong');
    }
  },
);

const initialState: CompanyState = {
  isLoading: false,
  isSaving: false,
  errors: null,
  data: {},
  editData: {},
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCompanies.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
      })
      .addCase(getCompanies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(getCompanies.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload;
      })
      .addCase(editCompany.pending, (state) => {
        state.isLoading = true;
        state.editData = {};
        state.errors = null;
      })
      .addCase(editCompany.fulfilled, (state, action) => {
        state.isLoading = false;
        state.editData = action.payload;
      })
      .addCase(editCompany.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload;
      })
      .addCase(updateCompany.pending, (state) => {
        state.isSaving = true;
        state.errors = null;
      })
      .addCase(updateCompany.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.isSaving = false;
        state.errors = action.payload;
      });
  },
});

export default companySlice.reducer;

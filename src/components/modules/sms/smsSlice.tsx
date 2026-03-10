import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_SEND_SMS_URL,
  API_SMS_TEMPLATE_DETAILS_URL,
  API_SMS_TEMPLATE_LIST_URL,
  API_SMS_TEMPLATE_PREVIEW_URL,
  API_SMS_TEMPLATE_STORE_URL,
  API_SMS_TEMPLATE_UPDATE_URL,
} from '../../services/apiRoutes';

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

export interface SmsPagination {
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

export interface SmsTemplate {
  id: number | string;
  name: string;
  slug: string;
  body: string;
  description?: string;
  status?: string | number | boolean;
  is_active?: string | number | boolean;
  sample_data?: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}

export interface SmsTemplateFormValues {
  name: string;
  slug: string;
  body: string;
  description: string;
  status: string;
  sample_data: string;
}

export interface SmsTemplateListPayload {
  items: SmsTemplate[];
  pagination: SmsPagination;
}

export interface SmsTemplateQuery {
  page?: number;
  per_page?: number;
  search?: string;
}

interface SmsTemplatePreviewPayload {
  body: string;
  sample_data?: string;
  name?: string;
  slug?: string;
  description?: string;
  status?: string;
  id?: number | string;
}

interface SmsTemplatePreviewState {
  loading: boolean;
  error: string | null;
  raw: any;
  content: string;
}

interface SmsState {
  loading: boolean;
  error: string | null;
  logs: SmsLogItem[];
  pagination: SmsPagination;
  transactionDate: string;

  templatesLoading: boolean;
  templatesError: string | null;
  templates: SmsTemplate[];
  templatePagination: SmsPagination;

  templateDetailsLoading: boolean;
  templateDetailsError: string | null;
  currentTemplate: SmsTemplate | null;

  saveLoading: boolean;
  saveError: string | null;
  saveSuccessMessage: string | null;
  fieldErrors: Record<string, string[]>;

  preview: SmsTemplatePreviewState;
}

const defaultPagination: SmsPagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

export const initialTemplateFormValues: SmsTemplateFormValues = {
  name: '',
  slug: '',
  body: '',
  description: '',
  status: 'active',
  sample_data: '',
};

const initialState: SmsState = {
  loading: false,
  error: null,
  logs: [],
  pagination: defaultPagination,
  transactionDate: '',

  templatesLoading: false,
  templatesError: null,
  templates: [],
  templatePagination: defaultPagination,

  templateDetailsLoading: false,
  templateDetailsError: null,
  currentTemplate: null,

  saveLoading: false,
  saveError: null,
  saveSuccessMessage: null,
  fieldErrors: {},

  preview: {
    loading: false,
    error: null,
    raw: null,
    content: '',
  },
};

const normalizeErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeFieldErrors = (payload: any): Record<string, string[]> => {
  const errors = payload?.errors || payload?.error?.errors || {};
  if (!errors || typeof errors !== 'object') return {};
  return Object.entries(errors).reduce((acc, [key, value]) => {
    acc[key] = Array.isArray(value) ? value.map(item => String(item)) : [String(value)];
    return acc;
  }, {} as Record<string, string[]>);
};

const normalizePagination = (source: any): SmsPagination => ({
  current_page: Number(source?.current_page ?? 1),
  per_page: Number(source?.per_page ?? 10),
  total: Number(source?.total ?? 0),
  last_page: Number(source?.last_page ?? 1),
  from: source?.from ?? null,
  to: source?.to ?? null,
});

const normalizeTemplate = (template: any): SmsTemplate => ({
  ...template,
  id: template?.id ?? template?.template_id ?? '',
  name: template?.name ?? template?.title ?? '',
  slug: template?.slug ?? template?.code ?? template?.key ?? '',
  body: template?.body ?? template?.message ?? template?.content ?? template?.template ?? '',
  description: template?.description ?? template?.note ?? '',
  status:
    template?.status ??
    (template?.is_active === 1 || template?.is_active === true || template?.is_active === '1'
      ? 'active'
      : template?.is_active === 0 || template?.is_active === false || template?.is_active === '0'
        ? 'inactive'
        : ''),
  sample_data:
    typeof template?.sample_data === 'string'
      ? template.sample_data
      : template?.sample_data
        ? JSON.stringify(template.sample_data, null, 2)
        : '',
  is_active: template?.is_active,
});

const normalizeTemplateList = (payload: any): SmsTemplateListPayload => {
  const rawCollection =
    payload?.data?.data ??
    payload?.data ??
    payload?.templates ??
    payload?.items ??
    payload;

  const itemsSource =
    rawCollection?.items ??
    rawCollection?.data ??
    payload?.items ??
    payload?.templates ??
    [];

  const paginationSource =
    rawCollection?.pagination ??
    rawCollection ??
    payload?.pagination ??
    defaultPagination;

  return {
    items: Array.isArray(itemsSource) ? itemsSource.map(normalizeTemplate) : [],
    pagination: normalizePagination(paginationSource),
  };
};

const normalizeTemplateDetails = (payload: any): SmsTemplate => {
  const template =
    payload?.data?.data ??
    payload?.data ??
    payload?.template ??
    payload;
  return normalizeTemplate(template);
};

const normalizePreviewContent = (payload: any): string =>
  payload?.data?.preview ||
  payload?.preview ||
  payload?.data?.message ||
  payload?.message ||
  payload?.data?.content ||
  payload?.content ||
  payload?.data?.body ||
  payload?.body ||
  '';

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
        pagination: data?.data?.data?.pagination || defaultPagination,
        transaction_date: data?.data?.transaction_date || '',
      };
    }

    return rejectWithValue(data?.error?.message || data?.message || 'Failed to load SMS logs');
  } catch (error: any) {
    return rejectWithValue(normalizeErrorMessage(error, 'Failed to load SMS logs'));
  }
});

export const fetchSmsTemplates = createAsyncThunk<SmsTemplateListPayload, SmsTemplateQuery | undefined, { rejectValue: string }>('sms/templates', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await httpService.get(API_SMS_TEMPLATE_LIST_URL, {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
        search: params.search?.trim() || '',
      },
    });

    return normalizeTemplateList(response.data);
  } catch (error: any) {
    return rejectWithValue(normalizeErrorMessage(error, 'Failed to load SMS templates'));
  }
});

export const fetchSmsTemplateById = createAsyncThunk<
  SmsTemplate,
  number | string,
  { rejectValue: string }
>('sms/templateById', async (id, { rejectWithValue }) => {
  try {
    const response = await httpService.get(`${API_SMS_TEMPLATE_DETAILS_URL}${id}`);
    return normalizeTemplateDetails(response.data);
  } catch (error: any) {
    return rejectWithValue(normalizeErrorMessage(error, 'Failed to load SMS template'));
  }
});

const buildTemplatePayload = (values: SmsTemplateFormValues) => ({
  name: values.name.trim(),
  slug: values.slug.trim(),
  code: values.slug.trim(),
  body: values.body,
  description: values.description.trim(),
  status: values.status === 'active' ? 1 : 0,
  is_active: values.status === 'active' ? 1 : 0,
  sample_data: values.sample_data.trim(),
});

export const createSmsTemplate = createAsyncThunk<
  { message: string },
  SmsTemplateFormValues,
  { rejectValue: { message: string; fieldErrors?: Record<string, string[]> } }
>('sms/createTemplate', async (values, { rejectWithValue }) => {
  try {
    const response = await httpService.post(API_SMS_TEMPLATE_STORE_URL, buildTemplatePayload(values));
    return {
      message: response?.data?.message || 'SMS template created successfully',
    };
  } catch (error: any) {
    return rejectWithValue({
      message: normalizeErrorMessage(error, 'Failed to create SMS template'),
      fieldErrors: normalizeFieldErrors(error?.response?.data),
    });
  }
});

export const updateSmsTemplate = createAsyncThunk<
  { message: string },
  { id: number | string; values: SmsTemplateFormValues },
  { rejectValue: { message: string; fieldErrors?: Record<string, string[]> } }
>('sms/updateTemplate', async ({ id, values }, { rejectWithValue }) => {
  try {
    const response = await httpService.post(
      `${API_SMS_TEMPLATE_UPDATE_URL}${id}`,
      buildTemplatePayload(values),
    );
    return {
      message: response?.data?.message || 'SMS template updated successfully',
    };
  } catch (error: any) {
    return rejectWithValue({
      message: normalizeErrorMessage(error, 'Failed to update SMS template'),
      fieldErrors: normalizeFieldErrors(error?.response?.data),
    });
  }
});

export const previewSmsTemplate = createAsyncThunk<
  { raw: any; content: string },
  SmsTemplatePreviewPayload,
  { rejectValue: string }
>('sms/previewTemplate', async (payload, { rejectWithValue }) => {
  try {
    let parsedSampleData: Record<string, any> | null = null;

    if (payload.sample_data?.trim()) {
      parsedSampleData = JSON.parse(payload.sample_data);
    }

    const requestPayload = {
      id: payload.id,
      name: payload.name?.trim(),
      slug: payload.slug?.trim(),
      code: payload.slug?.trim(),
      body: payload.body,
      description: payload.description?.trim(),
      status: payload.status === 'inactive' ? 0 : 1,
      sample_data: parsedSampleData,
    };

    const response = await httpService.post(API_SMS_TEMPLATE_PREVIEW_URL, requestPayload);
    return {
      raw: response.data,
      content: normalizePreviewContent(response.data),
    };
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return rejectWithValue('Sample data must be valid JSON before preview.');
    }

    return rejectWithValue(normalizeErrorMessage(error, 'Failed to preview SMS template'));
  }
});

const smsSlice = createSlice({
  name: 'sms',
  initialState,
  reducers: {
    resetSmsState: () => initialState,
    clearSmsTemplateFormState: state => {
      state.saveError = null;
      state.saveSuccessMessage = null;
      state.fieldErrors = {};
      state.templateDetailsError = null;
    },
    clearSmsTemplatePreview: state => {
      state.preview = {
        loading: false,
        error: null,
        raw: null,
        content: '',
      };
    },
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
      })
      .addCase(fetchSmsTemplates.pending, state => {
        state.templatesLoading = true;
        state.templatesError = null;
      })
      .addCase(fetchSmsTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload.items;
        state.templatePagination = action.payload.pagination;
      })
      .addCase(fetchSmsTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.templatesError = action.payload || 'Failed to load SMS templates';
        state.templates = [];
        state.templatePagination = {
          ...state.templatePagination,
          total: 0,
          from: null,
          to: null,
          last_page: 1,
        };
      })
      .addCase(fetchSmsTemplateById.pending, state => {
        state.templateDetailsLoading = true;
        state.templateDetailsError = null;
        state.currentTemplate = null;
      })
      .addCase(fetchSmsTemplateById.fulfilled, (state, action) => {
        state.templateDetailsLoading = false;
        state.currentTemplate = action.payload;
      })
      .addCase(fetchSmsTemplateById.rejected, (state, action) => {
        state.templateDetailsLoading = false;
        state.templateDetailsError = action.payload || 'Failed to load SMS template';
      })
      .addCase(createSmsTemplate.pending, state => {
        state.saveLoading = true;
        state.saveError = null;
        state.saveSuccessMessage = null;
        state.fieldErrors = {};
      })
      .addCase(createSmsTemplate.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.saveSuccessMessage = action.payload.message;
      })
      .addCase(createSmsTemplate.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload?.message || 'Failed to create SMS template';
        state.fieldErrors = action.payload?.fieldErrors || {};
      })
      .addCase(updateSmsTemplate.pending, state => {
        state.saveLoading = true;
        state.saveError = null;
        state.saveSuccessMessage = null;
        state.fieldErrors = {};
      })
      .addCase(updateSmsTemplate.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.saveSuccessMessage = action.payload.message;
      })
      .addCase(updateSmsTemplate.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload?.message || 'Failed to update SMS template';
        state.fieldErrors = action.payload?.fieldErrors || {};
      })
      .addCase(previewSmsTemplate.pending, state => {
        state.preview.loading = true;
        state.preview.error = null;
      })
      .addCase(previewSmsTemplate.fulfilled, (state, action) => {
        state.preview.loading = false;
        state.preview.raw = action.payload.raw;
        state.preview.content = action.payload.content;
      })
      .addCase(previewSmsTemplate.rejected, (state, action) => {
        state.preview.loading = false;
        state.preview.error = action.payload || 'Failed to preview SMS template';
        state.preview.raw = null;
        state.preview.content = '';
      });
  },
});

export const { resetSmsState, clearSmsTemplateFormState, clearSmsTemplatePreview } =
  smsSlice.actions;
export default smsSlice.reducer;

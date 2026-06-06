import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../../services/httpService';
import {
  API_ATTENDANCE_HOLIDAY_LIST_URL,
  API_ATTENDANCE_HOLIDAY_STORE_URL,
  API_ATTENDANCE_HOLIDAY_UPDATE_URL,
  API_ATTENDANCE_ENTRY_APPROVE_URL,
  API_ATTENDANCE_ENTRY_BULK_STORE_URL,
  API_ATTENDANCE_ENTRY_DELETE_URL,
  API_ATTENDANCE_ENTRY_LIST_URL,
  API_ATTENDANCE_ENTRY_REPORT_URL,
  API_ATTENDANCE_ENTRY_STORE_URL,
  API_ATTENDANCE_ENTRY_UPDATE_URL,
  API_ATTENDANCE_LEAVE_APPLICATION_APPROVE_URL,
  API_ATTENDANCE_LEAVE_APPLICATION_LIST_URL,
  API_ATTENDANCE_LEAVE_APPLICATION_STORE_URL,
  API_ATTENDANCE_LEAVE_TYPE_LIST_URL,
  API_ATTENDANCE_LEAVE_TYPE_STORE_URL,
  API_ATTENDANCE_LEAVE_TYPE_UPDATE_URL,
  API_ATTENDANCE_MONTHLY_SUMMARY_URL,
  API_ATTENDANCE_SHIFT_LIST_URL,
  API_ATTENDANCE_SHIFT_STORE_URL,
  API_ATTENDANCE_SHIFT_UPDATE_URL,
  API_ATTENDANCE_WEEKLY_HOLIDAY_LIST_URL,
  API_ATTENDANCE_WEEKLY_HOLIDAY_STORE_URL,
  API_ATTENDANCE_WEEKLY_HOLIDAY_UPDATE_URL,
} from '../../../services/apiRoutes';

const toList = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const extractData = (response: any) => toList(response?.data?.data?.data ?? response?.data?.data ?? response?.data);

const rejectMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || fallback;

export const fetchAttendanceShifts = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchAttendanceShifts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_SHIFT_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch shifts'));
    }
  },
);

export const saveAttendanceShift = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveAttendanceShift',
  async (payload, { rejectWithValue }) => {
    try {
      const url = payload?.id ? `${API_ATTENDANCE_SHIFT_UPDATE_URL}/${payload.id}` : API_ATTENDANCE_SHIFT_STORE_URL;
      const response = await httpService.post(url, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save shift'));
    }
  },
);

export const fetchWeeklyHolidays = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchWeeklyHolidays',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_WEEKLY_HOLIDAY_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch weekly holidays'));
    }
  },
);

export const saveWeeklyHoliday = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveWeeklyHoliday',
  async (payload, { rejectWithValue }) => {
    try {
      const url = payload?.id ? `${API_ATTENDANCE_WEEKLY_HOLIDAY_UPDATE_URL}/${payload.id}` : API_ATTENDANCE_WEEKLY_HOLIDAY_STORE_URL;
      const response = await httpService.post(url, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save weekly holiday'));
    }
  },
);

export const fetchHolidays = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchHolidays',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_HOLIDAY_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch holidays'));
    }
  },
);

export const saveHoliday = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveHoliday',
  async (payload, { rejectWithValue }) => {
    try {
      const url = payload?.id ? `${API_ATTENDANCE_HOLIDAY_UPDATE_URL}/${payload.id}` : API_ATTENDANCE_HOLIDAY_STORE_URL;
      const response = await httpService.post(url, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save holiday'));
    }
  },
);

export const fetchLeaveTypes = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchLeaveTypes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_LEAVE_TYPE_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch leave types'));
    }
  },
);

export const saveLeaveType = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveLeaveType',
  async (payload, { rejectWithValue }) => {
    try {
      const url = payload?.id ? `${API_ATTENDANCE_LEAVE_TYPE_UPDATE_URL}/${payload.id}` : API_ATTENDANCE_LEAVE_TYPE_STORE_URL;
      const response = await httpService.post(url, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save leave type'));
    }
  },
);

export const fetchAttendanceEntries = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchAttendanceEntries',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_ENTRY_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch attendance entries'));
    }
  },
);

export const fetchAttendanceReport = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchAttendanceReport',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_ENTRY_REPORT_URL, { params });
      return response?.data?.data?.data || response?.data?.data || {};
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch attendance report'));
    }
  },
);

export const fetchMonthlyAttendanceSummary = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchMonthlyAttendanceSummary',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_MONTHLY_SUMMARY_URL, { params });
      return response?.data?.data?.data || response?.data?.data || {};
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch monthly attendance summary'));
    }
  },
);

export const saveAttendanceEntry = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveAttendanceEntry',
  async (payload, { rejectWithValue }) => {
    try {
      const url = payload?.id ? `${API_ATTENDANCE_ENTRY_UPDATE_URL}/${payload.id}` : API_ATTENDANCE_ENTRY_STORE_URL;
      const response = await httpService.post(url, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save attendance entry'));
    }
  },
);

export const bulkSaveAttendanceEntries = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/bulkSaveAttendanceEntries',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_ATTENDANCE_ENTRY_BULK_STORE_URL, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save bulk attendance'));
    }
  },
);

export const approveAttendanceEntry = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/approveAttendanceEntry',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await httpService.post(`${API_ATTENDANCE_ENTRY_APPROVE_URL}/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to update attendance approval'));
    }
  },
);

export const deleteAttendanceEntry = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/deleteAttendanceEntry',
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await httpService.post(`${API_ATTENDANCE_ENTRY_DELETE_URL}/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to delete attendance entry'));
    }
  },
);

export const fetchLeaveApplications = createAsyncThunk<any, any | undefined, { rejectValue: string }>(
  'attendance/fetchLeaveApplications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await httpService.get(API_ATTENDANCE_LEAVE_APPLICATION_LIST_URL, { params });
      return extractData(response);
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to fetch leave applications'));
    }
  },
);

export const saveLeaveApplication = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/saveLeaveApplication',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_ATTENDANCE_LEAVE_APPLICATION_STORE_URL, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to save leave application'));
    }
  },
);

export const approveLeaveApplication = createAsyncThunk<any, any, { rejectValue: string }>(
  'attendance/approveLeaveApplication',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await httpService.post(`${API_ATTENDANCE_LEAVE_APPLICATION_APPROVE_URL}/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(rejectMessage(error, 'Failed to update leave approval'));
    }
  },
);

interface AttendanceState {
  shifts: any[];
  weeklyHolidays: any[];
  holidays: any[];
  leaveTypes: any[];
  entries: any[];
  report: any;
  monthlySummary: any;
  leaveApplications: any[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  shifts: [],
  weeklyHolidays: [],
  holidays: [],
  leaveTypes: [],
  entries: [],
  report: null,
  monthlySummary: null,
  leaveApplications: [],
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const pending = (state: AttendanceState) => {
      state.loading = true;
      state.error = null;
    };
    const rejected = (state: AttendanceState, action: any) => {
      state.loading = false;
      state.error = action.payload || 'Attendance request failed';
    };

    builder
      .addCase(fetchAttendanceShifts.pending, pending)
      .addCase(fetchAttendanceShifts.fulfilled, (state, action) => {
        state.loading = false;
        state.shifts = action.payload;
      })
      .addCase(fetchAttendanceShifts.rejected, rejected)
      .addCase(fetchWeeklyHolidays.pending, pending)
      .addCase(fetchWeeklyHolidays.fulfilled, (state, action) => {
        state.loading = false;
        state.weeklyHolidays = action.payload;
      })
      .addCase(fetchWeeklyHolidays.rejected, rejected)
      .addCase(fetchHolidays.pending, pending)
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.loading = false;
        state.holidays = action.payload;
      })
      .addCase(fetchHolidays.rejected, rejected)
      .addCase(fetchLeaveTypes.pending, pending)
      .addCase(fetchLeaveTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveTypes = action.payload;
      })
      .addCase(fetchLeaveTypes.rejected, rejected)
      .addCase(fetchAttendanceEntries.pending, pending)
      .addCase(fetchAttendanceEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchAttendanceEntries.rejected, rejected)
      .addCase(fetchAttendanceReport.pending, pending)
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.report = action.payload;
      })
      .addCase(fetchAttendanceReport.rejected, rejected)
      .addCase(fetchMonthlyAttendanceSummary.pending, pending)
      .addCase(fetchMonthlyAttendanceSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlySummary = action.payload;
      })
      .addCase(fetchMonthlyAttendanceSummary.rejected, rejected)
      .addCase(fetchLeaveApplications.pending, pending)
      .addCase(fetchLeaveApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveApplications = action.payload;
      })
      .addCase(fetchLeaveApplications.rejected, rejected)
      .addMatcher(
        (action) => action.type.startsWith('attendance/save') && action.type.endsWith('/pending'),
        pending,
      )
      .addMatcher(
        (action) => action.type.startsWith('attendance/save') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.loading = false;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('attendance/save') && action.type.endsWith('/rejected'),
        rejected,
      )
      .addMatcher(
        (action) => action.type.startsWith('attendance/approve') && action.type.endsWith('/pending'),
        pending,
      )
      .addMatcher(
        (action) => action.type.startsWith('attendance/approve') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.loading = false;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('attendance/approve') && action.type.endsWith('/rejected'),
        rejected,
      );
  },
});

export default attendanceSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import httpService from '../../../services/httpService';
import { API_HOTEL_MONTH_URL, API_HOTEL_TIMELINE_URL } from '../../../services/apiRoutes';

/**
 * The property over time -- phase 4.
 *
 * ⚠️ NOTHING HERE IS A RESERVATION, and it is worth saying in the same place
 * bookingSlice says it: what these hold is what was true at the moment they were
 * read. The month is a report and reads as one; the tape chart looks more like
 * something you could click a room out of, and it is not -- a booking is taken
 * on the availability screen, against the unique key that actually stops a bed
 * being sold twice.
 */

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const said = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

/** How full a month was, night by night, with ADR and RevPAR against it. */
export const monthRead = createAsyncThunk<any, Record<string, any>, { rejectValue: string }>(
  'hotelCalendar/monthRead',
  async (params, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_HOTEL_MONTH_URL, { params });
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not read the month');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the month'));
    }
  },
);

/** Rooms down the side, nights across the top -- the holes are the point. */
export const timelineRead = createAsyncThunk<any, Record<string, any>, { rejectValue: string }>(
  'hotelCalendar/timelineRead',
  async (params, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_HOTEL_TIMELINE_URL, { params });
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not read the chart');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the chart'));
    }
  },
);

interface CalendarState {
  month: any | null;
  timeline: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: CalendarState = {
  month: null,
  timeline: null,
  loading: false,
  error: null,
};

const calendarSlice = createSlice({
  name: 'hotelCalendar',
  initialState,
  reducers: {
    clearCalendar() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    [monthRead, timelineRead].forEach((thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.loading = false;
          state.error = action.payload || 'Failed';
          // ⚠️ Blanked, not left standing. A month painted under a heading the
          // server refused would be one property's occupancy shown under
          // another's name -- and occupancy is a figure people quote.
          if (thunk === monthRead) state.month = null;
          else state.timeline = null;
        });
    });

    builder
      .addCase(monthRead.fulfilled, (state, action) => {
        state.loading = false;
        state.month = action.payload;
      })
      .addCase(timelineRead.fulfilled, (state, action) => {
        state.loading = false;
        state.timeline = action.payload;
      });
  },
});

export const { clearCalendar } = calendarSlice.actions;
export default calendarSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import httpService from '../../../services/httpService';
import { API_HOTEL_COLLECTION_URL, API_HOTEL_REGISTER_URL } from '../../../services/apiRoutes';

/**
 * Reading the property back: who was here, and what came in.
 *
 * Its own slice rather than a corner of hotelBooking. That one holds what a
 * clerk is doing to ONE booking right now and is written to constantly; this
 * holds an answer about a whole property on a date, and the two have opposite
 * lifetimes. Keeping them apart is what stops a register being invalidated
 * because somebody took a payment on an unrelated stay.
 *
 * ⚠️ NEITHER ANSWER IS CACHED ACROSS A DATE. Both are read again whenever the
 * date or the branch changes rather than filtered on screen — the server works
 * out who was in a bed on a given night from the nights table, and no filter
 * over yesterday's answer can produce today's.
 */

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const said = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

/**
 * The guest register for one night, or the day's arrivals or departures.
 *
 * ⚠️ It answers who SLEPT here, not who booked to. A guest who left early holds
 * no night after their departure, and the register follows the nights — see the
 * controller's header for why that distinction is the whole point of the report.
 */
export const registerRead = createAsyncThunk<any, Record<string, any>, { rejectValue: string }>(
  'hotelReport/registerRead',
  async (params, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_HOTEL_REGISTER_URL, { params });
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not read the register');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the register'));
    }
  },
);

/** Money taken between two dates, netted, with the voucher against each row. */
export const collectionRead = createAsyncThunk<any, Record<string, any>, { rejectValue: string }>(
  'hotelReport/collectionRead',
  async (params, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_HOTEL_COLLECTION_URL, { params });
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not read the collection');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the collection'));
    }
  },
);

interface ReportState {
  register: any | null;
  collection: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  register: null,
  collection: null,
  loading: false,
  error: null,
};

const reportSlice = createSlice({
  name: 'hotelReport',
  initialState,
  reducers: {
    /**
     * Thrown away on the way off the screen.
     *
     * ⚠️ The register names people and carries their NIDs. Left in the store it
     * would be painted under the next branch's heading for the moment before
     * that branch's own read came back — which on this report means showing one
     * property's guest list under another property's name.
     */
    clearReports() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    [registerRead, collectionRead].forEach((thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.loading = false;
          state.error = action.payload || 'Failed';
          // ⚠️ Blanked rather than left standing. A stale register on screen
          // under a date the server refused is a list of names attached to the
          // wrong night, and somebody would read it as an answer.
          if (thunk === registerRead) state.register = null;
          else state.collection = null;
        });
    });

    builder
      .addCase(registerRead.fulfilled, (state, action) => {
        state.loading = false;
        state.register = action.payload;
      })
      .addCase(collectionRead.fulfilled, (state, action) => {
        state.loading = false;
        state.collection = action.payload;
      });
  },
});

export const { clearReports } = reportSlice.actions;
export default reportSlice.reducer;

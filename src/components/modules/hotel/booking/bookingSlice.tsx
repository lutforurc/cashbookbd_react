import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import httpService from '../../../services/httpService';
import {
  API_HOTEL_BOOKING_AVAILABILITY_URL,
  API_HOTEL_BOOKING_URL,
} from '../../../services/apiRoutes';
import { HotelTimes, Paged } from '../types';
import { Allotment, Availability, Booking } from './types';

/**
 * Bookings: what is free, and taking it.
 *
 * Its own slice rather than another corner of hotelSetupSlice. Setup describes
 * a property once and is read while nothing is changing underneath; this is
 * read while other people are booking, and the two have opposite instincts
 * about stale data. Keeping them apart is what stops a room list cached for the
 * setup screen being handed to a clerk as an availability answer.
 *
 * ⚠️ AVAILABILITY IS ADVISORY, AND THIS SLICE IS WHERE THAT IS EASIEST TO
 * FORGET. What it holds is what was free at the moment it was read. Nothing
 * here refreshes it, nothing here reserves anything, and the state below must
 * never be treated as a claim on a room. The claim happens at the server, on
 * save, against a unique key -- and `bookingSave` rejects with the server's own
 * sentence when somebody else got there first.
 */

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const said = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

/**
 * What is free between two dates.
 *
 * Its own endpoint rather than the room list with a filter: the question is
 * about nights rather than about rooms, and the answer has to come back whole.
 * A paginated availability screen would let a clerk book page one while page
 * two was still being decided.
 */
export const availabilityRead = createAsyncThunk<
  Availability,
  Record<string, any>,
  { rejectValue: string }
>('hotelBooking/availabilityRead', async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_HOTEL_BOOKING_AVAILABILITY_URL, { params });
    if (res.data?.success === true) return unwrap(res);
    return rejectWithValue(res.data?.message || 'Could not read availability');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not read availability'));
  }
});

export const bookingList = createAsyncThunk<
  { bookings: Paged<Booking>; times: HotelTimes },
  Record<string, any> | undefined,
  { rejectValue: string }
>('hotelBooking/bookingList', async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_HOTEL_BOOKING_URL, { params });
    if (res.data?.success === true) return unwrap(res);
    return rejectWithValue(res.data?.message || 'Failed to load bookings');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Failed to load bookings'));
  }
});

/** One booking, with the rooms it holds folded back out of the seat rows. */
export const bookingRead = createAsyncThunk<Booking, number, { rejectValue: string }>(
  'hotelBooking/bookingRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_BOOKING_URL}/edit/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Failed to load the booking');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Failed to load the booking'));
    }
  },
);

/**
 * Take the rooms.
 *
 * ⚠️ The rejection is the interesting half. A 409 here means somebody else took
 * one of these rooms while the form was open -- the server's message says so in
 * words and says that nothing was booked. Replacing it with "Save failed" would
 * throw away the only thing the clerk needs to know.
 */
export const bookingSave = createAsyncThunk<
  { message: string; data: Booking },
  any,
  { rejectValue: string }
>('hotelBooking/bookingSave', async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/store`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Booked', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Booking failed');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Booking failed'));
  }
});

/** Give the nights back. The booking itself stays, cancelled. */
export const bookingCancel = createAsyncThunk<
  { message: string; data: Booking },
  { id: number; reason?: string },
  { rejectValue: string }
>('hotelBooking/bookingCancel', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/cancel/${id}`, { reason });
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Cancelled', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Cancellation failed');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Cancellation failed'));
  }
});

/**
 * The booking as the desk sees it when the guests walk in.
 *
 * Read again after every save rather than patched in place: allotment is
 * piecemeal, and what the screen has to show is what is still OUTSTANDING --
 * a number the server works out from all the rooms at once.
 */
export const allotmentRead = createAsyncThunk<Allotment, number, { rejectValue: string }>(
  'hotelBooking/allotmentRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_BOOKING_URL}/allotment/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Failed to load the allotment');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Failed to load the allotment'));
    }
  },
);

/**
 * Record the people in ONE room.
 *
 * ⚠️ The list REPLACES what was there for that room. Allotment is corrected
 * more often than it is added to — a name misheard on the telephone, a guest
 * who sent somebody else — so the screen sends the room as it should now be.
 */
export const allotSave = createAsyncThunk<
  { message: string; data: Booking },
  { id: number; room_id: number; guests: any[] },
  { rejectValue: string }
>('hotelBooking/allotSave', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/allot/${id}`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Recorded', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not record the guests');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not record the guests'));
  }
});

const emptyPage = { data: [], total: 0, current_page: 1, per_page: 10 };

interface BookingState {
  bookings: Paged<Booking>;
  /** What was free the last time somebody asked. Never a reservation. */
  availability: Availability | null;
  opened: Booking | null;
  /** The booking being checked in, room by room. */
  allotment: Allotment | null;

  /**
   * When the day turns over at this property.
   *
   * Arrives with the LIST, not only with an availability read, because the desk
   * is asked "what time is check-out?" far more often than it is asked to find
   * a free room -- and usually while looking at a screen it has pressed nothing
   * on.
   */
  times: HotelTimes | null;

  loading: boolean;
  checking: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: { ...emptyPage },
  availability: null,
  opened: null,
  allotment: null,
  times: null,

  loading: false,
  checking: false,
  saving: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'hotelBooking',
  initialState,
  reducers: {
    clearBookings() {
      return { ...initialState };
    },
    /**
     * Thrown away the moment the dates change, and after every save.
     *
     * Holding it would leave a list of "free" rooms on screen that answers a
     * question nobody asked any more -- which is the one way this screen could
     * mislead somebody into thinking a room was theirs.
     */
    clearAvailability(state) {
      state.availability = null;
    },
    clearOpened(state) {
      state.opened = null;
    },
    clearAllotment(state) {
      state.allotment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bookingList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bookingList.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload?.bookings || { ...emptyPage };
        // Kept when a later read does not carry them, rather than blanked: the
        // line at the top of the screen should not flicker away on a search.
        state.times = action.payload?.times ?? state.times;
      })
      // A list that comes back empty answers 404 with a sentence, which axios
      // throws. An empty table is the right thing to show for it.
      .addCase(bookingList.rejected, (state, action) => {
        state.loading = false;
        state.bookings = { ...emptyPage };
        state.error = action.payload || null;
      })

      .addCase(availabilityRead.pending, (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(availabilityRead.fulfilled, (state, action) => {
        state.checking = false;
        state.availability = action.payload;
      })
      .addCase(availabilityRead.rejected, (state, action) => {
        state.checking = false;
        state.availability = null;
        state.error = action.payload || null;
      })

      .addCase(bookingRead.fulfilled, (state, action) => {
        state.opened = action.payload;
      })
      .addCase(allotmentRead.fulfilled, (state, action) => {
        state.allotment = action.payload;
      })
      .addCase(allotmentRead.rejected, (state, action) => {
        state.allotment = null;
        state.error = action.payload || null;
      })
      .addCase(bookingRead.rejected, (state, action) => {
        state.opened = null;
        state.error = action.payload || null;
      });

    [bookingSave, bookingCancel, allotSave].forEach((thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state: any) => {
          state.saving = false;
          // Whatever was on screen described the moment before this write.
          state.availability = null;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.saving = false;
          state.error = action.payload || 'Failed';
          // Especially on a clash: the rooms it listed are provably out of
          // date, because one of them has just been taken by somebody else.
          state.availability = null;
        });
    });
  },
});

export const { clearBookings, clearAvailability, clearOpened, clearAllotment } =
  bookingSlice.actions;
export default bookingSlice.reducer;

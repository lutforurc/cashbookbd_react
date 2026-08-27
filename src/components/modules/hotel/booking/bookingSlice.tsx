import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import httpService from '../../../services/httpService';
import {
  API_HOTEL_BILL_URL,
  API_HOTEL_BOOKING_AVAILABILITY_URL,
  API_HOTEL_BOOKING_URL,
  API_HOTEL_CANCELLATION_URL,
  API_HOTEL_CHECKOUT_URL,
  API_HOTEL_FOLIO_URL,
  API_HOTEL_TILL_URL,
  API_HOTEL_HALL_URL,
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

/**
 * What is free in the halls on one date.
 *
 * ⚠️ ADVISORY, exactly like availabilityRead. What stops a hall being sold
 * twice is the unique key, which counts the sitting -- two clerks may both be
 * told the evening is free and both be right at the moment they are told.
 */
export const hallsRead = createAsyncThunk<
  any,
  Record<string, any>,
  { rejectValue: string }
>('hotelBooking/hallsRead', async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_HOTEL_HALL_URL, { params });
    if (res.data?.success === true) return unwrap(res);
    return rejectWithValue(res.data?.message || 'Could not read the halls');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not read the halls'));
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

/**
 * What cancelling would do to the money, before the dialog asks.
 *
 * ⚠️ Read EVERY time the dialog opens rather than taken off the booking row.
 * The list row says nothing about what has been paid, and the one number the
 * desk is about to be asked to divide is exactly that.
 */
export const cancellationRead = createAsyncThunk<any, number, { rejectValue: string }>(
  'hotelBooking/cancellationRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_CANCELLATION_URL}/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not work out the cancellation');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not work out the cancellation'));
    }
  },
);

/**
 * Give the nights back, and settle the money. The booking itself stays,
 * cancelled.
 *
 * ⚠️ The refund is only half of it. Whatever is NOT handed back is retained as
 * cancellation income — so sending no refund_amount does not mean "decide
 * later", it means the hotel keeps all of it. The dialog says so in words.
 */
export const bookingCancel = createAsyncThunk<
  { message: string; data: Booking },
  { id: number; reason?: string; refund_amount?: number; coa4_id?: number | null },
  { rejectValue: string }
>('hotelBooking/bookingCancel', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/cancel/${id}`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Cancelled', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Cancellation failed');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Cancellation failed'));
  }
});

/**
 * Who owes this bill now, how much, and every move it has made — §6.4.
 *
 * ⚠️ Read before the dialog opens, and read AGAIN after a move. The figure the
 * desk is asked to agree to is the outstanding balance, and it changes the
 * moment anything is billed or paid — so it is never carried over from a
 * previous open of the dialog.
 */
export const billRead = createAsyncThunk<any, number, { rejectValue: string }>(
  'hotelBooking/billRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_BILL_URL}/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Could not read the bill');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the bill'));
    }
  },
);

/**
 * Move what is owed onto somebody else — or back to the guest.
 *
 * ⚠️ `to_party_id: null` is not "leave it alone", it is "move it BACK to the
 * guest". That is the way out of a company named by mistake, and §6.4 requires
 * it: without a way back the whole bill has to be cancelled and typed again.
 */
export const billTransfer = createAsyncThunk<
  { message: string; data: any },
  { id: number; to_party_id: number | null; reason?: string },
  { rejectValue: string }
>('hotelBooking/billTransfer', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_BILL_URL}/${id}/transfer`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Moved', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not move the bill');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not move the bill'));
  }
});

/**
 * This company's cash and bank heads — where money can be taken into, or paid
 * out of.
 *
 * ⚠️ Read once and kept. The chart of accounts does not change while a clerk is
 * standing at the desk, and re-reading it on every payment form would put a
 * spinner between the guest and the receipt.
 */
export const tillList = createAsyncThunk<any[], void, { rejectValue: string }>(
  'hotelBooking/tillList',
  async (_, { rejectWithValue }) => {
    try {
      const res = await httpService.get(API_HOTEL_TILL_URL);
      if (res.data?.success === true) return unwrap(res) || [];
      return rejectWithValue(res.data?.message || 'Could not read the cash accounts');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Could not read the cash accounts'));
    }
  },
);

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

/**
 * The bill, the money, and what is left -- screen 5.
 *
 * ⚠️ Read again after every write rather than patched in place. What was
 * CHARGED and what was PAID are two different questions with two different
 * tables behind them, and the balance is derived from both. Patching one in
 * place would let the screen show a bill and a balance from two different
 * moments -- and the moment that matters is the one the guest is standing in.
 */
export const folioRead = createAsyncThunk<any, number, { rejectValue: string }>(
  'hotelBooking/folioRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_FOLIO_URL}/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Failed to load the bill');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Failed to load the bill'));
    }
  },
);

/**
 * Put the nights already held on the bill.
 *
 * ⚠️ Safe to press twice, and the server is what makes it so. A 409 means
 * somebody billed one of these nights while this screen was open, and NOTHING
 * was added -- the server's own sentence says exactly that, so it is passed
 * through rather than replaced.
 */
export const folioBill = createAsyncThunk<
  { message: string; data: any },
  number,
  { rejectValue: string }
>('hotelBooking/folioBill', async (id, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_FOLIO_URL}/${id}/bill`, {});
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Billed', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not bill the nights');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not bill the nights'));
  }
});

/** One charge that is not a night -- laundry, a meal, a late checkout. */
export const folioCharge = createAsyncThunk<
  { message: string; data: any },
  { id: number; [key: string]: any },
  { rejectValue: string }
>('hotelBooking/folioCharge', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_FOLIO_URL}/${id}/charge`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Added', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not add the charge');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not add the charge'));
  }
});

/**
 * Take money, or give some back.
 *
 * ⚠️ This does not touch the bill. An advance is a liability until the nights
 * have been slept (spec 2.6), and a payment that quietly created a bill line
 * would make what a guest is charged depend on when they paid.
 */
export const folioReceive = createAsyncThunk<
  { message: string; data: any },
  { id: number; [key: string]: any },
  { rejectValue: string }
>('hotelBooking/folioReceive', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_FOLIO_URL}/${id}/receive`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Received', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not record the money');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not record the money'));
  }
});

/**
 * What checking out on a given day would do -- screen 6.
 *
 * ⚠️ A PLAN, not a record. Nothing is written by reading it, and every figure
 * in it is conditional on the departure date it was asked with: change the date
 * and every one of them changes with it. So it is read again on every change
 * rather than filtered on screen.
 *
 * ⚠️ ITS BALANCE IS NOT THE FOLIO'S. The folio shows what has been charged;
 * this shows what WILL have been charged once the nights are billed, which on
 * the morning a guest leaves is usually the whole stay. Showing the folio's
 * figure here would tell the desk to collect nothing.
 */
export const checkoutRead = createAsyncThunk<
  any,
  // ⚠️ resource_ids ABSENT means every room, which is what an ordinary
  // departure means. An empty array would say the same thing to the server, so
  // the screen never sends one (§6.5).
  { id: number; departure_date?: string; resource_ids?: number[] },
  { rejectValue: string }
>('hotelBooking/checkoutRead', async ({ id, ...params }, { rejectWithValue }) => {
  try {
    const res = await httpService.get(`${API_HOTEL_CHECKOUT_URL}/${id}`, { params });
    if (res.data?.success === true) return unwrap(res);
    return rejectWithValue(res.data?.message || 'Could not work out the check-out');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not work out the check-out'));
  }
});

/**
 * End the stay.
 *
 * ⚠️ NOT SAFE TO PRESS TWICE, and unlike billing it cannot be made so: it
 * DELETES the nights the guest is not staying, so the beds can be sold again. A
 * second press answers "already checked out" rather than doing it twice, but the
 * screen still asks before the first.
 *
 * ⚠️ The server refuses a balance with nobody's name on it. That rejection is
 * passed through as it stands -- it names the figure, which a replacement
 * sentence here would not.
 */
export const checkoutSave = createAsyncThunk<
  { message: string; data: any },
  { id: number; [key: string]: any },
  { rejectValue: string }
>('hotelBooking/checkoutSave', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_CHECKOUT_URL}/${id}`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Checked out', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Could not check the guest out');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Could not check the guest out'));
  }
});
const emptyPage = { data: [], total: 0, current_page: 1, per_page: 10 };

interface BookingState {
  bookings: Paged<Booking>;
  /** What was free the last time somebody asked. Never a reservation. */
  availability: Availability | null;
  halls: null as any,
  opened: Booking | null;
  /** The booking being checked in, room by room. */
  allotment: Allotment | null;

  /** The bill, the money against it, and what is left. */
  folio: any | null;

  /**
   * What checking out would do, for the departure date last asked about.
   *
   * ⚠️ Kept apart from `folio` on purpose. The two carry a field called
   * `balance` that answers different questions -- what has been charged, and
   * what WILL have been charged once the nights are billed. Merging them
   * would let the smaller number be read off the check-out screen.
   */
  checkout: any | null;

  /**
   * What cancelling the booking last asked about would do to its money.
   *
   * ⚠️ Kept apart from `opened` for the same reason `checkout` is kept apart
   * from `folio`: it names an amount held, and an amount held belonging to the
   * previous booking painted under this one's heading is money on the wrong
   * screen.
   */
  cancellation: any | null;

  /**
   * The cash and bank heads money may pass through. Read once per session.
   */
  tills: any[];

  /**
   * Who owes the bill of the booking last asked about, and what it has cost.
   *
   * ⚠️ Kept apart from `folio` even though both are about one booking's money.
   * The folio's `balance` is what the BOOKING owes; this says WHO owes it, and
   * a screen that read one for the other would move a bill onto a company on
   * the strength of a figure that says nothing about who is holding it.
   */
  bill: any | null;

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
  folio: null,
  checkout: null,
  cancellation: null,
  tills: [],
  bill: null,
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
    clearFolio(state) {
      state.folio = null;
    },
    /**
     * Thrown away on the way off the screen.
     *
     * A plan describes one booking on one date. Left behind, the next
     * booking opened would paint somebody else's figures for the moment
     * before its own read came back -- and those figures name money.
     */
    clearCheckout(state) {
      state.checkout = null;
    },
    /**
     * Dropped when the dialog closes, and after the cancellation is done.
     *
     * ⚠️ It carries `amount_held`. Left behind, the next booking's dialog would
     * open showing the previous guest's money for the moment before its own read
     * came back — and the field beside it is one somebody types a refund into.
     */
    clearCancellation(state) {
      state.cancellation = null;
    },
    /**
     * Dropped when the dialog closes.
     *
     * ⚠️ It names a company and an amount owed. Left in the store, the next
     * booking's dialog would open showing the previous one's payer for the
     * moment before its own read came back -- under a button that moves money
     * onto whoever is named.
     */
    clearBill(state) {
      state.bill = null;
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

      .addCase(hallsRead.pending, (state: any) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(hallsRead.fulfilled, (state: any, action: any) => {
        state.loading = false;
        state.halls = action.payload;
      })
      // A property with no sittings, or no halls, answers 404 with a sentence
      // saying which. The grid is dropped so the screen cannot go on offering
      // one the server has just disowned.
      .addCase(hallsRead.rejected, (state: any, action: any) => {
        state.loading = false;
        state.halls = null;
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
      })

      .addCase(folioRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(folioRead.fulfilled, (state, action) => {
        state.loading = false;
        state.folio = action.payload;
      })
      .addCase(folioRead.rejected, (state, action) => {
        state.loading = false;
        state.folio = null;
        state.error = action.payload || null;
      })

      .addCase(checkoutRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkoutRead.fulfilled, (state, action) => {
        state.loading = false;
        state.checkout = action.payload;
      })
      // A refused date -- an overstay, or a day nobody slept -- answers 422
      // with the sentence explaining it. The plan is dropped so the screen
      // cannot go on offering a button for a departure the server refused.
      .addCase(checkoutRead.rejected, (state, action) => {
        state.loading = false;
        state.checkout = null;
        state.error = action.payload || null;
      })

      .addCase(checkoutSave.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(checkoutSave.fulfilled, (state, action) => {
        state.saving = false;
        state.checkout = action.payload?.data ?? state.checkout;
        // The bill and the availability list both changed underneath: nights
        // were billed and beds went back on the market. Whatever is held of
        // either describes the moment before.
        state.folio = null;
        state.availability = null;
      })
      .addCase(checkoutSave.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed';
        // ⚠️ The plan is LEFT ALONE. Every refusal in CheckOutController
        // happens before the transaction, so nothing was written and what is
        // on screen is still true.
      })

      .addCase(billRead.pending, (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(billRead.fulfilled, (state, action) => {
        state.checking = false;
        state.bill = action.payload;
      })
      .addCase(billRead.rejected, (state, action) => {
        state.checking = false;
        state.bill = null;
        state.error = action.payload || null;
      })

      .addCase(billTransfer.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(billTransfer.fulfilled, (state, action) => {
        state.saving = false;
        // Replaced from the server, never patched: who owes it and how much are
        // one answer and must come from one read.
        state.bill = action.payload?.data ?? state.bill;
        // The folio's own copy of the booking now names a different payer.
        state.folio = null;
      })
      .addCase(billTransfer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed';
        // ⚠️ Left standing. Every refusal in BillTransferController happens
        // before the transaction, so nothing moved and what is on screen is
        // still true.
      })

      .addCase(cancellationRead.pending, (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(cancellationRead.fulfilled, (state, action) => {
        state.checking = false;
        state.cancellation = action.payload;
      })
      .addCase(cancellationRead.rejected, (state, action) => {
        state.checking = false;
        state.cancellation = null;
        state.error = action.payload || null;
      })

      // Kept on a failure rather than blanked. The list is the chart of
      // accounts; a network blip should not take the payment form's only
      // dropdown away from somebody mid-receipt.
      .addCase(tillList.fulfilled, (state, action) => {
        state.tills = action.payload || [];
      });

    // The three folio writes, kept in their own loop rather than added to the
    // one below.
    //
    // ⚠️ Not because it reads better: builder.addCase THROWS if the same action
    // type is registered twice, so a thunk may appear in exactly one of these
    // lists. These three answer with the WHOLE folio and replace it; the three
    // below throw the availability list away instead.
    [folioBill, folioCharge, folioReceive].forEach((thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state: any, action: any) => {
          state.saving = false;
          // Replaced from the server, never patched -- see folioRead.
          state.folio = action.payload?.data ?? state.folio;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.saving = false;
          state.error = action.payload || 'Failed';
          // ⚠️ The folio is LEFT ALONE on a rejection. A 409 means nothing was
          // written, so what is on screen is still true -- and blanking it would
          // take the bill away from under a guest standing at the desk.
        });
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
          // ⚠️ The hall grid with it. A sitting just went from free to taken,
          // and a grid still calling it free is one somebody books against.
          state.halls = null;
          // A cancellation just moved money. What the dialog was showing is a
          // statement about a booking that no longer holds anything.
          state.cancellation = null;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.saving = false;
          state.error = action.payload || 'Failed';
          // Especially on a clash: the rooms it listed are provably out of
          // date, because one of them has just been taken by somebody else.
          state.availability = null;
          state.halls = null;
        });
    });
  },
});

export const {
  clearBookings,
  clearAvailability,
  clearOpened,
  clearAllotment,
  clearFolio,
  clearCheckout,
  clearCancellation,
  clearBill,
} =
  bookingSlice.actions;
export default bookingSlice.reducer;

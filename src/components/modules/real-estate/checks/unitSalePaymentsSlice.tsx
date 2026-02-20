import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import httpService from "../../../services/httpService";

/* ================= TYPES ================= */

export type UnitSalePaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "REVERSED";

export type UnitSalePaymentType =
  | "BOOKING"
  | "DOWN_PAYMENT"
  | "INSTALLMENT"
  | "ADJUSTMENT"
  | "PENALTY"
  | "REFUND"
  | "SECURITY_DEPOSIT"
  | "OTHER";

export type UnitSalePaymentMode =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "ROCKET"
  | "UPAY"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "POS_CARD"
  | "MOBILE_BANKING"
  | "OTHERS";

export interface UnitSalePaymentItem {
  id?: number;

  booking_id?: number;
  branch_id?: number;

  status?: UnitSalePaymentStatus;
  payment_type?: UnitSalePaymentType;
  payment_mode?: UnitSalePaymentMode;

  payment_date?: string;
  receipt_no?: string;
  reference_no?: string;

  amount?: number;
  remarks?: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/* ---- Request (backend keys match) ---- */
export interface UnitSalePaymentsListRequest {
  page: number;

  booking_id?: number;
  branch_id?: number;

  status?: UnitSalePaymentStatus;
  payment_type?: UnitSalePaymentType;
  payment_mode?: UnitSalePaymentMode;

  date_from?: string;
  date_to?: string;

  q?: string;
  perPage?: number; // backend expects perPage
  withTrashed?: boolean | string | number; // ✅ allow messy input, normalize in thunk
}

/* ---- Laravel paginator ---- */
export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
  path?: string;
}

/* ---- State ---- */
interface UnitSalePaymentsState {
  rows: UnitSalePaymentItem[];
  paginator: LaravelPaginator<UnitSalePaymentItem> | null;

  loading: boolean;
  error: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: UnitSalePaymentsState = {
  rows: [],
  paginator: null,
  loading: false,
  error: null,
  message: null,
};

/* ================= HELPERS ================= */

const toBool = (v: any): boolean | undefined => {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  return undefined;
};

/* ================= ASYNC THUNK ================= */

export const unitSalePaymentsList = createAsyncThunk<
  { rows: UnitSalePaymentItem[]; paginator: LaravelPaginator<UnitSalePaymentItem> },
  UnitSalePaymentsListRequest,
  { rejectValue: string }
>("unitSalePayments/list", async (params, thunkAPI) => {
  try {
    // ✅ normalize + backend keys keep
    const queryParams: any = {
      ...params,
      page: params.page,
      perPage: params.perPage ?? 20,
    };

    // ✅ boolean normalize (fix: "withTrashed must be true or false")
    if (queryParams.withTrashed !== undefined) {
      queryParams.withTrashed = toBool(queryParams.withTrashed);
      if (queryParams.withTrashed === undefined) delete queryParams.withTrashed;
    }

    // ✅ optional: enforce q max length 100
    if (queryParams.q && String(queryParams.q).length > 100) {
      queryParams.q = String(queryParams.q).slice(0, 100);
    }

    const res: any = await httpService.get(`/real-estate/unit-sale/payments-list`, {
      params: queryParams,
    });

    if (res?.data?.success === true) {
      // ✅ support both shapes:
      // A) { data: paginator }
      // B) { data: { data: paginator } }
      const raw = res?.data?.data;
      const paginator = (raw?.data && raw?.current_page ? raw : raw?.data) as LaravelPaginator<UnitSalePaymentItem>;

      return { rows: paginator?.data ?? [], paginator };
    }

    return thunkAPI.rejectWithValue(
      res?.data?.message || "Failed to fetch unit sale payments"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch unit sale payments"
    );
  }
});

/* ================= SLICE ================= */

const unitSalePaymentsSlice = createSlice({
  name: "unitSalePayments",
  initialState,
  reducers: {
    clearUnitSalePaymentsState(state) {
      state.rows = [];
      state.paginator = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(unitSalePaymentsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        unitSalePaymentsList.fulfilled,
        (
          state,
          action: PayloadAction<{
            rows: UnitSalePaymentItem[];
            paginator: LaravelPaginator<UnitSalePaymentItem>;
          }>
        ) => {
          state.loading = false;
          state.rows = action.payload.rows;
          state.paginator = action.payload.paginator;
        }
      )
      .addCase(unitSalePaymentsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load unit sale payments";
      });
  },
});

/* ================= EXPORT ================= */

export const { clearUnitSalePaymentsState } = unitSalePaymentsSlice.actions;
export default unitSalePaymentsSlice.reducer;
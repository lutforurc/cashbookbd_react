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

  // ✅ additive fields only (safe for production)
  bank_name?: string;
  branch_name?: string;

  cheque_collect_status?: string;
  cheque_deposit_due_date?: string | null;
  cheque_collect_date?: string | null;

  booking?: any; // nested payload support (UI preview/list rendering)

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface UnitSaleDdlItem {
  id?: number | string;
  customer_name?: string;
  unit_label?: string;
  parking_label?: string;
  [key: string]: any;
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

export interface UnitSalePaymentsDdlRequest {
  q?: string;
  page?: number;
  perPage?: number;
  per_page?: number;
}

/* ---- Additive: Edit / Update Requests ---- */
export interface UnitSalePaymentEditRequest {
  id: number | string;
}

export interface UnitSalePaymentUpdateRequest {
  id: number | string;

  booking_id?: number | string;
  branch_id?: number | string;

  status?: UnitSalePaymentStatus | string;
  payment_type?: UnitSalePaymentType | string;
  payment_mode?: UnitSalePaymentMode | string;

  payment_date?: string;
  receipt_no?: string;
  reference_no?: string;

  bank_name?: string;
  branch_name?: string;

  cheque_collect_status?: string;
  cheque_deposit_due_date?: string;
  cheque_collect_date?: string;

  amount?: number | string;
  remarks?: string;

  [key: string]: any; // future-safe
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
  ddlRows: UnitSaleDdlItem[];

  loading: boolean;
  ddlLoading: boolean;
  error: string | null;
  ddlError: string | null;
  message: string | null;
}

/* ================= INITIAL STATE ================= */

const initialState: UnitSalePaymentsState = {
  rows: [],
  paginator: null,
  ddlRows: [],
  loading: false,
  ddlLoading: false,
  error: null,
  ddlError: null,
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

export const unitSalePaymentsDdl = createAsyncThunk<
  { rows: UnitSaleDdlItem[] },
  UnitSalePaymentsDdlRequest | undefined,
  { rejectValue: string }
>("unitSalePayments/ddl", async (params, thunkAPI) => {
  try {
    const parseRows = (res: any): UnitSaleDdlItem[] => {
      const payload = res?.data;
      const raw = payload?.data ?? payload;
      const rowsCandidate =
        raw?.data ??
        raw?.rows ??
        raw?.paginator?.data ??
        payload?.rows ??
        payload?.paginator?.data ??
        raw;
      return Array.isArray(rowsCandidate) ? (rowsCandidate as UnitSaleDdlItem[]) : [];
    };

    let res: any = await httpService.get(`/real-estate/unit-sale/ddl`, {
      params: {
        q: params?.q || undefined,
        page: params?.page ?? 1,
        perPage: params?.perPage ?? 50,
        per_page: params?.per_page ?? (params?.perPage ?? 50),
      },
    });
    let payload = res?.data;
    let rows = parseRows(res);

    if (rows.length === 0) {
      try {
        res = await httpService.get(`/unit-sale/ddl`, {
          params: {
            q: params?.q || undefined,
            page: params?.page ?? 1,
            perPage: params?.perPage ?? 50,
            per_page: params?.per_page ?? (params?.perPage ?? 50),
          },
        });
        payload = res?.data;
        rows = parseRows(res);
      } catch {
        // ignore fallback error
      }
    }

    // Last fallback: derive options from payments-list if ddl endpoint returns empty
    if (rows.length === 0) {
      const listRes: any = await httpService.get(`/real-estate/unit-sale/payments-list`, {
        params: {
          q: params?.q || undefined,
          page: 1,
          perPage: params?.perPage ?? 50,
        },
      });
      const listPayload = listRes?.data;
      const listRaw = listPayload?.data;
      const listRows = (listRaw?.data && listRaw?.current_page ? listRaw?.data : listRaw?.data?.data) || [];

      const seen = new Set<string>();
      rows = (Array.isArray(listRows) ? listRows : [])
        .map((r: any) => {
          const id = r?.booking_id ?? r?.id;
          if (!id) return null;
          return {
            id,
            customer_name:
              r?.customer_name ||
              r?.booking?.customer_name ||
              r?.booking?.payload?.customer?.label,
            unit_label:
              r?.unit_label ||
              r?.booking?.unit_label ||
              r?.booking?.payload?.unit?.label,
            parking_label:
              r?.parking_label ||
              r?.booking?.parking_label ||
              r?.booking?.payload?.parking?.label,
            booking: r?.booking,
          } as UnitSaleDdlItem;
        })
        .filter((r: any) => {
          if (!r?.id) return false;
          const key = String(r.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    if (payload?.success === false && rows.length === 0) {
      return thunkAPI.rejectWithValue(
        payload?.message || "Failed to fetch unit sale list"
      );
    }

    return { rows: rows as UnitSaleDdlItem[] };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch unit sale list"
    );
  }
});

/* ================= ADDITIVE THUNKS: EDIT + UPDATE ================= */

export const unitSalePaymentEdit = createAsyncThunk<
  { row: any; message?: string },
  UnitSalePaymentEditRequest,
  { rejectValue: string }
>("unitSalePayments/edit", async ({ id }, thunkAPI) => {
  try {
    // ✅ If your backend route differs, only change this URL
    const res: any = await httpService.get(`/real-estate/unit-sale/payment-edit/${id}`);

    if (res?.data?.success === true) {
      // Supported shapes:
      // A) { data: row }
      // B) { data: { row: row } }
      // C) { data: { data: row } }
      const raw = res?.data?.data;
      const row = raw?.row ?? raw?.data ?? raw;

      return {
        row: row ?? null,
        message: res?.data?.message,
      };
    }

    return thunkAPI.rejectWithValue(
      res?.data?.message || "Failed to fetch unit sale payment"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch unit sale payment"
    );
  }
});

export const unitSalePaymentUpdate = createAsyncThunk<{ row?: any; data?: any; message?: string }, UnitSalePaymentUpdateRequest, { rejectValue: string }>("unitSalePayments/update", async (payload, thunkAPI) => {
  try {
    // ✅ If your backend route uses /payment-update/{id}, change only the URL
    // Example:
    // const res: any = await httpService.post(`/real-estate/unit-sale/payment-update/${payload.id}`, payload);

    const res: any = await httpService.post(`/real-estate/unit-sale/payment-update`,payload);

    if (res?.data?.success === true) {
      const raw = res?.data?.data;
      return {
        row: raw?.row ?? raw?.data ?? raw,
        data: raw,
        message: res?.data?.message || "Payment updated successfully",
      };
    }

    return thunkAPI.rejectWithValue(
      res?.data?.message || "Failed to update unit sale payment"
    );
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to update unit sale payment"
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
      state.ddlRows = [];
      state.loading = false;
      state.ddlLoading = false;
      state.error = null;
      state.ddlError = null;
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
      })
      .addCase(unitSalePaymentsDdl.pending, (state) => {
        state.ddlLoading = true;
        state.ddlError = null;
      })
      .addCase(unitSalePaymentsDdl.fulfilled, (state, action) => {
        state.ddlLoading = false;
        state.ddlRows = action.payload.rows;
      })
      .addCase(unitSalePaymentsDdl.rejected, (state, action) => {
        state.ddlLoading = false;
        state.ddlError = action.payload || "Failed to load unit sale list";
      });

    // ✅ No extraReducers for edit/update added intentionally
    // (production-safe, avoids touching current list state behavior)
  },
});

/* ================= EXPORT ================= */

export const { clearUnitSalePaymentsState } = unitSalePaymentsSlice.actions;
export default unitSalePaymentsSlice.reducer;

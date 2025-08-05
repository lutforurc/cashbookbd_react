import httpService from "../../../services/httpService";
import {
  API_CONSTRUCTION_LABOUR_EDIT_URL,
  API_CONSTRUCTION_LABOUR_STORE_URL,
  API_CONSTRUCTION_LABOUR_UPDATE_URL,
} from "../../../services/apiRoutes";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Interfaces
interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
}

interface FormData {
  account: string;
  accountName: string;
  invoice_no: string;
  invoice_date: string;
  paymentAmt: string;
  notes: string;
  products: Product[];
}

interface LabourInvoiceState {
  loading: boolean;
  storeLabourInvoice: any[];
  editLabourInvoice: any | null;
  updateLabourInvoice: any | null;
  error: string | null;
  isSave: boolean;
  isEdit: boolean;
  isUpdated: boolean;
}

// Async Thunks
export const labourInvoiceStore = createAsyncThunk("labourInvoiceStore/fetch",async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_CONSTRUCTION_LABOUR_STORE_URL, formData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

export const labourInvoiceEdit = createAsyncThunk("labourInvoiceEdit/fetch",async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_CONSTRUCTION_LABOUR_EDIT_URL, formData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);
export const labourInvoiceUpdate = createAsyncThunk("labourInvoiceUpdate/fetch",async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await httpService.post(API_CONSTRUCTION_LABOUR_UPDATE_URL, formData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: "Something went wrong!" });
    }
  }
);

// Initial State
const initialState: LabourInvoiceState = {
  loading: false,
  storeLabourInvoice: [],
  editLabourInvoice: null,
  updateLabourInvoice: null,
  error: null,
  isSave: false,
  isEdit: false,
  isUpdated: false,
};

// Slice
const labourInvoiceSlice = createSlice({
  name: "labourInvoiceProperties",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setIsEdit: (state, action: PayloadAction<boolean>) => {
      state.isEdit = action.payload;
    },
    setIsSave: (state, action: PayloadAction<boolean>) => {
      state.isSave = action.payload;
    },
    setIsUpdated: (state, action: PayloadAction<boolean>) => {
      state.isUpdated = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Store Labour Invoice
      .addCase(labourInvoiceStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(labourInvoiceStore.fulfilled, (state, action) => {
        state.loading = false;
        state.isSave = true;
        state.storeLabourInvoice = action.payload;
      })
      .addCase(labourInvoiceStore.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || "Failed to store data!";
      })

      // Edit Labour Invoice
      .addCase(labourInvoiceEdit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(labourInvoiceEdit.fulfilled, (state, action) => {
        state.loading = false;
        state.isEdit = true;
        state.editLabourInvoice = action.payload;
      })
      .addCase(labourInvoiceEdit.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || "Failed to edit data!";
      })

      // Update Labour Invoice
      .addCase(labourInvoiceUpdate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(labourInvoiceUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.isUpdated = true;
        state.updateLabourInvoice = action.payload;
      })
      .addCase(labourInvoiceUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || "Failed to edit data!";
      });
  },
});

// Export actions and reducer
export const { setLoading, setIsEdit, setIsSave, setIsUpdated, clearError } =
  labourInvoiceSlice.actions;

export default labourInvoiceSlice.reducer;

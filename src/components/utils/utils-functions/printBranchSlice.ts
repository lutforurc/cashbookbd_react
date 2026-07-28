import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Which branch the screen currently on show is reporting on.
 *
 * Reports keep their selected branch in their own local state, so the shared
 * print pad had no way to know it and always printed the logged-in user's
 * branch. BranchDropdown — the one control every report selects a branch with —
 * publishes the selection here, and the pad reads it. That fixes the header for
 * every report at once instead of one report at a time.
 *
 * Cleared when the dropdown unmounts, so a screen without a branch selector
 * falls back to the session branch rather than inheriting the last screen's.
 */
type PrintBranchState = {
  branchId: string | number | null;
};

const initialState: PrintBranchState = {
  branchId: null,
};

const printBranchSlice = createSlice({
  name: 'printBranch',
  initialState,
  reducers: {
    setPrintBranchId(state, action: PayloadAction<string | number | null>) {
      const value = action.payload;
      // An empty selection ("All Branches") is not a branch — treat it as none.
      state.branchId = value === '' || value === undefined ? null : value;
    },
    clearPrintBranch(state) {
      state.branchId = null;
    },
  },
});

export const { setPrintBranchId, clearPrintBranch } = printBranchSlice.actions;
export default printBranchSlice.reducer;

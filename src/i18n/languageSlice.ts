import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import i18next from 'i18next';
import httpService from '../components/services/httpService';
import { API_USER_LANGUAGE_URL } from '../components/services/apiRoutes';
import type { LangChoice } from './languages';

/**
 * The user's own choice for this session.
 *
 * `undefined` means "not chosen here" -- the hook falls back to what the
 * server says (`users.lang`, then the branch default). Once the user clicks a
 * pill the choice is applied at once (optimistic) and saved in the background;
 * a failed save puts the previous choice back and says so.
 */
interface LanguageState {
  choice: LangChoice;
  previousChoice: LangChoice;
  saving: boolean;
  error: string | null;
}

const initialState: LanguageState = {
  choice: undefined,
  previousChoice: undefined,
  saving: false,
  error: null,
};

export const saveLanguage = createAsyncThunk<
  { lang: 'en' | 'local' },
  'en' | 'local',
  { state: any; rejectValue: string }
>('language/saveLanguage', async (choice, thunkAPI) => {
  try {
    const response = await httpService.post(API_USER_LANGUAGE_URL, { lang: choice });
    const body = response?.data;

    if (body?.success) {
      const saved = body?.data?.data?.lang;

      return { lang: saved === 'local' ? 'local' : 'en' };
    }

    throw new Error(body?.error?.message || i18next.t('language.saveFailed'));
  } catch (error: any) {
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      i18next.t('language.saveFailed');

    // The response interceptor has already shown network/403 refusals.
    if (!error?.toastReported) {
      toast.error(message);
    }

    return thunkAPI.rejectWithValue(message);
  }
});

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(saveLanguage.pending, (state, action) => {
        state.previousChoice = state.choice;
        state.choice = action.meta.arg;
        state.saving = true;
        state.error = null;
      })
      .addCase(saveLanguage.fulfilled, (state, action) => {
        state.choice = action.payload.lang;
        state.saving = false;
      })
      .addCase(saveLanguage.rejected, (state, action) => {
        state.choice = state.previousChoice;
        state.saving = false;
        state.error = action.payload ?? i18next.t('language.saveFailed');
      });
  },
});

export default languageSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import httpService from '../../services/httpService';
import {
  API_HOTEL_BUILDING_URL,
  API_HOTEL_FLOOR_URL,
  API_HOTEL_LAYOUT_URL,
  API_HOTEL_RESOURCE_URL,
  API_HOTEL_ROOM_TYPE_URL,
  API_HOTEL_SLOT_URL,
} from '../../services/apiRoutes';
import {
  DdlOption,
  HotelBuilding,
  HotelFloor,
  HotelResource,
  HotelRoomType,
  HotelTimes,
  LayoutBuilding,
  Paged,
  ResourceKind,
  HotelSlot,
} from './types';

/**
 * The four hotel master tables behind one slice.
 *
 * One rather than four because they are one screen: the setup page opens on
 * buildings and the other three tabs are steps of the same sitting. Four slices
 * would have meant four copies of the same six thunks, and the day a room is
 * saved the buildings list has to be told to refresh anyway.
 *
 * Every thunk unwraps the { success, message, data: { data } } envelope the API
 * helpers build, and rejects with the server's own message. The message matters
 * here more than usual -- "This building holds 12 rooms, set it inactive
 * instead" is the answer, not a failure to be replaced with "delete failed".
 */

/** Pull the payload out of the envelope, whatever depth it arrived at. */
const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

/** The server's own words, or a fallback. Never swallow the former. */
const said = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

/** A GET that returns a page of rows. */
const listThunk = <T,>(name: string, url: string) =>
  createAsyncThunk<Paged<T>, Record<string, any> | undefined, { rejectValue: string }>(
    `hotelSetup/${name}`,
    async (params, { rejectWithValue }) => {
      try {
        const res = await httpService.get(url, { params });
        if (res.data?.success === true) return unwrap(res);
        return rejectWithValue(res.data?.message || `Failed to load ${name}`);
      } catch (error: any) {
        return rejectWithValue(said(error, `Failed to load ${name}`));
      }
    },
  );

/** A GET that returns dropdown options. */
const ddlThunk = (name: string, url: string) =>
  createAsyncThunk<DdlOption[], Record<string, any> | undefined, { rejectValue: string }>(
    `hotelSetup/${name}`,
    async (params, { rejectWithValue }) => {
      try {
        const res = await httpService.get(url, { params });
        if (res.data?.success === true) return unwrap(res) || [];
        return rejectWithValue(res.data?.message || `Failed to load ${name}`);
      } catch (error: any) {
        return rejectWithValue(said(error, `Failed to load ${name}`));
      }
    },
  );

/**
 * A POST that saves one row.
 *
 * Resolves with { message, data } rather than the row alone, because the room
 * type save answers with a sentence the screen has to show -- that the rooms
 * already of that type kept their own rent. Throwing that away would leave the
 * user believing an edit did something it deliberately did not.
 */
const saveThunk = <T,>(name: string, url: (payload: any) => string) =>
  createAsyncThunk<{ message: string; data: T }, any, { rejectValue: string }>(
    `hotelSetup/${name}`,
    async (payload, { rejectWithValue }) => {
      try {
        const res = await httpService.post(url(payload), payload);
        if (res.data?.success === true) {
          return { message: res.data?.message || 'Saved successfully', data: unwrap(res) };
        }
        return rejectWithValue(res.data?.message || 'Save failed');
      } catch (error: any) {
        return rejectWithValue(said(error, 'Save failed'));
      }
    },
  );

const deleteThunk = (name: string, url: string) =>
  createAsyncThunk<{ id: number; message: string }, number, { rejectValue: string }>(
    `hotelSetup/${name}`,
    async (id, { rejectWithValue }) => {
      try {
        const res = await httpService.post(`${url}/delete/${id}`);
        if (res.data?.success === true) {
          return { id, message: res.data?.message || 'Deleted successfully' };
        }
        return rejectWithValue(res.data?.message || 'Delete failed');
      } catch (error: any) {
        return rejectWithValue(said(error, 'Delete failed'));
      }
    },
  );

/* ================= Buildings ================= */

export const buildingList = listThunk<HotelBuilding>('buildingList', API_HOTEL_BUILDING_URL);
export const buildingDdl = ddlThunk('buildingDdl', `${API_HOTEL_BUILDING_URL}/ddl`);
export const buildingSave = saveThunk<HotelBuilding>('buildingSave', (p) =>
  p?.id ? `${API_HOTEL_BUILDING_URL}/update/${p.id}` : `${API_HOTEL_BUILDING_URL}/store`,
);
export const buildingDelete = deleteThunk('buildingDelete', API_HOTEL_BUILDING_URL);

/* ================= Floors ================= */

export const floorList = listThunk<HotelFloor>('floorList', API_HOTEL_FLOOR_URL);
export const floorDdl = ddlThunk('floorDdl', `${API_HOTEL_FLOOR_URL}/ddl`);
export const floorSave = saveThunk<HotelFloor>('floorSave', (p) =>
  p?.id ? `${API_HOTEL_FLOOR_URL}/update/${p.id}` : `${API_HOTEL_FLOOR_URL}/store`,
);
export const floorDelete = deleteThunk('floorDelete', API_HOTEL_FLOOR_URL);

/* ================= Slots -- how a hall is sold ================= */

export const slotList = listThunk<HotelSlot>('slotList', API_HOTEL_SLOT_URL);
export const slotDdl = ddlThunk('slotDdl', `${API_HOTEL_SLOT_URL}/ddl`);
export const slotSave = saveThunk<HotelSlot>('slotSave', (p) =>
  p?.id ? `${API_HOTEL_SLOT_URL}/update/${p.id}` : `${API_HOTEL_SLOT_URL}/store`,
);
export const slotDelete = deleteThunk('slotDelete', API_HOTEL_SLOT_URL);

/* ================= Room types ================= */

export const roomTypeList = listThunk<HotelRoomType>('roomTypeList', API_HOTEL_ROOM_TYPE_URL);
export const roomTypeDdl = ddlThunk('roomTypeDdl', `${API_HOTEL_ROOM_TYPE_URL}/ddl`);
export const roomTypeSave = saveThunk<HotelRoomType>('roomTypeSave', (p) =>
  p?.id ? `${API_HOTEL_ROOM_TYPE_URL}/update/${p.id}` : `${API_HOTEL_ROOM_TYPE_URL}/store`,
);
export const roomTypeDelete = deleteThunk('roomTypeDelete', API_HOTEL_ROOM_TYPE_URL);

/* ================= Rooms, and the seats inside them ================= */

export const resourceList = listThunk<HotelResource>('resourceList', API_HOTEL_RESOURCE_URL);
export const resourceSave = saveThunk<HotelResource>('resourceSave', (p) =>
  p?.id ? `${API_HOTEL_RESOURCE_URL}/update/${p.id}` : `${API_HOTEL_RESOURCE_URL}/store`,
);
export const resourceDelete = deleteThunk('resourceDelete', API_HOTEL_RESOURCE_URL);

/**
 * A floor's worth of rooms at once.
 *
 * The same form as resourceSave with a run of numbers in place of one, so it
 * goes through the same saveThunk -- and answers with what it made rather than
 * with a row, because there is no single row to hand back.
 *
 * It creates all of them or none: a number already taken refuses the whole run
 * rather than quietly skipping it, so the answer never has to be reconciled
 * against what was asked for.
 */
export const resourceBulkSave = saveThunk<{ created: number; codes: string[] }>(
  'resourceBulkSave',
  () => `${API_HOTEL_RESOURCE_URL}/bulk-store`,
);

/** The kinds a resource may be. The seat is absent -- it is made by splitting. */
export const resourceKinds = createAsyncThunk<ResourceKind[], void, { rejectValue: string }>(
  'hotelSetup/resourceKinds',
  async (_, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_RESOURCE_URL}/types`);
      if (res.data?.success === true) return unwrap(res) || [];
      return rejectWithValue(res.data?.message || 'Failed to load resource kinds');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Failed to load resource kinds'));
    }
  },
);

/**
 * The whole property at once, for the elevation grid.
 *
 * Its own endpoint rather than the paginated list: a floor plan cannot be read
 * ten rooms at a time. It answers with a summary of each room's beds; clicking
 * a room fetches the beds themselves through resourceEdit, which already
 * returns them.
 */
export const layoutRead = createAsyncThunk<
  { buildings: LayoutBuilding[]; times?: HotelTimes },
  Record<string, any> | undefined,
  { rejectValue: string }
>('hotelSetup/layoutRead', async (params, { rejectWithValue }) => {
  try {
    const res = await httpService.get(API_HOTEL_LAYOUT_URL, { params });
    if (res.data?.success === true) return unwrap(res) || { buildings: [] };
    return rejectWithValue(res.data?.message || 'Failed to load the layout');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Failed to load the layout'));
  }
});

/** One room and the beds inside it, for the edit form. */
export const resourceEdit = createAsyncThunk<HotelResource, number, { rejectValue: string }>(
  'hotelSetup/resourceEdit',
  async (id, { rejectWithValue }) => {
    try {
      const res = await httpService.get(`${API_HOTEL_RESOURCE_URL}/edit/${id}`);
      if (res.data?.success === true) return unwrap(res);
      return rejectWithValue(res.data?.message || 'Failed to load room');
    } catch (error: any) {
      return rejectWithValue(said(error, 'Failed to load room'));
    }
  },
);

/**
 * One bed, priced on its own.
 *
 * The room form's seat rent is what a NEW bed starts at. This is how the window
 * bed comes to cost more than the rest of the dormitory, and the room form
 * never overwrites what is set here.
 */
export const seatSave = createAsyncThunk<
  { message: string; data: HotelResource },
  { id: number } & Partial<HotelResource>,
  { rejectValue: string }
>('hotelSetup/seatSave', async (payload, { rejectWithValue }) => {
  try {
    const res = await httpService.post(`${API_HOTEL_RESOURCE_URL}/seats/update/${payload.id}`, payload);
    if (res.data?.success === true) {
      return { message: res.data?.message || 'Seat updated', data: unwrap(res) };
    }
    return rejectWithValue(res.data?.message || 'Seat update failed');
  } catch (error: any) {
    return rejectWithValue(said(error, 'Seat update failed'));
  }
});

/* ================= State ================= */

const emptyPage = { data: [], total: 0, current_page: 1, per_page: 10 };

interface HotelSetupState {
  buildings: Paged<HotelBuilding>;
  floors: Paged<HotelFloor>;
  roomTypes: Paged<HotelRoomType>;
  slots: Paged<HotelSlot>;
  resources: Paged<HotelResource>;

  buildingOptions: DdlOption[];
  floorOptions: DdlOption[];
  roomTypeOptions: DdlOption[];
  slotOptions: DdlOption[];
  kinds: ResourceKind[];

  /** The elevation grid's own copy -- the whole property, not a page of it. */
  layout: LayoutBuilding[];
  layoutLoading: boolean;
  /**
   * When the day turns over at this property.
   *
   * Kept beside the layout because it arrives with it, and shown ON the layout
   * because the gap between the two times is what keeps a turnover day from
   * selling the same room twice. A number that decides that should not live
   * only in a settings screen nobody opens.
   */
  times: HotelTimes | null;

  editingResource: HotelResource | null;

  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: HotelSetupState = {
  buildings: { ...emptyPage },
  floors: { ...emptyPage },
  roomTypes: { ...emptyPage },
  slots: { ...emptyPage },
  resources: { ...emptyPage },

  buildingOptions: [],
  floorOptions: [],
  roomTypeOptions: [],
  slotOptions: [],
  kinds: [],

  layout: [],
  layoutLoading: false,
  times: null,

  editingResource: null,

  loading: false,
  saving: false,
  error: null,
};

const hotelSetupSlice = createSlice({
  name: 'hotelSetup',
  initialState,
  reducers: {
    clearHotelSetup() {
      return { ...initialState };
    },
    /** Emptied when the building changes, so a stale floor cannot be chosen. */
    clearFloorOptions(state) {
      state.floorOptions = [];
    },
    clearEditingResource(state) {
      state.editingResource = null;
    },
  },
  extraReducers: (builder) => {
    const page = (key: 'buildings' | 'floors' | 'roomTypes' | 'resources', thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state: any, action: any) => {
          state.loading = false;
          state[key] = action.payload || { ...emptyPage };
        })
        // A list that comes back empty answers 404 with a message, which axios
        // throws. Emptying the table is the right thing to show for it -- the
        // alternative was the previous tab's rows sitting under a new heading.
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.loading = false;
          state[key] = { ...emptyPage };
          state.error = action.payload || null;
        });
    };

    const options = (key: 'buildingOptions' | 'floorOptions' | 'roomTypeOptions', thunk: any) => {
      builder
        .addCase(thunk.fulfilled, (state: any, action: any) => {
          state[key] = action.payload || [];
        })
        .addCase(thunk.rejected, (state: any) => {
          state[key] = [];
        });
    };

    const save = (thunk: any) => {
      builder
        .addCase(thunk.pending, (state: any) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state: any) => {
          state.saving = false;
        })
        .addCase(thunk.rejected, (state: any, action: any) => {
          state.saving = false;
          state.error = action.payload || 'Save failed';
        });
    };

    page('buildings', buildingList);
    page('floors', floorList);
    page('roomTypes', roomTypeList);
    page('slots', slotList);
    page('resources', resourceList);

    options('buildingOptions', buildingDdl);
    options('floorOptions', floorDdl);
    options('roomTypeOptions', roomTypeDdl);
    options('slotOptions', slotDdl);

    save(buildingSave);
    save(floorSave);
    save(roomTypeSave);
    save(slotSave);
    save(resourceSave);
    save(resourceBulkSave);
    save(seatSave);

    builder
      .addCase(layoutRead.pending, (state) => {
        state.layoutLoading = true;
        state.error = null;
      })
      .addCase(layoutRead.fulfilled, (state, action) => {
        state.layoutLoading = false;
        state.layout = action.payload?.buildings ?? [];
        state.times = action.payload?.times ?? null;
      })
      // A property with no buildings answers 404 with a sentence, which axios
      // throws. An empty grid is the right thing to draw for it -- the tab says
      // so in words rather than showing a failure.
      .addCase(layoutRead.rejected, (state, action) => {
        state.layoutLoading = false;
        state.layout = [];
        state.error = action.payload || null;
      })
      .addCase(resourceKinds.fulfilled, (state, action) => {
        state.kinds = action.payload || [];
      })
      .addCase(resourceEdit.fulfilled, (state, action) => {
        state.editingResource = action.payload;
      })
      .addCase(resourceEdit.rejected, (state, action) => {
        state.editingResource = null;
        state.error = action.payload || 'Failed to load room';
      });
  },
});

export const { clearHotelSetup, clearFloorOptions, clearEditingResource } = hotelSetupSlice.actions;
export default hotelSetupSlice.reducer;

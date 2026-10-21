import httpService from '../../services/httpService';
import {
  API_DELIVERY_PENDING_URL,
  API_DELIVERY_STORE_URL,
  API_DELIVERY_EDIT_URL,
  API_DELIVERY_CANCEL_URL,
  API_DELIVERY_LIST_URL,
} from '../../services/apiRoutes';

/**
 * The delivery screen's slice -- stock-deducts-on-delivery for Tiles and
 * Sanitary. Plain redux with thunks, like the invoice slices beside it.
 */

export const DELIVERY_PENDING = 'DELIVERY_PENDING';
export const DELIVERY_LOADED = 'DELIVERY_LOADED';
export const DELIVERY_LIST_LOADED = 'DELIVERY_LIST_LOADED';
export const DELIVERY_SAVED = 'DELIVERY_SAVED';
export const DELIVERY_ERROR = 'DELIVERY_ERROR';

/** What is still to deliver on an invoice, line by line. */
export const deliveryLoadPending = (
  data: { mtmId: string },
  callback?: (message: string, pending?: any) => void,
) => (dispatch: any) => {
  dispatch({ type: DELIVERY_PENDING });
  httpService
    .post(API_DELIVERY_PENDING_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({ type: DELIVERY_LOADED, payload: _data.data.data });
        if (typeof callback === 'function') callback('', _data.data.data);
      } else {
        dispatch({ type: DELIVERY_ERROR, payload: _data.message });
        if (typeof callback === 'function') callback(_data.message);
      }
    })
    .catch((err) => {
      dispatch({ type: DELIVERY_ERROR, payload: err.message });
      if (typeof callback === 'function') callback(err.message);
    });
};

export const deliveryStore = (
  data: any,
  callback?: (message: string, saved?: any, response?: any) => void,
) => (dispatch: any) => {
  dispatch({ type: DELIVERY_PENDING });
  httpService
    .post(API_DELIVERY_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({ type: DELIVERY_SAVED, payload: _data.data.data });
        if (typeof callback === 'function') callback(_data.message, _data.data.data);
      } else {
        dispatch({ type: DELIVERY_ERROR, payload: _data.message });
        // The whole body too: a stock shortage carries its rows and whether
        // the branch blocks, and the screen needs both to put the question.
        if (typeof callback === 'function') callback(_data.message, undefined, _data);
      }
    })
    .catch((err) => {
      dispatch({ type: DELIVERY_ERROR, payload: err.message });
      if (typeof callback === 'function') callback(err.message);
    });
};

export const deliveryEdit = (data: { id: string }, callback?: (message: string, delivery?: any) => void) => (dispatch: any) => {
  dispatch({ type: DELIVERY_PENDING });
  httpService
    .post(API_DELIVERY_EDIT_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({ type: DELIVERY_SAVED, payload: _data.data.data });
        if (typeof callback === 'function') callback('', _data.data.data);
      } else {
        dispatch({ type: DELIVERY_ERROR, payload: _data.message });
        if (typeof callback === 'function') callback(_data.message);
      }
    })
    .catch((err) => {
      dispatch({ type: DELIVERY_ERROR, payload: err.message });
      if (typeof callback === 'function') callback(err.message);
    });
};

export const deliveryList = (data: any, callback?: (message: string, list?: any) => void) => (dispatch: any) => {
  dispatch({ type: DELIVERY_PENDING });
  httpService
    .post(API_DELIVERY_LIST_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({ type: DELIVERY_LIST_LOADED, payload: _data.data.data });
        if (typeof callback === 'function') callback('', _data.data.data);
      } else {
        dispatch({ type: DELIVERY_ERROR, payload: _data.message });
        if (typeof callback === 'function') callback(_data.message);
      }
    })
    .catch((err) => {
      dispatch({ type: DELIVERY_ERROR, payload: err.message });
      if (typeof callback === 'function') callback(err.message);
    });
};

export const deliveryCancel = (data: { id: string }, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: DELIVERY_PENDING });
  httpService
    .post(API_DELIVERY_CANCEL_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({ type: DELIVERY_SAVED, payload: {} });
        // '' on success, as list and edit do: the screen reads any message as a
        // failure, and "Delivery cancelled." came up as a red error.
        if (typeof callback === 'function') callback('');
      } else {
        dispatch({ type: DELIVERY_ERROR, payload: _data.message });
        if (typeof callback === 'function') callback(_data.message);
      }
    })
    .catch((err) => {
      dispatch({ type: DELIVERY_ERROR, payload: err.message });
      if (typeof callback === 'function') callback(err.message);
    });
};

const initialState = {
  isLoading: false,
  isSaved: false,
  pending: null,
  delivery: null,
  list: [],
  errors: null,
};

const deliverySlice = (state = initialState, action: any) => {
  switch (action.type) {
    case DELIVERY_PENDING:
      return { ...state, isLoading: true, isSaved: false, errors: null };

    case DELIVERY_LOADED:
      return { ...state, isLoading: false, pending: action.payload, errors: null };

    case DELIVERY_LIST_LOADED:
      return { ...state, isLoading: false, list: action.payload, errors: null };

    case DELIVERY_SAVED:
      return { ...state, isLoading: false, isSaved: true, delivery: action.payload, errors: null };

    case DELIVERY_ERROR:
      return { ...state, isLoading: false, isSaved: false, errors: action.payload };

    default:
      return state;
  }
};

export default deliverySlice;

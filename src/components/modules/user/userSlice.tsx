import {
  USER_EDIT_ERROR,
  USER_EDIT_PENDING,
  USER_EDIT_SUCCESS,
  USER_LIST_ERROR,
  USER_LIST_PENDING,
  USER_LIST_SUCCESS,
  USER_STORE_ERROR,
  USER_STORE_PENDING,
  USER_STORE_SUCCESS,
  USER_UPDATE_ERROR,
  USER_UPDATE_PENDING,
  USER_UPDATE_SUCCESS,
} from '../../constant/constant/constant';

import {
  API_USER_EDIT_URL,
  API_USER_LIST_URL,
  API_USER_STORE_URL,
  API_USER_UPDATE_URL,

  // ✅ ADD these in apiRoutes
  // e.g. export const API_PROFILE_PHOTO_URL = '/api/profile/photo';
  // e.g. export const API_PROFILE_COVER_URL = '/api/profile/cover';
  API_PROFILE_PHOTO_URL,
  API_PROFILE_COVER_URL,
} from '../../services/apiRoutes';

import httpService from '../../services/httpService';

/** ✅ NEW: Upload action types (এখানেই add করলাম যাতে পুরোনো constants ফাইল না ভাঙে) */
export const USER_PHOTO_UPLOAD_PENDING = 'USER_PHOTO_UPLOAD_PENDING';
export const USER_PHOTO_UPLOAD_SUCCESS = 'USER_PHOTO_UPLOAD_SUCCESS';
export const USER_PHOTO_UPLOAD_ERROR = 'USER_PHOTO_UPLOAD_ERROR';

export const USER_COVER_UPLOAD_PENDING = 'USER_COVER_UPLOAD_PENDING';
export const USER_COVER_UPLOAD_SUCCESS = 'USER_COVER_UPLOAD_SUCCESS';
export const USER_COVER_UPLOAD_ERROR = 'USER_COVER_UPLOAD_ERROR';

interface userListParam {
  page: number;
  perPage: number;
  search: string;
}

export const getUser =
  ({ page, perPage, search = '' }: userListParam) =>
  (dispatch: any) => {
    dispatch({ type: USER_LIST_PENDING });
    httpService.get(API_USER_LIST_URL + `?page=${page}&per_page=${perPage}&search=${search}`)
      .then((res) => {
        let _data = res.data;
        if (_data.success) {
          dispatch({
            type: USER_LIST_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: USER_LIST_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch((err) => {
        dispatch({
          type: USER_LIST_ERROR,
          payload: 'Something went wrong',
        });
      });
  };

export const editUser = (id: number) => (dispatch: any) => {
  dispatch({ type: USER_EDIT_PENDING });
  httpService.get(API_USER_EDIT_URL + `${id}`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_EDIT_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: USER_EDIT_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: USER_EDIT_ERROR,
        payload: 'Something went wrong',
      });
    });
};

export const updateUser = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: USER_UPDATE_PENDING });
  httpService.post(API_USER_UPDATE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_UPDATE_SUCCESS,
          payload: _data.message,
        });
      } else {
        dispatch({
          type: USER_UPDATE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((err) => {
      dispatch({
        type: USER_UPDATE_ERROR,
        payload: err,
      });
    });
};

export const storeUser = (data: any, callback: any) => (dispatch: any) => {
  dispatch({ type: USER_STORE_PENDING });
  httpService
    .post(API_USER_STORE_URL, data)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: USER_STORE_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: USER_STORE_ERROR,
          payload: _data.error.message,
        });
      }
      if ('function' === typeof callback) {
        callback(_data);
      }
    })
    .catch((er) => {
      dispatch({
        type: USER_STORE_ERROR,
        payload: 'Something went wrong.',
      });
    });
};

/* ============================================================
   ✅ NEW: Profile Photo upload (FormData -> API)
   ============================================================ */
export const uploadUserPhoto = (file: File, callback?: any) => (dispatch: any) => {
  dispatch({ type: USER_PHOTO_UPLOAD_PENDING });

  const formData = new FormData();
  formData.append('image', file);

  httpService.post(API_PROFILE_PHOTO_URL, formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    })
    .then((res) => {
      const _data = res.data;
      if (_data?.success) {
        dispatch({
          type: USER_PHOTO_UPLOAD_SUCCESS,
          payload: _data?.url || _data?.data?.url || _data?.data?.photo_url || null,
        });
      } else {
        dispatch({
          type: USER_PHOTO_UPLOAD_ERROR,
          payload: _data?.error?.message || 'Upload failed',
        });
      }
      if ('function' === typeof callback) callback(_data);
    })
    .catch((err) => {
      dispatch({
        type: USER_PHOTO_UPLOAD_ERROR,
        payload: err?.response?.data?.message || 'Something went wrong',
      });

      if ('function' === typeof callback) callback({ success: false, error: err });
    });
};

/* ============================================================
   ✅ NEW: Cover upload (FormData -> API)
   ============================================================ */
export const uploadUserCover = (file: File, callback?: any) => (dispatch: any) => {
  dispatch({ type: USER_COVER_UPLOAD_PENDING });

  const formData = new FormData();
  formData.append('image', file);

  httpService.post(API_PROFILE_COVER_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => {
      const _data = res.data;

      if (_data?.success) {
        dispatch({
          type: USER_COVER_UPLOAD_SUCCESS,
          payload: _data?.url || _data?.data?.url || _data?.data?.cover_url || null,
        });
      } else {
        dispatch({
          type: USER_COVER_UPLOAD_ERROR,
          payload: _data?.error?.message || 'Upload failed',
        });
      }

      if ('function' === typeof callback) callback(_data);
    })
    .catch((err) => {
      dispatch({
        type: USER_COVER_UPLOAD_ERROR,
        payload: err?.response?.data?.message || 'Something went wrong',
      });

      if ('function' === typeof callback) callback({ success: false, error: err });
    });
};

const initialState: any = {
  isLoading: false,
  errors: null,
  data: {},
  editData: {},

  // ✅ NEW state (existing untouched)
  uploadLoading: false,
  isPhotoUpdated: false,
  isCoverUpdated: false,
  photoUrl: null,
  coverUrl: null,
};

const userReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case USER_UPDATE_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case USER_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case USER_LIST_PENDING:
    case USER_EDIT_PENDING:
      return {
        ...state,
        isLoading: true,
        isUpdate: false,
      };

    case USER_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        errors: {},
      };

    case USER_UPDATE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isUpdate: true,
        updateData: action.payload,
      };

    case USER_EDIT_SUCCESS:
      return {
        ...state,
        isLoading: false,
        editData: action.payload,
      };

    case USER_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case USER_UPDATE_ERROR:
      return {
        ...state,
        isLoading: false,
        isUpdate: false,
        errors: action.payload,
      };

    case USER_STORE_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };

    case USER_LIST_ERROR:
    case USER_EDIT_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };

    /* =========================
       ✅ NEW reducer cases
       ========================= */
    case USER_PHOTO_UPLOAD_PENDING:
    case USER_COVER_UPLOAD_PENDING:
      return {
        ...state,
        uploadLoading: true,
        errors: null,
        isPhotoUpdated: false,
        isCoverUpdated: false,
      };

    case USER_PHOTO_UPLOAD_SUCCESS:
      return {
        ...state,
        uploadLoading: false,
        isPhotoUpdated: true,
        photoUrl: action.payload,
      };

    case USER_COVER_UPLOAD_SUCCESS:
      return {
        ...state,
        uploadLoading: false,
        isCoverUpdated: true,
        coverUrl: action.payload,
      };

    case USER_PHOTO_UPLOAD_ERROR:
    case USER_COVER_UPLOAD_ERROR:
      return {
        ...state,
        uploadLoading: false,
        errors: action.payload,
        isPhotoUpdated: false,
        isCoverUpdated: false,
      };

    default:
      return state;
  }
};

export default userReducer;

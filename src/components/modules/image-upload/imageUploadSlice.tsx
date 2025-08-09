import {
  BULK_IMAGE_UPLOAD_ERROR,
  BULK_IMAGE_UPLOAD_PENDING,
  BULK_IMAGE_UPLOAD_SUCCESS,
  GET_VOUCHER_FOR_IMAGE_LIST_ERROR,
  GET_VOUCHER_FOR_IMAGE_LIST_PENDING,
  GET_VOUCHER_FOR_IMAGE_LIST_SUCCESS,
  IMAGE_UPLOAD_ERROR,
  IMAGE_UPLOAD_PENDING,
  IMAGE_UPLOAD_SUCCESS,
} from '../../constant/constant/constant';
import {
  API_BULK_IMAGE_UPLOAD_URL,
  API_IMAGE_UPLOAD_URL,
  API_VOUCHER_IMAGE_FOR_UPLOAD_URL,
} from '../../services/apiRoutes';
import httpService from '../../services/httpService';

interface voucherParam {
  branchId: number;
  startDate: string;
  endDate: string;
}

export const uploadImage =
  (data: any, id: number, callback?: (message: string) => void) =>
  (dispatch: any) => {
    dispatch({ type: IMAGE_UPLOAD_PENDING });
    httpService
      .post(`${API_IMAGE_UPLOAD_URL}${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => {
        const _data = res.data;
        if (_data.success) {
          dispatch({
            type: IMAGE_UPLOAD_SUCCESS,
            payload: _data.data.data,
          });
          if ('function' == typeof callback) {
            callback(_data.data.data.current_date);
          }
        } else {
          dispatch({
            type: IMAGE_UPLOAD_ERROR,
            payload: _data.error.message,
          });
          if ('function' == typeof callback) {
            callback(_data.message);
          }
        }
      })
      .catch((err) => {
        dispatch({
          type: IMAGE_UPLOAD_ERROR,
          payload: 'Something went wrong.',
        });
        if ('function' == typeof callback) {
          callback(err.message);
        }
      });
  };

export const getVoucherForImage = (data: any) => (dispatch: any) => {
  dispatch({ type: GET_VOUCHER_FOR_IMAGE_LIST_PENDING });

  const url = `${API_VOUCHER_IMAGE_FOR_UPLOAD_URL}`; // adjust if needed

  httpService
    .post(url, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: GET_VOUCHER_FOR_IMAGE_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: GET_VOUCHER_FOR_IMAGE_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch(() => {
      dispatch({
        type: GET_VOUCHER_FOR_IMAGE_LIST_ERROR,
        payload: 'Something went wrong!',
      });
    });
};

export const bulkUploadImages = (data: any, callback?: (message: string, success?: boolean) => void) => (dispatch: any) => {
    dispatch({ type: BULK_IMAGE_UPLOAD_PENDING });

    // Creating a Promise for bulk upload request
    const uploadPromise = httpService.post(`${API_BULK_IMAGE_UPLOAD_URL}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

    // Handling the Promise
    uploadPromise
      .then((response) => {
        const _data = response.data;
        if (_data.success) {
          dispatch({
            type: BULK_IMAGE_UPLOAD_SUCCESS,
            payload: _data,
          });
          if (typeof callback === 'function') {
            callback(_data.message, true); // ✅ success = true
          }
        } else {
          dispatch({
            type: BULK_IMAGE_UPLOAD_ERROR,
            payload: _data.error,
          });
          if (typeof callback === 'function') {
            callback(_data.message, false); // ✅ success = false
          }
        }
      })
      .catch((err) => {
        dispatch({type: BULK_IMAGE_UPLOAD_ERROR, payload: err});
        if (typeof callback === 'function') {
          callback(err.message, false); // ✅ success = false
        }
      });
  };

const initialState = {
  isLoading: false,
  isSave: false,
  errors: {},
  data: {},
  dataForImage: {},
  bulkUploadImages: {},
};

const imageUploadSlice = (state = initialState, action: any) => {
  switch (action.type) {
    case IMAGE_UPLOAD_PENDING:
    case GET_VOUCHER_FOR_IMAGE_LIST_PENDING:
    case BULK_IMAGE_UPLOAD_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case GET_VOUCHER_FOR_IMAGE_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        dataForImage: action.payload,
        errors: {},
      };
    case IMAGE_UPLOAD_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        data: action.payload,
        errors: {},
      };
    case BULK_IMAGE_UPLOAD_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        bulkUploadImages: action.payload,
        errors: {},
      };
    case IMAGE_UPLOAD_ERROR:
    case GET_VOUCHER_FOR_IMAGE_LIST_ERROR:
    case BULK_IMAGE_UPLOAD_ERROR:
      return {
        ...state,
        isLoading: false,
        isSave: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default imageUploadSlice;

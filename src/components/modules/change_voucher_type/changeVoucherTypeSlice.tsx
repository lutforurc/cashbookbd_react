import { VOUCHER_TYPE_CHANGE_STORE_ERROR, VOUCHER_TYPE_CHANGE_STORE_PENDING, VOUCHER_TYPE_CHANGE_STORE_SUCCESS, VOUCHER_TYPE_LIST_ERROR, VOUCHER_TYPE_LIST_PENDING, VOUCHER_TYPE_LIST_SUCCESS } from '../../constant/constant/constant';
import { API_VOUCHER_TYPE_CHANGE_STORE_URL, API_VOUCHER_TYPE_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';

  
export const changeVoucherTypeStore = (data: any, callback?: (response: { success: boolean, message: string }) => void) =>
  (dispatch: any) => {

    dispatch({ type: VOUCHER_TYPE_CHANGE_STORE_PENDING });

    httpService.post(API_VOUCHER_TYPE_CHANGE_STORE_URL, data)
      .then((res) => {
        const _data = res.data;

        if (_data.success) {
          dispatch({
            type: VOUCHER_TYPE_CHANGE_STORE_SUCCESS,
            payload: _data.data.data,
          });

          if (typeof callback === "function") {
            callback({ success: true, message: _data?.data?.data?.original?.message });
          }

        } else {
          dispatch({
            type: VOUCHER_TYPE_CHANGE_STORE_ERROR,
            payload: _data.error.message,
          });

          if (typeof callback === "function") { 
            callback({ success: false, message: _data?.data?.original?.message });
          }
        }
      })
      .catch((err) => {
        dispatch({
          type: VOUCHER_TYPE_CHANGE_STORE_ERROR,
          payload: "Something went wrong.",
        });

        if (typeof callback === "function") { 
          callback({ success: false, message: err.message });
        }
      });
  };

  

  
export const getVoucherTypes = (data: any, callback?: (message: string) => void) => (dispatch: any) => {
  dispatch({ type: VOUCHER_TYPE_LIST_PENDING
   });
  httpService.post(API_VOUCHER_TYPE_URL, data)
    .then((res) => {
      const _data = res.data; 
      if (_data.success) {
        dispatch({
          type: VOUCHER_TYPE_LIST_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.data.data);
        }
      } else {
        dispatch({
          type: VOUCHER_TYPE_LIST_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: VOUCHER_TYPE_LIST_ERROR,
        payload: 'Something went wrong.',
      });
      if ('function' == typeof callback) {
        callback(err.message);
      }
    });
};
  


const initialState = {
  isLoading: false,
  isSave: false,
  errors: {},
  data: {},
  voucherList: {},
};


const changeVoucherTypeReducer = (state = initialState, action: any) => {
  switch (action.type) {

    case VOUCHER_TYPE_CHANGE_STORE_PENDING:
    case VOUCHER_TYPE_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case VOUCHER_TYPE_CHANGE_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        data: action.payload,
        errors: {},
      };
    case VOUCHER_TYPE_LIST_SUCCESS: 
      return {
        ...state,
        isLoading: false,
        isSave: false, 
        voucherList: action.payload,
        errors: {},
      };
    case VOUCHER_TYPE_LIST_ERROR:
    case VOUCHER_TYPE_CHANGE_STORE_ERROR:
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

export default changeVoucherTypeReducer;

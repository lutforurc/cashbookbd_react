import { DAYCLOSE_STORE_ERROR, DAYCLOSE_STORE_PENDING, DAYCLOSE_STORE_SUCCESS } from '../../constant/constant/constant';
import { API_DAYCLOSE_STORE_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';

export const storeDayClose = (
  data: any,
  callback?: (message: string) => void
) => (dispatch: any) => {
  dispatch({ type: DAYCLOSE_STORE_PENDING });
  httpService.post(API_DAYCLOSE_STORE_URL, data)
    .then((res) => {
      const _data = res.data;
      if (_data.success) {
        dispatch({
          type: DAYCLOSE_STORE_SUCCESS,
          payload: _data.data.data,
        });
        if ('function' == typeof callback) {
          callback(_data.data.data.current_date);
        }
      } else {
        dispatch({
          type: DAYCLOSE_STORE_ERROR,
          payload: _data.error.message,
        });
        if ('function' == typeof callback) {
          callback(_data.message);
        }
      }
    })
    .catch((err) => {
      dispatch({
        type: DAYCLOSE_STORE_ERROR,
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
};


const dayCloseReducer = (state = initialState, action: any) => {
  switch (action.type) {

    case DAYCLOSE_STORE_PENDING:
      return {
        ...state,
        isLoading: true,
        isSave: false,
      };

    case DAYCLOSE_STORE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isSave: true,
        data: action.payload,
        errors: {},
      };
    case DAYCLOSE_STORE_ERROR:
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

export default dayCloseReducer;

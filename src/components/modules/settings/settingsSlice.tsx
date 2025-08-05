
import { APP_SETTINGS_ERROR, APP_SETTINGS_PENDING, APP_SETTINGS_SUCCESS } from '../../constant/constant/constant';
import { API_APP_SETTING_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';
  
 
  export const getSettings = (data: any) => (dispatch: any) => {
    dispatch({ type: APP_SETTINGS_PENDING });
    httpService.post(API_APP_SETTING_URL, data)
      .then((res) => {
        const _data = res.data;
        if (_data.success) {
          dispatch({
            type: APP_SETTINGS_SUCCESS,
            payload: _data.data.data,
          });
        } else {
          dispatch({
            type: APP_SETTINGS_ERROR,
            payload: _data.error.message,
          });
        }
      })
      .catch(() => {
        dispatch({
          type: APP_SETTINGS_ERROR,
          payload: 'Something went wrong.',
        });
      });
  };
  
 
  const initialState = {
    isLoading: false, 
    data: {},
    errors: {},
  };

  const settingsReducer = (state = initialState, action: any) => {
    switch (action.type) {
      case APP_SETTINGS_PENDING: 
        return {
          ...state,
          isLoading: true,  
        };
  
      case APP_SETTINGS_SUCCESS:
        return {
          ...state,
          isLoading: false,  
          data: action.payload,
          errors: {},
        };
  
      case APP_SETTINGS_ERROR: // Fixed this case
        return {
          ...state,
          isLoading: false,  
          errors: action.payload,
        };
  
      default:
        return state;
    }
  };
  
  export default settingsReducer;
  
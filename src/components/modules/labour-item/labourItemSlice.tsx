import { LABOUR_LIST_DDL_ERROR, LABOUR_LIST_DDL_PENDING, LABOUR_LIST_DDL_SUCCESS} from '../../constant/constant/constant';

import {API_CONSTRUCTION_DDL_LABOUR_URL } from '../../services/apiRoutes';
import { getToken } from '../../../features/authReducer';

export const getDdlLabourItem = (search = '') => async (dispatch: any) => {
  try {
    const token = getToken();
    const response = await fetch(API_CONSTRUCTION_DDL_LABOUR_URL + `?q=${search}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
    const data = await response.json();
    dispatch({ type: 'SET_LABOUR_DDL_DATA', payload: data });
    return { payload: data.data.data };
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {},
};

const labourItemSlice = (state = initialState, action: any) => {
  switch (action.type) {
    
    case LABOUR_LIST_DDL_PENDING: 
      return {
        ...state,
        isLoading: true,
      };

    case LABOUR_LIST_DDL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case LABOUR_LIST_DDL_ERROR: 
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default labourItemSlice;

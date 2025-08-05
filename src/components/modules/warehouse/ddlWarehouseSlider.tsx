import {ACTIVE_WAREHOUSE_DDL_ERROR,ACTIVE_WAREHOUSE_DDL_PENDING,ACTIVE_WAREHOUSE_DDL_SUCCESS,} from '../../constant/constant/constant';
import {ACTIVE_WAREHOUSE_DDL_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';

export const getDdlWarehouse = () => (dispatch: any) => {
  dispatch({ type: ACTIVE_WAREHOUSE_DDL_PENDING });

  httpService.get(ACTIVE_WAREHOUSE_DDL_URL)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: ACTIVE_WAREHOUSE_DDL_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: ACTIVE_WAREHOUSE_DDL_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: ACTIVE_WAREHOUSE_DDL_ERROR,
        payload: 'Something went wrong',
      });
    });
};

const initialState = {
  isLoading: false,
  errors: null,
  data: {}, 
};

const warehouseDdlReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ACTIVE_WAREHOUSE_DDL_PENDING:
      return {
        ...state,
        isLoading: true,
      };

    case ACTIVE_WAREHOUSE_DDL_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case ACTIVE_WAREHOUSE_DDL_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default warehouseDdlReducer;

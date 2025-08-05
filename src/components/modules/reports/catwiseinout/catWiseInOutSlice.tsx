import { CAT_WISE_IN_OUT_DATA_LIST_ERROR, CAT_WISE_IN_OUT_DATA_LIST_PENDING, CAT_WISE_IN_OUT_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_CAT_IN_OUT_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface ledgerParam {
  branchId: number | null;
  reportType: number;
  categoryId: number;
  startDate: string;
  endDate: string;
}

export const getCatWiseInOut = ({ branchId, reportType, categoryId, startDate, endDate }: ledgerParam) => (dispatch: any) => {
  dispatch({ type: CAT_WISE_IN_OUT_DATA_LIST_PENDING });
  httpService.post(API_REPORT_CAT_IN_OUT_URL, { branch_id: branchId, reportType: reportType, category_id: categoryId, startdate: startDate, enddate: endDate })
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: CAT_WISE_IN_OUT_DATA_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: CAT_WISE_IN_OUT_DATA_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: CAT_WISE_IN_OUT_DATA_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};
const initialState = {
  isLoading: false,
  errors: {},
  data: {},
};
const catWiseInOutReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case CAT_WISE_IN_OUT_DATA_LIST_PENDING:
      return {
        data: {}, //...state,
        isLoading: true,
      };
    case CAT_WISE_IN_OUT_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case CAT_WISE_IN_OUT_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default catWiseInOutReducer;

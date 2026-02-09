import { PRODUCT_STOCK_DATA_LIST_ERROR, PRODUCT_STOCK_DATA_LIST_PENDING, PRODUCT_STOCK_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_PRODUCT_STOCK_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface ledgerParam {
  branchId: number | null;
  brandId: number | null;
  categoryId: number;
  search?: string;
  startDate: string;
  endDate: string;
}


export const getProductStock = ({ branchId, brandId, categoryId, search, startDate, endDate }: ledgerParam) => (dispatch: any) => {
  dispatch({ type: PRODUCT_STOCK_DATA_LIST_PENDING });
  httpService.post(API_REPORT_PRODUCT_STOCK_URL, { branch_id: branchId, brand_id: brandId, category_id: categoryId, product_name: search, startdate: startDate, enddate: endDate })
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: PRODUCT_STOCK_DATA_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: PRODUCT_STOCK_DATA_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: PRODUCT_STOCK_DATA_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};
const initialState = {
  isLoading: false,
  data: {},
  errors: {},
};
const productStockReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case PRODUCT_STOCK_DATA_LIST_PENDING:
      return {
        data: {}, //...state,
        isLoading: true,
      };
    case PRODUCT_STOCK_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case PRODUCT_STOCK_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default productStockReducer;

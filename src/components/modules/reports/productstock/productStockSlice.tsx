import { PRODUCT_STOCK_DATA_LIST_ERROR, PRODUCT_STOCK_DATA_LIST_PENDING, PRODUCT_STOCK_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_PRODUCT_STOCK_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface ledgerParam {
  branchId: number | null;
  brandId: number | null;
  categoryId: number;
  groupId?: number | string | null;
  search?: string;
  startDate: string;
  endDate: string;
}


/**
 * ⚠️ Two answers can come back in the wrong order. A wide Apply is slow (it
 * builds the whole closing stock again), and somebody who gets impatient types
 * a search and presses Search while it is still running: the small search
 * answer lands first, then the older, *unfiltered* one lands on top of it and
 * the screen shows the whole list -- a search that returned everything.
 *
 * Every call takes a ticket, and only the newest ticket may write. Same idiom
 * as ClosingStockReport's loadSeq, which was fixed for exactly this reason.
 */
let latestTicket = 0;

export const getProductStock = ({ branchId, brandId, categoryId, groupId, search, startDate, endDate }: ledgerParam) => (dispatch: any) => {
  const ticket = ++latestTicket;
  dispatch({ type: PRODUCT_STOCK_DATA_LIST_PENDING });
  httpService.post(API_REPORT_PRODUCT_STOCK_URL, { branch_id: branchId, brand_id: brandId, category_id: categoryId, group_id: groupId || null, product_name: search, startdate: startDate, enddate: endDate })
    .then((res) => {
      // A newer request is already in flight; this answer is stale.
      if (ticket !== latestTicket) return;

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
      if (ticket !== latestTicket) return;
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
      /**
       * ⚠️ The old rows stay put while the new request is in flight -- `data`
       * is deliberately NOT emptied here. Wiping it made Apply blank the whole
       * table for as long as the report took to build (seconds, on a wide date
       * range), so the screen flashed empty and then refilled. Now the previous
       * answer stands until the new one overwrites it, and a failed request
       * leaves it standing too instead of blanking the screen for nothing.
       */
      return {
        ...state,
        isLoading: true,
      };
    case PRODUCT_STOCK_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
      };

    case PRODUCT_STOCK_DATA_LIST_ERROR:
      /**
       * ⚠️ A failure DOES clear the rows, unlike PENDING above. "This report has
       * no answer" (an empty search, an empty date range) arrives here as
       * `success:false`, and neither screen renders `errors` -- a kept table
       * would be read as "the search matched all this", which is the exact
       * misreading the search box was fixed for. Blank is the honest answer;
       * the old rows were never the answer to the new question.
       */
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
        data: {},
      };
    default:
      return state;
  }
};

export default productStockReducer;

import { MITCH_MATCH_DATA_LIST_ERROR, MITCH_MATCH_DATA_LIST_PENDING, MITCH_MATCH_DATA_LIST_SUCCESS } from '../../../constant/constant/constant';
import { API_REPORT_MITCH_MATCH_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface mitchMatchParam {
  branchId: number | null;
}

interface MitchMatchState {
  isLoading: boolean;
  errors: string | null;
  data: any;
}

export const getMitchMatch = ({ branchId }: mitchMatchParam) => (dispatch: any) => {
  dispatch({ type: MITCH_MATCH_DATA_LIST_PENDING });
  httpService.get(API_REPORT_MITCH_MATCH_URL + `?branch_id=${branchId}&delay=1`)
    .then((res) => {
      let _data = res.data;
      if (_data.success) {
        dispatch({
          type: MITCH_MATCH_DATA_LIST_SUCCESS,
          payload: _data.data.data,
        });
      } else {
        dispatch({
          type: MITCH_MATCH_DATA_LIST_ERROR,
          payload: _data.error.message,
        });
      }
    })
    .catch((err) => {
      dispatch({
        type: MITCH_MATCH_DATA_LIST_ERROR,
        payload: 'Something went wrong',
      });
    });
};
const initialState: MitchMatchState = {
  isLoading: false,
  errors: null,
  data: {},
};
const mitchMatchReducer = (state = initialState, action: any): MitchMatchState => {
  switch (action.type) {
    case MITCH_MATCH_DATA_LIST_PENDING:
      return {
        ...state,
        isLoading: true,
      };
    case MITCH_MATCH_DATA_LIST_SUCCESS:
      return {
        ...state,
        isLoading: false,
        data: action.payload,
        errors: null,  // reset errors on success
      };
    case MITCH_MATCH_DATA_LIST_ERROR:
      return {
        ...state,
        isLoading: false,
        errors: action.payload,
      };
    default:
      return state;
  }
};

export default mitchMatchReducer;

import { getToken } from '../../../../features/authReducer';
import {
    COAL4_DDL_LIST_ERROR,
    COAL4_DDL_LIST_PENDING, COAL4_DDL_LIST_SUCCESS,
} from '../../../constant/constant/constant';
import { API_CHART_OF_ACCOUNTS_DDL_L4_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';

interface coal4Param {
    searchName: string | null;
}



export const getCoal4Ddl = (searchName: '', acType = '') => async (dispatch: any) => {
    try {
        dispatch({ type: COAL4_DDL_LIST_PENDING });
        const response = await httpService.get(API_CHART_OF_ACCOUNTS_DDL_L4_URL + `?searchName=${searchName}&delay=0`)
            .then((res) => {
                let _data = res.data;
                if (_data.success) {
                    dispatch({
                        type: COAL4_DDL_LIST_SUCCESS,
                        payload: _data.data.data,
                    });
                } else {
                    dispatch({
                        type: COAL4_DDL_LIST_ERROR,
                        payload: _data.error.message,
                    });
                }
            })
            .catch((err) => {
                dispatch({
                    type: COAL4_DDL_LIST_ERROR,
                    payload: 'Something went wrong',
                });
            });

        return { payload: response.data };
    } catch (error) {
        dispatch({
            type: COAL4_DDL_LIST_ERROR,
            payload: 'Something went wrong',
        });
    }


};

const initialState = {
    isLoading: false,
    errors: null,
    data: {},
};

const coal4DdlSlicer = (state = initialState, action: any) => {
    switch (action.type) {
        case COAL4_DDL_LIST_PENDING:
            return {
                ...state,
                isLoading: true,
                data: {},
            };
        case COAL4_DDL_LIST_SUCCESS:
            return {
                ...state,
                isLoading: false,
                data: action.payload,
            };
        case COAL4_DDL_LIST_ERROR:
            return {
                ...state,
                isLoading: false,
                errors: action.payload,
            };
        default:
            return state;
    }
};

export default coal4DdlSlicer;


export const getCoal4DdlNext = (inputValue: string, acType: string) => async (dispatch: any) => {
    try {
        const token = getToken();
        const response = await fetch(
            API_CHART_OF_ACCOUNTS_DDL_L4_URL + `?searchName=${inputValue}&acType=${acType}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
        const data = await response.json();
        dispatch({ type: 'SET_COAL4_DDL_DATA', payload: data });
        return { payload: data.data.data }; // Ensure this is returned
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

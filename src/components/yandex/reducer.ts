import { YandexProductListItem } from '../../types/common';

export const initialState = {
    yandexProductData: [],
    isLoading: false,
    isYandexPDFData: false,
};

export const enum ActionType {
    ADD_YANDEX_PRODUCT = 'ADD_YANDEX_PRODUCT',
    IS_YANDEX_PDF_DATA = 'IS_YANDEX_PDF_DATA',
    IS_LOADING = 'IS_LOADING',
    DISABLE_YANDEX = 'DISABLE_YANDEX',
    SET_YANDEX_PERCENTAGE = 'SET_YANDEX_PERCENTAGE',
    SET_FINAL_YANDEX_PDF = 'SET_FINAL_YANDEX_PDF',
    SET_OBJECT_URL = 'SET_OBJECT_URL',
    SET_DPF_BYTES = 'SET_DPF_BYTES',
}

type Actions =
    | { type: ActionType.ADD_YANDEX_PRODUCT; payload: YandexProductListItem[] }
    | { type: ActionType.IS_YANDEX_PDF_DATA; payload: boolean }
    | { type: ActionType.IS_LOADING; payload: boolean };

interface State {
    yandexProductData: YandexProductListItem[];
    isLoading: boolean;
    isYandexPDFData: boolean;
}

export const yandexReducer = (state: State, action: Actions): State => {
    switch (action.type) {
        case ActionType.ADD_YANDEX_PRODUCT: {
            return { ...state, yandexProductData: action.payload };
        }
        case ActionType.IS_YANDEX_PDF_DATA: {
            return { ...state, isLoading: action.payload };
        }
        case ActionType.IS_LOADING: {
            return { ...state, isLoading: action.payload };
        }
        // default: {
        //     throw Error('Unknown action: ' + action.type);
        // }
    }
};

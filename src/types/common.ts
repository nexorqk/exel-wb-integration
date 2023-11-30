export interface ProductGroup {
    id: string[] | string;
    label: string;
    count: number;
    countOrder: number;
    text: string;
    article?: string;
}
export interface YandexProductListItem {
    id: string;
    sku: string;
    count: number;
    label: string;
}

export interface ProductListItem {
    label: string;
    id: string;
    count?: number;
    article?: string;
}

export type ProductList = ProductListItem[];

export interface YandexProductListItem {
    id: string;
    sku: string;
    label: string;
    count: number;
}

export type YandexProductList = YandexProductListItem[];

export interface AccomulatorItem {
    label: string;
    id: string | string[];
    count: number;
    article?: string;
}

export interface Accomulator {
    [key: string]: AccomulatorItem;
}

export interface ExcelRow {
    [key: string]: string;
}
export interface TextContentItem {
    dir: string;
    fontName: string;
    hasEOL: boolean;
    height: number;
    str: string;
    transform: number[];
    width: number;
}

export interface PageSize {
    width: number;
    height: number;
}

export interface PageID {
    id: string;
}

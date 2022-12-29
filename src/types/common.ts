export interface ProductGroup {
    id: string[] | string;
    label: string;
    count: number;
    countOrder: number;
    text: string;
}

export interface ProductListItem {
    label: string;
    id: string;
}
export type ProductList = ProductListItem[];

export interface AccomulatorItem {
    label: string;
    id: string | string[];
    count: number;
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

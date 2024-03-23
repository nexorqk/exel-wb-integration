import {
    PageID,
    PageSize,
    ProductGroup,
    ProductList,
    ProductListItem,
    TextContentItem,
    YandexProductListItem,
} from './types/common';
import { PDFFont, PDFPage, rgb } from 'pdf-lib';
import { MAX_CONCURRENT_PAGES, START_PAGE, pageSize } from './constants';
import { pdfjs } from 'react-pdf';

export const setWorkerSrc = (data: any) => {
    return (data.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${data.version}/pdf.worker.min.js`);
};

export const wrapText = (text: string, width: number, font: PDFFont, fontSize: number) => {
    const words = text.split(' ');

    let line = '';
    let result = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > width) {
            result += line + '\n';
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    result += line;

    return result;
};

export const generateWBText = (group: ProductGroup) => {
    const { text, article } = group;

    const [ARTICLE_1, ARTICLE_2] = [article?.substring(0, 25), article?.substring(25)];

    const articleIndentions = `\n${ARTICLE_1} \n${ARTICLE_2}`;

    return `
    ${text}
    ${articleIndentions}`;
};

export const generateOzonText = (
    label: string | string[],
    count: number,
    id: string,
    article: string,
) => {
    const [ARTICLE_1, ARTICLE_2, ARTICLE_3, ARTICLE_4] = [
        article.substring(0, 20),
        article.substring(20, 40),
        article.substring(40, 60),
        article.substring(60),
    ];

    const articleIndentions = `\n${ARTICLE_1} \n${ARTICLE_2} \n${ARTICLE_3} \n${ARTICLE_4}`;

    if (typeof id === 'string' && typeof label === 'object') {
        return `По ${count} шт.\n 
        ${label.map((item, index) => `${index + 1}.${item}`).join('\n\n')} 
        ${articleIndentions}`;
    }

    if (typeof id === 'string' && id.split(' ').length === 1 && count > 1) {
        return `Сложный заказ
        \nКоличество: ${count} шт.
        ${
            Array.isArray(label)
                ? label.map((item, index) => `${index + 1}.${item}`).join('\n\n')
                : `\n${label}`
        }
        ${articleIndentions}
        `;
    }
    return `
    \n${
        Array.isArray(label)
            ? label.map((item, index) => `${index + 1}.${item}`).join('\n\n')
            : `\n${label}`
    }
    \nЗаказов:${Array.isArray(id) ? id.length : 1} шт.
    ${articleIndentions}`;
};

export const generateYandexText = (group: YandexProductListItem) => {
    const { id, count, label, sku } = group;

    const [ARTICLE_1, ARTICLE_2, ARTICLE_3, ARTICLE_4] = [
        sku.substring(0, 20),
        sku.substring(20, 40),
        sku.substring(40, 60),
        sku.substring(60),
    ];

    const joinedLabel = label.split('').join('\n');

    const articleIndentions = `\n${ARTICLE_1} \n${ARTICLE_2} \n${ARTICLE_3} \n${ARTICLE_4}`;

    if (typeof id === 'string' && typeof label === 'object') {
        return `По ${count} шт.\n ${joinedLabel} ${articleIndentions}`;
    }

    if (typeof id === 'string' && id.split(' ').length === 1 && count > 1) {
        return `Сложный заказ
        \nКоличество: ${count} шт.
        \n${label}
        ${articleIndentions}
        `;
    }

    return `\n${label}
    \nЗаказов:${Array.isArray(id) ? id.length : 1} шт.
    ${articleIndentions}`;
};

export const resizePdfPages = (pages: PDFPage[]) => {
    const new_size = pageSize;
    const new_size_ratio = Math.round((new_size.width / new_size.height) * 100);

    pages.forEach(page => {
        const { width, height } = page.getMediaBox();
        const size_ratio = Math.round((width / height) * 100);

        if (Math.abs(new_size_ratio - size_ratio) > 1) {
            page.setSize(new_size.width, new_size.height);
            const scale_content = Math.min(new_size.width / width, new_size.height / height);

            page.scaleContent(scale_content, scale_content);
        } else {
            page.scale(new_size.width / width, new_size.height / height);
        }
    });
};

export const resizeOzonPdfPages = (pages: PDFPage[], pageSizeOzon: PageSize) => {
    const new_size = pageSizeOzon;
    const new_size_ratio = Math.round((new_size.width / new_size.height) * 100);

    pages.forEach(page => {
        const { width, height } = page.getMediaBox();
        const size_ratio = Math.round((width / height) * 100);

        if (Math.abs(new_size_ratio - size_ratio) > 1) {
            page.setSize(new_size.width, new_size.height);
            const scale_content = Math.min(new_size.width / width, new_size.height / height);

            page.scaleContent(scale_content, scale_content);
        } else {
            page.scale(new_size.width / width, new_size.height / height);
        }
    });
};

export const resizeYandexPdfPages = (pages: PDFPage[], pageSizeYandex: PageSize) => {
    const new_size = pageSizeYandex;
    const new_size_ratio = Math.round((new_size.width / new_size.height) * 100);

    pages.forEach(page => {
        const { width, height } = page.getMediaBox();
        const size_ratio = Math.round((width / height) * 100);

        if (Math.abs(new_size_ratio - size_ratio) > 1) {
            const scale_content = Math.min(new_size.width / width, new_size.height / height);

            page.scale(scale_content * 1.43, scale_content * 1.43);
        } else {
            page.setSize(new_size.width, new_size.height);
            page.scale(new_size.width / width, new_size.height / height);
        }
    });
};

export const drawTextOnPages = (page: PDFPage, text: string, font: PDFFont) => {
    page.drawText(text, {
        x: 100,
        y: 650,
        size: 60,
        font: font,
        lineHeight: 50,
        color: rgb(0, 0, 0),
    });
};

export const drawTextOnPagesOzon = (page: PDFPage, text: string, font: PDFFont) => {
    page.drawText(text, {
        x: 30,
        y: 900,
        size: 40,
        font: font,
        lineHeight: 35,
        color: rgb(0, 0, 0),
    });
};

export const drawTextOnPagesYandex = (page: PDFPage, text: string, font: PDFFont) => {

    page.drawText(text, {
        x: 30,
        y: 800,
        size: 36,
        font: font,
        lineHeight: 36,
        color: rgb(0, 0, 0),
    });
};

export const getPDFText = async (doc: any, number: number, pageIds: PageID[]) => {
    const page = await doc.getPage(number);
    const text = await page.getTextContent();
    const items: TextContentItem[] = text.items;
    // const item: TextContentItem | undefined = items.find(item => item.str);
    const itemLast: TextContentItem | undefined = items.find(item => item.str.length === 4);
    const middleItem: TextContentItem | undefined = items.find(item => item.str.length === 7);

    const oneArgs: PageID = { id: `${middleItem?.str}${itemLast?.str}` };

    pageIds.push(oneArgs);
};

export const getDuplicatesOrUniques = (arr: ProductList, duplicates?: boolean) =>
    arr.filter((item, index) => {
        arr.splice(index, 1);
        const unique = duplicates
            ? arr.find(elem => elem.id === item.id)
            : !arr.find(elem => elem.id === item.id);
        arr.splice(index, 0, item);

        return unique;
    });

export const defineLastWSKey = (arr: string[]) => {
    if (arr[arr.length - 1] === '!merges') {
        if (arr[arr.length - 2] === '!margins') {
            return arr[arr.length - 3];
        }
        return arr[arr.length - 2];
    }

    return arr[arr.length - 1];
};

export const defineFirstWSKey = (arr: string[]) => {
    if (arr[0] === 'Информация о заказе') {
        return 'A2';
    }

    if (arr[0] === 'Номер заказа') {
        return 'A1';
    }

    return 'A2';
};

export const dateTimeForFileName = (): string => {
    const date = new Date();

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const currentDate = `${day}_${month}_${year}_${hours}_${minutes}_${seconds}`;

    return currentDate;
};

export const compareAndDelete = (xlsIds: ProductListItem[], pageIds: PageID[]) => {
    const array = pageIds.map((el: PageID) => el.id);

    const newArray = xlsIds.filter(obj => array.includes(obj.id));

    xlsIds.length = 0;
    xlsIds.push(...newArray);

    return newArray;
};

export const convertBytes = (bytes?: number) => {
    const kilobytes = bytes! / 1024;
    const megabytes = kilobytes / 1024;

    return megabytes >= 1
        ? Math.round(megabytes * 100) / 100 + ' MB'
        : Math.round(kilobytes * 100) / 100 + ' KB';
};

export const getSortedArray = (array: ProductListItem[]): ProductListItem[] => {
    const result: ProductListItem[] = Object.values(
        array.reduce((acc: Record<string, ProductListItem>, item: ProductListItem) => {
            if (!acc[item.label]) {
                acc[item.label] = {
                    ...item,
                };
            } else {
                //@ts-ignore
                acc[item.label].id = [].concat(acc[item.label].id, item.id) as string[];
            }
            return acc;
        }, {} as Record<string, ProductListItem>),
    );

    return result;
};

export const sortDuplicatedOrders = (productList: ProductList): ProductListItem[] => {
    const result = Object.values(
        productList.reduce((acc: Record<string, ProductListItem>, item: ProductListItem) => {
            if (!acc[item.id])
                acc[item.id] = {
                    ...item,
                };
            //@ts-ignore
            else acc[item.id].label = [].concat(acc[item.id].label, item.label);
            return acc;
        }, {} as Record<string, ProductListItem>),
    );

    const data = result.map(el => ({
        ...el,
        //@ts-ignore
        label: el.label.join('\n'),
    }));

    return data;
};

export const defineCountElements = (endPage: number) => {
    return Array.from({ length: endPage - START_PAGE + 1 }, (_, i) => START_PAGE + i);
};

export const prepareIndices = (pageCount: PDFPage[]): number[] => {
    const allPages = [];

    for (let i = 0; i < pageCount.length; i++) {
        allPages.push(i);
    }

    return allPages;
};

export const getAllProductsId = async (
    doc: any,
    pageIds: PageID[],
    pageNumber: number,
    itemKey: number,
) => {
    const page = await doc.getPage(pageNumber);
    const item = await page.getTextContent();
    const oneArgs: PageID = { id: item.items[itemKey].str };
    pageIds.push(oneArgs);

    page.cleanup();
};

export const processPdfPages = async (
    file: ArrayBuffer,
    pageIds: PageID[],
    endPage: number,
    itemKey: number,
) => {
    const doc = await pdfjs.getDocument(file).promise;

    const pagesToProcess = defineCountElements(endPage);

    const promises: Promise<void>[] = [];

    for (let i = 0; i < pagesToProcess.length; i += MAX_CONCURRENT_PAGES) {
        const chunk = pagesToProcess.slice(i, i + MAX_CONCURRENT_PAGES);
        const pagePromises = chunk.map(
            async pageNumber => await getAllProductsId(doc, pageIds, pageNumber, itemKey),
        );
        promises.push(...pagePromises);
        await Promise.all(pagePromises);
    }

    doc.cleanup();

    await Promise.all(promises);
};

export const createPagesGroup = <T extends { id: string | string[] }>(
    group: T,
    pageCount: PDFPage[],
    pagesForGroup: PDFPage[],
    copiedPages: PDFPage[],
    pageIds: PageID[],
) => {
    for (let i = 0; i < pageCount.length; i++) {
        if (typeof group.id === 'string' && pageIds[i].id === group.id) {
            pagesForGroup.push(copiedPages[i]);
        } else {
            for (let j = 0; j < pageIds.length; j++) {
                if (group.id[j] === pageIds[i].id) {
                    pagesForGroup.push(copiedPages[i]);
                }
            }
        }
    }
};

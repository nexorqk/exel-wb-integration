import { ProductList } from './types/common';
import { PDFFont, PDFPage, rgb } from 'pdf-lib';
import { pageSize } from './constants';
import { pdfjs, TextItem } from 'react-pdf';

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

//@ts-ignore
export const generateWBText = group => {
    const { text, article } = group;

    const [ARTICLE_1, ARTICLE_2] = [article.substring(0, 25), article.substring(25)];

    const articleIndentions = `\n${ARTICLE_1} \n${ARTICLE_2}`;

    return `
    ${text}
    ${articleIndentions}`;
};

export const generateOzonText = (label: string | string[], count: number, id: string, article: string) => {
    const [ARTICLE_1, ARTICLE_2, ARTICLE_3] = [
        article.substring(0, 10),
        article.substring(12, 24),
        article.substring(20),
    ];

    const articleIndentions = `\n${ARTICLE_1} \n${ARTICLE_2} \n${ARTICLE_3}`;

    if (typeof id === 'string' && typeof label === 'object') {
        return `По ${count} шт.\n ${label.join('\n\n')} ${articleIndentions}`;
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

export const resizeOzonPdfPages = (pages: PDFPage[], pageSizeOzon: any) => {
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
        size: 50,
        font: font,
        lineHeight: 40,
        color: rgb(0, 0, 0),
    });
};

export const getPDFText = async (file: ArrayBuffer, number: number) => {
    const doc = await pdfjs.getDocument(file).promise;
    const page = await doc.getPage(number);
    const test = await page.getTextContent();
    const items = test.items as TextItem[];
    const item: TextItem | undefined = items.find(item => item.str);
    const itemLast: TextItem | undefined = items.find(item => item.str.length === 4);

    return `${item?.str}${itemLast?.str}`;
};

export const getDuplicatesOrUniques = (arr: ProductList, duplicates?: boolean) =>
    arr.filter((item, index) => {
        arr.splice(index, 1);
        const unique = duplicates ? arr.find(elem => elem.id === item.id) : !arr.find(elem => elem.id === item.id);
        arr.splice(index, 0, item);
        return unique;
    });

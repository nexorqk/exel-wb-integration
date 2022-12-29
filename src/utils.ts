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

export const drawTextOnPages = (page: PDFPage, text: string, font: PDFFont) => {
    page.drawText(text, {
        x: 100,
        y: 650,
        size: 60,
        font: font,
        lineHeight: 60,
        color: rgb(0, 0, 0),
    });
};

export const getPDFText = async (file: ArrayBuffer, number: number) => {
    const doc = await pdfjs.getDocument(file).promise;
    const page = await doc.getPage(number);
    const test = await page.getTextContent();
    const items = test.items as TextItem[];
    const item: TextItem | undefined = items.find(item => item.str.length === 4);

    return item?.str;
};

export const getOzonPDFText = async (file: ArrayBuffer, number: number) => {
    const doc = await pdfjs.getDocument(file).promise;
    const page = await doc.getPage(number);
    const test = await page.getTextContent();
    const items = test.items as TextItem[];
    console.log(items);
    const item: TextItem | undefined = items.find(item => item.str.length === 4);

    return item?.str;
};

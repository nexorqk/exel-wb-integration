import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Progress, Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import { resizePdfPages, wrapText, drawTextOnPages, setWorkerSrc, getPDFText } from './utils';
import { FONT_URL, Multiplier } from './constants';
import { OzonFields } from './components/ozon-fields';
import './App.css';
import 'rsuite/dist/rsuite.min.css';

interface ProductGroup {
    id: string[] | [];
    label: string;
    count: number;
    countOrder: number;
    text: string;
}

export const App = (): ReactElement => {
    const [productList, setProductList] = useState(null) as any;
    const [getPdfData, setGetPdfData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [disable, setDisable] = useState(true);
    const [percent, setPercent] = useState(0);

    const [finalPDF, setFinalPDF] = useState<PDFDocument>();
    const [objectUrl, setObjectUrl] = useState('');
    const status = percent === 100 ? 'success' : 'active';
    const color = percent === 100 ? '#8a2be2' : '#02749C';

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    const getSortedArray = () => {
        const getCountOrder = (text: string) => {
            const splitText = text.split(' ');
            const bl = splitText.includes('упаковок');
            splitText.includes('упаковка');
            splitText.includes('упаковки');
            if (bl) {
                for (let i = 0; i < splitText.length; i++) {
                    const prevValue = splitText.filter(el => el.includes('упак')).join();
                    const curIndex = splitText.indexOf(prevValue);
                    const countOrder = splitText[curIndex - 1];
                    return +countOrder;
                }
            }

            if (splitText.includes('уп.')) {
                for (let i = 0; i < splitText.length; i++) {
                    const prevValue = splitText.filter(el => el.includes('уп.')).join();
                    const curIndex = splitText.indexOf(prevValue);
                    const countOrder = splitText[curIndex - 1];
                    return +countOrder;
                }
            }
            return 1;
        };

        const arr = productList.map((el: { id: any; label: string }) => ({
            id: el.id,
            label: el.label,
            count: getCountOrder(el.label),
        }));

        const result = Object.values(
            arr.reduce((acc: any, item: { label: string | number; id: ConcatArray<never> }) => {
                if (!acc[item.label])
                    acc[item.label] = {
                        ...item,
                    };
                else acc[item.label].id = [].concat(acc[item.label].id, item.id);
                return acc;
            }, {} as any),
        );

        const sortedArray = result.map((el: any) => ({
            ...el,
            countOrder: typeof el.id === 'string' ? 1 : el.id.length,
            text: `по ${el.count} товару в заказе (${typeof el.id === 'string' ? 1 : el.id.length} шт. заказов)

      1 шт - ${el.label}
      `,
        }));

        return sortedArray;
    };

    const generateFinalPDF = async (
        pdfDocument: PDFDocument,
        productGroups: ProductGroup[],
        pdfBuffer: ArrayBuffer,
        font: PDFFont,
        multiplier: number,
    ) => {
        const finalPdf = await PDFDocument.create();
        finalPdf.registerFontkit(fontkit);
        const pageCount = pdfDocument.getPages();
        const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
        const timesRomanFont = await finalPdf.embedFont(fontBytes);

        const prepareIndices = () => {
            let allPages = [];

            for (let i = 0; i < pageCount.length; i++) {
                allPages.push(i);
            }
            return allPages;
        };

        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        let pageIds: string[] = [];
        for (let index = 1; index <= pageCount.length; index++) {
            const id = await getPDFText(pdfBuffer, index);
            let getPercent = 100 / pageCount.length
            setPercent(getPercent * index);

            pageIds.push(id);
        }

        productGroups.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizePdfPages(pages);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);
            const text = wrapText(group.text, 400, font, 25);
            drawTextOnPages(lastPage, text, timesRomanFont);
            let result = null;
            let pagesForGroup = [];
            for (let i = 0; i < pageCount.length; i++) {
                if (typeof group.id === 'string') {
                    result = pageIds[i] === group.id ? pagesForGroup.push(copiedPages[i]) : null;
                } else {
                    for (let j = 0; j < group.id.length; j++) {
                        if (group.id[j] === pageIds[i]) {
                            pagesForGroup.push(copiedPages[i]);
                        }
                    }
                }
            }

            pagesForGroup.forEach((page, index) => {
                for (let i = 0; i < multiplier; i++) {
                    finalPdf.addPage(page);
                }
            });
        });

        return finalPdf;
    };

    const handleXLSXSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files) fileReader.readAsArrayBuffer(e.target.files[0]);

        fileReader.onload = (e: any) => {
            const bufferArray = e?.target.result;
            const wb = XLSX.read(bufferArray, { type: 'buffer' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const getArgs = data.map((el: any) => ({
                id: el['Стикер'].slice(-4),
                label: el['Название товара'],
            }));

            const getSortedArr = getArgs.sort((a, b) => a.id - b.id);

            setProductList(getSortedArr);
            setDisable(false);
        };
    };

    const handlePDFSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const reader = new FileReader();

        if (e.target.files) {
            reader.readAsArrayBuffer(e.target.files[0]);
        }

        reader.onload = async () => {
            const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
            const timesRomanFont = await pdfDoc.embedFont(fontBytes);

            const productGroups = getSortedArray();
            const finalPDF = await generateFinalPDF(
                pdfDoc,
                productGroups,
                reader.result as ArrayBuffer,
                timesRomanFont,
                Multiplier.WILDBERRIES,
            );
            setFinalPDF(finalPDF);

            // window.download(base64DataUri, "1-1.pdf", "application/pdf");
            // console.log('end of onloadend');
        };

        setGetPdfData(true);
        setDisable(true);
    };

    const onClick = async () => {
        if (finalPDF) {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            const pdfBytes = await finalPDF.save();
            const pdfBlob = new Blob([pdfBytes]);

            setObjectUrl(URL.createObjectURL(pdfBlob));
            const fileURL = window.URL.createObjectURL(pdfBlob);
            // Setting various property values
            let alink = document.createElement('a');
            alink.href = fileURL;
            alink.download = 'SamplePDF.pdf';
            alink.click();
        }
    };

    return (
        <div className="root">
            <h1 className="logo-title">WB OZON Stickers</h1>
            <aside className="rules-article">
                <ul style={{ listStyle: 'decimal' }}>
                    <li>Загрузите Excel-файл</li>
                    <li>Загрузите PDF-файл</li>
                    <li>Дождитесь загрузки</li>
                    <li>Нажмите на кнопку Скачать</li>
                </ul>
            </aside>
            <div className="section">
                <h2>Wildberries Stickers:</h2>
                <div className="row App">
                    <div className="input-block">
                        <label htmlFor="XLSX" className="btn">
                            Выбрать Excel файл
                            <input
                                type="file"
                                onChange={handleXLSXSelected}
                                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="XLSX-file"
                                id="XLSX"
                                name="XLSX_file"
                                disabled={loading}
                            />
                        </label>
                    </div>
                    <div className="input-block">
                        <Whisper
                            placement="top"
                            controlId={`control-id-hover`}
                            trigger="hover"
                            speaker={disable ? <Tooltip>Сначала загрузите EXCEL файл!</Tooltip> : <div></div>}
                        >
                            <label htmlFor="PDF" className="btn" aria-disabled>
                                Выбрать PDF файл
                                <input
                                    type="file"
                                    onChange={handlePDFSelected}
                                    placeholder="Choose 11"
                                    accept="application/pdf"
                                    className="PDF-file"
                                    id="PDF"
                                    name="PDF_file"
                                    disabled={disable || loading}
                                />
                            </label>
                        </Whisper>
                    </div>

                    <button className="button" disabled={!finalPDF} type="button" onClick={() => onClick()}>
                        Скачать
                    </button>
                </div>
                {/* <Loader /> */}
                {!disable && (
                    <div className="excel-downloaded">
                        <div className="excel-downloaded-bar">
                            <p className="excel-downloaded-label">Excel файл был загружен!</p>
                        </div>
                    </div>
                )}
                {getPdfData && (
                    <div className="progress">
                        <div className="progress-bar">
                            <label className="progress-label" htmlFor="progress">
                                {status !== 'success' ? 'Active' : 'Downloaded'}
                            </label>
                            <Progress.Line
                                percent={+percent.toFixed(2)}
                                id="progress"
                                className="progress-line"
                                strokeColor={color}
                                status={status}
                            />
                        </div>
                    </div>
                )}
            </div>
            <div className="section">
                <OzonFields />
            </div>
        </div>
    );
};

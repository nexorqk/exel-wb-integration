import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Progress, Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import { Loader } from './components/loader';
import { resizePdfPages, wrapText, drawTextOnPages, setWorkerSrc, getPDFText } from './utils';
import './App.css';
import 'rsuite/dist/rsuite.min.css';
import { FONT_URL, Multiplier } from './constants';
import { OzonFields } from './components/ozon-fields';

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
    const [pdfPageLength, setPdfPageLength] = useState(0) as any;
    const [loading, setLoading] = useState(false);
    const [disable, setDisable] = useState(true);
    const [percent, setPercent] = useState(0);

    const [pdfDocument, setPdfDocument] = useState<PDFDocument>();
    const [finalPDF, setFinalPDF] = useState<PDFDocument>();
    const [objectUrl, setObjectUrl] = useState('');
    const [blob, setBlob] = useState<Blob>();
    const status = percent === pdfPageLength ? 'success' : 'active';
    const color = percent === pdfPageLength ? '#8a2be2' : '#02749C';

    // if (loading) {
    //   return <Loader />;
    // }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        setWorkerSrc(pdfjs);
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // useEffect(() => {
    //   console.log(finalPDF);
    // }, [finalPDF]);

    const getSortedArray = () => {
        const getCountOrder = (text: string) => {
            const splitText = text.split(' ');
            const bl = splitText.includes('упаковок');
            splitText.includes('упаковка');
            splitText.includes('упаковки');
            if (bl) {
                for (let i = 0; i < splitText.length; i++) {
                    const prevValue = splitText.filter((el) => el.includes('упак')).join();
                    const curIndex = splitText.indexOf(prevValue);
                    const countOrder = splitText[curIndex - 1];
                    // console.log("countOrder", countOrder);
                    return +countOrder;
                }
            }

            if (splitText.includes('уп.')) {
                for (let i = 0; i < splitText.length; i++) {
                    const prevValue = splitText.filter((el) => el.includes('уп.')).join();
                    const curIndex = splitText.indexOf(prevValue);
                    const countOrder = splitText[curIndex - 1];
                    // console.log("countOrder - 2", countOrder);
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
            }, {} as any)
        );

        console.log('result: ', result);
        const sortedArray = result.map((el: any) => ({
            ...el,
            countOrder: typeof el.id === 'string' ? 1 : el.id.length,
            text: `по ${el.count} товару в заказе (${
                typeof el.id === 'string' ? 1 : el.id.length
            } шт. заказов)

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
        multiplier: number
    ) => {
        const finalPdf = await PDFDocument.create();
        finalPdf.registerFontkit(fontkit);
        const pageCount = pdfDocument.getPages();
        const fontBytes = await fetch(FONT_URL).then((res) => res.arrayBuffer());
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
        for (let index = 1; index <= 5; index++) {
            const id = await getPDFText(pdfBuffer, index);
            setPercent(index);
            pageIds.push(id);
        }
        let num = 0;

        productGroups.forEach(async (group) => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizePdfPages(pages);
            const { width } = pages[0].getMediaBox();
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
            console.log(pagesForGroup);

            console.log('pages for group', (num += 1), pagesForGroup);

            pagesForGroup.forEach((page, index) => {
                for (let i = 0; i < multiplier; i++) {
                    finalPdf.addPage(page);
                }
            });
        });
        console.log('end generateFinalPDF ');

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
            setBlob(e.target.files[0]);
        }

        reader.onload = async () => {
            const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontBytes = await fetch(FONT_URL).then((res) => res.arrayBuffer());
            const timesRomanFont = await pdfDoc.embedFont(fontBytes);
            console.log('timesRomanFont', timesRomanFont);

            const pages = pdfDoc.getPages();
            const { width } = pages[0].getMediaBox();
            setPdfPageLength(pages.length);

            setPdfDocument(pdfDoc);

            const productGroups = getSortedArray();
            const finalPDF = await generateFinalPDF(
                pdfDoc,
                productGroups,
                reader.result as ArrayBuffer,
                timesRomanFont,
                Multiplier.WILDBERRIES
            );
            setFinalPDF(finalPDF);

            // window.download(base64DataUri, "1-1.pdf", "application/pdf");
            console.log('end of onloadend');
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
                            speaker={
                                <Tooltip>
                                    Сначала загрузите EXCEL файл!
                                </Tooltip>
                            }
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
                        {/* <Progress.Circle /> */}
                        <Loader />
                    </button>
                </div>
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
                                percent={percent}
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

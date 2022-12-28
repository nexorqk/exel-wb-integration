import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Progress, Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import { Loader } from '../loader';
import { resizePdfPages, wrapText, drawTextOnPages, setWorkerSrc, getPDFText } from '../../utils';
import '../../App';
import 'rsuite/dist/rsuite.min.css';
import { FONT_URL, Multiplier } from '../../constants';
import { Font } from '@pdf-lib/standard-fonts';

interface ProductGroup {
    id: string[] | [];
    label: string;
    count: number;
    countOrder: number;
    text: string;
}

export const OzonFields = (): ReactElement => {
    const [ozonProductList, ozonSetProductList] = useState(null) as any;
    const [getOzonPdfData, setGetOzonPdfData] = useState(false);
    const [pdfPageLength, setPdfPageLength] = useState(0) as any;
    const [loading, setLoading] = useState(false);
    const [disableOzon, setDisableOzon] = useState(true);
    const [percentOzon, setPercentOzon] = useState(0);
    const [defaultPdfWidth, setDefaultPdfWidth] = useState(0);

    const [pdfDocument, setPdfDocument] = useState<PDFDocument>();
    const [finalPDFOzon, setFinalPDFOzon] = useState<PDFDocument>();
    const [objectUrlOzon, setObjectUrl] = useState('');
    const [blob, setBlob] = useState<Blob>();
    const status = percentOzon === pdfPageLength ? 'success' : 'active';
    const color = percentOzon === pdfPageLength ? '#8a2be2' : '#02749C';

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        setWorkerSrc(pdfjs);
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // useEffect(() => {
    //   console.log(finalPDFOzon);
    // }, [finalPDFOzon]);

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
                    // console.log("countOrder", countOrder);
                    return +countOrder;
                }
            }

            if (splitText.includes('уп.')) {
                for (let i = 0; i < splitText.length; i++) {
                    const prevValue = splitText.filter(el => el.includes('уп.')).join();
                    const curIndex = splitText.indexOf(prevValue);
                    const countOrder = splitText[curIndex - 1];
                    // console.log("countOrder - 2", countOrder);
                    return +countOrder;
                }
            }
            return 1;
        };

        const arr = ozonProductList.map((el: { id: any; label: string }) => ({
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
            text: `по ${el.count} товару в заказе (${typeof el.id === 'string' ? 1 : el.id.length} шт. заказов)`,
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
        // const pages = pdfDocument.getPages();

        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        let pageIds: string[] = [];
        for (let index = 1; index <= pageCount.length; index++) {
            // for (let index = 1; index <= pageCount; index++) {
            const id = await getPDFText(pdfBuffer, index);
            setPercentOzon(index);
            pageIds.push(id);
        }
        let num = 0;

        // debugger;
        productGroups.forEach(async group => {
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
            // console.log(pagesForGroup);

            // console.log('pages for group', (num += 1), pagesForGroup);

            pagesForGroup.forEach((page, index) => {
                for (let i = 0; i < multiplier; i++) {
                    //@ts-ignore

                    finalPdf.addPage(page);
                }
            });
        });
        // console.log('end generateFinalPDF ');

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

            ozonSetProductList(getSortedArr);
            setDisableOzon(false);
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
            const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
            const timesRomanFont = await pdfDoc.embedFont(fontBytes);
            // console.log('timesRomanFont', timesRomanFont);

            const pages = pdfDoc.getPages();
            const { width } = pages[0].getMediaBox();
            setPdfPageLength(pages.length);
            setDefaultPdfWidth(width);

            setPdfDocument(pdfDoc);

            const productGroups = getSortedArray();
            const finalPDFOzon = await generateFinalPDF(
                pdfDoc,
                productGroups,
                reader.result as ArrayBuffer,
                timesRomanFont,
                Multiplier.OZON,
            );
            setFinalPDFOzon(finalPDFOzon);

            // window.download(base64DataUri, "1-1.pdf", "application/pdf");
            // console.log('end of onloadend');
        };

        setGetOzonPdfData(true);
        setDisableOzon(true);
        // debugger;
    };

    const onClick = async () => {
        if (finalPDFOzon) {
            if (objectUrlOzon) {
                URL.revokeObjectURL(objectUrlOzon);
            }
            // const pdfBytes = await finalPDFOzon.save({ useObjectStreams: false });
            const pdfBytes = await finalPDFOzon.save();
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
        <div style={{ marginTop: 40 }}>
            <h2>Ozon Stickers:</h2>
            <div className="row App">
                <div className="input-block">
                    <label htmlFor="XLSX_Ozon" className="btn">
                        Выбрать Excel файл
                    </label>
                    <input
                        type="file"
                        onChange={handleXLSXSelected}
                        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="XLSX-file"
                        id="XLSX_Ozon"
                        name="XLSX_Ozon_file"
                        disabled={loading}
                    />
                </div>

                <div className="input-block">
                    <Whisper
                        placement="top"
                        controlId={`control-id-hover`}
                        trigger="hover"
                        speaker={disableOzon ? <Tooltip>Сначала загрузите EXCEL файл!</Tooltip> : <></>}
                    >
                        <label htmlFor="PDF_Ozon" className="btn">
                            Выбрать PDF файл
                            <input
                                type="file"
                                onChange={handlePDFSelected}
                                placeholder="Choose 11"
                                accept="application/pdf"
                                className="PDF-file"
                                id="PDF_Ozon"
                                name="PDF_Ozon_file"
                                disabled={disableOzon || loading}
                            />
                        </label>
                    </Whisper>
                </div>
                <button className="button" disabled={!finalPDFOzon} type="button" onClick={onClick}>
                    Скачать
                </button>
            </div>
            {!disableOzon && (
                <div className="excel-downloaded">
                    <div className="excel-downloaded-bar">
                        <p className="excel-downloaded-label">Excel файл был загружен!</p>
                    </div>
                </div>
            )}
            {getOzonPdfData && (
                <div className="progress">
                    <div className="progress-bar">
                        <label className="progress-label" htmlFor="progress">
                            {status !== 'success' ? 'Active' : 'Downloaded'}
                        </label>
                        <Progress.Line
                            percent={percentOzon}
                            id="progress"
                            className="progress-line"
                            strokeColor={color}
                            status={status}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

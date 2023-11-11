import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Progress, Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import {
    wrapText,
    setWorkerSrc,
    resizeOzonPdfPages,
    drawTextOnPagesOzon,
    generateOzonText,
    getDuplicatesOrUniques,
} from '../utils';
import '../App';
import 'rsuite/dist/rsuite.min.css';
import { FONT_URL, Multiplier, pageSizeOzon } from '../constants';

import { ProductList, ExcelRow } from '../types/common';

export const YandexFields = (): ReactElement => {
    const [yandexProductList, setYandexProductList] = useState<ProductList>([]);
    const [getOzonPdfData, setGetOzonPdfData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [disableOzon, setDisableOzon] = useState(true);
    const [percentOzon, setPercentOzon] = useState(0);
    const [finalPDFOzon, setFinalPDFOzon] = useState<PDFDocument>();
    const [objectUrlOzon, setObjectUrl] = useState('');
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const status = percentOzon === 100 ? 'success' : 'active';
    const color = percentOzon === 100 ? '#8a2be2' : '#02749C';

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    const pageIds: string[] = [];

    const getOzonPDFText = async (file: ArrayBuffer, number: number) => {
        const doc = await pdfjs.getDocument(file).promise;
        const page = await doc.getPage(number);

        const item = await page.getTextContent();
        //@ts-ignore
        const oneArgs = { id: item.items[4].str };
        //@ts-ignore
        pageIds.push(oneArgs);
    };

    const getSortedArray = (productList: ProductList) => {
        const result = Object.values(
            productList.reduce((acc: any, item: any) => {
                if (!acc[item.label])
                    acc[item.label] = {
                        ...item,
                    };
                //@ts-ignore
                else acc[item.label].id = [].concat(acc[item.label].id, item.id) as string[];
                return acc;
            }, {}),
        );

        return result;
    };

    const sortDuplicatedOrders = (productList: ProductList) => {
        const result = Object.values(
            productList.reduce((acc: any, item: any) => {
                if (!acc[item.id])
                    acc[item.id] = {
                        ...item,
                    };
                //@ts-ignore
                else acc[item.id].label = [].concat(acc[item.id].label, item.label) as string[];
                return acc;
            }, {}),
        );

        return result;
    };

    const generateFinalPDF = async (
        pdfDocument: PDFDocument,
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
            const allPages = [];

            for (let i = 0; i < pageCount.length; i++) {
                allPages.push(i);
            }

            return allPages;
        };

        for (let index = 1; index <= pageCount.length; index++) {
            const id = await getOzonPDFText(pdfBuffer, index);

            if (id as any) pageIds.push(id as any);
            const getPercent = 100 / pageCount.length;
            setPercentOzon(getPercent * index);
        }

        const uniqueOrders = getDuplicatesOrUniques(yandexProductList);
        const duplicatedOrders = getDuplicatesOrUniques(yandexProductList, true);
        const simpleOrders = uniqueOrders.filter(item => item.count === 1);
        const difficultOrders = uniqueOrders.filter(item => item.count !== 1);

        const sortedSimpleOrders = getSortedArray(simpleOrders);
        const sortedDuplicatedOrders = sortDuplicatedOrders(duplicatedOrders);

        const sortedArr = [...difficultOrders, ...sortedDuplicatedOrders, ...sortedSimpleOrders];

        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        sortedArr.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizeOzonPdfPages(pages, pageSizeOzon);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            // @ts-ignore
            const { label, count, id, article } = group;

            //@ts-ignore
            const text = wrapText(generateOzonText(label, count, id, article), 200, font, 20).replace(/\//gm, '');
            const pagesForGroup: PDFPage[] = [];

            drawTextOnPagesOzon(lastPage, text, timesRomanFont);

            for (let i = 0; i < pageCount.length; i++) {
                // @ts-ignore
                if (typeof group.id === 'string' && pageIds[i].id === group.id) {
                    pagesForGroup.push(copiedPages[i]);
                } else {
                    // @ts-ignore
                    for (let j = 0; j < pageIds[i].id.length; j++) {
                        // @ts-ignore
                        if (group.id[j] === pageIds[i].id) {
                            pagesForGroup.push(copiedPages[i]);
                        }
                    }
                }
            }

            pagesForGroup.forEach(page => {
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

        fileReader.onload = e => {
            if (e.target) {
                const bufferArray = e?.target.result;
                const wb = XLSX.read(bufferArray, { type: 'buffer' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                console.log(ws);
                const data: ExcelRow[] = XLSX.utils.sheet_to_json(ws);

                console.log(data);
                const getArgs = data.map((el: ExcelRow) => ({
                    id: el['Ваш SKU'],
                    label: el['Название товара'],
                    count: Number(el['Количество']),
                }));

                const getSortedArr: ProductList = getArgs.sort((a, b) => Number(a.id) - Number(b.id));

                setYandexProductList(getSortedArr);
                setDisableOzon(false);
            }
        };
    };

    const handlePDFSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true);
        const reader = new FileReader();

        if (e.target.files) {
            reader.readAsArrayBuffer(e.target.files[0]);
        }

        reader.onload = async () => {
            const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
            const timesRomanFont = await pdfDoc.embedFont(fontBytes);

            const finalPDFOzon = await generateFinalPDF(
                pdfDoc,
                reader.result as ArrayBuffer,
                timesRomanFont,
                Multiplier.OZON,
            );
            const pdfBytes = await finalPDFOzon.save();
            setFinalPDFOzon(finalPDFOzon);
            setPdfBytes(pdfBytes);
        };

        setGetOzonPdfData(true);
        setDisableOzon(true);
        setLoading(false);
    };

    const onClick = async () => {
        if (finalPDFOzon && pdfBytes) {
            if (objectUrlOzon) {
                URL.revokeObjectURL(objectUrlOzon);
            }
            const pdfBytes = await finalPDFOzon.save();
            const pdfBlob = new Blob([pdfBytes]);
            setObjectUrl(URL.createObjectURL(pdfBlob));
            const fileURL = window.URL.createObjectURL(pdfBlob);
            const alink = document.createElement('a');
            alink.href = fileURL;
            alink.download = 'SamplePDF.pdf';
            alink.click();
        }
    };

    return (
        <div style={{ marginTop: 40 }}>
            <h2>Yandex Stickers:</h2>
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
                        speaker={disableOzon ? <Tooltip>Сначала загрузите Excel файл!</Tooltip> : <div></div>}
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
                            {status !== 'success' ? 'В процессе...' : 'Готово к скачиванию!'}
                        </label>
                        <Progress.Line
                            percent={+percentOzon.toFixed(2)}
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

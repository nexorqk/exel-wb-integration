import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import {
    wrapText,
    setWorkerSrc,
    getDuplicatesOrUniques,
    defineFirstWSKey,
    defineLastWSKey,
    generateYandexText,
    resizeYandexPdfPages,
    drawTextOnPagesYandex,
    dateTimeForFileName,
    compareAndDelete,
    getSortedProductList,
    prepareIndices,
    sortDuplicatedProducts,
    processPage,
    getPagesToProcess,
    processPageSlicer,
} from '../utils';
import '../App';
import 'rsuite/dist/rsuite.min.css';
import { FONT_URL, Multiplier, pageSizeYandex } from '../constants';

import { ExcelRow, YandexProductList } from '../types/common';

export const YandexFields = () => {
    const [yandexProductList, setYandexProductList] = useState<YandexProductList>([]);
    // const [getOzonPdfData, setGetOzonPdfData] = useState(false);
    const [finalPDFOzon, setFinalPDFOzon] = useState<PDFDocument>();
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const [fileLink, setFileLink] = useState('');

    const [loading, setLoading] = useState(false);
    const [disableOzon, setDisableOzon] = useState(true);
    const [objectUrlOzon, setObjectUrl] = useState('');
    

    useEffect(() => {
        setWorkerSrc(pdfjs);
    }, []);

    const MAX_CONCURRENT_PAGES = 4;
    const START_PAGE = 1;
    const pageIds: string[] = [];

    const processYandexPdfPages = async (file: ArrayBuffer, endPage: number) => {
        const doc = await pdfjs.getDocument(file).promise;

        const pagesToProcess = getPagesToProcess(START_PAGE, endPage);

        const getPageContent = async (pageNumber: number) => {
            await processPage(doc, pageIds, pageNumber);
        };

        const promises: any[] = [];

        await processPageSlicer(pagesToProcess, MAX_CONCURRENT_PAGES, promises, getPageContent);

        doc.cleanup();

        await Promise.all(promises);
    };

    const generateFinalPDF = async (
        pdfDocument: PDFDocument,
        pdfBuffer: ArrayBuffer,
        font: PDFFont,
        multiplier: number,
    ) => {
        const finalPdf = await PDFDocument.create();
        finalPdf.registerFontkit(fontkit);
        const pdfPages = pdfDocument.getPages();
        const pageCount = pdfDocument.getPageCount();
        const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
        const timesRomanFont = await finalPdf.embedFont(fontBytes);

        await processYandexPdfPages(pdfBuffer, pageCount);

        const uniqueOrders = getDuplicatesOrUniques(yandexProductList);
        const comparedArray = compareAndDelete(uniqueOrders, pageIds);

        const duplicatedOrders = getDuplicatesOrUniques(yandexProductList, true);
        const simpleOrders = comparedArray.filter(item => item.count === 1);
        const difficultOrders = comparedArray.filter(item => item.count !== 1);

        const sortedSimpleOrders = getSortedProductList(simpleOrders);
        const sortedDuplicatedOrders = sortDuplicatedProducts(duplicatedOrders);

        const sortedArr = [...difficultOrders, ...sortedDuplicatedOrders, ...sortedSimpleOrders];
        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices(pdfPages));

        sortedArr.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizeYandexPdfPages(pages, pageSizeYandex);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            const text = wrapText(generateYandexText(group), 200, font, 18).replace(/\//gm, '');
            const pagesForGroup: PDFPage[] = [];
            drawTextOnPagesYandex(lastPage, text, timesRomanFont);
            for (let i = 0; i < pdfPages.length; i++) {
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

                const arrayWs = Object.keys(ws);

                const firstWSVlaue = defineFirstWSKey(arrayWs);
                const lastWSKey = defineLastWSKey(arrayWs);

                const opts = {
                    range: `${firstWSVlaue}:${lastWSKey}`,
                };
                const data: ExcelRow[] = XLSX.utils.sheet_to_json(ws, opts);

                const getArgs = data.map((el: ExcelRow) => ({
                    id: `${el['Номер заказа']}`,
                    sku: el['Ваш SKU'],
                    label: el['Название товара'],
                    count: Number(el['Количество']),
                }));

                const getSortedArr: YandexProductList = getArgs.sort((a, b) => Number(a.id) - Number(b.id));

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

            if (finalPDFOzon && pdfBytes) {
                const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                setObjectUrl(URL.createObjectURL(pdfBlob));
                const fileURL = window.URL.createObjectURL(pdfBlob);
                setFileLink(fileURL);
            }
        };

        // setGetOzonPdfData(true);
        setDisableOzon(true);
        setLoading(false);
    };

    const onClick = async () => {
        if (finalPDFOzon && pdfBytes) {
            if (objectUrlOzon) {
                URL.revokeObjectURL(objectUrlOzon);
            }
            const alink = document.createElement('a');
            alink.href = fileLink;
            alink.download = `YandexSampleFile_${dateTimeForFileName()}.pdf`;
            alink.click();
        }
    };

    const openFile = () => {
        if (pdfBytes) {
            open(objectUrlOzon);
        }
    };

    return (
        <div>
            <h2>Yandex Stickers:</h2>
            <div className="row">
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

                <Whisper
                    placement="top"
                    controlId={`control-id-hover`}
                    trigger="hover"
                    speaker={disableOzon ? <Tooltip>Сначала загрузите Excel файл!</Tooltip> : <div></div>}
                >
                    <label htmlFor="PDF_Yandex" className="btn">
                        Выбрать PDF файл
                        <input
                            type="file"
                            onChange={handlePDFSelected}
                            placeholder="Choose 11"
                            accept="application/pdf"
                            className="PDF-file"
                            id="PDF_Yandex"
                            name="PDF_Ozon_file"
                            disabled={disableOzon || loading}
                        />
                    </label>
                </Whisper>
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

            {fileLink.length !== 0 && (
                <div>
                    <span className="reviewLink_label">Предпросмотр: </span>
                    <a className="reviewLink" onClick={openFile} target="_blank" rel="noreferrer">
                        Yandex Sample PDF
                    </a>
                </div>
            )}
            {/* {getOzonPdfData && (
                <div className="progress">
                    <div className="progress-bar">
                        <label className="progress-label" htmlFor="progress">
                            {status !== 'success' ? 'В процессе...' : 'Готово к скачиванию!'}
                        </label>
                    </div>
                </div>
            )} */}
        </div>
    );
};

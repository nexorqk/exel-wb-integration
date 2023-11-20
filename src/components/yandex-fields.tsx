/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
} from '../utils';
import '../App';
import { Box, Button, LinearProgress, Link, Tooltip, Typography } from '@mui/material';
import { FONT_URL, Multiplier, pageSizeYandex } from '../constants';

import { ProductList, ExcelRow, YandexProductList } from '../types/common';

export const YandexFields = () => {
    const [yandexProductList, setYandexProductList] = useState<YandexProductList>([]);
    const [getOzonPdfData, setGetOzonPdfData] = useState(false);
    const [finalPDFOzon, setFinalPDFOzon] = useState<PDFDocument>();
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const [fileLink, setFileLink] = useState('');

    const [loading, setLoading] = useState(false);
    const [disableOzon, setDisableOzon] = useState(true);
    const [percentOzon, setPercentOzon] = useState(0);
    const [objectUrlOzon, setObjectUrl] = useState('');
    const status = percentOzon === 100 ? 'success' : 'active';

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    const pageIds: string[] = [];

    const MAX_CONCURRENT_PAGES = 4;
    const START_PAGE = 1;

    const processPdfPages = async (file: ArrayBuffer, endPage: number) => {
        const doc = await pdfjs.getDocument(file).promise;

        const pagesToProcess = Array.from({ length: endPage - START_PAGE + 1 }, (_, i) => START_PAGE + i);

        async function processPage(pageNumber: number) {
            const page = await doc.getPage(pageNumber);
            const item = await page.getTextContent();
            //@ts-ignore
            const oneArgs = { id: item.items[0].str };
            //@ts-ignore
            pageIds.push(oneArgs);

            page.cleanup();
        }

        const promises = [];
        for (let i = 0; i < pagesToProcess.length; i += MAX_CONCURRENT_PAGES) {
            const chunk = pagesToProcess.slice(i, i + MAX_CONCURRENT_PAGES);
            const pagePromises = chunk.map(pageNumber => processPage(pageNumber));
            promises.push(...pagePromises);
            await Promise.all(pagePromises);

            const getPercent = 100 / (endPage - START_PAGE + 1);
            setPercentOzon(getPercent * (i + MAX_CONCURRENT_PAGES));
        }

        doc.cleanup();

        await Promise.all(promises);
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
        const countPage = pdfDocument.getPageCount();
        const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
        const timesRomanFont = await finalPdf.embedFont(fontBytes);

        const prepareIndices = () => {
            const allPages = [];

            for (let i = 0; i < pageCount.length; i++) {
                allPages.push(i);
            }

            return allPages;
        };

        await processPdfPages(pdfBuffer, countPage);

        const uniqueOrders = getDuplicatesOrUniques(yandexProductList);
        const comparedArray = compareAndDelete(uniqueOrders, pageIds);

        const duplicatedOrders = getDuplicatesOrUniques(yandexProductList, true);
        const simpleOrders = comparedArray.filter(item => item.count === 1);
        const difficultOrders = comparedArray.filter(item => item.count !== 1);

        const sortedSimpleOrders = getSortedArray(simpleOrders);
        const sortedDuplicatedOrders = sortDuplicatedOrders(duplicatedOrders);

        const sortedArr = [...difficultOrders, ...sortedDuplicatedOrders, ...sortedSimpleOrders];
        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        sortedArr.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizeYandexPdfPages(pages, pageSizeYandex);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            const text = wrapText(generateYandexText(group), 200, font, 18).replace(/\//gm, '');
            const pagesForGroup: PDFPage[] = [];
            drawTextOnPagesYandex(lastPage, text, timesRomanFont);
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

        setGetOzonPdfData(true);
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
        <Box sx={{ margin: '30px 0' }}>
            <Typography variant="h4" mb={2}>
                Yandex Stickers:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <label htmlFor="XLSX" className="btn">
                    Выбрать Excel файл
                    <input
                        type="file"
                        onChange={handleXLSXSelected}
                        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        id="XLSX"
                        disabled={loading}
                    />
                </label>
                <Tooltip title={disableOzon ? <h2>Сначала загрузите Excel файл!</h2> : ''}>
                    <label htmlFor="PDF_Yandex" className="btn">
                        Выбрать PDF файл
                        <input
                            type="file"
                            onChange={handlePDFSelected}
                            accept="application/pdf"
                            id="PDF_Yandex"
                            disabled={disableOzon || loading}
                        />
                    </label>
                </Tooltip>
                <Button variant="contained" className="button" disabled={!finalPDFOzon} type="button" onClick={onClick}>
                    Скачать
                </Button>
            </Box>
            {!disableOzon && (
                <Typography variant="h4" m={2}>
                    Excel файл был загружен!
                </Typography>
            )}

            {fileLink.length !== 0 && (
                <div>
                    <Typography fontWeight="bold">Предпросмотр: </Typography>
                    <Link onClick={openFile} target="_blank" rel="noreferrer">
                        Yandex Sample PDF
                    </Link>
                </div>
            )}
            {getOzonPdfData && (
                <div className="progress">
                    <div className="progress-bar">
                        <label className="progress-label" htmlFor="progress">
                            {status !== 'success' ? 'В процессе...' : 'Готово к скачиванию!'}
                        </label>
                        <LinearProgress variant="determinate" value={percentOzon} />
                    </div>
                </div>
            )}
        </Box>
    );
};

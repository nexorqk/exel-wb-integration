import React, { ReactElement, useEffect, useReducer, useState } from 'react';
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
    convertBytes,
} from '../../utils';

import { Box, Button, LinearProgress, Link, Tooltip, Typography, styled } from '@mui/material';
import { FONT_URL, Multiplier, pageSizeYandex } from '../../constants';

import { initialState, yandexReducer } from './reducer';
import { ExcelRow, ProductList, ProductListItem } from '../../types/common';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faFile, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 100,
});

const LinearIndeterminate = () => {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>
    );
};

export const YandexFields = (): ReactElement => {
    const [yandexProductList, setYandexProductList] = useState<ProductList>([]);
    const [getYandexPdfData, setGetYandexPdfData] = useState(false);
    const [finalPDFYandex, setFinalPDFYandex] = useState<PDFDocument>();
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const [fileLink, setFileLink] = useState('');

    const [loading, setLoading] = useState(false);
    const [isXLSXFileLoaded, setIsXLSXFileLoaded] = useState(false);
    const [isPDFFileLoaded, setIsPDFFileLoaded] = useState(false);
    const [disableYandex, setDisableYandex] = useState(true);
    const [objectUrlYandex, setObjectUrl] = useState('');
    const [downloadedXLSXFileData, setDownloadedXLSXFileData] = useState<File>();
    const [downloadedPDFFileData, setDownloadedPDFFileData] = useState<File>();

    // const [yandexData, dispatch] = useReducer(yandexReducer, initialState);

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    const pageIds: { id: string }[] = [];

    const MAX_CONCURRENT_PAGES = 4;
    const START_PAGE = 1;

    const processPdfPages = async (file: ArrayBuffer, endPage: number) => {
        const doc = await pdfjs.getDocument(file).promise;

        const pagesToProcess = Array.from(
            { length: endPage - START_PAGE + 1 },
            (_, i) => START_PAGE + i,
        );

        const processPage = async (pageNumber: number) => {
            const page = await doc.getPage(pageNumber);
            const item = await page.getTextContent();
            const oneArgs: { id: string } = { id: item.items[0].str };
            pageIds.push(oneArgs);

            page.cleanup();
        };

        const promises: Promise<void>[] = [];
        for (let i = 0; i < pagesToProcess.length; i += MAX_CONCURRENT_PAGES) {
            const chunk = pagesToProcess.slice(i, i + MAX_CONCURRENT_PAGES);
            const pagePromises = chunk.map(pageNumber => processPage(pageNumber));
            promises.push(...pagePromises);
            await Promise.all(pagePromises);
        }

        doc.cleanup();

        await Promise.all(promises);
    };

    const getSortedArray = (productList: ProductList): ProductListItem[] => {
        const result: ProductListItem[] = Object.values(
            productList.reduce((acc: Record<string, ProductListItem>, item: ProductListItem) => {
                if (!acc[item.label]) {
                    acc[item.label] = {
                        ...item,
                    };
                } else {
                    //@ts-ignore
                    acc[item.label].id = [...acc[item.label].id, item.id];
                }
                return acc;
            }, {} as Record<string, ProductListItem>),
        );

        return result;
    };

    const sortDuplicatedOrders = (productList: ProductList) => {
        const result = Object.values(
            productList.reduce((acc: Record<string, ProductListItem>, item: ProductListItem) => {
                if (!acc[item.id])
                    acc[item.id] = {
                        ...item,
                    };
                //@ts-ignore
                else acc[item.id].label = [...acc[item.id].label, item.label];
                return acc;
            }, {} as Record<string, ProductListItem>),
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
        setGetYandexPdfData(true);
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
                if (typeof group.id === 'string' && pageIds[i].id === group.id) {
                    pagesForGroup.push(copiedPages[i]);
                } else {
                    for (let j = 0; j < pageIds[i].id.length; j++) {
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
        if (e.target.files) {
            fileReader.readAsArrayBuffer(e.target.files[0]);
            setDownloadedXLSXFileData(e.target.files[0]);
        }

        fileReader.onload = e => {
            if (e.target) {
                setIsXLSXFileLoaded(true);
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

                setYandexProductList(getArgs);
                setDisableYandex(false);
            }
        };
    };

    const handlePDFSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true);
        const reader = new FileReader();

        if (e.target.files) {
            reader.readAsArrayBuffer(e.target.files[0]);
            setDownloadedPDFFileData(e.target.files[0]);
        }

        reader.onload = async () => {
            setIsPDFFileLoaded(true);
            const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
            const timesRomanFont = await pdfDoc.embedFont(fontBytes);
            const finalPDFYandex = await generateFinalPDF(
                pdfDoc,
                reader.result as ArrayBuffer,
                timesRomanFont,
                Multiplier.Yandex,
            );
            const pdfBytes = await finalPDFYandex.save();
            setFinalPDFYandex(finalPDFYandex);
            setPdfBytes(pdfBytes);

            if (finalPDFYandex && pdfBytes) {
                const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                setObjectUrl(URL.createObjectURL(pdfBlob));
                const fileURL = window.URL.createObjectURL(pdfBlob);
                setFileLink(fileURL);
            }
        };

        setLoading(false);
    };

    const onClick = async () => {
        if (finalPDFYandex && pdfBytes) {
            if (objectUrlYandex) {
                URL.revokeObjectURL(objectUrlYandex);
            }
            const alink = document.createElement('a');
            alink.href = fileLink;
            alink.download = `YandexSampleFile_${dateTimeForFileName()}.pdf`;
            alink.click();
        }
    };

    const openFile = () => {
        if (pdfBytes) {
            open(objectUrlYandex);
        }
    };

    return (
        <Box sx={{ margin: '30px 0' }}>
            <Typography variant="h4" mb={2}>
                Yandex Stickers:
            </Typography>
            <div className="card">
                <div className="left-block">
                    <div className="card-button-wrapper">
                        <div className="custom-xlsx-button">
                            <Button
                                className="custom-upload-button"
                                component="label"
                                variant="contained"
                                startIcon={<CloudUploadIcon />}
                            >
                                Выбрать Excel файл
                                <VisuallyHiddenInput
                                    type="file"
                                    onChange={handleXLSXSelected}
                                    accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    id="XLSX"
                                    disabled={loading}
                                />
                            </Button>
                        </div>
                        <div className="custom-pdf-button">
                            <Tooltip
                                title={
                                    disableYandex || loading ? 'Сначала выберите Excel файл' : ''
                                }
                                arrow
                            >
                                <span className='button-wrapper'>
                                    <Button
                                        className="custom-upload-button"
                                        component="label"
                                        variant="contained"
                                        startIcon={<CloudUploadIcon />}
                                        disabled={disableYandex || loading}
                                    >
                                        Выбрать PDF файл
                                        <VisuallyHiddenInput
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handlePDFSelected}
                                            id="PDF_Yandex"
                                            disabled={disableYandex || loading}
                                        />
                                    </Button>
                                </span>
                            </Tooltip>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="right-block">
                        <div className="card-icon-wrapper">
                            <div className="card-file-xlsx">
                                <FontAwesomeIcon
                                    style={{
                                        width: 60,
                                        height: 60,
                                        color: isXLSXFileLoaded ? '#A3B763' : 'grey',
                                    }}
                                    icon={faFileExcel}
                                />
                                <div className="file-uploading-status">
                                    {!isXLSXFileLoaded ? (
                                        <>
                                            <p className="status-text">Выберите файл</p>
                                        </>
                                    ) : disableYandex ? (
                                        <>
                                            <p className="status-text">В процессе</p>
                                            <LinearIndeterminate />
                                        </>
                                    ) : (
                                        <>
                                            <p className="status-text">Файл загружен</p>
                                            <p className="file-name-text">
                                                {downloadedXLSXFileData?.name}
                                            </p>
                                            <p className="file-name-text">
                                                {`${convertBytes(
                                                    downloadedXLSXFileData?.size,
                                                )}, pdf`}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="card-file-pdf">
                                <FontAwesomeIcon
                                    style={{
                                        width: 60,
                                        height: 60,
                                        color: isPDFFileLoaded ? '#A3B763' : 'grey',
                                    }}
                                    icon={faFile}
                                />
                                <div className="file-uploading-status">
                                    {!isPDFFileLoaded ? (
                                        <>
                                            <p className="status-text">Выберите файл</p>
                                        </>
                                    ) : !getYandexPdfData ? (
                                        <>
                                            <p className="status-text">В процессе</p>
                                            <LinearIndeterminate />
                                        </>
                                    ) : (
                                        <>
                                            <p className="status-text">Файл загружен</p>
                                            <p className="file-name-text">
                                                {downloadedPDFFileData?.name}
                                            </p>
                                            <p className="file-name-text">
                                                {`${convertBytes(
                                                    downloadedPDFFileData?.size,
                                                )}, pdf`}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {fileLink.length !== 0 && finalPDFYandex && (
                                <div className="card-preview-file">
                                    <FontAwesomeIcon
                                        style={{
                                            width: 60,
                                            height: 60,
                                            color: '#A3B763',
                                        }}
                                        icon={faBoxOpen}
                                    />
                                    <div className="card-preview-file_info">
                                        <Typography fontWeight="bold">Предпросмотр: </Typography>
                                        <Link onClick={openFile} target="_blank" rel="noreferrer">
                                            Yandex Sample PDF
                                        </Link>
                                    </div>
                                </div>
                            )}
                            {getYandexPdfData && !finalPDFYandex && (
                                <div className="generate-file-container">
                                    <p className="generate-file-text">Генерируем PDF.....</p>
                                    <LinearIndeterminate />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="download-button-container">
                <Button
                    variant="contained"
                    className="custom-download-button"
                    disabled={!finalPDFYandex}
                    type="button"
                    onClick={onClick}
                >
                    Скачать
                </Button>
            </div>
        </Box>
    );
};

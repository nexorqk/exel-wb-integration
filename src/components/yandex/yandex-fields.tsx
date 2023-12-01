import React, { ReactElement, useEffect, useState } from 'react';
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
    getSortedArray,
    sortDuplicatedOrders,
    prepareIndices,
    processPdfPages,
    createPagesGroup,
} from '../../utils';

import { Box, Button, LinearProgress, Link, Tooltip, Typography } from '@mui/material';
import { FONT_URL, Multiplier, YANDEX_ITEMS_KEY, pageSizeYandex } from '../../constants';

// import { initialState, yandexReducer } from './reducer';
import { ExcelRow, PageID, ProductList, YandexProductListItem } from '../../types/common';

import { faFileExcel, faFile, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import UploadButton from '../UploadButton';
import UploadedFileStatus from '../UploadedFileStatus';
import FontAwesomeIcon from '../FontAwesomeIcon';
import ProgressCreationFIle from '../ProgressCreationFIle';

export const LinearIndeterminate = () => {
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

    const [isLoading, setIsLoading] = useState(false);
    const [isXLSXFileLoaded, setIsXLSXFileLoaded] = useState(false);
    const [isPDFFileLoaded, setIsPDFFileLoaded] = useState(false);
    const [disableYandex, setDisableYandex] = useState(true);
    const [objectUrlYandex, setObjectUrl] = useState('');
    const [downloadedXLSXFileData, setDownloadedXLSXFileData] = useState<File>();
    const [downloadedPDFFileData, setDownloadedPDFFileData] = useState<File>();

    const generateStatusText = 'Генерируем файл';

    // const [yandexData, dispatch] = useReducer(yandexReducer, initialState);

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    const pageIds: PageID[] = [];

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

        const getAllIndices = prepareIndices(pageCount);

        await processPdfPages(pdfBuffer, pageIds, countPage, YANDEX_ITEMS_KEY);
        setGetYandexPdfData(true);
        const uniqueOrders = getDuplicatesOrUniques(yandexProductList);
        const comparedArray = compareAndDelete(uniqueOrders, pageIds);

        const duplicatedOrders = getDuplicatesOrUniques(yandexProductList, true);
        const simpleOrders = comparedArray.filter(item => item.count === 1);
        const difficultOrders = comparedArray.filter(item => item.count !== 1);

        const sortedSimpleOrders = getSortedArray(simpleOrders);
        const sortedDuplicatedOrders = sortDuplicatedOrders(duplicatedOrders);

        const sortedArr = [
            ...difficultOrders,
            ...sortedDuplicatedOrders,
            ...sortedSimpleOrders,
        ] as YandexProductListItem[];
        const copiedPages = await finalPdf.copyPages(pdfDocument, getAllIndices);

        sortedArr.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizeYandexPdfPages(pages, pageSizeYandex);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            const text = wrapText(generateYandexText(group), 200, font, 18).replace(/\//gm, '');
            const pagesForGroup: PDFPage[] = [];

            drawTextOnPagesYandex(lastPage, text, timesRomanFont);

            createPagesGroup(group, pageCount, pagesForGroup, copiedPages, pageIds);

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
        setIsLoading(true);
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

        setIsLoading(false);
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
                            <UploadButton
                                onChange={handleXLSXSelected}
                                disabled={isLoading}
                                className="custom-upload-button"
                                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                rootNode="label"
                                id="XLSX"
                                label="Выбрать Excel файл"
                            />
                        </div>
                        <div className="custom-pdf-button">
                            <Tooltip
                                title={
                                    disableYandex || isLoading ? 'Сначала выберите Excel файл' : ''
                                }
                                arrow
                            >
                                <span className="button-wrapper">
                                    <UploadButton
                                        onChange={handlePDFSelected}
                                        disabledButton={disableYandex || isLoading}
                                        className="custom-upload-button"
                                        accept="application/pdf"
                                        rootNode="label"
                                        id="PDF_Yandex"
                                        label="Выбрать PDF файл"
                                    />
                                </span>
                            </Tooltip>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="right-block">
                        <div className="card-icon-wrapper">
                            <UploadedFileStatus
                                size={{
                                    width: 60,
                                    heigth: 60,
                                }}
                                className="card-file-xlsx"
                                isFileLoaded={isXLSXFileLoaded}
                                secondCondition={disableYandex}
                                fileName={downloadedXLSXFileData?.name}
                                fileSize={convertBytes(downloadedXLSXFileData?.size)}
                                fileType={'xlsx'}
                                fileIcon={faFileExcel}
                            />
                            <UploadedFileStatus
                                size={{
                                    width: 60,
                                    heigth: 60,
                                }}
                                className="card-file-pdf"
                                isFileLoaded={isPDFFileLoaded}
                                secondCondition={!getYandexPdfData}
                                fileName={downloadedPDFFileData?.name}
                                fileSize={convertBytes(downloadedPDFFileData?.size)}
                                fileType="pdf"
                                fileIcon={faFile}
                            />
                            {fileLink.length !== 0 && finalPDFYandex && (
                                <div className="card-preview-file">
                                    <FontAwesomeIcon
                                        icon={faBoxOpen}
                                        width={60}
                                        height={60}
                                        color="#A3B763"
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
                                <ProgressCreationFIle statusText={generateStatusText} />
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

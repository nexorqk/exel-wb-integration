/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfjs } from 'react-pdf';
import {
    wrapText,
    setWorkerSrc,
    resizeOzonPdfPages,
    drawTextOnPagesOzon,
    generateOzonText,
    getDuplicatesOrUniques,
    convertBytes,
    dateTimeForFileName,
    getSortedArray,
    sortDuplicatedOrders,
    prepareIndices,
    processPdfPages,
    createPagesGroup,
} from '../../utils';
import '../../App';
import { FONT_URL, Multiplier, OZON_ITEMS_KEY, pageSizeOzon } from '../../constants';

import { ProductList, ExcelRow, ProductListItem, PageID } from '../../types/common';
import { Box, Button, Link, Tooltip, Typography } from '@mui/material';
import UploadButton from '../UploadButton';
import UploadedFileStatus from '../UploadedFileStatus';
import FontAwesomeIcon from '../FontAwesomeIcon';
import { faFileExcel, faFile, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import ProgressCreationFIle from '../ProgressCreationFIle';

export const OzonFields = (): ReactElement => {
    const [ozonProductList, ozonSetProductList] = useState<ProductList>([]);
    const [getOzonPdfData, setGetOzonPdfData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [disableOzon, setDisableOzon] = useState(true);
    const [finalPDFOzon, setFinalPDFOzon] = useState<PDFDocument>();
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const [fileLink, setFileLink] = useState('');
    const [isXLSXFileLoaded, setIsXLSXFileLoaded] = useState(false);
    const [isPDFFileLoaded, setIsPDFFileLoaded] = useState(false);
    const [downloadedXLSXFileData, setDownloadedXLSXFileData] = useState<File>();
    const [downloadedPDFFileData, setDownloadedPDFFileData] = useState<File>();
    const [objectUrlOzon, setObjectUrl] = useState('');
    const [generateStatusText, setGenerateStatusText] = useState('Генерируем файл');

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

        await processPdfPages(pdfBuffer, pageIds, countPage, OZON_ITEMS_KEY);
        setGetOzonPdfData(true);

        const uniqueOrders = getDuplicatesOrUniques(ozonProductList);
        const duplicatedOrders = getDuplicatesOrUniques(ozonProductList, true);
        const simpleOrders = uniqueOrders.filter(item => item.count === 1);
        const difficultOrders = uniqueOrders.filter(item => item.count !== 1);

        const sortedSimpleOrders = getSortedArray(simpleOrders);
        const sortedDuplicatedOrders = sortDuplicatedOrders(duplicatedOrders);

        const sortedArr = [...difficultOrders, ...sortedDuplicatedOrders, ...sortedSimpleOrders];

        const copiedPages = await finalPdf.copyPages(pdfDocument, getAllIndices);

        sortedArr.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizeOzonPdfPages(pages, pageSizeOzon);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            const { label, count, id, article } = group as ProductListItem;

            const text = wrapText(
                generateOzonText(label, count!, id, article!),
                200,
                font,
                20,
            ).replace(/\//gm, '');
            const pagesForGroup: PDFPage[] = [];

            drawTextOnPagesOzon(lastPage, text, timesRomanFont);

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
                const data: ExcelRow[] = XLSX.utils.sheet_to_json(ws);

                const articleName = Object.keys(data[0]);

                const getArgs = data.map((el: ExcelRow) => ({
                    id: el['Номер отправления'],
                    label: el['Наименование товара'],
                    count: Number(el['Количество']),
                    article: el['Артикул'] ?? el[articleName[9]],
                }));

                const getSortedArr: ProductList = getArgs.sort(
                    (a, b) => Number(a.id) - Number(b.id),
                );

                ozonSetProductList(getSortedArr);
                setDisableOzon(false);
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

        setLoading(false);
    };

    const onClick = async () => {
        if (finalPDFOzon && pdfBytes) {
            if (objectUrlOzon) {
                URL.revokeObjectURL(objectUrlOzon);
            }
            const alink = document.createElement('a');
            alink.href = fileLink;
            alink.download = `OzonSampleFile_${dateTimeForFileName()}.pdf`;
            alink.click();
        }
    };

    const openFile = () => {
        if (pdfBytes) {
            open(objectUrlOzon);
        }
    };

    return (
        <>
            <Box sx={{ margin: '30px 0' }}>
                <Typography variant="h4" mb={2}>
                    Ozon Stickers:
                </Typography>
                <div className="card">
                    <div>
                        <div className="left-block">
                            <div className="card-button-wrapper">
                                <div className="custom-xlsx-button">
                                    <UploadButton
                                        onChange={handleXLSXSelected}
                                        disabled={loading}
                                        className="custom-upload-button"
                                        accept=".csv"
                                        rootNode="label"
                                        id="XLSX"
                                        label="Выбрать CSV файл"
                                    />
                                </div>
                                <div className="custom-pdf-button">
                                    <Tooltip
                                        title={
                                            disableOzon || loading
                                                ? 'Сначала выберите CSV файл'
                                                : ''
                                        }
                                        arrow
                                    >
                                        <span className="button-wrapper">
                                            <UploadButton
                                                onChange={handlePDFSelected}
                                                disabledButton={disableOzon || loading}
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
                                    secondCondition={disableOzon}
                                    fileName={downloadedXLSXFileData?.name}
                                    fileSize={convertBytes(downloadedXLSXFileData?.size)}
                                    fileType="csv"
                                    fileIcon={faFileExcel}
                                />
                                <UploadedFileStatus
                                    size={{
                                        width: 60,
                                        heigth: 60,
                                    }}
                                    className="card-file-pdf"
                                    isFileLoaded={isPDFFileLoaded}
                                    secondCondition={!getOzonPdfData}
                                    fileName={downloadedPDFFileData?.name}
                                    fileSize={convertBytes(downloadedPDFFileData?.size)}
                                    fileType="pdf"
                                    fileIcon={faFile}
                                />
                                {fileLink.length !== 0 && finalPDFOzon && (
                                    <div className="card-preview-file">
                                        <FontAwesomeIcon
                                            icon={faBoxOpen}
                                            width={60}
                                            height={60}
                                            color="#A3B763"
                                        />
                                        <div className="card-preview-file_info">
                                            <Typography fontWeight="bold">
                                                Предпросмотр:{' '}
                                            </Typography>
                                            <Link
                                                onClick={openFile}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Ozon Sample PDF
                                            </Link>
                                        </div>
                                    </div>
                                )}
                                {getOzonPdfData && !finalPDFOzon && (
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
                        disabled={!finalPDFOzon}
                        type="button"
                        onClick={onClick}
                    >
                        Скачать
                    </Button>
                </div>
            </Box>
        </>
    );
};

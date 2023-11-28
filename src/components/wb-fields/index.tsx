import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfjs } from 'react-pdf';
import {
    resizePdfPages,
    wrapText,
    drawTextOnPages,
    setWorkerSrc,
    getPDFText,
    generateWBText,
    dateTimeForFileName,
    convertBytes,
} from '../../utils';
import { FONT_URL, Multiplier } from '../../constants';
import { ProductList, AccomulatorItem, Accomulator, ExcelRow } from '../../types/common';
import { Box, Button, Link, Tooltip, Typography } from '@mui/material';
import UploadButton from '../UploadButton';
import UploadedFileStatus from '../UploadedFileStatus';
import FontAwesomeIcon from '../FontAwesomeIcon';
import { LinearIndeterminate } from '../yandex/yandex-fields';
import { faFileExcel, faFile, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

export const WBFields = (): ReactElement => {
    const [productList, setProductList] = useState<ProductList>([]);
    const [getWBPdfData, setGetWBPdfData] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [disableWB, setDisableWB] = useState(true);
    const [finalPDFWB, setFinalPDFWB] = useState<PDFDocument>();
    const [mergedPDF, setMergedPDF] = useState<PDFDocument>();
    const [objectUrl, setObjectUrl] = useState('');
    const [finalPDFList, setFinalPDFList] = useState<PDFDocument[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [downloadedXLSXFileData, setDownloadedXLSXFileData] = useState<File>();
    const [downloadedPDFFileData, setDownloadedPDFFileData] = useState<File>();
    const [isXLSXFileLoaded, setIsXLSXFileLoaded] = useState(false);
    const [isPDFFileLoaded, setIsPDFFileLoaded] = useState(false);
    const [fileLink, setFileLink] = useState('');
    const [pdfBytes, setPdfBytes] = useState<Uint8Array>();
    const [isFileReady, setIsFileReady] = useState(false);

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    useEffect(() => {
        if (finalPDFWB) {
            setFinalPDFList(currentValue => {
                return [...currentValue, finalPDFWB];
            });
        }
    }, [finalPDFWB]);

    useEffect(() => {
        if (uploadedFiles.length === finalPDFList.length && uploadedFiles.length > 0) {
            const mergePDF = async () => {
                const mergedPDF = await PDFDocument.create();

                for (let i = 0; i < finalPDFList.length; i++) {
                    const copiedPages = await mergedPDF.copyPages(
                        finalPDFList[i],
                        finalPDFList[i].getPageIndices(),
                    );
                    copiedPages.forEach(page => mergedPDF.addPage(page));
                }
                return mergedPDF;
            };
            const setMergedPDFDocument = async () => {
                const mergedPDFDocument = await mergePDF();
                setMergedPDF(mergedPDFDocument);
            };
            setMergedPDFDocument();
        }
    }, [finalPDFList]);

    const getSortedArray = (productList: ProductList) => {
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
            // @ts-ignore
            article: el.article,
        }));

        const result = Object.values(
            arr.reduce((acc: Accomulator, item: AccomulatorItem) => {
                if (!acc[item.label])
                    acc[item.label] = {
                        ...item,
                    };
                //@ts-ignore
                else acc[item.label].id = [].concat(acc[item.label].id, item.id) as string[];
                return acc;
            }, {}),
        );

        const sortedArray = result.map(el => ({
            ...el,
            countOrder: typeof el.id === 'string' ? 1 : el.id.length,
            text: `${typeof el.id === 'string' ? 1 : el.id.length} шт. заказов
            
            ${el.label}
          `,
        }));

        return sortedArray;
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
            const allPages: number[] = [];

            for (let i: number = 0; i < pageCount.length; i++) {
                allPages.push(i);
            }
            return allPages;
        };

        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        const pageIds: { id: string }[] = [];
        for (let index = 1; index <= pageCount.length; index++) {
            const id = await getPDFText(pdfBuffer, index);

            if (id) pageIds.push({ id: id });
        }

        const getSortedProductList = pageIds.map(id => {
            const equalProduct = productList.find((product: any) => {
                return product.id === id.id;
            });

            return {
                id: equalProduct?.id,
                label: equalProduct?.label,
                article: equalProduct?.article,
            };
        });

        const productGroups = getSortedArray(getSortedProductList as any);

        productGroups.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizePdfPages(pages);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);

            const text = wrapText(generateWBText(group), 400, font, 25);
            const pagesForGroup: PDFPage[] = [];

            drawTextOnPages(lastPage, text, timesRomanFont);

            for (let i = 0; i < pageCount.length; i++) {
                if (typeof group.id === 'string' && pageIds[i].id === group.id) {
                    pagesForGroup.push(copiedPages[i]);
                } else {
                    for (let j = 0; j < group.id.length; j++) {
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
        setFinalPDFWB(finalPdf);
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
                    id: el['Стикер'],
                    label: el['Наименование'],
                    article: el['Артикул продавца'] ?? el[articleName[13]],
                }));

                const getSortedArr: ProductList = getArgs.sort(
                    (a, b) => Number(a.id) - Number(b.id),
                );

                setProductList(getSortedArr);
                setDisableWB(false);
            }
        };
    };

    const handlePDFSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsLoading(true);

        //@ts-ignore
        const files = Object.values(e.target.files);

        if (e.target.files?.length === 1) {
            setDownloadedPDFFileData(e.target.files[0]);
        }

        if (e.target.files) {
            setUploadedFiles(files);
            for (let i = 0; i < e.target.files.length; i++) {
                const onLoad = async () => {
                    const reader = new FileReader();
                    reader.readAsArrayBuffer(files[i]);
                    reader.onloadend = async () => {
                        setIsPDFFileLoaded(true);
                        const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
                        pdfDoc.registerFontkit(fontkit);
                        const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
                        const timesRomanFont = await pdfDoc.embedFont(fontBytes);
                        await generateFinalPDF(
                            pdfDoc,
                            reader.result as ArrayBuffer,
                            timesRomanFont,
                            Multiplier.OZON,
                        );
                    };
                };
                await onLoad();
            }

            if (finalPDFWB && pdfBytes) {
                const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                setObjectUrl(URL.createObjectURL(pdfBlob));
                const fileURL = window.URL.createObjectURL(pdfBlob);
                setFileLink(fileURL);
            }

            setIsLoading(false);
            setGetWBPdfData(true);
        }
    };

    useEffect(() => {
        const getFinalFile = async () => {
            if (!mergedPDF) return;
            const pdfBytes1 = await mergedPDF.save();
            console.log('pdfBytes1 : >>', pdfBytes1);
            setPdfBytes(pdfBytes1);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            const pdfBlob = new Blob([pdfBytes1!], { type: 'application/pdf' });
            setObjectUrl(URL.createObjectURL(pdfBlob));
            const fileURL = window.URL.createObjectURL(pdfBlob);
            setIsFileReady(true);
            setFileLink(fileURL);
        };

        getFinalFile();
    }, [mergedPDF]);

    const onClick = async () => {
        if (finalPDFWB && pdfBytes) {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        }
        const alink = document.createElement('a');
        alink.href = fileLink;
        alink.download = `WBSampleFile_${dateTimeForFileName()}.pdf`;
        alink.click();
    };

    const openFile = () => {
        if (pdfBytes) {
            open(objectUrl);
        }
    };

    return (
        <>
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
                                        disableWB || isLoading ? 'Сначала выберите Excel файл' : ''
                                    }
                                    arrow
                                >
                                    <span className="button-wrapper">
                                        <UploadButton
                                            onChange={handlePDFSelected}
                                            disabledButton={disableWB || isLoading}
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
                                    secondCondition={disableWB}
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
                                    secondCondition={!getWBPdfData}
                                    fileName={downloadedPDFFileData?.name}
                                    fileSize={convertBytes(downloadedPDFFileData?.size)}
                                    fileType="pdf"
                                    fileIcon={faFile}
                                />
                                {fileLink.length !== 0 && finalPDFWB && (
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
                                                Yandex Sample PDF
                                            </Link>
                                        </div>
                                    </div>
                                )}
                                {getWBPdfData && !isFileReady && (
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
                        disabled={!isFileReady}
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

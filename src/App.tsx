import React, { ReactElement, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Progress, Tooltip, Whisper } from 'rsuite';
import { pdfjs } from 'react-pdf';
import { resizePdfPages, wrapText, drawTextOnPages, setWorkerSrc, getPDFText } from './utils';
import { FONT_URL, Multiplier } from './constants';
import { OzonFields } from './components/ozon-fields';
import './App.css';
import 'rsuite/dist/rsuite.min.css';
import { ProductList, AccomulatorItem, Accomulator, ExcelRow } from './types/common';

export const App = (): ReactElement => {
    const [productList, setProductList] = useState<ProductList>([]);
    const [getPdfData, setGetPdfData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [disable, setDisable] = useState(true);
    const [percent, setPercent] = useState(0);
    const [finalPDF, setFinalPDF] = useState<PDFDocument>();
    const [mergedPDF, setMergedPDF] = useState<PDFDocument>();
    const [objectUrl, setObjectUrl] = useState('');
    const [finalPDFList, setFinalPDFList] = useState<PDFDocument[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const status = percent === 100 ? 'success' : 'active';
    const color = percent === 100 ? '#8a2be2' : '#02749C';

    useEffect(() => {
        setWorkerSrc(pdfjs);
    });

    useEffect(() => {
        if (finalPDF) {
            //@ts-ignore
            setFinalPDFList(currentValue => {
                return [...currentValue, finalPDF];
            });
        }
    }, [finalPDF]);

    useEffect(() => {
        if (uploadedFiles.length === finalPDFList.length && uploadedFiles.length > 0) {
            const mergePDF = async () => {
                const mergedPDF = await PDFDocument.create();

                for (let i = 0; i < finalPDFList.length; i++) {
                    const copiedPages = await mergedPDF.copyPages(finalPDFList[i], finalPDFList[i].getPageIndices());
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
            const allPages = [];

            for (let i = 0; i < pageCount.length; i++) {
                allPages.push(i);
            }
            return allPages;
        };

        const copiedPages = await finalPdf.copyPages(pdfDocument, prepareIndices());

        const pageIds: string[] = [];
        for (let index = 1; index <= pageCount.length; index++) {
            const id = await getPDFText(pdfBuffer, index);
            const getPercent = 100 / pageCount.length;
            setPercent(getPercent * index);

            if (id) pageIds.push(id);
        }

        const getSortedProductList = pageIds.map(id => {
            const equalProduct = productList.find((product: any) => {
                return product.id === id;
            });

            return { id: equalProduct?.id, label: equalProduct?.label };
        });

        const productGroups = getSortedArray(getSortedProductList as any);

        productGroups.forEach(async group => {
            finalPdf.addPage();
            const pages = finalPdf.getPages();
            resizePdfPages(pages);
            const finalPageCount = finalPdf.getPageCount();
            const lastPage = finalPdf.getPage(finalPageCount - 1);
            const text = wrapText(group.text, 400, font, 25);
            const pagesForGroup: PDFPage[] = [];

            drawTextOnPages(lastPage, text, timesRomanFont);

            for (let i = 0; i < pageCount.length; i++) {
                if (typeof group.id === 'string' && pageIds[i] === group.id) {
                    pagesForGroup.push(copiedPages[i]);
                } else {
                    for (let j = 0; j < group.id.length; j++) {
                        if (group.id[j] === pageIds[i]) {
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
        setFinalPDF(finalPdf);
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
                const data: ExcelRow[] = XLSX.utils.sheet_to_json(ws);

                const getArgs = data.map((el: ExcelRow) => ({
                    id: el['Стикер'],
                    label: el['Название товара'],
                }));

                const getSortedArr: ProductList = getArgs.sort((a, b) => Number(a.id) - Number(b.id));

                setProductList(getSortedArr);
                setDisable(false);
            }
        };
    };

    const handlePDFSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true);

        //@ts-ignore
        const files = Object.values(e.target.files);

        if (e.target.files) {
            setUploadedFiles(files);
            for (let i = 0; i < e.target.files.length; i++) {
                const onLoad = async () => {
                    const reader = new FileReader();
                    reader.readAsArrayBuffer(files[i]);
                    reader.onloadend = async () => {
                        const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
                        pdfDoc.registerFontkit(fontkit);
                        const fontBytes = await fetch(FONT_URL).then(res => res.arrayBuffer());
                        const timesRomanFont = await pdfDoc.embedFont(fontBytes);
                        await generateFinalPDF(
                            pdfDoc,
                            reader.result as ArrayBuffer,
                            timesRomanFont,
                            Multiplier.WILDBERRIES,
                        );
                    };
                };
                await onLoad();
            }

            setLoading(false);

            setGetPdfData(true);
            setDisable(true);
        }
    };

    const onClick = async () => {
        if (!mergedPDF) return;
        const pdfBytes1 = await mergedPDF.save();
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        const pdfBlob = new Blob([pdfBytes1]);
        setObjectUrl(URL.createObjectURL(pdfBlob));
        const fileURL = window.URL.createObjectURL(pdfBlob);
        const alink = document.createElement('a');
        alink.href = fileURL;
        alink.download = 'SamplePDF.pdf';
        alink.click();
    };

    return (
        <div className="root">
            <h1 className="logo-title">WB OZON Stickers</h1>
            <aside className="rules-article">
                <ul style={{ listStyle: 'decimal' }}>
                    <li>Загрузите Excel-файл</li>
                    <li>Загрузите PDF-файл (выберите несколько через ctrl)</li>
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
                                    multiple
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

                    <button className="button" disabled={!mergedPDF} type="button" onClick={() => onClick()}>
                        Скачать
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
                                {!mergedPDF ? 'В процессе...' : 'Готово к скачиванию!'}
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

import React, { ReactElement, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Progress } from "rsuite";
import { pdfjs } from "react-pdf";
import { Loader } from "./components/loader";
import {
  resizePdfPages,
  wrapText,
  drawTextOnPages,
  setWorkerSrc,
} from "./utils";
import "./App.css";
import "rsuite/dist/rsuite.min.css";
import { FONT_URL } from "./constants";

const App = (): ReactElement => {
  const [productList, setProductList] = useState(null) as any;
  const [getPdfData, setGetPdfData] = useState(false);
  const [pdfPageLength, setPdfPageLength] = useState(0) as any;
  const [loading, setLoading] = useState(false);
  const [disable, setDisable] = useState(true);

  const [percent, setPercent] = useState(0);

  if (loading) {
    return <Loader />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setWorkerSrc(pdfjs);
  });

  const status = percent === pdfPageLength ? "success" : "active";
  const color = percent === pdfPageLength ? "#8a2be2" : "#02749C";

  const getPDFText = async (file: any, number: number) => {
    const doc = await pdfjs.getDocument(file).promise;
    const page = await doc.getPage(number);
    // const doc = await pdfJS.getDocument(src).promise;
    const test = await page.getTextContent();
    // @ts-ignore
    const item: any = test.items.find((item) => item.str.length === 4);

    return item.str;
  };

  const getXLSXData = async (e: any) => {
    const fileReader = await new FileReader();
    fileReader.readAsArrayBuffer(e.target.files[0]);

    fileReader.onload = (e: any) => {
      const bufferArray = e?.target.result;
      const wb = XLSX.read(bufferArray, { type: "buffer" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const getArgs = data.map((el: any) => ({
        id: el["Стикер"].slice(-4),
        label: el["Название товара"],
      }));

      console.log("getArgs", getArgs);

      const getSortedArr = getArgs.sort((a, b) => a.id - b.id);
      // console.log(getSortedArr);

      setProductList(getSortedArr);
      setDisable(false);
    };
  };

  const handlePDFSelected = (e: any) => {
    // setLoading(true);
    setGetPdfData(true);
    setDisable(true);
    const files: any = e.target.files[0];

    const reader = new FileReader();
    reader.readAsArrayBuffer(files);

    reader.onload = async () => {
      const pdfDoc = await PDFDocument.load(reader.result as any);
      pdfDoc.registerFontkit(fontkit);
      const pages = pdfDoc.getPages();

      // pdfDoc.addPage(pdfDocPage)
      // Insert the second copied page to index 0, so it will be the
      // first page in `pdfDoc`

      setPdfPageLength(pages.length);
      const fontBytes = await fetch(FONT_URL).then((res) => res.arrayBuffer());
      const timesRomanFont = await pdfDoc.embedFont(fontBytes);

      const { width } = pages[0].getMediaBox();

      resizePdfPages(pages);

      let idList = [];

      for (let index = 1; index <= 5; index++) {
        const id = await getPDFText(reader.result, index);
        setPercent(index);
        idList.push(id);
      }

      const sortedProducts = idList.map((id) => {
        const equalProduct = productList.find((product: any) => {
          return product.id === id;
        });

        return [equalProduct.id, `${equalProduct.label}`];
      });
      // console.log('sortedProducts', sortedProducts);

      sortedProducts.forEach(async (product, index) => {
        // console.log('product[1]', product[1]);

        const text = wrapText(product[1], width * 0.75, timesRomanFont, 6);
        const countOrder: number = text.includes("упак")
          ? parseInt(text.slice(-11))
          : 0;
        console.log(countOrder);

        for (let index = 1; index <= countOrder; index++) {
          let onceOrder;
          if (index === 1) {
            onceOrder = `${index} упаковка`;
          }

          if (index > 1 && index < 5) {
            onceOrder = `${index} упаковки`;
          }

          if (index >= 5) {
            onceOrder = `${index} упаковок`;
          }
          console.log(onceOrder);
        }

        if (countOrder > 0) {
          const [pdfDocPage] = await pdfDoc.copyPages(pdfDoc, [index]);
          const toInsertPage = pdfDoc.insertPage(index + 2, pdfDocPage);
          drawTextOnPages(toInsertPage, text, timesRomanFont);
        }

        drawTextOnPages(pages[index], text, timesRomanFont);
      });

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save();
      //   setLoading(false);
      //@ts-ignore
      window.download(pdfBytes, "1-1.pdf", "application/pdf");
    };
  };

  return (
    <>
      <div className="row App">
        <div className="input-block">
          <label htmlFor="XLSX" className="btn">
            Choose Excel file
          </label>
          <input
            type="file"
            onChange={(e) => getXLSXData(e)}
            accept="application/xlsx"
            className="XLSX-file"
            id="XLSX"
            name="XLSX_file"
          />
        </div>
        <div className="input-block">
          <label htmlFor="PDF" className="btn">
            Choose PDF file
          </label>
          <input
            type="file"
            onChange={handlePDFSelected}
            placeholder="Choose 11"
            accept="application/pdf"
            className="PDF-file"
            id="PDF"
            name="PDF_file"
            disabled={disable}
          />
        </div>
        <button
          className="button"
          type="button"
          onClick={(e) => console.log(e)}
        >
          Confirm
        </button>
      </div>
      {!disable && (
        <div className="excel-downloaded">
          <div className="excel-downloaded-bar">
            <p className="excel-downloaded-label">
              'Excel file was downloaded'
            </p>
          </div>
        </div>
      )}
      {getPdfData && (
        <div className="progress">
          <div className="progress-bar">
            <label className="progress-label" htmlFor="progress">
              {status !== "success" ? "Active" : "Downloaded"}
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
    </>
  );
};

export default App;

import React, { ReactElement, useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import "./App.css";
import { resizePdfPages, wrapText, drawTextOnPages } from "./utils";
import * as XLSX from "xlsx";
import { pdfJsText } from "./pdf";

const App = (): ReactElement => {
  const [productList, setProductList] = useState(null) as any;

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

      const getSortedArr = getArgs.sort((a, b) => a.id - b.id);

      setProductList(getSortedArr);
    };
  };

  const handlePDFSelected = (e: any) => {
    const files: any = e.target.files[0];

    const reader = new FileReader();
    reader.readAsArrayBuffer(files);

    reader.onload = async () => {
      const pdfDoc = await PDFDocument.load(reader.result as any);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const { width } = pages[0].getMediaBox();
      const text = wrapText(
        "This text was added with JavaScript te xtsa dhsdf ksdj f;dsj fd;s lfj dslf kjl!",
        width,
        helveticaFont,
        6
      );
      pdfJsText(reader.result);

      resizePdfPages(pages);

      drawTextOnPages(pages, text, helveticaFont);

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save();

      // Trigger the browser to download the PDF document
      //@ts-ignore
      window.download(pdfBytes, "1-1.pdf", "application/pdf");
    };
  };

  return (
    <>
      <div className="row App">
        <input
          type="file"
          onChange={(e) => getXLSXData(e)}
          accept="application/xlsx"
          className="XLSX-file"
          id="XLSX"
          name="XLSX_file"
        />
        <input
          type="file"
          onChange={handlePDFSelected}
          accept="application/pdf"
          className="PDF-file"
          id="PDF"
          name="PDF_file"
        />
        <button type="button" onClick={() => {}}>
          Confirm
        </button>
      </div>
    </>
  );
};

export default App;

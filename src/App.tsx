import React, { ReactElement, useState, useEffect } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import "./App.css";
import { resizePdfPages, wrapText, drawTextOnPages } from "./utils";

const App = (): ReactElement => {
  // const pagescount = pdfFile.getPages().length;

  const handleFileSelected = (e: any) => {
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
          onChange={handleFileSelected}
          accept="application/pdf"
          className="file"
          id="myfile"
          name="myfile"
        />
        <button type="button" onClick={() => {}}>
          Confirm
        </button>
      </div>
    </>
  );
};

export default App;

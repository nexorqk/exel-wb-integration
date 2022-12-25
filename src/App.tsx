import React, { ReactElement, useState, useEffect } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import "./App.css";
import { resizePdfPages, wrapText, drawTextOnPages } from "./utils";

const App = (): ReactElement => {
  const [pdfFile, setPdfFile] = useState(null) as any;
  const [font, setFont] = useState(null) as any;
  const [pages, setPages] = useState(null) as any;
  const [text, setText] = useState(null) as any;

  useEffect(() => {
    if (pdfFile) setPages(pdfFile.getPages());
    if (font)
      setText(
        wrapText(
          "This text was added with JavaScript textsadhsdfksdjf;dsjfd;slfjdslfkjl!",
          100,
          font,
          6
        )
      );
  }, [font, pdfFile]);

  // const pagescount = pdfFile.getPages().length;

  const handleFileSelected = (e: any) => {
    const files: any = e.target.files[0];
    const reader = new FileReader();

    reader.readAsArrayBuffer(files);

    reader.onload = async () => {
      const pdfDoc = await PDFDocument.load(reader.result as any);
      await setPdfFile(pdfDoc);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      await setFont(helveticaFont);

      if (pages && text && font) {
        resizePdfPages(pages);

        drawTextOnPages(pages, text, font);
      }
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

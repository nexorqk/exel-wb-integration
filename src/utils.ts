import { PDFFont, PDFPage, rgb } from "pdf-lib";
import { pageSize } from "./constants";
import { pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";

export const setWorkerSrc = (data: any) => {
  return (data.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${data.version}/pdf.worker.min.js`);
};

export const wrapText = (
  text: any,
  width: any,
  font: PDFFont,
  fontSize: any
) => {
  const words = text.split(" ");

  let line = "";
  let result = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > width) {
      result += line + "\n";
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  result += line;

  return result;
};

export const resizePdfPages = (pages: any) => {
  const new_size = pageSize;
  const new_size_ratio = Math.round((new_size.width / new_size.height) * 100);

  pages.forEach((page: any) => {
    const { width, height } = page.getMediaBox();
    const size_ratio = Math.round((width / height) * 100);
    // If ratio of original and new format are too different we can not simply scale (more that 1%)
    if (Math.abs(new_size_ratio - size_ratio) > 1) {
      // Change page size
      page.setSize(new_size.width, new_size.height);
      const scale_content = Math.min(
        new_size.width / width,
        new_size.height / height
      );
      // Scale content
      page.scaleContent(scale_content, scale_content);
    } else {
      page.scale(new_size.width / width, new_size.height / height);
    }
  });
};

export const drawTextOnPages = (page: PDFPage, text: string, font: PDFFont) => {
  page.drawText(text, {
    x: 5,
    y: 110,
    size: 8,
    font: font,
    lineHeight: 8,
    color: rgb(0, 0, 0),
  });
};

export const getPDFText = async (file: any, number: number) => {
  // console.log("start pdf text");

  const doc = await pdfjs.getDocument(file).promise;
  // console.log("get doc");
  const page = await doc.getPage(number);
  // console.log("get page");
  // const doc = await pdfJS.getDocument(src).promise;
  const test = await page.getTextContent();
  // console.log("get test");
  // @ts-ignore
  const item: any = test.items.find((item) => item.str.length === 4);
  // console.log("get item");
  // console.log(item);

  return item.str;
};

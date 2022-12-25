/* eslint-disable react/jsx-no-comment-textnodes */
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './App.css';

const App = (): ReactElement => {
  const [uploadFile, setUploadFile] = useState('')

  const ref = useRef('');

  // useEffect(() => {
  //   if (ref.current !== null) {
  //     //@ts-ignore
  //     // ref.current.setAttribute("directory", "");
  //     //@ts-ignore
  //     ref.current.setAttribute("webkitdirectory", '');
  //   }
  // }, [ref]);

	const modifyPdf = async (): Promise<void> => {
		// Fetch an existing PDF document
		const url = 'https://pdf-lib.js.org/assets/with_update_sections.pdf';
		// const url = `${uploadFile}`;
		const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
		// const existingPdfBytes = url

		// Load a PDFDocument from the existing PDF bytes
		const pdfDoc1 = await PDFDocument.load(existingPdfBytes);

		// Embed the Helvetica font
		const helveticaFont = await pdfDoc1.embedFont(StandardFonts.Helvetica);

		// Get the first page of the document
		const pages = pdfDoc1.getPages();
		const firstPage = pages[0];

		// Get the width and height of the first page
		const { width, height } = firstPage.getSize();

		// Draw a string of text diagonally across the first page
		firstPage.drawText('This text was added with JavaScript!', {
			x: 5,
			y: height / 2 + 300,
			size: 50,
			font: helveticaFont,
			color: rgb(0.95, 0.1, 0.1),
			rotate: degrees(-45),
		});

		// Serialize the PDFDocument to bytes (a Uint8Array)
		const pdfBytes = await pdfDoc1.save();

		// Trigger the browser to download the PDF document
		//@ts-ignore
		window.download(pdfBytes, 'pdf-lib_modification_example.pdf', 'application/pdf');
		// return pdfBytes
	};

  const handleFileSelected = (e: any) => {
    // const files: any = Array.from(e.target.files)[0]
    const files: any = new ArrayBuffer(e.target.files)
    // const files: any = (e.target.files)
    console.log("files:", files.name)
    console.log("files:", files.webkitRelativePath)
    console.log("e:", e)
    // setUploadFile(files.webkitRelativePath)
    setUploadFile(files)
  }


	return (
		<>
			<div className="row App">
				{/* <label htmlFor="myfile" className="label">
					Выберите файлы
				// eslint-disable-next-line react/jsx-no-comment-textnodes
				</label> */}
        {/* @ts-expect-error */}
				<input type="file" ref={ref} onChange={handleFileSelected} accept="application/pdf" className="file" id="myfile" name="myfile" />
				<button type="button" onClick={() => modifyPdf()}>
					Confirm
				</button>
			</div>
		</>
	);
};

export default App;

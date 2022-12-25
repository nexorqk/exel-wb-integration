/* eslint-disable react/jsx-no-comment-textnodes */
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './App.css';
import { resizeToPageFormat } from 'utils';

const App = (): ReactElement => {
	const [uploadFile, setUploadFile] = useState('');
	const [pdfDocs, setPdfDocs] = useState() as any;

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
		// const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
		const existingPdfBytes = new ArrayBuffer(uploadFile.length);

		// Load a PDFDocument from the existing PDF bytes
		const pdfDoc1 = await PDFDocument.load(existingPdfBytes);

		// Embed the Helvetica font
		// const helveticaFont = await pdfDoc1.embedFont(StandardFonts.Helvetica);
		const helveticaFont = await pdfDocs.embedFont(StandardFonts.Helvetica);

		// Get the first page of the document
		const pages = pdfDocs.getPages();
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
		// return pdfBytesSW
	};

	const handleFileSelected = (e: any) => {
		const files: any = e.target.files[0];
		// const files: any = new ArrayBuffer(e.target.files)
		// const files: any = (e.target.files)
		const reader = new FileReader();
		reader.readAsArrayBuffer(files);
		reader.onload = async () => {
			const pdfDoc = await PDFDocument.load(reader.result as any);
			// setPdfDocs(pdfDoc)
			const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

			// Get the first page of the document
			const pages = pdfDoc.getPages();
			const pagescount = pdfDoc.getPages().length;
			console.log(pagescount);

			const firstPage = pages[0];

			// Get the width and height of the first page
			const { width, height } = firstPage.getSize();

			const pageSize = {
				width: 192,
				height: 200,
			};

			const new_size = pageSize;
			const new_size_ratio = Math.round((new_size.width / new_size.height) * 100);

			pages.forEach((page) => {
				const { width, height } = page.getMediaBox();
				const size_ratio = Math.round((width / height) * 100);
				// If ratio of original and new format are too different we can not simply scale (more that 1%)
				if (Math.abs(new_size_ratio - size_ratio) > 1) {
					// Change page size
					page.setSize(new_size.width, new_size.height);
					const scale_content = Math.min(new_size.width / width, new_size.height / height);
					// Scale content
					page.scaleContent(scale_content, scale_content);
					const scaled_diff = {
						width: Math.round(new_size.width - scale_content * width),
						height: Math.round(new_size.height - scale_content * height),
					};
					// Center content in new page format
					page.translateContent(
						Math.round(scaled_diff.width / 2),
						Math.round(scaled_diff.height / 2)
					);
				} else {
					page.scale(new_size.width / width, new_size.height / height);
				}
			});

			// Draw a string of text diagonally across the first page
			firstPage.drawText('This text was added with JavaScript!', {
				x: 5,
				y: 20,
				size: 20,
				font: helveticaFont,
				color: rgb(0.95, 0.1, 0.1),
			});

			// Serialize the PDFDocument to bytes (a Uint8Array)
			const pdfBytes = await pdfDoc.save();

			// Trigger the browser to download the PDF document
			//@ts-ignore
			window.download(pdfBytes, '1-1.pdf', 'application/pdf');
			// return pdfBytesSW
		};
		// setUploadFile(files.webkitRelativePath)
		// setUploadFile(files.saveAsBase64())
	};

	return (
		<>
			<div className="row App">
				{/* <label htmlFor="myfile" className="label">
					Выберите файлы
				// eslint-disable-next-line react/jsx-no-comment-textnodes
				</label> */}
				<input
					type="file"
					onChange={handleFileSelected}
					accept="application/pdf"
					className="file"
					id="myfile"
					name="myfile"
				/>
				<button type="button" onClick={() => modifyPdf()}>
					Confirm
				</button>
			</div>
		</>
	);
};

export default App;

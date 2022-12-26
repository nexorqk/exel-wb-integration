import React, { ReactElement, useState } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import './App.css';
import { resizePdfPages, wrapText, drawTextOnPages } from './utils';
import * as XLSX from 'xlsx';

import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const App = (): ReactElement => {
	const [productList, setProductList] = useState(null) as any;

	const getPDFText = async (file: any, number: number) => {
		const doc = await pdfjs.getDocument(file).promise;
		//@ts-ignore
		const page = await doc.getPage(number);
		// const doc = await pdfJS.getDocument(src).promise;
		const test = await page.getTextContent();

		//@ts-ignore
		const items = test.items
			//@ts-ignore
			.map((item) => (item.str.length === 4 ? item.str : null))
			.find((el) => el !== null);

		return items;
	};

	const getXLSXData = async (e: any) => {
		const fileReader = await new FileReader();
		fileReader.readAsArrayBuffer(e.target.files[0]);

		fileReader.onload = (e: any) => {
			const bufferArray = e?.target.result;
			const wb = XLSX.read(bufferArray, { type: 'buffer' });
			const wsname = wb.SheetNames[0];
			const ws = wb.Sheets[wsname];
			const data = XLSX.utils.sheet_to_json(ws);

			const getArgs = data.map((el: any) => ({
				id: el['Стикер'].slice(-4),
				label: el['Название товара'],
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
			let arr = [];
			for (let index = 1; index < 10; index++) {
				const text = await getPDFText(reader.result, index);
				arr.push(text);
				console.log(text);
			}

			console.log('arr---------------', arr);

			const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
			const pages = pdfDoc.getPages();
			const { width } = pages[0].getMediaBox();
			const text = wrapText(
				'This text was added with JavaScript te xtsa dhsdf ksdj f;dsj fd;s lfj dslf kjl!',
				width,
				helveticaFont,
				6
			);

			resizePdfPages(pages);

			drawTextOnPages(pages, text, helveticaFont);

			// Serialize the PDFDocument to bytes (a Uint8Array)
			const pdfBytes = await pdfDoc.save();

			//@ts-ignore
			window.download(pdfBytes, '1-1.pdf', 'application/pdf');
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
					/>
				</div>
				<button className='button' type="button" onClick={(e) => console.log(e)}>
					Confirm
				</button>
			</div>
		</>
	);
};

export default App;

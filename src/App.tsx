import React, { ReactElement } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './App.css';

const App = (): ReactElement => {
  const reader = new FileReader();
  const pageSize = {
    width: 192,
    height: 200,
  };

	const new_size_ratio = Math.round((pageSize.width / pageSize.height) * 100);

	const handleFileSelected = (e: any) => {
		const files: any = e.target.files[0];
		reader.readAsArrayBuffer(files);
		reader.onload = async () => {
			const pdfDoc = await PDFDocument.load(reader.result as any);
			const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

			// Get the first page of the document
			const pages = pdfDoc.getPages();
			const pagesCount = pdfDoc.getPages().length;
			console.log(pagesCount);

			const firstPage = pages[0];

			// Get the width and height of the first page
			// const { width, height } = firstPage.getSize();

			pages.forEach((page) => {
				const { width, height } = page.getMediaBox();
				const size_ratio = Math.round((width / height) * 100);
				// If ratio of original and new format are too different we can not simply scale (more that 1%)
				if (Math.abs(new_size_ratio - size_ratio) > 1) {
					// Change page size
					page.setSize(pageSize.width, pageSize.height);
					const scale_content = Math.min(pageSize.width / width, pageSize.height / height);
					// Scale content
					page.scaleContent(scale_content, scale_content);
				} else {
					page.scale(pageSize.width / width, pageSize.height / height);
				}
			});

      const wrapText = (text: any, width: any, font: any, fontSize: any) => {
        const words = text.split(' ');
        let line = '';
        let result = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > width) {
            result += line + '\n';
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        result += line;
        console.log(result);
        
        return result;
      }

      const gettext = wrapText('This text was added with JavaScript textsadhsdfksdjf;dsjfd;slfjdslfkjl!', 100, helveticaFont, 6 )!

			// Draw a string of text diagonally across the first page
			firstPage.drawText(gettext, {
				x: 6,
				y: 110,
				size: 6,
				font: helveticaFont,
        lineHeight: 6,
				color: rgb(0.95, 0.1, 0.1),
			});

			// Serialize the PDFDocument to bytes (a Uint8Array)
			const pdfBytes = await pdfDoc.save();

			// Trigger the browser to download the PDF document
			//@ts-ignore
			window.download(pdfBytes, '1-1.pdf', 'application/pdf');
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
				<button type="button" onClick={()=>{}}>
					Confirm
				</button>
			</div>
		</>
	);
};

export default App;

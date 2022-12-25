import pdfjs from "pdfjs-dist";

export const pdfJsText = async () => {
  const getContent = async (src) => {
    const doc = await pdfjs.getDocument(src).promise;
    const page = await doc.getPage(2);
    return await page.getTextContent();
  };

  const getItems = async (src) => {
    const content = await getContent(src);

    const items = content.items.map((item) => console.log(item.str));
    return items;
  };

  await getItems("./1.pdf");
};

pdfJsText();

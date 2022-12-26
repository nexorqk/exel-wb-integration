import pdfjs from "pdfjs-dist";

export const pdfJsText = async (fileName) => {
  const getContent = async () => {
    const doc = await pdfjs.getDocument(fileName).promise;
    const page = await doc.getPage(2);
    return await page.getTextContent();
  };

  const getItems = async () => {
    const content = await getContent(fileName);

    const items = content.items.map((item) => console.log(item.str));
    return items;
  };

  await getItems();
};

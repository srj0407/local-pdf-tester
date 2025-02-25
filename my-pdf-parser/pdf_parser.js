// pdf_parser.js

import fs from 'fs';
import { getDocument } from 'pdfjs-dist/build/pdf.js'; // Use non-legacy build

// Path to your syllabus file on Windows (update if needed)
const syllabusPath = "../Syllabus 341 Winter 2025_Section_010_V2.pdf";

/**
 * Extracts text from a PDF file using pdf.js.
 * @param {Uint8Array|ArrayBuffer} data - The PDF file data.
 * @returns {Promise<string>} - A promise that resolves to the extracted text.
 */
async function pdfToText(data) {
  // Load the PDF document
  const loadingTask = getDocument(data);
  const pdf = await loadingTask.promise;
  let fullText = "";

  // Loop through each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = "";
    let lastBlock = null;
    const blocks = textContent.items; // Use textContent.items

    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      if (lastBlock !== null && lastBlock.str[lastBlock.str.length - 1] !== ' ') {
        // Use the transform array to check coordinates and insert a newline if needed
        if (block.transform[4] < lastBlock.transform[4]) {
          pageText += "\r\n";
        } else if (
          lastBlock.transform[5] !== block.transform[5] &&
          !/^\s?[a-zA-Z]$/.test(lastBlock.str)
        ) {
          pageText += ' ';
        }
      }
      pageText += block.str;
      lastBlock = block;
    }
    fullText += pageText + "\n\n";
  }
  return fullText;
}

// Read the PDF file into a Buffer and convert it to a Uint8Array
const dataBuffer = fs.readFileSync(syllabusPath);
const uint8ArrayData = new Uint8Array(dataBuffer);

// Run the extraction, then print and write the output to a file
pdfToText(uint8ArrayData)
  .then(fullText => {
    console.log("Extracted Text:\n", fullText);
    fs.writeFileSync("output.txt", fullText, "utf8");
    console.log("Output written to output.txt");
  })
  .catch(error => {
    console.error("Error processing PDF:", error);
  });

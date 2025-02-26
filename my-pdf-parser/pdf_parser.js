// pdf_parser.js

import fs from 'fs';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pdfjsLib;

// Path to your syllabus file on Windows
const syllabusPath = "C:\\Users\\Sam\\Downloads\\Syllabus 341 Winter 2025_Section_010_V2.pdf";

/**
 * Extracts text from a PDF file using pdf.js.
 * @param {Uint8Array|ArrayBuffer} data - The PDF file data.
 * @returns {Promise<string>} - A promise that resolves to the extracted full text.
 */
async function pdfToText(data) {
  const loadingTask = getDocument(data);
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = "";
    let lastBlock = null;
    const blocks = textContent.items;

    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      if (lastBlock !== null && lastBlock.str[lastBlock.str.length - 1] !== ' ') {
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

/**
 * Extracts the TA office hours from the full text.
 * @param {string} text - The full text extracted from the PDF.
 * @returns {string} - The extracted TA office hours.
 */
function extractTAOfficeHours(text) {
  // Look for "Office Hours:" and capture the rest of the line.
  const match = text.match(/Office Hours:\s*(.*?)(\r?\n|$)/i);
  return match ? match[1].trim() : "TA office hours not found.";
}

/**
 * Extracts the grading policy from the full text.
 * This function captures the text between the "Graded Work" and "Grading Scale" headings.
 * @param {string} text - The full text extracted from the PDF.
 * @returns {string} - The extracted grading policy.
 */
function extractGradingPolicy(text) {
  const regex = /Graded Work\s*([\s\S]*?)(?=Grading Scale)/i;
  const match = text.match(regex);
  return match ? match[1].trim() : "Grading policy not found.";
}

// Read the PDF file into a Buffer and convert it to a Uint8Array
const dataBuffer = fs.readFileSync(syllabusPath);
const uint8ArrayData = new Uint8Array(dataBuffer);

// Run the extraction, then extract only the TA office hours and grading policy.
pdfToText(uint8ArrayData)
  .then(fullText => {
    const taOfficeHours = extractTAOfficeHours(fullText);
    const gradingPolicy = extractGradingPolicy(fullText);
    
    const output = `TA Office Hours: ${taOfficeHours}\n\nGrading Policy:\n${gradingPolicy}`;
    
    console.log("Extracted Information:\n", output);
    fs.writeFileSync("output.txt", output, "utf8");
    console.log("Output written to output.txt");
  })
  .catch(error => {
    console.error("Error processing PDF:", error);
  });

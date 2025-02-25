// pages/api/parse-pdf.js

import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist';

// Disable Next.js's default body parser so formidable can process multipart data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Converts a PDF (provided as a Buffer or ArrayBuffer) to text using pdf.js.
 * It loops through each page and extracts the text content.
 *
 * @param {Buffer|ArrayBuffer} data - The PDF file data.
 * @returns {Promise<string>} - A promise resolving to the full extracted text.
 */
async function pdfToText(data) {
  // In Node.js, data is a Buffer; convert it to Uint8Array for pdf.js.
  const uint8ArrayData = data instanceof Buffer ? new Uint8Array(data) : data;
  
  // Load the document
  const loadingTask = getDocument(uint8ArrayData);
  const pdf = await loadingTask.promise;
  let fullText = "";

  // Iterate through each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = "";
    let lastBlock = null;

    // Use the updated property: textContent.items (instead of bidiTexts)
    const blocks = textContent.items;
    for (let k = 0; k < blocks.length; k++) {
      const block = blocks[k];
      if (lastBlock !== null && lastBlock.str[lastBlock.str.length - 1] !== ' ') {
        // Using transform matrix to get x and y coordinates.
        // transform[4] is the x coordinate and transform[5] is the y coordinate.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // Parse the form data with formidable
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      res.status(500).json({ error: 'Error parsing form data' });
      return;
    }

    // Expect the file under the field name "pdf"
    const pdfFile = files.pdf;
    if (!pdfFile) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    try {
      // Read the PDF file into a buffer
      const dataBuffer = fs.readFileSync(pdfFile.path);
      // Convert the PDF to text using our pdf.js–based function
      const fullText = await pdfToText(dataBuffer);

      // Write the output to a text file. On Vercel, use the writable /tmp directory.
      const filePath = process.env.VERCEL
        ? path.join('/tmp', 'output.txt')
        : path.join(process.cwd(), 'output.txt');

      fs.writeFileSync(filePath, fullText, 'utf8');

      // Set headers so that the file downloads as output.txt
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=output.txt');

      // Send the file content as the response
      res.status(200).send(fullText);
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ error: 'Error processing PDF file' });
    }
  });
}

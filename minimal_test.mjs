// minimal_test.mjs

import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";

async function testPDF() {
  // Update this path to your actual PDF file.
  const pdfPath = path.resolve("C:/Users/Sam/Downloads/Syllabus CS340 Winter 2025.pdf");

  // Check if the file exists.
  try {
    await fs.access(pdfPath);
    console.log("File exists:", pdfPath);
  } catch (err) {
    console.error("File not found:", pdfPath);
    process.exit(1);
  }

  // Read the file and log the buffer length.
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    console.log("Buffer length:", dataBuffer.length);

    // Parse the PDF buffer using pdf-parse.
    const data = await pdfParse(dataBuffer);
    console.log("Extracted text length:", data.text.length);
    console.log("First 500 characters of extracted text:\n", data.text.slice(0, 500));
  } catch (err) {
    console.error("Error during pdf-parse:", err);
  }
}

testPDF();

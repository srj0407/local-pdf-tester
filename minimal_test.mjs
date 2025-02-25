import fs from "fs/promises";
import pdfParse from "pdf-parse";
import path from "path";

async function testPDF() {
  const pdfPath = path.resolve("C:/Users/Sam/Downloads/Syllabus CS340 Winter 2025.pdf");
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    console.log("Buffer length:", dataBuffer.length);
    const data = await pdfParse(dataBuffer);
    console.log("Extracted text length:", data.text.length);
    console.log("Extracted text:", data.text.slice(0, 500)); // log first 500 characters
  } catch (err) {
    console.error("Error during pdf-parse:", err);
  }
}

testPDF();

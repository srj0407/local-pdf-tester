// test_pdf_parser.js

import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import { fromPath } from "pdf2pic";
import Tesseract from "tesseract.js";

// --- Helper Functions ---

/**
 * Extracts text from a PDF using pdf-parse.
 * @param {string} pdfPath - The file path to the PDF.
 * @returns {Promise<string>} - The extracted text.
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (err) {
    console.error(`Error reading PDF file '${pdfPath}':`, err);
    throw err;
  }
}

/**
 * Converts PDF pages to images and uses OCR (Tesseract.js) to extract text.
 * @param {string} pdfPath - The file path to the PDF.
 * @returns {Promise<string>} - The OCR-extracted text.
 */
async function extractTextWithOCR(pdfPath) {
  try {
    // Options for pdf2pic conversion. Adjust these settings if needed.
    const options = {
      density: 400,
      saveFilename: "page",
      savePath: "./tmp",
      format: "png",
      width: 1200,
      height: 1600,
    };
    const converter = fromPath(pdfPath, options);

    // Determine the number of pages via pdf-parse.
    const dataBuffer = await fs.readFile(pdfPath);
    const parsed = await pdfParse(dataBuffer);
    const numPages = parsed.numpages;

    let ocrText = "";
    for (let i = 1; i <= numPages; i++) {
      const conversionResult = await converter(i);
      const { data: { text } } = await Tesseract.recognize(conversionResult.path, "eng", {
        logger: m => console.log(`Page ${i}: ${m.status}`)
      });
      ocrText += text + "\n";
      // Remove the temporary image file.
      await fs.unlink(conversionResult.path);
    }
    return ocrText;
  } catch (err) {
    console.error(`Error during OCR processing of PDF file '${pdfPath}':`, err);
    throw err;
  }
}

/**
 * Extracts a section from the text using a given heading.
 * @param {string} text - The complete text.
 * @param {string} sectionHeading - The heading marking the start of the section.
 * @returns {string|null} - The extracted section, or null if not found.
 */
function extractSection(text, sectionHeading) {
  const pattern = new RegExp(`${sectionHeading}\\s*[:\\n]+\\s*(.*?)(?=\\n[A-Z][a-z]|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extracts a section using a start heading and an array of end boundaries.
 * @param {string} text - The complete text.
 * @param {string} startHeading - The heading marking the start of the section.
 * @param {string[]} endBoundaries - An array of strings that indicate the section’s end.
 * @returns {string|null} - The extracted section, or null if not found.
 */
function extractSectionWithBoundaries(text, startHeading, endBoundaries) {
  const boundaryPattern = endBoundaries.map(b => `\\n${b}`).join("|");
  const pattern = new RegExp(`${startHeading}\\s*[:\\n]+\\s*(.*?)(?=${boundaryPattern}|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Iterates over a list of candidate headings and returns the first matching section.
 * @param {string} text - The complete text.
 * @param {string[]} possibleHeadings - Candidate headings.
 * @returns {string|null} - The extracted section, or null.
 */
function extractSectionMultiple(text, possibleHeadings) {
  for (const heading of possibleHeadings) {
    const sectionText = extractSection(text, heading);
    if (sectionText) return sectionText;
  }
  return null;
}

/**
 * Filters lines containing "late" or "penalty" from the text.
 * @param {string} text - The text to filter.
 * @returns {string} - Filtered lines joined by newlines.
 */
function filterLatePolicy(text) {
  const lines = text.split("\n");
  const filtered = lines.filter(line =>
    line.toLowerCase().includes("late") || line.toLowerCase().includes("penalty")
  );
  return filtered.join("\n");
}

/**
 * Processes a PDF file: extracts text (using pdf-parse or OCR) and then extracts sections.
 * @param {string} pdfPath - The file path to the PDF.
 * @returns {Promise<Object>} - An object containing the extracted sections.
 */
async function processPdf(pdfPath) {
  let pdfText = await extractTextFromPDF(pdfPath);
  // If text extraction returns empty text or raw PDF markup, fallback to OCR.
  if (!pdfText.trim() || pdfText.trim().startsWith("%PDF")) {
    pdfText = await extractTextWithOCR(pdfPath);
  }

  // Define sections to extract; adjust headings and boundaries as needed.
  const sections = {
    "Late Policy": {
      headings: ["Homework:"],
      filter: "late_policy"
    },
    "Grading Policy": {
      headings: ["Grading Scale:", "Grading Scale"],
      boundaries: ["Attendance", "Course Policies"]
    },
    "Grading Weights": {
      headings: ["Grade Evaluation:", "Grade Evaluation", "Graded Work:", "Graded Work"],
      boundaries: ["Grading Scale"]
    }
  };

  const extractedData = {};
  for (const [section, params] of Object.entries(sections)) {
    const headings = params.headings || [];
    const boundaries = params.boundaries || null;
    let sectionText = null;
    if (boundaries) {
      for (const heading of headings) {
        sectionText = extractSectionWithBoundaries(pdfText, heading, boundaries);
        if (sectionText) break;
      }
      if (!sectionText) {
        sectionText = extractSectionMultiple(pdfText, headings);
      }
    } else {
      sectionText = extractSectionMultiple(pdfText, headings);
    }

    if (section === "Late Policy" && sectionText) {
      sectionText = filterLatePolicy(sectionText);
    }
    extractedData[section] = sectionText;
  }

  return extractedData;
}

// --- Main Testing Routine ---

async function main() {
  // Adjust the file path to point to your local PDF file.
  // For example, if your file is in your Windows Downloads folder,
  // you can use an absolute path like "C:\\Users\\YourName\\Downloads\\Syllabus CS340 Winter 2025.pdf"
  // On Linux/Mac, adjust the path accordingly.
// Replace with your actual file path.
// For example: "C:\\Users\\Sam\\Downloads\\Syllabus CS340 Winter 2025.pdf"
const pdfPath = path.resolve("C:/Users/Sam/Downloads/Syllabus CS340 Winter 2025.pdf");
  
  try {
    console.log(`Processing ${pdfPath}...`);
    const data = await processPdf(pdfPath);
    const outputPath = pdfPath.replace(/\.pdf$/, ".txt");
    
    let outputContent = `File: ${pdfPath}\n\n`;
    for (const [section, text] of Object.entries(data)) {
      outputContent += `${section}:\n${text}\n\n`;
    }
    await fs.writeFile(outputPath, outputContent, "utf-8");
    console.log(`Output written to ${outputPath}`);
  } catch (err) {
    console.error(`Error processing ${pdfPath}:`, err);
  }
}

main();

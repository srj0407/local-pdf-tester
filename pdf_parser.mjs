// test_pdf_parser.mjs

import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import { fromPath } from "pdf2pic";
import Tesseract from "tesseract.js";

// --- Helper Functions ---

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

async function extractTextWithOCR(pdfPath) {
  try {
    const options = {
      density: 400,
      saveFilename: "page",
      savePath: "./tmp",
      format: "png",
      width: 1200,
      height: 1600,
    };
    const converter = fromPath(pdfPath, options);
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
      await fs.unlink(conversionResult.path);
    }
    return ocrText;
  } catch (err) {
    console.error(`Error during OCR processing of PDF file '${pdfPath}':`, err);
    throw err;
  }
}

function extractSection(text, sectionHeading) {
  const pattern = new RegExp(`${sectionHeading}\\s*[:\\n]+\\s*(.*?)(?=\\n[A-Z][a-z]|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractSectionWithBoundaries(text, startHeading, endBoundaries) {
  const boundaryPattern = endBoundaries.map(b => `\\n${b}`).join("|");
  const pattern = new RegExp(`${startHeading}\\s*[:\\n]+\\s*(.*?)(?=${boundaryPattern}|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractSectionMultiple(text, possibleHeadings) {
  for (const heading of possibleHeadings) {
    const sectionText = extractSection(text, heading);
    if (sectionText) return sectionText;
  }
  return null;
}

function filterLatePolicy(text) {
  const lines = text.split("\n");
  const filtered = lines.filter(line =>
    line.toLowerCase().includes("late") || line.toLowerCase().includes("penalty")
  );
  return filtered.join("\n");
}

async function processPdf(pdfPath) {
  let pdfText = await extractTextFromPDF(pdfPath);
  if (!pdfText.trim() || pdfText.trim().startsWith("%PDF")) {
    pdfText = await extractTextWithOCR(pdfPath);
  }
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
  // Define pdfPath first.
  const pdfPath = path.resolve("C:/Users/Sam/Downloads/Syllabus 341 Winter 2025_Section_010_V2.pdf");
  
  // Now check file existence.
  try {
    await fs.access(pdfPath);
    console.log("File exists:", pdfPath);
  } catch (err) {
    console.error("File not found:", pdfPath);
    process.exit(1);
  }
  const dataBuffer = await fs.readFile(pdfPath);
  console.log("Buffer length:", dataBuffer.length);
  const data = await pdfParse(dataBuffer);
  console.log("Extracted text length:", data.text.length);
  ole.log("Buffer length:", dataBuffer.length);
  
  try {
    console.log(`Processing ${pdfPath}...`);
    const data = await processPdf(pdfPath);
    const outputPath = pdfPath.replace(/\.pdf$/i, ".txt");
    
    let outputContent = `File: ${pdfPath}\n\n`;
    for (const [section, text] of Object.entries(data)) {
      outputContent += `${section}:\n${text || "Not found"}\n\n`;
    }
    await fs.writeFile(outputPath, outputContent, "utf-8");
    console.log(`Output written to ${outputPath}`);
  } catch (err) {
    console.error(`Error processing ${pdfPath}:`, err);
  }
}

main();

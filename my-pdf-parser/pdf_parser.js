// multi_pdf_parser.js

import fs from 'fs';
import path from 'path';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pdfjsLib;

// Array of syllabus PDF file paths
const syllabusFiles = [
  "C:\\Users\\Sam\\Downloads\\Syllabus 341 Winter 2025_Section_010_V2.pdf",
  "C:\\Users\\Sam\\Downloads\\cs381W25Syllabus.pdf",
  "C:\\Users\\Sam\\Downloads\\Syllabus CS340 Winter 2025 (1).pdf"
];

/**
 * Extracts the full text from a PDF using pdf.js.
 * @param {Uint8Array|ArrayBuffer} data - The PDF file data.
 * @returns {Promise<string>} - A promise resolving to the full extracted text.
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
 * Extracts TA office hours from the text by looking for "Office Hours:" or "TA Info:".
 * @param {string} text - The full extracted text.
 * @returns {string} - The extracted TA office hours or a message if not found.
 */
function extractTAOfficeHours(text) {
  const marker = "Office Hours:";
  let idx = text.indexOf(marker);
  if (idx === -1) {
    const altMarker = "TA Info:";
    idx = text.indexOf(altMarker);
    if (idx === -1) {
      return "TA office hours not found.";
    } else {
      let sub = text.substring(idx + altMarker.length);
      const lineEnd = sub.indexOf("\n");
      return sub.substring(0, lineEnd !== -1 ? lineEnd : undefined).trim();
    }
  }
  let sub = text.substring(idx + marker.length);
  const lineEnd = sub.indexOf("\n");
  return sub.substring(0, lineEnd !== -1 ? lineEnd : undefined).trim();
}

/**
 * Extracts the grading policy (or grade information) from the text.
 * For syllabi that include "Grade Weighting", it extracts only the lines that contain percentages (for weights)
 * and the grading scale lines that begin with a letter grade.
 * @param {string} text - The full extracted text.
 * @returns {string} - The extracted grading policy information or a message if not found.
 */
function extractGradingPolicy(text) {
  let idx = text.indexOf("Grade Weighting");
  if (idx !== -1) {
    // Extract from "Grade Weighting" to "Grading Scale"
    let idxScale = text.indexOf("Grading Scale", idx);
    if (idxScale !== -1) {
      const weightingBlock = text.substring(idx, idxScale);
      const scaleBlock = text.substring(idxScale);
      
      // Split into lines and filter:
      // For weighting, keep lines that contain "%" (like "Quizzes - 25%")
      const weightingLines = weightingBlock
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.includes("%"));
      
      // For grading scale, keep lines that begin with a letter grade (e.g., "A", "A-", "B+", etc.)
      const scaleLines = scaleBlock
        .split("\n")
        .map(line => line.trim())
        .filter(line => /^[A-F][+-]?\s*\d+/.test(line));
      
      if (weightingLines.length === 0 && scaleLines.length === 0) {
        return "Grading policy not found.";
      }
      
      return weightingLines.join("\n") + "\n\nGrading Scale:\n" + scaleLines.join("\n");
    } else {
      // If no "Grading Scale" found, return a trimmed version of the block
      const sub = text.substring(idx);
      return sub.split("\n").slice(0, 5).join("\n").trim();
    }
  }
  
  // Fallback: try other markers if "Grade Weighting" is not found
  const markers = ["Graded Work", "Grading Policies:", "Grading Policy:", "Grading:"];
  for (const marker of markers) {
    idx = text.indexOf(marker);
    if (idx !== -1) {
      let sub = text.substring(idx + marker.length);
      let endIdx = sub.search(/\r?\n\r?\n/);
      if (endIdx === -1) endIdx = sub.length;
      let result = sub.substring(0, endIdx).trim();
      if (result.length > 0) return result;
    }
  }
  return "Grading policy not found.";
}

/**
 * Processes a single PDF file:
 *  - Reads the file and extracts full text,
 *  - Extracts TA office hours and grading policy,
 *  - Writes the output to a txt file named after the original PDF.
 * @param {string} filePath - The full path to the PDF file.
 */
async function processSyllabus(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const uint8ArrayData = new Uint8Array(dataBuffer);
    const fullText = await pdfToText(uint8ArrayData);
    
    const taOfficeHours = extractTAOfficeHours(fullText);
    const gradingPolicy = extractGradingPolicy(fullText);
    
    const output = `TA Office Hours: ${taOfficeHours}\n\nGrading Policy:\n${gradingPolicy}`;
    
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputFileName = `${baseName}_output.txt`;
    fs.writeFileSync(outputFileName, output, "utf8");
    console.log(`Output for "${baseName}" written to ${outputFileName}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

/**
 * Processes all syllabus PDFs listed in syllabusFiles.
 */
async function processAllSyllabi() {
  for (const filePath of syllabusFiles) {
    await processSyllabus(filePath);
  }
}

processAllSyllabi();

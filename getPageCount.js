const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cheerio = require("cheerio");
const AdmZip = require("adm-zip");
const { parseStringPromise } = require("xml2js");

async function getPageCount(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();

  switch (ext) {
    // PDF
    case "pdf": {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.numpages;
    }

    // Word DOCX - FIXED to be accurate
    case "docx": {
      try {
        // This is the most accurate method for DOCX by reading its metadata.
        const zip = new AdmZip(filePath);
        const appXml = zip.readAsText("docProps/app.xml");
        const xml = await parseStringPromise(appXml);
        // The 'Pages' property holds the accurate page count.
        const pages = parseInt(xml.Properties.Pages[0], 10);
        return pages || 1; // Return pages, or 1 if metadata is missing/zero.
      } catch (e) {
        // Fallback to estimation if metadata parsing fails for any reason.
        console.warn("Could not read DOCX metadata, falling back to word count estimation.");
        const result = await mammoth.extractRawText({ path: filePath });
        const words = result.value.trim().split(/\s+/).filter(Boolean).length;
        if (words === 0) return 0;
        // A page is typically 250 words.
        return Math.ceil(words / 250) || 1;
      }
    }

    // Word DOC - Legacy format, must rely on estimation
    case "doc": {
      const result = await mammoth.extractRawText({ path: filePath });
      const words = result.value.trim().split(/\s+/).filter(Boolean).length;
      if (words === 0) return 0;
      return Math.ceil(words / 250) || 1;
    }
    
    // HTML
    case "html": {
      const html = fs.readFileSync(filePath, "utf8");
      const $ = cheerio.load(html);
      return $("section").length || 1;
    }

    // TXT & RTF - FIXED to check for page breaks
    case "txt":
    case "rtf": {
        const content = fs.readFileSync(filePath, "utf8");
        
        // First, check for the form feed character (\f), a standard page break delimiter.
        const pageBreaks = content.split('\f');
        if (pageBreaks.length > 1) {
            return pageBreaks.length;
        }

        // If no form feed characters, fall back to line count estimation.
        // This remains an estimation as these files don't have a fixed page concept.
        const lines = content.split(/\r?\n/).length;
        return Math.ceil(lines / 50) || 1;
    }
    
    // ODT
    case "odt": {
      const zip = new AdmZip(filePath);
      const metaXml = zip.readAsText("meta.xml");
      const xml = await parseStringPromise(metaXml);
      const stats = xml["office:document-meta"]["office:meta"][0]["meta:document-statistic"][0];
      return parseInt(stats["$"]["meta:page-count"] || "0", 10) || 1;
    }

    // TEX
    case "tex": {
      const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
      return lines;
    }

    // PPTX (count slide files in ppt/slides/)
    case "pptx": {
      const zip = new AdmZip(filePath);
      const slideFiles = zip.getEntries().filter(e => e.entryName.startsWith("ppt/slides/slide"));
      return slideFiles.length;
    }

    default:
      throw new Error("Unsupported file type: " + ext);
  }
}

module.exports = getPageCount;
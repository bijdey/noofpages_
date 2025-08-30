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

    // Word DOCX/DOC
    case "docx":
    case "doc": {
      const result = await mammoth.extractRawText({ path: filePath });
      const words = result.value.split(/\s+/).length;
      return Math.ceil(words / 500);
    }

    // HTML
    case "html": {
      const html = fs.readFileSync(filePath, "utf8");
      const $ = cheerio.load(html);
      return $("section").length || 1;
    }

    // TXT
    case "txt": {
      const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
      return Math.ceil(lines / 50);
    }

    // ODT
    case "odt": {
      const zip = new AdmZip(filePath);
      const metaXml = zip.readAsText("meta.xml");
      const xml = await parseStringPromise(metaXml);
      const stats = xml["office:document-meta"]["office:meta"][0]["meta:document-statistic"][0];
      return parseInt(stats["$"]["meta:page-count"] || "0", 10) || 0;
    }

    // RTF
    case "rtf": {
      const text = fs.readFileSync(filePath, "utf8");
      const lines = text.split(/\r?\n/).length;
      return Math.ceil(lines / 50);
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

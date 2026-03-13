// Test: Embed Tajawal font in PPTX then convert via ConvertAPI
// OOXML font embedding spec (ECMA-376 Part 2, Section 9.3)
const PizZip = require("pizzip");
const fs = require("fs");

// --- OOXML Font Obfuscation Algorithm ---
// Per ISO/IEC 29500-2:2012 section 9.3.3
function obfuscateFont(fontBuf, guidStr) {
  // guidStr format: "12345678-1234-1234-1234-123456789ABC"
  const hex = guidStr.replace(/-/g, "");
  // Parse hex pairs in specific byte order for GUID
  // The GUID bytes are: 78 56 34 12-34 12-34 12-12 34-12 34 56 78 9A BC
  // This maps to the standard GUID byte order (little-endian first 3 groups)
  const guidBytes = [];
  // Group 1 (4 bytes, reversed): chars 6,7 4,5 2,3 0,1
  guidBytes.push(parseInt(hex.substr(6, 2), 16));
  guidBytes.push(parseInt(hex.substr(4, 2), 16));
  guidBytes.push(parseInt(hex.substr(2, 2), 16));
  guidBytes.push(parseInt(hex.substr(0, 2), 16));
  // Group 2 (2 bytes, reversed): chars 10,11 8,9
  guidBytes.push(parseInt(hex.substr(10, 2), 16));
  guidBytes.push(parseInt(hex.substr(8, 2), 16));
  // Group 3 (2 bytes, reversed): chars 14,15 12,13
  guidBytes.push(parseInt(hex.substr(14, 2), 16));
  guidBytes.push(parseInt(hex.substr(12, 2), 16));
  // Groups 4-5 (8 bytes, NOT reversed): chars 16..31
  for (let i = 16; i < 32; i += 2) {
    guidBytes.push(parseInt(hex.substr(i, 2), 16));
  }

  const result = Buffer.from(fontBuf);
  // XOR first 32 bytes with 16-byte key (repeated twice)
  for (let i = 0; i < 32; i++) {
    result[i] ^= guidBytes[i % 16];
  }
  return result;
}

function generateGuid() {
  const hex = "0123456789ABCDEF";
  let guid = "";
  for (let i = 0; i < 32; i++) {
    guid += hex[Math.floor(Math.random() * 16)];
  }
  return (
    guid.substr(0, 8) + "-" +
    guid.substr(8, 4) + "-" +
    guid.substr(12, 4) + "-" +
    guid.substr(16, 4) + "-" +
    guid.substr(20, 12)
  );
}

function embedFontsInPptx(zip, fonts) {
  // fonts = [{ name: "Tajawal", regular: Buffer, bold: Buffer, panose: "...", pitchFamily: "2", charset: "-78" }]

  const embeddedFonts = [];

  for (const font of fonts) {
    const entry = { name: font.name, panose: font.panose, pitchFamily: font.pitchFamily, charset: font.charset, rels: {} };

    if (font.regular) {
      const guid = generateGuid();
      const obfuscated = obfuscateFont(font.regular, guid);
      const fontPath = "ppt/fonts/" + guid + ".fntdata";
      zip.file(fontPath, obfuscated);
      entry.rels.regular = { guid, path: "fonts/" + guid + ".fntdata" };
    }

    if (font.bold) {
      const guid = generateGuid();
      const obfuscated = obfuscateFont(font.bold, guid);
      const fontPath = "ppt/fonts/" + guid + ".fntdata";
      zip.file(fontPath, obfuscated);
      entry.rels.bold = { guid, path: "fonts/" + guid + ".fntdata" };
    }

    embeddedFonts.push(entry);
  }

  // 1. Update [Content_Types].xml - add fntdata extension
  let ct = zip.file("[Content_Types].xml").asText();
  if (!ct.includes('Extension="fntdata"')) {
    ct = ct.replace(
      "<Types ",
      '<Types '
    );
    // Add before closing </Types>
    ct = ct.replace(
      "</Types>",
      '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>'
    );
    zip.file("[Content_Types].xml", ct);
    console.log("  Added fntdata content type");
  }

  // 2. Update ppt/_rels/presentation.xml.rels - add font relationships
  let presRels = zip.file("ppt/_rels/presentation.xml.rels").asText();
  // Find max existing rId
  const rIdMatches = presRels.match(/Id="rId(\d+)"/g) || [];
  let maxRId = 0;
  for (const m of rIdMatches) {
    const n = parseInt(m.match(/rId(\d+)/)[1]);
    if (n > maxRId) maxRId = n;
  }

  const relMap = {}; // fontName -> { regular: rIdX, bold: rIdY }
  let nextRId = maxRId + 1;

  for (const ef of embeddedFonts) {
    relMap[ef.name] = {};
    if (ef.rels.regular) {
      const rId = "rId" + nextRId++;
      const rel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="${ef.rels.regular.path}"/>`;
      presRels = presRels.replace("</Relationships>", rel + "</Relationships>");
      relMap[ef.name].regular = rId;
      console.log("  Added regular font rel:", rId, "->", ef.rels.regular.path);
    }
    if (ef.rels.bold) {
      const rId = "rId" + nextRId++;
      const rel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="${ef.rels.bold.path}"/>`;
      presRels = presRels.replace("</Relationships>", rel + "</Relationships>");
      relMap[ef.name].bold = rId;
      console.log("  Added bold font rel:", rId, "->", ef.rels.bold.path);
    }
  }
  zip.file("ppt/_rels/presentation.xml.rels", presRels);

  // 3. Update ppt/presentation.xml - add <p:embeddedFontLst>
  let presXml = zip.file("ppt/presentation.xml").asText();
  
  let embeddedFontXml = "<p:embeddedFontLst>";
  for (const ef of embeddedFonts) {
    const rm = relMap[ef.name];
    embeddedFontXml += "<p:embeddedFont>";
    embeddedFontXml += `<p:font typeface="${ef.name}" panose="${ef.panose}" pitchFamily="${ef.pitchFamily}" charset="${ef.charset}"/>`;
    if (rm.regular) embeddedFontXml += `<p:regular r:id="${rm.regular}"/>`;
    if (rm.bold) embeddedFontXml += `<p:bold r:id="${rm.bold}"/>`;
    embeddedFontXml += "</p:embeddedFont>";
  }
  embeddedFontXml += "</p:embeddedFontLst>";

  // Insert after </p:sldIdLst>
  presXml = presXml.replace("</p:sldIdLst>", "</p:sldIdLst>" + embeddedFontXml);
  zip.file("ppt/presentation.xml", presXml);
  console.log("  Added embeddedFontLst to presentation.xml");

  return zip;
}

(async () => {
  console.log("=== Font Embedding Test ===\n");

  // 1. Load template
  console.log("1. Loading template...");
  const resp = await fetch("https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/LUXURY_WORLD.pptm");
  const templateBuf = Buffer.from(await resp.arrayBuffer());
  console.log("   Template size:", templateBuf.length, "bytes");

  // 2. Load fonts
  console.log("2. Loading Tajawal fonts...");
  const regularTtf = fs.readFileSync("Tajawal-Regular.ttf");
  const boldTtf = fs.readFileSync("Tajawal-Bold.ttf");
  console.log("   Regular:", regularTtf.length, "bytes, Bold:", boldTtf.length, "bytes");

  // 3. Open ZIP and embed fonts
  console.log("3. Embedding fonts in PPTX...");
  let zip = new PizZip(templateBuf);
  zip = embedFontsInPptx(zip, [{
    name: "Tajawal",
    regular: regularTtf,
    bold: boldTtf,
    panose: "00000500000000000000",
    pitchFamily: "2",
    charset: "-78"
  }]);

  // 4. Generate populated PPTX (simple test - just replace a few tags)
  console.log("4. Replacing sample tags...");
  let slide1 = zip.file("ppt/slides/slide1.xml").asText();
  // Just replace a couple of simple tags
  slide1 = slide1.replace(/\{\{Days\}\}/g, "10");
  slide1 = slide1.replace(/\{\{Nights\}\}/g, "9");
  slide1 = slide1.replace(/\{\{Route\}\}/g, "تبليسي - باتومي - كوتايسي");
  zip.file("ppt/slides/slide1.xml", slide1);

  // 5. Save font-embedded PPTX
  const pptxBuf = zip.generate({ type: "nodebuffer" });
  fs.writeFileSync("test_font_embedded.pptx", pptxBuf);
  console.log("   Font-embedded PPTX saved:", pptxBuf.length, "bytes");

  // Check the embedded fonts are in the zip
  const verifyZip = new PizZip(pptxBuf);
  const fontFiles = Object.keys(verifyZip.files).filter(f => f.includes("fntdata"));
  console.log("   Embedded font files:", fontFiles);

  // 6. Convert to PDF via ConvertAPI
  console.log("5. Converting to PDF via ConvertAPI...");
  const apiSecret = "hj8HVeivXFvrrQeH7b0pnP0tx6Dv7tBj";
  const formData = new FormData();
  formData.append("File", new Blob([pptxBuf]), "presentation.pptx");

  const convResp = await fetch(`https://v2.convertapi.com/convert/pptx/to/pdf?Secret=${apiSecret}`, {
    method: "POST",
    body: formData
  });
  console.log("   ConvertAPI status:", convResp.status);

  if (!convResp.ok) {
    const errText = await convResp.text();
    console.log("   Error:", errText.substring(0, 500));
    return;
  }

  const convJson = await convResp.json();
  const pdfB64 = convJson.Files[0].FileData;
  const pdfBuf = Buffer.from(pdfB64, "base64");
  fs.writeFileSync("test_font_embedded.pdf", pdfBuf);
  console.log("   PDF saved:", pdfBuf.length, "bytes");

  // 7. Check if Tajawal is in the PDF
  console.log("6. Checking PDF for Tajawal font...");
  const pdfStr = pdfBuf.toString("latin1");
  const hasTajawal = pdfStr.includes("Tajawal");
  console.log("   Contains Tajawal:", hasTajawal);
  
  // Find all /BaseFont entries
  const baseFonts = pdfStr.match(/\/BaseFont\s*\/([^\s\/\]>]+)/g) || [];
  console.log("   All fonts in PDF:", baseFonts.map(f => f.replace("/BaseFont /", "").replace("/BaseFont/", "")));

  // Check for Arabic text content
  const hasArabicChars = /[\u0600-\u06FF]/.test(pdfBuf.toString("utf8"));
  console.log("   Contains Arabic chars (UTF-8):", hasArabicChars);

  console.log("\n=== Done ===");
})();

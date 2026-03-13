const fs = require("fs");
(async () => {
  const apiSecret = "hj8HVeivXFvrrQeH7b0pnP0tx6Dv7tBj";
  
  const html = [
    '<!DOCTYPE html>',
    '<html dir="rtl" lang="ar">',
    '<head>',
    '<meta charset="UTF-8">',
    '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">',
    '<style>',
    '* { font-family: "Tajawal", sans-serif; }',
    'body { direction: rtl; padding: 40px; }',
    'h1 { font-weight: 800; color: #1a237e; }',
    'table { border-collapse: collapse; width: 100%; margin: 20px 0; }',
    'th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: right; }',
    'th { background: #1a237e; color: white; font-weight: 700; }',
    '.price { font-weight: 700; color: #2e7d32; font-size: 18px; }',
    '</style>',
    '</head>',
    '<body>',
    '<h1>\u0639\u0627\u0644\u0645 \u0627\u0644\u0641\u062E\u0627\u0645\u0629 - \u0639\u0631\u0636 \u0633\u0639\u0631</h1>',
    '<p><strong>\u0627\u0644\u0645\u062F\u0629:</strong> 10 \u0623\u064A\u0627\u0645 / 9 \u0644\u064A\u0627\u0644\u064A</p>',
    '<p><strong>\u0627\u0644\u0645\u0633\u0627\u0631:</strong> \u062A\u0628\u0644\u064A\u0633\u064A \u27A4 \u0628\u0627\u062A\u0648\u0645\u064A \u27A4 \u0643\u0648\u062A\u0627\u064A\u0633\u064A</p>',
    '<p><strong>\u0627\u0644\u063A\u0631\u0641:</strong> 2 (1 \u0645\u0632\u062F\u0648\u062C\u0629 + 1 \u0645\u0641\u0631\u062F\u0629)</p>',
    '<p><strong>\u0645\u0637\u0627\u0631 \u0627\u0644\u0648\u0635\u0648\u0644:</strong> \u0645\u0637\u0627\u0631 \u062A\u0628\u0644\u064A\u0633\u064A</p>',
    '<table>',
    '<tr><th>\u0627\u0644\u0645\u062F\u064A\u0646\u0629</th><th>\u0627\u0644\u0644\u064A\u0627\u0644\u064A</th><th>\u0627\u0644\u0641\u0646\u062F\u0642</th></tr>',
    '<tr><td>\u062A\u0628\u0644\u064A\u0633\u064A</td><td>4</td><td>\u0641\u0646\u062F\u0642 \u0631\u0627\u0645\u0627\u062F\u0627 \u0628\u0644\u0627\u0632\u0627</td></tr>',
    '<tr><td>\u0628\u0627\u062A\u0648\u0645\u064A</td><td>3</td><td>\u0647\u064A\u0644\u062A\u0648\u0646 \u0628\u0627\u062A\u0648\u0645\u064A</td></tr>',
    '<tr><td>\u0643\u0648\u062A\u0627\u064A\u0633\u064A</td><td>2</td><td>\u0628\u0633\u062A \u0648\u064A\u0633\u062A\u0631\u0646 \u0643\u0648\u062A\u0627\u064A\u0633\u064A</td></tr>',
    '</table>',
    '<p class="price">\u0627\u0644\u0633\u0639\u0631 \u0645\u0639 \u0625\u0637\u0644\u0627\u0644\u0629: $2,450</p>',
    '<p class="price">\u0627\u0644\u0633\u0639\u0631 \u0628\u062F\u0648\u0646 \u0625\u0637\u0644\u0627\u0644\u0629: $2,190</p>',
    '</body>',
    '</html>'
  ].join("\n");

  const form = new FormData();
  form.append("File", new Blob([html], { type: "text/html" }), "quote.html");
  form.append("PageSize", "a4");
  form.append("MarginTop", "10");
  form.append("MarginBottom", "10");
  form.append("WaitTime", "3");

  console.log("Converting HTML to PDF via ConvertAPI...");
  const r = await fetch("https://v2.convertapi.com/convert/html/to/pdf", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiSecret },
    body: form,
  });
  console.log("Status:", r.status);

  if (!r.ok) {
    console.log("Error:", (await r.text()).substring(0, 500));
    return;
  }

  const j = await r.json();
  const pdfB64 = j.Files[0].FileData;
  const pdfBuf = Buffer.from(pdfB64, "base64");
  fs.writeFileSync("test_html_to_pdf.pdf", pdfBuf);
  console.log("PDF saved:", pdfBuf.length, "bytes");

  const pdfStr = pdfBuf.toString("latin1");
  const hasTajawal = pdfStr.includes("Tajawal");
  console.log("Contains Tajawal font:", hasTajawal);

  const baseFonts = pdfStr.match(/\/BaseFont\s*\/([^\s\/\]>]+)/g) || [];
  console.log("All fonts:", baseFonts);
})();

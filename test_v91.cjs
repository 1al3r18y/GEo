// Test v9.1.0 — Full HTML→PDF pipeline with premium styling, logo, and T&C sections
const fs = require("fs");

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateQuoteHTML(qr) {
  const tierLabels = [
    "العرض الأول — اقتصادي",
    "العرض الثاني — ستاندرد",
    "العرض الثالث — متوسط",
    "العرض الرابع — ديلوكس",
    "العرض الخامس — فاخر",
  ];
  const tierIcons = ["\u{1F949}", "\u{1F948}", "\u{1F947}", "\u{1F48E}", "\u{1F451}"];

  let tiersHTML = "";
  for (let i = 0; i < (qr.tiers?.length || 0); i++) {
    const t = qr.tiers[i];
    const hotels = t.hotels || [];
    let hotelRows = "";
    for (let hi = 0; hi < hotels.length; hi++) {
      const h = hotels[hi];
      hotelRows += `<tr><td class="idx">${hi + 1}</td><td>${esc(h.cityAr)}</td><td class="center">${h.nights}</td><td>${esc(h.hotelName)}</td></tr>`;
    }

    let priceHTML = "";
    if (t.priceView !== undefined && t.priceNoView !== undefined) {
      priceHTML = `
        <div class="prices">
          <div class="price-chip gold"><span class="plbl">مع إطلالة</span><span class="pval">$${t.priceView}</span></div>
          <div class="price-chip silver"><span class="plbl">بدون إطلالة</span><span class="pval">$${t.priceNoView}</span></div>
        </div>`;
    } else {
      priceHTML = `
        <div class="prices">
          <div class="price-chip gold"><span class="plbl">السعر</span><span class="pval">$${t.price}</span></div>
        </div>`;
    }

    tiersHTML += `
    <div class="tier">
      <div class="tier-hdr">${tierIcons[i] || "\u{1F48E}"} ${tierLabels[i] || "\u0639\u0631\u0636 " + (i + 1)}</div>
      <table>
        <thead><tr><th class="idx">#</th><th>المدينة</th><th class="center">الليالي</th><th>الفندق</th></tr></thead>
        <tbody>${hotelRows}</tbody>
      </table>
      ${priceHTML}
    </div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Tajawal',sans-serif;direction:rtl;color:#222;background:#fff;font-size:12.5px;line-height:1.6}

.header{background:linear-gradient(135deg,#1B1B2F 0%,#27293D 100%);color:#fff;padding:28px 20px 22px;text-align:center}
.header img{display:block;margin:0 auto 10px;max-width:140px}
.brand{font-size:24px;font-weight:700;color:#D4AF37;letter-spacing:.5px}
.subtitle{font-size:13px;font-weight:400;margin-top:3px;color:rgba(255,255,255,.85)}

.summary{background:#FAFAF7;border:1px solid #E8E2D6;padding:14px 20px;margin:14px 16px;border-radius:6px;border-right:4px solid #D4AF37}
.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}
.s-item{font-size:12.5px;font-weight:500}
.s-lbl{font-weight:700;color:#1B1B2F}

.tier{margin:10px 16px;border:1px solid #E0D9CC;border-radius:6px;overflow:hidden;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.tier-hdr{background:linear-gradient(90deg,#1B1B2F,#2C2C44);color:#D4AF37;padding:7px 16px;font-weight:700;font-size:13.5px}
table{width:100%;border-collapse:collapse}
th{background:#27293D;color:#D4AF37;padding:5px 10px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase}
td{padding:5px 10px;text-align:right;border-bottom:1px solid #F0EDE6;font-size:12px}
th.idx,td.idx{width:28px;text-align:center;color:#999}
td.center,th.center{text-align:center}
tr:nth-child(even) td{background:#FAFAF7}
tr:hover td{background:#F5F0E3}

.prices{display:flex;gap:10px;padding:8px 14px;justify-content:flex-start;flex-wrap:wrap}
.price-chip{display:flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-weight:700;font-size:14px}
.price-chip.gold{background:linear-gradient(135deg,#D4AF37,#F5D76E);color:#1B1B2F}
.price-chip.silver{background:linear-gradient(135deg,#C0C0C0,#E8E8E8);color:#333}
.plbl{font-size:11px;font-weight:500;opacity:.85}
.pval{font-size:15px;font-weight:700}

.car-only{background:linear-gradient(135deg,#1B1B2F,#27293D);border-radius:6px;padding:14px 18px;margin:10px 16px;text-align:center;page-break-inside:avoid;color:#fff}
.car-only-label{font-weight:700;font-size:13px;color:#D4AF37}
.car-only-price{font-weight:700;font-size:22px;color:#1B1B2F;background:linear-gradient(135deg,#D4AF37,#F5D76E);display:inline-block;padding:4px 22px;border-radius:20px;margin-top:6px}

.services{background:#F6FBF6;border:1px solid #C8E6C9;border-right:4px solid #388E3C;padding:12px 18px;margin:10px 16px;border-radius:6px;page-break-inside:avoid}
.services h3{color:#2E7D32;font-weight:700;font-size:13px;margin-bottom:5px}
.services ul{list-style:none;padding:0;columns:2;column-gap:16px}
.services li{padding:2px 0;font-size:12px}
.services li::before{content:"\u2705 "}

.terms-section{margin:10px 16px;page-break-inside:avoid}
.terms-section h3{font-size:13px;font-weight:700;padding:6px 14px;border-radius:5px 5px 0 0;margin:0}
.terms-section .t-body{padding:10px 16px;border-radius:0 0 5px 5px;font-size:12px;line-height:1.7}
.note-box h3{background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2;border-bottom:none}
.note-box .t-body{background:#FFFBF5;border:1px solid #FFE0B2;border-top:none;color:#4E342E}
.confirm-box h3{background:#E3F2FD;color:#0D47A1;border:1px solid #BBDEFB;border-bottom:none}
.confirm-box .t-body{background:#F5FAFF;border:1px solid #BBDEFB;border-top:none;color:#1A237E}
.warn-box h3{background:#FCE4EC;color:#B71C1C;border:1px solid #F8BBD0;border-bottom:none}
.warn-box .t-body{background:#FFF5F7;border:1px solid #F8BBD0;border-top:none;color:#4A0E0E}
.closing-box h3{background:linear-gradient(90deg,#1B1B2F,#27293D);color:#D4AF37;border:1px solid #444;border-bottom:none}
.closing-box .t-body{background:#1B1B2F;border:1px solid #444;border-top:none;color:#EAEAEA;text-align:center;font-size:13px;font-weight:500}

.footer{background:#1B1B2F;color:rgba(255,255,255,.7);text-align:center;padding:10px;font-size:10px;margin-top:8px}
</style>
</head>
<body>

<div class="header">
  <img src="https://www.lwiat.com/wp-content/uploads/2023/01/logo-web-1.webp" alt="عالم الفخامة" />
  <div class="brand">عالم الفخامة</div>
  <div class="subtitle">LUXURY WORLD — عرض سعر رحلة جورجيا</div>
</div>

<div class="summary">
  <div class="summary-grid">
    <div class="s-item"><span class="s-lbl">المدة:</span> ${esc(String(qr.days))} أيام / ${esc(String(qr.totalNights))} ليالي</div>
    <div class="s-item"><span class="s-lbl">الغرف:</span> ${esc(String(qr.roomCount))} (${esc(qr.roomText || "")})</div>
    <div class="s-item"><span class="s-lbl">المسار:</span> ${esc(qr.route)}</div>
    <div class="s-item"><span class="s-lbl">البالغين:</span> ${esc(String(qr.adults))} | الأطفال: ${esc(qr.childrenDisplay || "لا يوجد")}</div>
    <div class="s-item"><span class="s-lbl">مطار الوصول:</span> ${esc(qr.arrivalAirport || "")}</div>
    <div class="s-item"><span class="s-lbl">مطار المغادرة:</span> ${esc(qr.departureAirport || "")}</div>
  </div>
</div>

${tiersHTML}

<div class="car-only">
  <div class="car-only-label">\u{1F697} عرض سيارة فقط (بدون إقامة)</div>
  <div class="car-only-price">$${qr.carOnlyUSD || 0}</div>
</div>

<div class="services">
  <h3>\u2705 الخدمات المشمولة</h3>
  <ul>
    <li>استقبال وتوديع من وإلى المطار</li>
    <li>سيارة خاصة مع سائق طوال الرحلة</li>
    <li>إفطار يومي في الفندق</li>
    <li>شرائح اتصال وتأمين سفر</li>
  </ul>
</div>

<div class="terms-section note-box">
  <h3>\u{1F4CC} ملاحظات مهمة</h3>
  <div class="t-body">الفنادق لدينا ارخص من مواقع الحجوزات ! والدفع بعد الوصول الى جورجيا نختار لأقامتك افضل الخيارات لذلك توجد أسعار اقل بخدمة او بجودة اقل ! فعالم الفخامة تحب ان يكون عمليها مرتاح في الرحلة البرنامج قابل للتغير مثلما تريد الرحلة رحلتك و نحن ننفذ . الدفع كاش بعملة الدولار الأمريكي واذا كان بالبطاقة البنكية يضاف 5% عمولة .</div>
</div>

<div class="terms-section confirm-box">
  <h3>\u{1F4CB} للتأكيد فقط ارسل</h3>
  <div class="t-body">جوازات السفر لأصدار التأمين و الحجوزات<br>تذاكر السفر موضح بها تاريخ الوصول و تاريخ المغادرة</div>
</div>

<div class="terms-section warn-box">
  <h3>\u26a0\ufe0f ملاحظة مهمة جدا</h3>
  <div class="t-body">أننا نعتز بهويتنا الأسلامية ولا نتخلى عن مبادئنا و منعنا هذه الامور التي يتم طلبها من (قلة من الاشخاص) و لانها تنافى تعاليم ديننا الاسلامى واخلاق المسلمين ، فأنها منعت منعاً باتاً ولمن يطلب هذه الامور تعتبر الرحلة ملغية: البغاء و المراقص وما شابهها و المشروبات الكحولية ، اذ كان طلبك يشابه المحرم فلا تُتَمِمَ الحجز معنا فالعوائل أولى بخدماتنا .. واذا ثبت هذه الأمور اثناء الرحلة سيتم الغاء الحجوزات و المبلغ غير مسترجع كلياً</div>
</div>

<div class="terms-section closing-box">
  <h3>عالم الفخامة</h3>
  <div class="t-body">أنك تتعامل مع شركة عالم الفخامة التي وظفت خبراتها اتجاه جمع المعلومة الصحيحة و الخدمة الحقيقة التي لا تجعلك تندم لأختيارك الشركة ، توكل على الله و تواصل معنا الآن</div>
</div>

<div class="footer">عالم الفخامة — LUXURY WORLD | جورجيا</div>

</body>
</html>`;
}

(async () => {
  console.log("=== v9.1.0 Premium HTML→PDF Test ===\n");

  // Sample quoteResult with realistic data
  const qr = {
    days: 10, totalNights: 9, adults: 3,
    childrenDisplay: "1 (مجاناً)", effectivePax: 3,
    roomText: "1 ثلاثية", roomCount: 1,
    route: "تبليسي ➔ غوداوري ➔ باتومي",
    arrivalAirport: "مطار تبليسي", departureAirport: "مطار باتومي",
    carOnlyUSD: 1560, simCost: 45, insuranceCost: 150, servicesCost: 195,
    viewPref: "both",
    tiers: [
      { priceView: 2150, priceNoView: 1890, hotels: [
        { cityAr: "تبليسي", nights: 4, hotelName: "هوليداي ان تبليسي" },
        { cityAr: "غوداوري", nights: 2, hotelName: "ماركو بولو غوداوري" },
        { cityAr: "باتومي", nights: 3, hotelName: "بيست ويسترن باتومي" },
      ]},
      { priceView: 2600, priceNoView: 2340, hotels: [
        { cityAr: "تبليسي", nights: 4, hotelName: "رامادا بلازا تبليسي" },
        { cityAr: "غوداوري", nights: 2, hotelName: "غوداوري لوفت" },
        { cityAr: "باتومي", nights: 3, hotelName: "هيلتون باتومي" },
      ]},
      { priceView: 3100, priceNoView: 2850, hotels: [
        { cityAr: "تبليسي", nights: 4, hotelName: "شيراتون متروبول تبليسي" },
        { cityAr: "غوداوري", nights: 2, hotelName: "رومز غوداوري" },
        { cityAr: "باتومي", nights: 3, hotelName: "شيراتون باتومي" },
      ]},
      { priceView: 3650, priceNoView: 3400, hotels: [
        { cityAr: "تبليسي", nights: 4, hotelName: "ماريوت تبليسي" },
        { cityAr: "غوداوري", nights: 2, hotelName: "غوداوري ماريوت" },
        { cityAr: "باتومي", nights: 3, hotelName: "ويندهام باتومي" },
      ]},
      { priceView: 4500, priceNoView: 4200, hotels: [
        { cityAr: "تبليسي", nights: 4, hotelName: "بولمان تبليسي" },
        { cityAr: "غوداوري", nights: 2, hotelName: "فير مونت غوداوري" },
        { cityAr: "باتومي", nights: 3, hotelName: "ريتز كارلتون باتومي" },
      ]},
    ],
  };

  // 1. Generate HTML
  console.log("1. Generating premium HTML...");
  const html = generateQuoteHTML(qr);
  fs.writeFileSync("test_v91_quote.html", html, "utf8");
  console.log("   HTML saved:", html.length, "chars");

  // 2. Convert to PDF via ConvertAPI
  console.log("2. Converting to PDF...");
  const apiSecret = "hj8HVeivXFvrrQeH7b0pnP0tx6Dv7tBj";
  const form = new FormData();
  form.append("File", new Blob([html], { type: "text/html" }), "quote.html");
  form.append("PageSize", "a4");
  form.append("MarginTop", "10");
  form.append("MarginBottom", "10");
  form.append("MarginLeft", "15");
  form.append("MarginRight", "15");
  form.append("WaitTime", "3");

  const r = await fetch("https://v2.convertapi.com/convert/html/to/pdf", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiSecret },
    body: form,
  });
  console.log("   Status:", r.status);

  if (!r.ok) {
    console.log("   Error:", (await r.text()).substring(0, 500));
    return;
  }

  const j = await r.json();
  const pdfBuf = Buffer.from(j.Files[0].FileData, "base64");
  fs.writeFileSync("test_v91_quote.pdf", pdfBuf);
  console.log("   PDF saved:", pdfBuf.length, "bytes");

  // 3. Verify
  console.log("3. Verifying PDF...");
  const pdfStr = pdfBuf.toString("latin1");
  console.log("   Tajawal font present:", pdfStr.includes("Tajawal"));
  const baseFonts = [...new Set((pdfStr.match(/\/BaseFont\s*\/([^\s\/\]>]+)/g) || []))];
  console.log("   Fonts:", baseFonts.length);
  baseFonts.forEach(f => console.log("     ", f.replace("/BaseFont /", "")));

  // Check for T&C sections in HTML source
  console.log("4. Verifying static sections...");
  console.log("   Has logo img:", html.includes("logo-web-1.webp"));
  console.log("   Has note-box:", html.includes("note-box"));
  console.log("   Has confirm-box:", html.includes("confirm-box"));
  console.log("   Has warn-box:", html.includes("warn-box"));
  console.log("   Has closing-box:", html.includes("closing-box"));
  console.log("   Has '5% عمولة':", html.includes("5%"));
  console.log("   Has 'جوازات السفر':", html.includes("\u062c\u0648\u0627\u0632\u0627\u062a"));
  console.log("   Has 'توكل على الله':", html.includes("\u062a\u0648\u0643\u0644"));

  console.log("\n=== Done — open test_v91_quote.html and test_v91_quote.pdf ===");
})();

// Test: Full pipeline - generate HTML from real quoteResult, convert to PDF via ConvertAPI
const fs = require("fs");

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateQuoteHTML(qr, isMobile = false) {
  const tierLabels = [
    "العرض الأول — اقتصادي",
    "العرض الثاني — ستاندرد",
    "العرض الثالث — متوسط",
    "العرض الرابع — ديلوكس",
    "العرض الخامس — فاخر",
  ];

  let tiersHTML = "";
  for (let i = 0; i < (qr.tiers?.length || 0); i++) {
    const t = qr.tiers[i];
    const hotels = t.hotels || [];
    
    let hotelRows = "";
    for (const h of hotels) {
      hotelRows += `
        <div class="hotel-item">
          <span class="city-name">📍 ${esc(h.cityAr)}</span>
          <span class="nights-count">🌙 ${h.nights} ليالي</span>
          <span class="hotel-name">🏨 <strong>${esc(h.hotelName)}</strong></span>
        </div>`;
    }

    let priceHTML = "";
    if (t.priceView !== undefined && t.priceNoView !== undefined) {
      priceHTML = `
        <div class="price-row"><span class="price-label">سعر الإطلالة:</span> <span class="price gold">$${t.priceView}</span></div>
        <div class="price-row"><span class="price-label">بدون إطلالة:</span> <span class="price silver">$${t.priceNoView}</span></div>`;
    } else {
      priceHTML = `<div class="price-row"><span class="price-label">السعر:</span> <span class="price gold">$${t.price || 0}</span></div>`;
    }

    tiersHTML += `
    <div class="card tier-card">
      <div class="card-header">💎 ${tierLabels[i] || "عرض " + (i + 1)}</div>
      <div class="card-body">
        <div class="hotel-list">${hotelRows}</div>
        <div class="price-box">${priceHTML}</div>
      </div>
    </div>`;
  }

  const confirmationCard = `
    <div class="card confirm-card">
      <div class="card-header">📄 طريقة التأكيد والخدمات</div>
      <div class="card-body">
        <div class="confirm-list">
          <strong>للتأكيد فقط ارسل:</strong>
          <ul>
            <li>✅ جوازات السفر لإصدار التأمين والحجوزات.</li>
            <li>✅ تذاكر السفر (تاريخ الوصول والمغادرة).</li>
          </ul>
        </div>
        <hr class="divider">
        <div class="car-offer">
          <strong>🚗 عرض سيارة فقط (بدون إقامة):</strong>
          <div class="car-price">$${qr.carOnlyUSD || 0}</div>
        </div>
      </div>
    </div>
  `;

  const gridHTML = `<div class="grid-container ${isMobile ? 'mobile-grid' : 'desktop-grid'}">${tiersHTML}${confirmationCard}</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Tajawal',sans-serif;direction:rtl;color:#1a1a1a;background:#f4f7f6;font-size:${isMobile ? '16px' : '13px'};line-height:1.5}
.page-container { max-width: ${isMobile ? '100%' : '1000px'}; margin: 0 auto; background: #fff; padding: ${isMobile ? '10px' : '20px'}; }

.header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #FFC000; padding-bottom: 15px; }
.logo { max-width: 140px; margin-bottom: 10px; }
.brand-title { font-size: ${isMobile ? '18px' : '22px'}; font-weight: 800; color: #002060; }

.summary-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; background: #002060; color: #fff; padding: 12px; border-radius: 8px; margin-bottom: 10px; }
.summary-item { font-weight: 500; font-size: ${isMobile ? '13px' : '14px'}; background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; }
.summary-item span { color: #FFC000; font-weight: 700; margin-left: 5px; }

.route-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; background: #fdfdfd; border: 1px solid #ddd; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: ${isMobile ? '13px' : '14px'}; font-weight: 500;}
.route-item { background: #fff; padding: 6px 12px; border-radius: 6px; border: 1px solid #eee; display: flex; align-items: center; gap: 5px; }
.route-item span { color: #002060; font-weight: 700; }
.route-full { width: 100%; text-align: center; background: #f4f7f6; justify-content: center; }

.grid-container { display: grid; gap: 15px; margin-bottom: 20px; }
.desktop-grid { grid-template-columns: repeat(3, 1fr); }
.mobile-grid { grid-template-columns: 1fr; }

.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; page-break-inside: avoid; }
.card-header { background: linear-gradient(135deg, #002060, #00509E); color: #fff; padding: 10px; font-weight: 700; text-align: center; font-size: ${isMobile ? '16px' : '14px'}; }
.card-body { padding: 15px; display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between; }

.hotel-item { background: #fdfdfd; border-bottom: 1px dashed #ddd; padding: 8px 0; font-size: ${isMobile ? '14px' : '12px'}; display: flex; flex-direction: column; gap: 4px; }
.hotel-item:last-child { border-bottom: none; }

.price-box { background: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 15px; border: 1px solid #eee; }
.price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.price-row:last-child { margin-bottom: 0; }
.price-label { font-weight: 700; font-size: ${isMobile ? '14px' : '12px'}; color: #333; }
.price { padding: 3px 10px; border-radius: 4px; font-weight: 800; font-size: ${isMobile ? '16px' : '14px'}; }
.price.gold { background: #FFC000; color: #002060; }
.price.silver { background: #E0E0E0; color: #333; }

.confirm-card { border: 2px solid #FFC000; }
.confirm-card .card-header { background: #FFC000; color: #002060; }
.confirm-list ul { list-style: none; margin-top: 10px; font-size: ${isMobile ? '14px' : '12px'}; }
.confirm-list li { margin-bottom: 6px; }
.divider { border: 0; height: 1px; background: #eee; margin: 15px 0; }
.car-price { font-size: 20px; font-weight: 800; color: #002060; background: #FFC000; display: inline-block; padding: 5px 15px; border-radius: 6px; margin-top: 5px; }

.notes-container { background: #fff0f0; border-right: 5px solid #c00000; padding: 15px; border-radius: 8px; font-size: ${isMobile ? '14px' : '13px'}; line-height: 1.6; margin-bottom: 20px; page-break-inside: avoid; }
.notes-container strong { color: #c00000; font-size: 15px; }
.footer { text-align: center; font-weight: 700; color: #002060; padding: 15px; font-size: 14px; background: #eee; border-radius: 8px; }
</style>
</head>
<body>
<div class="page-container">

  <div class="header">
    <img src="https://www.lwiat.com/wp-content/uploads/2023/01/logo-web-1.webp" alt="الشعار" class="logo">
    <div class="brand-title">عرض مقدم من شركة عالم الفخامة في جورجيا</div>
  </div>

  <div class="summary-bar">
    <div class="summary-item"><span>الأيام:</span> ${esc(String(qr.days))} </div>
    <div class="summary-item"><span>الليالي:</span> ${esc(String(qr.totalNights))}</div>
    <div class="summary-item"><span>الأشخاص:</span> ${esc(String(qr.adults))} بالغ | ${esc(qr.childrenDisplay || "0")} طفل</div>
    <div class="summary-item"><span>نوع الغرفة:</span> ${esc(qr.roomText || "مزدوجة")}</div>
    <div class="summary-item"><span>عدد الغرف:</span> ${esc(String(qr.roomCount))}</div>
  </div>

  <div class="route-bar">
    <div class="route-item"><span>🛬 مطار الوصول:</span> ${esc(qr.arrivalAirport || "مطار تبليسي")}</div>
    <div class="route-item"><span>🛫 مطار المغادرة:</span> ${esc(qr.departureAirport || "مطار باتومي")}</div>
    <div class="route-item route-full"><span>🗺️ مسار الرحلة:</span> ${esc(qr.route)}</div>
  </div>

  ${gridHTML}

  <div class="notes-container">
    <strong>⚠️ ملاحظة مهمة جداً:</strong><br>
    الفنادق لدينا أرخص من مواقع الحجوزات! والدفع بعد الوصول إلى جورجيا. الدفع كاش بعملة الدولار الأمريكي وإذا كان بالبطاقة البنكية يضاف 5% عمولة.<br><br>
    أننا نعتز بهويتنا الأسلامية ولا نتخلى عن مبادئنا... منعنا هذه الأمور (المشروبات الكحولية، المراقص، وما شابهها) منعاً باتاً. فالعوائل أولى بخدماتنا، وإذا ثبتت هذه الأمور أثناء الرحلة سيتم إلغاء الحجوزات والمبلغ غير مسترجع.
  </div>

  <div class="footer">
    تتعامل مع خبرات عالم الفخامة.. توكل على الله وتواصل معنا الآن لتأكيد حجزك.
  </div>

</div>
</body>
</html>`;
}

(async () => {
  console.log("=== Full HTML→PDF Pipeline Test (Optimized Layouts) ===\n");

  // FLAG TO TEST DESIGNS: Change to false to test Desktop Layout (A4 Landscape)
  const isMobileLayout = true; 
  console.log(`Using Layout: ${isMobileLayout ? "MOBILE (Fullscreen Fit)" : "DESKTOP (3-Column Grid)"}`);

  const sampleQR = {
      days: 10, totalNights: 9, adults: 2, childrenDisplay: "لا يوجد", roomText: "مزدوجة", roomCount: 1,
      route: "تبليسي ➔ باتومي ➔ كوتايسي", arrivalAirport: "مطار تبليسي الدولي", departureAirport: "مطار باتومي الدولي",
      carOnlyUSD: 1340,
      tiers: [
        { priceView: 2450, priceNoView: 2190, hotels: [
          { cityAr: "تبليسي", nights: 4, hotelName: "فندق رامادا بلازا" },
          { cityAr: "باتومي", nights: 3, hotelName: "هيلتون باتومي" },
          { cityAr: "كوتايسي", nights: 2, hotelName: "بست ويسترن كوتايسي" } ]},
        { priceView: 2800, priceNoView: 2550, hotels: [
          { cityAr: "تبليسي", nights: 4, hotelName: "شيراتون متروبول" },
          { cityAr: "باتومي", nights: 3, hotelName: "راديسون بلو باتومي" },
          { cityAr: "كوتايسي", nights: 2, hotelName: "إيبيس ستايلز كوتايسي" } ]},
        { priceView: 3100, priceNoView: 2850, hotels: [
          { cityAr: "تبليسي", nights: 4, hotelName: "ماريوت تبليسي" },
          { cityAr: "باتومي", nights: 3, hotelName: "شيراتون باتومي" },
          { cityAr: "كوتايسي", nights: 2, hotelName: "رامادا كوتايسي" } ]},
        { priceView: 3500, priceNoView: 3200, hotels: [
          { cityAr: "تبليسي", nights: 4, hotelName: "بولمان تبليسي" },
          { cityAr: "باتومي", nights: 3, hotelName: "ويندهام باتومي" },
          { cityAr: "كوتايسي", nights: 2, hotelName: "إنتركونتيننتال" } ]},
        { priceView: 4200, priceNoView: 3900, hotels: [
          { cityAr: "تبليسي", nights: 4, hotelName: "فير مونت تبليسي" },
          { cityAr: "باتومي", nights: 3, hotelName: "ريتز كارلتون" },
          { cityAr: "كوتايسي", nights: 2, hotelName: "فور سيزونز" } ]}
      ]
  };

  const html = generateQuoteHTML(sampleQR, isMobileLayout);
  fs.writeFileSync("test_quote.html", html, "utf8");

  console.log("\n2. Converting HTML to PDF via ConvertAPI...");
  const apiSecret = "hj8HVeivXFvrrQeH7b0pnP0tx6Dv7tBj";
  const form = new FormData();
  form.append("File", new Blob([html], { type: "text/html" }), "quote.html");
  
  if (isMobileLayout) {
    form.append("PageWidth", "130mm");
    form.append("PageHeight", "400mm");
  } else {
    form.append("PageSize", "a4");
    form.append("PageOrientation", "landscape");
  }
  
  form.append("MarginTop", "5");
  form.append("MarginBottom", "5");
  form.append("MarginLeft", "5");
  form.append("MarginRight", "5");

  const r = await fetch("https://v2.convertapi.com/convert/html/to/pdf", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiSecret },
    body: form,
  });

  if (!r.ok) {
    console.log("   Error:", (await r.text()).substring(0, 500));
    return;
  }

  const j = await r.json();
  const pdfBuf = Buffer.from(j.Files[0].FileData, "base64");
  const filename = isMobileLayout ? "mobile_fullscreen_quote.pdf" : "desktop_grid_quote.pdf";
  fs.writeFileSync(filename, pdfBuf);
  console.log(`   ✅ PDF saved as ${filename}`);
})();
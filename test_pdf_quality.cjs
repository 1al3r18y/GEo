const PizZip = require('pizzip');
const fs = require('fs');

function mergeSlideRuns(xml) {
  const runRegex = /<a:r\b[^>]*>[\s\S]*?<\/a:r>/g;
  const textRegex = /<a:t\b[^>]*?>([\s\S]*?)<\/a:t>/;
  const runs = [];
  let m;
  while ((m = runRegex.exec(xml)) !== null) {
    const tm = textRegex.exec(m[0]);
    runs.push({ start: m.index, end: m.index + m[0].length, full: m[0], text: tm ? tm[1] : '' });
  }
  if (runs.length === 0) return xml;
  let result = ''; let pos = 0; let i = 0;
  while (i < runs.length) {
    result += xml.substring(pos, runs[i].start);
    let j = i; let combined = runs[j].text;
    while (j < runs.length - 1) {
      let depth = 0;
      for (const c of combined) { if (c === '{') depth++; if (c === '}') depth--; }
      if (depth === 0) break;
      const between = xml.substring(runs[j].end, runs[j + 1].start);
      if (between.length > 0 && /<[^>]+>/.test(between)) break;
      j++; combined += runs[j].text;
    }
    if (j > i) {
      let depth = 0;
      for (const c of combined) { if (c === '{') depth++; if (c === '}') depth--; }
      if (depth === 0) { result += runs[i].full.replace(textRegex, '<a:t>' + combined + '</a:t>'); pos = runs[j].end; i = j + 1; continue; }
    }
    result += runs[i].full; pos = runs[i].end; i++;
  }
  result += xml.substring(pos); return result;
}

function findContainingRow(xml, tagIdx) {
  let depth = 0; let start = -1;
  for (let i = tagIdx; i >= 0; i--) {
    if (xml.substring(i, i + 7) === '</a:tr>') depth++;
    if (xml.substring(i, i + 5) === '<a:tr' && (xml[i + 5] === ' ' || xml[i + 5] === '>')) {
      if (depth === 0) { start = i; break; } depth--;
    }
  }
  return { start, end: xml.indexOf('</a:tr>', tagIdx) + 7 };
}

(async () => {
  // 1. Get real quoteResult
  const qrResp = await fetch('https://ouhteboiqitdgsmbqgyj.supabase.co/rest/v1/bot_sessions?chat_id=eq.6825046025&select=data', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU'
    }
  });
  const qr = (await qrResp.json())[0].data.quoteResult;
  console.log('quoteResult: days=' + qr.days + ', arrival=' + qr.arrivalAirport + ', departure=' + qr.departureAirport);

  // 2. Generate populated PPTM
  const resp = await fetch('https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/LUXURY_WORLD.pptm');
  const buf = Buffer.from(await resp.arrayBuffer());
  const zip = new PizZip(buf);
  let xml = mergeSlideRuns(zip.file('ppt/slides/slide1.xml').asText());

  // Expand loops
  for (let i = 0; i < qr.tiers.length; i++) {
    const n = i + 1;
    const openIdx = xml.indexOf('{#hotels_' + n + '}');
    const closeIdx = xml.indexOf('{/hotels_' + n + '}');
    if (openIdx < 0 || closeIdx < 0) continue;
    const openRow = findContainingRow(xml, openIdx);
    const closeRow = findContainingRow(xml, closeIdx);
    const dataTemplate = xml.substring(openRow.end, closeRow.start);
    const hotels = (qr.tiers[i].hotels || []).map(h => ({ city: h.cityAr, nights: String(h.nights), hotel: h.hotelName }));
    let expanded = '';
    for (const h of hotels) {
      let row = dataTemplate;
      row = row.replace(/\{\{hotel\}\}/g, h.hotel);
      row = row.replace(/\{#hotels\}/g, h.hotel);
      row = row.replace(new RegExp('\\{#hotels_' + n + '\\}', 'g'), h.hotel);
      row = row.replace(/\{\{city\}\}/g, h.city);
      row = row.replace(/\{\{nights\}\}/g, h.nights);
      expanded += row;
    }
    xml = xml.substring(0, openRow.start) + expanded + xml.substring(closeRow.end);
  }

  // Replace vars
  const vars = {
    Days: String(qr.days), Nights: String(qr.totalNights), Route: qr.route,
    Rooms_Count: String(qr.roomCount), Room_Types: qr.roomText || '',
    arv: qr.arrivalAirport || '', dbar: qr.departureAirport || '',
  };
  for (let i = 0; i < qr.tiers.length; i++) {
    const t = qr.tiers[i]; const n = i + 1;
    if (t.priceView !== undefined) { vars['O' + n + '_Price_V'] = '$' + t.priceView; vars['O' + n + '_Price_NV'] = '$' + (t.priceNoView ?? t.priceView); }
    else if (t.price !== undefined) { vars['O' + n + '_Price_V'] = '$' + t.price; vars['O' + n + '_Price_NV'] = '$' + t.price; }
  }
  for (const [key, val] of Object.entries(vars)) {
    xml = xml.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val);
  }

  // Check remaining
  const remaining = xml.match(/\{\{[^}]+\}\}|\{#[^}]+\}|\{\/[^}]+\}/g);
  if (remaining) console.log('Remaining tags:', [...new Set(remaining)]);
  else console.log('All tags replaced!');

  zip.file('ppt/slides/slide1.xml', xml);
  const pptmBuf = zip.generate({ type: 'uint8array' });
  fs.writeFileSync('test_populated.pptx', Buffer.from(pptmBuf));
  console.log('Saved populated PPTX:', pptmBuf.length, 'bytes');

  // 3. Convert via ConvertAPI
  console.log('Converting to PDF via ConvertAPI...');
  const form = new FormData();
  form.append('File', new Blob([pptmBuf]), 'presentation.pptx');
  const r = await fetch('https://v2.convertapi.com/convert/pptx/to/pdf', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer hj8HVeivXFvrrQeH7b0pnP0tx6Dv7tBj' },
    body: form,
  });
  console.log('ConvertAPI status:', r.status);
  if (!r.ok) { console.log('ERROR:', await r.text()); return; }
  const j = await r.json();
  if (j.Files && j.Files[0] && j.Files[0].FileData) {
    const b64 = j.Files[0].FileData;
    const pdfBin = Buffer.from(b64, 'base64');
    fs.writeFileSync('test_output.pdf', pdfBin);
    console.log('PDF saved! Size:', pdfBin.length, 'bytes');
    console.log('ConversionTime:', j.ConversionTime, 'seconds');
  } else {
    console.log('No file data in response:', JSON.stringify(j).substring(0, 500));
  }
})().catch(e => console.error('FATAL:', e));

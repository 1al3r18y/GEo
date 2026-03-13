const PizZip = require("pizzip");
(async () => {
  const resp = await fetch("https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/LUXURY_WORLD.pptm");
  const buf = Buffer.from(await resp.arrayBuffer());
  const zip = new PizZip(buf);
  const imgs = Object.keys(zip.files).filter(f => f.includes("image") || f.includes("media"));
  console.log("Image/media files:", imgs);

  const slide1 = zip.file("ppt/slides/slide1.xml").asText();
  const tableCount = (slide1.match(/<a:tbl>/g) || []).length;
  console.log("Tables count:", tableCount);

  const tierLabels = slide1.match(/العرض\s*(الأول|الثاني|الثالث|الرابع|الخامس)/g);
  console.log("Tier labels:", tierLabels);

  const headers = slide1.match(/عالم الفخامة|LUXURY|عرض سعر|ملخص|المسار|الفنادق|الخدمات|سيارة/g);
  console.log("Text sections:", [...new Set(headers || [])]);

  // Find colors - use simpler regex
  const colorMatches = slide1.match(/srgbClr val="[A-Fa-f0-9]{6}"/g) || [];
  const uniqueColors = [...new Set(colorMatches)].slice(0, 15);
  console.log("Colors:", uniqueColors);
  
  // Check for logo
  const hasLogo = slide1.includes("logo") || slide1.includes("Logo") || imgs.some(f => f.includes("logo"));
  console.log("Has logo:", hasLogo);
  
  // Image sizes
  for (const img of imgs) {
    const file = zip.file(img);
    if (file) {
      const data = file.asBinary();
      console.log(img, ":", data.length, "bytes");
    }
  }
})();

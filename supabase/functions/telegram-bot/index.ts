/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Telegram Bot FSM Wizard v9.2.0
 * ============================================================================
 *
 * HYBRID MODE ARCHITECTURE (Updated: March 6, 2026):
 * ──────────────────────────────────────────────────
 * The bot operates in strict Hybrid Mode with two entry paths:
 *
 *   PATH A — Manual Entry (Default & Safe Mode):
 *     Trigger: /start command OR [📝 إنشاء عرض سعر جديد] inline button.
 *     Flow:   أيام → مطار وصول → مطار مغادرة → مسار المدن → ليالي
 *             → بالغين → أطفال → إطلالة → عرض سعر
 *     Behavior: Completely bypasses the text parser. Uses inline keyboards
 *     for every step. This is the guaranteed-safe path.
 *
 *   PATH B — Smart Parse (Shortcut):
 *     Trigger: User pastes a free-text message while in IDLE state.
 *     Flow:   Raw message → Regex extraction → Confirmation prompt
 *             → [✅ نعم، أكمل] skips known steps → airport selection → ...
 *             → [✏️ إدخال يدوي] abandons smart flow → Manual Path A from step 1.
 *     Behavior: Parser ONLY runs on free-text in IDLE state. Never interferes
 *     with active FSM steps. If parser confidence < 30, falls through to
 *     default prompt suggesting /start.
 *
 *   FALLBACK LOGIC:
 *     - Parser failure (low confidence): Shows default message with /start hint.
 *     - Hijri date detected: Warns user and requests manual entry via /start.
 *     - User clicks [✏️ إدخال يدوي]: Resets session, starts Manual Path A.
 *     - Any active FSM state: Parser is completely skipped.
 *
 * CHANGELOG v12.0.0 (March 13, 2026):
 *   STRICT HOTEL MATRIX + AUTO-HONEYMOON + CACHING SYSTEM.
 *   Integrated Strict Hotel Matrix, Auto-Honeymoon Detection (Pax=2),
 *   and Telegram File_ID Caching System for Quick Access.
 *   1. Strict DB Seeding: 72 hotel entries — 6 Standard Tiers (عرض 1-6)
 *      + 6 Honeymoon Tiers (هنيمون 1-6). Exact pricing matrix enforced.
 *   2. Auto-Honeymoon Detection: if (adults === 2 && children === 0),
 *      system auto-generates 4 PDFs (Mobile, Desktop, VIP, + Honeymoon).
 *      No UI prompt for trip type — fully automatic.
 *   3. Telegram File_ID Caching: cached_quotes table with SHA-256 hash
 *      (days + route + pax + viewPref). Cache hit → instant file_id send.
 *      Cache miss → generate + cache for future retrieval.
 *   4. All PDFs auto-sent after quote generation (no manual download step).
 *   5. 6 standard tiers + 6 honeymoon tiers in text and PDF output.
 *   6. BUG FIX (March 13, 2026): Fixed missing VIP PPTX file delivery in
 *      Auto-Honeymoon workflow. Added explicit error logging (try/catch)
 *      with user-facing error messages per PDF. Implemented sequential
 *      sending with accurate success counter. VIP PPTX engine updated
 *      from 5 to 6 tiers (hotels_1-6, O1-O6 price tags).
 *   7. Date: March 13, 2026.
 *
 * CHANGELOG v10.1.0 (March 13, 2026):
 *   PPTX ENGINE FIX + 2-COLUMN GRID HTML LAYOUT.
 *   1. VIP PPTX Fix: Pre-process slide XML to normalize mixed delimiters
 *      ({{var}} single-brace loops {#section}). Replaces {{ → { and }} → }
 *      in slide XML before docxtemplater parsing. Removed custom delimiters
 *      config. All data sanitized to prevent "undefined" strings.
 *   2. HTML 2-Column Grid: Both Mobile and Desktop templates now render
 *      tier cards side-by-side (2 per row) using CSS Grid.
 *      Mobile: .m-tiers-grid, Desktop: .tiers-grid.
 *   3. Date: March 13, 2026.
 *
 * CHANGELOG v10.0.0 (March 7, 2026):
 *   TRIPLE ENGINE + CATEGORY PIVOT — Smart Quoting Engine & VIP PPTX Pipeline.
 *   1. DB Schema Pivot: offer_tier (tier_1..tier_5) replaced with category
 *      (اقتصادي, ستاندرد, متوسط, ديلوكس, فاخر). All queries updated.
 *   2. Triple PDF Export: Three buttons on download_pdf:
 *      [📱 عرض سريع (موبايل - HTML)] — existing mobile HTML engine
 *      [🖥️ عرض سريع (كمبيوتر - HTML)] — existing desktop HTML engine
 *      [💎 عرض VIP فخم (التصميم الأصلي)] — NEW PPTX→PDF VIP engine
 *   3. VIP PPTX Engine: docxtemplater + PizZip to inject data into
 *      LUXURY_WORLD.pptx template, then ConvertAPI PPTX→PDF conversion.
 *   4. Template Variables: Days, Nights, Route, Rooms_Count, Room_Types,
 *      arv, dbar, O1-O5_Price_V/NV, hotels_1-5 loops.
 *   5. PPTX template hosted on Supabase Storage (public bucket).
 *   6. Date: March 7, 2026.
 *
 * CHANGELOG v9.2.0 (March 7, 2026):
 *   DUAL PDF EXPORT — Mobile "Price-First" & Desktop Traditional Templates.
 *   1. Dual Export Flow:
 *      When user clicks "📥 تحميل العرض كملف PDF", the bot now shows two
 *      inline buttons: [📱 عرض موبايل (سريع ومختصر)] and [🖥️ عرض عام (تقليدي)].
 *      Each generates a separate PDF via ConvertAPI Chromium.
 *   2. Mobile "Price-First" Template (generateMobileHTML):
 *      - Card-based layout (border-radius: 14px, box-shadow)
 *      - Massive price badges as the star element (28px font, gold/silver)
 *      - Icon-driven routing: 📍 city | 🌙 nights | 🏨 hotel (no table headers)
 *      - Summary as flex-wrap badges (days, rooms, pax, route, airports)
 *      - Services as rapid checkmark list
 *      - T&C pushed to bottom as compact color-coded alert boxes
 *      - max-width: 480px for phone-optimized readability
 *   3. Desktop Template (generateQuoteHTML):
 *      Retained as-is from v9.1.0 — traditional A4 table layout with
 *      premium dark/gold branding, tier tables, and styled T&C boxes.
 *   4. New callback handlers: pdf_mobile, pdf_desktop.
 *   5. Date: March 7, 2026.
 *
 * CHANGELOG v9.1.0 (March 7, 2026):
 *   SHIFT TO HTML-TO-PDF PIPELINE — PPTM templates officially discarded.
 *   1. Premium HTML Template Redesign:
 *      Complete visual overhaul of the quotation PDF. Dark/gold luxury
 *      color palette (#1B1B2F / #D4AF37). Elegant RTL layout with Tajawal
 *      font (400/500/700) loaded via @import from Google Fonts CDN.
 *   2. Brand Logo Injection:
 *      Company logo loaded from https://www.lwiat.com/wp-content/uploads/
 *      2023/01/logo-web-1.webp and displayed centered in the header.
 *   3. Static Terms & Conditions (4 sections):
 *      Injected at the bottom of every quotation PDF:
 *        a) ملاحظات مهمة — pricing notes, payment policy (cash USD / +5% card).
 *        b) للتأكيد فقط ارسل — passport & ticket requirements.
 *        c) ملاحظة مهمة جدا — strict Islamic policy & cancellation terms.
 *        d) خاتمة — closing brand statement.
 *      These sections are static text per client's exact wording.
 *   4. Improved CSS:
 *      Gold gradient header, subtle card shadows, refined tier sections,
 *      styled info/warning/alert boxes for terms. page-break-inside: avoid
 *      on all critical blocks for clean multi-page print.
 *   5. Date: March 7, 2026.
 *
 * CHANGELOG v9.0.0 (March 7, 2026):
 *   1. ARABIC FONT FIX — HTML-based PDF Generation:
 *      Replaced PPTX template population (PizZip + manual XML) with HTML-based
 *      PDF generation. ConvertAPI's PPTX→PDF (LibreOffice) could NOT render
 *      the Tajawal Arabic font — its server lacks Tajawal and ignores embedded
 *      fonts. New approach: generate styled HTML document with Tajawal loaded
 *      from Google Fonts CDN, then convert via ConvertAPI's HTML→PDF endpoint
 *      (Chromium-based, which downloads and renders Google Fonts perfectly).
 *   2. Tajawal Font Rendering:
 *      HTML loads Tajawal (weights 400/500/700/800) via Google Fonts CSS link.
 *      Chromium in ConvertAPI downloads the font at render time, ensuring
 *      correct Arabic RTL shaping with connected letters.
 *   3. Airport Variables (arv/dbar):
 *      Added arrival airport (arv) and departure airport (dbar) display in
 *      the PDF summary section.
 *   4. Professional Design:
 *      Navy (#002060) + Gold (#FFC000) color scheme matching original PPTM.
 *      5 hotel tier sections with tables, pricing, car-only offer, and
 *      services block. Responsive A4 layout with page-break-inside: avoid.
 *   5. Removed Dependencies:
 *      PizZip npm package no longer needed. No PPTM template fetch required.
 *      Simpler pipeline: generateQuoteHTML() → convertHTMLToPDF() → PDF.
 *
 * CHANGELOG v8.1.0 (March 7, 2026):
 *   1. STRICT PDF ENFORCEMENT:
 *      The bot now EXCLUSIVELY outputs .pdf files. Raw .pptm/.pptx files are
 *      NEVER sent to the Telegram chat under any circumstances.
 *   2. Mandatory ConvertAPI Conversion:
 *      After populating the LUXURY_WORLD.pptm template via manual XML
 *      replacement (PizZip), the buffer is sent to ConvertAPI (pptx→pdf)
 *      which preserves embedded fonts including the Arabic "Tajawal" font.
 *      The conversion is mandatory — if it fails, an error message is shown
 *      instead of falling back to the raw presentation file.
 *   3. Font Preservation ("Tajawal"):
 *      The PPTM template embeds the Tajawal Arabic font. ConvertAPI's
 *      server-side rendering respects embedded fonts, ensuring correct
 *      right-to-left Arabic text rendering without disjointed letters.
 *   4. Output filename: Luxury_World_Quotation.pdf
 *   5. Requires CONVERTAPI_SECRET environment variable to be set.
 *
 * CHANGELOG v8.0.0 (March 6, 2026):
 *   1. PDF/PPTM Template Integration:
 *      Generate professional quotation files from LUXURY_WORLD.pptm template
 *      using PizZip + manual XML replacement. Template populated with all
 *      quote data including hotel loops, pricing, route, and room info.
 *   2. Download Button: [📥 تحميل العرض كملف PDF] added to quote output.
 *   3. Session Persistence: Quote data saved in DONE state for PDF generation
 *      (previously session was reset immediately after quote send).
 *   4. All v7.x features preserved (FSM flow, pricing, smart parser, hybrid mode).
 *
 * CHANGELOG v7.0.0 (March 6, 2026):
 *   1. FSM Flow Reorder — Pax Before View:
 *      OLD: Days → Airports → Route → Nights → View → Adults → Children → Quote
 *      NEW: Days → Airports → Route → Nights → Adults → Children → View → Quote
 *      Rationale: Collecting passenger info before view preference enables
 *      accurate service cost pre-calculation (insurance depends on pax count).
 *   2. NEW Pricing Formula — Insurance & SIM Overhaul:
 *      SIM Cards: $15 × Adults (no free SIMs, adults only).
 *      Insurance: $5 × Total Days × Effective Pax (NEW service).
 *      Services Cost = SIM + Insurance (included in all offers + car-only).
 *      Base Cost = Hotels + Car + Services → apply margin → round to $10.
 *   3. Output Format Update — Matches Master Template:
 *      Airport line consolidated: "وصول [Arr] / مغادرة [Dep]".
 *      "النوعين" labels: "السعر مع إطلالة" / "السعر بدون إطلالة".
 *      Car-only label: "عرض سيارة فقط (بدون إقامة)".
 *      Services block: condensed 4-line format.
 *   4. All v6.x features preserved (smart parser, context-aware Hijri, hybrid mode).
 *
 * CHANGELOG v6.3.0 (March 6, 2026):
 *   1. CRITICAL BUG FIX — False Positive Hijri Detection (Context-Aware):
 *      OLD: detectHijri() scanned the ENTIRE message for Hijri month names.
 *        → Customer name "عامر الرجب" triggered false positive because "رجب" is a
 *           Hijri month, even though dates were Gregorian ("مارس").
 *      NEW: detectHijri() is now context-aware (keyword-anchored).
 *        → Only checks for Hijri month names in text segments immediately
 *           following date anchors: "تاريخ الوصول" and "تاريخ المغادرة".
 *        → Hijri months in customer names, notes, or other text are ignored.
 *        → Extraction window: up to 40 chars after each date anchor.
 *      Test case: "أسمي عامر الرجب تاريخ الوصول 17 مارس تاريخ المغادرة 29 مارس
 *               عدد الأشخاص البالغين 2"
 *        → Result: 13 days / 12 nights / 2 adults ✓ ("الرجب" in name ignored)
 *
 * CHANGELOG v6.2.0 (March 6, 2026):
 *   1. CRITICAL BUG FIX — Inclusive Date Calculation (Travel Industry Standard):
 *      The Smart NLP Parser date extraction had an off-by-one error.
 *      OLD (wrong): days = dateDiff, nights = dateDiff - 1
 *        → "01.03 to 10.03" gave 9 days / 8 nights ✗
 *      NEW (correct): nights = dateDiff, days = dateDiff + 1
 *        → "01.03 to 10.03" gives 10 days / 9 nights ✓
 *      Rule: Both arrival and departure days count as travel days.
 *      Formula: Total Nights = (Departure - Arrival) in days.
 *               Total Days  = Total Nights + 1.
 *      This rule is globally enforced:
 *        - Smart Parser date extraction (parseCustomerMessage)
 *        - Manual FSM entry (days keyboard → totalNights = days - 1)
 *        - Quote generation engine (uses totalNights from session)
 *
 * CHANGELOG v6.1.0 (March 6, 2026):
 *   1. Hybrid Mode: Explicit dual-path architecture documented and enforced.
 *      Manual FSM wizard is never bypassed by the parser.
 *   2. Bug fix: View preference handler correctly checks childAges.length > 0
 *      (was >= 0, always true) to avoid skipping children input.
 *
 * CHANGELOG v6.0.0 (March 6, 2026):
 *   1. Smart Parser: Regex-based interceptor extracts arrival/departure dates,
 *      calculates days automatically, extracts adults & children count from
 *      raw Arabic customer messages. Supports formats:
 *        - "تاريخ الوصول 17 مارس تاريخ المغادرة 29 مارس"
 *        - "تاريخ الوصول: 22/03 تاريخ المغادرة:28/03"
 *        - "12 يوم" or "12 days" direct day count
 *        - Adults: "عدد الأشخاص البالغين 2" or "البالغين:01"
 *        - Children: "عدد الأطفال لايوجد" or "الأطفال:00" or "اطفال 2 اعمارهم 4 7"
 *      Hijri date detection: identifies common Hijri month names and flags them
 *      for manual entry (no external library needed).
 *   2. FSM Auto-Fill: Pre-fills days, adults, children from parsed data.
 *      Sends confirmation message with extracted data.
 *      [✅ نعم، أكمل] skips to airport selection.
 *      [✏️ إدخال يدوي] starts normal FSM flow.
 *   3. USD-Only Pricing: All final prices strictly in USD ($). No SAR conversion.
 *   4. All v5 features preserved (route builder, dual airports, view options).
 *
 * SMART PARSER DOCUMENTATION (March 6, 2026):
 *   The parseCustomerMessage() function uses layered regex extraction:
 *   - Date extraction: Matches Arabic month names (يناير-ديسمبر) and numeric
 *     formats (DD/MM, DD-MM). Calculates day difference for trip duration.
 *   - Direct days: Matches "N يوم" or "N أيام" or "N days".
 *   - Adults: Matches "البالغين N", "بالغين N", "أشخاص N", "الأشخاص N".
 *   - Children: Matches "أطفال N", "الأطفال N", detects "لايوجد"/"لا يوجد"/0.
 *   - Child ages: Matches "أعمارهم N N N" patterns.
 *   - Hijri detection: Checks for محرم/صفر/ربيع/جمادى/رجب/شعبان/رمضان/شوال/
 *     ذو القعدة/ذو الحجة month names and flags for manual entry.
 *
 * @version 12.0.0
 * @date March 13, 2026
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// PDF generation via HTML → ConvertAPI (Chromium) with Tajawal from Google Fonts
// VIP PDF generation via PPTX → docxtemplater → ConvertAPI (PPTX→PDF)
import PizZip from "https://esm.sh/pizzip@3.1.7";
import Docxtemplater from "https://esm.sh/docxtemplater@3.48.0";

const BOT_TOKEN = "8694883297:AAFSf1cMZoJdfCu_FBAKFmRtUxhh0TQmqgc";
const SUPABASE_URL = "https://ouhteboiqitdgsmbqgyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BotState =
  | "IDLE"
  | "AWAITING_DAYS"
  | "AWAITING_ARRIVAL_AIRPORT"
  | "AWAITING_DEPARTURE_AIRPORT"
  | "AWAITING_CITIES"
  | "AWAITING_NIGHTS"
  | "NIGHTS_SUMMARY"
  | "AWAITING_VIEW"
  | "AWAITING_ADULTS"
  | "AWAITING_CHILDREN_CHECK"
  | "AWAITING_CHILD_AGES"
  | "AWAITING_PARSE_CONFIRM"
  | "PROCESSING"
  | "DONE";

interface CityNights { city: string; nights: number; }
interface SessionData {
  days?: number;
  totalNights?: number;
  arrivalAirport?: string;
  arrivalAirportName?: string;
  departureAirport?: string;
  departureAirportName?: string;
  route?: string[];
  cityNights?: CityNights[];
  currentCityIndex?: number;
  viewPreference?: "view" | "no_view" | "both";
  adults?: number;
  hasChildren?: boolean;
  childAges?: number[];
  childrenOver6?: number;
  childrenUnder6?: number;
  effectivePax?: number;
  quoteResult?: any;
}
interface Session { chat_id: number; state: BotState; data: SessionData; }

const CITIES = [
  { id: "Tbilisi", nameAr: "تبليسي", emoji: "🏛️" },
  { id: "Batumi", nameAr: "باتومي", emoji: "🏖️" },
  { id: "Gudauri", nameAr: "غوداوري", emoji: "⛷️" },
  { id: "Borjomi", nameAr: "بورجومي", emoji: "🌲" },
  { id: "Bakuriani", nameAr: "باكورياني", emoji: "🎿" },
  { id: "Kutaisi", nameAr: "كوتايسي", emoji: "🏰" },
  { id: "Dashbash", nameAr: "داشباش", emoji: "🏞️" },
];
const AIRPORTS = [
  { id: "TBS", nameAr: "مطار تبليسي", city: "Tbilisi" },
  { id: "BUS", nameAr: "مطار باتومي", city: "Batumi" },
  { id: "KUT", nameAr: "مطار كوتايسي", city: "Kutaisi" },
];

function cityNameAr(id: string): string {
  return CITIES.find(c => c.id === id)?.nameAr || id;
}
function cityEmoji(id: string): string {
  return CITIES.find(c => c.id === id)?.emoji || "📍";
}

// ======================== TELEGRAM API ========================
async function tgSend(chatId: number, text: string, reply_markup?: any) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup }),
  });
}
async function tgEditText(chatId: number, messageId: number, text: string, reply_markup?: any) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup }),
  });
}
async function tgAnswer(callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}
async function tgSendDocument(chatId: number, fileBuffer: Uint8Array, filename: string, caption?: string): Promise<string> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new Blob([fileBuffer]), filename);
  if (caption) { form.append("caption", caption); form.append("parse_mode", "HTML"); }
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
  try { const j = await resp.json(); return j?.result?.document?.file_id || ""; } catch { return ""; }
}
async function tgSendDocumentByFileId(chatId: number, fileId: string, caption?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, document: fileId, caption, parse_mode: "HTML" }),
  });
}
async function tgDeleteMessage(chatId: number, messageId: number) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

// ======================== SESSION ========================
async function getSession(chatId: number): Promise<Session> {
  const { data } = await supabase.from("bot_sessions").select("*").eq("chat_id", chatId).single();
  if (data) return { chat_id: chatId, state: data.state as BotState, data: data.data || {} };
  await supabase.from("bot_sessions").insert({ chat_id: chatId, state: "IDLE", data: {} });
  return { chat_id: chatId, state: "IDLE", data: {} };
}
async function saveSession(chatId: number, state: BotState, data: SessionData): Promise<void> {
  await supabase.from("bot_sessions").upsert(
    { chat_id: chatId, state, data, updated_at: new Date().toISOString() },
    { onConflict: "chat_id" }
  );
}
async function resetSession(chatId: number): Promise<void> {
  await supabase.from("bot_sessions").upsert(
    { chat_id: chatId, state: "IDLE", data: {}, updated_at: new Date().toISOString() },
    { onConflict: "chat_id" }
  );
}

// ======================== QUOTATION CACHE ========================
async function calcCacheHash(days: number, routeKey: string, pax: number, viewPref: string, isHoney: boolean): Promise<string> {
  const raw = `${days}|${routeKey}|${pax}|${viewPref}|${isHoney}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function checkCache(hash: string): Promise<any | null> {
  try {
    const { data } = await supabase.from("cached_quotes").select("*").eq("hash_key", hash).single();
    return data;
  } catch { return null; }
}
async function saveToCache(hash: string, fids: { mobile: string; desktop: string; vip: string; honey: string }) {
  try {
    await supabase.from("cached_quotes").upsert({
      hash_key: hash, mobile_file_id: fids.mobile || null, desktop_file_id: fids.desktop || null,
      vip_file_id: fids.vip || null, honey_file_id: fids.honey || null, created_at: new Date().toISOString(),
    }, { onConflict: "hash_key" });
  } catch (e) { console.error("Cache save error:", e); }
}

// ======================== ROOM ALLOCATION ========================
interface RoomAlloc { single: number; double: number; triple: number; total: number; }
function allocateRooms(pax: number): RoomAlloc {
  if (pax <= 0) return { single: 0, double: 0, triple: 0, total: 0 };
  const map: Record<number, RoomAlloc> = {
    1: { single: 1, double: 0, triple: 0, total: 1 },
    2: { single: 0, double: 1, triple: 0, total: 1 },
    3: { single: 0, double: 0, triple: 1, total: 1 },
    4: { single: 0, double: 2, triple: 0, total: 2 },
    5: { single: 0, double: 1, triple: 1, total: 2 },
    6: { single: 0, double: 0, triple: 2, total: 2 },
  };
  if (pax <= 6) return map[pax];
  let triple = Math.floor(pax / 3);
  const rem = pax % 3;
  let double = 0, single = 0;
  if (rem === 1) { triple--; double = 2; }
  else if (rem === 2) { double = 1; }
  return { single, double, triple, total: single + double + triple };
}

function calcEffectivePax(adults: number, childAges: number[]) {
  let over6 = 0, under6 = 0;
  for (const age of childAges) { if (age > 6) over6++; else under6++; }
  return { effectivePax: adults + over6, childrenOver6: over6, childrenUnder6: under6 };
}

// ======================== SMART PARSER ========================
interface ParseResult {
  days?: number;
  totalNights?: number;
  adults?: number;
  childCount?: number;
  childAges?: number[];
  isHijri?: boolean;
  confidence: number;
}

const AR_MONTHS: Record<string, number> = {
  "يناير": 1, "كانون الثاني": 1, "jan": 1, "january": 1,
  "فبراير": 2, "شباط": 2, "feb": 2, "february": 2,
  "مارس": 3, "آذار": 3, "mar": 3, "march": 3,
  "ابريل": 4, "أبريل": 4, "نيسان": 4, "apr": 4, "april": 4,
  "مايو": 5, "أيار": 5, "may": 5,
  "يونيو": 6, "حزيران": 6, "jun": 6, "june": 6,
  "يوليو": 7, "تموز": 7, "jul": 7, "july": 7,
  "اغسطس": 8, "أغسطس": 8, "آب": 8, "aug": 8, "august": 8,
  "سبتمبر": 9, "أيلول": 9, "sep": 9, "september": 9,
  "اكتوبر": 10, "أكتوبر": 10, "تشرين الأول": 10, "oct": 10, "october": 10,
  "نوفمبر": 11, "تشرين الثاني": 11, "nov": 11, "november": 11,
  "ديسمبر": 12, "كانون الأول": 12, "dec": 12, "december": 12,
};

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الثاني", "ربيع",
  "جمادى الأولى", "جمادى الثانية", "جمادى",
  "رجب", "شعبان", "رمضان", "شوال",
  "ذو القعدة", "ذو الحجة", "ذي القعدة", "ذي الحجة",
];

function detectHijriInDateContext(text: string): boolean {
  // Only check for Hijri months near date anchors, not globally
  const dateAnchors = /(?:تاريخ\s*الوصول|الوصول|تاريخ\s*المغادرة|المغادرة)\s*:?\s*/gi;
  let match;
  while ((match = dateAnchors.exec(text)) !== null) {
    // Extract up to 40 chars after the anchor
    const segment = text.substring(match.index + match[0].length, match.index + match[0].length + 40);
    for (const hijri of HIJRI_MONTHS) {
      if (segment.includes(hijri)) return true;
    }
  }
  return false;
}

function parseArabicDate(text: string, year: number): Date | null {
  // Try "DD month" pattern: "17 مارس"
  for (const [name, month] of Object.entries(AR_MONTHS)) {
    const pat = new RegExp(`(\\d{1,2})\\s*${name}`, "i");
    const m = text.match(pat);
    if (m) return new Date(year, month - 1, parseInt(m[1]));
  }
  // Try "DD/MM" or "DD-MM" pattern
  const numPat = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (numPat) {
    const day = parseInt(numPat[1]);
    const month = parseInt(numPat[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }
  return null;
}

function parseCustomerMessage(text: string): ParseResult | null {
  const result: ParseResult = { confidence: 0 };

  // Check for Hijri dates only in date-anchor context (not globally)
  if (detectHijriInDateContext(text)) {
    result.isHijri = true;
  }

  // --- Extract days from arrival/departure dates ---
  const currentYear = new Date().getFullYear();

  // Split text around arrival/departure markers
  const arrivalMarkers = /(?:تاريخ\s*الوصول|الوصول|وصول|arrival)\s*:?\s*/i;
  const departureMarkers = /(?:تاريخ\s*المغادرة|المغادرة|مغادرة|departure)\s*:?\s*/i;

  const arrMatch = text.match(arrivalMarkers);
  const depMatch = text.match(departureMarkers);

  if (arrMatch && depMatch && !result.isHijri) {
    const arrIdx = text.search(arrivalMarkers);
    const depIdx = text.search(departureMarkers);
    const afterArr = text.substring(arrIdx + (arrMatch[0]?.length || 0));
    const afterDep = text.substring(depIdx + (depMatch[0]?.length || 0));

    const arrDate = parseArabicDate(afterArr, currentYear);
    const depDate = parseArabicDate(afterDep, currentYear);

    if (arrDate && depDate) {
      let diffMs = depDate.getTime() - arrDate.getTime();
      if (diffMs < 0) {
        // Departure in next year
        depDate.setFullYear(depDate.getFullYear() + 1);
        diffMs = depDate.getTime() - arrDate.getTime();
      }
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 60) {
        // Travel industry: diff = nights, days = nights + 1
        result.totalNights = diffDays;
        result.days = diffDays + 1;
        result.confidence += 40;
      }
    }
  }

  // --- Extract direct day count: "12 يوم" / "12 أيام" / "12 days" ---
  if (!result.days) {
    const dayPat = text.match(/(\d{1,2})\s*(?:يوم|أيام|ايام|days?)/i);
    if (dayPat) {
      const d = parseInt(dayPat[1]);
      if (d >= 1 && d <= 60) {
        result.days = d;
        result.totalNights = d - 1;
        result.confidence += 35;
      }
    }
  }

  // --- Extract adults ---
  const adultsPatterns = [
    /(?:عدد\s*)?(?:الأشخاص|الاشخاص|الأفراد|الافراد)?\s*(?:البالغين|بالغين|الكبار)\s*:?\s*(\d{1,2})/i,
    /(?:البالغين|بالغين|الكبار|adults?)\s*:?\s*(\d{1,2})/i,
    /(?:عدد\s*)?(?:الأشخاص|الاشخاص|الأفراد|الافراد)\s*:?\s*(\d{1,2})/i,
    /(\d{1,2})\s*(?:شخص|أشخاص|اشخاص|بالغ|بالغين|adults?)/i,
  ];
  for (const pat of adultsPatterns) {
    const m = text.match(pat);
    if (m) {
      const a = parseInt(m[1]);
      if (a >= 1 && a <= 50) {
        result.adults = a;
        result.confidence += 30;
        break;
      }
    }
  }

  // --- Extract children ---
  const noChildPatterns = /(?:لا\s*يوجد|لايوجد|بدون|لا\s*أطفال|لا\s*اطفال|00|0)\s*(?:أطفال|اطفال)?/i;
  const childSection = text.match(/(?:عدد\s*)?(?:الأطفال|الاطفال|أطفال|اطفال|children)\s*:?\s*(.*)/i);

  if (childSection) {
    const childText = childSection[1].trim();
    if (noChildPatterns.test(childText) || childText === "0" || childText === "00") {
      result.childCount = 0;
      result.childAges = [];
      result.confidence += 20;
    } else {
      const countMatch = childText.match(/^(\d{1,2})/);
      if (countMatch) {
        result.childCount = parseInt(countMatch[1]);
        result.confidence += 15;
      }
    }
  } else {
    // Check for "لايوجد اطفال" anywhere
    if (/(?:لا\s*يوجد|لايوجد|بدون)\s*(?:أطفال|اطفال)/i.test(text)) {
      result.childCount = 0;
      result.childAges = [];
      result.confidence += 20;
    }
  }

  // --- Extract child ages ---
  const agesPat = text.match(/(?:أعمارهم|اعمارهم|عمر|ages?)\s*:?\s*([\d\s,،]+)/i);
  if (agesPat && result.childCount !== 0) {
    const agesStr = agesPat[1].replace(/[,،]/g, " ");
    const ages = agesStr.split(/\s+/).filter(s => s.length > 0).map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 0 && n <= 17);
    if (ages.length > 0) {
      result.childAges = ages;
      result.childCount = ages.length;
      result.confidence += 10;
    }
  }

  // Only return if we extracted at least something useful
  if (result.confidence >= 30) return result;
  return null;
}

// ======================== MAIN HANDLER ========================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // ========== TEXT MESSAGES ==========
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = (body.message.text || "").trim();
      const session = await getSession(chatId);

      // /start
      if (text === "/start") {
        await resetSession(chatId);
        await tgSend(chatId, "👋 مرحباً بك في <b>عالم الفخامة</b>!\n\n🌟 نظام آلي لإنشاء عروض أسعار رحلات جورجيا\n\nاضغط الزر أدناه للبدء:", {
          inline_keyboard: [[{ text: "📝 إنشاء عرض سعر جديد", callback_data: "new_quote" }]]
        });
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_DAYS — manual number input
      if (session.state === "AWAITING_DAYS") {
        const days = parseInt(text);
        if (isNaN(days) || days < 1 || days > 30) {
          await tgSend(chatId, "⚠️ يرجى إدخال رقم صحيح بين 1 و 30.");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.days = days;
        session.data.totalNights = days - 1;
        await saveSession(chatId, "AWAITING_ARRIVAL_AIRPORT", session.data);
        await tgSend(chatId, `✅ عدد الأيام: ${days} | عدد الليالي: ${days - 1}\n\n🛬 الرجاء اختيار مطار الوصول:`, {
          inline_keyboard: AIRPORTS.map(a => [{ text: `🛬 ${a.nameAr}`, callback_data: `arr_airport_${a.id}` }])
        });
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_NIGHTS — manual number input
      if (session.state === "AWAITING_NIGHTS") {
        const nights = parseInt(text);
        if (isNaN(nights) || nights < 0 || nights > 30) {
          await tgSend(chatId, "⚠️ يرجى إدخال رقم صحيح (0-30).");
          return new Response("OK", { headers: corsHeaders });
        }
        await handleNightsInput(chatId, session, nights);
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_ADULTS — manual number input
      if (session.state === "AWAITING_ADULTS") {
        const adults = parseInt(text);
        if (isNaN(adults) || adults < 1 || adults > 50) {
          await tgSend(chatId, "⚠️ يرجى إدخال عدد صحيح للبالغين (1-50).");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.adults = adults;
        await saveSession(chatId, "AWAITING_CHILDREN_CHECK", session.data);
        await tgSend(chatId, "👶 هل يوجد أطفال (12 سنة أو أقل)؟", {
          inline_keyboard: [[
            { text: "نعم 👶", callback_data: "children_yes" },
            { text: "لا ❌", callback_data: "children_no" }
          ]]
        });
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_CHILD_AGES — manual ages input
      if (session.state === "AWAITING_CHILD_AGES") {
        const agesText = text.replace(/،/g, " ").replace(/,/g, " ");
        const ageStrings = agesText.split(/\s+/).filter(s => s.length > 0);
        const ages: number[] = [];
        for (const s of ageStrings) {
          const age = parseInt(s);
          if (isNaN(age) || age < 0 || age > 17) {
            await tgSend(chatId, "⚠️ يرجى إدخال أعمار صحيحة (0-17) مفصولة بمسافة.\n\nمثال: 4 7 10");
            return new Response("OK", { headers: corsHeaders });
          }
          ages.push(age);
        }
        if (ages.length === 0) {
          await tgSend(chatId, "⚠️ يرجى إدخال عمر واحد على الأقل.\n\nمثال: 4 7 10");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.childAges = ages;
        const { effectivePax, childrenOver6, childrenUnder6 } = calcEffectivePax(session.data.adults!, ages);
        session.data.effectivePax = effectivePax;
        session.data.childrenOver6 = childrenOver6;
        session.data.childrenUnder6 = childrenUnder6;
        await saveSession(chatId, "AWAITING_VIEW", session.data);
        await tgSend(chatId, "🖼️ الرجاء اختيار نوع الإطلالة:", {
          inline_keyboard: [[
            { text: "🖼️ مع إطلالة", callback_data: "view_with" },
            { text: "🏨 بدون إطلالة", callback_data: "view_without" },
            { text: "📊 النوعين", callback_data: "view_both" }
          ]]
        });
        return new Response("OK", { headers: corsHeaders });
      }

      // ========== SMART PARSER INTERCEPTOR ==========
      // In IDLE state with a long-ish message, try to parse it
      if (session.state === "IDLE" && text.length > 15 && text !== "/start") {
        const parsed = parseCustomerMessage(text);
        if (parsed) {
          // Build confirmation
          const newData: SessionData = {};
          let confirmLines: string[] = [];

          if (parsed.isHijri) {
            await tgSend(chatId, "⚠️ تم اكتشاف تواريخ هجرية. يرجى إدخال البيانات يدوياً.\n\nأرسل /start للبدء.");
            return new Response("OK", { headers: corsHeaders });
          }

          if (parsed.days) {
            newData.days = parsed.days;
            newData.totalNights = parsed.totalNights;
            confirmLines.push(`• المدة: ${parsed.days} أيام / ${parsed.totalNights} ليالي`);
          }
          if (parsed.adults) {
            newData.adults = parsed.adults;
            confirmLines.push(`• البالغين: ${parsed.adults}`);
          }
          if (parsed.childCount !== undefined) {
            if (parsed.childCount === 0) {
              newData.hasChildren = false;
              newData.childAges = [];
              newData.childrenOver6 = 0;
              newData.childrenUnder6 = 0;
              confirmLines.push("• الأطفال: لا يوجد");
            } else {
              newData.hasChildren = true;
              if (parsed.childAges && parsed.childAges.length > 0) {
                newData.childAges = parsed.childAges;
                const { effectivePax, childrenOver6, childrenUnder6 } = calcEffectivePax(parsed.adults || 1, parsed.childAges);
                newData.childrenOver6 = childrenOver6;
                newData.childrenUnder6 = childrenUnder6;
                confirmLines.push(`• الأطفال: ${parsed.childCount} (أعمارهم: ${parsed.childAges.join(", ")})`);
              } else {
                confirmLines.push(`• الأطفال: ${parsed.childCount}`);
              }
            }
          }

          if (confirmLines.length > 0) {
            await saveSession(chatId, "AWAITING_PARSE_CONFIRM", newData);
            await tgSend(chatId,
              `🤖 <b>تم استخراج البيانات تلقائياً:</b>\n\n${confirmLines.join("\n")}\n\nهل البيانات صحيحة؟`,
              {
                inline_keyboard: [[
                  { text: "✅ نعم، أكمل الاختيار", callback_data: "parse_confirm_yes" },
                  { text: "✏️ إدخال يدوي", callback_data: "parse_confirm_manual" }
                ]]
              }
            );
            return new Response("OK", { headers: corsHeaders });
          }
        }
      }

      // Default
      await tgSend(chatId, "أرسل /start لبدء إنشاء عرض سعر جديد.\n\n💡 أو الصق رسالة العميل مباشرة وسيتم استخراج البيانات تلقائياً.");
      return new Response("OK", { headers: corsHeaders });
    }

    // ========== CALLBACK QUERIES ==========
    if (body.callback_query) {
      const cb = body.callback_query;
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;
      const cbData = cb.data;
      const session = await getSession(chatId);

      // ---- NEW QUOTE ----
      if (cbData === "new_quote") {
        await resetSession(chatId);
        await saveSession(chatId, "AWAITING_DAYS", {});
        const row1 = [6,7,8,9,10].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
        const row2 = [11,12,13,14,15].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
        await tgSend(chatId, "🗓️ كم عدد أيام الرحلة؟\n\nاختر من الأزرار أو اكتب الرقم مباشرة:", {
          inline_keyboard: [row1, row2]
        });
        await tgAnswer(cb.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PARSE CONFIRM YES ----
      if (cbData === "parse_confirm_yes") {
        // Skip to the first missing step
        // If we have days+adults+children → go to arrival airport
        // If we have days only → go to arrival airport, will ask adults later
        // If we have adults only → go to days
        const d = session.data;

        if (d.days && d.adults !== undefined) {
          // We have both days and adults, set effective pax if children resolved
          if (d.hasChildren === false || (d.childAges && d.childAges.length > 0)) {
            if (!d.effectivePax) {
              const ages = d.childAges || [];
              const { effectivePax, childrenOver6, childrenUnder6 } = calcEffectivePax(d.adults, ages);
              d.effectivePax = effectivePax;
              d.childrenOver6 = childrenOver6;
              d.childrenUnder6 = childrenUnder6;
            }
          }
          // Jump to arrival airport
          await saveSession(chatId, "AWAITING_ARRIVAL_AIRPORT", d);
          await tgSend(chatId, `✅ تم تأكيد البيانات!\n\n🛬 الرجاء اختيار مطار الوصول:`, {
            inline_keyboard: AIRPORTS.map(a => [{ text: `🛬 ${a.nameAr}`, callback_data: `arr_airport_${a.id}` }])
          });
        } else if (d.days) {
          // Have days but no adults → go to arrival airport, will ask adults after nights
          await saveSession(chatId, "AWAITING_ARRIVAL_AIRPORT", d);
          await tgSend(chatId, `✅ تم تأكيد البيانات!\n\n🛬 الرجاء اختيار مطار الوصول:`, {
            inline_keyboard: AIRPORTS.map(a => [{ text: `🛬 ${a.nameAr}`, callback_data: `arr_airport_${a.id}` }])
          });
        } else {
          // Only have adults, need days
          await saveSession(chatId, "AWAITING_DAYS", d);
          const row1 = [6,7,8,9,10].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
          const row2 = [11,12,13,14,15].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
          await tgSend(chatId, "🗓️ كم عدد أيام الرحلة؟\n\nاختر من الأزرار أو اكتب الرقم مباشرة:", {
            inline_keyboard: [row1, row2]
          });
        }
        await tgAnswer(cb.id, "✅ تم التأكيد");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PARSE CONFIRM MANUAL ----
      if (cbData === "parse_confirm_manual") {
        await resetSession(chatId);
        await saveSession(chatId, "AWAITING_DAYS", {});
        const row1 = [6,7,8,9,10].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
        const row2 = [11,12,13,14,15].map(n => ({ text: `${n}`, callback_data: `days_${n}` }));
        await tgSend(chatId, "🗓️ كم عدد أيام الرحلة؟\n\nاختر من الأزرار أو اكتب الرقم مباشرة:", {
          inline_keyboard: [row1, row2]
        });
        await tgAnswer(cb.id, "✏️ إدخال يدوي");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- DAYS QUICK BUTTON ----
      if (cbData.startsWith("days_")) {
        const days = parseInt(cbData.replace("days_", ""));
        session.data.days = days;
        session.data.totalNights = days - 1;
        await saveSession(chatId, "AWAITING_ARRIVAL_AIRPORT", session.data);
        await tgSend(chatId, `✅ عدد الأيام: ${days} | عدد الليالي: ${days - 1}\n\n🛬 الرجاء اختيار مطار الوصول:`, {
          inline_keyboard: AIRPORTS.map(a => [{ text: `🛬 ${a.nameAr}`, callback_data: `arr_airport_${a.id}` }])
        });
        await tgAnswer(cb.id, `✅ ${days} أيام`);
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- ARRIVAL AIRPORT ----
      if (cbData.startsWith("arr_airport_")) {
        const airportId = cbData.replace("arr_airport_", "");
        const airport = AIRPORTS.find(a => a.id === airportId);
        if (airport) {
          session.data.arrivalAirport = airport.id;
          session.data.arrivalAirportName = airport.nameAr;
          await saveSession(chatId, "AWAITING_DEPARTURE_AIRPORT", session.data);
          await tgSend(chatId, `✅ مطار الوصول: ${airport.nameAr}\n\n🛫 الرجاء اختيار مطار المغادرة:`, {
            inline_keyboard: AIRPORTS.map(a => [{ text: `🛫 ${a.nameAr}`, callback_data: `dep_airport_${a.id}` }])
          });
          await tgAnswer(cb.id, `✅ ${airport.nameAr}`);
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- DEPARTURE AIRPORT ----
      if (cbData.startsWith("dep_airport_")) {
        const airportId = cbData.replace("dep_airport_", "");
        const airport = AIRPORTS.find(a => a.id === airportId);
        if (airport) {
          session.data.departureAirport = airport.id;
          session.data.departureAirportName = airport.nameAr;
          session.data.route = [];
          await saveSession(chatId, "AWAITING_CITIES", session.data);
          await sendRouteBuilder(chatId, session.data);
          await tgAnswer(cb.id, `✅ ${airport.nameAr}`);
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- ROUTE BUILDER: Add City ----
      if (cbData.startsWith("route_add_")) {
        const cityId = cbData.replace("route_add_", "");
        const route = session.data.route || [];
        route.push(cityId);
        session.data.route = route;
        await saveSession(chatId, "AWAITING_CITIES", session.data);
        await updateRouteBuilder(chatId, msgId, session.data);
        await tgAnswer(cb.id, `➕ ${cityNameAr(cityId)}`);
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- ROUTE BUILDER: Undo Last ----
      if (cbData === "route_undo") {
        const route = session.data.route || [];
        if (route.length > 0) {
          route.pop();
          session.data.route = route;
          await saveSession(chatId, "AWAITING_CITIES", session.data);
          await updateRouteBuilder(chatId, msgId, session.data);
          await tgAnswer(cb.id, "↩️ تم الحذف");
        } else {
          await tgAnswer(cb.id, "⚠️ المسار فارغ");
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- ROUTE BUILDER: Done ----
      if (cbData === "route_done") {
        const route = session.data.route || [];
        if (route.length === 0) {
          await tgAnswer(cb.id, "⚠️ يرجى إضافة مدينة واحدة على الأقل");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.cityNights = route.map(city => ({ city, nights: 0 }));
        session.data.currentCityIndex = 0;
        await saveSession(chatId, "AWAITING_NIGHTS", session.data);
        await sendNightsPrompt(chatId, session.data);
        await tgAnswer(cb.id, "✅ تم تحديد المسار");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- NIGHTS QUICK BUTTON ----
      if (cbData.startsWith("nights_")) {
        const n = parseInt(cbData.replace("nights_", ""));
        await handleNightsInput(chatId, session, n);
        await tgAnswer(cb.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PREV CITY ----
      if (cbData === "prev_city") {
        const idx = session.data.currentCityIndex || 0;
        if (idx > 0) {
          session.data.currentCityIndex = idx - 1;
          await saveSession(chatId, "AWAITING_NIGHTS", session.data);
          await sendNightsPrompt(chatId, session.data);
        }
        await tgAnswer(cb.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- EDIT ROUTE ----
      if (cbData === "edit_route") {
        session.data.route = [];
        session.data.cityNights = [];
        session.data.currentCityIndex = 0;
        await saveSession(chatId, "AWAITING_CITIES", session.data);
        await sendRouteBuilder(chatId, session.data);
        await tgAnswer(cb.id, "🔄 تعديل المسار");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- EDIT NIGHTS ----
      if (cbData === "edit_nights") {
        const route = session.data.route || [];
        session.data.cityNights = route.map(city => ({ city, nights: 0 }));
        session.data.currentCityIndex = 0;
        await saveSession(chatId, "AWAITING_NIGHTS", session.data);
        await sendNightsPrompt(chatId, session.data);
        await tgAnswer(cb.id, "🔄 تعديل الليالي");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- VIEW PREFERENCE ----
      if (cbData === "view_with" || cbData === "view_without" || cbData === "view_both") {
        if (cbData === "view_with") session.data.viewPreference = "view";
        else if (cbData === "view_without") session.data.viewPreference = "no_view";
        else session.data.viewPreference = "both";

        // Pax info is always resolved before view step (new flow: Pax → View)
        if (!session.data.effectivePax) {
          const ages = session.data.childAges || [];
          const { effectivePax, childrenOver6, childrenUnder6 } = calcEffectivePax(session.data.adults!, ages);
          session.data.effectivePax = effectivePax;
          session.data.childrenOver6 = childrenOver6;
          session.data.childrenUnder6 = childrenUnder6;
        }
        await saveSession(chatId, "PROCESSING", session.data);
        await generateAndSendQuote(chatId, session.data);
        const label = cbData === "view_with" ? "مع إطلالة" : cbData === "view_without" ? "بدون إطلالة" : "النوعين";
        await tgAnswer(cb.id, `✅ ${label}`);
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- CHILDREN YES/NO ----
      if (cbData === "children_yes") {
        session.data.hasChildren = true;
        await saveSession(chatId, "AWAITING_CHILD_AGES", session.data);
        await tgSend(chatId, "يرجى كتابة أعمار الأطفال مفصولة بمسافة:\n\nمثال: 4 7 10\n\n📌 سياسة الأعمار:\n• 6 سنوات أو أقل = مجاناً\n• فوق 6 سنوات = يُحسبون كبالغين");
        await tgAnswer(cb.id, "");
        return new Response("OK", { headers: corsHeaders });
      }
      if (cbData === "children_no") {
        session.data.hasChildren = false;
        session.data.childAges = [];
        session.data.childrenOver6 = 0;
        session.data.childrenUnder6 = 0;
        session.data.effectivePax = session.data.adults;
        await saveSession(chatId, "AWAITING_VIEW", session.data);
        await tgSend(chatId, "🖼️ الرجاء اختيار نوع الإطلالة:", {
          inline_keyboard: [[
            { text: "🖼️ مع إطلالة", callback_data: "view_with" },
            { text: "🏨 بدون إطلالة", callback_data: "view_without" },
            { text: "📊 النوعين", callback_data: "view_both" }
          ]]
        });
        await tgAnswer(cb.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- DOWNLOAD PDF (show format choice) ----
      if (cbData === "download_pdf") {
        if (session.state !== "DONE" || !session.data.quoteResult) {
          await tgAnswer(cb.id, "⚠️ لا يوجد عرض للتحميل");
          return new Response("OK", { headers: corsHeaders });
        }
        await tgAnswer(cb.id, "");
        const pdfButtons: any[][] = [
          [{ text: "📱 عرض سريع (موبايل - HTML)", callback_data: "pdf_mobile" }],
          [{ text: "🖥️ عرض سريع (كمبيوتر - HTML)", callback_data: "pdf_desktop" }],
          [{ text: "💎 عرض VIP فخم (التصميم الأصلي)", callback_data: "pdf_vip" }],
        ];
        if (session.data.quoteResult?.isHoneymoon) {
          pdfButtons.push([{ text: "💕 عرض شهر العسل", callback_data: "pdf_honeymoon" }]);
        }
        await tgSend(chatId, "📄 اختر نوع العرض:", { inline_keyboard: pdfButtons });
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PDF MOBILE ----
      if (cbData === "pdf_mobile") {
        if (session.state !== "DONE" || !session.data.quoteResult) {
          await tgAnswer(cb.id, "⚠️ لا يوجد عرض للتحميل");
          return new Response("OK", { headers: corsHeaders });
        }
        await tgAnswer(cb.id, "⏳ جاري إعداد عرض الموبايل...");
        try {
          const html = generateMobileHTML(session.data.quoteResult);
          const pdfBuffer = await convertHTMLToPDF(html);
          await tgSendDocument(chatId, pdfBuffer, "Luxury_World_Mobile.pdf", "📱 عرض السعر — موبايل");
        } catch (err) {
          console.error("PDF mobile error:", err);
          await tgSend(chatId, "⚠️ حدث خطأ أثناء إعداد ملف PDF. حاول مرة أخرى.");
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PDF DESKTOP ----
      if (cbData === "pdf_desktop") {
        if (session.state !== "DONE" || !session.data.quoteResult) {
          await tgAnswer(cb.id, "⚠️ لا يوجد عرض للتحميل");
          return new Response("OK", { headers: corsHeaders });
        }
        await tgAnswer(cb.id, "⏳ جاري إعداد العرض التقليدي...");
        try {
          const html = generateQuoteHTML(session.data.quoteResult);
          const pdfBuffer = await convertHTMLToPDF(html);
          await tgSendDocument(chatId, pdfBuffer, "Luxury_World_Quotation.pdf", "🖥️ عرض السعر — تقليدي");
        } catch (err) {
          console.error("PDF desktop error:", err);
          await tgSend(chatId, "⚠️ حدث خطأ أثناء إعداد ملف PDF. حاول مرة أخرى.");
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PDF VIP (PPTX → ConvertAPI PDF) ----
      if (cbData === "pdf_vip") {
        if (session.state !== "DONE" || !session.data.quoteResult) {
          await tgAnswer(cb.id, "⚠️ لا يوجد عرض للتحميل");
          return new Response("OK", { headers: corsHeaders });
        }
        await tgAnswer(cb.id, "⏳ جاري إعداد عرض VIP الفخم...");
        try {
          const pptxBuf = await generateVipPPTX(session.data.quoteResult);
          const pdfBuffer = await convertPPTXToPDF(pptxBuf);
          await tgSendDocument(chatId, pdfBuffer, "Luxury_World_VIP_Offer.pdf", "💎 عرض VIP فخم — التصميم الأصلي");
        } catch (err) {
          console.error("PDF VIP error:", err);
          await tgSend(chatId, "⚠️ حدث خطأ أثناء إعداد عرض VIP. حاول مرة أخرى.");
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- PDF HONEYMOON ----
      if (cbData === "pdf_honeymoon") {
        if (session.state !== "DONE" || !session.data.quoteResult) {
          await tgAnswer(cb.id, "⚠️ لا يوجد عرض للتحميل");
          return new Response("OK", { headers: corsHeaders });
        }
        await tgAnswer(cb.id, "⏳ جاري إعداد عرض شهر العسل...");
        try {
          const html = generateHoneymoonHTML(session.data.quoteResult);
          const pdfBuffer = await convertHTMLToPDF(html);
          await tgSendDocument(chatId, pdfBuffer, "Luxury_World_Honeymoon.pdf", "💕 عرض شهر العسل");
        } catch (err) {
          console.error("PDF honeymoon error:", err);
          await tgSend(chatId, "⚠️ حدث خطأ أثناء إعداد ملف PDF. حاول مرة أخرى.");
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ---- COPY / NEW ----
      if (cbData === "copy_quote") {
        await tgAnswer(cb.id, "✅ قم بإعادة توجيه الرسالة للعميل");
        return new Response("OK", { headers: corsHeaders });
      }
      if (cbData === "start_new_quote") {
        await resetSession(chatId);
        await tgSend(chatId, "👋 مرحباً بك في <b>عالم الفخامة</b>!\n\n🌟 نظام آلي لإنشاء عروض أسعار رحلات جورجيا\n\nاضغط الزر أدناه للبدء:", {
          inline_keyboard: [[{ text: "📝 إنشاء عرض سعر جديد", callback_data: "new_quote" }]]
        });
        await tgAnswer(cb.id, "🔄 بدء عرض جديد");
        return new Response("OK", { headers: corsHeaders });
      }

      await tgAnswer(cb.id, "");
      return new Response("OK", { headers: corsHeaders });
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Bot Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ======================== ROUTE BUILDER ========================
function buildRouteText(route: string[]): string {
  if (route.length === 0) return "⚠️ لم يتم إضافة أي مدينة بعد";
  return "📍 المسار الحالي:\n" + route.map(c => `${cityEmoji(c)} ${cityNameAr(c)}`).join(" ➔ ");
}

async function sendRouteBuilder(chatId: number, data: SessionData) {
  const route = data.route || [];
  const totalNights = data.totalNights || 0;
  const kb: any[][] = [];
  for (let i = 0; i < CITIES.length; i += 2) {
    const row: any[] = [{ text: `${CITIES[i].emoji} ${CITIES[i].nameAr}`, callback_data: `route_add_${CITIES[i].id}` }];
    if (i + 1 < CITIES.length) {
      row.push({ text: `${CITIES[i+1].emoji} ${CITIES[i+1].nameAr}`, callback_data: `route_add_${CITIES[i+1].id}` });
    }
    kb.push(row);
  }
  const actionRow: any[] = [];
  if (route.length > 0) actionRow.push({ text: "↩️ تراجع", callback_data: "route_undo" });
  actionRow.push({ text: "✅ متابعة", callback_data: "route_done" });
  kb.push(actionRow);

  const routeText = buildRouteText(route);
  await tgSend(chatId, `🏙️ قم ببناء مسار الرحلة بالترتيب:\n(اضغط على المدينة لإضافتها للمسار)\n\n📅 إجمالي الليالي: ${totalNights}\n\n${routeText}`, { inline_keyboard: kb });
}

async function updateRouteBuilder(chatId: number, msgId: number, data: SessionData) {
  const route = data.route || [];
  const totalNights = data.totalNights || 0;
  const kb: any[][] = [];
  for (let i = 0; i < CITIES.length; i += 2) {
    const row: any[] = [{ text: `${CITIES[i].emoji} ${CITIES[i].nameAr}`, callback_data: `route_add_${CITIES[i].id}` }];
    if (i + 1 < CITIES.length) {
      row.push({ text: `${CITIES[i+1].emoji} ${CITIES[i+1].nameAr}`, callback_data: `route_add_${CITIES[i+1].id}` });
    }
    kb.push(row);
  }
  const actionRow: any[] = [];
  if (route.length > 0) actionRow.push({ text: "↩️ تراجع", callback_data: "route_undo" });
  actionRow.push({ text: "✅ متابعة", callback_data: "route_done" });
  kb.push(actionRow);

  const routeText = buildRouteText(route);
  await tgEditText(chatId, msgId, `🏙️ قم ببناء مسار الرحلة بالترتيب:\n(اضغط على المدينة لإضافتها للمسار)\n\n📅 إجمالي الليالي: ${totalNights}\n\n${routeText}`, { inline_keyboard: kb });
}

// ======================== NIGHTS PROMPT ========================
async function sendNightsPrompt(chatId: number, data: SessionData) {
  const idx = data.currentCityIndex || 0;
  const cn = data.cityNights?.[idx];
  if (!cn) return;
  const totalNights = data.totalNights || 0;
  const used = (data.cityNights || []).reduce((s, c, i) => i === idx ? s : s + c.nights, 0);
  const remaining = totalNights - used;
  const max = Math.min(remaining, 10);
  const row1 = [1,2,3,4,5].filter(n => n <= max).map(n => ({ text: `${n}`, callback_data: `nights_${n}` }));
  const row2 = [6,7,8,9,10].filter(n => n <= max).map(n => ({ text: `${n}`, callback_data: `nights_${n}` }));
  const nav: any[] = [];
  if (idx > 0) nav.push({ text: "⬅️ السابق", callback_data: "prev_city" });
  nav.push({ text: "🔄 تعديل المسار", callback_data: "edit_route" });
  const kb: any[][] = [];
  if (row1.length) kb.push(row1);
  if (row2.length) kb.push(row2);
  kb.push(nav);
  await tgSend(chatId,
    `${cityEmoji(cn.city)} كم عدد الليالي في <b>${cityNameAr(cn.city)}</b>؟\n\n📊 المتبقي: ${remaining} من ${totalNights}\n📍 المحطة ${idx+1} من ${(data.cityNights||[]).length}\n\nاختر من الأزرار أو اكتب الرقم:`,
    { inline_keyboard: kb }
  );
}

// ======================== NIGHTS INPUT HANDLER ========================
async function handleNightsInput(chatId: number, session: Session, nights: number) {
  const idx = session.data.currentCityIndex || 0;
  if (!session.data.cityNights) return;
  session.data.cityNights[idx].nights = nights;

  if (idx < session.data.cityNights.length - 1) {
    session.data.currentCityIndex = idx + 1;
    await saveSession(chatId, "AWAITING_NIGHTS", session.data);
    await sendNightsPrompt(chatId, session.data);
  } else {
    const total = session.data.totalNights || 0;
    const sum = session.data.cityNights.reduce((s, c) => s + c.nights, 0);
    let msg = "📋 <b>ملخص توزيع الليالي:</b>\n\n";
    for (const c of session.data.cityNights) {
      msg += `${cityEmoji(c.city)} <b>${cityNameAr(c.city)}</b>: ${c.nights} ${c.nights === 1 ? "ليلة" : "ليالي"}\n`;
    }
    msg += `\n━━━━━━━━━━━━━━━━\n📊 المجموع: ${sum} من ${total} ليلة`;

    if (sum !== total) {
      const diff = total - sum;
      msg += diff > 0 ? `\n\n⚠️ نقص: ${diff} ليلة` : `\n\n⚠️ زيادة: ${Math.abs(diff)} ليلة`;
      msg += "\n\nيرجى تعديل التوزيع ليتطابق مع إجمالي الليالي.";
      await saveSession(chatId, "NIGHTS_SUMMARY", session.data);
      await tgSend(chatId, msg, {
        inline_keyboard: [
          [{ text: "🔄 تعديل الليالي", callback_data: "edit_nights" }],
          [{ text: "🔄 تعديل المسار", callback_data: "edit_route" }]
        ]
      });
    } else {
      await tgSend(chatId, msg);
      // New flow: Nights → Pax → View. Check if pax info already known.
      if (session.data.adults) {
        if (session.data.hasChildren === false || (session.data.childAges && session.data.childAges.length > 0)) {
          if (!session.data.effectivePax) {
            const ages = session.data.childAges || [];
            const { effectivePax, childrenOver6, childrenUnder6 } = calcEffectivePax(session.data.adults, ages);
            session.data.effectivePax = effectivePax;
            session.data.childrenOver6 = childrenOver6;
            session.data.childrenUnder6 = childrenUnder6;
          }
          await saveSession(chatId, "AWAITING_VIEW", session.data);
          await tgSend(chatId, "🖼️ الرجاء اختيار نوع الإطلالة:", {
            inline_keyboard: [[
              { text: "🖼️ مع إطلالة", callback_data: "view_with" },
              { text: "🏨 بدون إطلالة", callback_data: "view_without" },
              { text: "📊 النوعين", callback_data: "view_both" }
            ]]
          });
        } else {
          await saveSession(chatId, "AWAITING_CHILDREN_CHECK", session.data);
          await tgSend(chatId, "👶 هل يوجد أطفال (12 سنة أو أقل)؟", {
            inline_keyboard: [[
              { text: "نعم 👶", callback_data: "children_yes" },
              { text: "لا ❌", callback_data: "children_no" }
            ]]
          });
        }
      } else {
        await saveSession(chatId, "AWAITING_ADULTS", session.data);
        await tgSend(chatId, "👨‍👩‍👦 كم عدد البالغين (أكبر من 12 سنة)؟\n\nاكتب الرقم مباشرة (مثال: 2)");
      }
    }
  }
}

// ======================== QUOTE GENERATION (USD ONLY) — v12.0.0 ========================
async function generateAndSendQuote(chatId: number, data: SessionData) {
  const days = data.days!;
  const cityNights = data.cityNights || [];
  const adults = data.adults!;
  const arrivalName = data.arrivalAirportName || "مطار تبليسي";
  const departureName = data.departureAirportName || "مطار تبليسي";
  const viewPref = data.viewPreference || "no_view";
  const childrenOver6 = data.childrenOver6 || 0;
  const childrenUnder6 = data.childrenUnder6 || 0;
  const effectivePax = data.effectivePax || adults;
  const totalChildren = childrenOver6 + childrenUnder6;
  const totalNights = data.totalNights || (days - 1);
  const alloc = allocateRooms(effectivePax);

  // ── Auto-detect honeymoon (2 adults, 0 children) ──
  const isHoneymoon = (adults === 2 && totalChildren === 0);

  // ── Cache check ──
  const routeKey = cityNights.map(cn => `${cn.city}:${cn.nights}`).join(",");
  const cacheHash = await calcCacheHash(days, routeKey, effectivePax, viewPref, isHoneymoon);
  const cached = await checkCache(cacheHash);

  if (cached && cached.mobile_file_id) {
    await tgSend(chatId, "⚡ <b>تم العثور على عرض مطابق — إرسال فوري!</b>");
    if (cached.mobile_file_id) await tgSendDocumentByFileId(chatId, cached.mobile_file_id, "📱 عرض السعر — موبايل");
    if (cached.desktop_file_id) await tgSendDocumentByFileId(chatId, cached.desktop_file_id, "🖥️ عرض السعر — تقليدي");
    if (cached.vip_file_id) await tgSendDocumentByFileId(chatId, cached.vip_file_id, "💎 عرض VIP فخم");
    if (cached.honey_file_id) await tgSendDocumentByFileId(chatId, cached.honey_file_id, "💕 عرض شهر العسل");
    await tgSend(chatId, "✅ تم إرسال جميع الملفات من الذاكرة السريعة!", {
      inline_keyboard: [
        [{ text: "📋 نسخ العرض", callback_data: "copy_quote" }],
        [{ text: "🔄 عرض جديد", callback_data: "start_new_quote" }],
      ]
    });
    await saveSession(chatId, "DONE", data);
    return;
  }

  await tgSend(chatId, "⏳ جاري تحليل البيانات وحساب العرض...");

  // ── Fetch DB: 6 standard tiers + optional 6 honeymoon tiers ──
  const stdCats = ["عرض 1", "عرض 2", "عرض 3", "عرض 4", "عرض 5", "عرض 6"];
  const honeyCats = ["هنيمون 1", "هنيمون 2", "هنيمون 3", "هنيمون 4", "هنيمون 5", "هنيمون 6"];
  const queries: Promise<any>[] = [
    supabase.from("system_settings").select("*").single(),
    supabase.from("car_pricing").select("*").eq("is_active", true).order("min_pax"),
  ];
  for (const cat of stdCats) queries.push(supabase.from("hotel_offers").select("*").eq("category", cat).eq("is_active", true));
  if (isHoneymoon) {
    for (const cat of honeyCats) queries.push(supabase.from("hotel_offers").select("*").eq("category", cat).eq("is_active", true));
  }
  const results = await Promise.all(queries);
  const profitMargin = results[0].data?.profit_margin ?? 22;
  const carPricing = results[1].data || [];
  const standardTiers = stdCats.map((_, i) => results[2 + i].data || []);
  const honeyTiers = isHoneymoon ? honeyCats.map((_, i) => results[8 + i].data || []) : [];

  // ── Room / Car / Services ──
  let roomText = "";
  if (alloc.triple > 0) roomText += `${alloc.triple} ثلاثية`;
  if (alloc.double > 0) roomText += (roomText ? " + " : "") + `${alloc.double} مزدوجة`;
  if (alloc.single > 0) roomText += (roomText ? " + " : "") + `${alloc.single} مفردة`;
  if (!roomText) roomText = "غرفة واحدة";

  const carTier = carPricing.find((c: any) => effectivePax >= c.min_pax && effectivePax <= c.max_pax);
  const carDaily = carTier?.price_per_day ?? carPricing[carPricing.length - 1]?.price_per_day ?? 100;
  const carCost = carDaily * days;
  const simCost = 15 * adults;
  const insuranceCost = 5 * days * effectivePax;
  const servicesCost = simCost + insuranceCost;

  // ── Standard tier calculation helper ──
  function calcTierBlock(hotels: any[], vMode: "view" | "no_view") {
    let hotelCost = 0;
    const hotelList: string[] = [];
    const hotelDetails: { cityAr: string; nights: number; hotelName: string }[] = [];
    for (const cn of cityNights) {
      const hotel = hotels.find((h: any) => h.city?.toLowerCase() === cn.city.toLowerCase());
      if (hotel) {
        const dbl = vMode === "view" ? hotel.dbl_view : hotel.dbl_no_view;
        const trbl = vMode === "view" ? hotel.trbl_view : hotel.trbl_no_view;
        const nightCost = (alloc.triple * trbl) + (alloc.double * dbl) + (alloc.single * dbl);
        hotelCost += nightCost * cn.nights;
        hotelList.push(`  • ${cityNameAr(cn.city)} (${cn.nights} ليالي): ${hotel.hotel_name}`);
        hotelDetails.push({ cityAr: cityNameAr(cn.city), nights: cn.nights, hotelName: hotel.hotel_name });
      } else {
        hotelList.push(`  • ${cityNameAr(cn.city)} (${cn.nights} ليالي): فندق محلي مميز`);
        hotelDetails.push({ cityAr: cityNameAr(cn.city), nights: cn.nights, hotelName: "فندق محلي مميز" });
      }
    }
    const baseCost = hotelCost + carCost + servicesCost;
    const withProfit = baseCost * (1 + profitMargin / 100);
    const finalUSD = Math.round(withProfit / 10) * 10;
    return { finalUSD, hotelList, hotelDetails };
  }

  // ── Honeymoon tier calculation (1 double room, view only) ──
  function calcHoneyBlock(hotels: any[]) {
    let hotelCost = 0;
    const hotelList: string[] = [];
    const hotelDetails: { cityAr: string; nights: number; hotelName: string }[] = [];
    for (const cn of cityNights) {
      const hotel = hotels.find((h: any) => h.city?.toLowerCase() === cn.city.toLowerCase());
      if (hotel) {
        hotelCost += hotel.dbl_view * cn.nights;
        hotelList.push(`  • ${cityNameAr(cn.city)} (${cn.nights} ليالي): ${hotel.hotel_name}`);
        hotelDetails.push({ cityAr: cityNameAr(cn.city), nights: cn.nights, hotelName: hotel.hotel_name });
      } else {
        hotelList.push(`  • ${cityNameAr(cn.city)} (${cn.nights} ليالي): فندق مميز`);
        hotelDetails.push({ cityAr: cityNameAr(cn.city), nights: cn.nights, hotelName: "فندق مميز" });
      }
    }
    const baseCost = hotelCost + carCost + servicesCost;
    const withProfit = baseCost * (1 + profitMargin / 100);
    const finalUSD = Math.round(withProfit / 10) * 10;
    return { finalUSD, hotelList, hotelDetails };
  }

  // ── Build 6 standard tier offers ──
  const tierLabels = ["💎 العرض الأول", "💎 العرض الثاني", "💎 العرض الثالث", "💎 العرض الرابع", "💎 العرض الخامس", "💎 العرض السادس"];
  const blocks: string[] = [];
  const qrTiers: any[] = [];

  for (let i = 0; i < 6; i++) {
    const hotels = standardTiers[i];
    if (viewPref === "both") {
      const wv = calcTierBlock(hotels, "view");
      const nv = calcTierBlock(hotels, "no_view");
      blocks.push(
        `━━━━━━━━━━━━━━━━━━━━\n${tierLabels[i]}:\n` +
        `🖼️ السعر مع إطلالة: $${wv.finalUSD}\n` +
        `💵 السعر بدون إطلالة: $${nv.finalUSD}\n` +
        `🏨 الفنادق:\n${wv.hotelList.join("\n")}`
      );
      qrTiers.push({ priceView: wv.finalUSD, priceNoView: nv.finalUSD, hotels: wv.hotelDetails });
    } else {
      const mode = viewPref === "view" ? "view" as const : "no_view" as const;
      const res = calcTierBlock(hotels, mode);
      blocks.push(
        `━━━━━━━━━━━━━━━━━━━━\n${tierLabels[i]}:\n` +
        `💵 السعر: $${res.finalUSD}\n` +
        `🏨 الفنادق:\n${res.hotelList.join("\n")}`
      );
      qrTiers.push({ price: res.finalUSD, hotels: res.hotelDetails });
    }
  }

  // ── Build honeymoon tier offers (auto-triggered) ──
  const honeyLabels = ["💕 هنيمون 1", "💕 هنيمون 2", "💕 هنيمون 3", "💕 هنيمون 4", "💕 هنيمون 5", "💕 هنيمون 6 (كوخ)"];
  const honeyBlocks: string[] = [];
  const qrHoneyTiers: any[] = [];

  if (isHoneymoon) {
    for (let i = 0; i < 6; i++) {
      const res = calcHoneyBlock(honeyTiers[i]);
      honeyBlocks.push(
        `━━━━━━━━━━━━━━━━━━━━\n${honeyLabels[i]}:\n` +
        `💕 السعر: $${res.finalUSD}\n` +
        `🏨 الفنادق:\n${res.hotelList.join("\n")}`
      );
      qrHoneyTiers.push({ price: res.finalUSD, hotels: res.hotelDetails });
    }
  }

  // ── Car only ──
  const carOnlyBase = carCost + servicesCost;
  const carOnlyProfit = carOnlyBase * (1 + profitMargin / 100);
  const carOnlyUSD = Math.round(carOnlyProfit / 10) * 10;
  const carBlock = `━━━━━━━━━━━━━━━━━━━━\n🚗 عرض سيارة فقط (بدون إقامة): $${carOnlyUSD}`;

  const airportText = `• المطار: وصول ${arrivalName} / مغادرة ${departureName}`;
  const servicesBlock = `━━━━━━━━━━━━━━━━━━━━\n✅ الخدمات المشمولة:\n• استقبال وتوديع من وإلى المطار.\n• سيارة خاصة مع سائق.\n• إفطار يومي.\n• شرائح اتصال وتأمين سفر.`;

  const childDisplay = totalChildren > 0 ? `${totalChildren}${childrenUnder6 > 0 ? ` (${childrenUnder6} مجاناً)` : ""}` : "لا يوجد";
  const route = cityNights.map(cn => cityNameAr(cn.city)).join(" ➔ ");

  let quote =
    `🌟 <b>عروض عالم الفخامة - جورجيا</b> 🌟\n\n` +
    `📋 ملخص الطلب:\n` +
    `• المدة: ${days} أيام / ${totalNights} ليالي\n${airportText}\n` +
    `• البالغين: ${adults} | الأطفال: ${childDisplay}\n` +
    `• الغرف: ${alloc.total} (${roomText})\n• المسار: ${route}\n\n` +
    blocks.join("\n\n") + "\n\n" + carBlock + "\n\n" + servicesBlock;

  if (isHoneymoon && honeyBlocks.length > 0) {
    quote += "\n\n" + `🌹 <b>عروض شهر العسل الخاصة</b> 🌹\n\n` + honeyBlocks.join("\n\n");
  }

  const quoteResult = {
    days, totalNights, adults,
    childrenDisplay: childDisplay, effectivePax,
    roomText, roomCount: alloc.total,
    route, arrivalAirport: arrivalName, departureAirport: departureName,
    carOnlyUSD, simCost, insuranceCost, servicesCost,
    tiers: qrTiers, viewPref, isHoneymoon,
    honeyTiers: qrHoneyTiers,
    cityNights: cityNights.map(cn => ({ city: cn.city, cityAr: cityNameAr(cn.city), nights: cn.nights })),
  };

  // ── Send text quote ──
  await tgSend(chatId, quote, {
    inline_keyboard: [
      [{ text: "📥 إعادة تحميل PDF", callback_data: "download_pdf" }],
      [{ text: "📋 نسخ / إرسال العرض للعميل", callback_data: "copy_quote" }],
      [{ text: "🔄 إنشاء عرض جديد", callback_data: "start_new_quote" }]
    ]
  });

  // ── Auto-generate all PDFs (sequential sending) ──
  const pdfTarget = isHoneymoon ? 4 : 3;
  await tgSend(chatId, `📄 جاري إعداد ${pdfTarget} ملفات PDF تلقائياً...`);

  const fileIds = { mobile: "", desktop: "", vip: "", honey: "" };
  let sentCount = 0;

  // 1) Mobile PDF
  try {
    const mobileHtml = generateMobileHTML(quoteResult);
    const mobilePdf = await convertHTMLToPDF(mobileHtml);
    fileIds.mobile = await tgSendDocument(chatId, mobilePdf, "Luxury_World_Mobile.pdf", "📱 عرض السعر — موبايل");
    if (fileIds.mobile) sentCount++;
  } catch (e) {
    console.error("Mobile PDF error:", e);
    await tgSend(chatId, `⚠️ فشل إنشاء ملف الموبايل: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
  }

  // 2) Desktop PDF
  try {
    const desktopHtml = generateQuoteHTML(quoteResult);
    const desktopPdf = await convertHTMLToPDF(desktopHtml);
    fileIds.desktop = await tgSendDocument(chatId, desktopPdf, "Luxury_World_Desktop.pdf", "🖥️ عرض السعر — تقليدي");
    if (fileIds.desktop) sentCount++;
  } catch (e) {
    console.error("Desktop PDF error:", e);
    await tgSend(chatId, `⚠️ فشل إنشاء ملف الكمبيوتر: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
  }

  // 3) VIP PPTX → PDF
  try {
    console.log("VIP PPTX: Starting template fetch...");
    const pptxBuf = await generateVipPPTX(quoteResult);
    console.log("VIP PPTX: Template rendered, buffer size:", pptxBuf.length);
    const vipPdf = await convertPPTXToPDF(pptxBuf);
    console.log("VIP PPTX: Converted to PDF, buffer size:", vipPdf.length);
    fileIds.vip = await tgSendDocument(chatId, vipPdf, "Luxury_World_VIP.pdf", "💎 عرض VIP فخم");
    if (fileIds.vip) sentCount++;
    console.log("VIP PPTX: Sent successfully, file_id:", fileIds.vip);
  } catch (e) {
    console.error("VIP PDF error:", e);
    await tgSend(chatId, `⚠️ فشل إنشاء ملف VIP: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
  }

  // 4) Honeymoon PDF (only if auto-detected)
  if (isHoneymoon) {
    try {
      const honeyHtml = generateHoneymoonHTML(quoteResult);
      const honeyPdf = await convertHTMLToPDF(honeyHtml);
      fileIds.honey = await tgSendDocument(chatId, honeyPdf, "Luxury_World_Honeymoon.pdf", "💕 عرض شهر العسل");
      if (fileIds.honey) sentCount++;
    } catch (e) {
      console.error("Honeymoon PDF error:", e);
      await tgSend(chatId, `⚠️ فشل إنشاء ملف شهر العسل: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
    }
  }

  // ── Cache file_ids ──
  await saveToCache(cacheHash, fileIds);

  const statusEmoji = sentCount === pdfTarget ? "✅" : "⚠️";
  await tgSend(chatId, `${statusEmoji} تم إرسال ${sentCount} من ${pdfTarget} ملفات بنجاح!\n🗃️ تم الحفظ في الذاكرة السريعة.`, {
    inline_keyboard: [
      [{ text: "📥 إعادة تحميل PDF", callback_data: "download_pdf" }],
      [{ text: "🔄 عرض جديد", callback_data: "start_new_quote" }],
    ]
  });

  data.quoteResult = quoteResult;
  await saveSession(chatId, "DONE", data);
}

// ======================== PDF GENERATION (HTML → ConvertAPI Chromium) ========================

// ── MOBILE "Price-First" Template ──
function generateMobileHTML(qr: any): string {
  const tierLabels = [
    "العرض الأول", "العرض الثاني", "العرض الثالث",
    "العرض الرابع", "العرض الخامس", "العرض السادس",
  ];
  const tierIcons = ["🥉", "🥈", "🥇", "💎", "👑", "🌟"];

  let tiersHTML = "";
  for (let i = 0; i < (qr.tiers?.length || 0); i++) {
    const t = qr.tiers[i];
    const hotels = t.hotels || [];

    let priceHTML = "";
    if (t.priceView !== undefined && t.priceNoView !== undefined) {
      priceHTML = `
        <div class="m-prices">
          <div class="m-pbadge gold"><span class="m-plbl">مع إطلالة</span><span class="m-pval">$${t.priceView}</span></div>
          <div class="m-pbadge silver"><span class="m-plbl">بدون إطلالة</span><span class="m-pval">$${t.priceNoView}</span></div>
        </div>`;
    } else {
      priceHTML = `
        <div class="m-prices">
          <div class="m-pbadge gold"><span class="m-plbl">السعر</span><span class="m-pval">$${t.price}</span></div>
        </div>`;
    }

    let routeItems = "";
    for (const h of hotels) {
      routeItems += `<div class="m-route-item"><span class="m-ri-city">📍 ${esc(h.cityAr)}</span><span class="m-ri-nights">🌙 ${h.nights} ليالي</span><span class="m-ri-hotel">🏨 ${esc(h.hotelName)}</span></div>`;
    }

    tiersHTML += `
    <div class="m-card">
      <div class="m-card-hdr">${tierIcons[i] || "💎"} ${tierLabels[i] || "عرض " + (i + 1)}</div>
      ${priceHTML}
      <div class="m-route">${routeItems}</div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:auto}
body{
  font-family:'Tajawal',sans-serif;
  direction:rtl;
  color:#1a1a2e;
  background:#ffffff;
  font-size:13px;
  line-height:1.65;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}

/* ── Header ── */
.m-header{
  background:linear-gradient(160deg,#0f0f23 0%,#1a1a3e 40%,#2a1f5e 100%);
  color:#fff;padding:30px 24px 24px;text-align:center;
  position:relative;overflow:hidden;
}
.m-header::before{
  content:'';position:absolute;top:-60px;right:-60px;
  width:200px;height:200px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,175,55,.15) 0%,transparent 70%);
}
.m-header::after{
  content:'';position:absolute;bottom:-40px;left:-40px;
  width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,175,55,.1) 0%,transparent 70%);
}
.m-logo{width:90px;height:auto;display:block;margin:0 auto 10px;position:relative;z-index:1}
.m-brand{font-size:26px;font-weight:800;color:#d4af37;position:relative;z-index:1;letter-spacing:1px}
.m-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;position:relative;z-index:1;font-weight:400}

/* ── Gold divider ── */
.m-divider{height:3px;background:linear-gradient(90deg,transparent,#d4af37,transparent);margin:0}

/* ── Summary ── */
.m-summary{
  background:#faf9f6;border-bottom:1px solid #eee;
  padding:16px 20px;
}
.m-sum-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;
}
.m-sum-item{font-size:12.5px;font-weight:500;color:#333}
.m-sum-item b{color:#0f0f23;font-weight:700}
.m-sum-route{
  grid-column:1/-1;text-align:center;
  background:#0f0f23;color:#d4af37;
  border-radius:6px;padding:6px 12px;
  font-size:12.5px;font-weight:700;margin-top:4px;
}

/* ── Tiers 2-Column Grid ── */
.m-tiers-grid{
  display:grid;grid-template-columns:repeat(2,1fr);
  gap:12px;padding:12px 16px;
}

/* ── Tier Cards ── */
.m-card{
  background:#fff;border:1px solid #e8e2d6;
  border-radius:10px;
  overflow:hidden;page-break-inside:avoid;
  box-shadow:0 2px 10px rgba(0,0,0,.06);
  display:flex;flex-direction:column;
}
.m-card-hdr{
  background:linear-gradient(90deg,#0f0f23 0%,#1a1a3e 100%);
  color:#d4af37;padding:10px 16px;
  font-weight:700;font-size:14px;
  border-bottom:2px solid #d4af37;
}

/* ── Price Badges ── */
.m-prices{display:flex;gap:10px;padding:14px 16px;justify-content:center;flex-wrap:wrap}
.m-pbadge{
  display:flex;flex-direction:column;align-items:center;
  padding:10px 22px;border-radius:10px;min-width:120px;
}
.m-pbadge.gold{background:linear-gradient(145deg,#d4af37,#f5d76e);color:#0f0f23}
.m-pbadge.silver{background:linear-gradient(145deg,#b0b0b0,#e0e0e0);color:#222}
.m-plbl{font-size:11px;font-weight:500;opacity:.8}
.m-pval{font-size:26px;font-weight:800;letter-spacing:.5px;line-height:1.2}

/* ── Route Items ── */
.m-route{padding:6px 16px 12px}
.m-route-item{
  display:flex;gap:6px;align-items:center;
  padding:7px 0;font-size:12.5px;font-weight:500;
  border-bottom:1px solid #f0ede6;
}
.m-route-item:last-child{border-bottom:none}
.m-ri-city{color:#0f0f23;font-weight:700;min-width:80px}
.m-ri-nights{color:#6b5b3a;min-width:60px}
.m-ri-hotel{color:#555;flex:1}

/* ── Car Only Block ── */
.m-car{
  background:linear-gradient(160deg,#0f0f23,#1a1a3e);
  border-radius:10px;padding:18px 16px;margin:12px 16px;
  text-align:center;color:#fff;page-break-inside:avoid;
}
.m-car-label{font-size:14px;font-weight:700;color:#d4af37;margin-bottom:8px}
.m-car-price{
  font-size:30px;font-weight:800;color:#0f0f23;
  background:linear-gradient(145deg,#d4af37,#f5d76e);
  display:inline-block;padding:6px 30px;border-radius:10px;
}

/* ── Services ── */
.m-services{
  background:#f6fbf6;border:1px solid #c8e6c9;
  border-right:4px solid #388e3c;
  border-radius:10px;margin:12px 16px;padding:14px 18px;
  page-break-inside:avoid;
}
.m-services h3{color:#2e7d32;font-size:14px;font-weight:700;margin-bottom:4px}
.m-svc-list{list-style:none;padding:0}
.m-svc-list li{padding:4px 0;font-size:13px;font-weight:500}
.m-svc-list li::before{content:"✅ "}

/* ── Terms / Alert Boxes ── */
.m-terms{margin:14px 16px 6px;page-break-inside:avoid}
.m-alert{border-radius:8px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}
.m-alert-hdr{padding:8px 14px;font-weight:700;font-size:13px}
.m-alert-body{padding:10px 14px;font-size:12px;line-height:1.75;font-weight:400}

.m-alert.orange .m-alert-hdr{background:#fff3e0;color:#e65100}
.m-alert.orange .m-alert-body{background:#fffbf5;color:#4e342e;border:1px solid #ffe0b2;border-top:none;border-radius:0 0 8px 8px}
.m-alert.blue .m-alert-hdr{background:#e3f2fd;color:#0d47a1}
.m-alert.blue .m-alert-body{background:#f5faff;color:#1a237e;border:1px solid #bbdefb;border-top:none;border-radius:0 0 8px 8px}
.m-alert.red .m-alert-hdr{background:#fce4ec;color:#b71c1c}
.m-alert.red .m-alert-body{background:#fff5f7;color:#4a0e0e;border:1px solid #f8bbd0;border-top:none;border-radius:0 0 8px 8px}
.m-alert.dark .m-alert-hdr{background:#0f0f23;color:#d4af37}
.m-alert.dark .m-alert-body{background:#0f0f23;color:#eaeaea;border:1px solid #333;border-top:none;border-radius:0 0 8px 8px;text-align:center;font-weight:500;font-size:12.5px}

/* ── Footer ── */
.m-footer{
  text-align:center;padding:14px;font-size:10px;color:#999;
  border-top:1px solid #eee;margin-top:8px;
}
</style>
</head>
<body>

<div class="m-header">
  <img class="m-logo" src="https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/logo.webp" alt="عالم الفخامة" />
  <div class="m-brand">عالم الفخامة</div>
  <div class="m-sub">LUXURY WORLD — عرض سعر رحلة جورجيا</div>
</div>
<div class="m-divider"></div>

<div class="m-summary">
  <div class="m-sum-grid">
    <div class="m-sum-item">📅 <b>${esc(String(qr.days))}</b> أيام / <b>${esc(String(qr.totalNights))}</b> ليالي</div>
    <div class="m-sum-item">🛏️ <b>${esc(String(qr.roomCount))}</b> غرف (${esc(qr.roomText || "")})</div>
    <div class="m-sum-item">👥 <b>${esc(String(qr.adults))}</b> بالغين</div>
    <div class="m-sum-item">👶 ${esc(qr.childrenDisplay || "لا يوجد")}</div>
    <div class="m-sum-item">✈️ وصول: <b>${esc(qr.arrivalAirport || "")}</b></div>
    <div class="m-sum-item">✈️ مغادرة: <b>${esc(qr.departureAirport || "")}</b></div>
    <div class="m-sum-route">🗺️ ${esc(qr.route)}</div>
  </div>
</div>

<div class="m-tiers-grid">
${tiersHTML}
</div>

<div class="m-car">
  <div class="m-car-label">🚗 سيارة فقط (بدون إقامة)</div>
  <div class="m-car-price">$${qr.carOnlyUSD || 0}</div>
</div>

<div class="m-services">
  <h3>✅ الخدمات المشمولة</h3>
  <ul class="m-svc-list">
    <li>استقبال وتوديع من وإلى المطار</li>
    <li>سيارة خاصة مع سائق طوال الرحلة</li>
    <li>إفطار يومي في الفندق</li>
    <li>شرائح اتصال وتأمين سفر</li>
  </ul>
</div>

<div class="m-terms">
  <div class="m-alert orange">
    <div class="m-alert-hdr">📌 ملاحظات مهمة</div>
    <div class="m-alert-body">الفنادق لدينا ارخص من مواقع الحجوزات ! والدفع بعد الوصول الى جورجيا نختار لأقامتك افضل الخيارات لذلك توجد أسعار اقل بخدمة او بجودة اقل ! فعالم الفخامة تحب ان يكون عمليها مرتاح في الرحلة البرنامج قابل للتغير مثلما تريد الرحلة رحلتك و نحن ننفذ . الدفع كاش بعملة الدولار الأمريكي واذا كان بالبطاقة البنكية يضاف 5% عمولة .</div>
  </div>
  <div class="m-alert blue">
    <div class="m-alert-hdr">📋 للتأكيد فقط ارسل</div>
    <div class="m-alert-body">جوازات السفر لأصدار التأمين و الحجوزات<br>تذاكر السفر موضح بها تاريخ الوصول و تاريخ المغادرة</div>
  </div>
  <div class="m-alert red">
    <div class="m-alert-hdr">⚠️ ملاحظة مهمة جدا</div>
    <div class="m-alert-body">أننا نعتز بهويتنا الأسلامية ولا نتخلى عن مبادئنا و منعنا هذه الامور التي يتم طلبها من (قلة من الاشخاص) و لانها تنافى تعاليم ديننا الاسلامى واخلاق المسلمين ، فأنها منعت منعاً باتاً ولمن يطلب هذه الامور تعتبر الرحلة ملغية: البغاء و المراقص وما شابهها و المشروبات الكحولية ، اذ كان طلبك يشابه المحرم فلا تُتَمِمَ الحجز معنا فالعوائل أولى بخدماتنا .. واذا ثبت هذه الأمور اثناء الرحلة سيتم الغاء الحجوزات و المبلغ غير مسترجع كلياً</div>
  </div>
  <div class="m-alert dark">
    <div class="m-alert-hdr">عالم الفخامة</div>
    <div class="m-alert-body">أنك تتعامل مع شركة عالم الفخامة التي وظفت خبراتها اتجاه جمع المعلومة الصحيحة و الخدمة الحقيقة التي لا تجعلك تندم لأختيارك الشركة ، توكل على الله و تواصل معنا الآن</div>
  </div>
</div>

<div class="m-footer">عالم الفخامة — LUXURY WORLD | جورجيا</div>

</body>
</html>`;
}

// ── DESKTOP Traditional A4 Template ──
function generateQuoteHTML(qr: any): string {
  const tierLabels = [
    "العرض الأول", "العرض الثاني", "العرض الثالث",
    "العرض الرابع", "العرض الخامس", "العرض السادس",
  ];
  const tierIcons = ["🥉", "🥈", "🥇", "💎", "👑", "🌟"];

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
      <div class="tier-hdr">${tierIcons[i] || "💎"} ${tierLabels[i] || "عرض " + (i + 1)}</div>
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
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Tajawal',sans-serif;direction:rtl;color:#222;background:#fff;font-size:12.5px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── Header ── */
.header{background:linear-gradient(135deg,#1B1B2F 0%,#27293D 100%);color:#fff;padding:28px 20px 22px;text-align:center}
.header img{display:block;margin:0 auto 10px;max-width:140px}
.brand{font-size:24px;font-weight:700;color:#D4AF37;letter-spacing:.5px}
.subtitle{font-size:13px;font-weight:400;margin-top:3px;color:rgba(255,255,255,.85)}

/* ── Summary Card ── */
.summary{background:#FAFAF7;border:1px solid #E8E2D6;padding:14px 20px;margin:14px 16px;border-radius:6px;border-right:4px solid #D4AF37}
.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}
.s-item{font-size:12.5px;font-weight:500}
.s-lbl{font-weight:700;color:#1B1B2F}

/* ── Tiers 2-Column Grid ── */
.tiers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:10px 16px}
.tier{border:1px solid #E0D9CC;border-radius:6px;overflow:hidden;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column}
.tier-hdr{background:linear-gradient(90deg,#1B1B2F,#2C2C44);color:#D4AF37;padding:7px 16px;font-weight:700;font-size:13.5px}
table{width:100%;border-collapse:collapse}
th{background:#27293D;color:#D4AF37;padding:5px 10px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase}
td{padding:5px 10px;text-align:right;border-bottom:1px solid #F0EDE6;font-size:12px}
th.idx,td.idx{width:28px;text-align:center;color:#999}
td.center,th.center{text-align:center}
tr:nth-child(even) td{background:#FAFAF7}
tr:hover td{background:#F5F0E3}

/* ── Prices ── */
.prices{display:flex;gap:10px;padding:8px 14px;justify-content:flex-start;flex-wrap:wrap}
.price-chip{display:flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-weight:700;font-size:14px}
.price-chip.gold{background:linear-gradient(135deg,#D4AF37,#F5D76E);color:#1B1B2F}
.price-chip.silver{background:linear-gradient(135deg,#C0C0C0,#E8E8E8);color:#333}
.plbl{font-size:11px;font-weight:500;opacity:.85}
.pval{font-size:15px;font-weight:700}

/* ── Car Only ── */
.car-only{background:linear-gradient(135deg,#1B1B2F,#27293D);border-radius:6px;padding:14px 18px;margin:10px 16px;text-align:center;page-break-inside:avoid;color:#fff}
.car-only-label{font-weight:700;font-size:13px;color:#D4AF37}
.car-only-price{font-weight:700;font-size:22px;color:#1B1B2F;background:linear-gradient(135deg,#D4AF37,#F5D76E);display:inline-block;padding:4px 22px;border-radius:20px;margin-top:6px}

/* ── Services ── */
.services{background:#F6FBF6;border:1px solid #C8E6C9;border-right:4px solid #388E3C;padding:12px 18px;margin:10px 16px;border-radius:6px;page-break-inside:avoid}
.services h3{color:#2E7D32;font-weight:700;font-size:13px;margin-bottom:5px}
.services ul{list-style:none;padding:0;columns:2;column-gap:16px}
.services li{padding:2px 0;font-size:12px}
.services li::before{content:"✅ "}

/* ── Terms Boxes ── */
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

/* ── Footer ── */
.footer{background:#1B1B2F;color:rgba(255,255,255,.7);text-align:center;padding:10px;font-size:10px;margin-top:8px}
</style>
</head>
<body>

<div class="header">
  <img src="https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/logo.webp" alt="عالم الفخامة" style="max-width:140px" />
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

<div class="tiers-grid">
${tiersHTML}
</div>

<div class="car-only">
  <div class="car-only-label">🚗 عرض سيارة فقط (بدون إقامة)</div>
  <div class="car-only-price">$${qr.carOnlyUSD || 0}</div>
</div>

<div class="services">
  <h3>✅ الخدمات المشمولة</h3>
  <ul>
    <li>استقبال وتوديع من وإلى المطار</li>
    <li>سيارة خاصة مع سائق طوال الرحلة</li>
    <li>إفطار يومي في الفندق</li>
    <li>شرائح اتصال وتأمين سفر</li>
  </ul>
</div>

<div class="terms-section note-box">
  <h3>📌 ملاحظات مهمة</h3>
  <div class="t-body">الفنادق لدينا ارخص من مواقع الحجوزات ! والدفع بعد الوصول الى جورجيا نختار لأقامتك افضل الخيارات لذلك توجد أسعار اقل بخدمة او بجودة اقل ! فعالم الفخامة تحب ان يكون عمليها مرتاح في الرحلة البرنامج قابل للتغير مثلما تريد الرحلة رحلتك و نحن ننفذ . الدفع كاش بعملة الدولار الأمريكي واذا كان بالبطاقة البنكية يضاف 5% عمولة .</div>
</div>

<div class="terms-section confirm-box">
  <h3>📋 للتأكيد فقط ارسل</h3>
  <div class="t-body">جوازات السفر لأصدار التأمين و الحجوزات<br>تذاكر السفر موضح بها تاريخ الوصول و تاريخ المغادرة</div>
</div>

<div class="terms-section warn-box">
  <h3>⚠️ ملاحظة مهمة جدا</h3>
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

// ── HONEYMOON Template ──
function generateHoneymoonHTML(qr: any): string {
  const honeyLabels = ["هنيمون 1", "هنيمون 2", "هنيمون 3", "هنيمون 4", "هنيمون 5", "هنيمون 6 — كوخ"];
  const honeyIcons = ["💕", "💖", "💗", "💝", "💘", "🏡"];

  let tiersHTML = "";
  for (let i = 0; i < (qr.honeyTiers?.length || 0); i++) {
    const t = qr.honeyTiers[i];
    const hotels = t.hotels || [];

    let routeItems = "";
    for (const h of hotels) {
      routeItems += `<div class="h-route-item"><span class="h-ri-city">📍 ${esc(h.cityAr)}</span><span class="h-ri-nights">🌙 ${h.nights} ليالي</span><span class="h-ri-hotel">🏨 ${esc(h.hotelName)}</span></div>`;
    }

    tiersHTML += `
    <div class="h-card">
      <div class="h-card-hdr">${honeyIcons[i] || "💕"} ${honeyLabels[i] || "هنيمون " + (i + 1)}</div>
      <div class="h-prices">
        <div class="h-pbadge"><span class="h-plbl">السعر</span><span class="h-pval">$${t.price}</span></div>
      </div>
      <div class="h-route">${routeItems}</div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Tajawal',sans-serif;direction:rtl;color:#2d1b3d;background:#fff;
  font-size:13px;line-height:1.65;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}

.h-header{
  background:linear-gradient(160deg,#2d1b3d 0%,#4a2040 40%,#6b2050 100%);
  color:#fff;padding:30px 24px 24px;text-align:center;
}
.h-logo{width:90px;display:block;margin:0 auto 10px}
.h-brand{font-size:26px;font-weight:800;color:#f5a0c0}
.h-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:4px}
.h-divider{height:3px;background:linear-gradient(90deg,transparent,#f5a0c0,transparent)}

.h-summary{background:#fef5f8;border-bottom:1px solid #f0d0e0;padding:16px 20px}
.h-sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
.h-sum-item{font-size:12.5px;font-weight:500;color:#333}
.h-sum-item b{color:#4a2040;font-weight:700}
.h-sum-route{grid-column:1/-1;text-align:center;background:#4a2040;color:#f5a0c0;border-radius:6px;padding:6px 12px;font-size:12.5px;font-weight:700;margin-top:4px}

.h-tiers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px 16px}
.h-card{background:#fff;border:1px solid #f0d0e0;border-radius:10px;overflow:hidden;page-break-inside:avoid;box-shadow:0 2px 10px rgba(0,0,0,.06);display:flex;flex-direction:column}
.h-card-hdr{background:linear-gradient(90deg,#4a2040,#6b2050);color:#f5a0c0;padding:10px 16px;font-weight:700;font-size:14px;border-bottom:2px solid #f5a0c0}
.h-prices{display:flex;gap:10px;padding:14px 16px;justify-content:center}
.h-pbadge{display:flex;flex-direction:column;align-items:center;padding:10px 22px;border-radius:10px;min-width:120px;background:linear-gradient(145deg,#e91e63,#f48fb1);color:#fff}
.h-plbl{font-size:11px;font-weight:500;opacity:.9}
.h-pval{font-size:26px;font-weight:800;letter-spacing:.5px;line-height:1.2}
.h-route{padding:6px 16px 12px}
.h-route-item{display:flex;gap:6px;align-items:center;padding:7px 0;font-size:12.5px;font-weight:500;border-bottom:1px solid #fce4ec}
.h-route-item:last-child{border-bottom:none}
.h-ri-city{color:#4a2040;font-weight:700;min-width:80px}
.h-ri-nights{color:#880e4f;min-width:60px}
.h-ri-hotel{color:#555;flex:1}

.h-car{background:linear-gradient(160deg,#4a2040,#6b2050);border-radius:10px;padding:18px 16px;margin:12px 16px;text-align:center;color:#fff;page-break-inside:avoid}
.h-car-label{font-size:14px;font-weight:700;color:#f5a0c0;margin-bottom:8px}
.h-car-price{font-size:30px;font-weight:800;color:#fff;background:linear-gradient(145deg,#e91e63,#f48fb1);display:inline-block;padding:6px 30px;border-radius:10px}

.h-services{background:#f6fbf6;border:1px solid #c8e6c9;border-right:4px solid #388e3c;border-radius:10px;margin:12px 16px;padding:14px 18px;page-break-inside:avoid}
.h-services h3{color:#2e7d32;font-size:14px;font-weight:700;margin-bottom:4px}
.h-svc-list{list-style:none;padding:0}
.h-svc-list li{padding:4px 0;font-size:13px;font-weight:500}
.h-svc-list li::before{content:"✅ "}

.h-footer{text-align:center;padding:14px;font-size:10px;color:#999;border-top:1px solid #eee;margin-top:8px}
</style>
</head>
<body>

<div class="h-header">
  <img class="h-logo" src="https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/logo.webp" alt="عالم الفخامة" />
  <div class="h-brand">💕 عروض شهر العسل</div>
  <div class="h-sub">LUXURY WORLD — عرض خاص لشهر العسل في جورجيا</div>
</div>
<div class="h-divider"></div>

<div class="h-summary">
  <div class="h-sum-grid">
    <div class="h-sum-item">📅 <b>${esc(String(qr.days))}</b> أيام / <b>${esc(String(qr.totalNights))}</b> ليالي</div>
    <div class="h-sum-item">🛏️ <b>1</b> غرفة مزدوجة</div>
    <div class="h-sum-item">👫 <b>2</b> بالغين (شهر عسل)</div>
    <div class="h-sum-item">✈️ وصول: <b>${esc(qr.arrivalAirport || "")}</b></div>
    <div class="h-sum-route">🗺️ ${esc(qr.route)}</div>
  </div>
</div>

<div class="h-tiers-grid">
${tiersHTML}
</div>

<div class="h-car">
  <div class="h-car-label">🚗 سيارة فقط (بدون إقامة)</div>
  <div class="h-car-price">$${qr.carOnlyUSD || 0}</div>
</div>

<div class="h-services">
  <h3>✅ الخدمات المشمولة</h3>
  <ul class="h-svc-list">
    <li>استقبال وتوديع من وإلى المطار</li>
    <li>سيارة خاصة مع سائق طوال الرحلة</li>
    <li>إفطار يومي في الفندق</li>
    <li>شرائح اتصال وتأمين سفر</li>
  </ul>
</div>

<div class="h-footer">عالم الفخامة — LUXURY WORLD | جورجيا 💕</div>

</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function convertHTMLToPDF(html: string): Promise<Uint8Array> {
  const secret = Deno.env.get("CONVERTAPI_SECRET");
  if (!secret) throw new Error("CONVERTAPI_SECRET not configured");
  const form = new FormData();
  form.append("File", new Blob([html], { type: "text/html" }), "quote.html");
  form.append("PageSize", "a4");
  form.append("MarginTop", "10");
  form.append("MarginBottom", "10");
  form.append("MarginLeft", "15");
  form.append("MarginRight", "15");
  form.append("WaitTime", "5");
  const r = await fetch("https://v2.convertapi.com/convert/html/to/pdf", {
    method: "POST",
    headers: { "Authorization": `Bearer ${secret}` },
    body: form,
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "unknown");
    throw new Error(`ConvertAPI HTML-to-PDF failed (${r.status}): ${errText}`);
  }
  const j = await r.json();
  if (!j.Files?.[0]?.FileData) {
    throw new Error("ConvertAPI returned no file data");
  }
  const b64 = j.Files[0].FileData;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return bin;
}

// ======================== VIP PPTX ENGINE (docxtemplater → ConvertAPI) ========================

const PPTX_TEMPLATE_URL = "https://ouhteboiqitdgsmbqgyj.supabase.co/storage/v1/object/public/templates/LUXURY_WORLD.pptx";
let cachedPptxTemplate: ArrayBuffer | null = null;

async function fetchPptxTemplate(): Promise<ArrayBuffer> {
  if (cachedPptxTemplate) return cachedPptxTemplate;
  const resp = await fetch(PPTX_TEMPLATE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch PPTX template: ${resp.status}`);
  cachedPptxTemplate = await resp.arrayBuffer();
  return cachedPptxTemplate;
}

async function generateVipPPTX(qr: any): Promise<Uint8Array> {
  const templateBuf = await fetchPptxTemplate();
  const zip = new PizZip(templateBuf);

  // Pre-process: normalize mixed delimiters ({{var}} → {var}) so loops {#section} and vars all use single braces
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith("ppt/slides/") && fileName.endsWith(".xml")) {
      const content = zip.file(fileName)?.asText();
      if (content) {
        const normalized = content.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
        zip.file(fileName, normalized);
      }
    }
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Build hotels arrays for each tier (hotels_1 through hotels_6)
  const hotelsData: Record<string, { city: string; nights: string; hotel: string }[]> = {};
  const tierCount = Math.min(qr.tiers?.length || 0, 6);
  for (let i = 0; i < 6; i++) {
    const tier = qr.tiers?.[i];
    if (tier?.hotels) {
      hotelsData[`hotels_${i + 1}`] = tier.hotels.map((h: any) => ({
        city: h.cityAr || h.city || "",
        nights: String(h.nights || 0),
        hotel: h.hotelName || "",
      }));
    } else {
      hotelsData[`hotels_${i + 1}`] = [];
    }
  }

  // Build price tags for each tier (O1 through O6)
  const priceData: Record<string, string> = {};
  for (let i = 0; i < 6; i++) {
    const tier = qr.tiers?.[i];
    if (tier) {
      if (qr.viewPref === "both") {
        priceData[`O${i + 1}_Price_V`] = `$${tier.priceView || 0}`;
        priceData[`O${i + 1}_Price_NV`] = `$${tier.priceNoView || 0}`;
      } else if (qr.viewPref === "view") {
        priceData[`O${i + 1}_Price_V`] = `$${tier.price || 0}`;
        priceData[`O${i + 1}_Price_NV`] = "—";
      } else {
        priceData[`O${i + 1}_Price_V`] = "—";
        priceData[`O${i + 1}_Price_NV`] = `$${tier.price || 0}`;
      }
    } else {
      priceData[`O${i + 1}_Price_V`] = "—";
      priceData[`O${i + 1}_Price_NV`] = "—";
    }
  }

  // Summary data — all values must be strings, never undefined
  const templateData: Record<string, any> = {
    Days: String(qr.days || 0),
    Nights: String(qr.totalNights || 0),
    Route: qr.route || "",
    Rooms_Count: String(qr.roomCount || 1),
    Room_Types: qr.roomText || "",
    arv: qr.arrivalAirport || "مطار تبليسي",
    dbar: qr.departureAirport || "مطار تبليسي",
    ...priceData,
    ...hotelsData,
  };

  doc.render(templateData);

  const outBuf = doc.getZip().generate({ type: "uint8array" });
  return outBuf;
}

async function convertPPTXToPDF(pptxBuffer: Uint8Array): Promise<Uint8Array> {
  const secret = Deno.env.get("CONVERTAPI_SECRET");
  if (!secret) throw new Error("CONVERTAPI_SECRET not configured");
  const form = new FormData();
  form.append("File", new Blob([pptxBuffer], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), "offer.pptx");
  const r = await fetch("https://v2.convertapi.com/convert/pptx/to/pdf", {
    method: "POST",
    headers: { "Authorization": `Bearer ${secret}` },
    body: form,
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "unknown");
    throw new Error(`ConvertAPI PPTX-to-PDF failed (${r.status}): ${errText}`);
  }
  const j = await r.json();
  if (!j.Files?.[0]?.FileData) {
    throw new Error("ConvertAPI PPTX-to-PDF returned no file data");
  }
  const b64 = j.Files[0].FileData;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return bin;
}

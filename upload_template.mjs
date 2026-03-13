import { readFileSync } from 'fs';

const MGMT_KEY = 'sbp_8361514c2b8948e228e7f78d22ed153ff1787441';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU';
const PROJECT = 'ouhteboiqitdgsmbqgyj';

async function run() {
  // 1. Make bucket public
  const sql = "UPDATE storage.buckets SET public = true WHERE id = 'templates';";
  const r1 = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MGMT_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  console.log('Make public:', r1.status, await r1.text());

  // 2. Upload template
  const file = readFileSync('public/templates/LUXURY_WORLD.pptm');
  console.log('File size:', file.length, 'bytes');

  const r2 = await fetch(`https://${PROJECT}.supabase.co/storage/v1/object/templates/LUXURY_WORLD.pptm`, {
    method: 'PUT',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: file
  });
  console.log('Upload:', r2.status, await r2.text());

  // 3. Verify download via public URL
  const r3 = await fetch(`https://${PROJECT}.supabase.co/storage/v1/object/public/templates/LUXURY_WORLD.pptm`, {
    method: 'HEAD'
  });
  console.log('Verify public URL:', r3.status, 'size:', r3.headers.get('content-length'));
}

run().catch(e => console.error(e));

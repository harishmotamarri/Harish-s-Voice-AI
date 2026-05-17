/**
 * tests/verify-setup.js
 * Pre-flight check — run before starting the server.
 * node tests/verify-setup.js
 */
require('dotenv').config();

const REQUIRED_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BASE_URL'
];

const OPTIONAL_VARS = [
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID'
];

console.log('\n🔍  Harish Voice AI — Setup Verification\n');

let passed = 0;
let failed = 0;

// 1. Check env vars
console.log('── Environment Variables ─────────────────────');
for (const v of REQUIRED_VARS) {
  if (process.env[v]) {
    console.log(`  ✅  ${v}`);
    passed++;
  } else {
    console.log(`  ❌  ${v}  ← MISSING`);
    failed++;
  }
}
for (const v of OPTIONAL_VARS) {
  const set = !!process.env[v];
  console.log(`  ${set ? '✅' : '⚠️ '}  ${v}${set ? '' : '  ← optional (Step 5)'}`);
}

// 2. Test Supabase
console.log('\n── Supabase Connectivity ─────────────────────');
async function testSupabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await supabase.from('calls').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log('  ⚠️   calls table not found — run supabase-schema.sql first');
    } else if (error) {
      console.log('  ❌  Supabase error:', error.message);
      failed++;
    } else {
      console.log('  ✅  Supabase connected + calls table exists');
      passed++;
    }
  } catch (e) {
    console.log('  ❌  Supabase connection failed:', e.message);
    failed++;
  }
}

// 3. Test OpenAI
console.log('\n── OpenAI Connectivity ───────────────────────');
async function testOpenAI() {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.models.list();
    const hasGPT4 = res.data.some(m => m.id.includes('gpt-4'));
    console.log(`  ✅  OpenAI API connected (GPT-4 access: ${hasGPT4 ? 'YES' : 'NO — check plan'})`);
    passed++;
  } catch (e) {
    console.log('  ❌  OpenAI error:', e.message);
    failed++;
  }
}

async function run() {
  await testSupabase();
  await testOpenAI();

  console.log('\n── Summary ───────────────────────────────────');
  console.log(`  Passed: ${passed}  Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉  All checks passed! Run: npm run dev\n');
  } else {
    console.log('\n⚠️   Fix the issues above, then re-run: node tests/verify-setup.js\n');
    process.exit(1);
  }
}

run();

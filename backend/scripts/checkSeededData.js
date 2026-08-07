/**
 * checkSeededData.js
 * Quick Supabase query to verify seeded telemetry records exist for the demo mission.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const DEMO_MISSION_ID = '00000000-0000-4000-a000-000000000001';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking seeded telemetry for demo mission:', DEMO_MISSION_ID);

// Count all rows for demo mission
const { count, error: countError } = await supabase
  .from('telemetry_logs')
  .select('id', { count: 'exact', head: true })
  .eq('mission_id', DEMO_MISSION_ID);

if (countError) {
  console.error('❌ Count error:', countError.message);
} else {
  console.log(`✅ Total telemetry rows for demo mission: ${count}`);
}

// Fetch first 3 rows to inspect columns
const { data, error } = await supabase
  .from('telemetry_logs')
  .select('id, mission_id, mission_time, battery, temperature, activity, mission_phase, signal_strength, created_at')
  .eq('mission_id', DEMO_MISSION_ID)
  .order('created_at', { ascending: true })
  .limit(3);

if (error) {
  console.error('❌ Fetch error:', error.message);
} else {
  console.log('\n📋 First 3 rows:');
  data.forEach((r, i) => console.log(`  Row ${i + 1}:`, JSON.stringify(r)));
}

// Check missions table
const { data: mRow, error: mError } = await supabase
  .from('missions')
  .select('id, name, status, started_at')
  .eq('id', DEMO_MISSION_ID)
  .maybeSingle();

if (mError) {
  console.error('❌ Mission row error:', mError.message);
} else if (mRow) {
  console.log('\n🚀 Mission record:', JSON.stringify(mRow));
} else {
  console.log('\n⚠️ No mission record found in missions table');
}

process.exit(0);

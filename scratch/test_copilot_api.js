/**
 * test_copilot_api.js
 */
const BACKEND_URL = 'http://localhost:4000';

async function testCopilotAPI() {
  console.log('🔍 Testing AI Copilot Backend Endpoints...');

  // 1. Test Query Status
  const q1 = await fetch(`${BACKEND_URL}/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'What is the mission status?' }),
  }).then(r => r.json());

  console.log('✅ Query Status Result:', q1.success, '| Output snippet:', q1.data?.text?.substring(0, 120));

  // 2. Test Query Telemetry
  const q2 = await fetch(`${BACKEND_URL}/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'What is the battery level and temperature?' }),
  }).then(r => r.json());

  console.log('✅ Query Telemetry Result:', q2.success, '| Output snippet:', q2.data?.text?.substring(0, 120));

  // 3. Test Action Intent Confirmation
  const q3 = await fetch(`${BACKEND_URL}/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Inject thermal spike fault' }),
  }).then(r => r.json());

  console.log('✅ Action Confirmation Request:', q3.data?.type === 'CONFIRMATION_REQUIRED', '| Message:', q3.data?.message);

  process.exit(0);
}

testCopilotAPI().catch(err => {
  console.error('❌ Copilot Test Error:', err);
  process.exit(1);
});

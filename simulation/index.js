/**
 * index.js — Spacecraft Digital Twin Simulation Engine
 *
 * Integration example and public re-export surface.
 *
 * This file demonstrates the complete public API surface available
 * to all backend modules (Telemetry Pipeline, Anomaly Detection,
 * Procedure Engine, Replay Engine, AI Copilot, Operator Console).
 *
 * ─────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────
 *
 * Option A — Quick start with a mission file:
 *
 *   import { SimulationEngine } from './simulation/index.js';
 *
 *   const sim = new SimulationEngine({
 *     onTick: (state, telemetry) => console.log(state.missionTime),
 *   });
 *   sim.loadMission('./simulation/missions/observation_mission.json');
 *   sim.start();
 *
 * Option B — Programmatic mission definition:
 *
 *   sim.loadMission({ missionName: 'Custom', duration: 120, timeline: [] });
 *
 * Option C — Manual ticking (for replay / testing):
 *
 *   sim.initializeMission(mission);
 *   for (let i = 0; i < 60; i++) sim._ticker.manualTick();
 *
 * ─────────────────────────────────────────────────────────────────
 * PUBLIC RE-EXPORTS (for consumers who need individual classes)
 * ─────────────────────────────────────────────────────────────────
 */

// ── Primary interface ─────────────────────────────────────────────
export { SimulationEngine } from './engines/SimulationEngine.js';

// ── Constants (for fault injection without magic strings) ─────────
export { FAULT_IDS, ACTIVITIES, MISSION_PHASES } from './utils/constants.js';

// ── Models (for type-aware consumers) ─────────────────────────────
export { Mission }    from './models/Mission.js';
export { Activity }   from './models/Activity.js';
export { Fault }      from './models/Fault.js';
export { Telemetry }  from './models/Telemetry.js';

// ── Utilities ─────────────────────────────────────────────────────
export { MissionLoader } from './utils/MissionLoader.js';
export { DigitalTwin }   from './digitalTwin/DigitalTwin.js';

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION DEMO (runs when this file is executed directly)
// ═══════════════════════════════════════════════════════════════════

import { SimulationEngine as SE } from './engines/SimulationEngine.js';
import { FAULT_IDS as FID }       from './utils/constants.js';
import { fileURLToPath }           from 'url';
import { join, dirname }           from 'path';
import { formatMissionTime }       from './utils/helpers.js';

// Only run demo when executed directly: node simulation/index.js
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Demo runner ───────────────────────────────────────────────────
async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       Spacecraft Digital Twin Simulation Engine          ║');
  console.log('║              Integration Demo — Node.js                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let tickCount     = 0;
  let faultInjected = false;
  let faultCleared  = false;

  
  // ── Instantiate engine with all callbacks ─────────────────────
  const sim = new SE(
    {
      // Called every tick with frozen state + latest telemetry
      onTick: (state, telemetry) => {
        tickCount++;

        // Print a concise status line every 10 ticks
        if (tickCount % 10 === 0 || state.missionTime <= 5) {
          const t    = formatMissionTime(state.missionTime);
          const batt = state.battery.percentage.toFixed(1);
          const temp = state.thermal.temperature.toFixed(1);
          const sig  = state.communication.signalStrength.toFixed(0);
          const stor = state.storage.percentUsed.toFixed(1);
          const faults = state.activeFaults.length > 0
            ? ` | FAULTS: ${state.activeFaults.map(f => f.id).join(', ')}`
            : '';

          console.log(
            `[T+${t}] Act: ${state.currentActivity.padEnd(12)} ` +
            `Batt: ${batt.padStart(5)}% ` +
            `Temp: ${temp.padStart(5)}°C ` +
            `Sig: ${sig.padStart(3)}% ` +
            `Storage: ${stor.padStart(4)}%` +
            faults
          );
        }

        // Inject THERMAL_SPIKE fault at T+200 (during Downlink window)
        if (state.missionTime === 200 && !faultInjected) {
          faultInjected = true;
          console.log('\n⚡ Injecting THERMAL_SPIKE fault at T+200s...\n');
          sim.injectFault(FID.THERMAL_SPIKE);
        }

        // Clear the fault at T+220
        if (state.missionTime === 220 && !faultCleared) {
          faultCleared = true;
          console.log('\n✓ Clearing THERMAL_SPIKE fault at T+220s...\n');
          sim.clearFault(FID.THERMAL_SPIKE);
        }

        // Inject PACKET_LOSS at T+300 to demonstrate comm fault during 2nd Observation
        if (state.missionTime === 300) {
          sim.injectFault(FID.PACKET_LOSS);
          console.log('\n📡 Packet loss fault injected at T+300s...\n');
        }
        if (state.missionTime === 330) {
          sim.clearFault(FID.PACKET_LOSS);
          console.log('\n✓ Packet loss cleared at T+330s...\n');
        }
      },

      onTelemetry: (telemetry) => {
        // External systems (Telemetry Pipeline, AI Copilot) would
        // receive this callback and process the immutable record.
        // Uncomment to see every telemetry frame:
        // console.log('  TELEMETRY:', JSON.stringify(telemetry.toJSON(), null, 2));
      },

      onActivityChange: (newAct, oldAct) => {
        const from = oldAct?.activity ?? 'none';
        const to   = newAct?.activity ?? 'none';
        console.log(`\n🔄 Activity: ${from} → ${to} (T+${newAct?.time ?? '?'}s)\n`);
      },

      onFaultInjected: (fault) => {
        console.log(`⚠️  FAULT INJECTED: [${fault.severity}] ${fault.id} — ${fault.description}`);
      },

      onConstraintViolation: (violations) => {
        for (const v of violations) {
          console.log(`🚨 CONSTRAINT VIOLATION: ${v.field} = ${v.value?.toFixed?.(2) ?? v.value} (limit: ${v.limit}) — ${v.rule}`);
        }
      },

      onMissionCompleted: (finalState) => {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                   MISSION COMPLETED                      ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`Mission: ${finalState.missionName}`);
        console.log(`Duration: ${formatMissionTime(finalState.missionTime)}`);
        console.log(`Final Battery: ${finalState.battery.percentage.toFixed(1)}%`);
        console.log(`Final Temperature: ${finalState.thermal.temperature.toFixed(1)}°C`);
        console.log(`Final Storage: ${finalState.storage.percentUsed.toFixed(1)}%`);
        console.log(`Total Faults Encountered: ${finalState.activeFaults.length} still active`);
      },
    },
    {
      // SimulationEngine config
      tickIntervalMs: 100, // 100ms real-time = 1 simulated second (10× faster for demo)
    }
  );

  // ── Load mission from file ─────────────────────────────────────
  const missionPath = join(__dirname, 'missions', 'observation_mission.json');
  sim.loadMission(missionPath);

  // ── Start simulation ───────────────────────────────────────────
  console.log('Starting simulation...\n');
  sim.start();

  // ── Show manual state inspection API after 2 real-seconds ─────
  setTimeout(() => {
    const state = sim.getCurrentState();
    console.log(`\n📊 State snapshot at T+${state.missionTime}s:`);
    console.log(`   Mission Time: ${formatMissionTime(state.missionTime)}`);
    console.log(`   Battery:      ${state.battery.percentage.toFixed(1)}%`);
    console.log(`   Temperature:  ${state.thermal.temperature.toFixed(1)}°C`);
    console.log(`   Storage:      ${state.storage.usedMB.toFixed(1)} MB / ${state.storage.totalMB} MB`);
    console.log(`   Signal:       ${state.communication.signalStrength.toFixed(1)}%`);
    console.log(`   Orientation:  ${state.orientation.mode}`);
    console.log(`   Activity:     ${state.currentActivity}`);
    console.log(`   Safe Mode:    ${state.safeMode}`);
    console.log(`   Active Faults: ${state.activeFaults.length}\n`);
  }, 2000);

  // ── Demonstrate pause / resume ────────────────────────────────
  setTimeout(() => {
    console.log('\n⏸️  Pausing simulation for 1 second...');
    sim.pause();
    setTimeout(() => {
      console.log('▶️  Resuming simulation...\n');
      sim.resume();
    }, 1000);
  }, 15000);
}

runDemo().catch(console.error);

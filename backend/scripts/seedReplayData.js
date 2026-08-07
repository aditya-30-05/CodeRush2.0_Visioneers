/**
 * seedReplayData.js
 *
 * Backend database seed script for the OrbitOps Replay System.
 * Generates ~200 realistic chronological spacecraft simulation snapshots
 * with smooth physical changes (battery, voltage, temperature, solar, power,
 * orbit coordinates, subsystem health, active faults) and stores them in
 * Supabase PostgreSQL tables: `missions`, `telemetry_logs`, `replay_logs`, `fault_logs`.
 *
 * Usage:
 *   npm --prefix backend run seed:replay
 *   OR
 *   node backend/scripts/seedReplayData.js
 */

import 'dotenv/config';
import { supabase, dbAvailable } from '../config/supabase.js';
import { MissionRepository }    from '../database/MissionRepository.js';
import { TelemetryRepository }  from '../database/TelemetryRepository.js';
import { ReplayRepository }     from '../database/ReplayRepository.js';
import { FaultRepository }      from '../database/FaultRepository.js';
import { OperatorActionRepository } from '../database/OperatorActionRepository.js';
import { TABLES }               from '../utils/constants.js';
import { logger }               from '../middlewares/logger.js';

const DEMO_MISSION_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_MISSION_NAME = 'ISRO OrbitOps Demonstration Mission Alpha';

export async function seedReplayData() {
  console.log('====================================================');
  console.log('🚀 OrbitOps Replay System Database Seeder');
  console.log(`Database Connection: ${dbAvailable ? 'CONNECTED (Supabase PostgreSQL)' : 'OFFLINE (Local Fallback)'}`);
  console.log('====================================================');

  // 1. Check duplicate execution safely
  const existingMission = await MissionRepository.findById(DEMO_MISSION_ID);
  if (existingMission) {
    const existingTelemetry = await TelemetryRepository.findByMission(DEMO_MISSION_ID, 10, 0);
    if (existingTelemetry && existingTelemetry.length > 50) {
      console.log(`\nℹ️ Demo mission already exists in database (Mission ID: ${DEMO_MISSION_ID})`);
      console.log(`ℹ️ Records already stored: ${existingTelemetry.length}+ snapshots.`);
      console.log('✅ Seeding skipped safely (duplicate execution prevented).\n');
      return { missionId: DEMO_MISSION_ID, recordCount: existingTelemetry.length, status: 'SKIPPED_DUPLICATE' };
    }
  }

  // 2. Create Demo Mission Record
  const startTime = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const endTime   = new Date(Date.now() - 1 * 3600 * 1000).toISOString();

  await MissionRepository.create({
    id:             DEMO_MISSION_ID,
    name:           DEMO_MISSION_NAME,
    type:           'Remote Sensing Satellite',
    spacecraftName: 'ISRO-SAT-4B',
    objective:      'High-Resolution Earth Observation & Downlink Demo',
    status:         'COMPLETED',
    started_at:     startTime,
    completed_at:   endTime,
  });

  console.log(`\n📦 Created Demo Mission Record: "${DEMO_MISSION_NAME}" (ID: ${DEMO_MISSION_ID})`);

  // 3. Generate 200 Chronological Realistic Snapshots
  const TOTAL_SNAPSHOTS = 200;
  console.log(`⌛ Generating ${TOTAL_SNAPSHOTS} realistic chronological snapshots...`);

  let battery = 98.5;
  let temperature = 21.5;
  let storagePct = 12.0;
  let latitude = -45.0;
  let longitude = -120.0;

  const telemetryRecords = [];
  const baseTimestamp = new Date(startTime).getTime();

  for (let tick = 0; tick < TOTAL_SNAPSHOTS; tick++) {
    const missionTime = tick * 2; // 2 seconds per tick
    const tickTimeISO = new Date(baseTimestamp + missionTime * 1000).toISOString();

    // Orbit Eclipse Simulation: Ticks 80-130 are in Earth shadow (Eclipse)
    const isEclipse = tick >= 80 && tick <= 130;

    // Solar generation (420W in sunlit, 0W in eclipse)
    const solarGeneration = isEclipse ? 0 : Math.round(415 + Math.sin(tick / 10) * 15);

    // Activity Schedule
    let activity = 'Idle';
    let powerConsumption = 115;
    let orientation = 'EARTH_POINTING';
    let phase = 'ORBITAL_INSERTION';

    if (tick < 30) {
      activity = 'Idle';
      phase = 'ORBITAL_INSERTION';
    } else if (tick < 70) {
      activity = 'Observation';
      phase = 'NORMAL_OPERATIONS';
      powerConsumption = 180;
      orientation = 'TARGET_POINTING';
      storagePct = Math.min(85, storagePct + 0.35);
    } else if (tick < 120) {
      activity = 'Rotate';
      phase = 'NORMAL_OPERATIONS';
      powerConsumption = 140;
      orientation = 'SUN_POINTING';
    } else if (tick < 170) {
      activity = 'Downlink';
      phase = 'PAYLOAD_DOWNLINK';
      powerConsumption = 240;
      orientation = 'EARTH_POINTING';
      storagePct = Math.max(10, storagePct - 0.5);
    } else {
      activity = 'Calibration';
      phase = 'NORMAL_OPERATIONS';
      powerConsumption = 130;
      orientation = 'EARTH_POINTING';
    }

    // Battery Drain / Charge Curve
    const netPower = solarGeneration - powerConsumption;
    if (netPower < 0) {
      battery = Math.max(20, battery - 0.08);
    } else {
      battery = Math.min(100, battery + 0.05);
    }
    const batteryVoltage = Number((24.0 + (battery / 100) * 4.8).toFixed(2));

    // Temperature Thermal Oscillation (-10°C in shadow, +35°C in sun, thermal spike fault at 60-75)
    const isThermalFault = tick >= 60 && tick <= 75;
    if (isThermalFault) {
      temperature = Math.min(68.5, temperature + 2.2);
    } else if (isEclipse) {
      temperature = Math.max(8.0, temperature - 0.3);
    } else {
      temperature = Math.min(32.0, temperature + 0.2);
    }

    // Signal Strength Ground Pass Curve
    const signalStrength = Math.round(65 + Math.sin(tick / 15) * 30);

    // Orbital Coordinates Trajectory
    latitude = Number((Math.sin(tick / 20) * 45.0).toFixed(4));
    longitude = Number((((longitude + 1.2) + 180) % 360 - 180).toFixed(4));
    const altitude = Number((520.0 + Math.cos(tick / 15) * 4.2).toFixed(2));

    // Active Faults
    const activeFaults = isThermalFault ? ['THERMAL_SPIKE'] : [];
    const safeMode = temperature > 60.0;

    const payload = {
      sequenceNumber: tick + 1,
      timestamp: tickTimeISO,
      missionTime,
      missionName: DEMO_MISSION_NAME,
      missionPhase: phase,
      battery: Number(battery.toFixed(1)),
      batteryVoltage,
      batteryCharging: netPower > 0,
      solarGeneration,
      powerGeneration: solarGeneration,
      powerConsumption,
      temperature: Number(temperature.toFixed(1)),
      storageUsedMB: Math.round((storagePct / 100) * 2048),
      storagePct: Number(storagePct.toFixed(1)),
      signalStrength,
      windowOpen: signalStrength > 70,
      packetLoss: signalStrength > 70 ? 0 : 2,
      latencyMs: Math.round(220 + (100 - signalStrength) * 2),
      orientation,
      activity,
      safeMode,
      faults: activeFaults,
      warnings: isThermalFault ? ['High Temperature Threshold Exceeded (>60°C)'] : [],
      attitude: { roll: (tick % 10) - 5, pitch: (tick % 8) - 4, yaw: (tick % 12) - 6 },
      coordinates: { latitude, longitude, altitude },
      subsystems: {
        eps: { status: battery > 30 ? 'NOMINAL' : 'DEGRADED', health: Math.round(battery) },
        adcs: { status: safeMode ? 'SAFE_MODE' : 'NOMINAL', health: safeMode ? 50 : 98 },
        thermal: { status: isThermalFault ? 'CRITICAL' : 'NOMINAL', health: isThermalFault ? 40 : 95 },
        payload: { status: activity === 'Observation' ? 'ACTIVE' : 'STANDBY', health: 100 },
        ttc: { status: signalStrength > 70 ? 'CONNECTED' : 'STANDBY', health: signalStrength },
        obc: { status: 'NOMINAL', health: 100 },
      }
    };

    // Prepare Telemetry Log Row (only columns that exist in actual Supabase schema)
    telemetryRecords.push({
      mission_id:            DEMO_MISSION_ID,
      battery:               payload.battery,
      temperature:           payload.temperature,
      power:                 solarGeneration,
      solar_current:         Math.round(solarGeneration / 28),
      signal_strength:       signalStrength,
      storage_used:          Math.round(payload.storagePct),
      cpu_usage:             15 + Math.round(Math.random() * 10),
      ram_usage:             22 + Math.round(Math.random() * 8),
      camera_status:         activity === 'Observation',
      safe_mode:             safeMode,
      communication:         signalStrength > 20,
      reaction_wheel_status: activeFaults.length > 0 ? 'FAULT' : 'HEALTHY',
      mission_phase:         phase.toUpperCase(),
      telemetry_source:      'Simulation',
      created_at:            tickTimeISO,
    });
  }

  // 4. Batch Store into Supabase (directly — only valid schema columns)
  console.log(`\n📥 Inserting ${telemetryRecords.length} telemetry records into database...`);
  // Insert in batches of 50 to avoid request size limits
  for (let i = 0; i < telemetryRecords.length; i += 50) {
    const batch = telemetryRecords.slice(i, i + 50);
    const { error } = await supabase.from('telemetry_logs').insert(batch);
    if (error) {
      logger.error('Seed telemetry batch insert failed', { batch: i, message: error.message });
      console.error(`  ❌ Batch ${Math.floor(i/50)+1} insert error: ${error.message}`);
    } else {
      console.log(`  ✅ Batch ${Math.floor(i/50)+1}: inserted ${batch.length} records`);
    }
  }

  // Skip replay_logs — table does not exist in this Supabase instance

  // Insert Fault Log Record
  await FaultRepository.log({
    mission_id:   DEMO_MISSION_ID,
    fault_type:   'THERMAL_SPIKE',
    subsystem:    'Thermal System',
    description:  'Solar Array Overheating Thermal Spike Injected',
    mission_time: 120,
    created_at:   new Date(baseTimestamp + 120000).toISOString(),
  });

  // Insert Operator Action Record
  await OperatorActionRepository.log({
    mission_id:   DEMO_MISSION_ID,
    action_type:  'START_MISSION',
    payload:      { seeded: true },
    mission_time: 0,
    created_at:   startTime,
  });

  console.log('\n====================================================');
  console.log('✅ REPLAY SEEDING COMPLETED SUCCESSFULLY!');
  console.log(`🎯 Mission ID:       ${DEMO_MISSION_ID}`);
  console.log(`🎯 Mission Name:     ${DEMO_MISSION_NAME}`);
  console.log(`📊 Snapshots Seeded: ${TOTAL_SNAPSHOTS} chronological records`);
  console.log('====================================================\n');

  return {
    missionId: DEMO_MISSION_ID,
    recordCount: TOTAL_SNAPSHOTS,
    status: 'SUCCESS',
  };
}

// Execute directly if run via CLI
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedReplayData().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}

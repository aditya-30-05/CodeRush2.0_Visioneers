/**
 * AiCopilotService.js
 *
 * Backend Orchestrator & Tool Layer for OrbitOps AI Mission Copilot.
 *
 * Single Source of Truth Principle:
 *   - AI Copilot ONLY queries authoritative backend services (SimulationService,
 *     TelemetryRepository, FaultService, FaultRepository, ReplayService, MissionRepository,
 *     MissionPlannerService).
 *   - AI Copilot NEVER mutates live telemetry directly.
 *   - All mission-impacting actions (fault injection, pause, resume, stop) are routed
 *     through existing service endpoints after user confirmation.
 */

import * as SimulationService     from './SimulationService.js';
import * as FaultService          from './FaultService.js';
import * as ReplayService         from './ReplayService.js';
import * as MissionPlannerService from './MissionPlannerService.js';
import { TelemetryRepository }    from '../database/TelemetryRepository.js';
import { FaultRepository }        from '../database/FaultRepository.js';
import { MissionRepository }      from '../database/MissionRepository.js';
import { logger }                 from '../middlewares/logger.js';
import { HTTP }                   from '../utils/constants.js';
import { AppError }               from '../middlewares/errorHandler.js';
import { Groq }                   from 'groq-sdk';

// Initialize Groq client dynamically if key is available
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_groq_api_key')) {
    return null;
  }
  return new Groq({ apiKey });
}

// ── 1. Tool Layer Definitions ─────────────────────────────────────

/**
 * Get current mission execution status.
 */
export function getMissionStatus() {
  const status = SimulationService.getSessionStatus();
  return {
    status: status.status,
    missionId: status.missionId,
    missionTime: status.missionTime,
    metFormatted: `T+${Math.floor(status.missionTime / 3600).toString().padStart(2, '0')}:${Math.floor((status.missionTime % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(status.missionTime % 60).toString().padStart(2, '0')}`,
    currentPhase: status.currentPhase,
    activeFaultsCount: status.activeFaults?.length ?? 0,
    activeFaults: status.activeFaults ?? [],
  };
}

/**
 * Get current authoritative telemetry snapshot.
 */
export function getLatestTelemetry() {
  const status = SimulationService.getSessionStatus();
  const tel = status.latestTelemetry || SimulationService.getCurrentState();
  if (!tel) return null;

  return {
    sequenceNumber: tel.sequenceNumber,
    timestamp: tel.timestamp,
    missionTime: tel.missionTime,
    missionName: tel.missionName || 'OrbitOps Satellite Mission',
    missionPhase: tel.missionPhase || 'OBSERVATION',
    battery: Math.round(tel.battery ?? 100),
    batteryVoltage: tel.batteryVoltage ?? 28.5,
    batteryCharging: tel.batteryCharging ?? false,
    solarGeneration: Math.round(tel.solarGeneration ?? tel.powerGeneration ?? 420),
    powerConsumption: Math.round(tel.powerConsumption ?? 120),
    temperature: Math.round(tel.temperature ?? 22),
    storageUsedMB: tel.storageUsedMB ?? 128,
    storagePct: Math.round(tel.storagePct ?? 12),
    signalStrength: Math.round(tel.signalStrength ?? 92),
    windowOpen: tel.windowOpen ?? true,
    packetLoss: tel.packetLoss ?? 0,
    latencyMs: tel.latencyMs ?? 15,
    orientation: tel.orientation || 'EARTH_POINTING',
    activity: tel.activity || 'Observation',
    safeMode: tel.safeMode ?? false,
    faults: tel.faults || [],
    warnings: tel.warnings || [],
  };
}

/**
 * Get subsystem health index breakdown.
 */
export function getSubsystemHealth() {
  const tel = getLatestTelemetry();
  const activeFaults = getActiveFaults();
  
  const battery = tel?.battery ?? 100;
  const temp = tel?.temperature ?? 22;
  const solarGen = tel?.solarGeneration ?? 420;
  const signal = tel?.signalStrength ?? 92;

  const batteryStatus = battery < 30 ? 'CRITICAL' : battery < 70 ? 'DEGRADED' : 'NOMINAL';
  const thermalStatus = temp > 60 ? 'CRITICAL' : temp > 45 ? 'DEGRADED' : 'NOMINAL';
  const signalStatus = signal > 75 ? 'NOMINAL' : signal > 30 ? 'DEGRADED' : 'CRITICAL';
  const solarStatus = solarGen > 200 ? 'NOMINAL' : solarGen > 50 ? 'DEGRADED' : 'CRITICAL';

  return {
    overallHealth: Math.min(battery, signal, temp > 60 ? 35 : 100),
    subsystems: [
      { id: 'eps_battery', name: 'EPS Battery Storage', health: battery, status: batteryStatus, details: `${battery}% charge, ${tel?.batteryVoltage ?? 28.5}V` },
      { id: 'eps_solar', name: 'Photovoltaic Solar Arrays', health: solarGen > 100 ? 98 : 45, status: solarStatus, details: `${solarGen}W generation` },
      { id: 'ttc_comm', name: 'TT&C High-Gain Communications', health: signal, status: signalStatus, details: `${signal}% signal, ${tel?.windowOpen ? 'ISRO Ground Station in range' : 'Out of range'}` },
      { id: 'thermal_control', name: 'Thermal Control Radiators', health: temp > 60 ? 35 : temp > 45 ? 75 : 98, status: thermalStatus, details: `${temp}°C core temperature` },
      { id: 'adcs_wheels', name: 'ADCS Reaction Wheel Unit', health: activeFaults.some(f => f.includes('REACTION')) ? 40 : 96, status: activeFaults.some(f => f.includes('REACTION')) ? 'CRITICAL' : 'NOMINAL', details: '3,450 RPM, 4-wheel gyro' },
      { id: 'payload_camera', name: 'Multispectral Camera Payload', health: 100, status: 'NOMINAL', details: `${tel?.activity === 'Observation' ? 'IMAGING ACTIVE' : 'STANDBY'}` },
    ],
  };
}

/**
 * Get active injected faults.
 */
export function getActiveFaults() {
  const status = SimulationService.getSessionStatus();
  const active = status.activeFaults || [];
  return active.map(f => typeof f === 'string' ? f : f.id || f.fault_type || String(f));
}

/**
 * Get historical fault logs from Supabase.
 */
export async function getFaultHistory(missionId) {
  const status = SimulationService.getSessionStatus();
  const id = missionId || status.missionId;
  if (!id) return [];
  return await FaultRepository.findByMission(id);
}

/**
 * Get full mission event log history.
 */
export async function getMissionEvents(missionId) {
  const status = SimulationService.getSessionStatus();
  const id = missionId || status.missionId;
  return await ReplayService.getMissionEventLog(id);
}

/**
 * Get replay session metadata.
 */
export async function getReplayData() {
  return await ReplayService.listReplayMissions();
}

/**
 * Generate a comprehensive mission summary.
 */
export async function getMissionSummary() {
  const status = getMissionStatus();
  const tel = getLatestTelemetry();
  const health = getSubsystemHealth();
  const faults = getActiveFaults();

  return {
    missionId: status.missionId,
    status: status.status,
    met: status.metFormatted,
    phase: status.currentPhase,
    battery: `${tel?.battery ?? 100}% (${tel?.batteryCharging ? 'CHARGING' : 'DISCHARGING'})`,
    solarGen: `${tel?.solarGeneration ?? 420} W`,
    temp: `${tel?.temperature ?? 22} °C`,
    signal: `${tel?.signalStrength ?? 92}%`,
    subsystemNominalCount: health.subsystems.filter(s => s.status === 'NOMINAL').length,
    subsystemDegradedCount: health.subsystems.filter(s => s.status === 'DEGRADED').length,
    subsystemCriticalCount: health.subsystems.filter(s => s.status === 'CRITICAL').length,
    activeFaults: faults,
    summaryText: `Mission ${status.missionId} is currently ${status.status} at MET ${status.metFormatted}. System health is at ${health.overallHealth}% with ${faults.length} active fault(s).`,
  };
}

/**
 * Get Proactive Mission Advisory if risks exist.
 */
export function getMissionAdvisory() {
  const tel = getLatestTelemetry();
  const faults = getActiveFaults();

  if (!tel) return null;

  const advisories = [];

  if (tel.temperature > 60 || faults.includes('THERMAL_SPIKE')) {
    advisories.push({
      severity: 'CRITICAL',
      subsystem: 'Thermal Control',
      message: `Thermal Control critical (${tel.temperature}°C). Active thermal anomaly detected.`,
      recommendation: 'Monitor radiator dissipation and consider entering thermal preservation mode.',
    });
  }

  if (tel.battery < 30 || faults.includes('BATTERY_LEAK')) {
    advisories.push({
      severity: 'CRITICAL',
      subsystem: 'EPS Energy Storage',
      message: `Battery charge critical (${tel.battery}%). High discharge rate active.`,
      recommendation: 'Shed non-essential payload power and turn solar arrays toward sun.',
    });
  }

  if (faults.includes('SOLAR_PANEL_FAILURE')) {
    advisories.push({
      severity: 'WARNING',
      subsystem: 'Photovoltaic Arrays',
      message: 'Solar Panel Failure active. Solar generation constrained.',
      recommendation: 'Verify orientation vector and monitor battery drain rate.',
    });
  }

  if (faults.includes('COMMUNICATION_LOSS') || tel.signalStrength < 30) {
    advisories.push({
      severity: 'WARNING',
      subsystem: 'TT&C Communications',
      message: `Ground signal degraded (${tel.signalStrength}%). Packet loss elevated.`,
      recommendation: 'Re-align high-gain dish vector toward ISRO SHAR station.',
    });
  }

  return advisories.length > 0 ? advisories : null;
}

// ── 2. Natural Language Query & Intent Router ─────────────────────

/**
 * Process a user query, invoke required backend tools, and synthesize a response.
 *
 * @param {string} userPrompt
 * @returns {Promise<Object>}
 */
export async function processCopilotQuery(userPrompt) {
  const query = userPrompt.toLowerCase().trim();

  logger.info('Copilot processing query', { query });

  // Dangerous action intent detection -> returns confirmation request payload
  if (query.includes('inject') || query.includes('trigger fault') || query.includes('cause fault')) {
    let faultId = 'THERMAL_SPIKE';
    if (query.includes('solar')) faultId = 'SOLAR_PANEL_FAILURE';
    else if (query.includes('battery')) faultId = 'BATTERY_LEAK';
    else if (query.includes('comm') || query.includes('signal')) faultId = 'COMMUNICATION_LOSS';
    else if (query.includes('wheel') || query.includes('reaction')) faultId = 'REACTION_WHEEL_FAILURE';

    return {
      type: 'CONFIRMATION_REQUIRED',
      action: 'injectFault',
      params: { faultId },
      message: `⚠️ **Action Confirmation Required**: Are you sure you want to inject fault \`${faultId}\` into the active satellite simulation?`,
      confirmText: `Confirm Inject ${faultId}`,
    };
  }

  if (query.includes('stop mission') || query.includes('terminate mission')) {
    return {
      type: 'CONFIRMATION_REQUIRED',
      action: 'stopMission',
      params: {},
      message: '⚠️ **Action Confirmation Required**: Are you sure you want to stop the active satellite mission execution?',
      confirmText: 'Confirm Stop Mission',
    };
  }

  if (query.includes('pause mission')) {
    return {
      type: 'CONFIRMATION_REQUIRED',
      action: 'pauseMission',
      params: {},
      message: 'Are you sure you want to pause mission simulation execution?',
      confirmText: 'Confirm Pause Mission',
    };
  }

  if (query.includes('clear fault') || query.includes('resolve fault')) {
    const faults = getActiveFaults();
    if (!faults.length) {
      return {
        type: 'ANSWER',
        text: 'There are currently no active faults to clear on the spacecraft.',
      };
    }
    return {
      type: 'CONFIRMATION_REQUIRED',
      action: 'clearFault',
      params: { faultId: faults[0] },
      message: `Are you sure you want to clear active fault \`${faults[0]}\`?`,
      confirmText: `Confirm Clear ${faults[0]}`,
    };
  }

  // Question Intent Routing & Shared States
  const status = getMissionStatus();
  const tel = getLatestTelemetry();
  const health = getSubsystemHealth();
  const activeFaults = getActiveFaults();
  const advisories = getMissionAdvisory();

  // AI Autonomous Mission Planner intent routing
  if (query.includes('plan') || query.includes('replan') || query.includes('schedule') || query.includes('recovery plan') || query.includes('risk score')) {
    try {
      const planReport = await MissionPlannerService.generateMissionPlan();
      return {
        type: 'ANSWER',
        text: `🤖 **Autonomous AI Mission Planner Report**:

${planReport.explanation || 'Mission Plan evaluated successfully.'}

**Plan Key Metrics**:
- **Risk Score**: \`${planReport.risk_score}\` (${planReport.risk_level})
- **Feasibility**: \`${planReport.feasibility_status || 'GO'}\`
- **Total Tasks**: \`${planReport.tasks?.length || 0}\` scheduled
- **Status**: \`${planReport.mission_status || 'NOMINAL'}\``,
        advisories: advisories,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger.error('Copilot AI Mission Planner failed', { message: err.message, stack: err.stack });
    }
  }

  let responseText = '';

  if (query.includes('status') || query.includes('phase') || query.includes('met') || query.includes('running')) {
    responseText = `🛰️ **Mission Operations Status**:
- **Status**: ${status.status}
- **Mission ID**: \`${status.missionId}\`
- **Phase**: ${status.currentPhase}
- **Mission Elapsed Time (MET)**: ${status.metFormatted}
- **Active Faults**: ${activeFaults.length > 0 ? activeFaults.join(', ') : 'None (All systems nominal)'}`;
  }
  else if (query.includes('battery') || query.includes('power') || query.includes('charge') || query.includes('voltage')) {
    responseText = `🔋 **EPS Energy Storage Telemetry**:
- **Battery Charge**: ${tel?.battery ?? 100}%
- **Bus Voltage**: ${tel?.batteryVoltage ?? 28.5} V
- **Status**: ${tel?.batteryCharging ? '⚡ CHARGING' : '🔻 DISCHARGING'}
- **Solar Generation**: ${tel?.solarGeneration ?? 420} W
- **Power Consumption**: ${tel?.powerConsumption ?? 120} W`;
  }
  else if (query.includes('thermal') || query.includes('temperature') || query.includes('heat') || query.includes('spike')) {
    responseText = `🌡️ **Thermal Control Telemetry**:
- **Core Bus Temperature**: ${tel?.temperature ?? 22} °C
- **Status**: ${tel?.temperature > 60 ? '🚨 CRITICAL (Overheating Threshold Exceeded)' : tel?.temperature > 45 ? '⚠️ DEGRADED' : '✅ NOMINAL'}
- **Radiator Status**: ${tel?.temperature > 50 ? 'Active Louvres Fully Opened' : 'Passive Insulation Loop Nominal'}`;
  }
  else if (query.includes('comm') || query.includes('antenna') || query.includes('signal') || query.includes('ground')) {
    responseText = `📡 **TT&C Communications Status**:
- **Signal Strength**: ${tel?.signalStrength ?? 92}%
- **Ground Station Link**: ${tel?.windowOpen ? '✅ IN RANGE (ISRO SHAR Track)' : '❌ OUT OF RANGE'}
- **Packet Loss**: ${tel?.packetLoss ?? 0}%
- **Latency**: ${tel?.latencyMs ?? 15} ms`;
  }
  else if (query.includes('fault') || query.includes('anomaly') || query.includes('error') || query.includes('warning')) {
    if (activeFaults.length > 0) {
      responseText = `🚨 **Active Satellite Faults (${activeFaults.length})**:
${activeFaults.map(f => `- \`${f}\`: Currently impacting subsystem hardware response.`).join('\n')}

Inspect the **Digital Twin** or **Fault Injection** dashboard to clear or investigate.`;
    } else {
      responseText = '✅ **No Active Faults**: All spacecraft subsystems are operating under nominal conditions.';
    }
  }
  else if (query.includes('health') || query.includes('subsystem') || query.includes('degrad')) {
    responseText = `📊 **Subsystem Health Index (${health.overallHealth}%)**:
${health.subsystems.map(s => `- **${s.name}**: ${s.health}% (${s.status}) — ${s.details}`).join('\n')}`;
  }
  else if (query.includes('summary') || query.includes('brief') || query.includes('overview')) {
    const summary = await getMissionSummary();
    responseText = `📋 **Mission Operations Summary**:
- **Mission ID**: \`${summary.missionId}\` (${summary.status})
- **MET**: ${summary.met} | **Phase**: ${summary.phase}
- **Power & Battery**: ${summary.battery} | ${summary.solarGen} Solar
- **Thermal**: ${summary.temp} | **Signal**: ${summary.signal}
- **Subsystem Breakdown**: ${summary.subsystemNominalCount} Nominal, ${summary.subsystemDegradedCount} Degraded, ${summary.subsystemCriticalCount} Critical
- **Active Faults**: ${summary.activeFaults.length > 0 ? summary.activeFaults.join(', ') : 'None'}`;
  }
  else if (query.includes('replay') || query.includes('history')) {
    const replays = await getReplayData();
    responseText = `🎞️ **Replay History Datasets (${replays.length} sessions available)**:
${replays.map(r => `- **Mission ${r.missionName}** (\`${r.missionId}\`): ${r.snapshotsCount} snapshots, ${r.status}`).join('\n')}

Use the **Replay** page to play back historical telemetry streams.`;
  }
  else {
    const groq = getGroqClient();
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are OrbitOps AI Mission Copilot, an expert spacecraft operations assistant.
You have real-time access to telemetry:
- Mission Status: ${status.status} (${status.metFormatted})
- Mission Phase: ${status.currentPhase}
- Battery Charge: ${tel?.battery ?? 100}% (${tel?.batteryVoltage ?? 28.5}V)
- Temperature: ${tel?.temperature ?? 22}°C
- Solar Generation: ${tel?.solarGeneration ?? 420}W
- Signal Strength: ${tel?.signalStrength ?? 92}%
- Active Faults: ${activeFaults.length > 0 ? activeFaults.join(', ') : 'None'}
Answer operator questions concisely, accurately, and with mission control terminology.`,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_completion_tokens: 512,
        });

        responseText = completion.choices[0]?.message?.content || 'No response from Groq AI.';
      } catch (err) {
        logger.error('Groq LLM completion failed, falling back to deterministic response', { error: err.message });
        responseText = `🛰️ **OrbitOps AI Mission Copilot**:
I am connected to the live mission simulation engine and database. Here is the current snapshot:
- **Mission Status**: ${status.status} (${status.metFormatted})
- **Battery**: ${tel?.battery ?? 100}% | **Temp**: ${tel?.temperature ?? 22}°C | **Signal**: ${tel?.signalStrength ?? 92}%
- **Active Faults**: ${activeFaults.length > 0 ? activeFaults.join(', ') : 'None'}

You can ask me about mission status, telemetry, faults, subsystem health, replay sessions, request AI mission plans, or request mission summaries.`;
      }
    } else {
      responseText = `🛰️ **OrbitOps AI Mission Copilot**:
I am connected to the live mission simulation engine and database. Here is the current snapshot:
- **Mission Status**: ${status.status} (${status.metFormatted})
- **Battery**: ${tel?.battery ?? 100}% | **Temp**: ${tel?.temperature ?? 22}°C | **Signal**: ${tel?.signalStrength ?? 92}%
- **Active Faults**: ${activeFaults.length > 0 ? activeFaults.join(', ') : 'None'}

*(Tip: Add your \`GROQ_API_KEY\` to \`backend/.env\` to enable full LLM conversational synthesis!)*`;
    }
  }

  return {
    type: 'ANSWER',
    text: responseText,
    advisories: advisories,
    timestamp: new Date().toISOString(),
  };
}

// ── 3. Confirmed Action Execution Engine ───────────────────────────

/**
 * Execute a confirmed action via backend services.
 *
 * @param {Object} actionReq
 * @param {string} actionReq.action
 * @param {Object} [actionReq.params]
 * @returns {Promise<Object>}
 */
export async function executeCopilotAction({ action, params = {} }) {
  logger.info('Copilot executing confirmed action', { action, params });

  switch (action) {
    case 'injectFault': {
      const faultId = params.faultId || 'THERMAL_SPIKE';
      const result = await FaultService.injectFault({ faultId });
      return {
        success: true,
        message: `✅ Fault \`${faultId}\` successfully injected into active simulation. Telemetry and 3D model updating over Socket.IO.`,
        data: result,
      };
    }
    case 'clearFault': {
      const faultId = params.faultId;
      const result = await FaultService.clearFault(faultId);
      return {
        success: true,
        message: `✅ Fault \`${faultId || 'active'}\` cleared successfully. Hardware state returning to nominal.`,
        data: result,
      };
    }
    case 'pauseMission': {
      SimulationService.pause();
      return {
        success: true,
        message: '✅ Satellite mission simulation execution PAUSED by operator request.',
      };
    }
    case 'resumeMission': {
      SimulationService.resume();
      return {
        success: true,
        message: '✅ Satellite mission simulation execution RESUMED.',
      };
    }
    case 'stopMission': {
      SimulationService.stop();
      return {
        success: true,
        message: '✅ Satellite mission simulation execution STOPPED cleanly. Telemetry and session logs finalized in database.',
      };
    }
    default:
      throw new AppError(`Unknown copilot action: ${action}`, HTTP.BAD_REQUEST);
  }
}

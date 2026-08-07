/**
 * MissionPlannerService.js
 *
 * Node.js bridge service that executes Python Autonomous Space Mission Planner
 * (`telemetry_ai/planner_bridge.py`) via stdio IPC.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as SimulationService from './SimulationService.js';
import { logger } from '../middlewares/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const PYTHON_SCRIPT = path.resolve(PROJECT_ROOT, 'telemetry_ai/planner_bridge.py');

/**
 * Execute Python Mission Planner bridge with given input payload.
 *
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export function runPythonPlanner(payload) {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python', [PYTHON_SCRIPT], {
      cwd: PROJECT_ROOT,
      env: process.env,
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0 && !stdoutData) {
        logger.error('Python planner process failed', { code, stderr: stderrData });
        return reject(new Error(`Mission Planner failed with exit code ${code}: ${stderrData}`));
      }

      try {
        const jsonResult = JSON.parse(stdoutData);
        if (jsonResult.error) {
          return reject(new Error(jsonResult.message || 'Mission Planner reported error'));
        }
        resolve(jsonResult);
      } catch (err) {
        logger.error('Failed to parse Python planner output', { stdout: stdoutData, stderr: stderrData });
        reject(new Error(`Failed to parse Mission Planner JSON response: ${err.message}`));
      }
    });

    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
  });
}

/**
 * Generate AI Mission Plan using current telemetry and simulation state.
 *
 * @param {Object} [customInputs]
 * @returns {Promise<Object>}
 */
export async function generateMissionPlan(customInputs = {}) {
  const sessionStatus = SimulationService.getSessionStatus();
  const currentTel = sessionStatus.latestTelemetry || SimulationService.getCurrentState();
  const activeFaults = sessionStatus.activeFaults || [];

  // Build input snapshot from current simulation telemetry
  const battery = currentTel?.battery ?? 95;
  const temp = currentTel?.temperature ?? 22;
  const fuel = currentTel?.fuelLevel ?? 90;
  const signal = currentTel?.signalStrength ?? 92;
  const storagePct = currentTel?.storagePct ?? 25;

  let agent1_output = null;
  let agent2_output = null;

  if (activeFaults.length > 0) {
    const firstFault = typeof activeFaults[0] === 'string' ? activeFaults[0] : activeFaults[0].id || 'STORAGE_LEAK';
    let mappedFaultType = 'Storage_Leak';
    let subsystem = 'Storage';

    if (firstFault.includes('THERMAL')) {
      mappedFaultType = 'Thermal_Spike';
      subsystem = 'Thermal';
    } else if (firstFault.includes('BATTERY')) {
      mappedFaultType = 'Battery_Drain';
      subsystem = 'Power';
    } else if (firstFault.includes('COMM')) {
      mappedFaultType = 'Communication_Loss';
      subsystem = 'Communication';
    } else if (firstFault.includes('SOLAR')) {
      mappedFaultType = 'Battery_Drain';
      subsystem = 'Power';
    }

    agent1_output = {
      status: 'ANOMALY',
      anomaly_score: -0.05,
      confidence: 88.0,
      subsystem: subsystem,
    };

    agent2_output = {
      fault_type: mappedFaultType,
      confidence: 95.0,
      severity: 'Critical',
    };
  }

  const missionInput = {
    mission_name: customInputs.mission_name || sessionStatus.missionName || 'OrbitOps Earth Survey',
    objective: customInputs.objective || 'Orbital Imaging and Telemetry Downlink',
    mission_type: customInputs.mission_type || 'orbital_survey',
    destination: customInputs.destination || 'LEO',
    duration_hours: customInputs.duration_hours || 24,
    priority: customInputs.priority || 1,
    battery_level: customInputs.battery_level ?? battery,
    fuel_level: customInputs.fuel_level ?? fuel,
    temperature: customInputs.temperature ?? temp,
    signal_strength: customInputs.signal_strength ?? signal,
    storage_usage_pct: customInputs.storage_usage_pct ?? storagePct,
    agent1_output: customInputs.agent1_output || agent1_output,
    agent2_output: customInputs.agent2_output || agent2_output,
  };

  logger.info('Generating AI Mission Plan', { mission_name: missionInput.mission_name, activeFaultsCount: activeFaults.length });

  const report = await runPythonPlanner({
    mode: 'plan',
    missionInput: missionInput,
  });

  return report;
}

/**
 * MissionPlannerService.js
 *
 * Node.js bridge service that executes Python Autonomous Space Mission Planner
 * (`telemetry_ai/planner_bridge.py`) via stdio IPC, and enhances mission
 * explanations using Gemini API / Groq LLM.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Groq } from 'groq-sdk';
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
 * Generate a real LLM narrative summary using Gemini or Groq API if available.
 */
async function generateLlmExplanation(report, missionInput) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const prompt = `You are OrbitOps AI Mission Control Analyst. Generate an executive space mission report for:
Mission Name: ${missionInput.mission_name}
Objective: ${missionInput.objective}
Category: ${missionInput.mission_type}
Destination: ${missionInput.destination}
Planned Duration: ${missionInput.duration_hours} Hours
Feasibility Verdict: ${report.feasibility}
AI Risk Level: ${report.risk_level} (Score: ${report.risk_score} / 100)
Tasks Decomposed: ${report.tasks?.length || 0} tasks
Battery Forecast Remaining: ${report.resource_status?.battery_remaining ?? 47.5}%
Fuel Forecast Remaining: ${report.resource_status?.fuel_remaining ?? 72.0}%

Write a clear, professional, executive spacecraft mission explanation report formatted cleanly in Markdown. Include:
1. Executive Summary & Feasibility Verdict
2. Power & Propellant Resource Forecast
3. Decomposed Task Timeline Overview
4. Risk & Safety Evaluation
5. Final Operational Recommendation`;

  // 1. Try Gemini API if key is present
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim().length > 50) return text;
    } catch (err) {
      logger.error('Gemini API call failed, trying Groq or fallback', { error: err.message });
    }
  }

  // 2. Try Groq API if key is present
  if (groqKey && groqKey.trim() !== '' && !groqKey.includes('your_groq')) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_completion_tokens: 600,
      });
      const text = completion.choices[0]?.message?.content;
      if (text && text.trim().length > 50) return text;
    } catch (err) {
      logger.error('Groq API call failed', { error: err.message });
    }
  }

  // 3. Fallback: Return formatted structured report
  return report.explanation || `==================================================
AUTONOMOUS AI SPACE MISSION PLANNER REPORT
==================================================

Mission Name: ${missionInput.mission_name}
Target Objective: ${missionInput.objective}
Mission Category: ${missionInput.mission_type}
Target Destination: ${missionInput.destination}
Planned Duration: ${missionInput.duration_hours} Hours

--------------------------------------------------
EXECUTION SUMMARY
--------------------------------------------------
Mission Status: ${report.mission_status || 'PLANNED'}
Feasibility Verdict: [${report.feasibility || 'GO'}]
AI Risk Score: ${report.risk_score} / 100 (${report.risk_level} RISK)
Abort Recommendation: ${report.abort_recommendation ? 'YES — ABORT' : 'NO ABORT REQUIRED'}

--------------------------------------------------
RESOURCE FORECAST
--------------------------------------------------
Battery Reserve Remaining: ${report.resource_status?.battery_remaining ?? 47.5}%
RCS Propellant Remaining: ${report.resource_status?.fuel_remaining ?? 72.0}%
Resource Shortage: ${report.resource_status?.has_shortage ? 'YES (WARNING)' : 'NONE'}

FINAL DECISION: ${report.feasibility === 'GO' ? 'CONTINUE MISSION AS PLANNED' : 'MONITOR RESERVES / REPLAN'}`;
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

  // Enhance with Gemini API / Groq LLM explanation if key is provided
  report.explanation = await generateLlmExplanation(report, missionInput);

  return report;
}

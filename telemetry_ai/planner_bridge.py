#!/usr/bin/env python3
"""
planner_bridge.py
=================
JSON CLI bridge for telemetry_ai.mission_planner.
Interfaced by Node.js backend services via stdin/stdout JSON.
"""

import sys
import os
import json
import logging

# Ensure project root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Suppress logs to keep stdout clean for JSON parsing
logging.basicConfig(level=logging.ERROR)

from telemetry_ai.mission_planner.models import MissionInput
from telemetry_ai.mission_planner.orchestrator import MissionPlanner
from telemetry_ai.mission_planner.explanation_service import TemplateExplanationService


def run_planner(payload):
    mode = payload.get("mode", "plan")
    input_data = payload.get("missionInput", {})

    mission_type = input_data.get("mission_type", "orbital_survey")
    if mission_type == "Survey":
        mission_type = "orbital_survey"

    mission_input = MissionInput(
        mission_name=input_data.get("mission_name", "OrbitOps Alpha"),
        objective=input_data.get("objective", "Orbital observation and telemetry monitoring"),
        mission_type=mission_type,
        destination=input_data.get("destination", "LEO"),
        duration_hours=float(input_data.get("duration_hours", 24)),
        priority=int(input_data.get("priority", 1)),
        battery_level=float(input_data.get("battery_level", 95.0)),
        solar_panel_efficiency=float(input_data.get("solar_panel_efficiency", 95.0)),
        fuel_level=float(input_data.get("fuel_level", 90.0)),
        temperature=float(input_data.get("temperature", 22.0)),
        signal_strength=float(input_data.get("signal_strength", 90.0)),
        storage_usage_pct=float(input_data.get("storage_usage_pct", 20.0)),
        navigation_accuracy=float(input_data.get("navigation_accuracy", 99.0)),
        payload_status=input_data.get("payload_status", "nominal"),
        cpu_load=float(input_data.get("cpu_load", 35.0)),
        link_latency_ms=float(input_data.get("link_latency_ms", 15.0)),
        comm_status=input_data.get("comm_status", "online"),
    )

    if "agent1_output" in input_data and input_data["agent1_output"]:
        mission_input.agent1_output = input_data["agent1_output"]
    if "agent2_output" in input_data and input_data["agent2_output"]:
        mission_input.agent2_output = input_data["agent2_output"]

    planner = MissionPlanner()
    report = planner.plan_mission(mission_input)

    explainer = TemplateExplanationService()
    explanation = explainer.explain(report)

    output = report.to_dict()
    output["explanation"] = explanation

    return output


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(1)

        payload = json.loads(raw)
        result = run_planner(payload)
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_res = {
            "error": True,
            "message": str(e)
        }
        print(json.dumps(error_res))
        sys.exit(1)


if __name__ == "__main__":
    main()

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


def _safe_float(val, default):
    """Safely convert a value to float, returning default if not possible."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val)
        except (ValueError, TypeError):
            return default
    # If it's a dict/list (bad data), return default
    return default


def _safe_int(val, default):
    """Safely convert a value to int."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        try:
            return int(val)
        except (ValueError, TypeError):
            return default
    return default


def _safe_str(val, default):
    """Safely convert to string, return default if dict/list."""
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return default
    return str(val)


def _safe_dict(val):
    """Safely extract a dict value, return None if not a dict."""
    if isinstance(val, dict):
        return val
    return None


def run_planner(payload):
    input_data = payload.get("missionInput", {})

    mission_type = _safe_str(input_data.get("mission_type"), "orbital_survey")
    if mission_type in ("Survey", "survey"):
        mission_type = "orbital_survey"

    mission_input = MissionInput(
        mission_name=_safe_str(input_data.get("mission_name"), "OrbitOps Alpha"),
        objective=_safe_str(input_data.get("objective"), "Orbital observation and telemetry monitoring"),
        mission_type=mission_type,
        destination=_safe_str(input_data.get("destination"), "LEO"),
        duration_hours=_safe_float(input_data.get("duration_hours"), 24.0),
        priority=_safe_int(input_data.get("priority"), 1),
        battery_level=_safe_float(input_data.get("battery_level"), 95.0),
        solar_panel_efficiency=_safe_float(input_data.get("solar_panel_efficiency"), 95.0),
        fuel_level=_safe_float(input_data.get("fuel_level"), 90.0),
        temperature=_safe_float(input_data.get("temperature"), 22.0),
        signal_strength=_safe_float(input_data.get("signal_strength"), 90.0),
        storage_usage_pct=_safe_float(input_data.get("storage_usage_pct"), 20.0),
        navigation_accuracy=_safe_float(input_data.get("navigation_accuracy"), 99.0),
        payload_status=_safe_str(input_data.get("payload_status"), "nominal"),
        cpu_load=_safe_float(input_data.get("cpu_load"), 35.0),
        link_latency_ms=_safe_float(input_data.get("link_latency_ms"), 15.0),
        comm_status=_safe_str(input_data.get("comm_status"), "online"),
    )

    # Safely extract agent outputs (must be dicts, not any other type)
    agent1 = _safe_dict(input_data.get("agent1_output"))
    agent2 = _safe_dict(input_data.get("agent2_output"))

    if agent1:
        mission_input.agent1_output = agent1
    if agent2:
        mission_input.agent2_output = agent2

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
            error_res = {"error": True, "message": "Empty input from stdin"}
            print(json.dumps(error_res))
            sys.exit(1)

        payload = json.loads(raw)
        result = run_planner(payload)
        print(json.dumps(result, indent=2))
    except json.JSONDecodeError as e:
        error_res = {"error": True, "message": f"Invalid JSON input: {str(e)}"}
        print(json.dumps(error_res))
        sys.exit(1)
    except Exception as e:
        import traceback
        error_res = {
            "error": True,
            "message": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_res))
        sys.exit(1)


if __name__ == "__main__":
    main()

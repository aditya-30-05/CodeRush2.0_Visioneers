#!/usr/bin/env python3
"""
run_deterministic_prototype.py
===============================
Autonomous Space Mission Planner — Deterministic Pipeline Prototype

Demonstrates the 8-Stage Deterministic Autonomous Mission Planning Pipeline
across all 5 Mission Types:
  1. Orbital Survey (LEO)
  2. Deep Space Exploration (Mars Transfer)
  3. Sample Return (Lunar Orbit)
  4. Communication Relay (GEO)
  5. On-Orbit Servicing (LEO)

Pipeline Stages:
  [1] Objective Decomposition
  [2] 12-Dimension Constraint Verification
  [3] Resource & Depletion Forecasting
  [4] Priority-Based Task Scheduling
  [5] Multi-Dimensional Risk Evaluation
  [6] Automated Fault Recovery Rule Generation
  [7] Chronological Timeline Construction
  [8] Structured Mission Report Synthesis
"""

import sys
import json
import logging

logging.basicConfig(level=logging.ERROR)

from telemetry_ai.mission_planner.models import MissionInput
from telemetry_ai.mission_planner.orchestrator import MissionPlanner
from telemetry_ai.mission_planner.explanation_service import TemplateExplanationService

MISSION_PROTOTYPES = [
    {
        "type_id": "orbital_survey",
        "name": "Orbital Survey (LEO)",
        "objective": "High-resolution optical mapping and land thermal survey",
        "destination": "LEO",
        "duration_hours": 24,
        "battery": 95.0,
        "fuel": 90.0,
        "temp": 22.0,
    },
    {
        "type_id": "deep_space",
        "name": "Deep Space Exploration",
        "objective": "Interstellar trajectory positioning and cosmic ray radiation logging",
        "destination": "Mars Transfer",
        "duration_hours": 72,
        "battery": 92.0,
        "fuel": 85.0,
        "temp": 28.0,
    },
    {
        "type_id": "sample_return",
        "name": "Sample Return",
        "objective": "Regolith sample capture, hermetic sealing, and earth reentry alignment",
        "destination": "Lunar Orbit",
        "duration_hours": 48,
        "battery": 88.0,
        "fuel": 70.0,
        "temp": 32.0,
    },
    {
        "type_id": "communication_relay",
        "name": "Communication Relay",
        "objective": "Geostationary RF band relay & high-throughput cross-link sync",
        "destination": "GEO",
        "duration_hours": 36,
        "battery": 98.0,
        "fuel": 95.0,
        "temp": 24.0,
    },
    {
        "type_id": "maintenance",
        "name": "On-Orbit Servicing",
        "objective": "Robotic arm docking, sensor replacement, and thruster calibration",
        "destination": "LEO",
        "duration_hours": 30,
        "battery": 85.0,
        "fuel": 60.0,
        "temp": 35.0,
    },
]


def run_prototype():
    print("=" * 80)
    print("   AUTONOMOUS SPACE MISSION PLANNER — DETERMINISTIC PROTOTYPE DEMO")
    print("=" * 80)
    print("Executing 8-Stage Deterministic Pipeline across 5 Mission Types...\n")

    planner = MissionPlanner()
    explainer = TemplateExplanationService()

    for idx, proto in enumerate(MISSION_PROTOTYPES, start=1):
        print(f"[{idx}/5] PROTOTYPE MISSION: {proto['name']}")
        print(f"      Objective: {proto['objective']}")
        print(f"      Destination: {proto['destination']} | Planned Duration: {proto['duration_hours']}h")

        mission_input = MissionInput(
            mission_name=f"OrbitOps Prototype Scenario #{idx} - {proto['name']}",
            objective=proto['objective'],
            mission_type=proto['type_id'],
            destination=proto['destination'],
            duration_hours=float(proto['duration_hours']),
            priority=1,
            battery_level=proto['battery'],
            solar_panel_efficiency=95.0,
            fuel_level=proto['fuel'],
            temperature=proto['temp'],
            signal_strength=90.0,
            storage_usage_pct=25.0,
            navigation_accuracy=99.0,
            payload_status="nominal",
            cpu_load=35.0,
            link_latency_ms=25.0,
        )

        # Run deterministic orchestrator pipeline
        report = planner.plan_mission(mission_input)

        # Output Summary
        print(f"      --------------------------------------------------")
        print(f"      Feasibility Verdict : [{report.feasibility}]")
        print(f"      AI Risk Score       : {report.risk_score} / 100 ({report.risk_level} RISK)")
        print(f"      Decomposed Tasks    : {len(report.tasks)} Tasks Generated")
        print(f"      Battery Forecast    : {report.resource_status.get('battery_remaining', 0)}% Remaining")
        print(f"      Fuel Reserve        : {report.resource_status.get('fuel_remaining', 0)}% Remaining")
        print(f"      Abort Recommended   : {'YES' if report.abort_recommendation else 'NO'}")
        print(f"      --------------------------------------------------\n")

    print("================================================================================")
    print("[OK] All 5 Mission Prototypes Evaluated Successfully via Deterministic Pipeline.")
    print("================================================================================")


if __name__ == "__main__":
    run_prototype()

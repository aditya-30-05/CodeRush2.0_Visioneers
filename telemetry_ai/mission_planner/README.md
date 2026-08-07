# Autonomous Space Mission Planner

Modular, deterministic mission planning system for autonomous spacecraft operations. Integrates with Agent 1 (Anomaly Detection) and Agent 2 (Fault Diagnosis) for dynamic replanning.

## Architecture

```
Mission Input
  → Objective Analyzer      (break objective into tasks)
  → Constraint Checker       (evaluate feasibility)
  → Resource Planner         (estimate resource consumption)
  → Task Scheduler           (order tasks by dependencies & priority)
  → Risk Evaluator           (calculate risk score 0-100)
  → Fault Response Planner   (apply recovery rules for detected faults)
  → Timeline Generator       (create chronological timeline)
  → Report Generator         (assemble final structured JSON report)
```

## Key Design Principles

- **No LLM for core decisions**: All risk scoring, constraint checking, fault response, and abort decisions use deterministic rules and configurable thresholds.
- **Deterministic**: Identical inputs always produce identical outputs — mission scenarios can be replayed.
- **Centralized configuration**: All thresholds, weights, and recovery rules in `config.py`.
- **Dynamic replanning**: Completed tasks are preserved when faults are detected mid-mission.
- **Clean interfaces**: Each module is a separate Python class with typed inputs/outputs.

## Quick Start

```python
from mission_planner import MissionPlanner, MissionInput

# Define mission
mission = MissionInput(
    mission_name="Survey-1",
    objective="Orbital survey of target region",
    mission_type="orbital_survey",
    destination="LEO",
    duration_hours=48,
    priority=2,
    battery_level=95.0,
    fuel_level=90.0,
    temperature=22.0,
    comm_status="online",
)

# Plan mission
planner = MissionPlanner()
report = planner.plan_mission(mission)

# Get JSON output
print(report.to_json())
```

## Dynamic Replanning

```python
# After some tasks complete, inject a fault
planner.mark_task_completed("T001_system_check")
planner.mark_task_completed("T002_communication_link")

updated_report = planner.replan(
    agent1_output={"status": "ANOMALY", "anomaly_score": -0.3, "confidence": 70, "subsystem": "Power"},
    agent2_output={"fault_type": "Battery_Drain", "confidence": 85, "severity": "High"},
)
```

## Mission Types

| Type | Description |
|------|-------------|
| `orbital_survey` | Earth/planetary orbit observation |
| `deep_space` | Deep space exploration |
| `sample_return` | Surface sample collection and return |
| `communication_relay` | Communication relay deployment |
| `maintenance` | On-orbit servicing/repair |

## Fault Recovery Rules

| Fault Type | Recovery Actions |
|---|---|
| Communication_Loss | Switch backup comm → Retry link → Store data locally |
| Battery_Drain | Reduce payload ops → Disable non-essential → Prioritize critical |
| Thermal_Spike | Stop high-power ops → Activate thermal control → Wait stabilization |
| Power_Surge | Isolate surge → Switch backup power → Reduce load |
| Storage_Leak | Clear temp storage → Compress data → Limit logging |
| Low_Fuel | Cancel maneuvers → Optimize trajectory → Evaluate abort |

## Running Tests

```bash
cd telemetry_ai
python -m mission_planner.test_scenarios
```

## File Structure

| File | Module | Description |
|------|--------|-------------|
| `config.py` | Config | All thresholds, rules, weights |
| `models.py` | Models | Shared data classes and enums |
| `objective_analyzer.py` | Module 1 | Objective → task decomposition |
| `constraint_checker.py` | Module 2 | Feasibility checks |
| `resource_planner.py` | Module 3 | Resource estimation |
| `task_scheduler.py` | Module 4 | Dependency-aware scheduling |
| `risk_evaluator.py` | Module 5 | Risk scoring (0-100) |
| `fault_response_planner.py` | Module 6 | Fault recovery rules |
| `timeline_generator.py` | Module 7 | Chronological timeline |
| `report_generator.py` | Module 8 | Final JSON report |
| `explanation_service.py` | Optional | Gemini integration interface |
| `orchestrator.py` | Core | Central MissionPlanner |
| `test_scenarios.py` | Tests | 10+ test scenarios |

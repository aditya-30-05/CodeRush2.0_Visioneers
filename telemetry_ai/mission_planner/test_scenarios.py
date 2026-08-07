"""
test_scenarios.py
=================
10 comprehensive test scenarios for the Autonomous Space Mission Planner.

Each scenario validates:
  - Determinism (identical inputs → identical outputs)
  - Correct constraint statuses
  - Correct risk classification
  - Correct corrective actions
  - Completed tasks remain unchanged during replanning

Run with:
    cd telemetry_ai/mission_planner
    python test_scenarios.py
"""

from __future__ import annotations

import json
import sys
import copy
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Path setup — allow running directly from this directory
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent
_PARENT = _HERE.parent
if str(_PARENT) not in sys.path:
    sys.path.insert(0, str(_PARENT))
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from mission_planner.models import MissionInput, MissionReport
from mission_planner.orchestrator import MissionPlanner
from mission_planner.explanation_service import TemplateExplanationService


# ===================================================================
# Test infrastructure
# ===================================================================

_PASS_COUNT = 0
_FAIL_COUNT = 0
_TOTAL_COUNT = 0


def assert_equal(name: str, actual: Any, expected: Any) -> None:
    """Assert equality with clear output."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    _TOTAL_COUNT += 1
    if actual == expected:
        _PASS_COUNT += 1
    else:
        _FAIL_COUNT += 1
        print(f"    [FAIL] {name}")
        print(f"       Expected: {expected}")
        print(f"       Actual:   {actual}")


def assert_true(name: str, condition: bool) -> None:
    """Assert condition is true."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    _TOTAL_COUNT += 1
    if condition:
        _PASS_COUNT += 1
    else:
        _FAIL_COUNT += 1
        print(f"    [FAIL] {name}")


def assert_in(name: str, value: Any, collection: Any) -> None:
    """Assert value is in collection."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    _TOTAL_COUNT += 1
    if value in collection:
        _PASS_COUNT += 1
    else:
        _FAIL_COUNT += 1
        print(f"    [FAIL] {name}")
        print(f"       '{value}' not found in {collection}")


def assert_gte(name: str, actual: float, minimum: float) -> None:
    """Assert actual >= minimum."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    _TOTAL_COUNT += 1
    if actual >= minimum:
        _PASS_COUNT += 1
    else:
        _FAIL_COUNT += 1
        print(f"    [FAIL] {name}")
        print(f"       {actual} is not >= {minimum}")


def assert_lte(name: str, actual: float, maximum: float) -> None:
    """Assert actual <= maximum."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    _TOTAL_COUNT += 1
    if actual <= maximum:
        _PASS_COUNT += 1
    else:
        _FAIL_COUNT += 1
        print(f"    [FAIL] {name}")
        print(f"       {actual} is not <= {maximum}")


def run_scenario(name: str, func: Any) -> None:
    """Run a single test scenario with error handling."""
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT
    prev_pass = _PASS_COUNT
    prev_fail = _FAIL_COUNT
    print(f"\n{'=' * 65}")
    print(f"  Scenario: {name}")
    print(f"{'=' * 65}")
    try:
        func()
        scenario_pass = _PASS_COUNT - prev_pass
        scenario_fail = _FAIL_COUNT - prev_fail
        if scenario_fail == 0:
            print(f"  [OK] PASSED ({scenario_pass} assertions)")
        else:
            print(f"  [FAIL] FAILED ({scenario_fail} failures, {scenario_pass} passed)")
    except Exception as e:
        _FAIL_COUNT += 1
        _TOTAL_COUNT += 1
        print(f"  [ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()


# ===================================================================
# Determinism helper
# ===================================================================

def verify_determinism(mission_input: MissionInput) -> None:
    """Run the planner twice and verify identical outputs."""
    planner1 = MissionPlanner()
    planner2 = MissionPlanner()

    input1 = copy.deepcopy(mission_input)
    input2 = copy.deepcopy(mission_input)

    report1 = planner1.plan_mission(input1)
    report2 = planner2.plan_mission(input2)

    json1 = report1.to_json()
    json2 = report2.to_json()

    assert_equal("Determinism (identical JSON output)", json1, json2)


# ===================================================================
# Scenario 1: Normal Mission
# ===================================================================

def test_normal_mission() -> None:
    """Normal mission with all systems nominal."""
    mission = MissionInput(
        mission_name="NormalSat-1",
        objective="Conduct orbital survey of target region",
        mission_type="orbital_survey",
        destination="LEO",
        duration_hours=48,
        priority=2,
        battery_level=95.0,
        fuel_level=90.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-60.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "GO")
    assert_equal("Risk level", report.risk_level, "LOW")
    assert_true("Risk score <= 25", report.risk_score <= 25)
    assert_true("No abort recommended", not report.abort_recommendation)
    assert_true("Has timeline entries", len(report.mission_timeline) > 0)
    assert_true("Has tasks", len(report.tasks) > 0)
    assert_equal("No corrective actions", len(report.corrective_actions), 0)

    # Verify determinism
    verify_determinism(mission)


# ===================================================================
# Scenario 2: Communication Loss
# ===================================================================

def test_communication_loss() -> None:
    """Communication loss detected by Agent 1 and diagnosed by Agent 2."""
    mission = MissionInput(
        mission_name="CommFail-1",
        objective="Deep space observation mission",
        mission_type="deep_space",
        destination="Mars orbit",
        duration_hours=72,
        priority=2,
        battery_level=85.0,
        fuel_level=80.0,
        temperature=25.0,
        comm_status="offline",
        signal_strength=-95.0,
        mission_phase="operational",
        agent1_output={
            "status": "ANOMALY",
            "anomaly_score": -0.0574,
            "confidence": 50,
            "subsystem": "Communication",
        },
        agent2_output={
            "fault_type": "Communication_Loss",
            "confidence": 82,
            "severity": "Critical",
        },
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "NO_GO")
    assert_true("Has corrective actions", len(report.corrective_actions) > 0)
    assert_true("Plan was modified (REPLANNED or ABORTED)",
                report.mission_status in ("REPLANNED", "ABORTED"))

    # Check corrective actions include communication recovery
    action_names = [a["action_name"] for a in report.corrective_actions]
    assert_in("Has use_backup_antenna action", "use_backup_antenna", action_names)
    assert_in("Has retry_comm_link action", "retry_comm_link", action_names)

    verify_determinism(mission)


# ===================================================================
# Scenario 3: Low Battery
# ===================================================================

def test_low_battery() -> None:
    """Battery at warning level (22% < 25%)."""
    mission = MissionInput(
        mission_name="LowBatt-1",
        objective="Orbital survey with limited power",
        mission_type="orbital_survey",
        destination="LEO",
        duration_hours=24,
        priority=2,
        battery_level=22.0,
        fuel_level=85.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-62.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "CAUTION")

    # Check battery constraint is WARNING
    battery_constraint = next(
        (c for c in report.constraint_results if c["name"] == "battery"), None
    )
    assert_true("Battery constraint exists", battery_constraint is not None)
    if battery_constraint:
        assert_equal("Battery status", battery_constraint["status"], "WARNING")

    verify_determinism(mission)


# ===================================================================
# Scenario 4: Critical Battery
# ===================================================================

def test_critical_battery() -> None:
    """Battery critically low (8%) — should be NO_GO."""
    mission = MissionInput(
        mission_name="CritBatt-1",
        objective="Emergency power assessment",
        mission_type="maintenance",
        destination="ISS",
        duration_hours=12,
        priority=1,
        battery_level=8.0,
        fuel_level=75.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-63.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "NO_GO")

    # Battery constraint should FAIL
    battery_constraint = next(
        (c for c in report.constraint_results if c["name"] == "battery"), None
    )
    if battery_constraint:
        assert_equal("Battery status", battery_constraint["status"], "FAIL")

    # Risk should be elevated
    assert_true("Risk score > 15", report.risk_score > 15)

    verify_determinism(mission)


# ===================================================================
# Scenario 5: Low Fuel
# ===================================================================

def test_low_fuel() -> None:
    """Fuel at warning level (18% < 20%)."""
    mission = MissionInput(
        mission_name="LowFuel-1",
        objective="Trajectory optimization test",
        mission_type="deep_space",
        destination="Asteroid belt",
        duration_hours=96,
        priority=2,
        battery_level=90.0,
        fuel_level=18.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-65.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "CAUTION")

    # Fuel constraint should be WARNING
    fuel_constraint = next(
        (c for c in report.constraint_results if c["name"] == "fuel"), None
    )
    if fuel_constraint:
        assert_equal("Fuel status", fuel_constraint["status"], "WARNING")

    verify_determinism(mission)


# ===================================================================
# Scenario 6: Thermal Anomaly
# ===================================================================

def test_thermal_anomaly() -> None:
    """Temperature elevated at 65°C — WARNING level."""
    mission = MissionInput(
        mission_name="ThermalWarn-1",
        objective="Sample collection under thermal stress",
        mission_type="sample_return",
        destination="Moon",
        duration_hours=48,
        priority=2,
        battery_level=88.0,
        fuel_level=82.0,
        temperature=65.0,
        comm_status="online",
        signal_strength=-61.0,
        mission_phase="surface_ops",
        agent1_output={
            "status": "ANOMALY",
            "anomaly_score": -0.35,
            "confidence": 70,
            "subsystem": "Thermal",
        },
        agent2_output={
            "fault_type": "Thermal_Spike",
            "confidence": 78,
            "severity": "High",
        },
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "CAUTION")

    # Temperature constraint should be WARNING
    temp_constraint = next(
        (c for c in report.constraint_results if c["name"] == "temperature"), None
    )
    if temp_constraint:
        assert_equal("Temperature status", temp_constraint["status"], "WARNING")

    # Should have thermal recovery actions
    assert_true("Has corrective actions", len(report.corrective_actions) > 0)
    action_names = [a["action_name"] for a in report.corrective_actions]
    assert_in("Has stop_high_power_ops", "stop_high_power_ops", action_names)

    verify_determinism(mission)


# ===================================================================
# Scenario 7: Multiple Simultaneous Faults
# ===================================================================

def test_multiple_faults() -> None:
    """Low battery + communication loss — compounding faults."""
    mission = MissionInput(
        mission_name="MultiFault-1",
        objective="Emergency stabilization under multiple failures",
        mission_type="communication_relay",
        destination="GEO",
        duration_hours=36,
        priority=1,
        battery_level=18.0,
        fuel_level=18.0,
        temperature=60.0,
        comm_status="offline",
        signal_strength=-96.0,
        mission_phase="operational",
        agent1_output={
            "status": "ANOMALY",
            "anomaly_score": -0.45,
            "confidence": 85,
            "subsystem": "Communication",
        },
        agent2_output={
            "fault_type": "Communication_Loss",
            "confidence": 90,
            "severity": "Critical",
        },
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    # Should be NO_GO due to communication offline
    assert_equal("Feasibility", report.feasibility, "NO_GO")

    # Risk should be HIGH or CRITICAL
    assert_in("Risk level HIGH or CRITICAL",
              report.risk_level, ["HIGH", "CRITICAL"])

    verify_determinism(mission)


# ===================================================================
# Scenario 8: High-Risk Mission
# ===================================================================

def test_high_risk_mission() -> None:
    """Degraded conditions across multiple systems — HIGH risk."""
    mission = MissionInput(
        mission_name="HighRisk-1",
        objective="High-stakes reconnaissance in degraded conditions",
        mission_type="orbital_survey",
        destination="Venus orbit",
        duration_hours=200,
        priority=1,
        battery_level=20.0,
        fuel_level=18.0,
        temperature=60.0,
        comm_status="degraded",
        signal_strength=-85.0,
        storage_usage_pct=92.0,
        cpu_load=92.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    # Feasibility should be CAUTION (degraded comm, low resources)
    assert_in("Feasibility CAUTION or NO_GO",
              report.feasibility, ["CAUTION", "NO_GO"])

    # Risk should be elevated
    assert_true("Risk score > 40", report.risk_score > 40)
    assert_in("Risk level MEDIUM or higher",
              report.risk_level, ["MEDIUM", "HIGH", "CRITICAL"])

    verify_determinism(mission)


# ===================================================================
# Scenario 9: Recoverable Fault (dynamic replanning)
# ===================================================================

def test_recoverable_fault() -> None:
    """Battery drain detected during mission — replan should adapt.

    Tests the dynamic replanning flow:
    1. Plan initial mission
    2. Mark some tasks as completed
    3. Inject a battery drain fault
    4. Verify completed tasks are preserved
    5. Verify recovery actions are injected
    """
    # Initial plan with nominal conditions
    mission = MissionInput(
        mission_name="Recovery-1",
        objective="Orbital survey with potential battery issues",
        mission_type="orbital_survey",
        destination="LEO",
        duration_hours=36,
        priority=2,
        battery_level=85.0,
        fuel_level=88.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-60.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report1 = planner.plan_mission(mission)

    assert_equal("Initial feasibility", report1.feasibility, "GO")
    assert_true("Initial plan has tasks", len(report1.tasks) > 0)

    # Mark first 3 tasks as completed
    initial_tasks = planner.tasks
    completed_ids: set[str] = set()
    for task in initial_tasks[:3]:
        planner.mark_task_completed(task.task_id)
        completed_ids.add(task.task_id)

    # Simulate battery drain detection during mission
    report2 = planner.replan(
        agent1_output={
            "status": "ANOMALY",
            "anomaly_score": -0.30,
            "confidence": 72,
            "subsystem": "Power",
        },
        agent2_output={
            "fault_type": "Battery_Drain",
            "confidence": 85,
            "severity": "High",
        },
    )

    # Completed tasks should still be present
    assert_true("Replanned report has tasks", len(report2.tasks) > 0)
    assert_true("Has corrective actions", len(report2.corrective_actions) > 0)

    # Verify completed tasks are preserved in the replanned task list
    replanned_task_ids = {t["task_id"] for t in report2.tasks}
    for completed_id in completed_ids:
        assert_in(
            f"Completed task {completed_id} preserved",
            completed_id, replanned_task_ids,
        )


# ===================================================================
# Scenario 10: Mission Abort Condition
# ===================================================================

def test_mission_abort() -> None:
    """Extreme conditions: battery 5%, fuel 10%, temp 80°C.

    Should trigger:
    - NO_GO feasibility
    - CRITICAL risk level
    - Abort recommendation
    """
    mission = MissionInput(
        mission_name="Abort-1",
        objective="Emergency assessment under extreme conditions",
        mission_type="maintenance",
        destination="ISS",
        duration_hours=6,
        priority=1,
        battery_level=5.0,
        fuel_level=10.0,
        temperature=80.0,
        comm_status="offline",
        signal_strength=-99.0,
        mission_phase="operational",
        agent1_output={
            "status": "ANOMALY",
            "anomaly_score": -0.50,
            "confidence": 95,
            "subsystem": "Power",
        },
        agent2_output={
            "fault_type": "Battery_Drain",
            "confidence": 95,
            "severity": "Critical",
        },
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    assert_equal("Feasibility", report.feasibility, "NO_GO")
    assert_equal("Risk level", report.risk_level, "CRITICAL")
    assert_true("Abort recommended", report.abort_recommendation)
    assert_true("Abort reason is non-empty", len(report.abort_reason) > 0)

    # Multiple FAIL constraints
    fail_count = sum(1 for c in report.constraint_results if c["status"] == "FAIL")
    assert_gte("At least 2 FAIL constraints", fail_count, 2)

    verify_determinism(mission)


# ===================================================================
# Bonus: Test explanation service
# ===================================================================

def test_explanation_service() -> None:
    """Verify the template explanation service works correctly."""
    mission = MissionInput(
        mission_name="ExplainTest-1",
        objective="Test explanation service output",
        mission_type="orbital_survey",
        destination="LEO",
        duration_hours=24,
        priority=2,
        battery_level=90.0,
        fuel_level=85.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-60.0,
        mission_phase="operational",
    )

    planner = MissionPlanner()
    report = planner.plan_mission(mission)

    explainer = TemplateExplanationService()
    explanation = explainer.explain(report)

    assert_true("Explanation is non-empty", len(explanation) > 0)
    assert_in("Contains mission name", "ExplainTest-1", explanation)
    assert_in("Contains 'Overall Risk'", "Overall Risk", explanation)
    assert_in("Contains 'Final Decision'", "Final Decision", explanation)


def test_telemetry_rules_10() -> None:
    """Verify all 10 spacecraft telemetry rules and decision actions."""
    planner = MissionPlanner()

    # Rule 1: Battery < 25% -> Power-saving mode
    r1 = planner.plan_mission(MissionInput(
        mission_name="Rule1", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, battery_level=22.0
    ))
    a1 = [a["action_name"] for a in r1.corrective_actions]
    assert_in("Rule 1: Battery < 25% triggers power-saving mode", "enable_power_saving_mode", a1)

    # Rule 2: Solar Panel Efficiency < 50% -> Reduce non-essential loads
    r2 = planner.plan_mission(MissionInput(
        mission_name="Rule2", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, solar_panel_efficiency=45.0
    ))
    a2 = [a["action_name"] for a in r2.corrective_actions]
    assert_in("Rule 2: Solar < 50% reduces non-essential loads", "reduce_non_essential_loads", a2)

    # Rule 3: Temperature > 70 deg C -> Stop high-power tasks
    r3 = planner.plan_mission(MissionInput(
        mission_name="Rule3", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, temperature=72.0
    ))
    a3 = [a["action_name"] for a in r3.corrective_actions]
    assert_in("Rule 3: Temp > 70 deg C stops high-power tasks", "stop_high_power_ops", a3)

    # Rule 4: Fuel Level < 20% -> Cancel optional maneuvers
    r4 = planner.plan_mission(MissionInput(
        mission_name="Rule4", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, fuel_level=18.0
    ))
    a4 = [a["action_name"] for a in r4.corrective_actions]
    assert_in("Rule 4: Fuel < 20% cancels optional maneuvers", "cancel_optional_maneuvers", a4)

    # Rule 5: Communication Signal Strength Poor -> Use backup antenna
    r5 = planner.plan_mission(MissionInput(
        mission_name="Rule5", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, signal_strength=-85.0
    ))
    a5 = [a["action_name"] for a in r5.corrective_actions]
    assert_in("Rule 5: Signal poor uses backup antenna", "use_backup_antenna", a5)

    # Rule 6: Storage Available > 90% -> Compress/transmit data
    r6 = planner.plan_mission(MissionInput(
        mission_name="Rule6", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, storage_usage_pct=92.0
    ))
    a6 = [a["action_name"] for a in r6.corrective_actions]
    assert_in("Rule 6: Storage > 90% compresses storage data", "compress_storage_data", a6)

    # Rule 7: Navigation Accuracy Low -> Recalibrate navigation
    r7 = planner.plan_mission(MissionInput(
        mission_name="Rule7", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, navigation_accuracy=65.0
    ))
    a7 = [a["action_name"] for a in r7.corrective_actions]
    assert_in("Rule 7: Low navigation accuracy recalibrates navigation", "recalibrate_navigation", a7)

    # Rule 8: Payload/Camera Status Failed -> Skip imaging tasks
    r8 = planner.plan_mission(MissionInput(
        mission_name="Rule8", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, payload_status="failed"
    ))
    a8 = [a["action_name"] for a in r8.corrective_actions]
    assert_in("Rule 8: Payload status failed skips imaging tasks", "skip_imaging_tasks", a8)

    # Rule 9: CPU Load > 90% -> Delay processing
    r9 = planner.plan_mission(MissionInput(
        mission_name="Rule9", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, cpu_load=94.0
    ))
    a9 = [a["action_name"] for a in r9.corrective_actions]
    assert_in("Rule 9: CPU load > 90% delays processing", "delay_background_processing", a9)

    # Rule 10: Link Latency High / Packet Loss High -> Increase retry interval
    r10 = planner.plan_mission(MissionInput(
        mission_name="Rule10", objective="test", mission_type="orbital_survey", destination="LEO",
        duration_hours=24, link_latency_ms=650.0
    ))
    a10 = [a["action_name"] for a in r10.corrective_actions]
    assert_in("Rule 10: High latency increases retry interval", "increase_retry_interval", a10)


# ===================================================================
# Main runner
# ===================================================================

def main() -> None:
    global _PASS_COUNT, _FAIL_COUNT, _TOTAL_COUNT

    print("=" * 65)
    print("  Autonomous Space Mission Planner - Test Suite")
    print("  11 Scenarios (Including 10 Spacecraft Telemetry Rules)")
    print("=" * 65)

    scenarios = [
        ("1. Normal Mission",                test_normal_mission),
        ("2. Communication Loss",            test_communication_loss),
        ("3. Low Battery",                   test_low_battery),
        ("4. Critical Battery",              test_critical_battery),
        ("5. Low Fuel",                      test_low_fuel),
        ("6. Thermal Anomaly",               test_thermal_anomaly),
        ("7. Multiple Simultaneous Faults",  test_multiple_faults),
        ("8. High-Risk Mission",             test_high_risk_mission),
        ("9. Recoverable Fault (Replan)",    test_recoverable_fault),
        ("10. Mission Abort Condition",      test_mission_abort),
        ("11. 10 Spacecraft Telemetry Rules", test_telemetry_rules_10),
        ("Bonus: Explanation Service",       test_explanation_service),
    ]

    for name, func in scenarios:
        run_scenario(name, func)

    # Summary
    print(f"\n{'=' * 65}")
    print(f"  TEST SUMMARY")
    print(f"{'=' * 65}")
    print(f"  Total assertions: {_TOTAL_COUNT}")
    print(f"  Passed:           {_PASS_COUNT}")
    print(f"  Failed:           {_FAIL_COUNT}")
    print(f"{'=' * 65}")

    if _FAIL_COUNT == 0:
        print("  [OK] ALL TESTS PASSED")
    else:
        print(f"  [FAIL] {_FAIL_COUNT} TESTS FAILED")

    print(f"{'=' * 65}")

    # Also print one full JSON report for inspection
    print(f"\n{'=' * 65}")
    print(f"  SAMPLE FULL REPORT (Scenario 1: Normal Mission)")
    print(f"{'=' * 65}")
    planner = MissionPlanner()
    sample_mission = MissionInput(
        mission_name="NormalSat-Demo",
        objective="Conduct orbital survey of target region",
        mission_type="orbital_survey",
        destination="LEO",
        duration_hours=48,
        priority=2,
        battery_level=95.0,
        fuel_level=90.0,
        temperature=22.0,
        comm_status="online",
        signal_strength=-60.0,
        mission_phase="operational",
    )
    sample_report = planner.plan_mission(sample_mission)
    print(sample_report.to_json())

    # Print explanation
    print(f"\n{'=' * 65}")
    print(f"  SAMPLE EXPLANATION (Template)")
    print(f"{'=' * 65}")
    explainer = TemplateExplanationService()
    print(explainer.explain(sample_report))

    sys.exit(1 if _FAIL_COUNT > 0 else 0)


if __name__ == "__main__":
    main()

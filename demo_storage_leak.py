from telemetry_ai.mission_planner.models import MissionInput
from telemetry_ai.mission_planner.orchestrator import MissionPlanner
from telemetry_ai.mission_planner.explanation_service import TemplateExplanationService

def main():
    # 1. Provide the mission inputs
    mission_input = MissionInput(
        mission_name="Space Mission Alpha",
        objective="Orbital Survey",
        mission_type="Survey",
        destination="LEO",
        duration_hours=10,
        priority=1,
        # Default nominal telemetry
        battery_level=92,
        solar_panel_efficiency=95,
        fuel_level=88,
        temperature=28,
        signal_strength=96,
        storage_usage_pct=35,
        navigation_accuracy=99,
        payload_status="nominal",
        cpu_load=45,
        link_latency_ms=20
    )

    # 2. Provide the Agent 1 and Agent 2 outputs
    agent1_output = {
        "status": "ANOMALY",
        "anomaly_score": -0.0136,
        "confidence": 50.0,
        "subsystem": "Storage"
    }
    
    agent2_output = {
        "fault_type": "Storage_Leak",
        "confidence": 99.7,
        "severity": "Critical"
    }

    mission_input.agent1_output = agent1_output
    mission_input.agent2_output = agent2_output

    # 3. Run the Mission Planner
    planner = MissionPlanner()
    report = planner.plan_mission(mission_input)

    # 4. Format and print the report
    explainer = TemplateExplanationService()
    print(explainer.explain(report))

if __name__ == "__main__":
    main()

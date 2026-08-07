"""
config.py
=========
Central configuration for the Autonomous Space Mission Planner.

All thresholds, rules, scoring weights, recovery procedures, and mission
templates are defined here. No magic numbers should appear elsewhere in
the codebase.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Constraint Thresholds (10 Spacecraft Telemetry Dimensions)
# ---------------------------------------------------------------------------
# Each constraint has a FAIL threshold and a WARNING threshold.
# Values at or beyond FAIL cause NO_GO.
# Values between WARNING and FAIL cause CAUTION.

CONSTRAINT_THRESHOLDS = {
    "battery": {
        "fail_below": 10.0,       # % - mission cannot proceed
        "warn_below": 25.0,       # % - battery < 25% -> power-saving mode
        "unit": "%",
    },
    "solar_efficiency": {
        "fail_below": 20.0,       # % - insufficient solar array output
        "warn_below": 50.0,       # % - solar panel efficiency < 50% -> reduce non-essential loads
        "unit": "%",
    },
    "temperature": {
        "fail_above": 70.0,       # deg C - temp > 70 deg C -> stop high-power tasks
        "warn_above": 55.0,       # deg C - elevated temperature
        "fail_below": -40.0,      # deg C - too cold for operation
        "warn_below": -20.0,      # deg C
        "nominal_min": 5.0,       # deg C
        "nominal_max": 40.0,      # deg C
        "unit": "deg C",
    },
    "fuel": {
        "fail_below": 10.0,       # % - critical fuel level
        "warn_below": 20.0,       # % - fuel < 20% -> cancel optional maneuvers
        "unit": "%",
    },
    "communication": {
        "fail_status": "offline", # status: "online", "degraded", "offline"
        "warn_status": "degraded",
        "signal_warn_dbm": -80.0, # poor signal strength -> use backup antenna
    },
    "storage": {
        "fail_above": 98.0,       # % - memory full
        "warn_above": 90.0,       # % - storage > 90% -> compress/transmit data
        "unit": "%",
    },
    "navigation_accuracy": {
        "fail_below": 40.0,       # % - lost navigation lock
        "warn_below": 70.0,       # % - low accuracy -> recalibrate navigation
        "unit": "%",
    },
    "payload_status": {
        "fail_status": "failed",   # payload/camera status: "nominal", "degraded", "failed"
        "warn_status": "degraded", # payload status failed -> skip imaging tasks
    },
    "cpu_load": {
        "fail_above": 98.0,       # % - CPU maxed out
        "warn_above": 90.0,       # % - CPU load > 90% -> delay processing
        "unit": "%",
    },
    "link_latency": {
        "warn_latency_ms": 500.0, # latency > 500ms or packet loss > 5% -> increase retry interval
        "warn_packet_loss_pct": 5.0,
        "unit": "ms / %",
    },
    "duration": {
        "max_hours": 720,         # 30 days maximum mission duration
        "warn_hours": 480,        # 20 days warning
        "unit": "hours",
    },
    "payload_mass": {
        "max_mass_kg": 500.0,     # Maximum payload capacity
        "warn_mass_kg": 400.0,    # Warning if heavy
        "unit": "kg",
    },
}

# ---------------------------------------------------------------------------
# Risk Scoring Weights (must sum to 1.0)
# ---------------------------------------------------------------------------
RISK_WEIGHTS = {
    "battery":              0.20,
    "fuel":                 0.20,
    "thermal":              0.15,
    "communication":        0.15,
    "anomalies":            0.10,
    "faults":               0.10,
    "solar_efficiency":     0.03,
    "storage":              0.03,
    "navigation_accuracy":  0.02,
    "payload_status":       0.02,
}

# Sanity check at import time
assert abs(sum(RISK_WEIGHTS.values()) - 1.0) < 1e-6, \
    f"Risk weights must sum to 1.0, got {sum(RISK_WEIGHTS.values())}"

# ---------------------------------------------------------------------------
# Risk Level Thresholds
# ---------------------------------------------------------------------------
RISK_LEVELS = [
    (76, "CRITICAL"),   # score >= 76
    (51, "HIGH"),       # score >= 51
    (26, "MEDIUM"),     # score >= 26
    (0,  "LOW"),        # score >= 0
]

# ---------------------------------------------------------------------------
# Abort Recommendation Threshold
# ---------------------------------------------------------------------------
ABORT_RISK_THRESHOLD = 80          # Risk score >= this -> recommend abort
ABORT_CRITICAL_CONSTRAINTS = 2     # Number of FAIL constraints -> recommend abort

# ---------------------------------------------------------------------------
# Mission Phase Risk Modifiers
# ---------------------------------------------------------------------------
PHASE_RISK_MODIFIERS = {
    "pre_launch":      0.2,
    "launch":          0.8,
    "transit":         0.3,
    "orbit_insertion": 0.7,
    "operational":     0.4,
    "descent":         0.9,
    "surface_ops":     0.5,
    "ascent":          0.8,
    "return_transit":  0.4,
    "reentry":         0.9,
    "post_mission":    0.1,
}

# ---------------------------------------------------------------------------
# Mission Type -> Default Task Templates
# ---------------------------------------------------------------------------
MISSION_TASK_TEMPLATES = {
    "orbital_survey": [
        ("system_check",           1, 30,  "Power",         []),
        ("communication_link",     1, 15,  "Communication", ["system_check"]),
        ("orbit_insertion",        1, 60,  "Propulsion",    ["communication_link"]),
        ("instrument_calibration", 2, 45,  "Payload",      ["orbit_insertion"]),
        ("survey_scan_alpha",      2, 90,  "Payload",       ["instrument_calibration"]),
        ("data_processing",        3, 60,  "Storage",       ["survey_scan_alpha"]),
        ("survey_scan_beta",       3, 90,  "Payload",       ["data_processing"]),
        ("data_downlink",          2, 45,  "Communication", ["survey_scan_beta"]),
        ("orbit_maintenance",      2, 30,  "Propulsion",    ["data_downlink"]),
        ("mission_closeout",       1, 20,  "Power",         ["orbit_maintenance"]),
    ],
    "deep_space": [
        ("system_check",           1, 30,  "Power",         []),
        ("communication_link",     1, 15,  "Communication", ["system_check"]),
        ("trajectory_burn",        1, 45,  "Propulsion",    ["communication_link"]),
        ("deep_space_cruise",      2, 180, "Propulsion",    ["trajectory_burn"]),
        ("mid_course_correction",  2, 30,  "Propulsion",    ["deep_space_cruise"]),
        ("science_observation",    2, 120, "Payload",       ["mid_course_correction"]),
        ("data_compression",       3, 60,  "Storage",       ["science_observation"]),
        ("high_gain_downlink",     2, 90,  "Communication", ["data_compression"]),
        ("system_health_check",    2, 30,  "Power",         ["high_gain_downlink"]),
        ("mission_closeout",       1, 20,  "Power",         ["system_health_check"]),
    ],
    "sample_return": [
        ("system_check",           1, 30,  "Power",         []),
        ("communication_link",     1, 15,  "Communication", ["system_check"]),
        ("descent_preparation",    1, 45,  "Propulsion",    ["communication_link"]),
        ("powered_descent",        1, 60,  "Propulsion",    ["descent_preparation"]),
        ("surface_survey",         2, 90,  "Payload",       ["powered_descent"]),
        ("sample_collection",      1, 120, "Payload",       ["surface_survey"]),
        ("sample_storage",         2, 30,  "Storage",       ["sample_collection"]),
        ("ascent_burn",            1, 45,  "Propulsion",    ["sample_storage"]),
        ("rendezvous_dock",        1, 60,  "Propulsion",    ["ascent_burn"]),
        ("data_downlink",          2, 45,  "Communication", ["rendezvous_dock"]),
        ("mission_closeout",       1, 20,  "Power",         ["data_downlink"]),
    ],
    "communication_relay": [
        ("system_check",           1, 30,  "Power",         []),
        ("communication_link",     1, 15,  "Communication", ["system_check"]),
        ("orbit_insertion",        1, 60,  "Propulsion",    ["communication_link"]),
        ("antenna_deployment",     1, 45,  "Communication", ["orbit_insertion"]),
        ("relay_calibration",      2, 60,  "Communication", ["antenna_deployment"]),
        ("relay_operations",       2, 180, "Communication", ["relay_calibration"]),
        ("system_health_check",    3, 30,  "Power",         ["relay_operations"]),
        ("relay_handover",         2, 60,  "Communication", ["system_health_check"]),
        ("mission_closeout",       1, 20,  "Power",         ["relay_handover"]),
    ],
    "maintenance": [
        ("system_check",           1, 30,  "Power",         []),
        ("communication_link",     1, 15,  "Communication", ["system_check"]),
        ("approach_maneuver",      1, 45,  "Propulsion",    ["communication_link"]),
        ("proximity_ops",          1, 60,  "Propulsion",    ["approach_maneuver"]),
        ("diagnostics_scan",       2, 90,  "Payload",       ["proximity_ops"]),
        ("repair_operation",       1, 120, "Payload",       ["diagnostics_scan"]),
        ("verification_test",      2, 60,  "Payload",       ["repair_operation"]),
        ("departure_maneuver",     1, 30,  "Propulsion",    ["verification_test"]),
        ("data_downlink",          2, 45,  "Communication", ["departure_maneuver"]),
        ("mission_closeout",       1, 20,  "Power",         ["data_downlink"]),
    ],
}

DEFAULT_MISSION_TASKS = [
    ("system_check",           1, 30,  "Power",         []),
    ("communication_link",     1, 15,  "Communication", ["system_check"]),
    ("primary_operation",      2, 120, "Payload",       ["communication_link"]),
    ("data_collection",        3, 60,  "Storage",       ["primary_operation"]),
    ("data_downlink",          2, 45,  "Communication", ["data_collection"]),
    ("mission_closeout",       1, 20,  "Power",         ["data_downlink"]),
]

# ---------------------------------------------------------------------------
# Resource Estimation
# ---------------------------------------------------------------------------
BATTERY_CONSUMPTION_RATE = {
    "Power":         0.05,
    "Communication": 0.12,
    "Propulsion":    0.15,
    "Payload":       0.10,
    "Storage":       0.03,
    "Thermal":       0.08,
}

FUEL_CONSUMPTION_RATE = {
    "Power":         0.00,
    "Communication": 0.00,
    "Propulsion":    0.20,
    "Payload":       0.00,
    "Storage":       0.00,
    "Thermal":       0.00,
}

MIN_BATTERY_RESERVE = 10.0
MIN_FUEL_RESERVE = 10.0

# ---------------------------------------------------------------------------
# Recovery Rules - 10 Telemetry Rules & Diagnosed Fault Recovery
# ---------------------------------------------------------------------------
# Format: (name, priority, duration_min, subsystem, description)

RECOVERY_RULES = {
    # 1. Battery < 25% -> Power-saving mode
    "Battery_Drain": [
        ("enable_power_saving_mode", 1, 5, "Power",
         "Battery < 25%: Enable power-saving mode and conserve energy"),
        ("reduce_non_essential_loads", 1, 5, "Power",
         "Disable non-essential systems and instruments"),
        ("prioritize_critical_ops", 2, 5, "Power",
         "Prioritize critical tasks only"),
    ],
    # 2. Solar Panel Efficiency < 50% -> Reduce non-essential loads
    "Low_Solar_Efficiency": [
        ("optimize_solar_array_pointing", 1, 10, "Power",
         "Solar efficiency < 50%: Re-orient solar arrays toward Sun"),
        ("reduce_non_essential_loads", 1, 5, "Power",
         "Reduce non-essential loads to match reduced solar power generation"),
    ],
    # 3. Temperature > 70 deg C -> Stop high-power tasks
    "Thermal_Spike": [
        ("stop_high_power_ops", 1, 5, "Power",
         "Temp > 70 deg C: Stop high-power tasks immediately to prevent thermal damage"),
        ("activate_thermal_ctrl", 1, 15, "Thermal",
         "Activate thermal control and radiators"),
        ("wait_thermal_stabilization", 2, 30, "Thermal",
         "Wait for system temperature stabilization"),
    ],
    # 4. Fuel Level < 20% -> Cancel optional maneuvers
    "Low_Fuel": [
        ("cancel_optional_maneuvers", 1, 5, "Propulsion",
         "Fuel < 20%: Cancel optional maneuvers and conserve propellant"),
        ("optimize_trajectory", 1, 15, "Propulsion",
         "Optimize trajectory for minimum fuel consumption"),
        ("evaluate_mission_abort", 1, 10, "Power",
         "Evaluate mission abort options"),
    ],
    # 5. Communication Signal Strength Poor -> Use backup antenna
    "Communication_Loss": [
        ("use_backup_antenna", 1, 10, "Communication",
         "Signal strength poor: Switch to backup high-gain antenna"),
        ("retry_comm_link", 1, 15, "Communication",
         "Retry link on backup frequency"),
        ("store_data_locally", 2, 5, "Storage",
         "Store telemetry and scientific data locally"),
    ],
    # 6. Storage Available > 90% full -> Compress/transmit data
    "Storage_Leak": [
        ("compress_storage_data", 1, 15, "Storage",
         "Storage > 90% full: Compress onboard scientific and telemetry data"),
        ("transmit_stored_data", 2, 30, "Communication",
         "Transmit compressed data buffer to ground station"),
        ("clear_temp_storage", 3, 10, "Storage",
         "Clear temporary buffers after downlink"),
    ],
    # 7. Navigation Accuracy Low -> Recalibrate navigation
    "Navigation_Error": [
        ("recalibrate_navigation", 1, 20, "Propulsion",
         "Navigation accuracy low: Recalibrate star trackers and IMU sensors"),
        ("verify_attitude_lock", 2, 10, "Propulsion",
         "Verify attitude lock and celestial positioning"),
    ],
    # 8. Payload/Camera Status Failed -> Skip imaging tasks
    "Payload_Failure": [
        ("isolate_payload_subsystem", 1, 5, "Payload",
         "Payload/Camera status failed: Isolate payload hardware bus"),
        ("skip_imaging_tasks", 1, 5, "Payload",
         "Skip all scientific imaging tasks"),
    ],
    # 9. CPU/System Load > 90% -> Delay processing
    "CPU_Overload": [
        ("delay_background_processing", 1, 10, "Storage",
         "CPU load > 90%: Delay non-critical background data processing"),
        ("throttle_cpu_tasks", 2, 10, "Power",
         "Throttle CPU clock and pause secondary telemetry analysis"),
    ],
    # 10. Link Latency / Packet Loss High -> Increase retry interval
    "High_Latency": [
        ("increase_retry_interval", 1, 5, "Communication",
         "High latency / packet loss: Increase command retry interval"),
        ("adjust_transmission_window", 2, 15, "Communication",
         "Adjust transmission window size for high latency link"),
    ],
    # General Power Surge
    "Power_Surge": [
        ("isolate_surge_source", 1, 10, "Power",
         "Isolate surge source from main power bus"),
        ("switch_backup_power", 1, 10, "Power",
         "Switch to backup power bus"),
        ("reduce_power_load", 2, 5, "Power",
         "Reduce overall system load"),
    ],
}

# Tasks to downgrade or remove during specific fault recoveries
TASKS_TO_REMOVE_ON_FAULT = {
    "Communication_Loss":    ["data_downlink", "high_gain_downlink", "relay_operations"],
    "Battery_Drain":         ["survey_scan_beta", "relay_operations", "science_observation"],
    "Low_Solar_Efficiency":  ["survey_scan_beta", "relay_operations"],
    "Thermal_Spike":         ["survey_scan_alpha", "survey_scan_beta", "repair_operation"],
    "Power_Surge":           ["survey_scan_beta", "relay_operations"],
    "Storage_Leak":          ["data_collection"],
    "Low_Fuel":              ["orbit_maintenance", "mid_course_correction", "departure_maneuver"],
    "Navigation_Error":      ["orbit_maintenance", "mid_course_correction"],
    "Payload_Failure":       ["survey_scan_alpha", "survey_scan_beta", "surface_survey", "sample_collection", "diagnostics_scan"],
    "CPU_Overload":          ["data_processing", "data_compression"],
    "High_Latency":          ["relay_handover"],
}

# Communication Signal Thresholds
COMM_SIGNAL_THRESHOLDS = {
    "online":   -70.0,    # signal_strength >= -70 dBm
    "degraded": -80.0,    # signal_strength >= -80 dBm -> poor
    "offline":  -100.0,   # signal_strength < -80 dBm
}

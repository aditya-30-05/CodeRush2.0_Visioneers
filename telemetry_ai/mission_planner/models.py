"""
models.py
=========
Shared data structures for the Autonomous Space Mission Planner.

Uses Python dataclasses and enums for type-safe, serializable data.
All modules import from here to ensure consistent interfaces.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TaskStatus(Enum):
    """Status of an individual mission task."""
    PENDING     = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED   = "COMPLETED"
    SKIPPED     = "SKIPPED"
    FAILED      = "FAILED"


class FeasibilityStatus(Enum):
    """Overall mission feasibility determination."""
    GO      = "GO"        # All constraints pass
    CAUTION = "CAUTION"   # Some warnings present
    NO_GO   = "NO_GO"     # One or more critical failures


class RiskLevel(Enum):
    """Classified risk level."""
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class ConstraintStatus(Enum):
    """Status of a single constraint check."""
    PASS    = "PASS"
    WARNING = "WARNING"
    FAIL    = "FAIL"


class MissionStatus(Enum):
    """Overall mission status."""
    PLANNED     = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED   = "COMPLETED"
    ABORTED     = "ABORTED"
    REPLANNED   = "REPLANNED"


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class MissionInput:
    """Input specification for a mission planning request."""
    mission_name: str
    objective: str
    mission_type: str                # e.g. "orbital_survey", "deep_space"
    destination: str                 # e.g. "Mars orbit", "LEO"
    duration_hours: float            # Planned mission duration in hours
    priority: int = 2                # 1=highest, 5=lowest
    payload_mass_kg: float = 0.0     # Payload mass in kg
    battery_level: float = 100.0     # Current battery % (< 25% -> power-saving mode)
    solar_panel_efficiency: float = 100.0 # Solar charging capability % (< 50% -> reduce non-essential loads)
    temperature: float = 22.0        # Thermal safety in deg C (> 70 deg C -> stop high-power tasks)
    fuel_level: float = 100.0        # Maneuver capability % (< 20% -> cancel optional maneuvers)
    comm_status: str = "online"      # "online", "degraded", "offline"
    signal_strength: float = -60.0   # Signal strength in dBm (poor -> use backup antenna)
    storage_usage_pct: float = 20.0  # Scientific data capacity % (> 90% full -> compress/transmit data)
    navigation_accuracy: float = 100.0 # Mission precision % (< 70% / low -> recalibrate navigation)
    payload_status: str = "nominal"  # "nominal", "degraded", "failed" (failed -> skip imaging tasks)
    cpu_load: float = 20.0           # Onboard computing load % (> 90% -> delay processing)
    link_latency_ms: float = 50.0    # Communication quality latency in ms
    packet_loss_pct: float = 0.0     # Packet loss % (high -> increase retry interval)
    mission_phase: str = "pre_launch"
    agent1_output: dict[str, Any] | None = None  # Anomaly detection output
    agent2_output: dict[str, Any] | None = None  # Fault diagnosis output

    def validate(self) -> list[str]:
        """Validate inputs and return a list of error messages (empty = valid)."""
        errors: list[str] = []
        if not self.mission_name or not self.mission_name.strip():
            errors.append("mission_name is required")
        if not self.objective or not self.objective.strip():
            errors.append("objective is required")
        if not self.mission_type or not self.mission_type.strip():
            errors.append("mission_type is required")
        if not self.destination or not self.destination.strip():
            errors.append("destination is required")
        if self.duration_hours <= 0:
            errors.append("duration_hours must be positive")
        if not 1 <= self.priority <= 5:
            errors.append("priority must be between 1 and 5")
        if not 0 <= self.battery_level <= 100:
            errors.append("battery_level must be between 0 and 100")
        if not 0 <= self.solar_panel_efficiency <= 100:
            errors.append("solar_panel_efficiency must be between 0 and 100")
        if not 0 <= self.fuel_level <= 100:
            errors.append("fuel_level must be between 0 and 100")
        if not 0 <= self.storage_usage_pct <= 100:
            errors.append("storage_usage_pct must be between 0 and 100")
        if not 0 <= self.navigation_accuracy <= 100:
            errors.append("navigation_accuracy must be between 0 and 100")
        if not 0 <= self.cpu_load <= 100:
            errors.append("cpu_load must be between 0 and 100")
        if self.payload_mass_kg < 0:
            errors.append("payload_mass_kg must be non-negative")
        if self.comm_status not in ("online", "degraded", "offline"):
            errors.append("comm_status must be 'online', 'degraded', or 'offline'")
        if self.payload_status not in ("nominal", "degraded", "failed"):
            errors.append("payload_status must be 'nominal', 'degraded', or 'failed'")
        return errors

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dictionary."""
        return asdict(self)


@dataclass
class MissionTask:
    """A single executable mission task."""
    task_id: str                     # Unique identifier
    name: str                        # Human-readable name
    priority: int                    # 1=highest, 5=lowest
    duration_minutes: int            # Estimated duration
    subsystem: str                   # Primary subsystem involved
    dependencies: list[str] = field(default_factory=list)  # task_ids
    status: TaskStatus = TaskStatus.PENDING
    start_time_offset_min: int = 0   # Minutes from mission start
    battery_required: float = 0.0    # Battery % consumed
    fuel_required: float = 0.0       # Fuel % consumed
    description: str = ""            # Optional description
    is_corrective: bool = False      # True if injected by fault response

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dictionary."""
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class ConstraintResult:
    """Result of checking a single constraint."""
    name: str                        # Constraint name
    value: Any                       # Actual value checked
    threshold: Any                   # Threshold applied
    status: ConstraintStatus         # PASS / WARNING / FAIL
    message: str = ""                # Human-readable explanation

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class ResourceEstimate:
    """Resource estimate for a single task."""
    task_id: str
    task_name: str
    battery_required: float          # % consumed by this task
    fuel_required: float             # % consumed by this task
    battery_after: float             # Battery % remaining after this task
    fuel_after: float                # Fuel % remaining after this task
    shortage: bool = False           # True if resources insufficient
    shortage_details: str = ""       # What's short

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ResourceStatus:
    """Overall resource status across the entire mission."""
    battery_available: float
    battery_required: float
    battery_remaining: float
    fuel_available: float
    fuel_required: float
    fuel_remaining: float
    has_shortage: bool
    task_estimates: list[ResourceEstimate] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["task_estimates"] = [e.to_dict() if isinstance(e, ResourceEstimate)
                               else e for e in self.task_estimates]
        return d


@dataclass
class TimelineEntry:
    """A single entry in the mission timeline."""
    time_offset_min: int             # Minutes from mission start
    task_name: str
    task_id: str
    duration_minutes: int
    subsystem: str
    status: str                      # TaskStatus value
    priority: int
    battery_usage: float             # Battery % consumed
    fuel_usage: float                # Fuel % consumed
    is_corrective: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CorrectiveAction:
    """A corrective action taken in response to a fault."""
    fault_type: str
    action_name: str
    description: str
    priority: int
    subsystem: str
    duration_minutes: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class MissionReport:
    """Complete mission report — the final output of the planner."""
    mission_name: str
    objective: str
    mission_status: str              # MissionStatus value
    feasibility: str                 # FeasibilityStatus value
    current_phase: str
    mission_timeline: list[dict[str, Any]] = field(default_factory=list)
    resource_status: dict[str, Any] = field(default_factory=dict)
    constraint_results: list[dict[str, Any]] = field(default_factory=list)
    detected_anomalies: list[dict[str, Any]] = field(default_factory=list)
    diagnosed_faults: list[dict[str, Any]] = field(default_factory=list)
    corrective_actions: list[dict[str, Any]] = field(default_factory=list)
    risk_score: float = 0.0
    risk_level: str = "LOW"
    abort_recommendation: bool = False
    abort_reason: str = ""
    tasks: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, default=str)

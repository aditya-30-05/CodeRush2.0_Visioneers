"""
report_generator.py
===================
Module 8: Mission Report Generator

Generates the final structured JSON mission report by aggregating
outputs from all other modules.  Includes abort recommendation logic
based on risk score and constraint failures.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import MissionReport, MissionStatus, FeasibilityStatus

logger = logging.getLogger("ReportGenerator")


class ReportGenerator:
    """Assemble the final structured mission report."""

    def generate(
        self,
        mission_name: str,
        objective: str,
        mission_phase: str,
        feasibility: str,
        constraint_results: list[dict[str, Any]],
        timeline: list[dict[str, Any]],
        resource_status: dict[str, Any],
        risk_score: float,
        risk_level: str,
        anomaly_data: dict[str, Any] | None = None,
        fault_data: dict[str, Any] | None = None,
        corrective_actions: list[dict[str, Any]] | None = None,
        tasks: list[dict[str, Any]] | None = None,
        plan_modified: bool = False,
    ) -> MissionReport:
        """Generate the complete mission report.

        Parameters
        ----------
        mission_name : str
            Name of the mission.
        objective : str
            Mission objective description.
        mission_phase : str
            Current mission phase.
        feasibility : str
            Overall feasibility status (GO/CAUTION/NO_GO).
        constraint_results : list[dict]
            Per-constraint check results.
        timeline : list[dict]
            Chronological mission timeline.
        resource_status : dict
            Resource planning results.
        risk_score : float
            Numerical risk score (0-100).
        risk_level : str
            Classified risk level.
        anomaly_data : dict | None
            Agent 1 output, if any.
        fault_data : dict | None
            Agent 2 output, if any.
        corrective_actions : list[dict] | None
            Corrective actions taken by fault response planner.
        tasks : list[dict] | None
            All mission tasks with current statuses.
        plan_modified : bool
            Whether the plan was modified by fault response.

        Returns
        -------
        MissionReport
            Complete mission report.
        """
        anomaly_data = anomaly_data or {}
        fault_data = fault_data or {}
        corrective_actions = corrective_actions or []
        tasks = tasks or []

        # Determine mission status
        mission_status = self._determine_mission_status(
            feasibility, plan_modified, risk_level
        )

        # Determine abort recommendation
        abort_recommended, abort_reason = self._evaluate_abort(
            risk_score, risk_level, feasibility, constraint_results
        )

        # Build anomalies and faults lists
        detected_anomalies = [anomaly_data] if anomaly_data else []
        diagnosed_faults = [fault_data] if fault_data else []

        report = MissionReport(
            mission_name=mission_name,
            objective=objective,
            mission_status=mission_status,
            feasibility=feasibility,
            current_phase=mission_phase,
            mission_timeline=timeline,
            resource_status=resource_status,
            constraint_results=constraint_results,
            detected_anomalies=detected_anomalies,
            diagnosed_faults=diagnosed_faults,
            corrective_actions=corrective_actions,
            risk_score=risk_score,
            risk_level=risk_level,
            abort_recommendation=abort_recommended,
            abort_reason=abort_reason,
            tasks=tasks,
        )

        logger.info(
            "Report generated: status=%s, risk=%.1f (%s), abort=%s",
            mission_status, risk_score, risk_level, abort_recommended,
        )

        return report

    @staticmethod
    def _determine_mission_status(
        feasibility: str,
        plan_modified: bool,
        risk_level: str,
    ) -> str:
        """Determine the overall mission status."""
        if risk_level == "CRITICAL":
            return MissionStatus.ABORTED.value
        if plan_modified:
            return MissionStatus.REPLANNED.value
        if feasibility == FeasibilityStatus.NO_GO.value:
            return MissionStatus.PLANNED.value

        return MissionStatus.PLANNED.value

    @staticmethod
    def _evaluate_abort(
        risk_score: float,
        risk_level: str,
        feasibility: str,
        constraint_results: list[dict[str, Any]],
    ) -> tuple[bool, str]:
        """Determine whether to recommend mission abort.

        Abort is recommended if:
        1. Risk score exceeds the abort threshold, OR
        2. Number of FAIL constraints exceeds the threshold.

        Returns
        -------
        tuple[bool, str]
            (abort recommended, reason string)
        """
        reasons: list[str] = []

        # Check risk score threshold
        if risk_score >= config.ABORT_RISK_THRESHOLD:
            reasons.append(
                f"Risk score {risk_score:.1f} exceeds abort threshold "
                f"{config.ABORT_RISK_THRESHOLD}"
            )

        # Check constraint failures
        fail_count = sum(
            1 for c in constraint_results
            if c.get("status") == "FAIL"
        )
        if fail_count >= config.ABORT_CRITICAL_CONSTRAINTS:
            reasons.append(
                f"{fail_count} critical constraint failures "
                f"(threshold: {config.ABORT_CRITICAL_CONSTRAINTS})"
            )

        if reasons:
            return True, "; ".join(reasons)

        return False, ""

    def generate_to_dict(self, **kwargs: Any) -> dict[str, Any]:
        """Generate report and return as a plain dictionary."""
        report = self.generate(**kwargs)
        return report.to_dict()

    def generate_to_json(self, **kwargs: Any) -> str:
        """Generate report and return as a JSON string."""
        report = self.generate(**kwargs)
        return report.to_json()

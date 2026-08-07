"""
explanation_service.py
======================
Optional Explanation Service interface.

Provides a place where Gemini (or another LLM) can later receive the
final Mission Planner JSON and convert it into a human-readable
explanation — WITHOUT changing any planner decisions.

The default implementation uses simple template-based formatting
(no LLM required).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from .models import MissionReport

logger = logging.getLogger("ExplanationService")


class ExplanationServiceBase(ABC):
    """Abstract interface for mission report explanation.

    Subclass this to integrate Gemini or any other LLM.
    The LLM must NOT modify any planner decisions — it only
    generates human-readable text from the structured report.
    """

    @abstractmethod
    def explain(self, report: MissionReport) -> str:
        """Convert a mission report into a human-readable explanation.

        Parameters
        ----------
        report : MissionReport
            The complete structured mission report.

        Returns
        -------
        str
            Human-readable explanation text.
        """
        ...


class TemplateExplanationService(ExplanationServiceBase):
    """Default explanation service using template-based formatting.

    No LLM required.  Produces a structured text summary of the
    mission report.
    """

    def explain(self, report: MissionReport) -> str:
        """Generate a custom text layout explanation of the mission report."""
        lines: list[str] = []

        lines.append("===============================")
        lines.append("AUTONOMOUS MISSION PLAN")
        lines.append("===============================\n")

        lines.append(f"Mission: {report.mission_name}")
        lines.append(f"Objective: {report.objective}\n")

        lines.append(f"Mission Status: {report.mission_status}")
        lines.append(f"Overall Risk: {report.risk_level}\n")

        # Faults Detected
        if report.diagnosed_faults:
            lines.append("Fault Detected:")
            for fault in report.diagnosed_faults:
                fault_name = fault.get("fault_type", "Normal").replace("_", " ")
                severity = fault.get("severity", "Low")
                lines.append(f"* {fault_name} ({severity})")
            lines.append("")
        elif report.detected_anomalies:
            lines.append("Fault Detected:")
            for anomaly in report.detected_anomalies:
                subsystem = anomaly.get("subsystem", "System")
                lines.append(f"* {subsystem} Anomaly")
            lines.append("")
        else:
            lines.append("Fault Detected:\n* None\n")

        # Immediate Actions
        if report.corrective_actions:
            lines.append("Immediate Actions:")
            for action in report.corrective_actions:
                action_desc = action.get("action_name", "").replace("_", " ").title()
                lines.append(f"[OK] {action_desc}")
            lines.append("")
        else:
            lines.append("Immediate Actions:\n[OK] System Operations Nominal\n")

        # Execution Timeline
        lines.append("Execution Timeline:")
        for entry in report.mission_timeline:
            mins = entry.get("time_offset_min", 0)
            hours = mins // 60
            rem_mins = mins % 60
            time_str = f"T+{hours:02d}:{rem_mins:02d}"
            task_title = entry.get("task_name", "").replace("_", " ").title()
            lines.append(f"{time_str}  {task_title}")
        lines.append("")

        # Resources
        res = report.resource_status
        lines.append("Resources After Replanning:")
        batt = res.get("battery_remaining", 0.0) if res else 0.0
        fuel = res.get("fuel_remaining", 0.0) if res else 0.0
        lines.append(f"Battery: {batt:.1f}% Remaining")
        lines.append(f"Fuel: {fuel:.1f}% Remaining\n")

        # Final Decision
        lines.append("Final Decision:")
        if report.abort_recommendation or report.feasibility == "NO_GO":
            lines.append("[ABORT] ABORT MISSION - CRITICAL RISK / CONSTRAINT FAILURE")
        elif report.mission_status == "REPLANNED":
            lines.append("[OK] CONTINUE MISSION WITH MODIFIED PLAN")
        else:
            lines.append("[OK] CONTINUE MISSION AS PLANNED")

        return "\n".join(lines)


class GeminiExplanationService(ExplanationServiceBase):
    """Placeholder for Gemini-powered explanation service.

    When implemented, this class will:
    1. Receive the structured MissionReport JSON.
    2. Send it to Gemini with an appropriate system prompt.
    3. Return a natural-language explanation.
    4. NOT modify any planner decisions.

    To implement:
    - Add ``google-genai`` to requirements.
    - Initialize a Gemini client in __init__.
    - Call the model in explain() with the report JSON.
    """

    def __init__(self, api_key: str | None = None, model: str = "gemini-flash-latest"):
        self._api_key = api_key
        self._model = model
        # TODO: Initialize Gemini client here
        # from google import genai
        # self._client = genai.Client(api_key=api_key)

    def explain(self, report: MissionReport) -> str:
        """Placeholder — returns a note to implement Gemini integration.

        In production, this would call Gemini with the report JSON
        and return a natural-language explanation.
        """
        # For now, fall back to template-based explanation
        fallback = TemplateExplanationService()
        explanation = fallback.explain(report)
        return (
            "[NOTE: Gemini integration not yet configured. "
            "Using template-based explanation.]\n\n"
            + explanation
        )

"""
objective_analyzer.py
=====================
Module 1: Objective Analyzer

Accepts a mission specification and decomposes it into an ordered list
of executable mission tasks.  Uses mission type templates from config.py
to generate task breakdowns deterministically.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import MissionInput, MissionTask

logger = logging.getLogger("ObjectiveAnalyzer")


class ObjectiveAnalyzer:
    """Break mission objectives into prioritized, structured tasks.

    Uses predefined templates from ``config.MISSION_TASK_TEMPLATES`` keyed
    by mission type.  Falls back to ``config.DEFAULT_MISSION_TASKS`` for
    unknown types.
    """

    def analyze(self, mission_input: MissionInput) -> list[MissionTask]:
        """Decompose a mission objective into executable tasks.

        Parameters
        ----------
        mission_input : MissionInput
            The complete mission specification.

        Returns
        -------
        list[MissionTask]
            Ordered list of tasks with priorities, durations, and
            dependencies.

        Raises
        ------
        ValueError
            If the mission input fails validation.
        """
        # Validate inputs
        errors = mission_input.validate()
        if errors:
            raise ValueError(
                f"Invalid mission input: {'; '.join(errors)}"
            )

        # Look up task template
        mission_type = mission_input.mission_type.lower().strip()
        template = config.MISSION_TASK_TEMPLATES.get(
            mission_type, config.DEFAULT_MISSION_TASKS
        )

        if mission_type not in config.MISSION_TASK_TEMPLATES:
            logger.warning(
                "Unknown mission type '%s' — using default task template",
                mission_input.mission_type,
            )

        # Build task list
        tasks: list[MissionTask] = []
        for i, (name, priority, duration, subsystem, deps) in enumerate(template):
            task_id = f"T{i + 1:03d}_{name}"

            # Map dependency names to task_ids
            dep_ids = []
            for dep_name in deps:
                for j, (tname, *_) in enumerate(template):
                    if tname == dep_name:
                        dep_ids.append(f"T{j + 1:03d}_{tname}")
                        break

            # Adjust priority based on mission priority
            # Higher mission priority (lower number) slightly raises task priorities
            adjusted_priority = max(1, min(5, priority + (mission_input.priority - 2)))

            task = MissionTask(
                task_id=task_id,
                name=name,
                priority=adjusted_priority,
                duration_minutes=duration,
                subsystem=subsystem,
                dependencies=dep_ids,
                description=f"{name.replace('_', ' ').title()} "
                            f"for {mission_input.destination}",
            )
            tasks.append(task)

        logger.info(
            "Analyzed objective: %d tasks generated for '%s' mission",
            len(tasks), mission_type,
        )
        return tasks

    def analyze_to_dict(self, mission_input: MissionInput) -> dict[str, Any]:
        """Analyze and return results as a serializable dictionary.

        Parameters
        ----------
        mission_input : MissionInput
            The complete mission specification.

        Returns
        -------
        dict
            Structured JSON-compatible output with mission metadata
            and task breakdown.
        """
        tasks = self.analyze(mission_input)
        return {
            "mission_name": mission_input.mission_name,
            "mission_type": mission_input.mission_type,
            "destination": mission_input.destination,
            "objective": mission_input.objective,
            "duration_hours": mission_input.duration_hours,
            "priority": mission_input.priority,
            "task_count": len(tasks),
            "tasks": [t.to_dict() for t in tasks],
        }

"""
timeline_generator.py
=====================
Module 7: Timeline Generator

Generates the complete chronological mission timeline from scheduled
tasks and resource plans.  Automatically regenerates when the Fault
Response Planner modifies the task list.
"""

from __future__ import annotations

import logging
from typing import Any

from .models import MissionTask, TimelineEntry, ResourceEstimate

logger = logging.getLogger("TimelineGenerator")


class TimelineGenerator:
    """Generate chronological mission timelines from scheduled tasks."""

    def generate(
        self,
        scheduled_tasks: list[MissionTask],
        resource_estimates: list[ResourceEstimate] | None = None,
    ) -> list[TimelineEntry]:
        """Create the mission timeline.

        Parameters
        ----------
        scheduled_tasks : list[MissionTask]
            Tasks in execution order with start times populated.
        resource_estimates : list[ResourceEstimate] | None
            Per-task resource consumption data.

        Returns
        -------
        list[TimelineEntry]
            Chronological timeline entries.
        """
        # Build resource lookup
        resource_map: dict[str, ResourceEstimate] = {}
        if resource_estimates:
            for est in resource_estimates:
                resource_map[est.task_id] = est

        timeline: list[TimelineEntry] = []

        for task in scheduled_tasks:
            resource = resource_map.get(task.task_id)

            entry = TimelineEntry(
                time_offset_min=task.start_time_offset_min,
                task_name=task.name,
                task_id=task.task_id,
                duration_minutes=task.duration_minutes,
                subsystem=task.subsystem,
                status=task.status.value,
                priority=task.priority,
                battery_usage=resource.battery_required if resource else task.battery_required,
                fuel_usage=resource.fuel_required if resource else task.fuel_required,
                is_corrective=task.is_corrective,
            )
            timeline.append(entry)

        # Sort by time offset (should already be sorted, but ensure it)
        timeline.sort(key=lambda e: e.time_offset_min)

        logger.info(
            "Timeline generated: %d entries, total span: %d minutes",
            len(timeline),
            (timeline[-1].time_offset_min + timeline[-1].duration_minutes
             if timeline else 0),
        )

        return timeline

    def generate_to_dict(
        self,
        scheduled_tasks: list[MissionTask],
        resource_estimates: list[ResourceEstimate] | None = None,
    ) -> list[dict[str, Any]]:
        """Generate timeline and return as serializable dictionaries."""
        entries = self.generate(scheduled_tasks, resource_estimates)
        return [e.to_dict() for e in entries]

    def format_timeline(
        self,
        timeline: list[TimelineEntry],
    ) -> str:
        """Format the timeline as a human-readable table string.

        Parameters
        ----------
        timeline : list[TimelineEntry]
            The timeline entries to format.

        Returns
        -------
        str
            Formatted table string.
        """
        if not timeline:
            return "No timeline entries."

        header = (
            f"{'Time':>8}  {'Task':<30}  {'Duration':>8}  "
            f"{'Subsystem':<15}  {'Status':<12}  {'Pri':>3}  "
            f"{'Batt%':>6}  {'Fuel%':>6}  {'Type':<10}"
        )
        separator = "-" * len(header)
        lines = [header, separator]

        for entry in timeline:
            task_type = "RECOVERY" if entry.is_corrective else "MISSION"
            line = (
                f"{entry.time_offset_min:>5}min  {entry.task_name:<30}  "
                f"{entry.duration_minutes:>5}min  {entry.subsystem:<15}  "
                f"{entry.status:<12}  {entry.priority:>3}  "
                f"{entry.battery_usage:>5.1f}%  {entry.fuel_usage:>5.1f}%  "
                f"{task_type:<10}"
            )
            lines.append(line)

        return "\n".join(lines)

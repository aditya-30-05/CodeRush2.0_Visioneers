"""
task_scheduler.py
=================
Module 4: Task Scheduler

Converts mission tasks into an ordered execution schedule respecting
dependencies, priorities, and durations.  Uses topological sort for
dependency resolution and priority-based ordering for parallel tasks.
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Any

from .models import MissionTask, TaskStatus

logger = logging.getLogger("TaskScheduler")


class TaskScheduler:
    """Schedule mission tasks respecting dependencies and priorities."""

    def schedule(
        self,
        tasks: list[MissionTask],
        start_offset_min: int = 0,
    ) -> list[MissionTask]:
        """Create an ordered execution schedule for all tasks.

        Uses Kahn's algorithm (topological sort) with priority-based
        tie-breaking.  Higher-priority tasks (lower number) are
        scheduled earlier when there are no dependency conflicts.

        Parameters
        ----------
        tasks : list[MissionTask]
            Unordered list of tasks with dependencies.
        start_offset_min : int
            Starting time offset in minutes from mission start.

        Returns
        -------
        list[MissionTask]
            Tasks in execution order with ``start_time_offset_min``
            populated.

        Raises
        ------
        ValueError
            If dependencies are cyclic or reference non-existent tasks.
        """
        if not tasks:
            return []

        # Build lookup and validate dependencies
        task_map: dict[str, MissionTask] = {t.task_id: t for t in tasks}
        self._validate_dependencies(tasks, task_map)

        # Topological sort with priority tie-breaking (Kahn's algorithm)
        in_degree: dict[str, int] = defaultdict(int)
        dependents: dict[str, list[str]] = defaultdict(list)

        for task in tasks:
            if task.task_id not in in_degree:
                in_degree[task.task_id] = 0
            for dep_id in task.dependencies:
                in_degree[task.task_id] += 1
                dependents[dep_id].append(task.task_id)

        # Start with tasks that have no dependencies
        # Use a list sorted by priority (ascending = higher priority first)
        ready: list[str] = sorted(
            [tid for tid, deg in in_degree.items() if deg == 0],
            key=lambda tid: task_map[tid].priority,
        )

        scheduled: list[MissionTask] = []
        current_time = start_offset_min

        while ready:
            # Pick the highest-priority ready task
            task_id = ready.pop(0)
            task = task_map[task_id]

            # Ensure start time is after all dependencies finish
            dep_end_times = [
                task_map[dep_id].start_time_offset_min
                + task_map[dep_id].duration_minutes
                for dep_id in task.dependencies
                if dep_id in task_map
            ]
            earliest_start = max(dep_end_times) if dep_end_times else current_time

            task.start_time_offset_min = max(current_time, earliest_start)
            current_time = task.start_time_offset_min + task.duration_minutes

            scheduled.append(task)

            # Update in-degrees for dependents
            for dependent_id in dependents.get(task_id, []):
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0:
                    # Insert in priority order
                    self._insert_sorted(ready, dependent_id, task_map)

        # Check for cycles
        if len(scheduled) != len(tasks):
            unscheduled = set(task_map.keys()) - {t.task_id for t in scheduled}
            raise ValueError(
                f"Cyclic dependencies detected among tasks: {unscheduled}"
            )

        logger.info(
            "Scheduled %d tasks, total duration: %d minutes",
            len(scheduled),
            current_time - start_offset_min,
        )

        return scheduled

    @staticmethod
    def _validate_dependencies(
        tasks: list[MissionTask],
        task_map: dict[str, MissionTask],
    ) -> None:
        """Ensure all dependencies reference existing tasks."""
        for task in tasks:
            for dep_id in task.dependencies:
                if dep_id not in task_map:
                    raise ValueError(
                        f"Task '{task.task_id}' depends on "
                        f"non-existent task '{dep_id}'"
                    )

    @staticmethod
    def _insert_sorted(
        ready: list[str],
        task_id: str,
        task_map: dict[str, MissionTask],
    ) -> None:
        """Insert task_id into the ready list, maintaining priority order."""
        priority = task_map[task_id].priority
        for i, existing_id in enumerate(ready):
            if task_map[existing_id].priority > priority:
                ready.insert(i, task_id)
                return
        ready.append(task_id)

    def schedule_to_dict(
        self,
        tasks: list[MissionTask],
        start_offset_min: int = 0,
    ) -> list[dict[str, Any]]:
        """Schedule tasks and return as serializable dictionaries."""
        scheduled = self.schedule(tasks, start_offset_min)
        return [t.to_dict() for t in scheduled]

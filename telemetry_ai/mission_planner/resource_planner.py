"""
resource_planner.py
===================
Module 3: Resource Planner

Estimates battery and fuel consumption for each task, tracks cumulative
usage against available resources, and flags shortages.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import MissionTask, ResourceEstimate, ResourceStatus

logger = logging.getLogger("ResourcePlanner")


class ResourcePlanner:
    """Estimate and track resource consumption across all mission tasks."""

    def plan(
        self,
        tasks: list[MissionTask],
        battery_available: float,
        fuel_available: float,
    ) -> ResourceStatus:
        """Calculate resource requirements for the full mission.

        Parameters
        ----------
        tasks : list[MissionTask]
            Ordered list of mission tasks.
        battery_available : float
            Current battery level (%).
        fuel_available : float
            Current fuel level (%).

        Returns
        -------
        ResourceStatus
            Complete resource breakdown with per-task estimates.
        """
        estimates: list[ResourceEstimate] = []
        battery_remaining = battery_available
        fuel_remaining = fuel_available
        total_battery_required = 0.0
        total_fuel_required = 0.0
        has_shortage = False

        for task in tasks:
            # Calculate consumption based on subsystem rates and duration
            battery_rate = config.BATTERY_CONSUMPTION_RATE.get(
                task.subsystem, 0.05
            )
            fuel_rate = config.FUEL_CONSUMPTION_RATE.get(
                task.subsystem, 0.0
            )

            battery_needed = round(battery_rate * task.duration_minutes, 2)
            fuel_needed = round(fuel_rate * task.duration_minutes, 2)

            # Update task with resource requirements
            task.battery_required = battery_needed
            task.fuel_required = fuel_needed

            # Track cumulative consumption
            total_battery_required += battery_needed
            total_fuel_required += fuel_needed
            battery_remaining -= battery_needed
            fuel_remaining -= fuel_needed

            # Check for shortages
            shortage = False
            shortage_details_parts: list[str] = []

            if battery_remaining < config.MIN_BATTERY_RESERVE:
                shortage = True
                shortage_details_parts.append(
                    f"Battery would drop to {battery_remaining:.1f}% "
                    f"(reserve: {config.MIN_BATTERY_RESERVE}%)"
                )

            if fuel_remaining < config.MIN_FUEL_RESERVE:
                shortage = True
                shortage_details_parts.append(
                    f"Fuel would drop to {fuel_remaining:.1f}% "
                    f"(reserve: {config.MIN_FUEL_RESERVE}%)"
                )

            if shortage:
                has_shortage = True

            estimate = ResourceEstimate(
                task_id=task.task_id,
                task_name=task.name,
                battery_required=battery_needed,
                fuel_required=fuel_needed,
                battery_after=round(battery_remaining, 2),
                fuel_after=round(fuel_remaining, 2),
                shortage=shortage,
                shortage_details="; ".join(shortage_details_parts),
            )
            estimates.append(estimate)

        status = ResourceStatus(
            battery_available=battery_available,
            battery_required=round(total_battery_required, 2),
            battery_remaining=round(battery_remaining, 2),
            fuel_available=fuel_available,
            fuel_required=round(total_fuel_required, 2),
            fuel_remaining=round(fuel_remaining, 2),
            has_shortage=has_shortage,
            task_estimates=estimates,
        )

        logger.info(
            "Resource plan: battery %.1f%% → %.1f%%, fuel %.1f%% → %.1f%%, "
            "shortage=%s",
            battery_available, battery_remaining,
            fuel_available, fuel_remaining,
            has_shortage,
        )

        return status

    def plan_to_dict(
        self,
        tasks: list[MissionTask],
        battery_available: float,
        fuel_available: float,
    ) -> dict[str, Any]:
        """Plan resources and return as a serializable dictionary."""
        status = self.plan(tasks, battery_available, fuel_available)
        return status.to_dict()

"""
fault_response_planner.py
=========================
Module 6: Fault Response Planner

Integrates outputs from Agent 1 (Anomaly Detection), Agent 2 (Fault
Diagnosis), and direct 10-dimension spacecraft telemetry rule checks:
1. Battery Level < 25% -> Battery_Drain recovery (Power-saving mode)
2. Solar Panel Efficiency < 50% -> Low_Solar_Efficiency recovery (Reduce non-essential loads)
3. Temperature > 70 deg C -> Thermal_Spike recovery (Stop high-power tasks)
4. Fuel Level < 20% -> Low_Fuel recovery (Cancel optional maneuvers)
5. Communication Signal Strength Poor -> Communication_Loss recovery (Use backup antenna)
6. Storage Available > 90% full -> Storage_Leak recovery (Compress/transmit data)
7. Navigation Accuracy Low -> Navigation_Error recovery (Recalibrate navigation)
8. Payload/Camera Status Failed -> Payload_Failure recovery (Skip imaging tasks)
9. CPU/System Load > 90% -> CPU_Overload recovery (Delay processing)
10. Link Latency / Packet Loss High -> High_Latency recovery (Increase retry interval)

Only modifies future (non-completed) tasks. Completed tasks remain unchanged.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import MissionInput, MissionTask, TaskStatus, CorrectiveAction

logger = logging.getLogger("FaultResponsePlanner")


class FaultResponsePlanner:
    """Modify mission plans based on telemetry rules and diagnosed faults."""

    def plan_response(
        self,
        agent1_output: dict[str, Any] | None = None,
        agent2_output: dict[str, Any] | None = None,
        current_tasks: list[MissionTask] | None = None,
        completed_task_ids: set[str] | None = None,
        mission_input: MissionInput | None = None,
    ) -> dict[str, Any]:
        current_tasks = current_tasks or []
        completed_task_ids = completed_task_ids or set()
        agent1_output = agent1_output or {}
        agent2_output = agent2_output or {}

        # Identify all fault types (from agent outputs and direct telemetry checks)
        fault_types = self._identify_faults(agent1_output, agent2_output, mission_input)

        if not fault_types:
            logger.info("No actionable faults detected - plan remains unchanged")
            return {
                "fault_detected": False,
                "fault_type": "None",
                "severity": "None",
                "corrective_actions": [],
                "modified_tasks": current_tasks,
                "removed_tasks": [],
                "plan_modified": False,
            }

        primary_fault = fault_types[0]
        severity = agent2_output.get("severity", "High" if len(fault_types) > 1 else "Medium")
        logger.warning(
            "Faults detected: %s (severity: %s) - applying recovery rules",
            ", ".join(fault_types), severity,
        )

        # Collect recovery actions for all detected fault types
        all_actions: list[CorrectiveAction] = []
        for ft in fault_types:
            all_actions.extend(self._get_corrective_actions(ft))

        # Deduplicate actions by action_name
        seen_actions = set()
        unique_actions: list[CorrectiveAction] = []
        for action in all_actions:
            if action.action_name not in seen_actions:
                seen_actions.add(action.action_name)
                unique_actions.append(action)

        # Modify task list: remove conflicting future tasks, inject recovery tasks
        modified_tasks, removed_tasks = self._modify_task_list(
            fault_types, current_tasks, unique_actions, completed_task_ids
        )

        return {
            "fault_detected": True,
            "fault_type": primary_fault,
            "all_fault_types": fault_types,
            "severity": severity,
            "corrective_actions": [a.to_dict() for a in unique_actions],
            "modified_tasks": modified_tasks,
            "removed_tasks": removed_tasks,
            "plan_modified": True,
        }

    def _identify_faults(
        self,
        agent1_output: dict[str, Any],
        agent2_output: dict[str, Any],
        mission_input: MissionInput | None,
    ) -> list[str]:
        faults: list[str] = []

        # 1. Agent 1 & Agent 2 diagnosis
        if agent1_output.get("status") == "ANOMALY":
            ft = agent2_output.get("fault_type", "Normal")
            if ft in config.RECOVERY_RULES and ft not in faults:
                faults.append(ft)

        # 2. Direct telemetry rule checks (10 dimensions)
        if mission_input is not None:
            # 1. Battery Level < 25% -> Battery_Drain (Power-saving mode)
            if mission_input.battery_level < config.CONSTRAINT_THRESHOLDS["battery"]["warn_below"]:
                if "Battery_Drain" not in faults:
                    faults.append("Battery_Drain")

            # 2. Solar Efficiency < 50% -> Low_Solar_Efficiency
            if mission_input.solar_panel_efficiency < config.CONSTRAINT_THRESHOLDS["solar_efficiency"]["warn_below"]:
                if "Low_Solar_Efficiency" not in faults:
                    faults.append("Low_Solar_Efficiency")

            # 3. Temperature > 70 deg C -> Thermal_Spike
            if mission_input.temperature > config.CONSTRAINT_THRESHOLDS["temperature"]["fail_above"]:
                if "Thermal_Spike" not in faults:
                    faults.append("Thermal_Spike")

            # 4. Fuel Level < 20% -> Low_Fuel
            if mission_input.fuel_level < config.CONSTRAINT_THRESHOLDS["fuel"]["warn_below"]:
                if "Low_Fuel" not in faults:
                    faults.append("Low_Fuel")

            # 5. Communication Signal Strength Poor -> Communication_Loss
            if (mission_input.comm_status != "online" or
                    mission_input.signal_strength <= config.CONSTRAINT_THRESHOLDS["communication"]["signal_warn_dbm"]):
                if "Communication_Loss" not in faults:
                    faults.append("Communication_Loss")

            # 6. Storage Available > 90% full -> Storage_Leak
            if mission_input.storage_usage_pct > config.CONSTRAINT_THRESHOLDS["storage"]["warn_above"]:
                if "Storage_Leak" not in faults:
                    faults.append("Storage_Leak")

            # 7. Navigation Accuracy Low (< 70%) -> Navigation_Error
            if mission_input.navigation_accuracy < config.CONSTRAINT_THRESHOLDS["navigation_accuracy"]["warn_below"]:
                if "Navigation_Error" not in faults:
                    faults.append("Navigation_Error")

            # 8. Payload Status Failed -> Payload_Failure
            if mission_input.payload_status == config.CONSTRAINT_THRESHOLDS["payload_status"]["fail_status"]:
                if "Payload_Failure" not in faults:
                    faults.append("Payload_Failure")

            # 9. CPU Load > 90% -> CPU_Overload
            if mission_input.cpu_load > config.CONSTRAINT_THRESHOLDS["cpu_load"]["warn_above"]:
                if "CPU_Overload" not in faults:
                    faults.append("CPU_Overload")

            # 10. Link Latency / Packet Loss High -> High_Latency
            if (mission_input.link_latency_ms > config.CONSTRAINT_THRESHOLDS["link_latency"]["warn_latency_ms"] or
                    mission_input.packet_loss_pct > config.CONSTRAINT_THRESHOLDS["link_latency"]["warn_packet_loss_pct"]):
                if "High_Latency" not in faults:
                    faults.append("High_Latency")

        return faults

    @staticmethod
    def _get_corrective_actions(fault_type: str) -> list[CorrectiveAction]:
        rules = config.RECOVERY_RULES.get(fault_type, [])
        actions: list[CorrectiveAction] = []
        for name, priority, duration, subsystem, description in rules:
            actions.append(CorrectiveAction(
                fault_type=fault_type,
                action_name=name,
                description=description,
                priority=priority,
                subsystem=subsystem,
                duration_minutes=duration,
            ))
        return actions

    def _modify_task_list(
        self,
        fault_types: list[str],
        current_tasks: list[MissionTask],
        corrective_actions: list[CorrectiveAction],
        completed_task_ids: set[str],
    ) -> tuple[list[MissionTask], list[str]]:
        tasks_to_remove = set()
        for ft in fault_types:
            tasks_to_remove.update(config.TASKS_TO_REMOVE_ON_FAULT.get(ft, []))

        modified: list[MissionTask] = []
        removed: list[str] = []

        insertion_index = 0
        for i, task in enumerate(current_tasks):
            if task.task_id in completed_task_ids:
                insertion_index = i + 1

        for task in current_tasks[:insertion_index]:
            modified.append(task)

        for i, action in enumerate(corrective_actions):
            recovery_task = MissionTask(
                task_id=f"R{i + 1:03d}_{action.action_name}",
                name=action.action_name,
                priority=action.priority,
                duration_minutes=action.duration_minutes,
                subsystem=action.subsystem,
                dependencies=[],
                status=TaskStatus.PENDING,
                description=action.description,
                is_corrective=True,
            )
            if i > 0:
                prev_id = f"R{i:03d}_{corrective_actions[i - 1].action_name}"
                recovery_task.dependencies = [prev_id]
            modified.append(recovery_task)

        last_recovery_id = (
            f"R{len(corrective_actions):03d}_{corrective_actions[-1].action_name}"
            if corrective_actions else None
        )

        for task in current_tasks[insertion_index:]:
            if task.name in tasks_to_remove:
                task.status = TaskStatus.SKIPPED
                removed.append(task.name)
                logger.info("Removed task '%s' due to fault recovery", task.name)
            else:
                new_deps = []
                for dep_id in task.dependencies:
                    dep_name = dep_id.split("_", 1)[1] if "_" in dep_id else dep_id
                    if dep_name in tasks_to_remove and last_recovery_id:
                        if last_recovery_id not in new_deps:
                            new_deps.append(last_recovery_id)
                    else:
                        new_deps.append(dep_id)
                task.dependencies = new_deps
                modified.append(task)

        return modified, removed

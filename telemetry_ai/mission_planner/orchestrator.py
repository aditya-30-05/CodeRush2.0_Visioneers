"""
orchestrator.py
===============
Central MissionPlanner orchestrator that connects all modules.

Executes the full pipeline:
    Mission Input → Objective Analyzer → Constraint Checker →
    Resource Planner → Task Scheduler → Risk Evaluator →
    Fault Response Planner → Timeline Generator → Report Generator

Supports dynamic replanning: when Agent 1 or Agent 2 detects a problem,
only the affected future portion of the mission is recalculated while
completed tasks remain unchanged.
"""

from __future__ import annotations

import copy
import logging
from typing import Any

from .models import MissionInput, MissionTask, MissionReport, TaskStatus
from .objective_analyzer import ObjectiveAnalyzer
from .constraint_checker import ConstraintChecker
from .resource_planner import ResourcePlanner
from .task_scheduler import TaskScheduler
from .risk_evaluator import RiskEvaluator
from .fault_response_planner import FaultResponsePlanner
from .timeline_generator import TimelineGenerator
from .report_generator import ReportGenerator

logger = logging.getLogger("MissionPlanner")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)


class MissionPlanner:
    """Central orchestrator for the Autonomous Space Mission Planner.

    Connects all eight modules into a deterministic pipeline.
    Maintains internal state for dynamic replanning support.
    """

    def __init__(self) -> None:
        # Initialize all modules
        self._objective_analyzer = ObjectiveAnalyzer()
        self._constraint_checker = ConstraintChecker()
        self._resource_planner = ResourcePlanner()
        self._task_scheduler = TaskScheduler()
        self._risk_evaluator = RiskEvaluator()
        self._fault_response = FaultResponsePlanner()
        self._timeline_generator = TimelineGenerator()
        self._report_generator = ReportGenerator()

        # Internal state for replanning
        self._mission_input: MissionInput | None = None
        self._tasks: list[MissionTask] = []
        self._completed_task_ids: set[str] = set()
        self._last_report: MissionReport | None = None

    def plan_mission(self, mission_input: MissionInput) -> MissionReport:
        """Execute the full mission planning pipeline.

        Parameters
        ----------
        mission_input : MissionInput
            Complete mission specification.

        Returns
        -------
        MissionReport
            Full structured mission report.

        Raises
        ------
        ValueError
            If the mission input is invalid.
        """
        # Validate inputs
        errors = mission_input.validate()
        if errors:
            raise ValueError(
                f"Invalid mission input: {'; '.join(errors)}"
            )

        # Store input for replanning
        self._mission_input = mission_input
        self._completed_task_ids = set()

        logger.info(
            "=" * 60 + "\n  Planning mission: %s\n" + "=" * 60,
            mission_input.mission_name,
        )

        # --- Step 1: Objective Analysis ---
        logger.info("[1/8] Analyzing objectives...")
        tasks = self._objective_analyzer.analyze(mission_input)
        self._tasks = tasks

        # --- Step 2: Constraint Checking ---
        logger.info("[2/8] Checking constraints...")
        constraint_results = self._constraint_checker.check(mission_input)

        # --- Step 3: Resource Planning ---
        logger.info("[3/8] Planning resources...")
        resource_status = self._resource_planner.plan(
            tasks,
            mission_input.battery_level,
            mission_input.fuel_level,
        )

        # --- Step 4: Task Scheduling ---
        logger.info("[4/8] Scheduling tasks...")
        scheduled_tasks = self._task_scheduler.schedule(tasks)

        # --- Step 5: Risk Evaluation ---
        logger.info("[5/8] Evaluating risk...")
        risk_result = self._risk_evaluator.evaluate(mission_input=mission_input)

        # --- Step 6: Fault Response Planning ---
        logger.info("[6/8] Planning fault response...")
        fault_response = self._fault_response.plan_response(
            agent1_output=mission_input.agent1_output,
            agent2_output=mission_input.agent2_output,
            current_tasks=scheduled_tasks,
            completed_task_ids=self._completed_task_ids,
            mission_input=mission_input,
        )

        # If plan was modified, re-schedule and re-plan resources
        if fault_response["plan_modified"]:
            modified_tasks = fault_response["modified_tasks"]
            logger.info("[6/8] Re-scheduling after fault response...")
            scheduled_tasks = self._task_scheduler.schedule(modified_tasks)
            resource_status = self._resource_planner.plan(
                scheduled_tasks,
                mission_input.battery_level,
                mission_input.fuel_level,
            )

        self._tasks = scheduled_tasks

        # --- Step 7: Timeline Generation ---
        logger.info("[7/8] Generating timeline...")
        timeline = self._timeline_generator.generate(
            scheduled_tasks, resource_status.task_estimates
        )

        # --- Step 8: Report Generation ---
        logger.info("[8/8] Generating mission report...")
        report = self._report_generator.generate(
            mission_name=mission_input.mission_name,
            objective=mission_input.objective,
            mission_phase=mission_input.mission_phase,
            feasibility=constraint_results["feasibility"],
            constraint_results=constraint_results["constraints"],
            timeline=[e.to_dict() for e in timeline],
            resource_status=resource_status.to_dict(),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            anomaly_data=mission_input.agent1_output,
            fault_data=mission_input.agent2_output,
            corrective_actions=fault_response.get("corrective_actions", []),
            tasks=[t.to_dict() for t in scheduled_tasks],
            plan_modified=fault_response.get("plan_modified", False),
        )

        self._last_report = report

        logger.info(
            "Mission planning complete: %s | Risk: %.1f (%s) | "
            "Feasibility: %s | Abort: %s",
            mission_input.mission_name,
            report.risk_score,
            report.risk_level,
            report.feasibility,
            report.abort_recommendation,
        )

        return report

    def replan(
        self,
        agent1_output: dict[str, Any],
        agent2_output: dict[str, Any],
        completed_task_ids: set[str] | None = None,
    ) -> MissionReport:
        """Dynamically replan the mission based on new fault data.

        Only the affected future portion of the mission is recalculated.
        Completed tasks remain unchanged.

        Parameters
        ----------
        agent1_output : dict
            New Agent 1 (anomaly detection) output.
        agent2_output : dict
            New Agent 2 (fault diagnosis) output.
        completed_task_ids : set[str] | None
            Task IDs that have been completed. If None, uses internal
            tracking state.

        Returns
        -------
        MissionReport
            Updated mission report.

        Raises
        ------
        RuntimeError
            If no initial plan has been created.
        """
        if self._mission_input is None or not self._tasks:
            raise RuntimeError(
                "No initial plan exists. Call plan_mission() first."
            )

        if completed_task_ids is not None:
            self._completed_task_ids = completed_task_ids

        logger.info(
            "=" * 60 + "\n  REPLANNING: %s\n" + "=" * 60,
            self._mission_input.mission_name,
        )
        logger.info(
            "Completed tasks: %d, remaining: %d",
            len(self._completed_task_ids),
            len(self._tasks) - len(self._completed_task_ids),
        )

        # Mark completed tasks
        for task in self._tasks:
            if task.task_id in self._completed_task_ids:
                task.status = TaskStatus.COMPLETED

        # Update mission input with new agent data
        mission_input = copy.deepcopy(self._mission_input)
        mission_input.agent1_output = agent1_output
        mission_input.agent2_output = agent2_output

        # --- Re-evaluate risk with new data ---
        risk_result = self._risk_evaluator.evaluate(mission_input=mission_input)

        # --- Apply fault response to current task list ---
        fault_response = self._fault_response.plan_response(
            agent1_output=agent1_output,
            agent2_output=agent2_output,
            current_tasks=self._tasks,
            completed_task_ids=self._completed_task_ids,
            mission_input=mission_input,
        )

        # Re-schedule if plan was modified
        if fault_response["plan_modified"]:
            modified_tasks = fault_response["modified_tasks"]
            scheduled_tasks = self._task_scheduler.schedule(modified_tasks)
        else:
            scheduled_tasks = self._tasks

        # Re-plan resources
        resource_status = self._resource_planner.plan(
            scheduled_tasks,
            mission_input.battery_level,
            mission_input.fuel_level,
        )

        self._tasks = scheduled_tasks

        # Regenerate timeline
        timeline = self._timeline_generator.generate(
            scheduled_tasks, resource_status.task_estimates
        )

        # Re-check constraints
        constraint_results = self._constraint_checker.check(mission_input)

        # Generate updated report
        report = self._report_generator.generate(
            mission_name=mission_input.mission_name,
            objective=mission_input.objective,
            mission_phase=mission_input.mission_phase,
            feasibility=constraint_results["feasibility"],
            constraint_results=constraint_results["constraints"],
            timeline=[e.to_dict() for e in timeline],
            resource_status=resource_status.to_dict(),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            anomaly_data=agent1_output,
            fault_data=agent2_output,
            corrective_actions=fault_response.get("corrective_actions", []),
            tasks=[t.to_dict() for t in scheduled_tasks],
            plan_modified=fault_response.get("plan_modified", False),
        )

        self._last_report = report

        logger.info(
            "Replanning complete: Risk: %.1f (%s) | Abort: %s",
            report.risk_score, report.risk_level, report.abort_recommendation,
        )

        return report

    def mark_task_completed(self, task_id: str) -> None:
        """Mark a task as completed for replanning purposes.

        Parameters
        ----------
        task_id : str
            The ID of the completed task.
        """
        self._completed_task_ids.add(task_id)
        for task in self._tasks:
            if task.task_id == task_id:
                task.status = TaskStatus.COMPLETED
                logger.info("Task marked completed: %s", task_id)
                return
        logger.warning("Task not found: %s", task_id)

    @property
    def last_report(self) -> MissionReport | None:
        """The most recent mission report."""
        return self._last_report

    @property
    def tasks(self) -> list[MissionTask]:
        """Current task list."""
        return self._tasks

    @property
    def completed_tasks(self) -> set[str]:
        """Set of completed task IDs."""
        return self._completed_task_ids

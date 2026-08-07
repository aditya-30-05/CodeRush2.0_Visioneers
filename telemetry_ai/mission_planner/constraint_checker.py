"""
constraint_checker.py
=====================
Module 2: Constraint Checker

Evaluates mission feasibility by checking 10 spacecraft telemetry dimensions:
1. Battery Level (< 25% -> Power-saving mode)
2. Solar Panel Efficiency (< 50% -> Reduce non-essential loads)
3. Temperature (> 70 deg C -> Stop high-power tasks)
4. Fuel Level (< 20% -> Cancel optional maneuvers)
5. Communication Signal Strength (Poor -> Use backup antenna)
6. Storage Available (> 90% full -> Compress/transmit data)
7. Navigation Accuracy (Low accuracy -> Recalibrate navigation)
8. Payload/Camera Status (Failed -> Skip imaging tasks)
9. CPU/System Load (> 90% -> Delay processing)
10. Link Latency / Packet Loss (High -> Increase retry interval)

Returns PASS / WARNING / FAIL for each constraint and an overall GO / CAUTION / NO_GO verdict.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import (
    MissionInput,
    ConstraintResult,
    ConstraintStatus,
    FeasibilityStatus,
)

logger = logging.getLogger("ConstraintChecker")


class ConstraintChecker:
    """Check spacecraft constraints and determine overall mission feasibility."""

    def check(self, mission_input: MissionInput) -> dict[str, Any]:
        """Run all 10 constraint checks plus mission constraints."""
        results: list[ConstraintResult] = [
            self._check_battery(mission_input.battery_level),
            self._check_solar_efficiency(mission_input.solar_panel_efficiency),
            self._check_temperature(mission_input.temperature),
            self._check_fuel(mission_input.fuel_level),
            self._check_communication(mission_input.comm_status, mission_input.signal_strength),
            self._check_storage(mission_input.storage_usage_pct),
            self._check_navigation(mission_input.navigation_accuracy),
            self._check_payload_status(mission_input.payload_status),
            self._check_cpu_load(mission_input.cpu_load),
            self._check_link_quality(mission_input.link_latency_ms, mission_input.packet_loss_pct),
            self._check_duration(mission_input.duration_hours),
            self._check_payload_mass(mission_input.payload_mass_kg),
        ]

        fail_count = sum(1 for r in results if r.status == ConstraintStatus.FAIL)
        warn_count = sum(1 for r in results if r.status == ConstraintStatus.WARNING)
        pass_count = sum(1 for r in results if r.status == ConstraintStatus.PASS)

        if fail_count > 0:
            feasibility = FeasibilityStatus.NO_GO
        elif warn_count > 0:
            feasibility = FeasibilityStatus.CAUTION
        else:
            feasibility = FeasibilityStatus.GO

        logger.info(
            "Constraint check: %d PASS, %d WARNING, %d FAIL -> %s",
            pass_count, warn_count, fail_count, feasibility.value,
        )

        return {
            "constraints": [r.to_dict() for r in results],
            "feasibility": feasibility.value,
            "fail_count": fail_count,
            "warning_count": warn_count,
            "pass_count": pass_count,
        }

    # 1. Battery Level
    @staticmethod
    def _check_battery(battery_level: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["battery"]
        if battery_level < thresholds["fail_below"]:
            return ConstraintResult(
                name="battery",
                value=battery_level,
                threshold=f"FAIL below {thresholds['fail_below']}%",
                status=ConstraintStatus.FAIL,
                message=f"Battery critically low at {battery_level}%",
            )
        elif battery_level < thresholds["warn_below"]:
            return ConstraintResult(
                name="battery",
                value=battery_level,
                threshold=f"WARN below {thresholds['warn_below']}%",
                status=ConstraintStatus.WARNING,
                message=f"Battery low at {battery_level}% (< 25%: Power-saving mode required)",
            )
        return ConstraintResult(
            name="battery",
            value=battery_level,
            threshold=f"OK above {thresholds['warn_below']}%",
            status=ConstraintStatus.PASS,
            message=f"Battery level nominal at {battery_level}%",
        )

    # 2. Solar Panel Efficiency
    @staticmethod
    def _check_solar_efficiency(solar_eff: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["solar_efficiency"]
        if solar_eff < thresholds["fail_below"]:
            return ConstraintResult(
                name="solar_panel_efficiency",
                value=solar_eff,
                threshold=f"FAIL below {thresholds['fail_below']}%",
                status=ConstraintStatus.FAIL,
                message=f"Solar panel efficiency critically low at {solar_eff}%",
            )
        elif solar_eff < thresholds["warn_below"]:
            return ConstraintResult(
                name="solar_panel_efficiency",
                value=solar_eff,
                threshold=f"WARN below {thresholds['warn_below']}%",
                status=ConstraintStatus.WARNING,
                message=f"Solar panel efficiency low at {solar_eff}% (< 50%: Reduce non-essential loads)",
            )
        return ConstraintResult(
            name="solar_panel_efficiency",
            value=solar_eff,
            threshold=f"OK above {thresholds['warn_below']}%",
            status=ConstraintStatus.PASS,
            message=f"Solar panel efficiency nominal at {solar_eff}%",
        )

    # 3. Temperature
    @staticmethod
    def _check_temperature(temperature: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["temperature"]
        if temperature > thresholds["fail_above"]:
            return ConstraintResult(
                name="temperature",
                value=temperature,
                threshold=f"FAIL above {thresholds['fail_above']} deg C",
                status=ConstraintStatus.FAIL,
                message=f"Temperature critically high at {temperature} deg C (> 70 deg C: Stop high-power tasks)",
            )
        elif temperature < thresholds["fail_below"]:
            return ConstraintResult(
                name="temperature",
                value=temperature,
                threshold=f"FAIL below {thresholds['fail_below']} deg C",
                status=ConstraintStatus.FAIL,
                message=f"Temperature critically low at {temperature} deg C",
            )
        elif temperature > thresholds["warn_above"]:
            return ConstraintResult(
                name="temperature",
                value=temperature,
                threshold=f"WARN above {thresholds['warn_above']} deg C",
                status=ConstraintStatus.WARNING,
                message=f"Temperature elevated at {temperature} deg C",
            )
        return ConstraintResult(
            name="temperature",
            value=temperature,
            threshold=f"OK ({thresholds['warn_below']} deg C to {thresholds['warn_above']} deg C)",
            status=ConstraintStatus.PASS,
            message=f"Temperature nominal at {temperature} deg C",
        )

    # 4. Fuel Level
    @staticmethod
    def _check_fuel(fuel_level: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["fuel"]
        if fuel_level < thresholds["fail_below"]:
            return ConstraintResult(
                name="fuel",
                value=fuel_level,
                threshold=f"FAIL below {thresholds['fail_below']}%",
                status=ConstraintStatus.FAIL,
                message=f"Fuel level critically low at {fuel_level}%",
            )
        elif fuel_level < thresholds["warn_below"]:
            return ConstraintResult(
                name="fuel",
                value=fuel_level,
                threshold=f"WARN below {thresholds['warn_below']}%",
                status=ConstraintStatus.WARNING,
                message=f"Fuel level low at {fuel_level}% (< 20%: Cancel optional maneuvers)",
            )
        return ConstraintResult(
            name="fuel",
            value=fuel_level,
            threshold=f"OK above {thresholds['warn_below']}%",
            status=ConstraintStatus.PASS,
            message=f"Fuel level nominal at {fuel_level}%",
        )

    # 5. Communication Signal Strength
    @staticmethod
    def _check_communication(comm_status: str, signal_strength: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["communication"]
        if comm_status == thresholds["fail_status"]:
            return ConstraintResult(
                name="communication",
                value=comm_status,
                threshold="FAIL if offline",
                status=ConstraintStatus.FAIL,
                message="Communication link is offline",
            )
        elif comm_status == thresholds["warn_status"] or signal_strength <= thresholds["signal_warn_dbm"]:
            return ConstraintResult(
                name="communication",
                value=f"{comm_status} ({signal_strength} dBm)",
                threshold=f"WARN if degraded / signal <= {thresholds['signal_warn_dbm']} dBm",
                status=ConstraintStatus.WARNING,
                message=f"Signal strength poor ({signal_strength} dBm): Use backup antenna",
            )
        return ConstraintResult(
            name="communication",
            value=f"{comm_status} ({signal_strength} dBm)",
            threshold="OK if online and signal > -80 dBm",
            status=ConstraintStatus.PASS,
            message=f"Communication link online at {signal_strength} dBm",
        )

    # 6. Storage Available
    @staticmethod
    def _check_storage(storage_pct: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["storage"]
        if storage_pct > thresholds["fail_above"]:
            return ConstraintResult(
                name="storage",
                value=storage_pct,
                threshold=f"FAIL above {thresholds['fail_above']}%",
                status=ConstraintStatus.FAIL,
                message=f"Storage full at {storage_pct}%",
            )
        elif storage_pct > thresholds["warn_above"]:
            return ConstraintResult(
                name="storage",
                value=storage_pct,
                threshold=f"WARN above {thresholds['warn_above']}%",
                status=ConstraintStatus.WARNING,
                message=f"Storage > 90% full ({storage_pct}%): Compress/transmit data",
            )
        return ConstraintResult(
            name="storage",
            value=storage_pct,
            threshold=f"OK below {thresholds['warn_above']}%",
            status=ConstraintStatus.PASS,
            message=f"Storage usage nominal at {storage_pct}%",
        )

    # 7. Navigation Accuracy
    @staticmethod
    def _check_navigation(nav_accuracy: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["navigation_accuracy"]
        if nav_accuracy < thresholds["fail_below"]:
            return ConstraintResult(
                name="navigation_accuracy",
                value=nav_accuracy,
                threshold=f"FAIL below {thresholds['fail_below']}%",
                status=ConstraintStatus.FAIL,
                message=f"Navigation accuracy lost at {nav_accuracy}%",
            )
        elif nav_accuracy < thresholds["warn_below"]:
            return ConstraintResult(
                name="navigation_accuracy",
                value=nav_accuracy,
                threshold=f"WARN below {thresholds['warn_below']}%",
                status=ConstraintStatus.WARNING,
                message=f"Navigation accuracy low at {nav_accuracy}%: Recalibrate navigation",
            )
        return ConstraintResult(
            name="navigation_accuracy",
            value=nav_accuracy,
            threshold=f"OK above {thresholds['warn_below']}%",
            status=ConstraintStatus.PASS,
            message=f"Navigation accuracy nominal at {nav_accuracy}%",
        )

    # 8. Payload / Camera Status
    @staticmethod
    def _check_payload_status(payload_status: str) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["payload_status"]
        if payload_status == thresholds["fail_status"]:
            return ConstraintResult(
                name="payload_status",
                value=payload_status,
                threshold="FAIL if failed",
                status=ConstraintStatus.FAIL,
                message="Payload/Camera status failed: Skip imaging tasks",
            )
        elif payload_status == thresholds["warn_status"]:
            return ConstraintResult(
                name="payload_status",
                value=payload_status,
                threshold="WARN if degraded",
                status=ConstraintStatus.WARNING,
                message="Payload/Camera status degraded",
            )
        return ConstraintResult(
            name="payload_status",
            value=payload_status,
            threshold="OK if nominal",
            status=ConstraintStatus.PASS,
            message="Payload/Camera status nominal",
        )

    # 9. CPU / System Load
    @staticmethod
    def _check_cpu_load(cpu_load: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["cpu_load"]
        if cpu_load > thresholds["fail_above"]:
            return ConstraintResult(
                name="cpu_load",
                value=cpu_load,
                threshold=f"FAIL above {thresholds['fail_above']}%",
                status=ConstraintStatus.FAIL,
                message=f"CPU load critical at {cpu_load}%",
            )
        elif cpu_load > thresholds["warn_above"]:
            return ConstraintResult(
                name="cpu_load",
                value=cpu_load,
                threshold=f"WARN above {thresholds['warn_above']}%",
                status=ConstraintStatus.WARNING,
                message=f"CPU load > 90% ({cpu_load}%): Delay processing",
            )
        return ConstraintResult(
            name="cpu_load",
            value=cpu_load,
            threshold=f"OK below {thresholds['warn_above']}%",
            status=ConstraintStatus.PASS,
            message=f"CPU load nominal at {cpu_load}%",
        )

    # 10. Link Latency / Packet Loss
    @staticmethod
    def _check_link_quality(latency_ms: float, packet_loss_pct: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["link_latency"]
        if latency_ms > thresholds["warn_latency_ms"] or packet_loss_pct > thresholds["warn_packet_loss_pct"]:
            return ConstraintResult(
                name="link_quality",
                value=f"{latency_ms}ms / {packet_loss_pct}% loss",
                threshold=f"WARN if latency > {thresholds['warn_latency_ms']}ms or loss > {thresholds['warn_packet_loss_pct']}%",
                status=ConstraintStatus.WARNING,
                message=f"High latency/loss ({latency_ms}ms, {packet_loss_pct}% loss): Increase retry interval",
            )
        return ConstraintResult(
            name="link_quality",
            value=f"{latency_ms}ms / {packet_loss_pct}% loss",
            threshold="OK",
            status=ConstraintStatus.PASS,
            message=f"Link quality nominal ({latency_ms}ms, {packet_loss_pct}% loss)",
        )

    # Mission duration check
    @staticmethod
    def _check_duration(duration_hours: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["duration"]
        if duration_hours > thresholds["max_hours"]:
            return ConstraintResult(
                name="duration",
                value=duration_hours,
                threshold=f"FAIL above {thresholds['max_hours']} hours",
                status=ConstraintStatus.FAIL,
                message=f"Mission duration {duration_hours}h exceeds maximum {thresholds['max_hours']}h",
            )
        elif duration_hours > thresholds["warn_hours"]:
            return ConstraintResult(
                name="duration",
                value=duration_hours,
                threshold=f"WARN above {thresholds['warn_hours']} hours",
                status=ConstraintStatus.WARNING,
                message=f"Mission duration {duration_hours}h is extended",
            )
        return ConstraintResult(
            name="duration",
            value=duration_hours,
            threshold=f"OK below {thresholds['warn_hours']} hours",
            status=ConstraintStatus.PASS,
            message=f"Mission duration {duration_hours}h is within limits",
        )

    # Mission payload mass check
    @staticmethod
    def _check_payload_mass(payload_mass_kg: float) -> ConstraintResult:
        thresholds = config.CONSTRAINT_THRESHOLDS["payload_mass"]
        if payload_mass_kg > thresholds["max_mass_kg"]:
            return ConstraintResult(
                name="payload_mass",
                value=payload_mass_kg,
                threshold=f"FAIL above {thresholds['max_mass_kg']} kg",
                status=ConstraintStatus.FAIL,
                message=f"Payload {payload_mass_kg}kg exceeds capacity {thresholds['max_mass_kg']}kg",
            )
        elif payload_mass_kg > thresholds["warn_mass_kg"]:
            return ConstraintResult(
                name="payload_mass",
                value=payload_mass_kg,
                threshold=f"WARN above {thresholds['warn_mass_kg']} kg",
                status=ConstraintStatus.WARNING,
                message=f"Payload {payload_mass_kg}kg is heavy",
            )
        return ConstraintResult(
            name="payload_mass",
            value=payload_mass_kg,
            threshold=f"OK below {thresholds['warn_mass_kg']} kg",
            status=ConstraintStatus.PASS,
            message=f"Payload {payload_mass_kg}kg is within limits",
        )

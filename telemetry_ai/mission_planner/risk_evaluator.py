"""
risk_evaluator.py
=================
Module 5: Risk Evaluator

Calculates a numerical mission risk score (0-100) using weighted factors
from all 10 telemetry dimensions, anomaly data, and fault data.
Classifies the score as LOW, MEDIUM, HIGH, or CRITICAL.
"""

from __future__ import annotations

import logging
from typing import Any

from . import config
from .models import MissionInput, RiskLevel

logger = logging.getLogger("RiskEvaluator")


class RiskEvaluator:
    """Calculate mission risk from telemetry and diagnostic data."""

    def evaluate(
        self,
        mission_input: MissionInput | None = None,
        battery_level: float = 100.0,
        fuel_level: float = 100.0,
        temperature: float = 22.0,
        comm_status: str = "online",
        solar_panel_efficiency: float = 100.0,
        storage_usage_pct: float = 20.0,
        navigation_accuracy: float = 100.0,
        payload_status: str = "nominal",
        cpu_load: float = 20.0,
        link_latency_ms: float = 50.0,
        packet_loss_pct: float = 0.0,
        anomaly_data: dict[str, Any] | None = None,
        fault_data: dict[str, Any] | None = None,
        mission_phase: str = "operational",
    ) -> dict[str, Any]:
        """Compute weighted risk score and classify risk level."""
        if mission_input is not None:
            battery_level = mission_input.battery_level
            fuel_level = mission_input.fuel_level
            temperature = mission_input.temperature
            comm_status = mission_input.comm_status
            solar_panel_efficiency = mission_input.solar_panel_efficiency
            storage_usage_pct = mission_input.storage_usage_pct
            navigation_accuracy = mission_input.navigation_accuracy
            payload_status = mission_input.payload_status
            cpu_load = mission_input.cpu_load
            link_latency_ms = mission_input.link_latency_ms
            packet_loss_pct = mission_input.packet_loss_pct
            anomaly_data = mission_input.agent1_output
            fault_data = mission_input.agent2_output
            mission_phase = mission_input.mission_phase

        anomaly_data = anomaly_data or {}
        fault_data = fault_data or {}

        factors = {
            "battery":              self._score_battery(battery_level),
            "solar_efficiency":     self._score_solar_efficiency(solar_panel_efficiency),
            "thermal":              self._score_thermal(temperature),
            "fuel":                 self._score_fuel(fuel_level),
            "communication":        self._score_communication(comm_status),
            "storage":              self._score_storage(storage_usage_pct),
            "navigation_accuracy":  self._score_navigation(navigation_accuracy),
            "payload_status":       self._score_payload_status(payload_status),
            "cpu_load":             self._score_cpu_load(cpu_load),
            "link_latency":         self._score_link_latency(link_latency_ms, packet_loss_pct),
            "anomalies":            self._score_anomalies(anomaly_data),
            "faults":               self._score_faults(fault_data),
        }

        risk_score = sum(
            factors[factor] * config.RISK_WEIGHTS[factor]
            for factor in factors
            if factor in config.RISK_WEIGHTS
        )
        risk_score = round(min(100.0, max(0.0, risk_score)), 1)
        risk_level = self._classify(risk_score)
        dominant = max(factors, key=factors.get)  # type: ignore[arg-type]

        logger.info(
            "Risk evaluation: score=%.1f, level=%s, dominant=%s",
            risk_score, risk_level, dominant,
        )

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factor_scores": factors,
            "dominant_factor": dominant,
        }

    # 1. Battery Risk
    @staticmethod
    def _score_battery(battery_level: float) -> float:
        return round(max(0.0, min(100.0, 100.0 - battery_level)), 1)

    # 2. Solar Efficiency Risk
    @staticmethod
    def _score_solar_efficiency(solar_eff: float) -> float:
        return round(max(0.0, min(100.0, 100.0 - solar_eff)), 1)

    # 3. Thermal Risk
    @staticmethod
    def _score_thermal(temperature: float) -> float:
        thresholds = config.CONSTRAINT_THRESHOLDS["temperature"]
        nominal_min = thresholds["nominal_min"]
        nominal_max = thresholds["nominal_max"]
        fail_above = thresholds["fail_above"]
        fail_below = thresholds["fail_below"]

        if nominal_min <= temperature <= nominal_max:
            return 0.0
        if temperature > nominal_max:
            span = fail_above - nominal_max
            deviation = temperature - nominal_max
            return round(min(100.0, (deviation / span) * 100.0), 1)
        else:
            span = nominal_min - fail_below
            deviation = nominal_min - temperature
            return round(min(100.0, (deviation / span) * 100.0), 1)

    # 4. Fuel Risk
    @staticmethod
    def _score_fuel(fuel_level: float) -> float:
        return round(max(0.0, min(100.0, 100.0 - fuel_level)), 1)

    # 5. Communication Risk
    @staticmethod
    def _score_communication(comm_status: str) -> float:
        status_scores = {"online": 0.0, "degraded": 60.0, "offline": 100.0}
        return status_scores.get(comm_status, 50.0)

    # 6. Storage Risk
    @staticmethod
    def _score_storage(storage_usage_pct: float) -> float:
        return round(max(0.0, min(100.0, storage_usage_pct)), 1)

    # 7. Navigation Risk
    @staticmethod
    def _score_navigation(nav_accuracy: float) -> float:
        return round(max(0.0, min(100.0, 100.0 - nav_accuracy)), 1)

    # 8. Payload Status Risk
    @staticmethod
    def _score_payload_status(payload_status: str) -> float:
        status_scores = {"nominal": 0.0, "degraded": 50.0, "failed": 100.0}
        return status_scores.get(payload_status, 0.0)

    # 9. CPU Load Risk
    @staticmethod
    def _score_cpu_load(cpu_load: float) -> float:
        return round(max(0.0, min(100.0, cpu_load)), 1)

    # 10. Link Latency & Packet Loss Risk
    @staticmethod
    def _score_link_latency(latency_ms: float, packet_loss_pct: float) -> float:
        lat_score = min(100.0, (latency_ms / 1000.0) * 100.0)
        loss_score = min(100.0, packet_loss_pct * 10.0)
        return round(max(lat_score, loss_score), 1)

    @staticmethod
    def _score_anomalies(anomaly_data: dict[str, Any]) -> float:
        if not anomaly_data or anomaly_data.get("status") == "NORMAL":
            return 0.0
        anomaly_score = abs(float(anomaly_data.get("anomaly_score", 0.0)))
        confidence = float(anomaly_data.get("confidence", 50.0))
        normalized = min(1.0, anomaly_score / 0.5)
        return round(min(100.0, normalized * (confidence / 100.0) * 100.0), 1)

    @staticmethod
    def _score_faults(fault_data: dict[str, Any]) -> float:
        if not fault_data or fault_data.get("fault_type") == "Normal":
            return 0.0
        severity = fault_data.get("severity", "Low")
        confidence = float(fault_data.get("confidence", 50.0))
        severity_scores = {"Critical": 100.0, "High": 75.0, "Medium": 50.0, "Low": 25.0}
        return round(severity_scores.get(severity, 25.0) * (confidence / 100.0), 1)

    @staticmethod
    def _classify(risk_score: float) -> str:
        for threshold, level in config.RISK_LEVELS:
            if risk_score >= threshold:
                return level
        return "LOW"

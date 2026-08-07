/**
 * Telemetry.js
 *
 * Value object representing one telemetry snapshot.
 *
 * Produced by TelemetryEngine every tick.
 * Passed to onTelemetry() callback.
 * Immutable after construction.
 */

export class Telemetry {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').SpacecraftState} state
   * @param {number} sequenceNumber  - Monotonically increasing tick counter
   */
  constructor(state, sequenceNumber) {
    this.sequenceNumber = sequenceNumber;
    this.timestamp      = state.timestamp;
    this.missionTime    = state.missionTime;
    this.missionName    = state.missionName;
    this.missionPhase   = state.missionPhase;

    // Power subsystem
    this.battery        = state.battery.percentage;
    this.batteryVoltage = state.battery.voltage;
    this.batteryCharging= state.battery.charging;
    this.solarGeneration= state.power.solarGeneration;
    this.powerGeneration= state.power.generation;
    this.powerConsumption= state.power.consumption;

    // Thermal
    this.temperature    = state.thermal.temperature;

    // Storage
    this.storageUsedMB  = state.storage.usedMB;
    this.storagePct     = state.storage.percentUsed;

    // Communication
    this.signalStrength = state.communication.signalStrength;
    this.windowOpen     = state.communication.windowOpen;
    this.packetLoss     = state.communication.packetLoss;
    this.latencyMs      = state.communication.latencyMs;

    // Attitude
    this.orientation    = state.orientation.mode;
    this.roll           = state.orientation.roll;
    this.pitch          = state.orientation.pitch;
    this.yaw            = state.orientation.yaw;

    // Instruments
    this.cameraOn       = state.camera.on;
    this.cameraMode     = state.camera.mode;

    // Operational flags
    this.activity       = state.currentActivity;
    this.safeMode       = state.safeMode;
    this.pointingMode   = state.pointingMode;

    // Faults & warnings
    this.faults         = state.activeFaults.map(f => f.id);
    this.warnings       = [...state.warnings];

    Object.freeze(this);
  }

  /**
   * Return JSON-serialisable plain object (for transmission / storage).
   * @returns {Object}
   */
  toJSON() {
    return { ...this };
  }
}

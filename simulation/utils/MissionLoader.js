/**
 * MissionLoader.js
 *
 * Responsible for reading mission definition files from disk and
 * returning validated Mission instances.
 *
 * Supports:
 *   - loadFromFile(filePath)   → reads JSON from filesystem
 *   - loadFromObject(raw)      → accepts an already-parsed JS object
 *
 * Architecture note:
 *   MissionLoader has NO dependency on any engine or DigitalTwin.
 *   It is a pure I/O adapter: filesystem → Mission model.
 */

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { Mission }      from '../models/Mission.js';

export class MissionLoader {
  /**
   * Load a mission from a JSON file path.
   *
   * @param {string} filePath  - Absolute or relative path to mission JSON
   * @returns {Mission}
   * @throws {Error} if file cannot be read or JSON is invalid
   */
  static loadFromFile(filePath) {
    const absolutePath = resolve(filePath);

    let raw;
    try {
      const content = readFileSync(absolutePath, 'utf-8');
      raw = JSON.parse(content);
    } catch (err) {
      throw new Error(`MissionLoader: failed to load "${absolutePath}": ${err.message}`);
    }

    return MissionLoader.loadFromObject(raw);
  }

  /**
   * Construct a Mission from an already-parsed plain JS object.
   * Useful for programmatic mission creation in tests.
   *
   * @param {Object} raw
   * @returns {Mission}
   */
  static loadFromObject(raw) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('MissionLoader: mission data must be a plain object');
    }
    return new Mission(raw);
  }
}

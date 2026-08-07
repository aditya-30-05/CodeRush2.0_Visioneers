/**
 * supabase.js
 *
 * Supabase client configuration.
 *
 * Uses the service-role key so the backend bypasses Row Level Security
 * (appropriate for a trusted server-side process).
 *
 * The client is initialised once and exported as a singleton.
 * All repository modules import this shared instance.
 *
 * Architecture note:
 *   If SUPABASE_URL or SUPABASE_SERVICE_KEY are missing, the app
 *   starts in "no-database" mode: repositories become no-ops and
 *   log a warning.  This keeps the simulation runnable in local
 *   development without a Supabase project.
 */

import { createClient } from '@supabase/supabase-js';
import { logger }       from '../middlewares/logger.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
export let dbAvailable = false;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_SERVICE_KEY.includes('your-service')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  dbAvailable = true;
  logger.info('Supabase client initialised', { url: SUPABASE_URL });
} else {
  logger.warn('Supabase credentials not configured — database persistence disabled. Simulation will run in-memory only.');
}

export { supabase };

/**
 * Test database connectivity.
 * Called from /health endpoint.
 *
 * @returns {Promise<boolean>}
 */
export async function checkDbConnection() {
  if (!dbAvailable || !supabase) return false;
  try {
    const { error } = await supabase.from('missions').select('mission_id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

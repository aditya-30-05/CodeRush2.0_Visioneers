-- ====================================================================
-- OrbitOps Replay History Schema (Supabase PostgreSQL)
-- ====================================================================

-- 1. replay_sessions
CREATE TABLE IF NOT EXISTS public.replay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL,
  mission_name TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'RECORDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. replay_snapshots
CREATE TABLE IF NOT EXISTS public.replay_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_session_id TEXT,
  mission_id TEXT NOT NULL,
  tick INTEGER NOT NULL,
  mission_time INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  telemetry_data JSONB NOT NULL,
  subsystem_state JSONB,
  digital_twin_state JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. replay_events
CREATE TABLE IF NOT EXISTS public.replay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_session_id TEXT,
  mission_id TEXT NOT NULL,
  tick INTEGER DEFAULT 0,
  mission_time INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'INFO',
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ultra-fast query performance
CREATE INDEX IF NOT EXISTS idx_replay_sessions_mission ON public.replay_sessions(mission_id);
CREATE INDEX IF NOT EXISTS idx_replay_snapshots_mission_tick ON public.replay_snapshots(mission_id, tick ASC);
CREATE INDEX IF NOT EXISTS idx_replay_events_mission_time ON public.replay_events(mission_id, mission_time ASC);

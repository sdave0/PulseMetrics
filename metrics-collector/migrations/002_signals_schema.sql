-- Signal Extraction Layer Schema
-- This table stores all signals extracted from pipeline runs

CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL,
  signal_type VARCHAR(50) NOT NULL, -- 'pattern', 'drift', 'change', 'recurrence'
  signal_name VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key to workflow_runs (if exists)
  CONSTRAINT fk_run_id FOREIGN KEY (run_id) 
    REFERENCES workflow_runs(run_id) 
    ON DELETE CASCADE
);

-- Index for fast lookups by run
CREATE INDEX IF NOT EXISTS idx_signals_run_id ON signals(run_id);

-- Index for signal type filtering
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);

-- Composite index for common query pattern (run + type)
CREATE INDEX IF NOT EXISTS idx_signals_run_type ON signals(run_id, signal_type);

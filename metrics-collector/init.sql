CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    repo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    run_id BIGINT PRIMARY KEY,
    run_number INT,
    workflow_name VARCHAR(255),
    project_id INT,
    html_url TEXT,
    status VARCHAR(255),
    trigger_event VARCHAR(255),
    branch VARCHAR(255),
    duration_seconds INT,
    cost_usd DECIMAL(10, 4),
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    commit_sha VARCHAR(255),
    commit_parent_sha VARCHAR(255),
    commit_message TEXT,
    commit_author VARCHAR(255),
    jobs JSONB,
    test_summary JSONB,
    build_analysis JSONB,
    commit_analysis JSONB,
    artifacts JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Phase 1: Signal Extraction Layer
CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  signal_name VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_run_id FOREIGN KEY (run_id) 
    REFERENCES workflow_runs(run_id) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signals_run_id ON signals(run_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_run_type ON signals(run_id, signal_type);

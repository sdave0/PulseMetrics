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
    commit_message TEXT,
    commit_author VARCHAR(255),
    jobs JSONB,
    test_summary JSONB,
    build_analysis JSONB,
    artifacts JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

import { pool } from '../src/db';

const MIGRATION_SQL = `
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
`;

async function runMigration() {
    try {
        console.log('Starting migration for Phase 1: Signal Extraction Layer...');
        await pool.query(MIGRATION_SQL);
        console.log('✅ Migration successful: "signals" table created or already exists.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();

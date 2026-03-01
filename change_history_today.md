# Change Log - Phase 3 Completion & Debugging
**Date:** February 4, 2026
**Focus:** Agentic RCA Integration, Manual Trigger Refactor, and Robustness Improvements.

## February 28, 2026 Update
* Added `agent-skills` related directories to `.gitignore`.
* Removed conversational and over-explanatory comments from multiple files across `pulse-action`, `metrics-collector`, and `demo-app` to maintain a professional codebase standard.

## February 19, 2026 Update
* Analyzed `metrics-collector` and `dashboard-frontend` in `PulseAI/ci-pipeline`
* Documented key architectural features (Agentic RCA, Signal Extraction, Event-driven DB, React Dashboard)
* Generated `resume_bullets.md` containing strong technical bullet points for the resume.

## 1. Features Implemented
*   **Agentic Manual Trigger**: Refactored the "Deep Analysis" button in the frontend. Instead of sending a raw text prompt, it now calls `POST /api/analyze/:runId`.
*   **On-Demand Signal Extraction**: Implemented logic to handle legacy runs (pre-Phase 1). If a run has no signals, the backend now automatically:
    1.  Fetches raw run data and history from `workflow_runs`.
    2.  Reconstructs a `MetricsPayload`.
    3.  Runs the `SignalOrchestrator` to generate signals on the fly.
    4.  Persists them to the `signals` table.
*   **Model Configuration**: Centralized LLM model selection in `config.ts`. Added `LLM_MODEL` env var support (default updated to `gemini-3-flash-preview`).

## 2. Issues Encountered & Fixes

### A. Database Schema Error
*   **Issue:** `Error fetching signals: relation "signals" does not exist`.
*   **Cause:** The Phase 1 database migration to create the `signals` table had not been applied to the local database.
*   **Fix:** Executed `npx ts-node metrics-collector/scripts/migrate_signals.ts`.

### B. "No Proprietary Signals" Error
*   **Issue:** The AI Agent refused to analyze old runs because they lacked signal data (Phase 1 signals are usually created at ingestion time).
*   **Attempt 1 (Failed):** Backend simply returned empty signals.
*   **Fix:** Implemented `MetricsService.ensureSignals(runId)`. This method checks for missing signals and performs "On-Demand Extraction" by re-processing the stored run data through the `SignalOrchestrator`.

### C. Build Failures (Typescript)
*   **Issue:** `Property 'run_id' does not exist on type 'WorkflowRunRow'`.
*   **Cause:** The `WorkflowRunRow` interface in `types.ts` did not match the fields returned by the new `getRunContext` query.
*   **Fix:** Updated `types.ts` to include `run_id`, `trigger_event`, and `build_analysis`, ensuring type safety for the re-hydration logic.

### D. Backend Connectivity
*   **Issue:** `AggregateError [ECONNREFUSED]` on the frontend.
*   **Cause:** The backend server was stopped while the frontend was trying to proxy requests to port 3000.
*   **Fix:** User restarted the backend server (`npm start`).

## 3. Current Status
*   **Phase 3**: Complete.
*   **Agent**: Fully functional (Automatic & Manual).
*   **Database**: Migrated and auto-healing for old data.
*   **Next**: Phase 4 - Deterministic Memory.

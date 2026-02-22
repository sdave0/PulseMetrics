# PulseAI: Technical Specifications & Functional Soul

This document outlines the core architecture and "Functional Soul" of the PulseAI project, detailing how CI data flows from ingestion to AI-powered root-cause analysis. It serves as the foundation for the project's README and technical vision.

## 1. Data Ingestion Flow
**Path:** GitHub Webhook $\rightarrow$ API Route $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Repository

- **API Route:** `metrics-collector/src/routes.ts` exposes `POST /metrics`.
- **Controller Handling:** `MetricsController.receiveMetrics` intercepts the payload and passes it to the `MetricsService`. 
- **Business Logic & Cost Estimation:** `MetricsService.processMetrics` normalizes the payload and calculates cloud compute costs on the fly based on the `runner_type` using predefined per-minute rates (`RUNNER_COSTS_PER_MINUTE`, e.g., Ubuntu: $\$0.008$/min, macOS: $\$0.08$/min).
- **Database Insertion:** `MetricsRepository.upsertWorkflowRun` uses a PostgreSQL `ON CONFLICT DO UPDATE` query to gracefully handle out-of-order webhook deliveries (e.g., updating jobs from an "in\_progress" to a "completed" state).
- **Technical Proof:** `metrics-collector/src/services/MetricsService.ts` lines 34-75; `metrics-collector/src/repository.ts` lines 17-69.

## 2. The "Decision Engine" Logic
The core of Pulse's intelligence is its deterministic Decision Engine, which prevents over-reliance on the LLM (respecting the "Green Signal"). Every run passes through the `SignalOrchestrator` which extracts three types of signals:

- **Pattern Processor:** Uses deterministic string matching on job names and statuses to categorize jobs (test, build, lint) and identify standard failure types (timeout, oom, flaky).
- **Drift Processor:** Maintains a rolling window (`ANOMALY_WINDOW_SIZE = 5`) of successful historical runs. It flags anomalies if a workflow's overall duration increases by $>30\\%$ (`ANOMALY_THRESHOLD_DURATION = 1.3`) or a specific job increases by $>25\\%$.
- **Change Processor:** Analyzes the `commit_analysis` payload for "High Impact" changes like lockfile modifications, test count fluctuations ($>5\\%$), and code churn ($>50$ files modified).

These signals are packaged into a `SignalBundle` and fed to the `DecisionEngine`, which calculates an AI-worthiness **priority score**.
- $+50$ points: Unknown failure patterns natively detected.
- $+30$ points: Significant performance regressions ($>40\\%$ drift with high confidence).
- $+20$ points: High-impact code changes coinciding with a failure.
- **Threshold:** The LLM is invoked only if `priority >= 45`.

**Technical Proof:** `metrics-collector/src/decisions/DecisionEngine.ts` lines 9-70; `metrics-collector/src/signals/DriftProcessor.ts` lines 12-51.

## 3. MCP Server Specs
Pulse goes beyond a passive dashboard by exposing its intelligence via the Model Context Protocol (MCP), allowing external agents (like IDE plugins) to interact with pipeline states.

- **Transport:** Implemented using Server-Sent Events (SSE) via `@modelcontextprotocol/sdk/server/sse.js`. 
- **Tools Exposed:**
  1. `get_latest_failure_analysis (workflow_name?)`: Returns the Root Cause, Remediation, and Confidence Score from the latest recorded `ai_analysis` signal payload.
  2. `list_active_signals (run_id?)`: Dumps the raw heuristic triggers (Drift, Patterns) for a given run.
  3. `search_history (query)`: A stubbed endpoint designed to lookup past runs by error signatures (Phase 4 roadmap).

**Technical Proof:** `metrics-collector/src/mcp/McpServer.ts` lines 24-120.

## 4. State Management (Frontend)
The React dashboard (`dashboard-frontend`) uses a unified custom hook, `useDashboardData.ts`, to handle the application's complex asynchronous state securely avoiding race conditions.

- **Parallel Polling:** The hook uses `Promise.all` to fetch initial pipeline configurations, duration analytics, run tables, and job breakdowns simultaneously upon `selectedPipeline` change.
- **AI Agent Interaction:** When a user clicks "Analyze", the `handleAnalyzeClick` function triggers a REST call (`triggerAgentAnalysis`) holding an `isAiLoading` boolean. Any resultant AI Signal is written to state as `aiReport`, seamlessly updating the UI without a full reload.
- **Derived State:** It exports computed views (`hasAnomaly`, `anomalyJob`, `filteredRuns`) so UI components (like the "AIInsightCard") receive reactive, ready-to-render data.

**Technical Proof:** `dashboard-frontend/src/hooks/useDashboardData.ts` lines 63-128; lines 140-179.

## 5. Agentic Interaction
When the Decision Engine allows it, the LLM takes over as a specialized consultant rather than a generic summarizer.

- **LLM Pipeline:** The `AiService` integrates with `GoogleGenerativeAI` utilizing the `gemini-2.0-flash-exp` model.
- **Context Construction:** The system strictly passes the filtered `SignalBundle`—not raw, chaotic logs. The prompt construction logic injects known failure heuristics, specific $s$ duration comparisons, and recent commit events so the LLM has exact localized context.
- **Structured Output:** The system prompt aggressively forces the LLM to reply in a strict JSON schema containing:
  `{ root_cause, confidence, remediation, relevant_files, summary }`

**Technical Proof:** `metrics-collector/src/services/AiService.ts` lines 19-91.

## 6. The "Hidden" Details
A few elegant optimizations aren't immediately obvious, serving as robust foundations:

- **JSONB Indexing:** Crucial CI/CD arrays (`jobs`, `test_summary`, `build_analysis`) are aggressively cast to strings/JSON during insertion, leveraging PostgreSQL's JSON engines for scale while avoiding rigid schema migrations when new runners are added.
- **Anti-Amnesia Memory Failover:** AI confidence isn't static. `MetricsService` correctly caches AI evaluations as a uniquely typed `'ai_analysis'` signal bound to a specific `run_id`, preventing repetitive API burn on page reloads.
- **Safe Fallbacks:** The `safeDuration` and `safeDate` utility functions cleanly normalize malformed payloads from rogue CI environments, preventing complete ingest failures.

**Technical Proof:** `metrics-collector/src/repository.ts` JSON serialization (line 64); `metrics-collector/src/utils.ts` (safe utility methods).

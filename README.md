<p>
<img src="docs/images/icon-p.png" alt="Pulse icon" width="120" /> 
</p>

# Pulse
### Pipeline Degradation Intelligence for Modern CI

A green build doesn’t mean a healthy pipeline. Pipelines rarely fail overnight. Flaky tests appear, build times inflate, and small inefficiencies compound into higher compute costs. As AI generates more code per engineer, faster merge cycles amplify this decay.

Pulse detects this pipeline rot before it becomes a production issue.

Traditional CI tools weren't built to track this continuous degradation. Pulse shifts observability from simple pass/fail events to statistical trajectory monitoring. It exposes a native MCP server, giving autonomous agents the exact root-cause context needed to fix degradation without opening a raw log file.

<p>
  <img src="docs/images/pulse-ui-01.png" alt="Pulse Dashboard Overview" width="100%" />
</p>

---

## Agentic Root Cause Analysis

Pulse does not run every webhook through an LLM. It escalates to an AI model only when signals are ambiguous or highly impactful, where LLM-powered diagnostics pinpoint the responsible code changes rather than summarizing raw log dumps.

<p align="center">
  <img src="docs/images/pulse-ui-ai.gif" alt="AI Analysis Demo" width="300">
</p>

---

## Queryable CI Context (MCP)

Instead of hunting down a failed action and copy-pasting raw logs into an LLM window, external coding agents and local IDE extensions can directly query Pulse for the exact failure context. Your autonomous agent can retrieve the structured RCA mid-debug and immediately start applying the fix in your codebase.

<p>
  <img src="docs/images/pulse-ui-02.png" alt="Anomaly Detection and Heuristics" width="100%" />
</p>

---

## How It Works

Pulse ingests your GitHub Actions webhooks and automatically builds a rolling statistical baseline for every job. It evaluates each run against historical patterns to identify duration drift, flakiness, and resource pressure, without requiring manual thresholds or alerting rules.

When a pipeline's trajectory deviates significantly, Pulse raises an investigation signal and correlates the anomaly with recent commits to provide a structured Root Cause Analysis (RCA).
```json
{
  "run_id": "gh_run_8472910",
  "trajectory_status": "degrading",
  "signal": "job 'jest_test_suite' duration +38% (4m12s -> 5m48s)",
  "rca": {
    "suspect_commit": "a1b2c3d",
    "root_cause": "Added deep clone in utils/parser.ts inside the map function. Likely causing GC pauses.",
    "remediation": "Check if deep clone is strictly necessary here. Consider shallow copy or moving the clone operation outside the loop.",
    "confidence_score": 0.72
  }
}
```

---

## Integration

Getting started requires adding just a single step to your existing workflow. There is no pipeline orchestration required, and workflows are detected automatically on their first run.
```yaml
- name: Send Metrics to Pulse
  uses: ./pulse-action
  if: always()
  with:
    webhook_url: ${{ secrets.PULSE_WEBHOOK_URL }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

---
## System Architecture 

Pulse is designed around schema-free ingestion, meaning job renames or missing fields never break your historical data.
<p>
  <img src="docs/images/architecture-diagram.png" alt="Pulse Architecture" width="100%" />
</p>
---

---

## Design Tradeoffs & Constraints

| Feature | Choice | Tradeoff |
|---|---|---|
| Ingestion | Synchronous | Simple, queue-less infrastructure; telemetry may be lost during peak bursts |
| Alerting | Adaptive Baseline | Zero-setup monitoring; very gradual performance decay may blend into history |
| Analysis | Heuristics-First | Low latency and cost; AI is used only as an escalation mechanism |
| Scope | Observability | Focused on diagnostics; does not orchestrate pipelines or retry jobs |
---

## Local Setup
```bash
git clone https://github.com/your-org/pulse.git
cd pulse
export GOOGLE_API_KEY="your_gemini_api_key"

# Install dependencies
npm install

# Start local services
npm run dev
```

---

**Stack:** Node.js · PostgreSQL · React · Gemini · MCP over SSE
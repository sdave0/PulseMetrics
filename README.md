# Pulse: Agentic CI/CD Observability Platform

## The Problem
Traditional CI "green signals" are lagging indicators. They tell you a build formally passed, but they hide the slow creep of flakiness, the silent $40\%$ performance regressions, and the hidden compute costs that quietly drain engineering velocity. When a pipeline finally breaks, developers waste hours reading raw logs to find out *what* went wrong and *where* it started.

## The Solution
**Pulse** is an Agentic Observability Platform that watches the space between the green and red signals. Using a deterministic Decision Engine paired with a Model Context Protocol (MCP) server, Pulse provides context-aware Root Cause Analysis (RCA) before a minor regression costs you a deploy or a week of triage. 

It earns trust by being quiet when pipelines are healthy, and precise when they are not. The agent exists not to automate away engineers, but to instantly collapse the distance between *"something's wrong"* and *"here's why."*

---

## The "Soul" of the Architecture
At its core, Pulse prevents AI hallucinations (and cost overruns) by orchestrating a **3-Stage Deterministic Signal Extraction** layer before any LLM is invoked:

1. **Pattern Extraction:** Instantly categorizes jobs and identifies standard failure heuristics (e.g., Timeout, OOM, Dependency Error).
2. **Drift Detection:** Maintains a 5-run rolling statistical baseline to flag silent duration regressions and stability decay.
3. **Change Analysis:** Scans commit payloads for high-impact alterations (e.g., Lockfile modifications, intense code churn, $>5\%$ test count changes).

These deterministic signals are fed into a **Decision Engine** that calculates an "AI-Worthiness Priority Score." The LLM is invoked *only* if the priority crosses the threshold (e.g., unknown anomalies, massive drift)—acting as an expert consultant rather than a noisy summarizer.

---

## Key Capabilities

1. ⚡ **Heuristic Failure Classification (Low-Cost):** Instantly classifies network timeouts, OOMs, and standard errors using deterministic logic without burning LLM tokens.
2. 📉 **Statistical Drift Detection:** Employs a 5-run rolling baseline to catch the runs that "pass" but introduce $30\%$ performance regressions.
3. 🤖 **MCP-Native Interface:** Pulse acts as a native MCP server, allowing external agents (like your local IDE) to directly query the `get_latest_failure_analysis` endpoint, making CI data instantly available to your development workflow.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend API** | Node.js (v20+), Express.js, TypeScript |
| **Database** | PostgreSQL 15 (Leveraging JSONB indexing) |
| **AI / Agent** | Google Generative AI (Gemini 2.0 Flash) |
| **Frontend** | React 19, Vite, Recharts, Tailwind CSS |
| **Integration** | GitHub Actions Toolkit (`@actions/core`) |
| **Protocol** | Model Context Protocol (MCP) via SSE |

---

## Local Setup

Launch the central Pulse nervous system locally in 3 simple steps:

**1. Clone and Configure**
```bash
git clone https://github.com/your-org/pulse.git
cd pulse/ci-pipeline
# Securely export your intended LLM API key for the Agent Service
export GOOGLE_API_KEY="your-api-key-here"
```

**2. Launch the Infrastructure**
```bash
# Spins up the Postgres Database, Metrics Collector, and Dashboard Frontend
docker-compose up --build -d
```

**3. View the Dashboard**
Navigate to [http://localhost:8080](http://localhost:8080) to view the Pulse unified control plane.

*(To configure your GitHub Actions to send telemetry to Pulse, hook up the [Pulse Action](./pulse-action/README.md) at the end of your workflow.)*

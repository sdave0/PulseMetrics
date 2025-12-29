<p align="center">
  <img src="docs/icon-p.png" alt="Pulse icon" width="120" />
</p>

# Pulse

While standard CI providers focus on the status of the current run, Pulse focuses on **longitudinal performance trends** to detect silent regressions that accumulate as technical debt.

**Configure Pulse by adding a few lines to your workflow, and tracking begins immediately.**

![Pulse Dashboard Overview](docs/images/pulse-ui-01.png)


Designed for developers and DevOps engineers responsible for maintaining CI reliability across multiple repositories who want faster signal and lower debugging overhead.

## Key Features

### Heuristic Failure Classification
Before invoking AI, Pulse instantly scans logs against a library of known error patterns (e.g., `ETIMEDOUT`, `Lockfile Changed`, `OutOfMemory`). This provides immediate, low-cost categorization for common failures alongside a **Confidence Score**.
![Anomaly Detection and Heuristics](docs/images/pulse-ui-02.png)

### Statistical Drift Detection
5-run rolling baselines filter temporary noise (runner variance, network issues) while flagging true performance drift. Detects both failures *and* slow-success regressions that traditional alerts miss.

### Context-Aware AI Root Cause Analysis  
When anomalies occur, AI correlates failure logs with commit diffs to pinpoint which file changes likely caused the regression—no manual log diving required.
<p align="center">
  <img src="docs/images/pulse-ui-ai.gif" alt="AI Analysis Demo" width="300">
</p>

### Zero-Config Dynamic Ingestion
Automatically discovers repositories and job steps from GitHub Actions webhooks. Schema changes, job renames, and missing fields don't break historical analysis - new workflows are self-provisioning on first run.

### Cross-Repository Visibility
Provides a unified view across repositories, enabling teams to analyze CI performance trends at the organization level rather than per-project silos.

### Cost Attribution (Supplementary)
Estimates CI/CD compute costs per workflow to help teams identify expensive pipelines and correlate performance regressions with cost spikes.

## Design Decisions & Constraints

**Architecture Choices**
* Synchronous Webhook Processing: Prioritized operational simplicity over high throughput. While this creates a ceiling of ~10 req/sec, it eliminated the need for a message queue (Redis/RabbitMQ) for this MVP
* On-Demand AI: Controls cost and avoids unnecessary LLM calls. Analysis triggered by user intent, not every commit.
* Rolling Baseline Detection: Adapts to changing codebases; historical flags may shift

**Known Limitations**
* Push-event ingestion only: misses manual or scheduled runs
* Single-instance deployment: database connection pool can saturate under bursts
* No webhook retry logic: downtime can create data gaps

**Explicitly Out of Scope**
* Pulse monitors pipelines but does not orchestrate them (no job retries, pipeline triggering, or cross-workflow dependency tracking)


## System Architecture
![Pulse System Architecture](docs/images/architecture-diagram.png)

## Integration

To start tracking a repo, add this step to the end of your `.github/workflows/ci.yml`. See **[pulse-action-setup.md](docs/pulse-action-setup.md)** for the full guide.


```yaml
- name: Send Metrics to Pulse
  uses: ./pulse-action
  if: always()
  with:
    webhook_url: ${{ secrets.PULSE_WEBHOOK_URL }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Running Locally

1.  **Start Database:**
    ```bash
    docker-compose up -d postgres
    ```

2.  **Start Backend:**
    ```bash
    cd metrics-collector && npm run build && npm run start
    ```

3.  **Start Dashboard:**
    ```bash
    cd dashboard-frontend && npm run dev
    ```

## Tech Stack

*   **Frontend:** React, Vite, Recharts
*   **Backend:** Node.js, Express, PostgreSQL


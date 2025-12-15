# Pulse

While standard CI providers focus on the current run status, Pulse focuses on historical trends to determine whether a pipeline is actually healthy.

Pulse captures the full history of CI/CD runs, detects silent performance regressions, and enables fast, context-aware debugging using AI.

**Configure Pulse by adding a few lines to your workflow, and tracking begins immediately.**

![Dashboard Overview - 1](docs/images/run7-p1-1.png)
![Dashboard Overview - 2](docs/images/run6-p1-2.png)
![Dashboard Overview - 3](docs/images/run6-p2.png)

## Why Pulse?

### 1. Dynamic Ingestion (Zero Configuration)
Pulse eliminates hardcoded pipelines and fragile schemas.

- **Self-Provisioning:** New repositories and job steps are automatically discovered and persisted the moment CI webhooks arrive.
- **Schema Resilience:** Job renames, missing fields, and provider-specific payload differences do not break historical analysis.
- **Zero Onboarding Cost:** Teams do not need to pre-register workflows or maintain dashboard definitions.

This allows Pulse to scale across many repositories without manual intervention.

---

### 2. Statistical Anomaly Detection (Signal, Not Noise)
Pulse focuses on detecting *meaningful* deviations rather than raw failures.

- **Rolling Baselines:** Uses a 5-run rolling average to smooth transient network or runner noise.
- **Drift Detection:** Flags job steps that exceed a configurable percentage deviation from historical behavior.
- **Failure-Agnostic:** Detects both failed jobs and slow-success regressions that traditional alerts ignore.

Anomalies act as the trigger point for deeper investigation rather than as the final output.

---

### 3. AI-Assisted Debugging (Just-in-Time Investigation)
Pulse does not use AI to summarize dashboards.  
It uses AI to **investigate anomalies on demand**.

- **Event-Driven Analysis:** AI is invoked only when a job fails or deviates significantly from its baseline.
- **Context-Aware Inputs:** The assistant receives job metadata, historical baselines, recent runs, and commit boundaries.
- **Action-Oriented Output:** Produces structured investigation reports with likely causes and concrete next steps.
- **Agent-Ready:** Designed to integrate with IDEs or autonomous agents via standardized protocols (e.g. MCP), enabling headless debugging without context switching.

This shifts CI debugging from manual log hunting to automated, focused investigation.

---

### 4. Cost Attribution (Supplementary)
Pulse can optionally estimate CI/CD compute costs per workflow to help teams identify expensive pipelines.

This feature is intentionally lightweight and secondary to debugging and developer productivity.


### 5. Cross-Repository Visibility
Pulse provides a unified view across repositories, enabling teams to analyze CI performance trends at the organization level rather than per-project silos.


## Integration

To start tracking a repo, add this step to the end of your `.github/workflows/ci.yml`. See **[pulse-action-setup.md](./pulse-action-setup.md)** for the full guide.

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
    docker-compose up -d
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

# Setting Up Pulse for Your CI/CD Pipeline

This guide explains how to integrate your GitHub Actions workflows with **Pulse**, the CI/CD analytics dashboard.

## Prerequisites

1.  **Pulse Backend:** Ensure the Pulse backend service (`metrics-collector`) is deployed and accessible from your GitHub Actions runners.
2.  **Authentication:** Generate a secure token or ensure your runners can reach the Pulse webhook URL.

## Integration Steps

To start collecting metrics, you need to add the `pulse-action` to your GitHub Actions workflow file (e.g., `.github/workflows/ci.yml`).

### 1. Add the Pulse Job

Add a new job to your workflow that runs *after* your main build/test jobs. This job will collect the results and artifacts.

```yaml
jobs:
  # ... your existing jobs (build, test, deploy) ...

  # Add this new job:
  pulse-metrics:
    name: Pulse Metrics Collector
    runs-on: ubuntu-latest
    if: always() # IMPORTANT: Run even if previous jobs fail
    needs: [build, test, deploy] # List all jobs you want to measure
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Send Metrics to Pulse
        uses: ./pulse-action  # Use the local path if in same repo, or 'owner/pulse-action@v1' if published
        with:
          webhook_url: ${{ secrets.PULSE_WEBHOOK_URL }} # e.g., https://pulse.your-domain.com/metrics
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Configure Secrets

In your GitHub repository settings, go to **Settings > Secrets and variables > Actions** and create a new repository secret:

*   **Name:** `PULSE_WEBHOOK_URL`
*   **Value:** The URL of your Pulse backend's `/metrics` endpoint (e.g., `https://api.pulse-dashboard.com/metrics` or `http://your-server-ip:3000/metrics`).

### 3. Expose Artifacts (Optional but Recommended)

For richer analysis (test results, build logs), ensure your build/test jobs upload their output as artifacts. Pulse looks for specific artifact names:

*   **Test Results:** Upload `test-results.json` as an artifact named `test-results`.
*   **Build Logs:** Upload `build-log.txt` as an artifact named `build-log`.

**Example:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --json --outputFile=test-results.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results.json
```

## How It Works

1.  **Trigger:** When your workflow finishes (success or failure), the `pulse-metrics` job starts.
2.  **Collection:** The action uses the GitHub API to fetch:
    *   Workflow run details (duration, status, commit info).
    *   Job breakdowns (individual timings for 'build', 'test', etc.).
    *   Artifacts (test summaries, log files).
3.  **Parsing:** It unzips artifacts and extracts key metrics (e.g., "42 tests passed", "Build cache hit").
4.  **Reporting:** It constructs a JSON payload and sends it to your `PULSE_WEBHOOK_URL`.
5.  **Visualization:** The Pulse Dashboard receives the data and updates the charts instantly.

## Troubleshooting

*   **"Job not found":** Ensure `needs: [...]` correctly lists all previous jobs.
*   **"Artifact not found":** Verify your `upload-artifact` steps are running and naming artifacts correctly.
*   **Connection Refused:** Ensure your `WEBHOOK_URL` is reachable from the GitHub runner (public IP or accessible via tunnel).

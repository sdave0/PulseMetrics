# Pulse: A CI/CD Pipeline Analytics Dashboard

Pulse is an analytics dashboard for monitoring the performance and health of CI/CD pipelines. It automatically gathers detailed metrics from every workflow run and visualizes them to help you identify trends, bottlenecks, and performance regressions.

![Dashboard Overview - 1](docs/images/run7-p1-1.png)
![Dashboard Overview - 2](docs/images/run6-p1-2.png)
![Dashboard Overview - 3](docs/images/run6-p2.png)

## Key Features

*   **Pipeline Anomaly Detection:** Automatically flags pipeline runs that are significantly slower than the 5-run rolling average.

*   **Job Performance Trends:** Visualizes the historical duration of each individual job in a multi-line chart, making it easy to spot which parts of the pipeline are becoming slower over time.

*   **Recent Run Breakdown:** Provides a detailed table analyzing the most recent pipeline run, comparing each job's duration against its historical average.

*   **Core Health Metrics:** Displays high-level statistics like Success Rate and Median Run Duration for a quick, at-a-glance overview of pipeline health.

## How It Works

*   **CI/CD Run:** After a CI/CD pipeline completes, metrics related to tests and builds are gathered.
*   **Storage:** These metrics are automatically sent to a Node.js metrics collector service, which stores them in a Postgres DB.
*   **Visualization:** A React dashboard fetches the data from the service's REST API to create the charts and tables you see.

## Technology Stack

*   **Frontend:** React, TypeScript, Vite, Recharts
*   **Backend:** Node.js, Express, TypeScript
*   **Database:** PostgreSQL
*   **CI/CD:** GitHub Actions
*   **Containerization:** Docker
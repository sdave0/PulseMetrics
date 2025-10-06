# Pulse: A CI/CD Pipeline Analytics Dashboard

Pulse is an analytics platform that provides deep insights into the performance and health of CI/CD pipelines. It monitors a sample CI/CD workflow, gathers detailed metrics, and visualizes them through a comprehensive dashboard to help teams identify trends, bottlenecks, and anomalies.

## Key Features

### Advanced Analytics Dashboard
The core of Pulse is its web-based dashboard, which provides a rich, interactive interface for exploring pipeline metrics.

*   **Pipeline Anomaly Detection:** Automatically flags pipeline runs that are significantly slower than the rolling average, helping to spot performance regressions at a glance.
*   **Job-Level Analysis:**
    *   **Performance Trends:** A historical, multi-line chart visualizes the duration of each individual job over time, making it easy to see which parts of the pipeline are getting slower.
    *   **Breakdown of Recent Runs:** A detailed table analyzes the most recent pipeline run, comparing each job's duration against its historical average.
*   **Robust Performance Metrics:** The dashboard includes high-level statistics like success rate and median run duration, providing a more accurate view of typical performance by resisting outliers.

### Automated Data Collection
A resilient data collection system works behind the scenes to gather metrics from every pipeline run.

*   **Metrics Collector Service:** A Node.js backend service that receives, stores, and serves pipeline data via a REST API.
*   **Automated Profiler:** A dedicated GitHub Actions workflow runs after every pipeline completion to extract detailed job-level timings and other metadata.

### Monitored CI/CD Pipeline
The project includes a sample CI/CD pipeline that the Pulse dashboard monitors. This workflow builds, tests, and deploys a containerized web application to demonstrate a real-world use case.

## How It Works

1.  A **CI/CD Pipeline** (GitHub Actions) runs when code is pushed.
2.  Upon completion, a **Profiler Workflow** is triggered, which gathers detailed metrics about the run.
3.  The Profiler sends this data to the **Metrics Collector** backend, which stores it in a PostgreSQL database.
4.  The **Dashboard** (a React application) queries the backend API to fetch the data and display it through its various analytical charts and tables.

## Technology Stack

*   **Frontend:** React, TypeScript, Vite, Recharts
*   **Backend:** Node.js, Express, TypeScript
*   **Database:** PostgreSQL
*   **CI/CD:** GitHub Actions
*   **Containerization:** Docker

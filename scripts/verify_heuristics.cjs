const axios = require('axios');

const now = new Date();
const tenMinsAgo = new Date(now.getTime() - 10 * 60000).toISOString();
const eightMinsAgo = new Date(now.getTime() - 8 * 60000).toISOString();
const fiveMinsAgo = new Date(now.getTime() - 5 * 60000).toISOString();

// 1. Inject Baseline (Run #100)
// SHA: baseline-sha
const baselinePayload = {
  workflow: {
    run_id: 100000100,
    run_number: 100,
    name: "Heuristic Test Pipeline",
    html_url: "http://github.com/user/repo/actions/runs/100",
    status: "success",
    event: "push",
    head_branch: "main",
    updated_at: eightMinsAgo,
    created_at: tenMinsAgo
  },
  commit: {
    sha: "baseline-sha",
    message: "feat: baseline",
    author: { name: "DevUser" }
  },
  jobs: [
    {
      name: "unit-tests",
      status: "success",
      started_at: tenMinsAgo,
      completed_at: eightMinsAgo,
      duration_seconds: 120,
      runner_type: "ubuntu-latest"
    }
  ],
  test_summary: { passed: 100, failed: 0, total: 100, suites: 10 },
  build_analysis: null,
  artifacts: [],
  commit_analysis: { total_files: 5, lockfile_changed: false, test_files_count: 5, src_files_count: 0 }
};

// 2. Inject Anomaly (Run #101)
// SHA: anomaly-sha
// Parent SHA: baseline-sha (High Confidence)
// Test Count: 150 (Increase -> Heuristic Trigger)
// Lockfile: true (Heuristic Trigger)
const anomalyPayload = {
  workflow: {
    run_id: 100000101,
    run_number: 101,
    name: "Heuristic Test Pipeline",
    html_url: "http://github.com/user/repo/actions/runs/101",
    status: "success",
    event: "push",
    head_branch: "main",
    updated_at: now.toISOString(),
    created_at: fiveMinsAgo
  },
  commit: {
    sha: "anomaly-sha",
    parent_sha: "baseline-sha", // Contiguous!
    message: "feat: big update",
    author: { name: "DevUser" }
  },
  jobs: [
    {
      name: "unit-tests",
      status: "success",
      started_at: fiveMinsAgo,
      completed_at: now.toISOString(),
      duration_seconds: 300, // 120 -> 300 (Anomaly!)
      runner_type: "ubuntu-latest"
    }
  ],
  test_summary: { passed: 150, failed: 0, total: 150, suites: 15 }, // +50% tests
  build_analysis: null,
  artifacts: [],
  commit_analysis: { total_files: 25, lockfile_changed: true, test_files_count: 5, src_files_count: 20 } // Lockfile + High Churn
};

async function run() {
  try {
    console.log("Injecting Baseline...");
    await axios.post('http://localhost:3000/metrics', baselinePayload);
    
    console.log("Injecting Anomaly...");
    await axios.post('http://localhost:3000/metrics', anomalyPayload);
    
    console.log("Done! Check 'Heuristic Test Pipeline' in Dashboard.");
  } catch (e) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

run();

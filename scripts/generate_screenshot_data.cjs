const axios = require('axios');

const API_URL = 'http://localhost:3000/metrics';
const PIPELINE_NAME = "E-Commerce Backend CI";
const REPO_URL = "https://github.com/shop-inc/backend";
const BRANCH = "main";

// Helpers
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
const subDays = (date, days) => new Date(date.getTime() - days * 86400000);

// Scenario: 
// Runs 1-15: Healthy, fast, stable.
// Run 16: "The Bad Commit" - Introduces a regression (lockfile change + slow tests).
// Runs 17-20: Regression persists (Technical Debt).

const BASE_DURATION = 180; // 3 mins
const REGRESSION_DURATION = 420; // 7 mins

const AUTHORS = ["Sarah Dev", "Mike Ops", "Alex Lead", "Junior J"];
const JOBS_TEMPLATE = [
    { name: "lint-check", duration: 30, status: "success" },
    { name: "unit-tests", duration: 60, status: "success" },
    { name: "integration-tests", duration: 80, status: "success" },
    { name: "build-docker", duration: 45, status: "success" } // Parallel-ish
];

async function sendRun(runIndex, isRegression, date) {
    const runId = 5000 + runIndex;
    const isBadCommit = runIndex === 16; // The specific run that broke it

    // Variance
    const variance = randomInt(-10, 15);
    const durationBase = isRegression ? REGRESSION_DURATION : BASE_DURATION;
    const totalDuration = durationBase + variance;

    // Job Durations
    const jobs = JOBS_TEMPLATE.map(j => {
        let jobDur = j.duration + randomInt(-5, 5);
        if (isRegression && j.name === "integration-tests") {
            jobDur = jobDur * 2.5; // The culprit
        }
        if (isRegression && j.name === "unit-tests") {
            jobDur = jobDur * 1.5; // Also slower
        }
        return {
            ...j,
            duration_seconds: jobDur,
            started_at: date.toISOString(),
            completed_at: addMinutes(date, jobDur / 60).toISOString(),
            runner_type: "ubuntu-latest"
        };
    });

    // Commit Info
    let commitMsg = `fix: minor update ${runIndex}`;
    let author = AUTHORS[runIndex % AUTHORS.length];
    let commitAnalysis = { total_files: 3, lockfile_changed: false, test_files_count: 1, src_files_count: 2 };
    let testSummary = { passed: 142, failed: 0, total: 142, suites: 12 };

    if (isBadCommit) {
        commitMsg = "feat: add elasticsearch indexing";
        author = "Junior J";
        commitAnalysis = {
            total_files: 45,
            lockfile_changed: true,
            test_files_count: 12,
            src_files_count: 30
        };
        testSummary = { passed: 155, failed: 0, total: 155, suites: 14 }; // Added tests
    } else if (isRegression) {
        commitMsg = `fix: patch ${runIndex}`;
        testSummary = { passed: 155, failed: 0, total: 155, suites: 14 }; // Tests stay added
    }

    const payload = {
        workflow: {
            run_id: runId,
            run_number: runIndex,
            name: PIPELINE_NAME,
            html_url: `${REPO_URL}/actions/runs/${runId}`,
            status: "success",
            trigger: "push",
            branch: BRANCH,
            duration_seconds: totalDuration,
            created_at: date.toISOString(),
            completed_at: addMinutes(date, totalDuration / 60).toISOString()
        },
        commit: {
            sha: `sha-${runIndex}`,
            parent_sha: `sha-${runIndex - 1}`,
            message: commitMsg,
            author: author
        },
        jobs: jobs,
        test_summary: testSummary,
        build_analysis: { cache_status: isRegression ? "Miss" : "Hit", build_size_kb: isRegression ? 15000 : 12000 },
        commit_analysis: commitAnalysis,
        artifacts: []
    };

    try {
        await axios.post(API_URL, payload);
        console.log(`Sent Run #${runIndex} (${isRegression ? 'REGRESSION' : 'Healthy'}) - ${date.toISOString().split('T')[0]}`);
    } catch (e) {
        console.error(`Failed Run #${runIndex}:`, e.message);
    }
}

async function generate() {
    console.log("Generating 20 runs...");
    const today = new Date();

    for (let i = 1; i <= 20; i++) {
        const isRegression = i >= 16;
        // Spread over last 10 days
        const date = subDays(today, 10 - (i / 2));
        await sendRun(i, isRegression, date);
    }
    console.log("Done! Refresh your dashboard.");
}

generate();

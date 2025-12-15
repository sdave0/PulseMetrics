// test-log-fetch.ts
import { Octokit } from "octokit";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Make sure this is in your .env
});

async function testFetch() {
    // REPLACE THESE WITH A REAL FAILED RUN FROM YOUR REPO
    const OWNER = "your-username";
    const REPO = "your-repo-name";
    const RUN_ID = 123456789; // Look at a URL of a failed run to get this ID

    console.log(`Attempting to fetch logs for Run ID: ${RUN_ID}...`);

    try {
        // 1. Get the jobs for this run
        const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
            owner: OWNER,
            repo: REPO,
            run_id: RUN_ID,
        });

        const failedJob = jobs.jobs.find((j) => j.conclusion === "failure");

        if (!failedJob) {
            console.log("No failed jobs found in this run. Testing with the first job...");
        }

        const jobId = failedJob ? failedJob.id : jobs.jobs[0].id;
        console.log(`Targeting Job ID: ${jobId} (${failedJob ? "FAILED" : "SUCCESS"})`);

        // 2. Download the logs
        // Note: This endpoint often redirects to a raw URL
        const response = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner: OWNER,
            repo: REPO,
            job_id: jobId,
        });

        // The type definition says 'object', but in practice, it's the string content
        const logData = String(response.data);

        console.log("---------------------------------------------------");
        console.log("SUCCESS! Retrieved Log Data. Preview (last 500 chars):");
        console.log("---------------------------------------------------");
        console.log(logData.slice(-500));

    } catch (error) {
        console.error("❌ FAILED to fetch logs.");
        console.error(error);
    }
}

testFetch();
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { DefaultArtifactClient } = require('@actions/artifact');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

async function run() {
  try {
    // --- 1. CONFIGURATION ---
    const webhookUrl = core.getInput('webhook_url', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    
    const octokit = github.getOctokit(githubToken);
    const context = github.context;

    // Ensure we are in a workflow_run context
    if (context.eventName !== 'workflow_run') {
      throw new Error('This action must be triggered by a "workflow_run" event.');
    }

    const runId = context.payload.workflow_run.id;
    const { owner, repo } = context.repo;

    console.log(`Analyzing Workflow Run ID: ${runId} for ${owner}/${repo}`);

    // --- 2. GATHER CORE DATA ---
    const workflowRun = context.payload.workflow_run;
    const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    const jobs = jobsResponse.data.jobs;

    const artifactsResponse = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId,
    });
    const allArtifacts = artifactsResponse.data.artifacts;

    // --- 3. ARTIFACT DOWNLOAD & EXTRACTION ---
    // We create a temporary directory for artifacts
    const artifactDir = path.join(process.cwd(), 'pulse_artifacts');
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir);
    }

    console.log(`Found ${allArtifacts.length} artifacts. Downloading...`);
    
    for (const artifact of allArtifacts) {
      console.log(`Downloading ${artifact.name}...`);
      try {
        const download = await octokit.rest.actions.downloadArtifact({
          owner,
          repo,
          artifact_id: artifact.id,
          archive_format: 'zip',
        });
        
        const zipPath = path.join(artifactDir, `${artifact.name}.zip`);
        fs.writeFileSync(zipPath, Buffer.from(download.data));
        
        // Unzip immediately using adm-zip
        const extractPath = path.join(artifactDir, artifact.name);
        if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);
        
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);
            console.log(`Extracted ${artifact.name} to ${extractPath}`);
        } catch (e) {
            console.warn(`Could not unzip ${artifact.name}: ${e.message}`);
        }
        
      } catch (error) {
        console.warn(`Failed to download/extract ${artifact.name}: ${error.message}`);
      }
    }

    // --- 4. PARSE DATA ---
    let payload = {};

    // 4.1 Basic Info
    payload.workflow = {
      run_id: workflowRun.id,
      run_number: workflowRun.run_number,
      name: workflowRun.name,
      html_url: workflowRun.html_url,
      status: workflowRun.conclusion,
      trigger: workflowRun.event,
      branch: workflowRun.head_branch,
      duration_seconds: Math.round((new Date(workflowRun.updated_at).getTime() - new Date(workflowRun.created_at).getTime()) / 1000),
      created_at: workflowRun.created_at,
      completed_at: workflowRun.updated_at,
    };

    if (workflowRun.head_commit) {
      payload.commit = {
        sha: workflowRun.head_commit.id,
        message: workflowRun.head_commit.message,
        author: workflowRun.head_commit.author.name,
      };
    }

    payload.jobs = jobs.map(job => ({
      name: job.name,
      status: job.conclusion,
      duration_seconds: job.completed_at && job.started_at ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000) : 0,
    }));

    // 4.2 Test Summary (Generic Search)
    // We look for any file named 'test-results.json' in the artifacts
    payload.test_summary = null;
    
    // Strategy: Look in specific extracted folders matching known patterns
    // Priority 1: 'test-results' artifact
    const testResultsDir = path.join(artifactDir, 'test-results');
    const testFile = path.join(testResultsDir, 'test-results.json');
    
    if (fs.existsSync(testFile)) {
        try {
            const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
            payload.test_summary = {
                passed: testData.numPassedTests || 0,
                failed: testData.numFailedTests || 0,
                total: testData.numTotalTests || 0,
                suites: testData.numTotalTestSuites || 0,
            };
            console.log("Parsed test-results.json");
        } catch (e) { console.warn("Found test-results.json but failed to parse it."); }
    }

    // 4.3 Build Analysis (Generic Search)
    // Look for 'build-log' artifact
    payload.build_analysis = null;
    const buildLogDir = path.join(artifactDir, 'build-log');
    const buildLogFile = path.join(buildLogDir, 'build-log.txt');
    
    if (fs.existsSync(buildLogFile)) {
        try {
            const buildLog = fs.readFileSync(buildLogFile, 'utf8');
            let cache_status = 'Unknown';
            if (buildLog.includes('cache hit') || buildLog.includes('Cache hit')) { cache_status = 'Hit'; }
            else if (buildLog.includes('cache miss') || buildLog.includes('Cache miss')) { cache_status = 'Miss'; }
            
            // Build size? Try to find 'build-artifacts' or 'dist'
            let buildSize = 0;
            const distDir = path.join(artifactDir, 'build-artifacts');
             if (fs.existsSync(distDir)) {
                 try {
                    // du -sk is linux specific, but likely available. 
                    const sizeOutput = execSync(`du -sk "${distDir}" 2>/dev/null || echo "0"`).toString();
                    buildSize = parseInt(sizeOutput.split('\t')[0], 10);
                 } catch (e) {}
             }

            payload.build_analysis = {
                cache_status: cache_status,
                build_size_kb: buildSize,
            };
            console.log("Parsed build log and size.");
        } catch (e) { console.warn("Failed to analyze build log."); }
    }

    // 4.4 Artifacts Info
    payload.artifacts = allArtifacts.map(artifact => ({
      name: artifact.name,
      size_kb: Math.round(artifact.size_in_bytes / 1024),
    }));

    // --- 5. SEND DATA ---
    console.log("Sending payload to Pulse Collector...");
    try {
        const response = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`Success! Response: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.error(`Failed to send metrics: ${error.message}`);
        if (error.response) {
            console.error(`Server responded with: ${JSON.stringify(error.response.data)}`);
        }
        core.setFailed('Failed to send metrics to Pulse Collector');
    }

    // Output for debugging
    core.setOutput('summary_json', JSON.stringify(payload));

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
